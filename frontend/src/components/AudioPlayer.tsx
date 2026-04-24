import { useEffect, useRef, useState } from 'react'
import { PauseIcon, PlayIcon, VolumeIcon } from './Icons'

type AudioPlayerProps = {
  videoId: string | null
  title: string | null
  thumbnailUrl: string | null
  streamUrl: string | null
  onClose: () => void
}

export function AudioPlayer({
  videoId,
  title,
  thumbnailUrl,
  streamUrl,
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

  return (
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
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      <button
        type="button"
        className="audio-player__close"
        onClick={onClose}
        aria-label="Close player"
      >
        x
      </button>
    </div>
  )
}
