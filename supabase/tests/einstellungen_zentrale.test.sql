-- Prüft Einstellungen Etappe 1: Region aus der PLZ (Regel, Reihenfolge, von Hand bleibt), Papierkorb über alle
-- Fachtabellen und Wiederherstellen, beides nur für die Administration.
-- Ausführen: npm run db:test
begin;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000045a1', 'ez-admin@test.local'),
  ('00000000-0000-0000-0000-0000000045a2', 'ez-verkauf@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000045b1', 'ez_ad', 'Anna Admin', 'ez-admin@test.local', '00000000-0000-0000-0000-0000000045a1', 'admin', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000045b2', 'ez_vk', 'Viktor Verkauf', 'ez-verkauf@test.local', '00000000-0000-0000-0000-0000000045a2', 'verkauf', '{}', 'de');

-- Zwei Regionen mit überlappenden Regeln: die kleinere Nummer gewinnt.
insert into public.regionen (id, nummer, name, plz_regeln) values
  ('00000000-0000-0000-0000-0000000045d1', 99901, 'Test Nord', '[{"plz_von": 9990, "plz_bis": 9994}]'),
  ('00000000-0000-0000-0000-0000000045d2', 99902, 'Test Süd', '[{"plz_von": 9990, "plz_bis": 9999}]');
insert into public.kontakte (id, art, kontaktart, vorname, nachname) values
  ('00000000-0000-0000-0000-0000000045c1', 'person', 'privat', 'Eva', 'Einstellung');

select is(public.region_fuer_plz('9992'), '00000000-0000-0000-0000-0000000045d1'::uuid, 'kleinere Nummer gewinnt');
select is(public.region_fuer_plz('9997'), '00000000-0000-0000-0000-0000000045d2'::uuid, 'zweite Region für den Rest');
select is(public.region_fuer_plz('abc'), null, 'ohne PLZ keine Region');

insert into public.objekte (id, kontakt_id, plz, ort) values
  ('00000000-0000-0000-0000-0000000045e1', '00000000-0000-0000-0000-0000000045c1', '9996', 'Testdorf');
select is((select region_id from public.objekte where id = '00000000-0000-0000-0000-0000000045e1'),
  '00000000-0000-0000-0000-0000000045d2'::uuid, 'neue Adresse bekommt die Region aus der PLZ');

insert into public.objekte (id, kontakt_id, plz, ort, region_id) values
  ('00000000-0000-0000-0000-0000000045e2', '00000000-0000-0000-0000-0000000045c1', '9996', 'Testdorf',
   '00000000-0000-0000-0000-0000000045d1');
select is((select region_id from public.objekte where id = '00000000-0000-0000-0000-0000000045e2'),
  '00000000-0000-0000-0000-0000000045d1'::uuid, 'von Hand gewählte Region bleibt');

update public.kontakte set geloescht_am = now() where id = '00000000-0000-0000-0000-0000000045c1';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000045a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000045a2', true);
select throws_ok($$ select * from public.papierkorb() $$, '42501', null, 'Verkauf sieht den Papierkorb nicht');
select throws_ok($$ select public.papierkorb_wiederherstellen('kontakte', '00000000-0000-0000-0000-0000000045c1') $$,
  '42501', null, 'Verkauf stellt nichts wieder her');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000045a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000045a1', true);
select is((select bezeichnung from public.papierkorb(2000) where id = '00000000-0000-0000-0000-0000000045c1'),
  'Eva Einstellung', 'Administration sieht den gelöschten Kontakt mit Namen');
select ok(public.papierkorb_wiederherstellen('kontakte', '00000000-0000-0000-0000-0000000045c1'), 'wiederhergestellt');
select throws_ok($$ select public.papierkorb_wiederherstellen('gibt_es_nicht', gen_random_uuid()) $$,
  'P0001', 'papierkorb.unbekannt', 'unbekannte Tabelle abgelehnt');

select * from finish();
rollback;
