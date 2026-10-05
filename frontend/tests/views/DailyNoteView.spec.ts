import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import DailyNoteView from '@/views/DailyNoteView.vue'
import { routes } from '@/router'
import { getNote, upsertNote } from '@/api/notes'
import { todayIso, formatDisplayDate, addDays } from '@/utils/date'

vi.mock('@/api/notes', () => ({
  getNote: vi.fn(),
  upsertNote: vi.fn(),
}))

vi.mock('@vuepic/vue-datepicker', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    VueDatePicker: defineComponent({
      setup(_, { slots }) {
        return () => h('div', slots.trigger?.())
      },
    }),
  }
})

async function mountAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(DailyNoteView, {
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

function emptyNote(date: string) {
  return { data: { date, content: '', createdAt: null, updatedAt: null } }
}

// Mounted views listen for window focus; unmount them so they don't react to later tests.
enableAutoUnmount(afterEach)

describe('DailyNoteView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getNote).mockReset()
    vi.mocked(upsertNote).mockReset()
    vi.mocked(getNote).mockImplementation(async (date: string) => emptyNote(date))
  })

  it("displays today's date and opens the fetched note", async () => {
    const today = todayIso()
    vi.mocked(getNote).mockResolvedValue({
      data: { date: today, content: 'Plan the day', createdAt: null, updatedAt: null },
    })

    const { wrapper } = await mountAt('/')

    expect(wrapper.text()).toContain(formatDisplayDate(today))
    expect(wrapper.text()).toContain('Today')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('Plan the day')
    expect(getNote).toHaveBeenCalledWith(today)
  })

  it('shows an error message when the note fails to load', async () => {
    vi.mocked(getNote).mockRejectedValue(new Error('network error'))

    const { wrapper } = await mountAt('/')

    expect(wrapper.text()).toContain('Failed to load note')
  })

  it('opens the note for the date in the URL', async () => {
    const { wrapper } = await mountAt('/day/2026-09-20')

    expect(getNote).toHaveBeenCalledWith('2026-09-20')
    expect(wrapper.text()).toContain(formatDisplayDate('2026-09-20'))
  })

  it('shows an empty, editable note for a day without one', async () => {
    const { wrapper } = await mountAt('/day/2030-01-01')

    const textarea = wrapper.find('textarea')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
    expect(textarea.attributes('readonly')).toBeUndefined()
    expect(upsertNote).not.toHaveBeenCalled()
  })

  it('moves to the next and previous day', async () => {
    const { wrapper, router } = await mountAt('/day/2026-09-20')

    await wrapper.find('[aria-label="Next day"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/day/2026-09-21')
    expect(getNote).toHaveBeenLastCalledWith('2026-09-21')
    expect(wrapper.text()).toContain(formatDisplayDate('2026-09-21'))

    await wrapper.find('[aria-label="Previous day"]').trigger('click')
    await flushPromises()
    await wrapper.find('[aria-label="Previous day"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/day/2026-09-19')
  })

  it("navigates to '/' when moving onto today", async () => {
    const { wrapper, router } = await mountAt(`/day/${addDays(todayIso(), -1)}`)

    await wrapper.find('[aria-label="Next day"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(getNote).toHaveBeenLastCalledWith(todayIso())
  })

  it('returns to today with the Today button', async () => {
    const { wrapper, router } = await mountAt('/day/2020-05-05')

    await wrapper.find('[aria-label="Go to today"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(wrapper.find('[aria-label="Go to today"]').exists()).toBe(false)
  })

  it('shows a message for an invalid date without calling the API', async () => {
    const { wrapper } = await mountAt('/day/2026-02-31')

    expect(wrapper.text()).toContain('not a valid date')
    expect(wrapper.find('a[href="/"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(getNote).not.toHaveBeenCalled()
  })

  describe('editing', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('auto-saves edits after a debounce without an explicit save button', async () => {
      const today = todayIso()
      vi.mocked(upsertNote).mockResolvedValue({
        data: { date: today, content: 'New task', createdAt: '2026-09-23T09:00:00Z', updatedAt: '2026-09-23T09:00:00Z' },
      })

      const { wrapper } = await mountAt('/')

      expect(wrapper.findAll('button').some((b) => /save/i.test(b.text()))).toBe(false)

      await wrapper.find('textarea').setValue('New task')
      expect(upsertNote).not.toHaveBeenCalled()

      await vi.runAllTimersAsync()
      await flushPromises()

      expect(upsertNote).toHaveBeenCalledWith(today, 'New task')
      expect(wrapper.text()).toContain('Saved')
    })

    it('saves a pending edit to the original day when navigating away', async () => {
      vi.mocked(upsertNote).mockImplementation(async (date: string, content: string) => ({
        data: { date, content, createdAt: 'x', updatedAt: 'x' },
      }))

      const { wrapper, router } = await mountAt('/day/2026-09-20')
      await wrapper.find('textarea').setValue('Draft')
      await wrapper.find('[aria-label="Next day"]').trigger('click')
      await flushPromises()

      expect(upsertNote).toHaveBeenCalledWith('2026-09-20', 'Draft')
      expect(router.currentRoute.value.fullPath).toBe('/day/2026-09-21')
      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
    })

    it('saves edits typed while the save-before-navigate is in flight to the original day', async () => {
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

      const { wrapper, router } = await mountAt('/day/2026-09-20')
      await wrapper.find('textarea').setValue('Draft')
      await wrapper.find('[aria-label="Next day"]').trigger('click')
      await flushPromises()
      await wrapper.find('textarea').setValue('Draft and more')
      resolveFirst()
      await flushPromises()
      await vi.runAllTimersAsync()

      expect(vi.mocked(upsertNote).mock.calls).toEqual([
        ['2026-09-20', 'Draft'],
        ['2026-09-20', 'Draft and more'],
      ])
      expect(router.currentRoute.value.fullPath).toBe('/day/2026-09-21')
    })

    it('stays on the day when its edit fails to save and the user keeps it', async () => {
      vi.mocked(upsertNote).mockRejectedValue(new Error('network error'))
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

      const { wrapper, router } = await mountAt('/day/2026-09-20')
      await wrapper.find('textarea').setValue('Draft')
      await wrapper.find('[aria-label="Next day"]').trigger('click')
      await flushPromises()

      expect(confirm).toHaveBeenCalled()
      expect(router.currentRoute.value.fullPath).toBe('/day/2026-09-20')
      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('Draft')
      expect(wrapper.text()).toContain('Failed to save note')
      confirm.mockRestore()
    })

    it('leaves the day and discards the edit when the user confirms', async () => {
      vi.mocked(upsertNote).mockRejectedValue(new Error('network error'))
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const { wrapper, router } = await mountAt('/day/2026-09-20')
      await wrapper.find('textarea').setValue('Draft')
      await wrapper.find('[aria-label="Next day"]').trigger('click')
      await flushPromises()
      await vi.runAllTimersAsync()

      expect(router.currentRoute.value.fullPath).toBe('/day/2026-09-21')
      expect(wrapper.text()).not.toContain('Failed to save note')
      expect(upsertNote).toHaveBeenCalledTimes(1)
      confirm.mockRestore()
    })

    it('asks before closing the tab and sends the unsaved edit', async () => {
      vi.mocked(upsertNote).mockImplementation(async (date: string, content: string) => ({
        data: { date, content, createdAt: 'x', updatedAt: 'x' },
      }))
      const { wrapper } = await mountAt('/day/2026-09-20')
      await wrapper.find('textarea').setValue('Draft')

      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(upsertNote).toHaveBeenCalledWith('2026-09-20', 'Draft', { keepalive: true })
    })

    it('lets the tab close without asking when everything is saved', async () => {
      vi.mocked(upsertNote).mockImplementation(async (date: string, content: string) => ({
        data: { date, content, createdAt: 'x', updatedAt: 'x' },
      }))
      const { wrapper } = await mountAt('/day/2026-09-20')
      await wrapper.find('textarea').setValue('Draft')
      await vi.runAllTimersAsync()
      await flushPromises()

      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(false)
      expect(upsertNote).toHaveBeenCalledTimes(1)
    })
  })

  describe('when the day changes while the app is open', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 8, 23, 23, 59))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("moves '/' on to the new day when the window regains focus", async () => {
      const { wrapper } = await mountAt('/')
      expect(getNote).toHaveBeenLastCalledWith('2026-09-23')

      vi.setSystemTime(new Date(2026, 8, 24, 0, 1))
      window.dispatchEvent(new Event('focus'))
      await flushPromises()

      expect(getNote).toHaveBeenLastCalledWith('2026-09-24')
      expect(wrapper.find('h1').text()).toBe(formatDisplayDate('2026-09-24'))
      expect(wrapper.text()).toContain('Today')
    })

    it('reaches the new day with the Next button', async () => {
      const { wrapper, router } = await mountAt('/')

      vi.setSystemTime(new Date(2026, 8, 24, 0, 1))
      await wrapper.find('[aria-label="Next day"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe('/')
      expect(getNote).toHaveBeenLastCalledWith('2026-09-24')
      expect(wrapper.find('h1').text()).toBe(formatDisplayDate('2026-09-24'))
      expect(wrapper.find('[aria-label="Go to today"]').exists()).toBe(false)
    })
  })
})
