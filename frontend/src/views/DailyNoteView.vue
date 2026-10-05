<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import { useNotesStore } from '@/stores/notesStore'
import { noteRoute } from '@/router/noteRoute'
import { todayIso, isValidIsoDate } from '@/utils/date'
import DateNavigator from '@/components/DateNavigator.vue'

const notesStore = useNotesStore()
const route = useRoute()
const router = useRouter()

// Kept fresh so a tab left open overnight moves on to the new day.
const today = ref(todayIso())
function refreshToday() {
  today.value = todayIso()
}
useEventListener(window, 'focus', refreshToday)
useEventListener(document, 'visibilitychange', refreshToday)

const date = computed(() => (route.params.date as string | undefined) ?? today.value)
const validDate = computed(() => isValidIsoDate(date.value))

watch(
  date,
  (value) => {
    if (validDate.value) notesStore.fetchNote(value)
  },
  { immediate: true },
)

// Save pending edits before the route changes, so they land on the day they were typed on.
const removeSaveGuard = router.beforeEach(async () => {
  if (await notesStore.flushPendingSave()) return true
  if (window.confirm('Your latest changes could not be saved. Leave this note and discard them?')) {
    notesStore.discardPendingSave()
    return true
  }
  return false
})
onUnmounted(removeSaveGuard)

function onNavigate(target: string) {
  refreshToday()
  router.push(noteRoute(target))
}

function onInput(event: Event) {
  notesStore.updateContent((event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 px-4 py-8">
    <div class="mx-auto max-w-2xl">
      <template v-if="!validDate">
        <p class="text-red-500">"{{ date }}" is not a valid date.</p>
        <RouterLink to="/" class="mt-2 inline-block text-blue-600 hover:underline">Go to today's note</RouterLink>
      </template>
      <template v-else>
        <DateNavigator :date="date" :today="today" @navigate="onNavigate" />

        <p v-if="notesStore.loading" class="mt-4 text-gray-400">Loading note…</p>
        <p v-else-if="notesStore.error" class="mt-4 text-red-500">{{ notesStore.error }}</p>
        <template v-else>
          <textarea
            class="mt-4 min-h-[400px] w-full resize-y rounded-md bg-white p-4 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Write your notes and tasks…"
            :value="notesStore.currentNote?.content"
            @input="onInput"
          />
          <p class="mt-2 h-5 text-sm text-gray-400">
            <span v-if="notesStore.saving">Saving…</span>
            <span v-else-if="notesStore.saveError" class="text-red-500">{{ notesStore.saveError }}</span>
            <span v-else-if="notesStore.currentNote?.updatedAt">Saved</span>
          </p>
        </template>
      </template>
    </div>
  </main>
</template>
