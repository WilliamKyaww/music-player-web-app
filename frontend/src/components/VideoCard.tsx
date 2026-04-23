import type { VideoSearchResult } from '../types'

type VideoCardProps = {
  video: VideoSearchResult
}

export function VideoCard({ video }: VideoCardProps) {
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
          title="Phase 2 will add playlist support."
        >
          Playlist
        </button>
        <button
          className="video-card__button"
          type="button"
          disabled
          title="Phase 2 will add MP3 download jobs."
        >
          Download MP3
        </button>
      </div>
    </article>
  )
}
