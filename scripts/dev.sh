#!/usr/bin/env bash
set -euo pipefail

# Dev launcher: uses tmux when available to run backend + frontend side-by-side.
# Fallback: runs backend in background and frontend in foreground.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_NAME="civipedia-dev"

backend_cmd='bash -lc "[ -f .venv/bin/activate ] && source .venv/bin/activate || true; uvicorn test_civi_api:app --reload"'
frontend_cmd='bash -lc "npm run dev"'

cd "$ROOT_DIR"

if command -v tmux >/dev/null 2>&1; then
  # Kill existing session if present
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Killing existing tmux session $SESSION_NAME"
    tmux kill-session -t "$SESSION_NAME"
  fi

  echo "Starting tmux session '$SESSION_NAME' with backend and frontend panes"
  # Start session detached with backend in window 0
  tmux new-session -d -s "$SESSION_NAME" -n backend $backend_cmd
  # Create a second window for frontend
  tmux split-window -h -t "$SESSION_NAME":0 $frontend_cmd
  # Select left pane
  tmux select-pane -L -t "$SESSION_NAME":0
  echo "Attach with: tmux attach -t $SESSION_NAME"
  tmux attach -t "$SESSION_NAME"
else
  echo "tmux not found — running backend in background and frontend in foreground"
  # Start backend in background (nohup to avoid SIGHUP when closing terminal)
  nohup bash -lc "[ -f .venv/bin/activate ] && source .venv/bin/activate || true; uvicorn test_civi_api:app --reload" > .dev-backend.log 2>&1 &
  echo $! > .dev-backend.pid
  echo "Backend started (pid $(cat .dev-backend.pid)). Logs: .dev-backend.log"
  # Start frontend in foreground
  npm run dev
fi
