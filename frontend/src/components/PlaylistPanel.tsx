import { useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from './Icons'
import { ModalDialog } from './ModalDialog'
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
  const [renameTarget, setRenameTarget] = useState<Playlist | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null)
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

  function openRenameModal(playlist: Playlist) {
    setRenameTarget(playlist)
    setRenameDraft(playlist.name)
  }

  function openDeleteModal(playlist: Playlist) {
    setDeleteTarget(playlist)
  }

  function handleRenameConfirm() {
    if (!renameTarget || !renameDraft.trim()) {
      return
    }

    onRenamePlaylist(renameTarget.id, renameDraft)
    setRenameTarget(null)
    setRenameDraft('')
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return
    }

    onDeletePlaylist(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <section className="playlists-panel">
      <div className="playlists-panel__header">
        <h2>Playlists</h2>
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
          <PlusIcon className="action-icon action-icon--small" />
          <span>{isCreating ? 'Creating...' : 'Create playlist'}</span>
        </button>
      </form>

      <div className="playlists-layout">
        <div className="playlist-list">
          {playlists.length === 0 ? (
            <div className="playlists-panel__alert">
              <p>No playlists yet</p>
            </div>
          ) : (
            playlists.map((playlist) => {
              const isActive = playlist.id === activePlaylist?.id
              return (
                <article
                  className={`playlist-card ${isActive ? 'playlist-card--active' : ''}`}
                  key={playlist.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onClick={() => onSelectPlaylist(playlist.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectPlaylist(playlist.id)
                    }
                  }}
                >
                  <div className="playlist-card__main">
                    <span className="playlist-card__name">{playlist.name}</span>
                    <span className="playlist-card__meta">
                      {playlist.items.length} item{playlist.items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="playlist-card__actions">
                    <button
                      type="button"
                      className="playlist-card__icon-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        openRenameModal(playlist)
                      }}
                      disabled={isMutating}
                      title="Rename playlist"
                      aria-label="Rename playlist"
                    >
                      <PencilIcon className="action-icon action-icon--small" />
                    </button>
                    <button
                      type="button"
                      className="playlist-card__icon-button playlist-card__icon-button--danger"
                      onClick={(event) => {
                        event.stopPropagation()
                        openDeleteModal(playlist)
                      }}
                      disabled={isMutating}
                      title="Delete playlist"
                      aria-label="Delete playlist"
                    >
                      <TrashIcon className="action-icon action-icon--small" />
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
                <h3>{activePlaylist.name}</h3>
                {pendingVideoId ? (
                  <span className="playlist-detail__status">Adding…</span>
                ) : null}
              </div>

              {activePlaylist.items.length === 0 ? (
                <div className="playlists-panel__alert">
                  <p>No tracks yet</p>
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
                          className="playlist-track__icon-button"
                          onClick={() => onMoveItem(activePlaylist.id, item.id, 'up')}
                          disabled={isMutating || index === 0}
                          title="Move up"
                          aria-label="Move track up"
                        >
                          <ArrowUpIcon className="action-icon action-icon--small" />
                        </button>
                        <button
                          type="button"
                          className="playlist-track__icon-button"
                          onClick={() => onMoveItem(activePlaylist.id, item.id, 'down')}
                          disabled={isMutating || index === activePlaylist.items.length - 1}
                          title="Move down"
                          aria-label="Move track down"
                        >
                          <ArrowDownIcon className="action-icon action-icon--small" />
                        </button>
                        <button
                          type="button"
                          className="playlist-track__icon-button playlist-track__icon-button--danger"
                          onClick={() => onRemoveItem(activePlaylist.id, item.id)}
                          disabled={isMutating}
                          title="Remove from playlist"
                          aria-label="Remove from playlist"
                        >
                          <TrashIcon className="action-icon action-icon--small" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="playlists-panel__alert">
              <p>Select a playlist</p>
            </div>
          )}
        </div>
      </div>

      {renameTarget ? (
        <ModalDialog
          title="Rename playlist"
          description=""
          confirmLabel="Save changes"
          isBusy={isMutating}
          onConfirm={handleRenameConfirm}
          onCancel={() => {
            if (isMutating) {
              return
            }
            setRenameTarget(null)
            setRenameDraft('')
          }}
        >
          <input
            className="modal-dialog__input"
            type="text"
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            autoFocus
          />
        </ModalDialog>
      ) : null}

      {deleteTarget ? (
        <ModalDialog
          title="Delete playlist"
          description={`Delete "${deleteTarget.name}"? This removes the playlist record but does not delete any saved MP3 files.`}
          confirmLabel="Delete playlist"
          confirmTone="danger"
          isBusy={isMutating}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            if (isMutating) {
              return
            }
            setDeleteTarget(null)
          }}
        />
      ) : null}
    </section>
  )
}
