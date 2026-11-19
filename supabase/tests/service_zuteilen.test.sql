-- Prüft die Zuteilung der Service-Fälle (Chris 19.11.2026): jeder neue Fall geht zuerst an Andy (Verteiler),
-- auch wenn jemand anderes beim Anlegen eine Person wählt; Andy wählt den Mitarbeiter über service_zuteilen
-- (Verlauf, Glocke); wählt Andy selbst beim Anlegen, gilt der Fall als zugeteilt; Stellvertretung bei Abwesenheit.
-- Ausführen: npm run db:test
begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000051a1', 'svz-andy@test.local'),
  ('00000000-0000-0000-0000-0000000051a2', 'svz-loris@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000051b1', 'andreas', 'Andy Test', '00000000-0000-0000-0000-0000000051a1', 'admin', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000051b2', 'loris', 'Loris Test', '00000000-0000-0000-0000-0000000051a2', 'admin', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000051b3', 'svz_monteur', 'Monteur Test', null, 'montage', '{}', 'fr'),
  ('00000000-0000-0000-0000-0000000051b4', 'chris', 'Chris Test', null, 'admin', '{}', 'de')
on conflict (kuerzel) do update set aktiv = true;

-- Ohne Anmeldung (z. B. Website) → Andy, noch nicht zugeteilt
insert into public.service_faelle (id, nummer, titel) values ('00000000-0000-0000-0000-0000000051c1', '', 'Test ohne Person');
select is((select person_id from public.service_faelle where id = '00000000-0000-0000-0000-0000000051c1'),
  '00000000-0000-0000-0000-0000000051b1'::uuid, 'neuer Fall → Andy');
select is((select zugeteilt_am from public.service_faelle where id = '00000000-0000-0000-0000-0000000051c1'), null,
  'liegt zum Zuteilen bereit');

-- Loris legt an und wählt den Monteur → trotzdem zuerst Andy, mit Glocke
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000051a2', true);
insert into public.service_faelle (id, nummer, titel, person_id)
values ('00000000-0000-0000-0000-0000000051c2', '', 'Test von Loris', '00000000-0000-0000-0000-0000000051b3');
reset role;
select is((select person_id from public.service_faelle where id = '00000000-0000-0000-0000-0000000051c2'),
  '00000000-0000-0000-0000-0000000051b1'::uuid, 'gewählte Person von jemand anderem → zuerst Andy');
select ok(exists (select 1 from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000051b1'
                     and ziel like '%00000000-0000-0000-0000-0000000051c2'), 'Andy bekommt die Glocke');

-- Andy teilt zu
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000051a1', true);
select lives_ok($$ select public.service_zuteilen('00000000-0000-0000-0000-0000000051c2', '00000000-0000-0000-0000-0000000051b3') $$,
  'Andy wählt den Monteur');
-- Andy legt an und wählt selbst → gilt als zugeteilt
insert into public.service_faelle (id, nummer, titel, person_id)
values ('00000000-0000-0000-0000-0000000051c3', '', 'Test von Andy', '00000000-0000-0000-0000-0000000051b3');
reset role;
select ok((select person_id = '00000000-0000-0000-0000-0000000051b3' and zugeteilt_am is not null
             and verlauf::text like '%Zugeteilt an Monteur Test%'
             from public.service_faelle where id = '00000000-0000-0000-0000-0000000051c2'), 'zugeteilt mit Verlauf');
select ok(exists (select 1 from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000051b3'
                     and ziel like '%00000000-0000-0000-0000-0000000051c2'), 'Monteur bekommt die Glocke');
select ok((select person_id = '00000000-0000-0000-0000-0000000051b3' and zugeteilt_am is not null
             from public.service_faelle where id = '00000000-0000-0000-0000-0000000051c3'), 'Andy wählt beim Anlegen selbst');

-- Andy abwesend → Stellvertretung (Chris)
insert into public.abwesenheiten (person_id, art, von, bis) values
  ('00000000-0000-0000-0000-0000000051b1', 'ferien', current_date, current_date + 3);
insert into public.service_faelle (id, nummer, titel) values ('00000000-0000-0000-0000-0000000051c4', '', 'Test Ferien');
select is((select person_id from public.service_faelle where id = '00000000-0000-0000-0000-0000000051c4'),
  '00000000-0000-0000-0000-0000000051b4'::uuid, 'Andy in den Ferien → Chris');

select * from finish();
rollback;
