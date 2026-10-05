import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import DailyNoteView from '@/views/DailyNoteView.vue'
import { getNote } from '@/api/notes'

vi.mock('@/api/notes', () => ({
  getNote: vi.fn(),
}))

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getNote).mockReset()
    vi.mocked(getNote).mockResolvedValue({
      data: { date: '2026-09-23', content: '', createdAt: null, updatedAt: null },
    })
  })

  it('renders the daily note view at the root route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'daily-note-today', component: DailyNoteView }],
    })
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router] } })

    expect(wrapper.findComponent(DailyNoteView).exists()).toBe(true)
  })
})
