# Music Player Web App

A personal, self-hosted music tool that searches YouTube, queues MP3 downloads locally, and grows into playlist management and local playback over time.

## Current status

Implemented so far:

- Phase 1: YouTube search and result cards
- Phase 2: Local MP3 download queue, progress tracking, conversion flow, and file delivery

Still coming:

- Phase 3: Playlist management
- Phase 4: Playlist export
- Phase 5: Spotify playlist import
- Phase 6: Recommendations

## Repo structure

```text
backend/
  app/                  FastAPI API, services, and download job logic
  data/downloads/       Runtime-generated MP3 files (gitignored)
  .env.example          Backend environment template
frontend/
  src/                  React app, search UI, and download queue UI
markdown/
  *.md                  Planning and comparison notes
```

## Requirements

- Python 3.14+
- Node.js 24+
- A YouTube Data API key
- `ffmpeg`
- `yt-dlp` is already listed in `backend/requirements.txt`

## Backend setup

Create or update `backend/.env` with:

```env
YOUTUBE_API_KEY=your_key_here
FRONTEND_ORIGIN=http://localhost:5173
DOWNLOADS_DIR=data/downloads
MAX_CONCURRENT_DOWNLOADS=2
FFMPEG_BINARY=ffmpeg
```

`FFMPEG_BINARY` can be:

- `ffmpeg` if it is on your `PATH`
- a full path like `C:\\ffmpeg\\bin\\ffmpeg.exe` if you want to point to it directly

## Running the app

Backend:

```powershell
cd backend
.\.venv\Scripts\python -m uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

## Notes

- `backend/.env` is gitignored and intended to stay local only.
- Downloaded MP3 files under `backend/data/downloads/` are also gitignored.
- This repo is currently structured for local development and personal use, not public deployment.
