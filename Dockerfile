FROM node:24-bookworm-slim AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FFMPEG_BINARY=ffmpeg
ENV DOWNLOADS_DIR=/app/data/downloads
ENV PLAYLISTS_DIR=/app/data/playlists
ENV EXPORTS_DIR=/app/data/exports
ENV MAX_CONCURRENT_DOWNLOADS=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend-builder /frontend/dist ./app/static

RUN mkdir -p /app/data/downloads /app/data/playlists /app/data/exports

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
