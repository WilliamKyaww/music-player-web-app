export type VideoSearchResult = {
  id: string
  title: string
  channel_title: string
  channel_id: string
  description: string
  thumbnail_url: string
  duration_iso: string
  duration_label: string
  published_at: string
  video_url: string
}

export type SearchResponse = {
  query: string
  total: number
  items: VideoSearchResult[]
}
