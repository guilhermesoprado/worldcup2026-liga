# Data Model: Cartola League Tracker

## Participante

**Purpose**: Represents one fixed league member mapped to one national team and
one Cartola team.

**Fields**:
- `id`: internal unique identifier
- `display_name`: cartoleiro name shown publicly
- `represented_country`: national team represented in the league
- `cartola_team_name`: official Cartola team name
- `cartola_team_id`: external Cartola identifier
- `group_id`: current group assignment
- `seed_label`: official tournament slot label used for bracket filling
- `is_active`: fixed true for the current edition unless archival support is
  introduced later

**Relationships**:
- belongs to one `Grupo`
- has many `ConfrontoParticipant`
- has many `EscalacaoSnapshot`
- has many `ClassificacaoSnapshot`

## Grupo

**Purpose**: Represents one of the 12 first-phase groups.

**Fields**:
- `id`: internal unique identifier
- `code`: group code `A` through `L`
- `display_order`: order used in navigation
- `phase`: always group stage for this version

**Relationships**:
- has many `Participante`
- has many `Confronto`
- has many `ClassificacaoSnapshot`

## Rodada

**Purpose**: Represents one scoring cycle mirrored from Cartola and used to
drive partial and official league states.

**Fields**:
- `id`: internal unique identifier
- `external_round_id`: identifier from Cartola
- `name`: display name for the round
- `status`: `scheduled | live | official | sync_failed`
- `market_status`: external round or market state from Cartola
- `started_at`
- `officialized_at`
- `last_synced_at`
- `source_version`: checksum or source marker for change detection

**Relationships**:
- has many `Confronto`
- has many `EscalacaoSnapshot`
- has many `JogadorMaisEscalado`
- has many `SyncExecution`

## Confronto

**Purpose**: Represents a league match between two participants in either group
or knockout phases.

**Fields**:
- `id`: internal unique identifier
- `phase`: `groups | round_of_32 | round_of_16 | quarterfinal | semifinal | third_place | final`
- `phase_slot`: official slot label within the phase
- `group_id`: nullable for knockout matches
- `round_id`
- `home_participant_id`
- `away_participant_id`
- `home_points`
- `away_points`
- `result_type`: `home_win | away_win | draw`
- `state`: `scheduled | partial | official`
- `decided_by_rule`: `score | draw_threshold | tie_breaker`

**Validation rules**:
- group-stage draws occur when absolute score difference is `<= 5.00`
- knockout matches cannot end unresolved once the round is official

## ClassificacaoSnapshot

**Purpose**: Stores the derived table state for a participant after a sync.

**Fields**:
- `id`: internal unique identifier
- `scope`: `group | best_third | knockout_seed`
- `phase`
- `group_id`: nullable when scope is not group-specific
- `participant_id`
- `round_id`
- `points`
- `wins`
- `draws`
- `losses`
- `points_for`
- `points_against`
- `points_difference`
- `position`
- `status_label`: `qualified | in_contention | eliminated`
- `state`: `partial | official`

## EscalacaoSnapshot

**Purpose**: Stores the lineup and scoring details for one participant in one
round.

**Fields**:
- `id`: internal unique identifier
- `participant_id`
- `round_id`
- `captain_name`: nullable
- `coach_name`: nullable
- `formation_label`: nullable
- `total_points`
- `state`: `partial | official`
- `raw_payload_ref`: pointer or checksum for source reconstruction

**Relationships**:
- has many `EscalacaoJogador`

## EscalacaoJogador

**Purpose**: Stores one player entry inside a lineup snapshot.

**Fields**:
- `id`
- `lineup_snapshot_id`
- `player_name`
- `club_name`
- `position_name`
- `captain_multiplier`: default `1`, may be higher if source rules require it
- `points`
- `status_label`

## JogadorMaisEscalado

**Purpose**: Stores the aggregated most-picked ranking for a round.

**Fields**:
- `id`
- `round_id`
- `player_name`
- `club_name`
- `position_name`
- `pick_count`
- `rank_position`
- `state`: `partial | official`

## SyncConfiguration

**Purpose**: Stores the admin-defined operational behavior for synchronization.

**Fields**:
- `id`
- `is_enabled`
- `interval_minutes`
- `auto_sync_mode`: `access_driven`
- `last_changed_at`
- `last_changed_by`

## SyncExecution

**Purpose**: Auditable record of each synchronization attempt.

**Fields**:
- `id`
- `trigger_type`: `automatic_access | manual_admin`
- `started_at`
- `finished_at`
- `status`: `success | partial_success | failed | skipped`
- `summary_message`
- `affected_round_id`: nullable
- `request_fingerprint`: optional idempotency key

## AdminAccount

**Purpose**: Represents the single allowed administrator.

**Fields**:
- `id`
- `email`
- `status`: `active | disabled`
- `last_login_at`

## State Transitions

- `Rodada.status`: `scheduled -> live -> official`
- `Rodada.status`: `live -> sync_failed` when a sync attempt fails but the round
  itself remains live externally
- `Confronto.state`: `scheduled -> partial -> official`
- `ClassificacaoSnapshot.state`: `partial -> official`
- `SyncConfiguration.is_enabled`: `true <-> false`
