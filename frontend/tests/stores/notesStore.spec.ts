import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useNotesStore } from '@/stores/notesStore'
import { getNote, upsertNote } from '@/api/notes'
import type { Note } from '@/types'

vi.mock('@/api/notes', () => ({
  getNote: vi.fn(),
  upsertNote: vi.fn(),
}))

describe('useNotesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getNote).mockReset()
    vi.mocked(upsertNote).mockReset()
  })

  describe('fetchNote', () => {
    it('stores the fetched note on success', async () => {
      vi.mocked(getNote).mockResolvedValue({
        data: { date: '2026-09-23', content: 'hello', createdAt: null, updatedAt: null },
      })
      const store = useNotesStore()

      await store.fetchNote('2026-09-23')

      expect(store.currentNote).toEqual({
        date: '2026-09-23',
        content: 'hello',
        createdAt: null,
        updatedAt: null,
      })
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('sets an error and clears loading when the request fails', async () => {
      vi.mocked(getNote).mockRejectedValue(new Error('network error'))
      const store = useNotesStore()

      await store.fetchNote('2026-09-23')

      expect(store.currentNote).toBeNull()
      expect(store.error).not.toBeNull()
      expect(store.loading).toBe(false)
    })
  })

  describe('updateContent', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('updates the local content immediately and auto-saves after a debounce', async () => {
      vi.mocked(getNote).mockResolvedValue({
        data: { date: '2026-09-23', content: '', createdAt: null, updatedAt: null },
      })
      vi.mocked(upsertNote).mockResolvedValue({
        data: { date: '2026-09-23', content: 'New content', createdAt: '2026-09-23T09:00:00Z', updatedAt: '2026-09-23T09:00:00Z' },
      })
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('New content')

      expect(store.currentNote?.content).toBe('New content')
      expect(upsertNote).not.toHaveBeenCalled()

      await vi.runAllTimersAsync()

      expect(upsertNote).toHaveBeenCalledWith('2026-09-23', 'New content')
      expect(store.currentNote?.updatedAt).toBe('2026-09-23T09:00:00Z')
      expect(store.saving).toBe(false)
    })

    it('sets a save error when the auto-save request fails', async () => {
      vi.mocked(getNote).mockResolvedValue({
        data: { date: '2026-09-23', content: '', createdAt: null, updatedAt: null },
      })
      vi.mocked(upsertNote).mockRejectedValue(new Error('network error'))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('New content')
      await vi.runAllTimersAsync()

      expect(store.saveError).not.toBeNull()
      expect(store.saving).toBe(false)
    })

    it("tags the save with the shown note's date", async () => {
      vi.mocked(getNote).mockResolvedValue({
        data: { date: '2026-09-23', content: '', createdAt: null, updatedAt: null },
      })
      vi.mocked(upsertNote).mockImplementation(async (date: string, content: string) => ({
        data: { date, content, createdAt: 'x', updatedAt: 'x' },
      }))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('typed')
      await vi.runAllTimersAsync()

      expect(upsertNote).toHaveBeenCalledWith('2026-09-23', 'typed')
    })
  })

  describe('flushPendingSave', () => {
    beforeEach(() => {
      vi.mocked(getNote).mockResolvedValue({
        data: { date: '2026-09-23', content: '', createdAt: null, updatedAt: null },
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('saves immediately and cancels the debounced save', async () => {
      vi.useFakeTimers()
      vi.mocked(upsertNote).mockImplementation(async (date: string, content: string) => ({
        data: { date, content, createdAt: 'x', updatedAt: 'x' },
      }))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('typed')
      expect(await store.flushPendingSave()).toBe(true)
      expect(upsertNote).toHaveBeenCalledWith('2026-09-23', 'typed')

      await vi.runAllTimersAsync()
      expect(upsertNote).toHaveBeenCalledTimes(1)
    })

    it('runs saves one at a time, in order', async () => {
      const resolvers: Array<() => void> = []
      vi.mocked(upsertNote).mockImplementation(
        (date: string, content: string) =>
          new Promise((resolve) => {
            resolvers.push(() => resolve({ data: { date, content, createdAt: 'x', updatedAt: 'x' } }))
          }),
      )
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('first')
      const firstFlush = store.flushPendingSave()
      await flushPromises()
      store.updateContent('second')
      const secondFlush = store.flushPendingSave()
      await flushPromises()

      // The second save waits for the first to finish.
      expect(upsertNote).toHaveBeenCalledTimes(1)
      resolvers[0]()
      await flushPromises()
      expect(upsertNote).toHaveBeenCalledTimes(2)
      expect(upsertNote).toHaveBeenLastCalledWith('2026-09-23', 'second')
      expect(store.saving).toBe(true)

      resolvers[1]()
      expect(await firstFlush).toBe(true)
      expect(await secondFlush).toBe(true)
      expect(store.saving).toBe(false)
      expect(store.currentNote?.content).toBe('second')
    })

    it('also saves edits typed while a save was in flight', async () => {
      let resolveFirst!: () => void
      vi.mocked(upsertNote)
        .mockImplementationOnce(
          (date: string, content: string) =>
            new Promise((resolve) => {
              resolveFirst = () => resolve({ data: { date, content, createdAt: 'x', updatedAt: 'x' } })
            }),
        )
        .mockImplementation(async (date: string, content: string) => ({
          data: { date, content, createdAt: 'x', updatedAt: 'x' },
        }))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('first')
      const flushed = store.flushPendingSave()
      await flushPromises()
      store.updateContent('first and more')
      resolveFirst()

      expect(await flushed).toBe(true)
      expect(upsertNote).toHaveBeenLastCalledWith('2026-09-23', 'first and more')
    })

    it('keeps a failed edit pending and retries it on the next flush', async () => {
      vi.mocked(upsertNote)
        .mockRejectedValueOnce(new Error('network error'))
        .mockImplementation(async (date: string, content: string) => ({
          data: { date, content, createdAt: 'x', updatedAt: 'x' },
        }))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('typed')
      expect(await store.flushPendingSave()).toBe(false)
      expect(store.saveError).not.toBeNull()

      expect(await store.flushPendingSave()).toBe(true)
      expect(upsertNote).toHaveBeenCalledTimes(2)
      expect(upsertNote).toHaveBeenLastCalledWith('2026-09-23', 'typed')
      expect(store.saveError).toBeNull()
    })

    it('drops a failed edit when discarded', async () => {
      vi.mocked(upsertNote).mockRejectedValue(new Error('network error'))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('typed')
      await store.flushPendingSave()
      store.discardPendingSave()

      expect(store.saveError).toBeNull()
      expect(await store.flushPendingSave()).toBe(true)
      expect(upsertNote).toHaveBeenCalledTimes(1)
    })
  })
  describe('fetchNote across days', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('ignores a stale response from an earlier navigation', async () => {
      vi.useRealTimers()
      let resolveFirst!: (value: { data: Note }) => void
      vi.mocked(getNote)
        .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
        .mockResolvedValueOnce({ data: { date: '2026-09-25', content: 'latest', createdAt: null, updatedAt: null } })
      const store = useNotesStore()

      const first = store.fetchNote('2026-09-24')
      await flushPromises()
      await store.fetchNote('2026-09-25')
      resolveFirst({ data: { date: '2026-09-24', content: 'stale', createdAt: null, updatedAt: null } })
      await first

      expect(store.currentNote?.content).toBe('latest')
      expect(store.loading).toBe(false)
    })

    it('does not let a save response for another date overwrite the shown note', async () => {
      vi.mocked(getNote)
        .mockResolvedValueOnce({ data: { date: '2026-09-23', content: '', createdAt: null, updatedAt: null } })
        .mockResolvedValueOnce({ data: { date: '2026-09-24', content: 'tomorrow', createdAt: null, updatedAt: null } })
      let resolveSave!: (value: { data: Note }) => void
      vi.mocked(upsertNote).mockReturnValue(new Promise((resolve) => { resolveSave = resolve }))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('typed')
      await vi.runAllTimersAsync()
      await store.fetchNote('2026-09-24')
      resolveSave({ data: { date: '2026-09-23', content: 'typed', createdAt: 'x', updatedAt: 'x' } })
      await vi.runAllTimersAsync()

      expect(store.currentNote).toEqual({ date: '2026-09-24', content: 'tomorrow', createdAt: null, updatedAt: null })
    })
  })

  describe('saveOnUnload', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.mocked(getNote).mockResolvedValue({
        data: { date: '2026-09-23', content: '', createdAt: null, updatedAt: null },
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('reports no unsaved changes once the edit is saved', async () => {
      vi.mocked(upsertNote).mockImplementation(async (date: string, content: string) => ({
        data: { date, content, createdAt: 'x', updatedAt: 'x' },
      }))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('typed')
      expect(store.hasUnsavedChanges()).toBe(true)

      await vi.runAllTimersAsync()
      expect(store.hasUnsavedChanges()).toBe(false)
    })

    it('reports unsaved changes while a save is in flight', async () => {
      vi.mocked(upsertNote).mockReturnValue(new Promise(() => {}))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('typed')
      await vi.runAllTimersAsync()

      expect(store.hasUnsavedChanges()).toBe(true)
    })

    it('sends the pending edit as a keepalive request and keeps it pending', async () => {
      vi.mocked(upsertNote).mockImplementation(async (date: string, content: string) => ({
        data: { date, content, createdAt: 'x', updatedAt: 'x' },
      }))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('typed')
      store.saveOnUnload()

      expect(upsertNote).toHaveBeenCalledWith('2026-09-23', 'typed', { keepalive: true })
      expect(store.hasUnsavedChanges()).toBe(true)
    })

    it('does nothing when there is no pending edit', async () => {
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.saveOnUnload()

      expect(upsertNote).not.toHaveBeenCalled()
    })

    it('swallows a failed keepalive request', async () => {
      vi.mocked(upsertNote).mockRejectedValue(new TypeError('body too large for keepalive'))
      const store = useNotesStore()
      await store.fetchNote('2026-09-23')

      store.updateContent('typed')
      store.saveOnUnload()
      await flushPromises()

      expect(store.hasUnsavedChanges()).toBe(true)
    })
  })
})
