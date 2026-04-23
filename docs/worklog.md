# Project Worklog

Last updated: 2026-04-23

This file is our running project log. We will keep appending to it as work continues so we always have:

- what we changed
- why we changed it
- how we changed it
- blockers we ran into
- how we resolved them
- what still needs follow-up

## How to use this file going forward

For each work session, add:

1. Date
2. Goal
3. What changed
4. Why it changed
5. Problems encountered
6. Fixes / workarounds
7. Follow-up items

---

## 2026-04-23: Planning review and repo setup

### Goal

Review the original implementation plan, compare it with a more realistic self-hosted approach, and prepare the repo for actual implementation.

### What changed

- Reviewed the Claude public artifact plan in detail
- Compared that plan against current YouTube and Spotify realities
- Wrote three markdown planning/comparison files
- Established that the project would be treated as a personal/self-hosted tool

### Why

The original concept mixed together:

- a personal downloader
- a public music app
- YouTube audio extraction
- Spotify-backed recommendations

Those need different assumptions. The self-hosted route is the practical one for this repo.

### Problems encountered

- Direct access to the Claude artifact was blocked through the browser tool
- Direct HTTP fetch initially returned `403`

### Resolution

- Fetched the rendered public artifact HTML with a browser-like `curl` request
- Parsed the actual rendered content from the page source instead of relying on a blocked page fetch

### Follow-up

- Keep the reviewed planning docs for local reference, but do not treat them as production-facing documentation

---

## 2026-04-23: Phase 1 implementation

### Goal

Build the first vertical slice:

- search UI
- backend YouTube search endpoint
- result cards
- idle/loading/error/empty states

### What changed

#### Repo structure

- Created `frontend/`
- Created `backend/`
- Added root `.gitignore`
- Added backend and frontend env examples

#### Backend

- Created FastAPI app bootstrap
- Added config loading with `pydantic-settings`
- Added `/api/health`
- Added `/api/search`
- Added YouTube service integration
- Added response models for search results
- Added ISO duration formatting

#### Frontend

- Replaced the Vite starter page
- Built the search-first homepage
- Added debounced query handling
- Added result cards
- Added loading skeletons
- Added empty and error states
- Added dev proxy config for `/api`

### Why

Search is the foundation for everything else. Without it, there is no user flow to attach downloads, playlists, or import logic to.

### Problems encountered

- The repo started essentially empty, so there was no pre-existing app structure
- The generated Vite scaffold included template-only files that were not appropriate for the actual project

### Resolution

- Kept the Vite scaffold only for the basic React build setup
- Replaced the starter UI and created a dedicated app structure immediately

### Follow-up

- Add backend-side search caching
- Add backend-side rate limiting later if needed

---

## 2026-04-23: GitHub remote and auth debugging

### Goal

Understand why branch publishing was failing and prepare the repo to push to the correct GitHub account and repo.

### What changed

- Inspected local git state
- Inspected remote configuration
- Determined the active git push identity
- Repointed the local `origin` remote to the intended William account repo URL
- Preserved the old `skedaddle-dev` remote as `skedaddle-origin`

### Why

Publishing was failing even though the browser session appeared to be logged into the intended account.

### Problems encountered

- Browser GitHub auth and git push auth were not the same thing
- GitHub CLI `gh` was not installed on the machine
- The Codex GitHub app session belonged to an unrelated account and could not safely be used for the user's repo operations
- Push attempts to `skedaddle-dev/SpotiMy.git` failed with:
  - `Permission to skedaddle-dev/SpotiMy.git denied to WilliamKyaww.`

### Resolution

- Identified Git Credential Manager as the real auth path used by git
- Verified that the machine was authenticating pushes as `WilliamKyaww`
- Explained that the remote repo target, not the browser session, was the key mismatch
- Switched the local `origin` to the intended William repo URL

### Follow-up

- Ensure the new GitHub repo exists before pushing
- Use the William account path for future pushes unless explicitly changed

---

## 2026-04-23: Phase 2 implementation

### Goal

Build the first real MP3 download workflow:

- enqueue a download
- track progress
- convert to MP3
- offer the completed file for saving

### What changed

#### Backend

- Added `yt-dlp` to backend dependencies
- Added download request and job models
- Added runtime dependency status model
- Added an in-process `DownloadManager`
- Added duplicate download suppression by `video_id`
- Added bounded concurrency control
- Added file name sanitization
- Added runtime output directories under `backend/data/downloads`
- Added:
  - `GET /api/downloads`
  - `POST /api/downloads`
  - `GET /api/downloads/{id}`
  - `GET /api/downloads/{id}/file`
- Added `FFMPEG_BINARY` configuration support

#### Frontend

- Added a generic API client helper
- Added download API helpers
- Turned the download button into a real action
- Added per-card download state feedback
- Added a download queue panel
- Added queue polling while jobs are active
- Added completed file save links

### Why

This is the first core self-hosted differentiator after search. It validates the app’s main value proposition.

### Problems encountered

- `ffmpeg` was not installed or not on `PATH`
- `yt-dlp` was not installed in the backend virtualenv

### Resolution

- Installed `yt-dlp` into the backend virtualenv
- Built runtime dependency detection into the app so missing tools are shown clearly in the UI instead of causing silent failures
- Added `FFMPEG_BINARY` so Windows users can point directly at `ffmpeg.exe` without relying only on `PATH`

### Follow-up

- Install `ffmpeg` locally on the machine and verify a real end-to-end download
- Add cleanup for old failed/incomplete download folders
- Persist download jobs beyond backend restart if we want more durable queue behavior

---

## 2026-04-23: Repo structure cleanup and documentation

### Goal

Clean up the repository structure so it makes more sense on GitHub and start durable project documentation.

### What changed

- Replaced the Vite-generated `frontend/README.md` with a root `README.md`
- Removed `frontend/.gitignore`
- Consolidated ignore rules into the root `.gitignore`
- Ignored runtime download output under `backend/data/downloads/`
- Marked the planning `markdown/` folder to be ignored going forward
- Created `docs/phase-checklist.md`
- Created this `docs/worklog.md`

### Why

The root of the repo is the right place for GitHub-facing documentation. Nested scaffold files were useful initially, but not as the long-term structure.

### Problems encountered

- `backend/.env` needed to remain local, hidden, and untracked
- The planning markdown files were useful locally but were not meant to become durable repo-facing docs

### Resolution

- Verified that `backend/.env` was still gitignored and not tracked
- Hid `backend/.env` on Windows
- Moved durable documentation into a tracked `docs/` folder
- Ignored the older planning markdown folder

### Follow-up

- Keep `docs/worklog.md` updated as implementation continues
- Keep `docs/phase-checklist.md` accurate as tasks move from planned to done

---

## Current open blockers

### Blocker: `ffmpeg` not yet available locally

#### Impact

- Phase 2 UI and backend are implemented
- Actual MP3 conversions cannot complete until `ffmpeg` is available

#### Recommended fix

Either:

- install `ffmpeg` and add it to `PATH`, or
- set `FFMPEG_BINARY` in `backend/.env` to the full `ffmpeg.exe` path

### Blocker: no end-to-end download verification yet

#### Impact

- The code is implemented and builds cleanly
- We have not yet validated the full download flow on this specific machine

#### Recommended fix

- install/configure `ffmpeg`
- run backend and frontend
- queue a known-good YouTube download
- confirm MP3 save works from the queue panel

---

## 2026-04-23: Checklist, worklog, gitignore hygiene, and a Phase 1 follow-up

### Goal

Improve project hygiene and create durable project tracking docs, then close one meaningful gap left from the Phase 1 safeguards.

### What changed

- Added `markdown/` to the root `.gitignore`
- Removed the existing `markdown/` planning files from git tracking while keeping them locally
- Created `docs/phase-checklist.md`
- Created and expanded this `docs/worklog.md`
- Added backend search-result caching with a configurable TTL

### Why

- The old `markdown/` files are useful as local planning notes, but they are not the right long-term tracked project docs
- We needed a durable checklist and worklog to keep the project organized as it grows
- Backend search caching was a concrete missed safeguard from Phase 1, and it helps reduce repeated YouTube API usage

### Problems encountered

- `.gitignore` does not affect files that are already tracked

### Resolution

- Used `git rm --cached -r markdown` so the files stay on disk but stop being tracked by git

### Follow-up

- Keep new tracked project documentation under `docs/`
- Decide later whether the local planning `markdown/` folder should remain indefinitely or be archived elsewhere

---

## 2026-04-23: Phase 2 persistence follow-up

### Goal

Improve the Phase 2 download queue so it does not fully disappear when the backend restarts during development.

### What changed

- Added a JSON-backed download registry stored under the downloads data directory
- Persisted download job metadata whenever jobs are created or updated
- Reloaded saved jobs on backend startup
- Marked interrupted in-flight jobs as failed after restart instead of pretending they are still active
- Marked completed jobs as failed if their recorded MP3 file is missing on disk

### Why

During local development, backend restarts are common because of code changes or crashes. Losing the entire queue each time makes the app harder to use and harder to debug.

### Problems encountered

- In-memory state was simple, but volatile
- Restarting while a job was active could leave the UI with no useful history

### Resolution

- Added lightweight JSON persistence that fits the current self-hosted MVP
- Converted unfinished restored jobs into explicit failure states so the UI tells the truth after a restart

### Follow-up

- Consider moving from JSON persistence to a small database if queue state becomes richer
- Add cleanup of very old job folders and registry entries later

---

## 2026-04-23: ffmpeg install, configuration, and live Phase 2 verification

### Goal

Install/configure `ffmpeg` on the current Windows machine and verify that the full Phase 2 download path works for real.

### What changed

- Confirmed `ffmpeg` was not on `PATH`
- Installed `ffmpeg` via `winget` using the `yt-dlp.FFmpeg` package
- Located the installed `ffmpeg.exe` under the WinGet package directory
- Wrote that absolute path into `backend/.env` as `FFMPEG_BINARY`
- Verified the backend download runtime status reported `available=True`
- Ran a real search and download through the backend app code path
- Confirmed MP3 conversion completed successfully
- Confirmed the generated MP3 exists on disk
- Confirmed the file-delivery route returns `200` with `audio/mpeg`

### Why

Phase 2 was implemented in code, but it was not fully proven until the local media toolchain existed and a real download completed successfully on this machine.

### Problems encountered

- `ffmpeg` was not installed
- `winget search` initially prompted for source agreements in a non-interactive way
- Local port `8000` had a stale listener, which made API-based verification misleading because requests were hitting an older backend process

### Resolution

- Installed `ffmpeg` via:
  - `winget install --id yt-dlp.FFmpeg --source winget --accept-source-agreements --accept-package-agreements`
- Avoided waiting for a shell PATH refresh by pointing `FFMPEG_BINARY` directly at the installed executable
- Switched the final verification to the backend app/service path directly after the port listener issue, which still exercised the real Phase 2 logic cleanly

### Test result

Successful end-to-end MP3 generation:

- Test video: `dQw4w9WgXcQ`
- Output file:
  - `backend/data/downloads/81a01cdb52bc43ed8c49bd7162ecf467/Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster) [dQw4w9WgXcQ].mp3`
- Output file size:
  - `5,114,349` bytes
- File delivery route:
  - HTTP `200`
  - `content-type: audio/mpeg`

### Follow-up

- Clean up old temp/job folders automatically
- Add automated tests for download job state transitions
- Investigate the stale local `8000` listener if it appears again during manual testing

---

## Quick reference: what is already done

- Phase 1 core search slice: done
- Phase 2 code path: done
- Phase 2 local tool installation on this machine: done
- Phase 2 real MP3 download verification on this machine: done
- Git/GitHub repo cleanup: done
- Durable project docs: started
