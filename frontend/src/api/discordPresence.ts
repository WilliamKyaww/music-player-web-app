import { apiFetchJson, apiFetchVoid } from './client'
import type { DiscordPresenceStatus } from '../types'

export type DiscordPresenceActivityPayload = {
  video_id: string
  title: string
  thumbnail_url?: string | null
  channel_title?: string | null
  playlist_name?: string | null
  source_url?: string | null
  is_playing: boolean
  is_playlist_playback: boolean
  position_seconds: number
  duration_seconds?: number | null
}

export async function fetchDiscordPresenceStatus() {
  return apiFetchJson<DiscordPresenceStatus>('/api/discord-presence', {
    method: 'GET',
  })
}

export async function updateDiscordPresenceActivity(
  payload: DiscordPresenceActivityPayload,
) {
  return apiFetchJson<DiscordPresenceStatus>('/api/discord-presence/activity', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function clearDiscordPresenceActivity() {
  return apiFetchVoid('/api/discord-presence/activity', {
    method: 'DELETE',
  })
}

export function getDiscordPresenceThumbnailHref(
  videoId: string,
  thumbnailUrl?: string | null,
) {
  const encodedVideoId = encodeURIComponent(videoId)
  const youtubeWidePreviewUrl = `https://i.ytimg.com/vi/${encodedVideoId}/mqdefault.jpg`
  const sourceUrl = videoId
    ? youtubeWidePreviewUrl
    : thumbnailUrl?.trim().startsWith('http')
      ? thumbnailUrl.trim()
      : ''

  const proxiedSource = sourceUrl.replace(/^https?:\/\//i, '')
  const params = new URLSearchParams({
    url: proxiedSource,
    w: '512',
    h: '512',
    fit: 'cover',
    a: 'attention',
    output: 'jpg',
  })

  return `https://wsrv.nl/?${params.toString()}`
}
