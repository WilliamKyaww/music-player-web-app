# Claude Sonnet 4.6 Implementation Plan

Source artifact: https://claude.ai/public/artifacts/da9e7e8d-8b2e-44a2-a305-f645b445b5ad  
Reviewed on: 2026-04-23  
Note: This is a faithful paraphrased summary of the public artifact, not a verbatim transcript.

## Overall direction

Claude proposes a full-stack web app for:

- Searching YouTube videos
- Downloading selected videos as MP3 files
- Managing playlists inside the app
- Playing music directly inside the web app
- Importing Spotify playlists and mapping them to YouTube results
- Generating music recommendations through Spotify APIs and later through an internal ML system

## Legal framing

Claude explicitly warns that:

- Downloading YouTube videos and stripping audio violates YouTube's Terms of Service
- Ad-free playback outside YouTube's approved player flow is problematic
- The idea is safest for private or educational use
- Spotify playlist import is treated as acceptable because it uses Spotify metadata

Claude suggests private hosting, Creative Commons or royalty-free content, and looking into licensing or restricted YouTube offline options before any public deployment.

## Proposed stack

- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS + shadcn/ui
- State: Zustand
- Backend: Python + FastAPI
- Download engine: yt-dlp
- Audio conversion: FFmpeg
- Background jobs: Celery + Redis
- Database: PostgreSQL + SQLAlchemy
- Auth: Clerk or Supabase Auth
- Recommendations: scikit-learn + Surprise
- Deployment: Docker Compose

## Architecture

Claude's architecture is:

- React frontend for search, cards, playlists, and player UI
- FastAPI backend exposing search, download, playlist, Spotify, recommendation, and stream endpoints
- YouTube Data API for search
- Celery + Redis for async download and conversion jobs
- yt-dlp + FFmpeg for download and MP3 conversion
- Spotify API for playlist import and recommendation seeding

## Feature breakdown

### 1. YouTube search

Claude proposes:

- A debounced search bar calling `/api/search?q=...`
- Backend calls to YouTube Data API v3 `search.list`
- Result cards containing thumbnail, title, channel name, duration, and actions
- A note that YouTube search costs 100 quota units per call, so the free tier is limited

### 2. MP3 download with progress bar

Claude proposes:

- `POST /api/download` with a video ID and title
- A Celery task that runs yt-dlp and FFmpeg asynchronously
- Progress tracking through polling or WebSocket updates
- Download completion through a generated file URL
- Server-side conversion to MP3 at around 192 kbps

An example implementation uses:

- `yt-dlp` with `bestaudio`
- FFmpeg extract-audio postprocessing
- Progress hooks to update task state

### 3. Playlist management

Claude proposes:

- Database tables for playlists and playlist tracks
- Endpoints to create, rename, delete, add tracks, remove tracks, and reorder tracks
- UI patterns like a sidebar, drag-and-drop ordering, and context menus
- An "Add to playlist" action from each search result card

For playlist download, Claude suggests:

- `POST /api/playlists/{id}/download`
- Downloading and converting every track in the playlist
- Bundling them into a ZIP archive
- Returning `playlist_name.zip`

### 4. In-app music player

Claude proposes:

- Extracting a direct YouTube audio URL with yt-dlp
- A stream endpoint such as `GET /api/stream/{videoId}`
- Browser playback through an `<audio>` element
- A bottom player bar with play, pause, skip, queue, volume, and scrubber controls
- Refreshing stream URLs periodically because the URLs expire

### 5. Spotify playlist import

Claude proposes:

- User pastes a Spotify playlist URL
- Backend reads playlist tracks from Spotify Web API
- Each Spotify track is searched on YouTube
- The top YouTube result is added into a new in-app playlist
- Search strings like `"song artist official audio"` to improve match quality
- Flagging unmatched tracks for manual correction

Claude suggests Client Credentials flow for public playlists.

### 6. Spotify-powered recommendations

Claude proposes:

- User provides Spotify API credentials
- App resolves a Spotify track from a YouTube item
- App calls Spotify's recommendations endpoint
- Resulting Spotify recommendations are searched on YouTube
- Recommendations are shown as cards inside the app

### 7. Internal ML recommendation engine

Claude proposes two methods:

- Content-based filtering from Spotify audio features such as danceability, energy, valence, tempo, acousticness, and instrumentalness
- Collaborative filtering using playlist membership data and matrix factorization through the `Surprise` library

Claude suggests:

- Using cosine similarity for content-based recommendations
- Using implicit ratings from playlist membership for collaborative filtering
- Falling back to Spotify recommendations during cold start

## Suggested project structure

Claude suggests a split repo shape like:

- `frontend/src/components/`
- `frontend/src/store/`
- `frontend/src/api/`
- `backend/routes/`
- `backend/tasks/`
- `backend/models/`
- `backend/ml/`
- `docker-compose.yml`
- `.env`

## Delivery phases

Claude's timeline is roughly:

- Phase 1: Search, cards, MP3 download, progress bar
- Phase 2: Playlist CRUD and playlist download
- Phase 3: In-app player
- Phase 4: Spotify import and Spotify-backed recommendations
- Phase 5: ML recommendation engine

Estimated total: about 8 to 11 weeks for a solo developer.

## Claude's implicit product assumptions

The artifact assumes:

- yt-dlp and FFmpeg are acceptable technical foundations
- Direct YouTube audio streaming can power an in-app player
- Spotify recommendation and audio-feature endpoints are available
- Asking users for Spotify API credentials is an acceptable UX
- The app can be built first and legal/compliance issues can be handled later
