do $$
declare
  group_g_id uuid;
  group_h_id uuid;
begin
  select id into group_g_id from public.groups where code = 'G';
  select id into group_h_id from public.groups where code = 'H';

  update public.participants
  set
    group_id = case
      when represented_country in ('Belgica', 'Egito', 'Ira', 'Nova Zelandia') then group_g_id
      when represented_country in ('Arabia Saudita', 'Cabo Verde', 'Espanha', 'Uruguai') then group_h_id
      else group_id
    end,
    seed_label = case
      when represented_country = 'Belgica' then 'G1'
      when represented_country = 'Egito' then 'G2'
      when represented_country = 'Ira' then 'G3'
      when represented_country = 'Nova Zelandia' then 'G4'
      when represented_country = 'Arabia Saudita' then 'H1'
      when represented_country = 'Cabo Verde' then 'H2'
      when represented_country = 'Espanha' then 'H3'
      when represented_country = 'Uruguai' then 'H4'
      else seed_label
    end
  where represented_country in (
    'Belgica',
    'Egito',
    'Ira',
    'Nova Zelandia',
    'Arabia Saudita',
    'Cabo Verde',
    'Espanha',
    'Uruguai'
  );

  update public.matches as matches
  set group_id = participants.group_id
  from public.participants as participants
  where matches.phase = 'groups'
    and matches.home_participant_id = participants.id
    and matches.group_id is distinct from participants.group_id;

  update public.standings_snapshots as snapshots
  set group_id = participants.group_id
  from public.participants as participants
  where snapshots.phase = 'groups'
    and snapshots.participant_id = participants.id
    and snapshots.group_id is distinct from participants.group_id;
end $$;
