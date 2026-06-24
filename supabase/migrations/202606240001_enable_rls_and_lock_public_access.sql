grant usage on schema public to anon, authenticated;

alter table public.admin_accounts enable row level security;
alter table public.groups enable row level security;
alter table public.participants enable row level security;
alter table public.rounds enable row level security;
alter table public.sync_configurations enable row level security;
alter table public.sync_executions enable row level security;
alter table public.matches enable row level security;
alter table public.standings_snapshots enable row level security;
alter table public.lineup_snapshots enable row level security;
alter table public.lineup_players enable row level security;
alter table public.most_picked_players enable row level security;

revoke all on table public.admin_accounts from anon, authenticated;
revoke all on table public.sync_configurations from anon, authenticated;
revoke all on table public.sync_executions from anon, authenticated;

revoke all on table public.groups from anon, authenticated;
revoke all on table public.participants from anon, authenticated;
revoke all on table public.rounds from anon, authenticated;
revoke all on table public.matches from anon, authenticated;
revoke all on table public.standings_snapshots from anon, authenticated;
revoke all on table public.lineup_snapshots from anon, authenticated;
revoke all on table public.lineup_players from anon, authenticated;
revoke all on table public.most_picked_players from anon, authenticated;

grant select on table public.groups to anon, authenticated;
grant select on table public.participants to anon, authenticated;
grant select on table public.rounds to anon, authenticated;
grant select on table public.matches to anon, authenticated;
grant select on table public.standings_snapshots to anon, authenticated;
grant select on table public.lineup_snapshots to anon, authenticated;
grant select on table public.lineup_players to anon, authenticated;
grant select on table public.most_picked_players to anon, authenticated;

drop policy if exists "public read groups" on public.groups;
create policy "public read groups"
  on public.groups
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read participants" on public.participants;
create policy "public read participants"
  on public.participants
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read rounds" on public.rounds;
create policy "public read rounds"
  on public.rounds
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read matches" on public.matches;
create policy "public read matches"
  on public.matches
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read standings snapshots" on public.standings_snapshots;
create policy "public read standings snapshots"
  on public.standings_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read lineup snapshots" on public.lineup_snapshots;
create policy "public read lineup snapshots"
  on public.lineup_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read lineup players" on public.lineup_players;
create policy "public read lineup players"
  on public.lineup_players
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read most picked players" on public.most_picked_players;
create policy "public read most picked players"
  on public.most_picked_players
  for select
  to anon, authenticated
  using (true);
