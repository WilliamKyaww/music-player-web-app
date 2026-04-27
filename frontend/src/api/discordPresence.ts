import { apiFetchJson, apiFetchVoid } from './client'
import type { DiscordPresenceStatus } from '../types'

export type DiscordPresenceActivityPayload = {
  video_id: string
  title: string
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
