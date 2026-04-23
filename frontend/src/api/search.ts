import type { SearchResponse } from '../types'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '')

export class SearchApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SearchApiError'
    this.status = status
  }
}

function buildApiUrl(path: string) {
  if (!configuredBaseUrl) {
    return path
  }

  return `${configuredBaseUrl}${path}`
}

export async function searchVideos(query: string, signal?: AbortSignal) {
  const url = new URL(buildApiUrl('/api/search'), window.location.origin)
  url.searchParams.set('q', query)
  url.searchParams.set('max_results', '12')

  const response = await fetch(
    configuredBaseUrl ? url.toString() : `${url.pathname}${url.search}`,
    {
      method: 'GET',
      signal,
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    let message = 'Search failed. Please try again.'

    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload.detail) {
        message = payload.detail
      }
    } catch {
      // Leave the generic message in place if the response body is not JSON.
    }

    throw new SearchApiError(message, response.status)
  }

  return (await response.json()) as SearchResponse
}
