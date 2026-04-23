import { getDownloadFileHref } from '../api/downloads'
import type { DownloadJob, DownloadRuntimeStatus } from '../types'

type DownloadQueuePanelProps = {
  runtime: DownloadRuntimeStatus | null
  jobs: DownloadJob[]
  errorMessage: string | null
  pendingRemovalIds: string[]
  onRemoveJob: (job: DownloadJob, deleteFile: boolean) => void
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

export function DownloadQueuePanel({
  runtime,
  jobs,
  errorMessage,
  pendingRemovalIds,
  onRemoveJob,
}: DownloadQueuePanelProps) {
  return (
    <section className="downloads-panel">
      <div className="downloads-panel__header">
        <div>
          <p className="results-header__label">Download queue</p>
          <h2>MP3 jobs and saved files</h2>
        </div>
        <p className="downloads-panel__body">
          Downloads are processed on your machine and saved under the backend data folder.
        </p>
      </div>

      {runtime && !runtime.available ? (
        <div className="downloads-runtime downloads-runtime--warning">
          <h3>Download tools still need setup</h3>
          <ul>
            {runtime.missing_dependencies.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="downloads-runtime downloads-runtime--error">
          <h3>Queue refresh failed</h3>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <div className="downloads-empty">
          <p>No downloads yet.</p>
          <span>Use the Download MP3 button on any result card to start the queue.</span>
        </div>
      ) : (
        <div className="downloads-list">
          {jobs.map((job) => (
            <article className="download-job" key={job.id}>
              <div className="download-job__meta">
                <div>
                  <p className="download-job__status">{job.status}</p>
                  <h3>{job.title}</h3>
                  <p className="download-job__channel">
                    {job.channel_title || 'Unknown channel'}
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
                <span>
                  {job.file_size_bytes ? formatFileSize(job.file_size_bytes) : 'Pending file'}
                </span>

                {job.status === 'completed' && job.download_path ? (
                  <a
                    className="download-job__link"
                    href={getDownloadFileHref(job.id)}
                    download={job.file_name ?? undefined}
                  >
                    Save MP3
                  </a>
                ) : null}

                {job.status === 'completed' ? (
                  <button
                    type="button"
                    className="download-job__button download-job__button--danger"
                    onClick={() => onRemoveJob(job, true)}
                    disabled={pendingRemovalIds.includes(job.id)}
                  >
                    {pendingRemovalIds.includes(job.id) ? 'Removing...' : 'Delete file'}
                  </button>
                ) : null}

                {job.status === 'failed' ? (
                  <button
                    type="button"
                    className="download-job__button"
                    onClick={() => onRemoveJob(job, false)}
                    disabled={pendingRemovalIds.includes(job.id)}
                  >
                    {pendingRemovalIds.includes(job.id) ? 'Removing...' : 'Remove entry'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
