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

## Implementation Status Snapshot

The repository already contains the first production implementation for the
public site, admin area, Cartola client, Supabase persistence, and snapshot
services for rounds, matches, standings, lineups, and most-picked data. The
current planning focus is a sync refinement pass for the completed group-stage
tracker so that round officialization, partial score calculation, and
most-picked aggregation follow the confirmed `status_mercado` rules.

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
admin-controlled pause/resume, and manual "sync now" fallback; only the current
round is recalculated while active, officialization happens when
`rodada_atual` advances and `status_mercado = 1`, and states outside `1` and
`2` preserve the last reliable snapshot without forced recalculation

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

**Operational endpoint semantics confirmed for this implementation**:

- `GET /mercado/status`
  Confirmed semantics for project behavior:
  `status_mercado = 1` means market open,
  `status_mercado = 2` means market closed,
  `status_mercado = 4` means maintenance.
  `rodada_atual` is the active operational round boundary.
- `GET /liga/{slug}`
  Status: public access was not reliable in validation. Do not depend on league
  membership lookup because the 48 participants are fixed and will be persisted
  locally.

**Integration policy derived from endpoint validation**:

- The app MUST persist the 48 participants and their `timeId` mapping locally
  instead of depending on league roster lookup at runtime.
- The app MUST compute the "most picked players" ranking internally by counting
  athlete appearances across the 48 fetched lineups for the current operational
  round, then enriching the result with player metadata from `/atletas/mercado`.
- The app MUST combine `/time/id/{timeId}` and `/atletas/pontuados` to compute
  partial round scores while `status_mercado = 2`, treating missing athletes as
  absent only after their club match has already happened, allowing common
  reserve substitutions only for the same position with strictly positive
  reserve points, allowing reserve-luxury substitution only for the same
  position with strictly positive reserve-luxury points against the lowest
  scored starter of that position, and applying the `1.5x` captain multiplier.
- The app MUST use `GET /time/id/{timeId}/{rodada}` as the authoritative score
  source for the previous round once `rodada_atual` advances and
  `status_mercado = 1`.
- The app MUST treat `/partidas` as the authoritative source for official World
  Cup fixtures and result publication timing used by the league mirror.
- The app MUST NOT introduce fallback reads against any non-Copa Cartola API,
  even when equivalent endpoints exist elsewhere in the Cartola ecosystem.
- Secret values for authenticated requests MUST live only in environment
  variables and server-only integration modules.

## Sync Refinement Addendum

The next implementation pass must apply these operational rules across sync,
public read models, and team detail:

1. Only the current operational round is recalculated repeatedly.
2. Partial scores are computed only while `status_mercado = 2`.
3. Partial lineup totals are derived from starters, athlete scores from
   `/atletas/pontuados`, absent-player detection after club matches have
   happened, valid reserve replacements only with strictly positive reserve
   points, reserve-luxury replacement against the lowest scored starter of the
   same position only with strictly positive reserve-luxury points, and `1.5x`
   captain score.
4. When `rodada_atual` changes and `status_mercado = 1`, the previous round is
   consolidated as official and should stop receiving partial updates.
5. When `status_mercado` is neither `1` nor `2`, the system records the
   operational state but does not force score recalculation.
6. The "most picked" ranking for a round is recomputed from the operational
   round lineups when the round is being actively processed.
7. Public pages and team detail should prefer persisted snapshots from the
   database after each sync, using live reconstruction only as a fallback when
   no persisted snapshot is available yet.

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

## Team Detail UI Addendum

The next refinement of the team-detail experience must follow these interface
rules:

1. The component-level layout is centered on three blocks only: `Minha
   Escalacao`, `Lista do time principal`, and `Reservas`.
2. The team-detail component must not depend on the global application header as
   its visual reference.
3. The field layout must support all documented formation variants, keeping
   player spacing readable and ready for real lineup redistribution.
4. The ordered list view must always render the starting lineup by position in
   this sequence: goalkeeper, full-backs when present, center-backs,
   midfielders, forwards, and coach.
5. The experience must be mobile first, with the narrow-screen layout treated as
   the primary target and desktop as an enhancement.
6. The interface must allow toggling between field view and list view without
   changing the underlying lineup information.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
