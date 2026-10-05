import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import DailyNoteView from '@/views/DailyNoteView.vue'
import { routes } from '@/router'
import { getNote, upsertNote } from '@/api/notes'
import { formatDisplayDate } from '@/utils/date'

vi.mock('@/api/notes', () => ({
  getNote: vi.fn(),
  upsertNote: vi.fn(),
}))

vi.mock('@vuepic/vue-datepicker', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    VueDatePicker: defineComponent({
      name: 'VueDatePickerStub',
      props: ['modelValue'],
      emits: ['update:modelValue'],
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
  const wrapper = mount(DailyNoteView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

function emptyNote(date: string) {
  return { data: { date, content: '', createdAt: null, updatedAt: null } }
}

function textareaValue(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) {
  return (wrapper.find('textarea').element as HTMLTextAreaElement).value
}

// Dates are far from the real "today" so the '/' redirect for today never kicks in.
describe('Story 2: Navigate Between Days', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getNote).mockReset()
    vi.mocked(upsertNote).mockReset()
    vi.mocked(getNote).mockImplementation(async (date: string) => emptyNote(date))
  })

  it('Prev/next controls move one day at a time', async () => {
    const { wrapper, router } = await mountAt('/day/2020-02-28')

    await wrapper.find('[aria-label="Next day"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/day/2020-02-29')
    expect(getNote).toHaveBeenLastCalledWith('2020-02-29')

    await wrapper.find('[aria-label="Next day"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/day/2020-03-01')
    expect(wrapper.text()).toContain(formatDisplayDate('2020-03-01'))

    await wrapper.find('[aria-label="Previous day"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/day/2020-02-29')
    expect(getNote).toHaveBeenLastCalledWith('2020-02-29')
    expect(wrapper.text()).toContain(formatDisplayDate('2020-02-29'))

    expect(vi.mocked(getNote).mock.calls.map(([d]) => d)).toEqual([
      '2020-02-28',
      '2020-02-29',
      '2020-03-01',
      '2020-02-29',
    ])
  })

  it('A date picker/calendar lets me jump directly to any date', async () => {
    const { wrapper, router } = await mountAt('/day/2020-05-05')

    const picker = wrapper.findComponent({ name: 'VueDatePickerStub' })
    expect(picker.props('modelValue')).toBe('2020-05-05')

    picker.vm.$emit('update:modelValue', '2031-12-31')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/day/2031-12-31')
    expect(getNote).toHaveBeenLastCalledWith('2031-12-31')
    expect(getNote).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain(formatDisplayDate('2031-12-31'))
  })

  describe('with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('Navigating to a day with no existing note shows an empty, editable note for that date (not created in storage until content is added)', async () => {
      vi.mocked(upsertNote).mockImplementation(async (date: string, content: string) => ({
        data: { date, content, createdAt: 'x', updatedAt: 'x' },
      }))
      vi.mocked(getNote).mockImplementation(async (date: string) =>
        date === '2020-05-05'
          ? { data: { date, content: 'Existing entry', createdAt: 'x', updatedAt: 'x' } }
          : emptyNote(date),
      )
      const { wrapper } = await mountAt('/day/2020-05-05')
      expect(textareaValue(wrapper)).toBe('Existing entry')

      await wrapper.find('[aria-label="Next day"]').trigger('click')
      await flushPromises()
      await vi.runAllTimersAsync()

      // Empty and editable, for the navigated-to date
      const textarea = wrapper.find('textarea')
      expect(textareaValue(wrapper)).toBe('')
      expect(textarea.attributes('readonly')).toBeUndefined()
      expect(textarea.attributes('disabled')).toBeUndefined()
      expect(wrapper.text()).toContain(formatDisplayDate('2020-05-06'))

      // Not persisted merely by viewing it
      expect(upsertNote).not.toHaveBeenCalled()

      // Persisted once content is added
      await textarea.setValue('First thought')
      await vi.runAllTimersAsync()
      await flushPromises()
      expect(upsertNote).toHaveBeenCalledTimes(1)
      expect(upsertNote).toHaveBeenCalledWith('2020-05-06', 'First thought')
    })
  })

  describe('unhappy paths', () => {
    it('shows an error instead of a stale note when the next day fails to load', async () => {
      vi.mocked(getNote).mockImplementation(async (date: string) => {
        if (date === '2020-05-06') throw new Error('network error')
        return { data: { date, content: 'Yesterday stuff', createdAt: 'x', updatedAt: 'x' } }
      })
      const { wrapper, router } = await mountAt('/day/2020-05-05')

      await wrapper.find('[aria-label="Next day"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe('/day/2020-05-06')
      expect(wrapper.text()).toContain('Failed to load note')
      expect(wrapper.text()).not.toContain('Yesterday stuff')
      expect(upsertNote).not.toHaveBeenCalled()
    })

    it('rejects an invalid date in the URL without calling the API', async () => {
      const { wrapper } = await mountAt('/day/2021-02-29')

      expect(wrapper.text()).toContain('not a valid date')
      expect(wrapper.find('textarea').exists()).toBe(false)
      expect(getNote).not.toHaveBeenCalled()
      expect(upsertNote).not.toHaveBeenCalled()
    })
  })
})
