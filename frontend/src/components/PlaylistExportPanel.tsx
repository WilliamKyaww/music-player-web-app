import { DownloadIcon, TrashIcon } from './Icons'
import { getExportFileHref } from '../api/exports'
import type { Playlist, PlaylistExportJob } from '../types'

type PlaylistExportPanelProps = {
  activePlaylist: Playlist | null
  exportJobs: PlaylistExportJob[]
  errorMessage: string | null
  isCreatingExport: boolean
  pendingRemovalIds: string[]
  onCreateExport: (playlistId: string) => void
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
  const latestJob = relevantJobs[0] ?? null

  return (
    <section className="exports-panel">
      <div className="exports-panel__header">
        <div>
          <p className="results-header__label">Playlist export</p>
          <h3>
            {activePlaylist
              ? `Export "${activePlaylist.name}" as a ZIP`
              : 'Select a playlist to export'}
          </h3>
        </div>

        {activePlaylist ? (
          <button
            type="button"
            className="exports-panel__button"
            onClick={() => onCreateExport(activePlaylist.id)}
            disabled={isCreatingExport || activePlaylist.items.length === 0}
          >
            {isCreatingExport ? 'Starting export...' : 'Export ZIP'}
          </button>
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
          <h3>No playlist selected</h3>
          <p>Select a playlist above to export it.</p>
        </div>
      ) : activePlaylist.items.length === 0 ? (
        <div className="playlists-panel__alert">
          <h3>No tracks to export</h3>
          <p>Add songs to this playlist before creating a ZIP.</p>
        </div>
      ) : latestJob ? (
        <article className="export-job">
          <div className="export-job__meta">
            <div>
              <p className="download-job__status">{latestJob.status}</p>
              <h4>{latestJob.playlist_name}</h4>
              <p className="playlist-track__summary">
                {latestJob.completed_item_count} of {latestJob.item_count} track(s) prepared
              </p>
            </div>
            <span className={`download-job__pill download-job__pill--${latestJob.status}`}>
              {latestJob.status === 'completed'
                ? 'Ready'
                : latestJob.status === 'failed'
                  ? 'Failed'
                  : `${latestJob.progress_percent}%`}
            </span>
          </div>

          <div className="download-job__progress">
            <div
              className={`download-job__bar download-job__bar--${latestJob.status}`}
              style={{ width: `${latestJob.progress_percent}%` }}
            />
          </div>

          <p className="download-job__detail">
            {latestJob.error_message || latestJob.status_detail || 'Working...'}
          </p>

          <div className="download-job__footer">
            <span>{formatFileSize(latestJob.file_size_bytes) ?? 'ZIP pending'}</span>
            <div className="download-job__action-group">
              {latestJob.status === 'completed' && latestJob.download_path ? (
                <a
                  className="download-job__icon-button"
                  href={getExportFileHref(latestJob.id)}
                  download={latestJob.file_name ?? undefined}
                  title="Save ZIP export"
                  aria-label="Save ZIP export"
                >
                  <DownloadIcon className="action-icon" />
                </a>
              ) : null}

              {latestJob.status === 'completed' || latestJob.status === 'failed' ? (
                <button
                  type="button"
                  className="download-job__icon-button download-job__icon-button--danger"
                  onClick={() => onRemoveExport(latestJob, latestJob.status === 'completed')}
                  disabled={pendingRemovalIds.includes(latestJob.id)}
                  title={
                    latestJob.status === 'completed'
                      ? 'Delete ZIP export'
                      : 'Remove export entry'
                  }
                  aria-label={
                    latestJob.status === 'completed'
                      ? 'Delete ZIP export'
                      : 'Remove export entry'
                  }
                >
                  <TrashIcon className="action-icon" />
                </button>
              ) : null}
            </div>
          </div>
        </article>
      ) : (
        <div className="playlists-panel__alert">
          <h3>No export started yet</h3>
          <p>Click Export ZIP to build a downloadable archive for this playlist.</p>
        </div>
      )}
    </section>
  )
}
