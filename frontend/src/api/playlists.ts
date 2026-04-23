import { apiFetchJson, apiFetchVoid } from './client'
import type { Playlist, PlaylistListResponse, VideoSearchResult } from '../types'

export async function fetchPlaylists(signal?: AbortSignal) {
  return apiFetchJson<PlaylistListResponse>('/api/playlists', {
    method: 'GET',
    signal,
  })
}

export async function createPlaylist(name: string) {
  return apiFetchJson<Playlist>('/api/playlists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function renamePlaylist(playlistId: string, name: string) {
  return apiFetchJson<Playlist>(`/api/playlists/${playlistId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export async function deletePlaylist(playlistId: string) {
  await apiFetchVoid(`/api/playlists/${playlistId}`, {
    method: 'DELETE',
  })
}

export async function addVideoToPlaylist(
  playlistId: string,
  video: VideoSearchResult,
) {
  return apiFetchJson<Playlist>(`/api/playlists/${playlistId}/items`, {
    method: 'POST',
    body: JSON.stringify({
      video_id: video.id,
      title: video.title,
      channel_title: video.channel_title,
      thumbnail_url: video.thumbnail_url,
      source_url: video.video_url,
      duration_label: video.duration_label,
    }),
  })
}

export async function removePlaylistItem(playlistId: string, itemId: string) {
  return apiFetchJson<Playlist>(`/api/playlists/${playlistId}/items/${itemId}`, {
    method: 'DELETE',
  })
}

export async function reorderPlaylistItems(
  playlistId: string,
  orderedItemIds: string[],
) {
  return apiFetchJson<Playlist>(`/api/playlists/${playlistId}/items/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({
      ordered_item_ids: orderedItemIds,
    }),
  })
}
