import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotesStore } from '@/stores/notesStore'
import { getNote, upsertNote } from '@/api/notes'
import { ApiError } from '@/api/client'
import type { Note } from '@/types'

vi.mock('@/api/notes', () => ({
  getNote: vi.fn(),
  upsertNote: vi.fn(),
}))

const DATE = '2026-09-23'
const NOTE: Note = { date: DATE, content: 'hello', createdAt: null, updatedAt: null }

async function loadedStore() {
  vi.mocked(getNote).mockResolvedValue({ data: NOTE })
  const store = useNotesStore()
  await store.fetchNote(DATE)
  return store
}

describe('useNotesStore API error messages', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getNote).mockReset()
    vi.mocked(upsertNote).mockReset()
  })

  describe('fetchNote', () => {
    it('shows the server detail for a 4xx ApiError', async () => {
      vi.mocked(getNote).mockRejectedValue(
        new ApiError(400, `/notes/${DATE}`, 'Invalid date format: 2026-13-45'),
      )
      const store = useNotesStore()

      await store.fetchNote(DATE)

      expect(store.error).toBe('Invalid date format: 2026-13-45')
      expect(store.loading).toBe(false)
      expect(store.currentNote).toBeNull()
    })

    it('falls back to a status message for a 4xx ApiError without detail', async () => {
      vi.mocked(getNote).mockRejectedValue(new ApiError(404, `/notes/${DATE}`))
      const store = useNotesStore()

      await store.fetchNote(DATE)

      expect(store.error).toContain('404')
      expect(store.error).not.toContain('Is the backend running?')
    })

    it('shows a generic server error for a 5xx ApiError, ignoring its detail', async () => {
      vi.mocked(getNote).mockRejectedValue(
        new ApiError(500, `/notes/${DATE}`, 'NullPointerException at line 42'),
      )
      const store = useNotesStore()

      await store.fetchNote(DATE)

      expect(store.error).toBe('Server error while trying to load the note. Please try again.')
    })

    it('keeps the backend-unreachable message for a non-ApiError failure', async () => {
      vi.mocked(getNote).mockRejectedValue(new TypeError('Failed to fetch'))
      const store = useNotesStore()

      await store.fetchNote(DATE)

      expect(store.error).toBe('Failed to load note. Is the backend running?')
    })
  })

  describe('flushPendingSave', () => {
    // Keep the auto-save debounce from firing outside the test that scheduled it.
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows the server detail for a 4xx ApiError and keeps the edit pending', async () => {
      const store = await loadedStore()
      vi.mocked(upsertNote).mockRejectedValueOnce(
        new ApiError(400, `/notes/${DATE}`, 'content must not be null'),
      )
      store.updateContent('edited')

      expect(await store.flushPendingSave()).toBe(false)
      expect(store.saveError).toBe('content must not be null')
      expect(store.saving).toBe(false)

      // The failed edit is retried on the next flush.
      vi.mocked(upsertNote).mockResolvedValueOnce({ data: { ...NOTE, content: 'edited' } })
      expect(await store.flushPendingSave()).toBe(true)
      expect(upsertNote).toHaveBeenLastCalledWith(DATE, 'edited')
      expect(store.saveError).toBeNull()
    })

    it('shows a generic server error for a 5xx ApiError', async () => {
      const store = await loadedStore()
      vi.mocked(upsertNote).mockRejectedValueOnce(new ApiError(503, `/notes/${DATE}`))
      store.updateContent('edited')

      expect(await store.flushPendingSave()).toBe(false)
      expect(store.saveError).toBe('Server error while trying to save the note. Please try again.')
    })

    it('keeps the backend-unreachable message for a non-ApiError failure', async () => {
      const store = await loadedStore()
      vi.mocked(upsertNote).mockRejectedValueOnce(new Error('network error'))
      store.updateContent('edited')

      expect(await store.flushPendingSave()).toBe(false)
      expect(store.saveError).toBe('Failed to save note. Is the backend running?')
    })
  })
})
