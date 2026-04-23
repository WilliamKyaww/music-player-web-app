import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import { enqueueDownload, fetchDownloads } from './api/downloads'
import { searchVideos } from './api/search'
import { DownloadQueuePanel } from './components/DownloadQueuePanel'
import { SearchBar } from './components/SearchBar'
import { StatusPanel } from './components/StatusPanel'
import { VideoCard } from './components/VideoCard'
import type {
  DownloadJob,
  DownloadRuntimeStatus,
  VideoSearchResult,
} from './types'
import './App.css'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VideoSearchResult[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeQuery, setActiveQuery] = useState('')
  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>([])
  const [downloadRuntime, setDownloadRuntime] = useState<DownloadRuntimeStatus | null>(
    null,
  )
  const [downloadsErrorMessage, setDownloadsErrorMessage] = useState<string | null>(
    null,
  )
  const [pendingDownloadVideoIds, setPendingDownloadVideoIds] = useState<string[]>([])

  const runSearch = useEffectEvent(async (nextQuery: string, signal: AbortSignal) => {
    setStatus('loading')
    setErrorMessage(null)

    try {
      const response = await searchVideos(nextQuery, signal)

      if (signal.aborted) {
        return
      }

      startTransition(() => {
        setResults(response.items)
        setActiveQuery(response.query)
        setStatus('success')
      })
    } catch (error) {
      if (signal.aborted) {
        return
      }

      const message =
        error instanceof Error ? error.message : 'Search failed. Please try again.'

      startTransition(() => {
        setResults([])
        setActiveQuery(nextQuery)
        setErrorMessage(message)
        setStatus('error')
      })
    }
  })

  const loadDownloads = useEffectEvent(async (signal?: AbortSignal) => {
    try {
      const response = await fetchDownloads(signal)
      startTransition(() => {
        setDownloadJobs(response.items)
        setDownloadRuntime(response.runtime)
        setDownloadsErrorMessage(null)
      })
    } catch (error) {
      if (signal?.aborted) {
        return
      }

      const message =
        error instanceof Error
          ? error.message
          : 'Could not refresh the download queue.'

      startTransition(() => {
        setDownloadsErrorMessage(message)
      })
    }
  })

  const handleDownload = useEffectEvent(async (video: VideoSearchResult) => {
    setPendingDownloadVideoIds((current) =>
      current.includes(video.id) ? current : [...current, video.id],
    )

    try {
      const response = await enqueueDownload(video)

      startTransition(() => {
        setDownloadJobs((current) => {
          const remaining = current.filter((item) => item.id !== response.job.id)
          return [response.job, ...remaining]
        })
        setDownloadsErrorMessage(null)
      })

      void loadDownloads()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not start the MP3 download.'

      startTransition(() => {
        setDownloadsErrorMessage(message)
      })
    } finally {
      setPendingDownloadVideoIds((current) =>
        current.filter((videoId) => videoId !== video.id),
      )
    }
  })

  useEffect(() => {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setResults([])
      setActiveQuery('')
      setErrorMessage(null)
      setStatus('idle')
      return
    }

    if (trimmedQuery.length < 2) {
      setResults([])
      setActiveQuery('')
      setErrorMessage(null)
      setStatus('idle')
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      void runSearch(trimmedQuery, controller.signal)
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    void loadDownloads(controller.signal)

    return () => {
      controller.abort()
    }
  }, [])

  const hasShortQuery = query.trim().length > 0 && query.trim().length < 2
  const hasActiveDownloads = downloadJobs.some((job) =>
    ['queued', 'downloading', 'converting'].includes(job.status),
  )

  useEffect(() => {
    if (!hasActiveDownloads) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadDownloads()
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [hasActiveDownloads])

  function getLatestDownloadForVideo(videoId: string) {
    return downloadJobs.find((job) => job.video_id === videoId) ?? null
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__nav">
          <p className="brand">SpotiMy</p>
          <span className="hero__phase">Phase 2 live</span>
        </div>

        <div className="hero__content">
          <div className="hero__copy">
            <p className="hero__eyebrow">Personal project download pipeline</p>
            <h1>Search, queue, convert, and save MP3 files locally.</h1>
            <p className="hero__lead">
              The app now handles single-track download jobs end to end: queue
              creation, progress tracking, conversion, and file delivery once
              the MP3 is ready.
            </p>
          </div>

          <aside className="hero__note">
            <h2>What ships in Phase 2</h2>
            <ul>
              <li>Download jobs with duplicate suppression</li>
              <li>Live queue progress and failure reporting</li>
              <li>Local MP3 file delivery when finished</li>
              <li>Clear toolchain setup feedback for ffmpeg and yt-dlp</li>
            </ul>
          </aside>
        </div>
      </header>

      <main className="workspace">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          isLoading={status === 'loading'}
        />

        <DownloadQueuePanel
          runtime={downloadRuntime}
          jobs={downloadJobs}
          errorMessage={downloadsErrorMessage}
        />

        <section className="results-header" aria-live="polite">
          <div>
            <p className="results-header__label">Search results</p>
            <h2>
              {status === 'success' && activeQuery
                ? `${results.length} result${results.length === 1 ? '' : 's'} for "${activeQuery}"`
                : 'Ready when you are'}
            </h2>
          </div>
          <p className="results-header__body">
            {hasShortQuery
              ? 'Use at least two characters so we do not spam the API with weak queries.'
              : 'Playlist management is still staged for Phase 3, but MP3 jobs are live now.'}
          </p>
        </section>

        {status === 'error' && errorMessage ? (
          <StatusPanel
            tone="error"
            title="Search could not complete"
            body={errorMessage}
          />
        ) : null}

        {status === 'idle' && !query.trim() ? (
          <StatusPanel
            title="Start with a song, artist, or album"
            body="Once your backend has a YouTube API key, searches will appear here automatically as you type."
          />
        ) : null}

        {status === 'success' && results.length === 0 ? (
          <StatusPanel
            title="No matching videos yet"
            body="Try a broader search, remove extra words, or search by artist and track name together."
          />
        ) : null}

        {status === 'loading' ? (
          <section className="results-grid" aria-label="Loading search results">
            {Array.from({ length: 6 }).map((_, index) => (
              <article className="video-card video-card--skeleton" key={index}>
                <div className="video-card__thumbnail-skeleton shimmer" />
                <div className="video-card__body">
                  <div className="line shimmer line--short" />
                  <div className="line shimmer" />
                  <div className="line shimmer line--wide" />
                  <div className="line shimmer line--medium" />
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {status === 'success' && results.length > 0 ? (
          <section className="results-grid">
            {results.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onDownload={handleDownload}
                isSubmittingDownload={pendingDownloadVideoIds.includes(video.id)}
                latestDownload={getLatestDownloadForVideo(video.id)}
              />
            ))}
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
