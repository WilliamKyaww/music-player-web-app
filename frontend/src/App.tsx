import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import { searchVideos } from './api/search'
import { SearchBar } from './components/SearchBar'
import { StatusPanel } from './components/StatusPanel'
import { VideoCard } from './components/VideoCard'
import type { VideoSearchResult } from './types'
import './App.css'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VideoSearchResult[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeQuery, setActiveQuery] = useState('')

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

  const hasShortQuery = query.trim().length > 0 && query.trim().length < 2

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__nav">
          <p className="brand">SpotiMy</p>
          <span className="hero__phase">Phase 1 live</span>
        </div>

        <div className="hero__content">
          <div className="hero__copy">
            <p className="hero__eyebrow">Personal project search foundation</p>
            <h1>Search YouTube cleanly, stage the rest for later.</h1>
            <p className="hero__lead">
              This first slice gives you the real search loop: query input,
              backend API integration, result cards, and resilient loading,
              empty, and error states.
            </p>
          </div>

          <aside className="hero__note">
            <h2>What ships in Phase 1</h2>
            <ul>
              <li>Debounced YouTube search</li>
              <li>Thumbnail cards with duration and channel</li>
              <li>Friendly empty and error feedback</li>
              <li>Clear hand-off to future download and playlist actions</li>
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
              : 'Download and playlist buttons are intentionally staged for the next phase.'}
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
              <VideoCard key={video.id} video={video} />
            ))}
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
