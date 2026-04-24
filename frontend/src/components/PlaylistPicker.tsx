import { useState } from 'react'
import { CheckIcon, PlusIcon } from './Icons'
import type { Playlist } from '../types'

type PlaylistPickerProps = {
  playlists: Playlist[]
  activePlaylistId: string | null
  isSubmitting: boolean
  onSubmit: (playlistIds: string[]) => void
}

export function PlaylistPicker({
  playlists,
  activePlaylistId,
  isSubmitting,
  onSubmit,
}: PlaylistPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  function openPicker() {
    if (activePlaylistId) {
      setSelectedIds([activePlaylistId])
      return
    }

    setSelectedIds(playlists[0] ? [playlists[0].id] : [])
  }

  function handleTogglePicker() {
    if (isOpen) {
      setIsOpen(false)
      return
    }

    openPicker()
    setIsOpen(true)
  }

  function togglePlaylist(playlistId: string) {
    setSelectedIds((current) =>
      current.includes(playlistId)
        ? current.filter((id) => id !== playlistId)
        : [...current, playlistId],
    )
  }

  function handleSubmit() {
    if (selectedIds.length === 0) {
      return
    }

    onSubmit(selectedIds)
    setIsOpen(false)
  }

  return (
    <div className="playlist-picker">
      <button
        className="video-card__icon-button"
        type="button"
        aria-label="Add to one or more playlists"
        title="Add to one or more playlists"
        disabled={isSubmitting || playlists.length === 0}
        onClick={handleTogglePicker}
      >
        <PlusIcon className="action-icon" />
      </button>

      {isOpen ? (
        <div className="playlist-picker__menu">
          <p className="playlist-picker__title">Add to playlist(s)</p>

          <div className="playlist-picker__list">
            {playlists.map((playlist) => {
              const isSelected = selectedIds.includes(playlist.id)
              return (
                <label className="playlist-picker__option" key={playlist.id}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePlaylist(playlist.id)}
                  />
                  <span className="playlist-picker__label">
                    <span>{playlist.name}</span>
                    <span className="playlist-picker__meta">
                      {playlist.items.length} item{playlist.items.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  {isSelected ? <CheckIcon className="action-icon action-icon--small" /> : null}
                </label>
              )
            })}
          </div>

          <div className="playlist-picker__actions">
            <button
              type="button"
              className="playlist-picker__button"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="playlist-picker__button playlist-picker__button--primary"
              disabled={selectedIds.length === 0 || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Adding...' : `Add to ${selectedIds.length}`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
