---

description: "Task list for Cartola League Tracker implementation"
---

# Tasks: Cartola League Tracker

**Input**: Design documents from `/specs/001-cartola-league-tracker/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Include lightweight automated tests for domain rules, integration mapping, and critical public/admin flows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Current Status Snapshot *(2026-06-20)*

The repository already contains the first end-to-end implementation for the
public area, admin area, Supabase persistence, Cartola client, and snapshot
services described in the original phases below. The remaining work for the
group stage is now a refinement pass focused on operational sync behavior,
market-state transitions, closed-market partial calculation, and official round
freezing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Full-stack web app paths use `app/`, `src/`, and `tests/` at repository root

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the project structure and tooling required by all stories.

- [ ] T001 Initialize Next.js + TypeScript project files in package.json, tsconfig.json, next.config.ts, and app/layout.tsx
- [ ] T002 Create the base directory structure from the plan in app/, src/, tests/, and supabase/
- [ ] T003 [P] Configure linting and formatting in eslint.config.js, .prettierrc, and package.json
- [ ] T004 [P] Configure Vitest and Playwright in vitest.config.ts, playwright.config.ts, and tests/setup/
- [ ] T005 [P] Create environment variable templates and secret documentation in .env.example and README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared data, auth, integration, and domain foundations required before any user story can be implemented.

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create Supabase schema and migrations for participants, groups, rounds, matches, standings, lineups, most-picked, sync settings, sync executions, and admin accounts in supabase/migrations/
- [ ] T007 [P] Seed the 48 fixed participants, group assignments, and official bracket slots in supabase/seed.sql
- [ ] T008 [P] Implement server-only Supabase clients and repository base helpers in src/lib/supabase/server.ts, src/lib/supabase/admin.ts, and src/server/repositories/
- [ ] T009 [P] Implement Cartola API client with server-only request wrappers for /partidas, /atletas/mercado, /atletas/pontuados, /time/id/{timeId}, and /times in src/lib/cartola/client.ts
- [ ] T010 [P] Implement payload validation and normalization schemas for Cartola responses in src/lib/cartola/schemas.ts and src/lib/cartola/mappers.ts
- [ ] T011 [P] Implement admin authentication, session guards, and auth utilities in src/server/auth/session.ts, src/server/auth/guards.ts, and app/api/admin/auth/route.ts
- [ ] T012 [P] Implement sync configuration and sync execution repositories in src/server/repositories/sync-config.repository.ts and src/server/repositories/sync-execution.repository.ts
- [ ] T013 [P] Implement standings domain rules for group points, draw threshold, tie-breakers, and best-third ranking in src/domain/standings/calculate-group-standings.ts and src/domain/standings/rank-best-thirds.ts
- [ ] T014 [P] Implement knockout seeding and bracket fill rules in src/domain/knockout/fill-bracket.ts and src/domain/knockout/bracket-matrix.ts
- [ ] T015 [P] Implement lineup aggregation and most-picked ranking helpers in src/domain/sync/aggregate-lineups.ts and src/domain/sync/build-most-picked.ts
- [ ] T016 Implement the core sync orchestration service, including access-driven due checks and officialization flow, in src/server/services/sync.service.ts
- [ ] T017 Implement shared public read-model services for overview, groups, matches, team detail, and most-picked in src/server/services/public-overview.service.ts, src/server/services/group-view.service.ts, src/server/services/matches-view.service.ts, src/server/services/team-detail.service.ts, and src/server/services/most-picked.service.ts
- [ ] T018 Configure API route scaffolding and shared error handling in app/api/public/, app/api/admin/, and src/lib/utils/http.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Acompanhar a competição publicamente (Priority: P1)

**Goal**: Deliver a public area that shows phase, groups, standings, fixtures, knockout progression, and most-picked players as the official league tracker.

**Independent Test**: Open the public site, navigate between groups and matches, and confirm that standings, phase state, and most-picked data render correctly without login.

### Tests for User Story 1

- [ ] T019 [P] [US1] Add contract coverage for public overview, group, matches, team detail, and most-picked endpoints in tests/integration/api/public-routes.test.ts
- [ ] T020 [P] [US1] Add domain tests for group draw threshold, tie-breakers, and best-third ranking in tests/unit/standings/group-standings.test.ts and tests/unit/standings/best-thirds.test.ts
- [ ] T021 [P] [US1] Add E2E public navigation smoke test in tests/e2e/public.spec.ts

### Implementation for User Story 1

- [ ] T022 [P] [US1] Implement public read endpoints in app/api/public/overview/route.ts, app/api/public/groups/[groupId]/route.ts, app/api/public/matches/route.ts, app/api/public/teams/[teamId]/route.ts, and app/api/public/most-picked/route.ts
- [ ] T023 [P] [US1] Build public layout and shared presentation components in src/components/public/PhaseHero.tsx, src/components/public/GroupSelector.tsx, src/components/public/StandingsTable.tsx, src/components/public/MatchCards.tsx, and src/components/public/MostPickedList.tsx
- [ ] T024 [US1] Implement the public homepage with phase, overview, and group navigation in app/(public)/page.tsx
- [ ] T025 [US1] Implement group detail and match result pages in app/(public)/grupos/[groupId]/page.tsx and app/(public)/confrontos/page.tsx
- [ ] T026 [US1] Implement most-picked players page in app/(public)/jogadores-mais-escalados/page.tsx
- [ ] T027 [US1] Add public state labels and empty/error handling for partial, official, and unavailable data in src/components/public/StateBadge.tsx and src/components/public/EmptyState.tsx

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Sincronizar e controlar a competição como administrador (Priority: P2)

**Goal**: Deliver secure admin access with sync controls, operational status, and manual fallback for league updates.

**Independent Test**: Log into the admin area, pause/resume sync, change interval, and trigger a manual sync while confirming the operational state updates correctly.

### Tests for User Story 2

- [ ] T028 [P] [US2] Add contract and integration coverage for admin auth, settings, and sync endpoints in tests/integration/api/admin-routes.test.ts
- [ ] T029 [P] [US2] Add sync state transition tests in tests/unit/sync/sync-service.test.ts
- [ ] T030 [P] [US2] Add admin login and sync control E2E smoke test in tests/e2e/admin.spec.ts

### Implementation for User Story 2

- [ ] T031 [P] [US2] Implement admin settings and sync route handlers in app/api/admin/settings/route.ts and app/api/admin/sync/route.ts
- [ ] T032 [P] [US2] Build admin UI components in src/components/admin/LoginForm.tsx, src/components/admin/SyncStatusCard.tsx, and src/components/admin/SyncControlsForm.tsx
- [ ] T033 [US2] Implement admin login page and protected dashboard in app/admin/login/page.tsx and app/admin/dashboard/page.tsx
- [ ] T034 [US2] Implement sync settings page with interval, enable/pause, and execution history summary in app/admin/configuracoes/page.tsx
- [ ] T035 [US2] Integrate manual sync and access-driven sync checks into server actions or route-facing service calls in src/server/services/sync-trigger.service.ts

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - Consultar detalhes de um time ou seleção (Priority: P3)

**Goal**: Let visitors open a participant detail view that mirrors the Cartola lineup and score context for the selected team.

**Independent Test**: From a group table or match card, open a participant detail page and verify that the lineup, players, and score state match the latest synced data.

### Tests for User Story 3

- [ ] T036 [P] [US3] Add lineup mapping and most-picked aggregation tests in tests/integration/mapping/cartola-lineup-mapper.test.ts and tests/unit/sync/most-picked.test.ts
- [ ] T037 [P] [US3] Extend the public E2E smoke test with team detail navigation in tests/e2e/public.spec.ts

### Implementation for User Story 3

- [ ] T038 [P] [US3] Implement persisted lineup repositories in src/server/repositories/lineup.repository.ts and src/server/repositories/most-picked.repository.ts
- [ ] T039 [P] [US3] Implement lineup detail components in src/components/public/TeamHeader.tsx, src/components/public/LineupList.tsx, and src/components/public/LineupPlayerRow.tsx
- [ ] T040 [US3] Implement participant detail page in
  app/(public)/times/[teamId]/page.tsx with mobile-first field and list modes,
  fixed position ordering, and support for the documented formation variants
- [ ] T041 [US3] Wire lineup sync persistence and team detail read-model generation in src/server/services/team-detail.service.ts and src/server/services/sync.service.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation, validation, and cross-story hardening.

- [ ] T042 [P] Update deployment and environment documentation in README.md
- [ ] T043 Harden secret handling, auth redirects, and cache boundaries in src/server/auth/, src/lib/cartola/, and app/api/
- [ ] T044 [P] Validate quickstart scenarios and update specs/001-cartola-league-tracker/quickstart.md if implementation details differ
- [ ] T045 Run full lint, unit, integration, and E2E validation and fix any remaining issues across package.json scripts and tests/

---

## Phase 7: Group-Stage Sync Refinement

**Purpose**: Align the implemented tracker with the confirmed operational rules
for `mercado/status`, round transitions, partial score calculation, and
most-picked updates.

### Tests for Refinement

- [ ] T046 [P] Add sync transition tests for `status_mercado = 1`, `2`, and `4`
  in tests/unit/sync/sync-service.test.ts
- [ ] T047 [P] Add unit coverage for closed-market partial calculation,
  absent-player detection after club matches, positive-only reserve
  substitution, reserve-luxury substitution against the lowest scored starter
  of the same position, and `1.5x` captain multiplier in tests/unit/sync/

### Implementation for Refinement

- [ ] T048 Implement a shared market-state resolver based on
  `GET /mercado/status` in src/domain/sync/ or src/lib/cartola/
- [ ] T049 Refactor sync orchestration in
  src/server/services/sync.service.ts so only the current operational round is
  recalculated repeatedly and previous official rounds are frozen
- [ ] T050 Implement closed-market partial score calculation from
  `/time/id/{timeId}` plus `/atletas/pontuados`, including club-match-aware
  absence detection, positive-only reserve replacement by position,
  positive-only reserve-luxury replacement against the lowest scored starter of
  the same position, and `1.5x` captain scoring in
  src/domain/sync/ and src/server/services/sync.service.ts
- [ ] T051 Update public snapshot generation and team detail state handling in
  src/server/services/live-public-data.service.ts,
  src/server/services/persisted-public-snapshot.service.ts, and
  src/server/services/team-detail.service.ts to use the same operational rules
- [ ] T051a Update the team-detail presentation layer so field and list modes
  share the same data, preserve mobile-first behavior, and keep the ordered
  sequence goalkeeper -> full-backs -> center-backs -> midfielders -> forwards
  -> coach in the list mode
- [ ] T052 Update the most-picked aggregation to recompute from the operational
  round lineups when the round is actively processed in
  src/server/services/sync.service.ts,
  src/server/services/live-public-data.service.ts, and
  src/domain/sync/build-most-picked.ts
- [ ] T053 Add persistence or metadata adjustments needed to distinguish partial
  current-round snapshots from frozen official snapshots in supabase/migrations/
  and src/server/repositories/
- [ ] T054 Update quickstart and admin/public operational documentation after
  the refinement in specs/001-cartola-league-tracker/quickstart.md and README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and can reuse public read models from US1
- **User Story 3 (Phase 5)**: Depends on Foundational completion and benefits from sync persistence built for US2
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - MVP public tracker
- **User Story 2 (P2)**: Can start after Foundational - operational admin controls
- **User Story 3 (P3)**: Can start after Foundational, but is easiest after the sync and public scaffolding from US1 and US2

### Within Each User Story

- Tests should be written before or alongside implementation of the protected behavior
- Domain and repository work should precede page wiring
- Route handlers should be in place before end-to-end validation
- Each story should be complete before moving to the next priority for release decisions

### Parallel Opportunities

- T003, T004, and T005 can run in parallel during setup
- T007 through T015 can run largely in parallel once the base project exists
- T019, T020, and T021 can run in parallel for US1
- T022 and T023 can run in parallel for US1
- T028, T029, and T030 can run in parallel for US2
- T036 and T037 can run in parallel for US3

---

## Parallel Example: User Story 1

```bash
# Launch User Story 1 validation work together:
Task: "T019 [US1] Add contract coverage for public endpoints in tests/integration/api/public-routes.test.ts"
Task: "T020 [US1] Add domain tests for standings rules in tests/unit/standings/"
Task: "T021 [US1] Add public E2E smoke test in tests/e2e/public.spec.ts"

# Launch User Story 1 implementation work together:
Task: "T022 [US1] Implement public read endpoints in app/api/public/"
Task: "T023 [US1] Build public presentation components in src/components/public/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the public tracker before adding admin operations

### Incremental Delivery

1. Setup + Foundational -> application skeleton, schema, sync core, and rules
2. Add User Story 1 -> public official tracker MVP
3. Add User Story 2 -> secure admin operations and sync controls
4. Add User Story 3 -> detailed lineup and most-picked experience
5. Finish polish -> documentation, hardening, and full validation

### Parallel Team Strategy

With multiple developers:

1. One person owns setup/tooling
2. One person owns Supabase schema and repositories
3. One person owns domain rules and sync orchestration
4. After Foundational, split into public UI, admin UI, and lineup detail workstreams

---

## Notes

- [P] tasks are safe to parallelize because they target different files or isolated modules
- Every task includes a file path so it is directly executable
- The MVP scope is User Story 1 after setup and foundational work
- The participant roster remains locally persisted; runtime league membership lookup is not part of this implementation
