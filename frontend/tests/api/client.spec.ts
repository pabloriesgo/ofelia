import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiClient, ApiError } from '@/api/client'

function mockFetchResponse(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (err) {
    return err
  }
  throw new Error('Expected the request to reject')
}

describe('apiClient error handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws an ApiError carrying the ProblemDetail detail for a 400', async () => {
    mockFetchResponse(
      new Response(
        JSON.stringify({
          status: 400,
          title: 'Bad Request',
          detail: 'Invalid date format: 2026-13-45',
          instance: '/api/notes/2026-13-45',
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    )

    const err = await captureRejection(apiClient.get('/notes/2026-13-45'))

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toBeInstanceOf(Error)
    expect((err as ApiError).status).toBe(400)
    expect((err as ApiError).detail).toBe('Invalid date format: 2026-13-45')
  })

  it('throws an ApiError with the status for a 500', async () => {
    mockFetchResponse(
      new Response(
        JSON.stringify({ status: 500, title: 'Internal Server Error', detail: 'Unexpected error' }),
        { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    )

    const err = await captureRejection(apiClient.put('/notes/2026-09-23', { content: 'x' }))

    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(500)
  })

  it('leaves detail undefined when the error body is not JSON', async () => {
    mockFetchResponse(
      new Response('<html>Bad Gateway</html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }),
    )

    const err = await captureRejection(apiClient.get('/notes/2026-09-23'))

    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(502)
    expect((err as ApiError).detail).toBeUndefined()
  })

  it('leaves detail undefined when the error body is empty', async () => {
    mockFetchResponse(new Response(null, { status: 404 }))

    const err = await captureRejection(apiClient.get('/notes/2026-09-23'))

    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(404)
    expect((err as ApiError).detail).toBeUndefined()
  })

  it('keeps rejecting with the original error on a network failure', async () => {
    const networkError = new TypeError('Failed to fetch')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError))

    const err = await captureRejection(apiClient.get('/notes/2026-09-23'))

    expect(err).toBe(networkError)
    expect(err).not.toBeInstanceOf(ApiError)
  })
})
