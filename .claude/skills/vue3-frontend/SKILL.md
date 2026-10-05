---
name: vue3-frontend
description: Use when writing or scaffolding frontend code for this project (Vue 3 SPA) - covers stack, project structure, and conventions to follow.
---

# Vue 3 Frontend

Stack for this project's frontend, per PRD.md:

- **Vite** — build tool / dev server
- **Vue 3** with `<script setup>` and **TypeScript**
- **Pinia** — state management (stores per domain, e.g. `useNotesStore`)
- **Vue Router** — routes for daily note view, task overview, search
- **VueUse** — prefer existing composables (e.g. debounce, fetch) over hand-rolling
- **Tailwind CSS** — utility classes, avoid custom CSS files unless necessary
- **Vitest** + Vue Test Utils — unit/component tests

## Conventions
- Components in `src/components/`, one component per file, PascalCase filenames.
- Views/pages in `src/views/`, one per route.
- API calls isolated in `src/api/` (e.g. `notes.ts`), never called directly from components — go through Pinia store actions.
- Store is the single source of truth; components stay presentational where possible.
- Auto-save via debounced watcher (VueUse `useDebounceFn` or similar) rather than manual save buttons, matching PRD story 3.
- No client-side persistence (no localStorage as source of truth) — backend is authoritative per PRD.

## When implementing a user story
1. Check `PRD.md` at the repo root for the relevant story and acceptance criteria.
2. Add/extend the Pinia store and API client method(s) needed.
3. Build the view/component, wiring to the store.
4. Add a Vitest test covering the acceptance criteria.
