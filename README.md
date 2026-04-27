# MusicBox

MusicBox is a personal, self-hosted music tool that searches YouTube, queues MP3 downloads locally, and grows into playlist management and local playback over time.

Warning: vibe coded

## Repo structure

```text
backend/
  app/                  FastAPI API, services, and download job logic
  data/downloads/       Runtime-generated MP3 files (gitignored)
  data/playlists/       Runtime-generated playlist registry (local only)
  .env.example          Backend environment template
frontend/
  src/                  React app, search UI, queue UI, and playlist UI
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
YOUTUBE_SEARCH_CACHE_TTL_SECONDS=300
DOWNLOADS_DIR=data/downloads
PLAYLISTS_DIR=data/playlists
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
- Playlists are persisted locally through a lightweight JSON registry.
