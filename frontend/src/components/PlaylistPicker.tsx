import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon, PlusIcon } from './Icons'
import type { Playlist } from '../types'

const PICKER_OPEN_EVENT = 'spotimy-playlist-picker-open'
const VIEWPORT_GUTTER = 12
const MENU_OFFSET = 8

type PickerPosition = {
  left: number
  top: number
}

type PlaylistPickerProps = {
  playlists: Playlist[]
  activePlaylistId: string | null
  isSubmitting: boolean
  buttonClassName?: string
  title?: string
  onSubmit: (playlistIds: string[]) => void
}

export function PlaylistPicker({
  playlists,
  activePlaylistId,
  isSubmitting,
  buttonClassName = 'video-card__icon-button',
  title = 'Add to one or more playlists',
  onSubmit,
}: PlaylistPickerProps) {
  const pickerId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [menuPosition, setMenuPosition] = useState<PickerPosition | null>(null)

  const orderedPlaylists = [...playlists].sort((left, right) => {
    const leftTime = Date.parse(left.updated_at || left.created_at)
    const rightTime = Date.parse(right.updated_at || right.created_at)
    return rightTime - leftTime
  })

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current
    const menu = menuRef.current
    if (!button || !menu) return

    const buttonRect = button.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const maxLeft = Math.max(VIEWPORT_GUTTER, viewportWidth - menuRect.width - VIEWPORT_GUTTER)
    const maxTop = Math.max(VIEWPORT_GUTTER, viewportHeight - menuRect.height - VIEWPORT_GUTTER)

    const preferredLeft = buttonRect.right - menuRect.width
    const left = Math.min(Math.max(preferredLeft, VIEWPORT_GUTTER), maxLeft)
    const belowTop = buttonRect.bottom + MENU_OFFSET
    const aboveTop = buttonRect.top - menuRect.height - MENU_OFFSET

    let top = belowTop
    if (belowTop + menuRect.height > viewportHeight - VIEWPORT_GUTTER) {
      top = aboveTop >= VIEWPORT_GUTTER ? aboveTop : (viewportHeight - menuRect.height) / 2
    }

    top = Math.min(Math.max(top, VIEWPORT_GUTTER), maxTop)

    setMenuPosition((current) => {
      if (current && current.left === left && current.top === top) {
        return current
      }

      return { left, top }
    })
  }, [])

  const closePicker = useCallback(() => {
    setIsOpen(false)
    setSelectedIds([])
    setMenuPosition(null)
  }, [])

  function openPicker() {
    if (activePlaylistId) {
      setSelectedIds([activePlaylistId])
      return
    }

    setSelectedIds(orderedPlaylists[0] ? [orderedPlaylists[0].id] : [])
  }

  function handleTogglePicker() {
    if (isOpen) {
      closePicker()
      return
    }

    window.dispatchEvent(new CustomEvent(PICKER_OPEN_EVENT, { detail: { pickerId } }))
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
    closePicker()
  }

  useEffect(() => {
    function handlePeerPickerOpen(event: Event) {
      const detail = (event as CustomEvent<{ pickerId?: string }>).detail
      if (detail?.pickerId !== pickerId) {
        closePicker()
      }
    }

    window.addEventListener(PICKER_OPEN_EVENT, handlePeerPickerOpen)

    return () => {
      window.removeEventListener(PICKER_OPEN_EVENT, handlePeerPickerOpen)
    }
  }, [closePicker, pickerId])

  useLayoutEffect(() => {
    if (!isOpen) return
    updateMenuPosition()
  }, [isOpen, orderedPlaylists.length, updateMenuPosition])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }

      closePicker()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closePicker()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [closePicker, isOpen, updateMenuPosition])

  return (
    <div className="playlist-picker">
      <button
        ref={buttonRef}
        className={buttonClassName}
        type="button"
        aria-label={title}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={title}
        disabled={isSubmitting || playlists.length === 0}
        onClick={handleTogglePicker}
      >
        <PlusIcon className="action-icon" />
      </button>

      {isOpen ? createPortal(
        <div
          ref={menuRef}
          className="playlist-picker__menu"
          role="dialog"
          aria-label="Add to playlist"
          style={
            menuPosition
              ? {
                  left: `${menuPosition.left}px`,
                  top: `${menuPosition.top}px`,
                }
              : { visibility: 'hidden' }
          }
        >
          <p className="playlist-picker__title">Add to playlist(s)</p>

          <div className="playlist-picker__list">
            {orderedPlaylists.map((playlist) => {
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
              onClick={closePicker}
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
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
