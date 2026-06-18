# Implementation Plan: Cartola League Tracker

**Branch**: `[001-cartola-league-tracker]` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cartola-league-tracker/spec.md`

**Note**: This plan covers the first production-ready version of the public
league tracker and its single-admin operational area.

## Summary

Build a public-facing World Cup league tracker that mirrors Cartola as the
authoritative source for partial and official round data, while applying the
league's own classification and knockout rules. The implementation will use a
single Next.js application with clear separation between public UI, admin
operations, domain rules, persistence, and external synchronization.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS

**Primary Dependencies**: Next.js 16 App Router, React 19, Supabase JS/SSR,
Zod for validation, Vitest for domain tests, Playwright for smoke E2E

**Storage**: Supabase Postgres for competition state, admin settings, cached
sync results, and public read models

**Testing**: Vitest for unit/domain rules, Playwright for critical public/admin
flows, schema validation tests for integration payload mapping

**Target Platform**: Web application running on Vercel Hobby with Supabase

**Project Type**: Full-stack web application

**Performance Goals**: Public pages render the current competition state in
under 2 seconds for normal broadband access; admin sync actions complete with
visible feedback in under 2 minutes

**Constraints**: Free-first hosting, no always-on background worker, single
admin account, public read-only access, authoritative Cartola data must never
be overwritten by manual score editing

**Scale/Scope**: Single competition edition, 48 fixed teams, 12 groups, one
public site, one admin area, low write volume, modest read volume during match
windows

**Source of Truth**: The official World Cup Cartola API at
`https://api.copa.cartola.globo.com/` is authoritative for lineup, score, and
round status; the app is authoritative for league rules, participant mapping,
and official league table presentation after consolidation

**Sync Strategy**: Access-driven internal refresh with configurable interval,
admin-controlled pause/resume, and manual "sync now" fallback; finalization
promotes official round state once Cartola marks the round complete

**Hosting/Operations**: Vercel Hobby for app hosting, Supabase free tier for
database/auth, encrypted environment variables for secrets, and server-side sync
execution only

## Cartola API Mapping

**Confirmed endpoints used by the project**:

- `GET /partidas`
  Purpose: fetch official World Cup fixtures, round number, club metadata, and
  official match states used to mirror the tournament schedule in the league.
- `GET /atletas/mercado`
  Purpose: fetch player catalog, club references, positions, names, photos, and
  athlete metadata used to enrich lineups and the most-picked ranking.
- `GET /atletas/pontuados`
  Purpose: fetch live athlete partial scoring used during in-progress rounds to
  build partial lineup totals and partial public views.
- `GET /time/id/{timeId}`
  Purpose: fetch each participant lineup and team scoring detail; this is the
  primary endpoint for team detail pages and the most-picked aggregation.
- `GET /times?q={query}`
  Purpose: support initial participant-to-time mapping and manual verification
  of `timeId` values for the 48 fixed league members.

**Source restriction rule**:

- All integrations MUST use only `https://api.copa.cartola.globo.com/`.
- The system MUST NOT call `https://api.cartola.globo.com/` or any other
  non-Copa Cartola endpoint in production behavior.
- If the Copa API is unavailable, incomplete, unstable, or operationally down,
  the system MUST NOT try to recover data from another Cartola API.
- In that situation, the system MUST keep the last reliable state already stored
  by the application and allow a later retry through the normal sync flow.

**Endpoints treated as optional or unreliable for the first implementation**:

- `GET /mercado/status`
  Status: endpoint exists, but may return operational errors depending on market
  state. Use only as a secondary signal, never as the sole source of sync state.
- `GET /liga/{slug}`
  Status: public access was not reliable in validation. Do not depend on league
  membership lookup because the 48 participants are fixed and will be persisted
  locally.

**Integration policy derived from endpoint validation**:

- The app MUST persist the 48 participants and their `timeId` mapping locally
  instead of depending on league roster lookup at runtime.
- The app MUST compute the "most picked players" ranking internally by counting
  athlete appearances across the 48 fetched lineups, then enriching the result
  with player metadata from `/atletas/mercado`.
- The app MUST combine `/time/id/{timeId}` and `/atletas/pontuados` to render
  partial lineup detail while a round is live.
- The app MUST treat `/partidas` as the authoritative source for official World
  Cup fixtures and result publication timing used by the league mirror.
- The app MUST NOT introduce fallback reads against any non-Copa Cartola API,
  even when equivalent endpoints exist elsewhere in the Cartola ecosystem.
- Secret values for authenticated requests MUST live only in environment
  variables and server-only integration modules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Official source-of-truth boundaries are documented for live partial data and finalized official data.
- [x] Business rules for standings, tie-breakers, and bracket mapping are isolated from UI concerns.
- [x] Auth, secret handling, and admin-only operations are described with server-side enforcement.
- [x] Free-first hosting assumptions and sync-trigger limitations are explicitly acknowledged.
- [x] Required lightweight automated tests for critical rules and auth-sensitive flows are planned.

## Project Structure

### Documentation (this feature)

```text
specs/001-cartola-league-tracker/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- public-admin-api.openapi.yaml
`-- tasks.md
```

### Source Code (repository root)

```text
app/
|-- (public)/
|   |-- page.tsx
|   |-- grupos/[groupId]/page.tsx
|   |-- confrontos/page.tsx
|   |-- times/[teamId]/page.tsx
|   `-- jogadores-mais-escalados/page.tsx
|-- admin/
|   |-- login/page.tsx
|   |-- dashboard/page.tsx
|   `-- configuracoes/page.tsx
`-- api/
    |-- public/
    |   |-- overview/route.ts
    |   |-- groups/[groupId]/route.ts
    |   |-- matches/route.ts
    |   |-- teams/[teamId]/route.ts
    |   `-- most-picked/route.ts
    `-- admin/
        |-- settings/route.ts
        |-- sync/route.ts
        `-- auth/route.ts

src/
|-- components/
|   |-- public/
|   `-- admin/
|-- domain/
|   |-- standings/
|   |-- knockout/
|   |-- sync/
|   `-- participants/
|-- lib/
|   |-- supabase/
|   |-- cartola/
|   `-- utils/
|-- server/
|   |-- repositories/
|   |-- services/
|   `-- auth/
`-- types/

tests/
|-- unit/
|   |-- standings/
|   |-- knockout/
|   `-- sync/
|-- integration/
|   |-- api/
|   `-- mapping/
`-- e2e/
    |-- public.spec.ts
    `-- admin.spec.ts
```

**Structure Decision**: Use a single Next.js full-stack application to minimize
operational cost while preserving clear boundaries between UI, domain logic,
server services, and integrations. The domain layer owns classification and
knockout logic; route handlers and pages consume those services instead of
duplicating rules.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
