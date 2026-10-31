-- Prüft Suchgebiet (Regionen als PLZ mit Radius), Umrechnung nach LV95 und «verantwortlich» der Grossprojekte
-- (Phase 8c, Nachtrag 31.10.2026). Ausführen: npm run db:test
begin;
select plan(8);

select ok(abs((intern.lv95(46.9480, 7.4474)).e - 2600670) < 50 and abs((intern.lv95(46.9480, 7.4474)).n - 1199655) < 50,
  'Bern (Zytglogge) nach LV95 auf wenige Meter');
select ok((select count(*) from intern.gp_kacheln()) > 3000, 'alle Regionen von Muri und Bulle sind Suchgebiet');
select ok(exists (select 1 from intern.gp_kacheln() where e_min between 2496000 and 2502000 and n_min between 1114000 and 1120000),
  'Genf gehört dazu');
select ok(exists (select 1 from intern.gp_kacheln() where e_min between 2680000 and 2686000 and n_min between 1244000 and 1250000),
  'Zürich gehört dazu');

-- Gebiet ausschalten: seine Kacheln fallen weg.
update public.einstellungen set wert = jsonb_set(wert, '{suche,zentren}',
  (select jsonb_agg(case when x ->> 'plz' = '1201' then x || '{"aktiv": false}' else x end) from jsonb_array_elements(wert #> '{suche,zentren}') x))
 where schluessel = 'grossprojekte';
select ok(not exists (select 1 from intern.gp_kacheln() where e_min between 2496000 and 2502000 and n_min between 1114000 and 1120000),
  'ausgeschaltetes Gebiet wird nicht durchsucht');

-- Verantwortlich: Standard aus der Einstellung, je Grossprojekt änderbar; Schritte gehen an diese Person.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000009f1', 'gp-chef@test.local'),
  ('00000000-0000-0000-0000-0000000009f3', 'gp-andere@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000009f2', 'gp_chef', 'Chef Test', '00000000-0000-0000-0000-0000000009f1', 'verkauf', '{}'),
  ('00000000-0000-0000-0000-0000000009f4', 'gp_andere', 'Andere Test', '00000000-0000-0000-0000-0000000009f3', 'verkauf', '{}');
update public.einstellungen set wert = jsonb_set(wert, '{verantwortlich}', '["gp_chef"]') where schluessel = 'grossprojekte';
insert into public.grossprojekte (titel, quelle, quell_url, plz, gemeinde) values ('Gebiet Test', 'hand', 'von Hand', '5630', 'Muri (AG)');
select is((select verantwortlich_id from public.grossprojekte where titel = 'Gebiet Test'),
  '00000000-0000-0000-0000-0000000009f2'::uuid, 'neues Grossprojekt: Chris (Einstellung) ist verantwortlich');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000009f1", "role": "authenticated"}', true);
select public.grossprojekt_verantwortlich_setzen((select id from public.grossprojekte where titel = 'Gebiet Test'),
  '00000000-0000-0000-0000-0000000009f4');
select is((select verantwortlich_id from public.grossprojekte where titel = 'Gebiet Test'),
  '00000000-0000-0000-0000-0000000009f4'::uuid, 'Verantwortlich geändert');
select public.grossprojekt_schritte_als_aufgaben((select id from public.grossprojekte where titel = 'Gebiet Test'),
  '[{"titel": "Anrufen", "text": "", "in_tagen": 1}]');
select is((select person_id from public.aufgaben where titel = 'Anrufen' and bezug_tabelle = 'grossprojekte' order by erstellt_am desc limit 1),
  '00000000-0000-0000-0000-0000000009f4'::uuid, 'Aufgabe geht an die verantwortliche Person');

select * from finish();
rollback;
