#!/usr/bin/env bash
set -euo pipefail

# Cleanup helper: kill common stale pidfiles and processes related to local dev
# Usage: ./scripts/cleanup_dev.sh [port ...]

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

PORTS=(${@:-8000 3000})

echo "[cleanup_dev] Project root: $PROJECT_ROOT"

# Kill backend pidfile left by non-tmux runs
if [ -f .dev-backend.pid ]; then
  OLD_PID=$(cat .dev-backend.pid 2>/dev/null || true)
  if [ -n "$OLD_PID" ] && ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo "[cleanup_dev] Killing backend PID from .dev-backend.pid -> $OLD_PID"
    kill "$OLD_PID" || true
    sleep 0.2
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
      echo "[cleanup_dev] Forcing kill -9 -> $OLD_PID"
      kill -9 "$OLD_PID" || true
    fi
  fi
  rm -f .dev-backend.pid || true
fi

# Kill dev server pidfile used by background helper
if [ -f .next/dev-server.pid ]; then
  OLD_PID=$(cat .next/dev-server.pid 2>/dev/null || true)
  if [ -n "$OLD_PID" ] && ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo "[cleanup_dev] Killing previous PID from .next/dev-server.pid -> $OLD_PID"
    kill "$OLD_PID" || true
    sleep 0.5
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
      echo "[cleanup_dev] PID still alive, forcing kill -9 -> $OLD_PID"
      kill -9 "$OLD_PID" || true
    fi
  fi
  rm -f .next/dev-server.pid || true
fi

# Remove stale Next lock
if [ -f .next/dev/lock ]; then
  echo "[cleanup_dev] Removing stale lock .next/dev/lock"
  rm -f .next/dev/lock || true
fi

# Optionally kill processes listening on supplied ports
for port in "${PORTS[@]}"; do
  echo "[cleanup_dev] Checking port $port"
  PIDS=$(lsof -t -iTCP:"$port" -sTCP:LISTEN || true)
  if [ -n "$PIDS" ]; then
    echo "[cleanup_dev] Found PIDs on port $port: $PIDS"
    for pid in $PIDS; do
      # Only kill processes whose cwd is inside the project to be safer
      CWD=$(lsof -p $pid -Fn 2>/dev/null | grep '^n' | head -n1 | cut -c2- || true)
      if [ -n "$CWD" ] && [[ "$CWD" == "$PROJECT_ROOT"* ]]; then
        echo "[cleanup_dev] Killing $pid (cwd: $CWD) listening on port $port"
        kill "$pid" || true
        sleep 0.2
        if ps -p "$pid" > /dev/null 2>&1; then
          echo "[cleanup_dev] Forcing kill -9 $pid"
          kill -9 "$pid" || true
        fi
      else
        echo "[cleanup_dev] Skipping $pid (cwd: $CWD) — not inside project root"
      fi
    done
  else
    echo "[cleanup_dev] No process listening on $port"
  fi
done

echo "[cleanup_dev] Cleanup complete"
