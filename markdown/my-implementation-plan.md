# My Implementation Plan

Reviewed on: 2026-04-23

## Executive summary

This idea actually splits into two very different products:

1. A personal or self-hosted tool that downloads YouTube audio as MP3.
2. A public, policy-compliant music web app.

Those are not the same project. The feature set you asked for is closest to the first one, but the first one is not a good candidate for public deployment. My recommended path is:

- Build a self-hosted MVP first if the real value is YouTube-to-MP3.
- If you later want a public app, fork the product direction and remove stream-ripping and ad-bypass features.

The plan below assumes the recommended first path: a self-hosted personal tool.

## Product boundaries

### In scope for the self-hosted MVP

- Search YouTube videos
- Show results as cards with thumbnails and actions
- Download selected tracks as MP3
- Show job progress and failure states
- Create, rename, delete, and reorder playlists
- Download playlists as ZIP files containing MP3s
- Play already downloaded local MP3 files inside the app
- Import Spotify playlists and map them to YouTube results
- Add a basic recommendation layer based on first-party user behavior

### Out of scope for the MVP

- Public SaaS deployment
- Direct YouTube streaming inside the app
- "No ads" YouTube playback
- Dependence on Spotify recommendations or audio-features endpoints
- ML training on Spotify content
- Multi-tenant auth, billing, or social features

## Core product decisions

### 1. Playback strategy

Do not build the player around live YouTube stream proxying.

Use:

- In-app playback for files the tool has already downloaded locally
- Optional external "Open on YouTube" action for search results before download

This keeps the player stable, simplifies buffering, and avoids making the app depend on fragile expiring YouTube stream URLs.

### 2. Playlist export format

Use ZIP of individual MP3 files as the default.

Do not default to a single merged MP3 because:

- It loses clean track boundaries
- Metadata is messier
- Failure handling is worse
- Users usually expect one file per song

### 3. Spotify integration model

Do not ask end users for Spotify client ID and client secret.

Use:

- Your app's Spotify credentials on the server
- Client Credentials only for public playlist metadata when that is sufficient
- OAuth only if you later want user-specific Spotify data

### 4. Recommendation strategy

Do not depend on Spotify's recommendations or audio-features endpoints.

Start with:

- Co-occurrence from playlists
- Search-click history
- Downloads
- Plays
- Skips
- Saves

This is first-party data you control and can grow over time.

## Recommended stack

For a solo developer MVP, I would simplify the stack slightly:

- Frontend: React + TypeScript + Vite
- UI: Tailwind CSS
- State and data fetching: TanStack Query plus small local state
- Backend: FastAPI
- Background jobs: RQ or Dramatiq with Redis
- Database: SQLite for MVP, PostgreSQL when needed
- Storage: local filesystem under `data/`
- YouTube search: YouTube Data API v3
- Download engine: yt-dlp
- Conversion: FFmpeg
- Packaging: Docker Compose

Why this stack:

- It keeps Claude's good frontend/backend split
- It reduces early infrastructure complexity
- It supports long-running jobs cleanly
- It stays easy to move from local use to a more serious deployment later

## System architecture

### Frontend

Main screens:

- Search page
- Downloads queue
- Playlist manager
- Local player
- Spotify import review screen
- Recommendations screen

Main components:

- `SearchBar`
- `ResultCard`
- `DownloadQueuePanel`
- `PlaylistSidebar`
- `PlaylistEditor`
- `ImportReviewTable`
- `LocalAudioPlayer`
- `RecommendationList`

### Backend

Core services:

- `youtube_service` for search and metadata lookup
- `download_service` for yt-dlp orchestration
- `audio_service` for FFmpeg conversion and metadata tagging
- `playlist_service` for CRUD and ordering
- `spotify_service` for playlist parsing and metadata import
- `match_service` for Spotify-to-YouTube candidate scoring
- `recommendation_service` for first-party recommendations

### Worker

Background jobs:

- Single track download
- Playlist batch download
- Spotify playlist import
- Candidate matching
- ZIP creation
- Cleanup of expired temp files

## Data model

Start with these tables:

- `playlists`
- `playlist_items`
- `downloads`
- `download_files`
- `spotify_imports`
- `spotify_import_items`
- `match_candidates`
- `play_events`
- `recommendation_feedback`

Important fields to keep:

- Source URL
- Source platform
- Original Spotify track ID when present
- Chosen YouTube video ID
- Match confidence
- Local file path
- Job status
- Error code and error message

## API surface

Recommended endpoints:

- `GET /api/search?q=...`
- `POST /api/downloads`
- `GET /api/downloads/{id}`
- `GET /api/downloads/{id}/file`
- `GET /api/playlists`
- `POST /api/playlists`
- `PATCH /api/playlists/{id}`
- `DELETE /api/playlists/{id}`
- `POST /api/playlists/{id}/items`
- `PATCH /api/playlists/{id}/items/reorder`
- `DELETE /api/playlists/{id}/items/{itemId}`
- `POST /api/playlists/{id}/export`
- `POST /api/imports/spotify`
- `GET /api/imports/{id}`
- `POST /api/imports/{id}/resolve`
- `GET /api/recommendations`
- `POST /api/events`

## Feature implementation details

### 1. Search

Flow:

- User types query
- Frontend debounces input
- Backend calls YouTube Data API search
- Frontend shows cards with thumbnail, title, channel, duration, and actions

Important safeguards:

- Cache repeated queries briefly
- Rate-limit search
- Show quota-related error states clearly

### 2. Single-track download

Flow:

- User clicks download
- Backend creates a job
- Worker uses yt-dlp to fetch best audio
- Worker converts to MP3 through FFmpeg
- Worker writes file metadata and safe filename
- Frontend polls or subscribes to status updates
- User downloads the finished file

Important safeguards:

- Sanitize filenames
- Reject duplicate in-flight downloads for the same video
- Enforce temp-file cleanup
- Cap concurrent conversions

### 3. Playlist management

Flow:

- User creates and renames playlists
- User adds search results or imported items
- User reorders tracks through drag and drop
- User can remove or replace tracks

Important safeguards:

- Stable ordering via `position`
- Snapshot or optimistic-lock style protection on reorder
- Duplicate detection inside a playlist

### 4. Playlist export

Flow:

- User requests playlist export
- Worker downloads or reuses local files
- Missing files are fetched as needed
- Files are placed into a ZIP
- User receives a ZIP download

Optional later enhancement:

- Generate `.m3u` alongside the ZIP

### 5. In-app playback

MVP playback should use local MP3 files only.

Flow:

- User plays a downloaded track or playlist item with a local file
- Browser plays `/api/downloads/{id}/file`
- App tracks play, pause, skip, and completion events

### 6. Spotify playlist import

Flow:

- User pastes a Spotify playlist URL
- Backend fetches playlist tracks
- Matching job finds top 3 YouTube candidates per track
- UI shows candidate list with confidence and lets user correct bad matches
- Confirmed matches become a new in-app playlist

Matching rules:

- Normalize title and artist text
- Prefer official artist channels and VEVO-like sources
- Compare duration when available
- Penalize live, remix, slowed, sped-up, and lyric-video mismatches unless requested

This is much safer than blindly taking the first result.

### 7. Recommendations

Version 1:

- Most-played in similar playlists
- "Users who downloaded X also downloaded Y"
- Artist and title similarity from imported data
- Recent search and save patterns

Version 2:

- Implicit collaborative filtering from your own interaction table
- Embedding-based similarity using your own catalog metadata or local files

## Phase plan

### Phase 0: Decision gate

- Confirm this is a self-hosted tool, not a public SaaS
- Confirm ZIP export rather than merged MP3
- Confirm playback is for local files, not proxied YouTube streams

Estimated time: 1 to 2 days

### Phase 1: Search and result cards

- Search page
- Result cards
- YouTube API integration
- Error and empty states

Estimated time: 3 to 5 days

### Phase 2: Download pipeline

- Job model
- Worker setup
- yt-dlp and FFmpeg flow
- Progress updates
- File delivery

Estimated time: 4 to 7 days

### Phase 3: Playlist management

- Playlist CRUD
- Add, remove, replace, reorder
- Basic local player state

Estimated time: 3 to 5 days

### Phase 4: Playlist export

- Batch job orchestration
- ZIP packaging
- Retry and partial-failure handling

Estimated time: 2 to 4 days

### Phase 5: Spotify import

- Playlist parsing
- Candidate matching
- Review and correction UI

Estimated time: 4 to 6 days

### Phase 6: Recommendations v1

- Event tracking
- Basic recommendation service
- Recommendation UI

Estimated time: 5 to 8 days

## Risks and operating concerns

Do not leave these until the end:

- Disk usage limits
- Temp-file cleanup
- Failed-job retry policy
- Duplicate download suppression
- Safe filename generation
- Quota exhaustion on YouTube search
- Broken or removed videos
- Geo-blocked or age-restricted content
- Manual correction flow for bad Spotify-to-YouTube matches

## If you later want a public product

Create a separate public-safe track with these changes:

- Remove arbitrary YouTube-to-MP3 downloading
- Remove direct YouTube stream extraction
- Use official YouTube playback only
- Keep playlists as links and metadata, not ripped audio
- Support playback only for user-uploaded or properly licensed files
- Keep recommendations based on first-party app behavior, not Spotify restricted endpoints

That is a different product with a different compliance posture.
