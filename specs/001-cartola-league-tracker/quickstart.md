# Quickstart: Cartola League Tracker

## Goal

Validate that the public competition tracker, the single-admin area, and the
sync flow behave correctly for one live round and one officialized round.

## Prerequisites

- Application environment variables configured for database, auth, and Cartola
  integration token
- One seeded admin account
- Participant mapping loaded for all 48 teams
- Seeded bracket matrix for the official World Cup format

## Validation Scenarios

### 1. Public overview and group navigation

1. Start the application locally.
2. Open the public homepage.
3. Confirm the current phase, progress indicator, and current public state are
   displayed.
4. Select groups `A`, `B`, and `L`.
5. Confirm each group shows standings, matches, and participant identities.

**Expected outcome**: The public area is accessible without login and surfaces
the official state currently stored for the competition.

### 2. Partial round tracking

1. Seed or import a round marked as live.
2. Visit the public matches view.
3. Confirm match cards show partial scores and partial state markers.
4. Open the detail page for one participant in a live match.

**Expected outcome**: Partial points, simulated standings, and lineup details
are visible, and the UI does not label them as final official results.
Additionally, starters absent from `/atletas/pontuados` after their club match
has already happened are treated as non-participants for the round, common
reserves only enter with strictly positive points, and reserve luxury only
enters with strictly positive points against the lowest scored starter of the
same position.
The team-detail screen must also work first on mobile, allow switching between
field and list views, and keep the list ordered as goalkeeper, full-backs when
present, center-backs, midfielders, forwards, and coach.

### 3. Admin authentication and sync controls

1. Open the admin login page.
2. Authenticate with the seeded admin account.
3. Open the admin dashboard.
4. Review last sync status, current interval, and enabled or paused state.
5. Change the interval and toggle pause/resume.

**Expected outcome**: Only the authenticated admin can access controls, and the
system persists the operational settings change successfully.

### 4. Manual synchronization

1. From the admin dashboard, trigger a manual sync.
2. Wait for the result message.
3. Refresh the public overview and one group page.

**Expected outcome**: The latest synchronized data becomes visible, and the
admin sees an updated last-sync timestamp and result summary.

### 5. Official round consolidation

1. Seed or import a round that changes from live to official.
2. Run the sync flow again.
3. Revisit public overview, group table, match list, and one team detail page.

**Expected outcome**: Partial state is replaced by official state, standings are
recomputed from the official team-by-round payloads, and knockout qualification
state updates consistently.

## Validation Commands

```bash
npm install
npm run lint
npm run test
npm run test:e2e
npm run dev
```

## Related Artifacts

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)
- [API Contract](./contracts/public-admin-api.openapi.yaml)
