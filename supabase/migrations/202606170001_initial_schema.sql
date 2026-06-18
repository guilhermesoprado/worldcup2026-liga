create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active',
  last_login_at timestamptz
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_order integer not null,
  phase text not null default 'groups'
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  represented_country text not null,
  cartola_team_name text not null,
  cartola_team_id bigint not null unique,
  group_id uuid references public.groups(id),
  seed_label text not null unique,
  is_active boolean not null default true
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  external_round_id integer not null unique,
  name text not null,
  status text not null,
  market_status text,
  started_at timestamptz,
  officialized_at timestamptz,
  last_synced_at timestamptz,
  source_version text
);

create table if not exists public.sync_configurations (
  id uuid primary key default gen_random_uuid(),
  is_enabled boolean not null default true,
  interval_minutes integer not null default 15,
  auto_sync_mode text not null default 'access_driven',
  last_changed_at timestamptz not null default now(),
  last_changed_by text
);

create table if not exists public.sync_executions (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  summary_message text not null,
  affected_round_id uuid references public.rounds(id),
  request_fingerprint text
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  phase text not null,
  phase_slot text not null,
  group_id uuid references public.groups(id),
  round_id uuid references public.rounds(id),
  home_participant_id uuid not null references public.participants(id),
  away_participant_id uuid not null references public.participants(id),
  home_points numeric(8,2),
  away_points numeric(8,2),
  result_type text,
  state text not null,
  decided_by_rule text not null default 'score'
);

create table if not exists public.standings_snapshots (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  phase text not null,
  group_id uuid references public.groups(id),
  participant_id uuid not null references public.participants(id),
  round_id uuid not null references public.rounds(id),
  points integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  points_for numeric(8,2) not null default 0,
  points_against numeric(8,2) not null default 0,
  points_difference numeric(8,2) not null default 0,
  position integer not null,
  status_label text not null,
  state text not null
);

create table if not exists public.lineup_snapshots (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  round_id uuid not null references public.rounds(id),
  captain_name text,
  coach_name text,
  formation_label text,
  total_points numeric(8,2) not null default 0,
  state text not null,
  raw_payload_ref text
);

create table if not exists public.lineup_players (
  id uuid primary key default gen_random_uuid(),
  lineup_snapshot_id uuid not null references public.lineup_snapshots(id) on delete cascade,
  athlete_id bigint,
  player_name text not null,
  club_name text,
  position_name text,
  captain_multiplier integer not null default 1,
  points numeric(8,2) not null default 0,
  status_label text
);

create table if not exists public.most_picked_players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id),
  athlete_id bigint,
  player_name text not null,
  club_name text,
  position_name text,
  pick_count integer not null,
  rank_position integer not null,
  state text not null
);

