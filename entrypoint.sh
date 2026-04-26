#!/bin/sh
# Entrypoint script for the MusicBox Docker container.
# Starts the bgutil PO Token HTTP server in the background,
# then launches Uvicorn in the foreground.

set -e

PO_TOKEN_PORT="${PO_TOKEN_PORT:-4416}"

# Start the bgutil PO Token HTTP server if Node.js and the server code exist.
if [ -d "/opt/bgutil-server" ] && command -v node >/dev/null 2>&1; then
    echo "[entrypoint] Starting bgutil PO Token server on port ${PO_TOKEN_PORT}..."
    node /opt/bgutil-server/build/main.js --port "${PO_TOKEN_PORT}" &
    BGUTIL_PID=$!

    # Give the server a moment to start
    sleep 2

    if kill -0 "$BGUTIL_PID" 2>/dev/null; then
        echo "[entrypoint] bgutil PO Token server started (PID ${BGUTIL_PID})."
    else
        echo "[entrypoint] WARNING: bgutil PO Token server failed to start. Continuing without PO tokens."
    fi
else
    echo "[entrypoint] bgutil PO Token server not available. Skipping."
fi

# Start Uvicorn (the main FastAPI application) in the foreground.
echo "[entrypoint] Starting Uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
