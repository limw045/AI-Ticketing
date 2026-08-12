# Ticketing Verified Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct every issue reproduced twice on the deployed ticketing system without broad unrelated changes or full-suite testing.

**Architecture:** Deliver five isolated batches. Active-record filtering and RLS provide authoritative data boundaries; portal mode shapes user capabilities; small pure helpers own validation and display formatting so targeted tests can prove behavior.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Supabase/Postgres RLS, Vitest, Playwright for focused deployed verification.

## Global Constraints

- Run only batch-specific test files; do not run the full test suite or whole-site E2E.
- Deploy and repeat only the affected browser scenarios twice after each batch.
- Preserve external API request compatibility and existing soft-deleted records.
- Do not stage or commit the generated `next-env.d.ts` change.

---

### Task 1: Active ticket consistency

- [ ] Add targeted contracts for active-only dashboards, queues, exports, details, and deleted-detail role feedback.
- [ ] Apply `deleted_at IS NULL` to every normal ticket query and keep deleted reads inside Recycle Bin.
- [ ] Remove count-up animation from operational metrics and represent an empty resolution sample as `—` with a hint.
- [ ] Run only the soft-delete and dashboard-metric tests, then commit.

### Task 2: Department-scoped access

- [ ] Add a controlled departments schema, profile/ticket department IDs, legacy mappings, audit behavior, and System Integrations fallback.
- [ ] Add RLS for author continuity, department read-only access, internal-note isolation, Admin console access, and deleted records.
- [ ] Add People/Departments tabs and strict User portal behavior with My requests as the default and Department requests as an explicit switch.
- [ ] Bind attachment metadata to tickets and authorize reads through active-ticket visibility.
- [ ] Run only department, portal permission, migration, and attachment access tests, then commit.

### Task 3: Validated ticket intake

- [ ] Require explicit category selection and validate that the category template contains substantive user input.
- [ ] Add inline field errors with first-error focus and P0 confirmation plus impact requirements.
- [ ] Preserve drafts on failure, confirm Clear, and atomically create tickets with attachment bindings.
- [ ] Run only category, template, P0, draft, and submission transaction tests, then commit.

### Task 4: Public and authentication navigation

- [ ] Correct homepage links, expose sign-in on mobile, retain one Create account CTA, and label Internal Knowledge as authenticated.
- [ ] Preserve a safe relative `next` destination for employees and after administrator portal choice.
- [ ] Add contextual login copy for protected Knowledge destinations.
- [ ] Run only homepage, login destination, and Knowledge context tests, then commit.

### Task 5: Display and empty-state consistency

- [ ] Add shared formatters for account type, role, status, and priority without changing wire values.
- [ ] Apply them to staff/ticket UI and exports and distinguish loading, initial empty, filtered empty, and error states.
- [ ] Run only display-label and empty-state contract tests, then commit.

### Task 6: Completion audit

- [ ] Inspect every approved requirement against current source and targeted test evidence.
- [ ] Repeat each affected deployed scenario twice, without creating tickets or changing production records.
- [ ] Confirm unrelated working-tree files remain unstaged and report the commits and evidence.
