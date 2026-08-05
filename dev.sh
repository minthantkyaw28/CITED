#!/usr/bin/env bash
# Launch backend (FastAPI on :8000) and frontend (Next.js on :3000) together.
# Ctrl-C cleans up both.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

mkdir -p .tmp
BACKEND_LOG="$ROOT/.tmp/backend.log"
FRONTEND_LOG="$ROOT/.tmp/frontend.log"

# --- venv check ---
if [ ! -d ".venv" ]; then
  echo "✗ .venv not found. Run: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

# --- frontend deps check ---
if [ ! -d "frontend/node_modules" ]; then
  echo "→ Installing frontend deps (one-time)…"
  (cd frontend && npm install)
fi

# shellcheck disable=SC1091
source .venv/bin/activate

# --- launch ---
echo "→ Starting backend  on http://localhost:8000   (log: .tmp/backend.log)"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo "→ Starting frontend on http://localhost:3000   (log: .tmp/frontend.log)"
(cd frontend && npm run dev > "$FRONTEND_LOG" 2>&1) &
FRONTEND_PID=$!

cleanup() {
  echo ""
  echo "→ Shutting down…"
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  # Kill any orphan next-server / uvicorn workers the parent spawned
  pkill -P "$BACKEND_PID" 2>/dev/null || true
  pkill -P "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "  done."
}
trap cleanup INT TERM EXIT

# Wait a beat, then surface readiness
sleep 3
echo ""
echo "  Backend  : http://localhost:8000   /healthz  /docs"
echo "  Frontend : http://localhost:3000"
echo "  Tail logs: tail -f .tmp/backend.log .tmp/frontend.log"
echo ""
echo "→ Streaming both logs below. Ctrl-C to stop everything."
echo "---------------------------------------------------------"

# Stream both logs prefixed so you can tell them apart.
tail -F "$BACKEND_LOG" "$FRONTEND_LOG" 2>/dev/null &
TAIL_PID=$!

# Wait on the two services. If either dies, we tear down.
# (`wait -n` is bash 4+; macOS ships bash 3.2, so poll instead.)
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 1
done
kill "$TAIL_PID" 2>/dev/null || true
