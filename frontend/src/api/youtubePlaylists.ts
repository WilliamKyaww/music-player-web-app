import { apiFetchJson } from './client'
import type { PlaylistExportFormat, PlaylistExportJob } from '../types'

export async function createYouTubePlaylistExport(
  playlistUrl: string,
  exportFormat: PlaylistExportFormat,
  deletePreviousExportsForPlaylist = false,
) {
  return apiFetchJson<PlaylistExportJob>('/api/youtube-playlists/export', {
    method: 'POST',
    body: JSON.stringify({
      playlist_url: playlistUrl,
      export_format: exportFormat,
      delete_previous_exports_for_playlist: deletePreviousExportsForPlaylist,
    }),
  })
}
