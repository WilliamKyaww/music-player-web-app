import { DownloadIcon, PlayIcon } from './Icons'
import { PlaylistPicker } from './PlaylistPicker'
import type { DownloadJob, Playlist, VideoSearchResult } from '../types'

type VideoCardProps = {
  video: VideoSearchResult
  onDownload: (video: VideoSearchResult) => void
  onAddToPlaylists: (video: VideoSearchResult, playlistIds: string[]) => void
  onPlay?: (videoId: string, title: string, thumbnailUrl: string | null) => void
  playlists: Playlist[]
  activePlaylistId: string | null
  isAddingToPlaylist: boolean
  isSubmittingDownload: boolean
  latestDownload: DownloadJob | null
}



export function VideoCard({
  video,
  onDownload,
  onAddToPlaylists,
  onPlay,
  playlists,
  activePlaylistId,
  isAddingToPlaylist,
  isSubmittingDownload,
  latestDownload,
}: VideoCardProps) {
  const isDownloadBusy =
    isSubmittingDownload ||
    latestDownload?.status === 'queued' ||
    latestDownload?.status === 'downloading' ||
    latestDownload?.status === 'converting' ||
    latestDownload?.status === 'completed'

  return (
    <article className="video-card">
      <a
        className="video-card__thumbnail-link"
        href={video.video_url}
        target="_blank"
        rel="noreferrer"
      >
        <img
          className="video-card__thumbnail"
          src={video.thumbnail_url}
          alt={`Thumbnail for ${video.title}`}
          loading="lazy"
        />
        <span className="video-card__duration">{video.duration_label}</span>
      </a>

      <div className="video-card__body">
        <p className="video-card__channel">{video.channel_title}</p>
        <h3 className="video-card__title" title={video.title}>
          {video.title}
        </h3>
        <p className="video-card__description">{video.description || 'No description provided.'}</p>
      </div>

      <div className="video-card__actions">
        <a
          className="video-card__button video-card__button--primary"
          href={video.video_url}
          target="_blank"
          rel="noreferrer"
        >
          Open on YouTube
        </a>
        {onPlay ? (
          <button
            className="video-card__icon-button video-card__icon-button--play"
            type="button"
            title="Play audio"
            aria-label="Play audio"
            onClick={() => onPlay(video.id, video.title, video.thumbnail_url)}
          >
            <PlayIcon className="action-icon" />
          </button>
        ) : null}
        <button
          className={`video-card__icon-button ${latestDownload ? `video-card__icon-button--${latestDownload.status}` : ''}`}
          type="button"
          disabled={isDownloadBusy}
          title={
            latestDownload?.status === 'completed'
              ? 'Use the queue panel to save the finished MP3.'
              : 'Download MP3'
          }
          aria-label={
            latestDownload?.status === 'completed'
              ? 'MP3 already completed'
              : 'Download MP3'
          }
          onClick={() => onDownload(video)}
        >
          <DownloadIcon className="action-icon" />
        </button>
        <PlaylistPicker
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          isSubmitting={isAddingToPlaylist}
          onSubmit={(playlistIds) => onAddToPlaylists(video, playlistIds)}
        />
      </div>

    </article>
  )
}
