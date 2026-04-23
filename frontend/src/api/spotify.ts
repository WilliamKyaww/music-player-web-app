import { apiFetchJson } from './client'
import type { SpotifyPlaylistPreview } from '../types'

export async function previewSpotifyPlaylist(playlistUrl: string, maxTracks = 20) {
  return apiFetchJson<SpotifyPlaylistPreview>('/api/imports/spotify/preview', {
    method: 'POST',
    body: JSON.stringify({
      playlist_url: playlistUrl,
      max_tracks: maxTracks,
    }),
  })
}
