insert into public.admin_accounts (email)
values ('admin@example.com')
on conflict (email) do nothing;

insert into public.groups (code, display_order)
values
  ('A', 1), ('B', 2), ('C', 3), ('D', 4),
  ('E', 5), ('F', 6), ('G', 7), ('H', 8),
  ('I', 9), ('J', 10), ('K', 11), ('L', 12)
on conflict (code) do nothing;

insert into public.sync_configurations (is_enabled, interval_minutes, auto_sync_mode, last_changed_by)
values (true, 15, 'access_driven', 'seed')
on conflict do nothing;

