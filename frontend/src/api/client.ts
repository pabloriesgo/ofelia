import type { ProblemDetail } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** Thrown when the backend answers with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number
  readonly detail?: string

  constructor(status: number, path: string, detail?: string) {
    super(`Request to ${path} failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

/** Reads the `detail` of a ProblemDetail body; undefined for empty or non-JSON bodies. */
async function readProblemDetail(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as ProblemDetail | null
    const detail = body?.detail
    return typeof detail === 'string' && detail.trim() !== '' ? detail : undefined
  } catch {
    return undefined
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<{ data: T }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    throw new ApiError(response.status, path, await readProblemDetail(response))
  }

  return { data: (await response.json()) as T }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
}
