import { apiClient } from './client'
import type { Note } from '@/types'

export function getNote(date: string) {
  return apiClient.get<Note>(`/notes/${date}`)
}

export function upsertNote(date: string, content: string, options?: { keepalive?: boolean }) {
  return apiClient.put<Note>(`/notes/${date}`, { content }, options)
}
