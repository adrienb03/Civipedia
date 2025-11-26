#!/usr/bin/env bash
set -euo pipefail

# Clean previous Next dev processes and lock file, then start next dev in foreground.
# Usage: ./scripts/clean_and_dev.sh [PORT]

PORT=${1:-3000}
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

echo "[clean_and_dev] Using port: $PORT"

# Load local env vars if present so we can read MAILHOG_HOST/PORT
if [ -f .env.local ]; then
  echo "[clean_and_dev] Sourcing .env.local"
  # shellcheck disable=SC1091
  set -o allexport
  # source may fail on complex env files; ignore errors
  source .env.local || true
  set +o allexport
fi

# Attempt to ensure MailHog is running in dev when configured
MAILHOG_PORT=${MAILHOG_PORT:-1025}
MAILHOG_UI_PORT=${MAILHOG_UI_PORT:-8025}
if [ "${NODE_ENV:-development}" = "development" ]; then
  # Check if something is already listening on the MailHog SMTP port
  if ! lsof -iTCP:"$MAILHOG_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[clean_and_dev] MailHog not detected on port $MAILHOG_PORT — attempting to start"
    # Prefer a system binary if available
    if command -v MailHog >/dev/null 2>&1 || command -v mailhog >/dev/null 2>&1; then
      MH_BIN=$(command -v MailHog 2>/dev/null || command -v mailhog)
      echo "[clean_and_dev] Starting MailHog via binary: $MH_BIN"
      "$MH_BIN" -api-bind-addr 127.0.0.1:$MAILHOG_UI_PORT -smtp-bind-addr 127.0.0.1:$MAILHOG_PORT -ui-bind-addr 127.0.0.1:$MAILHOG_UI_PORT > .next/mailhog.log 2>&1 &
      echo $! > .next/mailhog.pid || true
      sleep 0.5
    elif command -v docker >/dev/null 2>&1; then
      # Try to start a Docker container for MailHog if Docker is available
      if docker info >/dev/null 2>&1; then
        # Avoid starting another container if one with the same name exists
        if ! docker ps --filter "name=mailhog_dev" --format '{{.Names}}' | grep -q mailhog_dev; then
          echo "[clean_and_dev] Starting MailHog via Docker (mailhog_dev)"
          docker run --rm -d -p ${MAILHOG_PORT}:1025 -p ${MAILHOG_UI_PORT}:8025 --name mailhog_dev mailhog/mailhog >/dev/null 2>&1 || true
        else
          echo "[clean_and_dev] mailhog_dev container already running"
        fi
      else
        echo "[clean_and_dev] Docker not available or daemon not running — cannot start MailHog automatically"
      fi
    else
      echo "[clean_and_dev] No MailHog binary or Docker available — please run MailHog manually if you need SMTP capture"
    fi
  else
    echo "[clean_and_dev] MailHog already running on port $MAILHOG_PORT"
  fi
fi

# If we have a pidfile from our dev:background helper, try to kill it.
PIDFILE=".next/dev-server.pid"
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE" 2>/dev/null || true)
  if [ -n "$OLD_PID" ] && ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo "[clean_and_dev] Killing previous PID from $PIDFILE -> $OLD_PID"
    kill "$OLD_PID" || true
    sleep 1
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
      echo "[clean_and_dev] PID still alive, forcing kill -9 -> $OLD_PID"
      kill -9 "$OLD_PID" || true
    fi
  fi
  rm -f "$PIDFILE" || true
fi

# Kill any `next` process running in this project (safety: only node processes
# with a cwd inside the project root). This avoids killing unrelated node procs.
PIDS=$(pgrep -f "node" || true)
if [ -n "$PIDS" ]; then
  for p in $PIDS; do
    # obtain cwd of process (macOS: use lsof to check command working dir)
    CWD=$(lsof -p $p -Fn 2>/dev/null | grep '^n' | head -n1 | cut -c2- || true)
    if [ -n "$CWD" ] && [[ "$CWD" == "$PROJECT_ROOT"* ]]; then
      CMDLINE=$(ps -p $p -o args=)
      if echo "$CMDLINE" | grep -q "next"; then
        echo "[clean_and_dev] Killing node process $p (cmd: $CMDLINE) in project directory"
        kill $p || true
      fi
    fi
  done
fi

# Remove stale lock file if present
if [ -f .next/dev/lock ]; then
  echo "[clean_and_dev] Removing stale lock .next/dev/lock"
  rm -f .next/dev/lock || true
fi

echo "[clean_and_dev] Starting Next dev on port $PORT"
# Ensure local DB tables exist before starting dev server
if command -v node >/dev/null 2>&1; then
  echo "[clean_and_dev] Ensuring local DB tables (scripts/init_db.js)"
  node ./scripts/init_db.js || echo "[clean_and_dev] init_db script failed (continuing)"
else
  echo "[clean_and_dev] node not found: cannot run init_db.js. Skipping DB init."
fi
# Run the local next binary directly to avoid recursively calling `npm run dev`.
# Prefer the local project binary if available, otherwise fall back to global `next`.
if [ -x "./node_modules/.bin/next" ]; then
  exec "./node_modules/.bin/next" dev --port "$PORT"
else
  exec next dev --port "$PORT"
fi
