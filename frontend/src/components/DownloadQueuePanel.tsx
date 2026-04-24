import { useState } from 'react'
import { DownloadIcon, TrashIcon } from './Icons'
import { getDownloadFileHref } from '../api/downloads'
import type { DownloadJob, DownloadRuntimeStatus } from '../types'

type DownloadQueuePanelProps = {
  runtime: DownloadRuntimeStatus | null
  jobs: DownloadJob[]
  errorMessage: string | null
  pendingRemovalIds: string[]
  onRemoveJob: (job: DownloadJob, deleteFile: boolean) => void
  onPlay?: (job: DownloadJob) => void
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

const INITIAL_VISIBLE = 5
const LOAD_MORE_COUNT = 10

export function DownloadQueuePanel({
  runtime,
  jobs,
  errorMessage,
  pendingRemovalIds,
  onRemoveJob,
  onPlay,
}: DownloadQueuePanelProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const visibleJobs = jobs.slice(0, visibleCount)
  const hasMore = jobs.length > visibleCount

  return (
    <section className="downloads-panel">
      <div className="downloads-panel__header">
        <h2>Downloads</h2>
        {jobs.length > 0 ? (
          <span className="downloads-panel__count">
            {visibleJobs.length} of {jobs.length}
          </span>
        ) : null}
      </div>

      {runtime && !runtime.available ? (
        <div className="downloads-runtime downloads-runtime--warning">
          <h3>Setup required</h3>
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
          <p>No downloads yet</p>
        </div>
      ) : (
        <>
          <div className="downloads-list">
            {visibleJobs.map((job) => (
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
                  <div className="download-job__action-group">
                    {job.status === 'completed' && job.download_path && onPlay ? (
                      <button
                        type="button"
                        className="download-job__icon-button"
                        onClick={() => onPlay(job)}
                        title="Play in app"
                        aria-label="Play in app"
                      >
                        <PlayIconInline className="action-icon" />
                      </button>
                    ) : null}

                    {job.status === 'completed' && job.download_path ? (
                      <a
                        className="download-job__icon-button"
                        href={getDownloadFileHref(job.id)}
                        download={job.file_name ?? undefined}
                        title="Save MP3"
                        aria-label="Save MP3"
                      >
                        <DownloadIcon className="action-icon" />
                      </a>
                    ) : null}

                    {job.status === 'completed' ? (
                      <button
                        type="button"
                        className="download-job__icon-button download-job__icon-button--danger"
                        onClick={() => onRemoveJob(job, true)}
                        disabled={pendingRemovalIds.includes(job.id)}
                        title="Delete saved MP3"
                        aria-label="Delete saved MP3"
                      >
                        <TrashIcon className="action-icon" />
                      </button>
                    ) : null}

                    {job.status === 'failed' ? (
                      <button
                        type="button"
                        className="download-job__icon-button download-job__icon-button--danger"
                        onClick={() => onRemoveJob(job, false)}
                        disabled={pendingRemovalIds.includes(job.id)}
                        title="Remove failed entry"
                        aria-label="Remove failed entry"
                      >
                        <TrashIcon className="action-icon" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {hasMore ? (
            <button
              type="button"
              className="downloads-panel__show-more"
              onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_COUNT)}
            >
              Show more ({jobs.length - visibleCount} remaining)
            </button>
          ) : jobs.length > INITIAL_VISIBLE ? (
            <button
              type="button"
              className="downloads-panel__show-more"
              onClick={() => setVisibleCount(INITIAL_VISIBLE)}
            >
              Show less
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}

function PlayIconInline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 5v14l11-7z"
        fill="currentColor"
      />
    </svg>
  )
}
