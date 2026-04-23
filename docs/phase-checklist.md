# Project Checklist

Last updated: 2026-04-23

This checklist is intentionally detailed and granular so we can track exactly what has been completed, what is partially done, and what still needs attention.

## Legend

- `[x]` complete
- `[ ]` not complete
- `[~]` partially complete / needs follow-up

## Phase 1: Search And Result Cards

### Repository and project setup

- [x] Create a root git repository
- [x] Create a split `frontend/` and `backend/` structure
- [x] Scaffold the React + TypeScript + Vite frontend
- [x] Create the FastAPI backend package structure
- [x] Add backend dependency manifest
- [x] Add frontend dependency manifest
- [x] Add a root `.gitignore`
- [x] Add backend `.env.example`
- [x] Add frontend `.env.example`

### Backend search API

- [x] Create backend app configuration loader
- [x] Add YouTube API key support through environment config
- [x] Create `GET /api/search`
- [x] Validate search query length
- [x] Validate `max_results`
- [x] Call YouTube `search` API from the backend
- [x] Call YouTube `videos` API to enrich results with durations
- [x] Convert ISO 8601 durations into readable labels
- [x] Pick the best thumbnail URL from the returned payload
- [x] Normalize backend search responses into a typed response model
- [x] Surface configuration errors cleanly to the frontend
- [x] Surface upstream YouTube errors cleanly to the frontend
- [x] Add a basic `/api/health` endpoint

### Frontend search UX

- [x] Replace the default Vite starter page
- [x] Build a search-first landing screen
- [x] Add a debounced search input
- [x] Trigger backend search calls from the frontend
- [x] Cancel stale in-flight searches when the query changes
- [x] Render result cards in a grid
- [x] Show thumbnail, title, channel, and duration on each card
- [x] Add an external "Open on YouTube" action
- [x] Add placeholder buttons for future playlist/download actions
- [x] Show an idle state before the first search
- [x] Show loading skeletons while search is in progress
- [x] Show an empty state when nothing matches
- [x] Show an error state when the search API fails
- [x] Wire Vite dev proxying to the backend API

### Phase 1 safeguards

- [x] Debounce frontend search calls to reduce unnecessary API traffic
- [x] Add backend-side response shaping so the frontend never sees raw YouTube payloads
- [x] Add search result caching on the backend to reduce repeated YouTube quota usage
- [ ] Add backend-side request rate limiting
- [ ] Add automated backend tests for search normalization and duration formatting
- [ ] Add automated frontend tests for idle/loading/error/empty states

## Phase 2: Download Pipeline

### Backend download job model

- [x] Define typed models for download request payloads
- [x] Define typed models for download jobs
- [x] Define typed models for runtime dependency status
- [x] Add a download manager service
- [x] Store download jobs in an in-memory registry
- [x] Add duplicate suppression for active downloads by video ID
- [x] Add per-job IDs
- [x] Track `queued`, `downloading`, `converting`, `completed`, and `failed` states
- [x] Track progress percentage
- [x] Track status detail text
- [x] Track final file name and size
- [x] Track per-job output directory and file path

### Backend download execution

- [x] Add `yt-dlp` as a backend dependency
- [x] Detect whether `yt-dlp` is available
- [x] Detect whether `ffmpeg` is available
- [x] Add configurable `DOWNLOADS_DIR`
- [x] Add configurable `MAX_CONCURRENT_DOWNLOADS`
- [x] Add configurable `FFMPEG_BINARY`
- [x] Create download output directories on demand
- [x] Sanitize generated file names
- [x] Use an in-process worker strategy via `asyncio.to_thread`
- [x] Cap concurrent download execution with a semaphore
- [x] Download best available audio stream with `yt-dlp`
- [x] Convert downloaded audio to MP3 through `ffmpeg`
- [x] Update progress while audio is downloading
- [x] Update status when conversion starts
- [x] Mark jobs as completed when MP3 output exists
- [x] Mark jobs as failed when exceptions occur
- [x] Release duplicate-suppression locks when jobs finish

### Backend download API

- [x] Create `GET /api/downloads`
- [x] Return runtime dependency status with the queue response
- [x] Create `POST /api/downloads`
- [x] Return a newly queued job payload
- [x] Return whether a new download request was deduplicated
- [x] Create `GET /api/downloads/{id}`
- [x] Create `GET /api/downloads/{id}/file`
- [x] Return MP3 files through `FileResponse`
- [x] Return clear 404 responses for unknown job IDs
- [x] Return clear 409 responses when files are requested before completion
- [x] Return clear 503 responses when local runtime prerequisites are missing

### Frontend download UX

- [x] Add a generic API client helper for typed fetches
- [x] Add frontend download API helpers
- [x] Replace the placeholder download button with a real action
- [x] Disable the download button while a request is being queued
- [x] Reflect per-video active download state on the result cards
- [x] Show status-aware button text like queued/downloading/completed/retry
- [x] Add a dedicated download queue panel
- [x] Show runtime setup warnings in the queue panel
- [x] Show queue refresh errors in the queue panel
- [x] Show per-job title, channel, status, progress, and detail text
- [x] Show a save link for completed MP3 files
- [x] Poll the queue while active jobs exist
- [x] Refresh queue state after enqueueing a new job

### Phase 2 safeguards and follow-up

- [x] Make missing local tools explicit instead of failing silently
- [x] Support a direct `FFMPEG_BINARY` path for Windows setup flexibility
- [x] Gitignore generated download output
- [x] Verify an end-to-end MP3 download on the current machine
- [ ] Add cleanup logic for old temp/incomplete download directories
- [x] Persist download jobs across backend restarts
- [ ] Add automated tests around download state transitions

## Phase 3: Playlist Management

### Data and backend

- [ ] Choose playlist persistence strategy for MVP
- [ ] Create playlist data model
- [ ] Create playlist item data model
- [ ] Create `GET /api/playlists`
- [ ] Create `POST /api/playlists`
- [ ] Create `PATCH /api/playlists/{id}`
- [ ] Create `DELETE /api/playlists/{id}`
- [ ] Create `POST /api/playlists/{id}/items`
- [ ] Create `DELETE /api/playlists/{id}/items/{itemId}`
- [ ] Create `PATCH /api/playlists/{id}/items/reorder`
- [ ] Prevent duplicate entries within a playlist
- [ ] Preserve stable playlist item ordering

### Frontend

- [ ] Add a playlist sidebar or panel
- [ ] Add playlist create flow
- [ ] Add playlist rename flow
- [ ] Add playlist delete flow
- [ ] Add "Add to playlist" action from result cards
- [ ] Add playlist item remove flow
- [ ] Add playlist reorder UI
- [ ] Add empty state for no playlists
- [ ] Add empty state for empty playlists

## Phase 4: Playlist Export

### Backend

- [ ] Create `POST /api/playlists/{id}/export`
- [ ] Reuse already-downloaded MP3 files when available
- [ ] Queue missing track downloads required for export
- [ ] Build ZIP archives from playlist tracks
- [ ] Return export job progress and status
- [ ] Return final ZIP file
- [ ] Handle partial failures gracefully

### Frontend

- [ ] Add playlist export action
- [ ] Show export progress
- [ ] Show export failure state
- [ ] Show final ZIP save action

## Phase 5: Spotify Playlist Import

### Backend

- [ ] Add Spotify credentials/config support
- [ ] Parse Spotify playlist URLs
- [ ] Fetch public playlist metadata from Spotify
- [ ] Extract track names and artists from playlist entries
- [ ] Build YouTube search queries for imported tracks
- [ ] Score multiple YouTube candidates per imported track
- [ ] Expose import status and candidate review data
- [ ] Expose confirmation endpoint for resolved matches

### Frontend

- [ ] Add Spotify playlist import form
- [ ] Show import progress
- [ ] Show candidate review table
- [ ] Allow manual replacement of poor matches
- [ ] Convert confirmed matches into an app playlist

## Phase 6: Recommendations

### Data collection

- [ ] Define event model for plays
- [ ] Define event model for downloads
- [ ] Define event model for saves
- [ ] Define event model for skips
- [ ] Define event model for playlist additions
- [ ] Start storing recommendation-relevant first-party events

### Recommendation engine

- [ ] Implement simple co-occurrence recommendations
- [ ] Implement "users who downloaded X also downloaded Y" style logic
- [ ] Implement artist/title similarity heuristics
- [ ] Add recommendation endpoint
- [ ] Add recommendation UI
- [ ] Add feedback loop for recommendation quality

### Later recommendation improvements

- [ ] Add implicit collaborative filtering
- [ ] Add more advanced similarity scoring
- [ ] Add evaluation metrics for recommendation quality
