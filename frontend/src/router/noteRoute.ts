import type { RouteLocationRaw } from 'vue-router'
import { todayIso } from '@/utils/date'

/** Today's note always lives at `/`; every other day at `/day/:date`. */
export function noteRoute(date: string): RouteLocationRaw {
  return date === todayIso() ? { name: 'daily-note-today' } : { name: 'daily-note', params: { date } }
}
