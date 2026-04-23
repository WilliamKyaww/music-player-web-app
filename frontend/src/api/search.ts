import { ApiError, apiFetchJson, buildApiUrl } from './client'
import type { SearchResponse } from '../types'

export async function searchVideos(query: string, signal?: AbortSignal) {
  const url = new URL(buildApiUrl('/api/search'), window.location.origin)
  url.searchParams.set('q', query)
  url.searchParams.set('max_results', '12')

  try {
    return await apiFetchJson<SearchResponse>(`${url.pathname}${url.search}`, {
      method: 'GET',
      signal,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      error.name = 'SearchApiError'
    }
    throw error
  }
}
