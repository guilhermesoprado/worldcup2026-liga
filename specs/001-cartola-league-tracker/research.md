# Research: Cartola League Tracker

## Decision 1: Use a single Next.js full-stack application

**Decision**: Implement the product as one Next.js application serving both the
public site and the admin area.

**Rationale**: This keeps hosting simple and free-first while still allowing
clear separation between UI routes, route handlers, domain modules, and
server-only integration code. It also reduces deployment complexity for a
single-edition product with one admin user.

**Alternatives considered**:
- Separate frontend and backend projects: rejected because it increases
  operational overhead without clear product benefit at this scale.
- Pure static site with external backend: rejected because sync controls and
  protected admin workflows need server-side execution.

## Decision 2: Use Supabase for persistence and single-admin authentication

**Decision**: Store competition state, participant mapping, sync settings, and
admin auth in Supabase.

**Rationale**: Supabase combines Postgres, authentication, and secret-backed
server access in a cost-effective setup that fits the single-admin requirement.
It also supports a clean separation between public read access patterns and
admin-protected operations.

**Alternatives considered**:
- Local file storage: rejected because it complicates concurrent hosting and
  operational safety for admin actions.
- Separate hosted database plus custom auth: rejected because it adds cost and
  setup complexity for little benefit.

## Decision 3: Model synchronization as access-driven plus manual fallback

**Decision**: The system will evaluate whether a sync is due whenever the public
site or admin area is accessed. If due and enabled, it attempts a server-side
sync. The admin can also trigger an immediate manual sync.

**Rationale**: Free hosting does not guarantee a permanent background process.
This model preserves the agreed "internal sync" behavior while staying honest
about the constraints of Vercel Hobby. It also gives the admin deterministic
fallback control when no one is actively accessing the system.

**Alternatives considered**:
- Paid always-on worker: rejected for the initial version because the project is
  explicitly cost-sensitive.
- Browser-only polling without server-side due checks: rejected because it would
  spread operational logic into clients and weaken consistency.

## Decision 4: Keep Cartola authoritative, but persist league-ready snapshots

**Decision**: Persist normalized snapshots of rounds, matches, lineups, and
derived standings after each successful sync.

**Rationale**: This allows the public site to remain fast and consistent, makes
partial versus official transitions explicit, and avoids recomputing all tables
from raw third-party payloads on every request.

**Alternatives considered**:
- Read Cartola live on every page request: rejected because it increases latency
  and couples user experience directly to third-party availability.
- Persist only final standings: rejected because the product must also support
  partial tracking during active rounds.

## Decision 4A: Restrict external reads to the Copa API only

**Decision**: The product will use only `https://api.copa.cartola.globo.com/`
as its external Cartola source.

**Rationale**: The league is defined as a World Cup Cartola competition, so the
official integration boundary must stay aligned with the Copa product. Even if
other Cartola APIs expose similar endpoints, using them would create a mixed
source model and could produce behavior that diverges from the official Copa
operation expected by the project owner.

**Alternatives considered**:
- Mixing Copa API with other Cartola APIs: rejected because it weakens source
  consistency and can mask official Copa outages with non-equivalent data.
- Automatic fallback to another Cartola API when the Copa API fails: rejected
  because the desired behavior is to do nothing beyond preserving the last
  reliable state and waiting for the official Copa source to recover.

## Decision 5: Isolate competition rules in dedicated domain services

**Decision**: Implement group standings, tie-breakers, best-third ranking, and
knockout filling as server-side domain services independent of pages and route
handlers.

**Rationale**: These rules define the identity of the product and must be tested
without UI coupling. Isolation also prevents divergence between public cards,
tables, admin previews, and API outputs.

**Alternatives considered**:
- Calculate standings directly inside pages: rejected because it duplicates
  critical logic and makes testing harder.
- Push rule logic entirely into SQL views: rejected because the rule set will be
  easier to evolve and test in application code.

## Decision 6: Represent the official World Cup bracket as data, not ad hoc code

**Decision**: Store the knockout mapping as a seeded bracket matrix that maps
qualified positions, including best-third slots, into the official round-of-32
structure.

**Rationale**: Bracket rules are fixed tournament data and should be auditable.
Keeping them in structured configuration is safer than scattering the mapping
through conditional code. This also simplifies later verification against the
official tournament schedule.

**Alternatives considered**:
- Hardcode pairings inside services: rejected because it becomes brittle and
  difficult to review.
- Infer the bracket dynamically without a matrix: rejected because the official
  format depends on predetermined slot mapping.

## Decision 7: Use lightweight automated validation only where risk is highest

**Decision**: Cover domain rules, sync state transitions, admin auth protection,
and one end-to-end public/admin smoke flow with automated tests.

**Rationale**: This matches the project's desire for simple tests while still
protecting the highest-risk behaviors: classification correctness, sync control,
and secure admin access.

**Alternatives considered**:
- Broad end-to-end test suite for every page state: rejected for cost and
  maintenance reasons in a single-edition product.
- No automated tests: rejected because competition ranking errors would be too
  risky.
