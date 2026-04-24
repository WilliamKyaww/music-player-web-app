import { useState } from 'react'
import type { SpotifyPlaylistPreview } from '../types'

type SpotifyImportPanelProps = {
  preview: SpotifyPlaylistPreview | null
  errorMessage: string | null
  isLoading: boolean
  onPreview: (playlistUrl: string) => void
}

function formatDuration(durationMs: number | null) {
  if (!durationMs || durationMs <= 0) {
    return null
  }

  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function SpotifyImportPanel({
  preview,
  errorMessage,
  isLoading,
  onPreview,
}: SpotifyImportPanelProps) {
  const [playlistUrl, setPlaylistUrl] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = playlistUrl.trim()
    if (!normalized) {
      return
    }

    onPreview(normalized)
  }

  return (
    <section className="spotify-panel">
      <div className="spotify-panel__header">
        <h3>Spotify Import</h3>
      </div>

      <form className="spotify-panel__form" onSubmit={handleSubmit}>
        <input
          className="spotify-panel__input"
          type="url"
          value={playlistUrl}
          onChange={(event) => setPlaylistUrl(event.target.value)}
          placeholder="https://open.spotify.com/playlist/..."
        />
        <button
          type="submit"
          className="spotify-panel__button"
          disabled={isLoading || !playlistUrl.trim()}
        >
          {isLoading ? 'Loading preview...' : 'Preview playlist'}
        </button>
      </form>

      {errorMessage ? (
        <div className="playlists-panel__alert playlists-panel__alert--error">
          <h3>Spotify preview failed</h3>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {preview ? (
        <div className="spotify-panel__preview">
          <div className="spotify-panel__summary">
            <h4>{preview.playlist_name}</h4>
            <p>
              {preview.playlist_owner ? `${preview.playlist_owner} · ` : ''}
              {preview.total_tracks} total track{preview.total_tracks === 1 ? '' : 's'}
            </p>
          </div>

          <div className="spotify-panel__track-list">
            {preview.preview_tracks.map((track, index) => (
              <article className="spotify-panel__track" key={track.spotify_track_id || `${track.title}-${index}`}>
                <span className="playlist-track__position">{index + 1}</span>
                <div>
                  <h5>{track.title}</h5>
                  <p>
                    {track.artists.join(', ') || 'Unknown artist'}
                    {track.album ? ` · ${track.album}` : ''}
                    {formatDuration(track.duration_ms) ? ` · ${formatDuration(track.duration_ms)}` : ''}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="playlists-panel__alert">
          <p>Paste a playlist URL above to preview</p>
        </div>
      )}
    </section>
  )
}
