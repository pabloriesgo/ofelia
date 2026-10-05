<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { addDays, formatDisplayDate, relativeDayLabel } from '@/utils/date'

const props = defineProps<{
  date: string
  today: string
}>()

const emit = defineEmits<{
  navigate: [date: string]
}>()

const formattedDate = computed(() => formatDisplayDate(props.date))
const relativeLabel = computed(() => relativeDayLabel(props.date, props.today))

function onPick(value: unknown) {
  if (typeof value === 'string' && value !== props.date) emit('navigate', value)
}
</script>

<template>
  <nav class="flex flex-wrap items-center gap-2">
    <button
      type="button"
      class="rounded-md px-2 py-1 text-xl text-gray-500 hover:bg-gray-200 hover:text-gray-800"
      aria-label="Previous day"
      @click="emit('navigate', addDays(date, -1))"
    >
      ‹
    </button>

    <VueDatePicker
      :model-value="date"
      model-type="yyyy-MM-dd"
      :time-config="{ enableTimePicker: false }"
      auto-apply
      @update:model-value="onPick"
    >
      <template #trigger>
        <button
          type="button"
          class="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-200"
          aria-label="Pick a date"
        >
          <h1 class="text-2xl font-semibold text-gray-800">{{ formattedDate }}</h1>
          <span
            v-if="relativeLabel"
            class="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600"
          >
            {{ relativeLabel }}
          </span>
        </button>
      </template>
    </VueDatePicker>

    <button
      type="button"
      class="rounded-md px-2 py-1 text-xl text-gray-500 hover:bg-gray-200 hover:text-gray-800"
      aria-label="Next day"
      @click="emit('navigate', addDays(date, 1))"
    >
      ›
    </button>

    <button
      v-if="date !== today"
      type="button"
      class="ml-auto rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
      aria-label="Go to today"
      @click="emit('navigate', today)"
    >
      Today
    </button>
  </nav>
</template>
