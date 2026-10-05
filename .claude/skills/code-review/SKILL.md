---
name: code-review
description: Use when reviewing code changes in this project (a diff, PR, branch, or set of files) - covers correctness, security, and best-practice checks for the Java/Spring Boot backend and the Vue 3 frontend. Trigger this whenever the user asks to review, critique, or sanity-check backend or frontend code, not just when they say "code review".
---

# Code Review

Review code in this project against both general correctness/security concerns and the
framework-specific conventions this codebase follows (see [[java-backend]] and
[[vue3-frontend]] skills for the stack itself). This skill is the checklist to apply
*on top of* those conventions when reviewing changes rather than writing them.

## Process

1. **Scope the review.** Identify what changed — a diff, a PR, a branch, or specific files.
   Use `git diff`/`git log` to see the actual change, not just the final state of a file;
   a line that looks fine in isolation may be a regression in context.
2. **Identify the layer(s) touched.** Backend (`backend/src/...`), frontend
   (`frontend/src/...`), or both. Apply the matching checklist below.
3. **Check correctness first.** Before style/best-practice nits, verify the change actually
   does what it claims: edge cases, null/undefined handling, off-by-one errors, error paths,
   concurrency/race conditions, and whether tests actually exercise the acceptance criteria
   (not just happy-path).
4. **Apply the relevant checklist(s).**
   - Backend changes → read `references/backend-java.md`.
   - Frontend changes → read `references/frontend-vue.md`.
   - Cross-cutting items below apply regardless of layer.
5. **Report findings ranked by severity** (bugs/security first, then best-practice
   deviations, then nitpicks), each with a concrete reason and, where useful, a suggested
   fix. Don't invent issues to pad the list — an empty category is a fine outcome.

## Cross-cutting checks (any layer)

- **Security**: no secrets/credentials committed, no injection vectors (SQL, command, XSS),
  input validated at trust boundaries, auth/authorization checks not bypassed or weakened.
- **Tests**: new behavior has a test covering the acceptance criteria, not just a smoke test;
  existing tests weren't weakened (loosened assertions, removed cases) to make them pass.
- **Scope discipline**: the diff matches the stated intent — no unrelated refactors,
  formatting-only churn, or speculative abstractions bundled into the same change.
- **Consistency with PRD.md**: for user-story work, check the change against the acceptance
  criteria in `PRD.md` at the repo root, not just against general best practice.
- **Naming and readability**: names describe what the thing is/does; no comments explaining
  *what* code does when the code itself already makes that clear.

## When to read the reference files

Read `references/backend-java.md` before reviewing any `.java` change, and
`references/frontend-vue.md` before reviewing any `.vue`/`.ts` change in `frontend/src`.
Each file is a checklist, organized so you can scan for the categories relevant to the
specific files in the diff rather than reading linearly.
