import { useState } from 'react'
import { DownloadIcon, TrashIcon } from './Icons'
import { getExportFileHref } from '../api/exports'
import type { PlaylistExportFormat, PlaylistExportJob } from '../types'

type YouTubePlaylistDownloadPanelProps = {
  exportJobs: PlaylistExportJob[]
  errorMessage: string | null
  isCreating: boolean
  pendingRemovalIds: string[]
  onCreateExport: (playlistUrl: string, exportFormat: PlaylistExportFormat) => void
  onRemoveExport: (exportJob: PlaylistExportJob, deleteFile: boolean) => void
}

function formatFileSize(fileSizeBytes: number | null) {
  if (!fileSizeBytes || fileSizeBytes <= 0) {
    return null
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let size = fileSizeBytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  const precision = size >= 10 || unitIndex === 0 ? 0 : 1
  return `${size.toFixed(precision)} ${units[unitIndex]}`
}

export function YouTubePlaylistDownloadPanel({
  exportJobs,
  errorMessage,
  isCreating,
  pendingRemovalIds,
  onCreateExport,
  onRemoveExport,
}: YouTubePlaylistDownloadPanelProps) {
  const [playlistUrl, setPlaylistUrl] = useState('')
  const youtubeJobs = exportJobs.filter((job) => job.playlist_id.startsWith('youtube_playlist:'))

  return (
    <section className="youtube-playlist-panel">
      <div className="spotify-panel__header">
        <div>
          <p className="results-header__label">YouTube playlist export</p>
          <h3>Download a YouTube playlist directly</h3>
        </div>
        <p className="spotify-panel__body">
          Paste a YouTube playlist URL and export it straight to a ZIP of MP3s or a single combined MP3 without creating an in-app playlist first.
        </p>
      </div>

      <div className="spotify-panel__form">
        <input
          className="spotify-panel__input"
          type="url"
          value={playlistUrl}
          onChange={(event) => setPlaylistUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=...&list=..."
        />
        <div className="exports-panel__button-group">
          <button
            type="button"
            className="exports-panel__button"
            disabled={isCreating || !playlistUrl.trim()}
            onClick={() => onCreateExport(playlistUrl.trim(), 'zip')}
          >
            {isCreating ? 'Starting export...' : 'Download ZIP'}
          </button>
          <button
            type="button"
            className="exports-panel__button exports-panel__button--secondary"
            disabled={isCreating || !playlistUrl.trim()}
            onClick={() => onCreateExport(playlistUrl.trim(), 'combined_mp3')}
          >
            {isCreating ? 'Starting export...' : 'Download combined MP3'}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="playlists-panel__alert playlists-panel__alert--error">
          <h3>YouTube playlist export failed</h3>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {youtubeJobs.length > 0 ? (
        <div className="exports-panel__list">
          {youtubeJobs.map((job) => (
            <article className="export-job" key={job.id}>
              <div className="export-job__meta">
                <div>
                  <p className="download-job__status">{job.status}</p>
                  <h4>
                    {job.export_format === 'combined_mp3'
                      ? `${job.playlist_name} (combined MP3)`
                      : `${job.playlist_name} (ZIP)`}
                  </h4>
                  <p className="playlist-track__summary">
                    {job.completed_item_count} of {job.item_count} track(s) prepared
                  </p>
                </div>
                <span className={`download-job__pill download-job__pill--${job.status}`}>
                  {job.status === 'completed'
                    ? 'Ready'
                    : job.status === 'failed'
                      ? 'Failed'
                      : `${job.progress_percent}%`}
                </span>
              </div>

              <div className="download-job__progress">
                <div
                  className={`download-job__bar download-job__bar--${job.status}`}
                  style={{ width: `${job.progress_percent}%` }}
                />
              </div>

              <p className="download-job__detail">
                {job.error_message || job.status_detail || 'Working...'}
              </p>

              <div className="download-job__footer">
                <span>{formatFileSize(job.file_size_bytes) ?? 'Export pending'}</span>
                <div className="download-job__action-group">
                  {job.status === 'completed' && job.download_path ? (
                    <a
                      className="download-job__icon-button"
                      href={getExportFileHref(job.id)}
                      download={job.file_name ?? undefined}
                      title={
                        job.export_format === 'combined_mp3'
                          ? 'Save combined MP3 export'
                          : 'Save ZIP export'
                      }
                      aria-label={
                        job.export_format === 'combined_mp3'
                          ? 'Save combined MP3 export'
                          : 'Save ZIP export'
                      }
                    >
                      <DownloadIcon className="action-icon" />
                    </a>
                  ) : null}

                  {job.status === 'completed' || job.status === 'failed' ? (
                    <button
                      type="button"
                      className="download-job__icon-button download-job__icon-button--danger"
                      onClick={() => onRemoveExport(job, job.status === 'completed')}
                      disabled={pendingRemovalIds.includes(job.id)}
                      title={
                        job.status === 'completed'
                          ? 'Delete export file'
                          : 'Remove export entry'
                      }
                      aria-label={
                        job.status === 'completed'
                          ? 'Delete export file'
                          : 'Remove export entry'
                      }
                    >
                      <TrashIcon className="action-icon" />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="playlists-panel__alert">
          <h3>No YouTube playlist export yet</h3>
          <p>
            Paste a YouTube playlist link above to export it directly without first creating an in-app playlist.
          </p>
        </div>
      )}
    </section>
  )
}
