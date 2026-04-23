import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import {
  enqueueDownload,
  fetchDownloads,
  removeDownload,
} from './api/downloads'
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  fetchPlaylists,
  removePlaylistItem,
  renamePlaylist,
  reorderPlaylistItems,
} from './api/playlists'
import { searchVideos } from './api/search'
import { DownloadQueuePanel } from './components/DownloadQueuePanel'
import { PlaylistPanel } from './components/PlaylistPanel'
import { SearchBar } from './components/SearchBar'
import { StatusPanel } from './components/StatusPanel'
import { VideoCard } from './components/VideoCard'
import type {
  DownloadJob,
  DownloadRuntimeStatus,
  Playlist,
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
  const [pendingDownloadRemovalIds, setPendingDownloadRemovalIds] = useState<string[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const [playlistsErrorMessage, setPlaylistsErrorMessage] = useState<string | null>(
    null,
  )
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [isMutatingPlaylist, setIsMutatingPlaylist] = useState(false)
  const [pendingPlaylistVideoId, setPendingPlaylistVideoId] = useState<string | null>(
    null,
  )

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

  const handleRemoveDownload = useEffectEvent(
    async (job: DownloadJob, deleteFile: boolean) => {
      setPendingDownloadRemovalIds((current) =>
        current.includes(job.id) ? current : [...current, job.id],
      )

      try {
        await removeDownload(job.id, deleteFile)
        startTransition(() => {
          setDownloadJobs((current) => current.filter((item) => item.id !== job.id))
          setDownloadsErrorMessage(null)
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not remove the download job.'

        startTransition(() => {
          setDownloadsErrorMessage(message)
        })
      } finally {
        setPendingDownloadRemovalIds((current) =>
          current.filter((id) => id !== job.id),
        )
      }
    },
  )

  const loadPlaylists = useEffectEvent(async (signal?: AbortSignal) => {
    try {
      const response = await fetchPlaylists(signal)
      startTransition(() => {
        setPlaylists(response.items)
        setPlaylistsErrorMessage(null)
        setActivePlaylistId((current) => {
          if (current && response.items.some((playlist) => playlist.id === current)) {
            return current
          }

          return response.items[0]?.id ?? null
        })
      })
    } catch (error) {
      if (signal?.aborted) {
        return
      }

      const message =
        error instanceof Error ? error.message : 'Could not refresh playlists.'

      startTransition(() => {
        setPlaylistsErrorMessage(message)
      })
    }
  })

  const handleCreatePlaylist = useEffectEvent(async (name: string) => {
    setIsCreatingPlaylist(true)
    try {
      const playlist = await createPlaylist(name)
      startTransition(() => {
        setPlaylists((current) => [playlist, ...current])
        setActivePlaylistId(playlist.id)
        setPlaylistsErrorMessage(null)
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not create the playlist.'

      startTransition(() => {
        setPlaylistsErrorMessage(message)
      })
    } finally {
      setIsCreatingPlaylist(false)
    }
  })

  const handleRenamePlaylist = useEffectEvent(async (playlistId: string, name: string) => {
    setIsMutatingPlaylist(true)
    try {
      const updated = await renamePlaylist(playlistId, name)
      startTransition(() => {
        setPlaylists((current) =>
          current.map((playlist) => (playlist.id === updated.id ? updated : playlist)),
        )
        setPlaylistsErrorMessage(null)
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not rename the playlist.'

      startTransition(() => {
        setPlaylistsErrorMessage(message)
      })
    } finally {
      setIsMutatingPlaylist(false)
    }
  })

  const handleDeletePlaylist = useEffectEvent(async (playlistId: string) => {
    setIsMutatingPlaylist(true)
    try {
      await deletePlaylist(playlistId)
      startTransition(() => {
        setPlaylists((current) => {
          const next = current.filter((playlist) => playlist.id !== playlistId)
          setActivePlaylistId((active) => {
            if (active && active !== playlistId) {
              return active
            }
            return next[0]?.id ?? null
          })
          return next
        })
        setPlaylistsErrorMessage(null)
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete the playlist.'

      startTransition(() => {
        setPlaylistsErrorMessage(message)
      })
    } finally {
      setIsMutatingPlaylist(false)
    }
  })

  const handleAddToPlaylist = useEffectEvent(async (video: VideoSearchResult) => {
    if (!activePlaylistId) {
      setPlaylistsErrorMessage('Create and select a playlist first.')
      return
    }

    setPendingPlaylistVideoId(video.id)
    setIsMutatingPlaylist(true)
    try {
      const updated = await addVideoToPlaylist(activePlaylistId, video)
      startTransition(() => {
        setPlaylists((current) =>
          current.map((playlist) => (playlist.id === updated.id ? updated : playlist)),
        )
        setPlaylistsErrorMessage(null)
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not add this video to the playlist.'

      startTransition(() => {
        setPlaylistsErrorMessage(message)
      })
    } finally {
      setPendingPlaylistVideoId(null)
      setIsMutatingPlaylist(false)
    }
  })

  const handleRemovePlaylistItem = useEffectEvent(
    async (playlistId: string, itemId: string) => {
      setIsMutatingPlaylist(true)
      try {
        const updated = await removePlaylistItem(playlistId, itemId)
        startTransition(() => {
          setPlaylists((current) =>
            current.map((playlist) => (playlist.id === updated.id ? updated : playlist)),
          )
          setPlaylistsErrorMessage(null)
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not remove playlist item.'

        startTransition(() => {
          setPlaylistsErrorMessage(message)
        })
      } finally {
        setIsMutatingPlaylist(false)
      }
    },
  )

  const handleMovePlaylistItem = useEffectEvent(
    async (playlistId: string, itemId: string, direction: 'up' | 'down') => {
      const playlist = playlists.find((entry) => entry.id === playlistId)
      if (!playlist) {
        return
      }

      const items = [...playlist.items].sort((left, right) => left.position - right.position)
      const index = items.findIndex((item) => item.id === itemId)
      if (index < 0) {
        return
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= items.length) {
        return
      }

      const [movedItem] = items.splice(index, 1)
      items.splice(targetIndex, 0, movedItem)
      const orderedItemIds = items.map((item) => item.id)

      setIsMutatingPlaylist(true)
      try {
        const updated = await reorderPlaylistItems(playlistId, orderedItemIds)
        startTransition(() => {
          setPlaylists((current) =>
            current.map((entry) => (entry.id === updated.id ? updated : entry)),
          )
          setPlaylistsErrorMessage(null)
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not reorder the playlist.'

        startTransition(() => {
          setPlaylistsErrorMessage(message)
        })
      } finally {
        setIsMutatingPlaylist(false)
      }
    },
  )

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

  useEffect(() => {
    const controller = new AbortController()
    void loadPlaylists(controller.signal)

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

  const activePlaylist =
    playlists.find((playlist) => playlist.id === activePlaylistId) ?? playlists[0] ?? null

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
          pendingRemovalIds={pendingDownloadRemovalIds}
          onRemoveJob={handleRemoveDownload}
        />

        <PlaylistPanel
          playlists={playlists}
          activePlaylistId={activePlaylist?.id ?? null}
          errorMessage={playlistsErrorMessage}
          isCreating={isCreatingPlaylist}
          isMutating={isMutatingPlaylist}
          pendingVideoId={pendingPlaylistVideoId}
          onSelectPlaylist={setActivePlaylistId}
          onCreatePlaylist={handleCreatePlaylist}
          onRenamePlaylist={handleRenamePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          onRemoveItem={handleRemovePlaylistItem}
          onMoveItem={handleMovePlaylistItem}
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
              : activePlaylist
                ? `Playlist actions target "${activePlaylist.name}" right now.`
                : 'Create and select a playlist to use the Playlist button on result cards.'}
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
                onAddToPlaylist={handleAddToPlaylist}
                canAddToPlaylist={Boolean(activePlaylist)}
                playlistLabel={
                  activePlaylist ? `Add to ${activePlaylist.name}` : 'Select playlist'
                }
                isAddingToPlaylist={pendingPlaylistVideoId === video.id}
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
