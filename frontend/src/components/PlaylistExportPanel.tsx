import { DownloadIcon, TrashIcon } from './Icons'
import { getExportFileHref } from '../api/exports'
import type { Playlist, PlaylistExportFormat, PlaylistExportJob } from '../types'

type PlaylistExportPanelProps = {
  activePlaylist: Playlist | null
  exportJobs: PlaylistExportJob[]
  errorMessage: string | null
  isCreatingExport: boolean
  pendingRemovalIds: string[]
  onCreateExport: (playlistId: string, exportFormat: PlaylistExportFormat) => void
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

export function PlaylistExportPanel({
  activePlaylist,
  exportJobs,
  errorMessage,
  isCreatingExport,
  pendingRemovalIds,
  onCreateExport,
  onRemoveExport,
}: PlaylistExportPanelProps) {
  const relevantJobs = activePlaylist
    ? exportJobs.filter((job) => job.playlist_id === activePlaylist.id)
    : []
  const orderedJobs = [...relevantJobs].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  )

  return (
    <section className="exports-panel">
      <div className="exports-panel__header">
        <h3>
          {activePlaylist
            ? `Export "${activePlaylist.name}"`
            : 'Select a playlist to export'}
        </h3>

        {activePlaylist ? (
          <div className="exports-panel__button-group">
            <button
              type="button"
              className="exports-panel__button"
              onClick={() => onCreateExport(activePlaylist.id, 'zip')}
              disabled={isCreatingExport || activePlaylist.items.length === 0}
            >
              {isCreatingExport ? 'Starting export...' : 'Export ZIP'}
            </button>
            <button
              type="button"
              className="exports-panel__button exports-panel__button--secondary"
              onClick={() => onCreateExport(activePlaylist.id, 'combined_mp3')}
              disabled={isCreatingExport || activePlaylist.items.length === 0}
            >
              {isCreatingExport ? 'Starting export...' : 'Export combined MP3'}
            </button>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="playlists-panel__alert playlists-panel__alert--error">
          <h3>Export action failed</h3>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {!activePlaylist ? (
        <div className="playlists-panel__alert">
          <p>No playlist selected</p>
        </div>
      ) : activePlaylist.items.length === 0 ? (
        <div className="playlists-panel__alert">
          <p>Add tracks first</p>
        </div>
      ) : orderedJobs.length > 0 ? (
        <div className="exports-panel__list">
          {orderedJobs.map((job) => (
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
          <p>No exports yet</p>
        </div>
      )}
    </section>
  )
}
