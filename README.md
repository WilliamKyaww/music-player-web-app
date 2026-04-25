# MusicBox

MusicBox is a personal, self-hosted music tool that searches YouTube, queues MP3 downloads locally, and grows into playlist management and local playback over time.


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

## Deploying on Render

MusicBox is set up for a single Docker web service on Render. The Docker image:

- builds the React frontend
- installs the FastAPI backend
- installs `ffmpeg`
- serves the frontend and `/api` from one Render URL

In Render, create a **Web Service** from this repo and choose:

```text
Language / Runtime: Docker
Root Directory: leave blank
Build Command: leave blank
Start Command: leave blank
Health Check Path: /api/health
```

If you are on the screen that asks for a Python start command like `gunicorn your_application.wsgi`, switch the runtime/language to **Docker** instead.

Set these environment variables in Render:

```env
YOUTUBE_API_KEY=your_key_here
FRONTEND_ORIGIN=https://your-render-service-name.onrender.com
MUSICBOX_AUTH_USERNAME=choose_a_private_username
MUSICBOX_AUTH_PASSWORD=choose_a_private_password
DOWNLOADS_DIR=/app/data/downloads
PLAYLISTS_DIR=/app/data/playlists
EXPORTS_DIR=/app/data/exports
FFMPEG_BINARY=ffmpeg
MAX_CONCURRENT_DOWNLOADS=1
YOUTUBE_SEARCH_CACHE_TTL_SECONDS=300
```

`MUSICBOX_AUTH_USERNAME` and `MUSICBOX_AUTH_PASSWORD` are strongly recommended because a Render web service is internet-accessible by default.

Render free instances use an ephemeral filesystem. That means downloaded MP3s and local playlist data can disappear after restarts or redeploys. For persistent storage, use a paid Render instance with a persistent disk mounted at `/app/data`.

## Notes
- `backend/.env` is gitignored and intended to stay local only.
- Downloaded MP3 files under `backend/data/downloads/` are also gitignored.
- Playlists are persisted locally through a lightweight JSON registry.
- **This repo is currently structured for local development and personal use, not public deployment.**
