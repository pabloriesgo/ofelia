# Technical Specification: Daily Notes & Tasks App (MVP)

Reference: `PRD.md`. This document defines architecture, data models, folder structure, and API contract for AI coding agents implementing the MVP. Structural only — no functional code.

---

## 1. High-Level Architecture

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────────┐        JDBC        ┌─────────────┐
│   Vue 3 SPA (FE)     │ ───────────────────────▶ │  Spring Boot REST API    │ ──────────────────▶ │  Postgres   │
│  Vite/Pinia/Router   │ ◀─────────────────────── │  (BE)                    │ ◀────────────────── │  (H2 local) │
└─────────────────────┘                           └──────────────────────────┘                     └─────────────┘
```

- **Frontend (Vue 3 SPA):** Renders daily note view, task list, search. Holds no persistent state of its own — Pinia stores are an in-memory cache of what the backend last returned. All reads/writes go through `src/api/` clients to the backend.
- **Backend (Spring Boot):** Stateless REST API. Layers: `controller` → `service` → `repository` → `entity`. Owns all business logic — task parsing/rendering, roll-over selection, search — so the frontend never derives task state independently of what the API returns.
- **Database:** Relational (Postgres in real environments, H2 for local/test). Schema managed via Flyway migrations, one file per change.
- **Single user, no auth:** No session/user context is passed or stored; all data belongs to the one implicit user.
- **Task representation:** Tasks are NOT a separate top-level entity in the domain model — they are lines of checkbox syntax (`- [ ] ...` / `- [x] ...`) inside `Note.content`. The backend parses note content on read to extract task rows (for the Tasks view and search) and mutates note content directly when a task is toggled or rolled over. This keeps a single source of truth (the note text) and avoids content/task-list drift.

### Request flow examples
- **Open today's note:** FE requests `GET /api/notes/{date}` for today → BE returns existing note or an empty (unsaved) note shape → FE renders.
- **Auto-save:** FE debounces content edits (e.g. 500ms–1s idle) → `PUT /api/notes/{date}` upserts the note.
- **Toggle a task:** FE sends the task's stable line reference → BE locates the checkbox line in `content`, flips `[ ]`/`[x]`, persists, returns updated note/task.
- **Tasks view:** FE calls `GET /api/tasks?status=open` → BE parses all notes' content (or reads from a denormalized task index, see §2) and returns open tasks with source date.

---

## 2. Data Models

### 2.1 `Note` (entity)

The sole persisted content entity. One row per calendar day that has ever received content.

| Field | Type | Notes |
|---|---|---|
| `id` | `Long` / UUID | Primary key |
| `date` | `LocalDate` | Unique, not null. One note per date. |
| `content` | `TEXT` | Raw free-form text, including inline checkbox syntax lines. Not null (empty string allowed). |
| `createdAt` | `Instant` | Set on first persist. |
| `updatedAt` | `Instant` | Updated on every save. |

**Constraints:** unique index on `date`. A date with no row simply has no note yet (frontend/backend treat it as an empty, not-yet-created note per PRD story 2).

### 2.2 `Task` (derived / read model — not independently editable)

Tasks are not stored as their own writable table row set that could drift from `content`; they are computed from `Note.content` by parsing checkbox lines. Represented as a DTO only:

| Field | Type | Notes |
|---|---|---|
| `noteDate` | `LocalDate` | Source note's date. |
| `lineIndex` | `int` | Line number within `content`, used as the stable reference for toggle/roll-over operations. |
| `text` | `String` | Task label (content after `- [ ]`/`- [x]`). |
| `done` | `boolean` | Parsed from `[x]` vs `[ ]`. |

**Design rationale:** Keeping tasks as a derived view (rather than a separate persisted entity with its own lifecycle) satisfies the PRD's explicit framing ("tasks live as checkboxes inside notes... not a separate entity") and guarantees the Tasks view and Search can never disagree with what's rendered in the note itself.

> **Implementation note for the backend agent:** if parsing full note content on every `/api/tasks` request becomes a performance concern, an optional internal denormalized index table (e.g. `task_index(note_id, line_index, text, done)`) may be introduced as a read-optimization, rebuilt on every note save — but it must remain an internal cache, never a second source of truth exposed for independent writes.

### 2.3 No other entities in MVP
No `User`, `Tag`, `Folder`, or `Attachment` entities — out of scope per PRD.

---

## 3. Target Folder Structure

### 3.1 Backend (`/backend`)

```
backend/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/com/ofelia/
│   │   │   ├── OfeliaApplication.java
│   │   │   ├── controller/
│   │   │   │   ├── NoteController.java        # /api/notes/**
│   │   │   │   ├── TaskController.java        # /api/tasks/**
│   │   │   │   └── SearchController.java      # /api/search
│   │   │   ├── service/
│   │   │   │   ├── NoteService.java
│   │   │   │   ├── TaskService.java           # checkbox parsing, toggle, roll-over
│   │   │   │   └── SearchService.java
│   │   │   ├── repository/
│   │   │   │   └── NoteRepository.java
│   │   │   ├── entity/
│   │   │   │   └── Note.java
│   │   │   ├── dto/
│   │   │   │   ├── NoteDto.java
│   │   │   │   ├── NoteUpsertRequest.java
│   │   │   │   ├── TaskDto.java
│   │   │   │   ├── TaskToggleRequest.java
│   │   │   │   ├── RollForwardRequest.java
│   │   │   │   └── SearchResultDto.java
│   │   │   └── config/
│   │   │       └── OpenApiConfig.java
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-local.yml
│   │       └── db/migration/
│   │           └── V1__create_notes_table.sql
│   └── test/
│       └── java/com/ofelia/
│           ├── controller/
│           ├── service/
│           └── repository/
```

### 3.2 Frontend (`/frontend`)

```
frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts                # routes: /, /day/:date, /tasks, /search
│   ├── views/
│   │   ├── DailyNoteView.vue       # stories 1-5
│   │   ├── TasksView.vue           # story 6
│   │   └── SearchView.vue          # story 7
│   ├── components/
│   │   ├── NoteEditor.vue          # free-text + checkbox rendering
│   │   ├── DateNavigator.vue       # prev/next + date picker
│   │   ├── TaskCheckbox.vue        # inline rendered checkbox line
│   │   ├── RollForwardPanel.vue    # "bring forward" list
│   │   ├── TaskList.vue            # used by TasksView
│   │   └── SearchBox.vue
│   ├── stores/
│   │   ├── notesStore.ts           # useNotesStore: current note + cache
│   │   └── tasksStore.ts           # useTasksStore: open tasks list
│   ├── api/
│   │   ├── client.ts               # base fetch/axios instance
│   │   ├── notes.ts                # getNote, upsertNote
│   │   ├── tasks.ts                # getOpenTasks, toggleTask, rollForward
│   │   └── search.ts               # searchNotes
│   ├── types/
│   │   └── index.ts                # Note, Task, SearchResult TS interfaces
│   └── assets/
└── tests/
    ├── components/
    ├── stores/
    └── api/
```

---

## 4. Core API Endpoints

Base path: `/api`. All request/response bodies are JSON. Dates use ISO-8601 (`YYYY-MM-DD`).

### 4.1 Notes

| Method | Path | Purpose | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/notes/{date}` | Fetch note for a date. If none exists, return an empty/unsaved note shape (not persisted). | — | `NoteDto` |
| `PUT` | `/api/notes/{date}` | Upsert note content (auto-save). Creates the note row on first non-empty save. | `{ content: string }` | `NoteDto` |
| `GET` | `/api/notes?from={date}&to={date}` | List notes with content in a date range (used for prev/next existence checks, calendar hints). | — | `NoteDto[]` |

### 4.2 Tasks

| Method | Path | Purpose | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/tasks?status=open` | All open (unchecked) tasks across all notes, with source date. | — | `TaskDto[]` |
| `PATCH` | `/api/notes/{date}/tasks/{lineIndex}` | Toggle a task's done state within that note's content. | `{ done: boolean }` | `NoteDto` (updated) |
| `GET` | `/api/notes/{date}/rollover-candidates` | Incomplete tasks from the most recent prior day(s) with tasks, for the "Bring forward" action on date `{date}`. | — | `TaskDto[]` |
| `POST` | `/api/notes/{date}/rollover` | Copy selected task(s) into date `{date}` as new incomplete checkbox lines. Source task(s) left unchanged. | `{ sourceTasks: [{ noteDate, lineIndex }] }` | `NoteDto` (updated) |

### 4.3 Search

| Method | Path | Purpose | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/search?q={query}` | Case-insensitive substring search across all notes' content. | — | `SearchResultDto[]` (`{ date, snippet }`) |

### 4.4 Response shape notes
- `NoteDto`: `{ date, content, createdAt, updatedAt }` (`createdAt`/`updatedAt` `null` for an unsaved/empty note).
- `TaskDto`: `{ noteDate, lineIndex, text, done }`.
- `SearchResultDto`: `{ date, snippet }` — snippet includes surrounding context around the match.
- Standard error format for all endpoints: `{ status, error, message, path }` (Spring's default `ProblemDetail` or equivalent is acceptable).

---

## 5. Cross-Cutting Notes for Implementers
- Every write path funnels through `NoteService` mutating `Note.content` — toggle and roll-over are content edits, not separate persisted rows, per §2.2.
- `lineIndex` as a task reference is only stable within a single request/response cycle; the frontend must re-fetch the note (or use the returned updated `NoteDto`) after any mutation rather than caching indices long-term.
- No auth middleware, no user-scoping on any query — single implicit user per PRD scope.
