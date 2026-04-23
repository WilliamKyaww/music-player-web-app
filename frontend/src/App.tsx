import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import {
  enqueueDownload,
  fetchDownloads,
  removeDownload,
} from './api/downloads'
import {
  createPlaylistExport,
  fetchExports,
  removeExport,
} from './api/exports'
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  fetchPlaylists,
  removePlaylistItem,
  renamePlaylist,
  reorderPlaylistItems,
} from './api/playlists'
import { previewSpotifyPlaylist } from './api/spotify'
import { searchVideos } from './api/search'
import { DownloadQueuePanel } from './components/DownloadQueuePanel'
import { PlaylistExportPanel } from './components/PlaylistExportPanel'
import { PlaylistPanel } from './components/PlaylistPanel'
import { SearchBar } from './components/SearchBar'
import { SpotifyImportPanel } from './components/SpotifyImportPanel'
import { StatusPanel } from './components/StatusPanel'
import { VideoCard } from './components/VideoCard'
import type {
  DownloadJob,
  DownloadRuntimeStatus,
  Playlist,
  PlaylistExportJob,
  SpotifyPlaylistPreview,
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
  const [exportJobs, setExportJobs] = useState<PlaylistExportJob[]>([])
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const [playlistsErrorMessage, setPlaylistsErrorMessage] = useState<string | null>(
    null,
  )
  const [exportsErrorMessage, setExportsErrorMessage] = useState<string | null>(null)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [isMutatingPlaylist, setIsMutatingPlaylist] = useState(false)
  const [isCreatingExport, setIsCreatingExport] = useState(false)
  const [spotifyPreview, setSpotifyPreview] = useState<SpotifyPlaylistPreview | null>(null)
  const [spotifyPreviewErrorMessage, setSpotifyPreviewErrorMessage] = useState<string | null>(
    null,
  )
  const [isLoadingSpotifyPreview, setIsLoadingSpotifyPreview] = useState(false)
  const [pendingPlaylistVideoId, setPendingPlaylistVideoId] = useState<string | null>(
    null,
  )
  const [pendingExportRemovalIds, setPendingExportRemovalIds] = useState<string[]>([])

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

  const loadExports = useEffectEvent(async (signal?: AbortSignal) => {
    try {
      const response = await fetchExports(signal)
      startTransition(() => {
        setExportJobs(response.items)
        setExportsErrorMessage(null)
      })
    } catch (error) {
      if (signal?.aborted) {
        return
      }

      const message =
        error instanceof Error ? error.message : 'Could not refresh playlist exports.'

      startTransition(() => {
        setExportsErrorMessage(message)
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

  const handleAddToPlaylists = useEffectEvent(
    async (video: VideoSearchResult, playlistIds: string[]) => {
      if (playlistIds.length === 0) {
        setPlaylistsErrorMessage('Choose at least one playlist first.')
        return
      }

      setPendingPlaylistVideoId(video.id)
      setIsMutatingPlaylist(true)
      try {
        const results = await Promise.allSettled(
          playlistIds.map((playlistId) => addVideoToPlaylist(playlistId, video)),
        )

        await loadPlaylists()

        const failed = results.filter((result) => result.status === 'rejected')
        if (failed.length > 0) {
          const reason =
            failed[0].status === 'rejected' && failed[0].reason instanceof Error
              ? failed[0].reason.message
              : 'One or more playlist updates failed.'

          startTransition(() => {
            setPlaylistsErrorMessage(
              `Added to ${results.length - failed.length} playlist(s). ${reason}`,
            )
          })
        } else {
          startTransition(() => {
            setPlaylistsErrorMessage(null)
          })
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Could not add this video to the selected playlists.'

        startTransition(() => {
          setPlaylistsErrorMessage(message)
        })
      } finally {
        setPendingPlaylistVideoId(null)
        setIsMutatingPlaylist(false)
      }
    },
  )

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

  const handleCreateExport = useEffectEvent(async (playlistId: string, exportFormat: 'zip' | 'combined_mp3') => {
    setIsCreatingExport(true)
    try {
      const exportJob = await createPlaylistExport(playlistId, exportFormat)
      startTransition(() => {
        setExportJobs((current) => [exportJob, ...current.filter((job) => job.id !== exportJob.id)])
        setExportsErrorMessage(null)
      })
      void loadExports()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not start playlist export.'

      startTransition(() => {
        setExportsErrorMessage(message)
      })
    } finally {
      setIsCreatingExport(false)
    }
  })

  const handleRemoveExport = useEffectEvent(
    async (exportJob: PlaylistExportJob, deleteFile: boolean) => {
      setPendingExportRemovalIds((current) =>
        current.includes(exportJob.id) ? current : [...current, exportJob.id],
      )

      try {
        await removeExport(exportJob.id, deleteFile)
        startTransition(() => {
          setExportJobs((current) => current.filter((job) => job.id !== exportJob.id))
          setExportsErrorMessage(null)
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not remove export entry.'

        startTransition(() => {
          setExportsErrorMessage(message)
        })
      } finally {
        setPendingExportRemovalIds((current) =>
          current.filter((id) => id !== exportJob.id),
        )
      }
    },
  )

  const handleSpotifyPreview = useEffectEvent(async (playlistUrl: string) => {
    setIsLoadingSpotifyPreview(true)
    try {
      const preview = await previewSpotifyPlaylist(playlistUrl)
      startTransition(() => {
        setSpotifyPreview(preview)
        setSpotifyPreviewErrorMessage(null)
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not preview the Spotify playlist.'

      startTransition(() => {
        setSpotifyPreviewErrorMessage(message)
      })
    } finally {
      setIsLoadingSpotifyPreview(false)
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

  useEffect(() => {
    const controller = new AbortController()
    void loadPlaylists(controller.signal)

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadExports(controller.signal)

    return () => {
      controller.abort()
    }
  }, [])

  const hasShortQuery = query.trim().length > 0 && query.trim().length < 2
  const hasActiveDownloads = downloadJobs.some((job) =>
    ['queued', 'downloading', 'converting'].includes(job.status),
  )
  const hasActiveExports = exportJobs.some((job) =>
    ['queued', 'preparing', 'packaging'].includes(job.status),
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

  useEffect(() => {
    if (!hasActiveExports) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadExports()
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [hasActiveExports])

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
          <span className="hero__phase">Phase 3 live</span>
        </div>

        <div className="hero__content">
          <div className="hero__copy">
            <p className="hero__eyebrow">Playlist-driven local music workflow</p>
            <h1>Search, download, sort, and organize songs across playlists.</h1>
            <p className="hero__lead">
              The app now combines the full download queue with persistent playlist
              management, including multi-playlist add flows and quick track-order controls.
            </p>
          </div>

          <aside className="hero__note">
            <h2>What ships in Phase 3</h2>
            <ul>
              <li>Persistent local playlists with CRUD support</li>
              <li>Multi-playlist add from search result cards</li>
              <li>Queue cleanup controls for completed and failed jobs</li>
              <li>Icon-based controls for playlist and download actions</li>
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

        <PlaylistExportPanel
          activePlaylist={activePlaylist}
          exportJobs={exportJobs}
          errorMessage={exportsErrorMessage}
          isCreatingExport={isCreatingExport}
          pendingRemovalIds={pendingExportRemovalIds}
          onCreateExport={handleCreateExport}
          onRemoveExport={handleRemoveExport}
        />

        <SpotifyImportPanel
          preview={spotifyPreview}
          errorMessage={spotifyPreviewErrorMessage}
          isLoading={isLoadingSpotifyPreview}
          onPreview={handleSpotifyPreview}
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
                ? `The plus action preselects "${activePlaylist.name}" but you can target multiple playlists.`
                : playlists.length > 0
                  ? 'Use the plus action on a result card to choose one or more playlists.'
                  : 'Create a playlist first to start organizing search results.'}
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
                onAddToPlaylists={handleAddToPlaylists}
                playlists={playlists}
                activePlaylistId={activePlaylist?.id ?? null}
                canAddToPlaylist={playlists.length > 0}
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
