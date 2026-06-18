<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- [PRINCIPLE_1_NAME] -> I. Official Competition Fidelity
- [PRINCIPLE_2_NAME] -> II. Free-First Professional Stack
- [PRINCIPLE_3_NAME] -> III. Separation of Concerns and Clean Code
- [PRINCIPLE_4_NAME] -> IV. Secure Single-Admin Operations
- [PRINCIPLE_5_NAME] -> V. Lean Validation and Operational Clarity
Added sections:
- Technical and Product Constraints
- Delivery Workflow and Quality Gates
Removed sections:
- None
Templates requiring updates:
- .specify/templates/plan-template.md: updated
- .specify/templates/spec-template.md: updated
- .specify/templates/tasks-template.md: updated
- .specify/templates/commands/*.md: pending, directory not present in repository
Follow-up TODOs:
- None
-->
# Liga Copa do Mundo Constitution

## Core Principles

### I. Official Competition Fidelity
The system MUST treat Cartola as the authoritative source for scores, lineups,
and round status. During a live round, the public and admin views MUST present
partial data using the same status model as Cartola. After Cartola finalizes a
round, the system MUST consolidate and display the official result as the only
official competition state. Competition rules unique to the league, such as the
group-stage draw threshold, tie-break criteria, and World Cup knockout bracket
mapping, MUST be encoded explicitly and tested as business rules.

### II. Free-First Professional Stack
The project MUST prefer zero-cost or near-zero-cost services without sacrificing
clarity, reliability, or maintainability. The baseline stack is Next.js with
TypeScript, Supabase for persisted competition and admin data, and Vercel for
hosting. Architecture decisions MUST keep a clean separation between UI,
application logic, external integrations, and persistence so the project can be
moved to a paid always-on host later without rewriting core rules.

### III. Separation of Concerns and Clean Code
Business rules, Cartola synchronization, persistence, and presentation MUST be
kept in separate modules with clear responsibilities. TypeScript is mandatory.
Linting and formatting are mandatory. Reusable UI components MUST be preferred
over page-local duplication, and critical scoring or classification logic MUST
exist in one canonical implementation only. Features that mix view code with
domain logic or duplicate ranking logic across files fail this constitution
unless explicitly justified in the implementation plan.

### IV. Secure Single-Admin Operations
The public area MUST remain read-only and unauthenticated. Administrative access
MUST be restricted to a single email-and-password account controlled by the
project owner. Secrets, especially Cartola API tokens and auth credentials, MUST
never be exposed to the client or committed to the repository. Admin features
that trigger synchronization or alter operational settings MUST be protected by
server-side authorization checks and auditable logs or event records.

### V. Lean Validation and Operational Clarity
Testing MUST stay lightweight but meaningful. Every change that affects
classification, synchronization state, auth, or bracket generation MUST include
automated validation for the expected behavior. Documentation MUST remain lean:
at minimum the repository MUST maintain a README, deployment instructions, and
key technical decisions. Synchronization behavior MUST stay operationally clear:
configurable internal scheduling, automatic refresh while the system is being
accessed, and manual admin-triggered synchronization as the official fallback.

## Technical and Product Constraints

- The product is a single-edition World Cup league tracker for 48 fixed
  Cartola teams mapped permanently to 48 national teams.
- The public area MUST show the current phase, group tables, confrontation
  cards, knockout bracket progression, and the most selected players list.
- Clicking a team, cartoleiro, or represented national team MUST show the
  corresponding Cartola lineup and score details, with no extra social or
  editorial features in scope.
- The group stage MUST follow the defined league rules: 3 points for a win,
  1 for a draw, 0 for a loss, and a draw occurs when the score difference does
  not exceed 5.00 points.
- Group tie-breakers MUST follow this exact order: points, wins, point
  difference, points scored.
- Knockout tie-breakers MUST follow this exact order: points scored, point
  difference, best group-stage campaign.
- The knockout phase MUST follow the official World Cup bracket structure, while
  qualification into that bracket MUST use the league's consolidated standings.
- Synchronization cadence MUST be configurable by the admin, but automated
  execution is defined as internal and access-driven on the free hosting setup;
  manual synchronization remains the official fallback.

## Delivery Workflow and Quality Gates

- Work MUST proceed in this order: constitution, specification, clarification if
  needed, plan, tasks, implementation, and verification.
- Each specification MUST identify the source of truth for every synced datum,
  the behavior difference between partial and official results, and the fallback
  behavior when Cartola data is incomplete or delayed.
- Each implementation plan MUST document the chosen hosting assumptions,
  synchronization trigger model, secret management approach, and how business
  rules are isolated from UI code.
- Tasks MUST include setup for auth, secrets, synchronization flow, and tests
  for competition rules before polish work is added.
- Releases are acceptable only when public viewing works without login, admin
  auth is protected, and the primary competition flows are validated by simple
  automated tests.

## Governance

This constitution overrides informal project habits when conflicts arise. Every
plan, task list, review, and implementation decision MUST reference these
principles. Amendments require updating this file and any impacted templates in
.specify/templates/ within the same change. Versioning follows semantic rules:
MAJOR for removed or redefined principles, MINOR for new principles or material
governance expansion, and PATCH for clarifications that do not change project
obligations. Compliance review is mandatory at the plan stage and again before
declaring implementation complete.

**Version**: 1.0.0 | **Ratified**: 2026-06-17 | **Last Amended**: 2026-06-17
