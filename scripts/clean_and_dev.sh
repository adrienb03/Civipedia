#!/usr/bin/env bash
set -euo pipefail

# Clean previous Next dev processes and lock file, then start next dev in foreground.
# Usage: ./scripts/clean_and_dev.sh [PORT]

PORT=${1:-3000}
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

echo "[clean_and_dev] Using port: $PORT"

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
# Run the local next binary directly to avoid recursively calling `npm run dev`.
# Prefer the local project binary if available, otherwise fall back to global `next`.
if [ -x "./node_modules/.bin/next" ]; then
  exec "./node_modules/.bin/next" dev --port "$PORT"
else
  exec next dev --port "$PORT"
fi
