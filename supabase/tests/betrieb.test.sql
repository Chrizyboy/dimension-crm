-- Prüft Phase 16: Stand des Betriebs nur für die Administration, ohne Werte aus dem Tresor.
-- Ausführen: npm run db:test
begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000016d1', 'p16b-vk@test.local'),
  ('00000000-0000-0000-0000-0000000016d2', 'p16b-ad@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000016e1', 'p16b_vk', 'Vera Vertrieb', '00000000-0000-0000-0000-0000000016d1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000016e2', 'p16b_ad', 'Adam Admin', '00000000-0000-0000-0000-0000000016d2', 'admin', '{}', 'de');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000016d1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000016d1', true);
select throws_ok($$ select public.betrieb_stand() $$, '42501', 'betrieb.kein_recht', 'Verkauf sieht den Betrieb nicht');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000016d2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000016d2', true);
select ok(public.betrieb_stand() ->> 'schema' >= '20261107000200', 'Administration sieht den Stand der Datenbank');
select ok(jsonb_typeof(public.betrieb_stand() -> 'tresor_url') = 'boolean', 'Tresor nur als ja/nein');
select ok((public.betrieb_stand() ->> 'personen_aktiv')::int >= 2, 'Personen gezählt');
reset role;

select * from finish();
rollback;
