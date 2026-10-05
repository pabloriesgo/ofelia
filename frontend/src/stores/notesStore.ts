import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { Note } from '@/types'
import { getNote, upsertNote } from '@/api/notes'

const AUTO_SAVE_DEBOUNCE_MS = 600

export const useNotesStore = defineStore('notes', () => {
  const currentNote = ref<Note | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const saving = ref(false)
  const saveError = ref<string | null>(null)

  let latestRequestedDate: string | null = null
  let pendingSave: { date: string; content: string } | null = null
  // Saves run one at a time so an older PUT can never land after a newer one.
  let saveQueue: Promise<boolean> = Promise.resolve(true)

  async function fetchNote(date: string) {
    latestRequestedDate = date
    loading.value = true
    error.value = null
    try {
      const { data } = await getNote(date)
      // A newer navigation superseded this request; drop its response.
      if (latestRequestedDate !== date) return
      currentNote.value = data
    } catch {
      if (latestRequestedDate !== date) return
      error.value = 'Failed to load note. Is the backend running?'
    } finally {
      if (latestRequestedDate === date) loading.value = false
    }
  }

  async function runPendingSave(): Promise<boolean> {
    if (!pendingSave) return true
    const save = pendingSave
    pendingSave = null
    saving.value = true
    saveError.value = null
    try {
      const { data } = await upsertNote(save.date, save.content)
      // Only apply the response to the note it belongs to, and keep any
      // edits typed while the request was in flight.
      if (currentNote.value?.date === data.date) {
        currentNote.value =
          currentNote.value.content === data.content
            ? data
            : { ...currentNote.value, createdAt: data.createdAt, updatedAt: data.updatedAt }
      }
      return true
    } catch {
      // Keep the edit for the next attempt, unless a newer one already replaced it.
      pendingSave ??= save
      saveError.value = 'Failed to save note. Is the backend running?'
      return false
    } finally {
      saving.value = false
    }
  }

  function saveNow(): Promise<boolean> {
    saveQueue = saveQueue.then(runPendingSave)
    return saveQueue
  }

  const debouncedSave = useDebounceFn(saveNow, AUTO_SAVE_DEBOUNCE_MS)

  function updateContent(content: string) {
    if (!currentNote.value) return
    currentNote.value = { ...currentNote.value, content }
    // Tag the save with the shown note's own date so an edit can never be written to another day.
    pendingSave = { date: currentNote.value.date, content }
    debouncedSave()
  }

  /**
   * Saves all pending edits immediately, including ones typed while a save was
   * in flight. Resolves to false if a save failed and the edit is still unsaved.
   */
  async function flushPendingSave(): Promise<boolean> {
    do {
      if (!(await saveNow())) return false
    } while (pendingSave)
    return true
  }

  function discardPendingSave() {
    pendingSave = null
    saveError.value = null
  }

  return {
    currentNote,
    loading,
    error,
    saving,
    saveError,
    fetchNote,
    updateContent,
    flushPendingSave,
    discardPendingSave,
  }
})
