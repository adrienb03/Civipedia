#!/usr/bin/env bash
set -euo pipefail

# Script to kill any process listening on a TCP port (macOS) and then run uvicorn.
# Usage:
#   ./scripts/uvicorn_safe.sh [uvicorn args...]
# Example:
#   ./scripts/uvicorn_safe.sh test_civi_api:app --reload

PORT=${PORT:-8000}

# Find PIDs listening on the TCP port (LISTEN state). lsof returns non-zero when none, so allow failure.
pids=$(lsof -tiTCP:${PORT} -sTCP:LISTEN || true)
if [ -n "$pids" ]; then
  echo "Found processes listening on port ${PORT}: ${pids}"
  echo "Killing them..."
  # Try a gentle TERM first, then SIGKILL if necessary
  kill ${pids} || true
  sleep 0.5
  # Check if still alive
  remaining=$(ps -o pid= -p ${pids} 2>/dev/null || true)
  if [ -n "$remaining" ]; then
    echo "Some processes remained, forcing kill: ${remaining}"
    kill -9 ${remaining} || true
  fi
else
  echo "No process listening on port ${PORT}."
fi

# If no args are provided, use a default invocation
if [ "$#" -gt 0 ]; then
  exec uvicorn "$@"
else
  exec uvicorn test_civi_api:app --reload
fi
