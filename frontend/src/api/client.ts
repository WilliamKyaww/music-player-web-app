export const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL
  ?.trim()
  .replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function buildApiUrl(path: string) {
  if (!configuredBaseUrl) {
    return path
  }

  return `${configuredBaseUrl}${path}`
}

export function getApiHref(path: string) {
  return configuredBaseUrl ? `${configuredBaseUrl}${path}` : path
}

export async function apiFetchJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = new URL(buildApiUrl(path), window.location.origin)

  const response = await fetch(
    configuredBaseUrl ? url.toString() : `${url.pathname}${url.search}`,
    {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
    },
  )

  if (!response.ok) {
    let message = 'Request failed. Please try again.'

    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload.detail) {
        message = payload.detail
      }
    } catch {
      // Keep the generic message if the payload is not JSON.
    }

    throw new ApiError(message, response.status)
  }

  return (await response.json()) as T
}

export async function apiFetchVoid(
  path: string,
  options: RequestInit = {},
): Promise<void> {
  const url = new URL(buildApiUrl(path), window.location.origin)

  const response = await fetch(
    configuredBaseUrl ? url.toString() : `${url.pathname}${url.search}`,
    {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
    },
  )

  if (!response.ok) {
    let message = 'Request failed. Please try again.'

    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload.detail) {
        message = payload.detail
      }
    } catch {
      // Keep generic fallback if response is not JSON.
    }

    throw new ApiError(message, response.status)
  }
}
