import { useState } from 'react'
import type { Playlist } from '../types'

type PlaylistPanelProps = {
  playlists: Playlist[]
  activePlaylistId: string | null
  errorMessage: string | null
  isCreating: boolean
  isMutating: boolean
  pendingVideoId: string | null
  onSelectPlaylist: (playlistId: string) => void
  onCreatePlaylist: (name: string) => void
  onRenamePlaylist: (playlistId: string, name: string) => void
  onDeletePlaylist: (playlistId: string) => void
  onRemoveItem: (playlistId: string, itemId: string) => void
  onMoveItem: (playlistId: string, itemId: string, direction: 'up' | 'down') => void
}

export function PlaylistPanel({
  playlists,
  activePlaylistId,
  errorMessage,
  isCreating,
  isMutating,
  pendingVideoId,
  onSelectPlaylist,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onRemoveItem,
  onMoveItem,
}: PlaylistPanelProps) {
  const [draftName, setDraftName] = useState('')
  const activePlaylist =
    playlists.find((playlist) => playlist.id === activePlaylistId) ?? playlists[0] ?? null

  function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = draftName.trim()
    if (!normalized) {
      return
    }

    onCreatePlaylist(normalized)
    setDraftName('')
  }

  function promptRename(playlist: Playlist) {
    const nextName = window.prompt('Rename playlist', playlist.name)
    if (!nextName) {
      return
    }

    onRenamePlaylist(playlist.id, nextName)
  }

  function confirmDelete(playlist: Playlist) {
    const confirmed = window.confirm(
      `Delete playlist "${playlist.name}"? This only removes the playlist record, not any saved MP3 files.`,
    )
    if (!confirmed) {
      return
    }

    onDeletePlaylist(playlist.id)
  }

  return (
    <section className="playlists-panel">
      <div className="playlists-panel__header">
        <div>
          <p className="results-header__label">Playlists</p>
          <h2>Phase 3 playlist manager</h2>
        </div>
        <p className="playlists-panel__body">
          Create a playlist, select it, then use the Playlist button on any search result to add tracks.
        </p>
      </div>

      {errorMessage ? (
        <div className="playlists-panel__alert playlists-panel__alert--error">
          <h3>Playlist action failed</h3>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <form className="playlist-create" onSubmit={handleCreateSubmit}>
        <input
          className="playlist-create__input"
          type="text"
          value={draftName}
          placeholder="New playlist name"
          onChange={(event) => setDraftName(event.target.value)}
          disabled={isCreating}
        />
        <button
          className="playlist-create__button"
          type="submit"
          disabled={isCreating || !draftName.trim()}
        >
          {isCreating ? 'Creating...' : 'Create playlist'}
        </button>
      </form>

      <div className="playlists-layout">
        <div className="playlist-list">
          {playlists.length === 0 ? (
            <div className="playlists-panel__alert">
              <h3>No playlists yet</h3>
              <p>Create one above to start collecting tracks.</p>
            </div>
          ) : (
            playlists.map((playlist) => {
              const isActive = playlist.id === activePlaylist?.id
              return (
                <article
                  className={`playlist-card ${isActive ? 'playlist-card--active' : ''}`}
                  key={playlist.id}
                >
                  <button
                    className="playlist-card__main"
                    type="button"
                    onClick={() => onSelectPlaylist(playlist.id)}
                  >
                    <span className="playlist-card__name">{playlist.name}</span>
                    <span className="playlist-card__meta">
                      {playlist.items.length} item{playlist.items.length === 1 ? '' : 's'}
                    </span>
                  </button>

                  <div className="playlist-card__actions">
                    <button
                      type="button"
                      className="playlist-card__action"
                      onClick={() => promptRename(playlist)}
                      disabled={isMutating}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="playlist-card__action playlist-card__action--danger"
                      onClick={() => confirmDelete(playlist)}
                      disabled={isMutating}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>

        <div className="playlist-detail">
          {activePlaylist ? (
            <>
              <div className="playlist-detail__header">
                <div>
                  <p className="results-header__label">Selected playlist</p>
                  <h3>{activePlaylist.name}</h3>
                </div>
                {pendingVideoId ? (
                  <span className="playlist-detail__status">Adding track...</span>
                ) : null}
              </div>

              {activePlaylist.items.length === 0 ? (
                <div className="playlists-panel__alert">
                  <h3>No tracks yet</h3>
                  <p>
                    Select this playlist and use a search result card to add songs into it.
                  </p>
                </div>
              ) : (
                <div className="playlist-track-list">
                  {activePlaylist.items.map((item, index) => (
                    <article className="playlist-track" key={item.id}>
                      <div className="playlist-track__meta">
                        <span className="playlist-track__position">{index + 1}</span>
                        <div>
                          <h4>{item.title}</h4>
                          <p>
                            {item.channel_title || 'Unknown channel'}
                            {item.duration_label ? ` · ${item.duration_label}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="playlist-track__actions">
                        <a
                          className="playlist-track__link"
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          className="playlist-track__button"
                          onClick={() => onMoveItem(activePlaylist.id, item.id, 'up')}
                          disabled={isMutating || index === 0}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="playlist-track__button"
                          onClick={() => onMoveItem(activePlaylist.id, item.id, 'down')}
                          disabled={isMutating || index === activePlaylist.items.length - 1}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="playlist-track__button playlist-track__button--danger"
                          onClick={() => onRemoveItem(activePlaylist.id, item.id)}
                          disabled={isMutating}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="playlists-panel__alert">
              <h3>Select a playlist</h3>
              <p>Create one or choose an existing playlist to manage its contents.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
