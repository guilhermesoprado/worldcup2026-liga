alter table public.lineup_snapshots
  add column if not exists captain_id bigint,
  add column if not exists reserve_luxury_id bigint;

alter table public.lineup_players
  add column if not exists source text not null default 'starter',
  add column if not exists entered boolean not null default true,
  add column if not exists counted boolean not null default false;

create unique index if not exists rounds_external_round_id_key
  on public.rounds (external_round_id);

create unique index if not exists lineup_snapshots_round_participant_key
  on public.lineup_snapshots (round_id, participant_id);

create unique index if not exists most_picked_players_round_athlete_key
  on public.most_picked_players (round_id, athlete_id);
