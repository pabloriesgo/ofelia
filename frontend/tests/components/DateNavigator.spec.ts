import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DateNavigator from '@/components/DateNavigator.vue'
import { formatDisplayDate } from '@/utils/date'

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

function mountNavigator(date: string, today = '2026-09-23') {
  return mount(DateNavigator, {
    props: { date, today },
  })
}

describe('DateNavigator', () => {
  it('shows the formatted date with a relative label', () => {
    const wrapper = mountNavigator('2026-09-22')

    expect(wrapper.find('h1').text()).toBe(formatDisplayDate('2026-09-22'))
    expect(wrapper.text()).toContain('Yesterday')
  })

  it('shows no relative label for a distant day', () => {
    const wrapper = mountNavigator('2026-09-01')

    expect(wrapper.find('[aria-label="Pick a date"]').text()).not.toMatch(/Today|Yesterday|Tomorrow/)
  })

  it('emits the previous and next day', async () => {
    const wrapper = mountNavigator('2026-09-30')

    await wrapper.find('[aria-label="Previous day"]').trigger('click')
    await wrapper.find('[aria-label="Next day"]').trigger('click')

    expect(wrapper.emitted('navigate')).toEqual([['2026-09-29'], ['2026-10-01']])
  })

  it('hides the Today button when already on today', () => {
    const wrapper = mountNavigator('2026-09-23')

    expect(wrapper.find('[aria-label="Go to today"]').exists()).toBe(false)
  })

  it('emits today from the Today button on another day', async () => {
    const wrapper = mountNavigator('2026-08-01')

    await wrapper.find('[aria-label="Go to today"]').trigger('click')

    expect(wrapper.emitted('navigate')).toEqual([['2026-09-23']])
  })

  it('emits the date picked in the calendar', async () => {
    const wrapper = mountNavigator('2026-09-23')

    const picker = wrapper.findComponent({ name: 'VueDatePickerStub' })
    expect(picker.props('modelValue')).toBe('2026-09-23')
    picker.vm.$emit('update:modelValue', '2025-01-15')

    expect(wrapper.emitted('navigate')).toEqual([['2025-01-15']])
  })
})
