-- Prüft den Wochenplan (Modul-Prüfung 23A): Einträge aus Einsätzen und Service, Abwesenheiten, abgelaufene Kurse,
-- Verschieben per Ziehen. Ausführen: npm run db:test
begin;
select plan(8);

insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000039c1', 'person', 'privat', 'Ida', 'Plan', 'de');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000039d1', 'p39-ad@test.local');
insert into public.personen (id, name, kuerzel, rolle, aktiv, rechte, sprache, auth_user_id) values
  ('00000000-0000-0000-0000-0000000039b1', 'Test Monteur A', 'p39_a', 'montage', true, '{}', 'de', null),
  ('00000000-0000-0000-0000-0000000039b2', 'Test Monteur B', 'p39_b', 'montage', true, '{}', 'de', null),
  ('00000000-0000-0000-0000-0000000039b3', 'Test Planung', 'p39_p', 'admin', true, '{}', 'de', '00000000-0000-0000-0000-0000000039d1');
insert into public.projekte (id, nummer, kontakt_id, titel) values
  ('00000000-0000-0000-0000-0000000039a1', 'P9391', '00000000-0000-0000-0000-0000000039c1', 'PV Woche');
insert into public.einsaetze (id, projekt_id, art, von, bis, personen) values
  ('00000000-0000-0000-0000-0000000039e1', '00000000-0000-0000-0000-0000000039a1', 'intern', date '2026-11-09', date '2026-11-10',
   '{00000000-0000-0000-0000-0000000039b1}');
insert into public.service_faelle (id, nummer, kontakt_id, titel, termin_am, person_id) values
  ('00000000-0000-0000-0000-0000000039f1', 'S9391', '00000000-0000-0000-0000-0000000039c1', 'Wechselrichter',
   timestamptz '2026-11-11 08:30 Europe/Zurich', '00000000-0000-0000-0000-0000000039b1');
insert into public.abwesenheiten (person_id, art, von, bis) values
  ('00000000-0000-0000-0000-0000000039b1', 'ferien', date '2026-11-10', date '2026-11-10');
insert into public.qualifikationen (person_id, art, gueltig_bis) values
  ('00000000-0000-0000-0000-0000000039b1', 'absturz', date '2026-11-01');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039d1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039d1', true);

select is((select count(*)::int from jsonb_array_elements(public.wochenplan('2026-11-09', '2026-11-15') -> 'eintraege') x
            where x ->> 'nummer' in ('P9391', 'S9391')), 2, 'Montage und Service im Plan');
select is((select x ->> 'zeit' from jsonb_array_elements(public.wochenplan('2026-11-09', '2026-11-15') -> 'eintraege') x
            where x ->> 'nummer' = 'S9391'), '08:30', 'Service mit Uhrzeit');
select ok(exists (select 1 from jsonb_array_elements(public.wochenplan('2026-11-09', '2026-11-15') -> 'abwesenheiten') x
                   where x ->> 'person_id' = '00000000-0000-0000-0000-0000000039b1'), 'Abwesenheit dabei');
select ok(exists (select 1 from jsonb_array_elements(public.wochenplan('2026-11-09', '2026-11-15') -> 'kurse') x
                   where x ->> 'art' = 'absturz'), 'abgelaufener Kurs dabei');
select throws_ok($$ select public.wochenplan('2026-11-09', '2027-03-01') $$, 'P0001', 'wochenplan.zeitraum', 'höchstens 6 Wochen');

select public.einsatz_verschieben('00000000-0000-0000-0000-0000000039e1', 2, '00000000-0000-0000-0000-0000000039b1',
                                  '00000000-0000-0000-0000-0000000039b2');
select results_eq($$ select von, personen from public.einsaetze where id = '00000000-0000-0000-0000-0000000039e1' $$,
  $$ values (date '2026-11-11', '{00000000-0000-0000-0000-0000000039b2}'::uuid[]) $$, 'Einsatz verschoben und Person getauscht');
select public.service_termin_verschieben('00000000-0000-0000-0000-0000000039f1', '2026-11-12', '00000000-0000-0000-0000-0000000039b2');
select is((select to_char(termin_am at time zone 'Europe/Zurich', 'YYYY-MM-DD HH24:MI') from public.service_faelle
            where id = '00000000-0000-0000-0000-0000000039f1'), '2026-11-12 08:30', 'Service-Termin: neuer Tag, gleiche Zeit');
select is((select person_id from public.service_faelle where id = '00000000-0000-0000-0000-0000000039f1'),
  '00000000-0000-0000-0000-0000000039b2'::uuid, 'Service-Termin: neue Person');

select * from finish();
rollback;
