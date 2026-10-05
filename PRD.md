# PRD: Daily Notes & Tasks App (MVP)

## Overview
A lightweight, single-user web app for daily note-taking where tasks live as checkboxes inside notes (bullet-journal style). Vue 3 frontend backed by a Java (Spring Boot) REST API with a persistent database — no browser-only storage.

## Scope Decisions
- **User:** Single user, no auth for MVP.
- **Notes/Tasks relationship:** Tasks are checkbox items embedded directly in daily notes, not a separate entity.
- **Architecture:** Vue 3 SPA frontend + Spring Boot REST API backend + relational database (e.g. Postgres/H2). Frontend calls the backend for all reads/writes; no client-side data storage beyond in-memory app state.
- **Tech stack:** Vue 3, Vite, Pinia, Vue Router, TypeScript (FE); Spring Boot 3, Spring Data JPA, Flyway (BE).

## Out of Scope (MVP)
- Accounts, login, multi-user support
- Sharing/collaboration
- Reminders/notifications
- Tags, folders, attachments, rich formatting beyond checkboxes
- Export/import
- Offline support

---

## User Stories

### 1. Daily Note Creation
**As a** user, **I want** a note automatically available for today **so that** I can start writing without setup.
- **Acceptance Criteria:**
  - Opening the app for the first time on a given day creates (or opens) a note dated to that day.
  - If a note for today already exists, it opens with prior content intact.
  - The current date is clearly displayed on the note.

### 2. Navigate Between Days
**As a** user, **I want** to move between daily notes **so that** I can review past entries or plan ahead.
- **Acceptance Criteria:**
  - Prev/next controls move one day at a time.
  - A date picker/calendar lets me jump directly to any date.
  - Navigating to a day with no existing note shows an empty, editable note for that date (not created in storage until content is added).

### 3. Write and Edit Note Content
**As a** user, **I want** to write free-form text in a note **so that** I can capture thoughts, context, or plans alongside my tasks.
- **Acceptance Criteria:**
  - A text area supports plain text entry with line breaks.
  - Edits are saved automatically (debounced auto-save calling the backend API, no explicit "save" button required).
  - Content persists after page refresh, browser restart, or reopening from a different browser, since it's stored server-side.

### 4. Add and Toggle Tasks Within a Note
**As a** user, **I want** to write checkbox-style tasks inline with my notes **so that** I can track to-dos in the same place I journal.
- **Acceptance Criteria:**
  - Typing a recognized checkbox syntax (e.g. `- [ ] task text`) renders it as an interactive checkbox with label.
  - Clicking a checkbox toggles it between complete (`- [x]`) and incomplete (`- [ ]`), and the underlying content updates accordingly.
  - Multiple tasks can exist within a single day's note, interleaved with plain text.

### 5. Roll Over Incomplete Tasks
**As a** user, **I want** to carry unfinished tasks from a previous day into today **so that** I don't lose track of them.
- **Acceptance Criteria:**
  - From today's note, a "Bring forward" action lists incomplete tasks from the most recent prior day(s) with tasks.
  - Selecting a task copies it into today's note as an incomplete checkbox item.
  - The original task in the past note is left unchanged (not moved/deleted), so history stays accurate.

### 6. View All Open Tasks
**As a** user, **I want** a consolidated list of all incomplete tasks across every day **so that** I can see everything outstanding without paging through notes.
- **Acceptance Criteria:**
  - A dedicated "Tasks" view lists every unchecked checkbox item across all notes.
  - Each item shows its source date and links back to that day's note.
  - Checking off a task from this view updates the original note's checkbox state.

### 7. Search Notes
**As a** user, **I want** to search across all my notes **so that** I can quickly find past entries or tasks by keyword.
- **Acceptance Criteria:**
  - A search box filters/returns notes containing the query string (case-insensitive substring match).
  - Results show the matching date and a snippet of surrounding text.
  - Selecting a result opens that day's note.

### 8. Data Persistence Across Sessions
**As a** user, **I want** my notes and tasks to still be there when I reopen the app **so that** I don't lose my work.
- **Acceptance Criteria:**
  - All notes and tasks are stored in the backend database via the REST API.
  - Closing and reopening the browser/tab, or loading the app on a different browser, restores all previously entered notes and task states.
  - The frontend has no source of truth of its own — it always reflects what the backend returns.

---

## Future Considerations (Not MVP)
- Accounts / multi-user support
- Export/import (Markdown, JSON)
- Tags/folders for organization
- Reminders and notifications
- Rich text formatting (bold, links, images)
- Offline support (e.g. local caching with sync-on-reconnect)
