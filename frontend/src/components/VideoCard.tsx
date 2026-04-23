import type { DownloadJob, VideoSearchResult } from '../types'

type VideoCardProps = {
  video: VideoSearchResult
  onDownload: (video: VideoSearchResult) => void
  isSubmittingDownload: boolean
  latestDownload: DownloadJob | null
}

function getDownloadButtonLabel(
  latestDownload: DownloadJob | null,
  isSubmittingDownload: boolean,
) {
  if (isSubmittingDownload) {
    return 'Queueing...'
  }

  if (!latestDownload) {
    return 'Download MP3'
  }

  if (latestDownload.status === 'queued') {
    return 'Queued'
  }

  if (latestDownload.status === 'downloading') {
    return `Downloading ${latestDownload.progress_percent}%`
  }

  if (latestDownload.status === 'converting') {
    return 'Converting...'
  }

  if (latestDownload.status === 'completed') {
    return 'Downloaded'
  }

  return 'Retry MP3'
}

export function VideoCard({
  video,
  onDownload,
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
        <button
          className="video-card__button"
          type="button"
          disabled
          title="Phase 3 will add playlist support."
        >
          Playlist
        </button>
        <button
          className={`video-card__button ${latestDownload ? `video-card__button--${latestDownload.status}` : ''}`}
          type="button"
          disabled={isDownloadBusy}
          title={
            latestDownload?.status === 'completed'
              ? 'Use the queue panel to save the finished MP3.'
              : undefined
          }
          onClick={() => onDownload(video)}
        >
          {getDownloadButtonLabel(latestDownload, isSubmittingDownload)}
        </button>
      </div>
    </article>
  )
}
