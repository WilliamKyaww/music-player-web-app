import { apiFetchJson, getApiHref } from './client'
import type { PlaylistExportJob, PlaylistExportListResponse } from '../types'

export async function fetchExports(signal?: AbortSignal) {
  return apiFetchJson<PlaylistExportListResponse>('/api/exports', {
    method: 'GET',
    signal,
  })
}

export async function createPlaylistExport(
  playlistId: string,
  deletePreviousExportsForPlaylist = false,
) {
  return apiFetchJson<PlaylistExportJob>(`/api/playlists/${playlistId}/export`, {
    method: 'POST',
    body: JSON.stringify({
      delete_previous_exports_for_playlist: deletePreviousExportsForPlaylist,
    }),
  })
}

export async function removeExport(exportId: string, deleteFile = true) {
  return apiFetchJson<{ removed_job_id: string; deleted_file: boolean }>(
    `/api/exports/${exportId}?delete_file=${deleteFile ? 'true' : 'false'}`,
    {
      method: 'DELETE',
    },
  )
}

export function getExportFileHref(exportId: string) {
  return getApiHref(`/api/exports/${exportId}/file`)
}
