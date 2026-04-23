import { apiFetchJson, getApiHref } from './client'
import type {
  DownloadListResponse,
  EnqueueDownloadResponse,
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

export function getDownloadFileHref(downloadId: string) {
  return getApiHref(`/api/downloads/${downloadId}/file`)
}
