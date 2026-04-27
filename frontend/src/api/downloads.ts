import { apiFetchJson, getApiHref } from './client'
import type {
  DownloadJob,
  DownloadListResponse,
  EnqueueDownloadResponse,
  RemoveDownloadResponse,
  VideoSearchResult,
} from '../types'

export async function fetchDownloads(signal?: AbortSignal) {
  return apiFetchJson<DownloadListResponse>('/api/downloads', {
    method: 'GET',
    signal,
  })
}

export async function enqueueDownload(video: VideoSearchResult) {
  return apiFetchJson<EnqueueDownloadResponse>('/api/downloads', {
    method: 'POST',
    body: JSON.stringify({
      video_id: video.id,
      title: video.title,
      channel_title: video.channel_title,
      thumbnail_url: video.thumbnail_url,
      source_url: video.video_url,
    }),
  })
}

export async function removeDownload(downloadId: string, deleteFile = true) {
  return apiFetchJson<RemoveDownloadResponse>(
    `/api/downloads/${downloadId}?delete_file=${deleteFile ? 'true' : 'false'}`,
    {
      method: 'DELETE',
    },
  )
}

export async function renameDownload(downloadId: string, title: string) {
  return apiFetchJson<DownloadJob>(`/api/downloads/${downloadId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
}

export async function redownloadDownload(downloadId: string) {
  return apiFetchJson<EnqueueDownloadResponse>(
    `/api/downloads/${downloadId}/redownload`,
    {
      method: 'POST',
    },
  )
}

export function getDownloadFileHref(downloadId: string) {
  return getApiHref(`/api/downloads/${downloadId}/file`)
}

export function getDownloadThumbnailHref(downloadId: string) {
  return getApiHref(`/api/downloads/${downloadId}/thumbnail`)
}
