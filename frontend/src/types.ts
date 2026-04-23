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

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'converting'
  | 'completed'
  | 'failed'

export type DownloadRuntimeStatus = {
  available: boolean
  missing_dependencies: string[]
  downloads_directory: string
}

export type DownloadJob = {
  id: string
  video_id: string
  title: string
  channel_title: string
  thumbnail_url: string | null
  source_url: string
  status: DownloadStatus
  status_detail: string | null
  progress_percent: number
  created_at: string
  updated_at: string
  error_message: string | null
  file_name: string | null
  file_size_bytes: number | null
  download_path: string | null
}

export type DownloadListResponse = {
  runtime: DownloadRuntimeStatus
  items: DownloadJob[]
}

export type EnqueueDownloadResponse = {
  job: DownloadJob
  deduplicated: boolean
}

export type RemoveDownloadResponse = {
  removed_job_id: string
  deleted_file: boolean
}

export type PlaylistItem = {
  id: string
  video_id: string
  title: string
  channel_title: string
  thumbnail_url: string | null
  source_url: string
  duration_label: string | null
  added_at: string
  position: number
}

export type Playlist = {
  id: string
  name: string
  created_at: string
  updated_at: string
  items: PlaylistItem[]
}

export type PlaylistListResponse = {
  items: Playlist[]
}

export type PlaylistExportStatus =
  | 'queued'
  | 'preparing'
  | 'packaging'
  | 'completed'
  | 'failed'

export type PlaylistExportJob = {
  id: string
  playlist_id: string
  playlist_name: string
  status: PlaylistExportStatus
  status_detail: string | null
  progress_percent: number
  created_at: string
  updated_at: string
  item_count: number
  completed_item_count: number
  file_name: string | null
  file_size_bytes: number | null
  download_path: string | null
  error_message: string | null
}

export type PlaylistExportListResponse = {
  items: PlaylistExportJob[]
}
