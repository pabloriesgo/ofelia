import { createRouter, createWebHistory } from 'vue-router'
import DailyNoteView from '@/views/DailyNoteView.vue'

export const routes = [
  { path: '/', name: 'daily-note-today', component: DailyNoteView },
  { path: '/day/:date', name: 'daily-note', component: DailyNoteView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
