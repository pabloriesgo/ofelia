# Frontend review checklist — Vue 3

This project uses `<script setup>` + TypeScript, Pinia, Vue Router, VueUse, and Tailwind
(see the `vue3-frontend` skill). Check changes against that shape and against the items
below.

## Component architecture

- API calls happen in `src/api/` and are invoked from Pinia store actions — a component
  calling `fetch`/an API client method directly, bypassing the store, breaks the
  single-source-of-truth model this project relies on.
- Components stay presentational where possible; business/state logic lives in the store,
  not duplicated in component methods.
- One component per file, PascalCase filename, matching the component's registered name.
- Props are typed (`defineProps<{ ... }>()`), not loosely typed with `any` or left
  untyped — an untyped prop defeats the point of TypeScript here.
- Emits declared with `defineEmits<{ ... }>()` rather than untyped `$emit` calls, so the
  parent/child contract is checkable.

## Reactivity

- `ref`/`reactive` used appropriately — primitives in `ref`, and avoid wrapping a `ref` in
  another `ref` or destructuring a `reactive` object (which silently loses reactivity;
  `storeToRefs` should be used when destructuring from a Pinia store).
- `computed` used for derived state instead of recomputing the same thing in multiple
  places or storing it as separate reactive state that can drift out of sync.
- Watchers (`watch`/`watchEffect`) have a clear reason to exist instead of being used where
  a `computed` would do, and don't create update loops (a watcher that mutates the thing
  it's watching).
- Auto-save/debounce uses a VueUse composable (`useDebounceFn`, etc.) rather than a
  hand-rolled `setTimeout`, per this project's existing pattern — check debounce timing
  doesn't race a route change/unmount (cancel on unmount if needed).

## State management (Pinia)

- Store is the single source of truth — no client-side persistence (`localStorage`, etc.)
  used as the source of truth, since the backend is authoritative per this project's PRD.
- Store actions handle API errors (not just the happy path) and expose enough state
  (loading/error) for the component to render those states, rather than letting a rejected
  promise go unhandled.
- New state is added to the store that actually owns that domain rather than creating a
  new store for something that's really an extension of an existing one (or vice versa —
  check a store isn't becoming a dumping ground for unrelated state).

## Lifecycle and cleanup

- Anything set up in `onMounted` (event listeners, intervals, subscriptions) is torn down
  in `onUnmounted` — a missing cleanup is a common leak source in SPAs with client-side
  routing, since the component can be unmounted long before the page is closed.
- Async work started in a component checks the component is still mounted (or uses an
  abort signal) before applying the result, so a slow response landing after navigation
  away doesn't throw or mutate stale state.

## Routing

- New routes added in `src/router` follow the existing naming/path convention.
- Route params/query are validated or given sensible fallbacks before being used (a
  missing/malformed param shouldn't crash the view).

## Accessibility and markup

- Interactive elements are actual interactive elements (`button`, `a`) or have the
  appropriate `role`/keyboard handling — not a `div` with only a `@click`.
- Form inputs have associated labels (`<label for>` or `aria-label`).
- Tailwind utility classes used directly; a new custom CSS file/block is justified (the
  project's convention is to avoid custom CSS unless Tailwind genuinely can't express it).

## Tests

- New component/store behavior has a Vitest + Vue Test Utils test covering the acceptance
  criteria, including an error/edge-case path, not only the default render.
- Tests assert on behavior (rendered output, emitted events, store state) rather than
  implementation details (internal method calls, private refs) that would make the test
  brittle to harmless refactors.
