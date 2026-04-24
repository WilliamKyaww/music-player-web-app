import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  RepeatIcon,
  ShuffleIcon,
  VolumeIcon,
} from './Icons'
import { PlaylistPicker } from './PlaylistPicker'
import type { CSSProperties } from 'react'
import type { Playlist } from '../types'

type LoopMode = 'off' | 'once' | 'all'

type AudioPlayerProps = {
  videoId: string | null
  title: string | null
  thumbnailUrl: string | null
  streamUrl: string | null
  isPlaylistPlayback: boolean
  canGoPrevious: boolean
  canGoNext: boolean
  shuffleEnabled: boolean
  loopMode: LoopMode
  playlists: Playlist[]
  activePlaylistId: string | null
  isAddingToPlaylist: boolean
  onPrevious: () => void
  onNext: () => void
  onToggleShuffle: () => void
  onToggleLoop: () => void
  onLoopOnceConsumed: () => void
  onTrackEnded: () => void
  onAddToPlaylists: (playlistIds: string[]) => void
  onClose: () => void
}

export function AudioPlayer({
  videoId,
  title,
  thumbnailUrl,
  streamUrl,
  isPlaylistPlayback,
  canGoPrevious,
  canGoNext,
  shuffleEnabled,
  loopMode,
  playlists,
  activePlaylistId,
  isAddingToPlaylist,
  onPrevious,
  onNext,
  onToggleShuffle,
  onToggleLoop,
  onLoopOnceConsumed,
  onTrackEnded,
  onAddToPlaylists,
  onClose,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !streamUrl) return

    setCurrentTime(0)
    setDuration(0)
    audio.src = streamUrl
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [streamUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
  }, [volume])

  function handlePlayPause() {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTime(audio.currentTime)
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current
    if (!audio) return
    setDuration(audio.duration)
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const time = Number(event.target.value)
    audio.currentTime = time
    setCurrentTime(time)
  }

  function handleEnded() {
    const audio = audioRef.current
    if (!audio) return

    if (loopMode === 'once' || loopMode === 'all') {
      audio.currentTime = 0
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
      if (loopMode === 'once') {
        onLoopOnceConsumed()
      }
      return
    }

    if (isPlaylistPlayback && canGoNext) {
      onTrackEnded()
      return
    }

    setIsPlaying(false)
    setCurrentTime(0)
  }

  function formatTime(seconds: number) {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  if (!videoId || !streamUrl) return null

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const volumePercent = Math.min(100, Math.max(0, volume * 100))

  return createPortal(
    <div className="audio-player">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="audio-player__artwork" aria-hidden="true">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" />
        ) : (
          <span>{(title || 'S').slice(0, 1).toUpperCase()}</span>
        )}
      </div>

      <div className="audio-player__controls">
        {isPlaylistPlayback ? (
          <button
            type="button"
            className={`audio-player__control-button ${
              shuffleEnabled ? 'audio-player__control-button--active' : ''
            }`}
            onClick={onToggleShuffle}
            aria-pressed={shuffleEnabled}
            aria-label="Shuffle playlist"
            title="Shuffle playlist"
          >
            <ShuffleIcon className="audio-player__control-icon" />
          </button>
        ) : null}

        {isPlaylistPlayback ? (
          <button
            type="button"
            className="audio-player__control-button"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            aria-label="Previous track"
            title="Previous track"
          >
            <PreviousIcon className="audio-player__control-icon" />
          </button>
        ) : null}

        <button
          type="button"
          className="audio-player__play-btn"
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <PauseIcon className="audio-player__icon" />
          ) : (
            <PlayIcon className="audio-player__icon" />
          )}
        </button>

        {isPlaylistPlayback ? (
          <button
            type="button"
            className="audio-player__control-button"
            onClick={onNext}
            disabled={!canGoNext}
            aria-label="Next track"
            title="Next track"
          >
            <NextIcon className="audio-player__control-icon" />
          </button>
        ) : null}

        <button
          type="button"
          className={`audio-player__control-button ${
            loopMode !== 'off' ? 'audio-player__control-button--active' : ''
          }`}
          onClick={onToggleLoop}
          aria-pressed={loopMode !== 'off'}
          aria-label={
            loopMode === 'off'
              ? 'Loop off'
              : loopMode === 'once'
                ? 'Loop once'
                : 'Loop indefinitely'
          }
          title={
            loopMode === 'off'
              ? 'Loop off'
              : loopMode === 'once'
                ? 'Loop once'
                : 'Loop indefinitely'
          }
        >
          <RepeatIcon className="audio-player__control-icon" />
          {loopMode === 'once' ? <span className="audio-player__loop-badge">1</span> : null}
          {loopMode === 'all' ? <span className="audio-player__loop-badge">∞</span> : null}
        </button>
      </div>

      <div className="audio-player__info">
        <p className="audio-player__title">{title || 'Unknown'}</p>
        <div className="audio-player__progress-row">
          <span className="audio-player__time">{formatTime(currentTime)}</span>
          <input
            type="range"
            className="audio-player__seek"
            min={0}
            max={duration || 0}
            step={0.5}
            value={currentTime}
            style={{ '--audio-progress': `${progressPercent}%` } as CSSProperties}
            onChange={handleSeek}
          />
          <span className="audio-player__time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="audio-player__volume">
        <VolumeIcon className="audio-player__volume-icon" />
        <input
          type="range"
          className="audio-player__volume-slider"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          style={{ '--volume-progress': `${volumePercent}%` } as CSSProperties}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      <PlaylistPicker
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        isSubmitting={isAddingToPlaylist}
        buttonClassName="audio-player__add-button"
        title="Add playing song to playlist"
        onSubmit={onAddToPlaylists}
      />

      <button
        type="button"
        className="audio-player__close"
        onClick={onClose}
        aria-label="Close player"
      >
        x
      </button>
    </div>,
    document.body,
  )
}
