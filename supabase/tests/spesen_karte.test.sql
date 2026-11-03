-- Prüft den Abgleich mit dem Firmenkarten-Auszug (Entscheid 0040, Schritt 2): Einlesen ohne Doppelte, automatisch
-- verbinden nur bei eindeutiger Spese, Person je Kartenende merken, nachfordern mit Glocke, erledigen mit Grund,
-- später erfasste Spese findet ihre Buchung, nur mit Recht «finanzen».
-- Ausführen: npm run db:test
begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000040a1', 'fk-bh@test.local'),
  ('00000000-0000-0000-0000-0000000040a2', 'fk-mt@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000040b1', 'fk_bh', 'Bea Buchhaltung', '00000000-0000-0000-0000-0000000040a1', 'buchhaltung', '{}'),
  ('00000000-0000-0000-0000-0000000040b2', 'fk_mt', 'Mario Montage', '00000000-0000-0000-0000-0000000040a2', 'montage', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000040a2", "role": "authenticated"}', true);
insert into public.spesen (id, person_id, datum, betrag_rappen, kategorie, zweck, bezahlt_mit) values
  ('00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-0000000040b2', '2026-10-28', 9640, 'Fahrt / Kilometer', 'Diesel Firmenbus', 'firmenkarte'),
  ('00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-0000000040b2', '2026-10-29', 2500, 'Parkieren', 'Parkhaus A', 'firmenkarte'),
  ('00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-0000000040b2', '2026-10-29', 2500, 'Parkieren', 'Parkhaus B', 'firmenkarte'),
  ('00000000-0000-0000-0000-000000004004', '00000000-0000-0000-0000-0000000040b2', '2026-10-28', 9640, 'Fahrt / Kilometer', 'eigenes Geld', 'eigen');

select throws_ok($$ select public.firmenkarte_einlesen('[]'::jsonb) $$, 'P0001', 'finanzen.kein_recht',
  'einlesen nur Buchhaltung');
select is((select count(*) from public.firmenkarte_abgleich), 0::bigint, 'Monteur sieht keine Kartenbuchungen');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000040a1", "role": "authenticated"}', true);
select is(public.firmenkarte_einlesen($j$[
  {"datum": "2026-10-27", "betrag_rappen": 9640, "text": "AVIA Bulle", "karte": "**** 4711"},
  {"datum": "2026-10-29", "betrag_rappen": 2500, "text": "Parking Fribourg", "karte": "**** 4711"},
  {"datum": "2026-10-30", "betrag_rappen": 1990, "text": "Microsoft 365", "karte": "**** 4711"},
  {"datum": "2026-10-31", "betrag_rappen": 4200, "text": "Coop Pronto", "karte": "**** 4711"}
]$j$, 'oktober.csv'), '{"neu": 4, "doppelt": 0, "zugeordnet": 1}'::jsonb, 'vier neu, eine eindeutig verbunden');
select is((select spese_id from public.firmenkarte_buchungen where text = 'AVIA Bulle'),
  '00000000-0000-0000-0000-000000004001'::uuid, 'Diesel: Betrag gleich, Datum 1 Tag daneben, nur Firmenkarte');
select is((select spese_id from public.firmenkarte_buchungen where text = 'Parking Fribourg'), null::uuid,
  'Parkhaus: zwei passende Spesen, nichts geraten');
select is((select person_id from public.firmenkarte_buchungen where text = 'AVIA Bulle'),
  '00000000-0000-0000-0000-0000000040b2'::uuid, 'Person kommt von der Spese');

select is(public.firmenkarte_einlesen($j$[
  {"datum": "2026-10-27", "betrag_rappen": 9640, "text": "AVIA Bulle", "karte": "**** 4711"}
]$j$, 'oktober.csv') -> 'doppelt', '1'::jsonb, 'derselbe Auszug nochmals: keine Doppelten');

select lives_ok($$ select public.firmenkarte_verbinden(
  (select id from public.firmenkarte_buchungen where text = 'Parking Fribourg'), '00000000-0000-0000-0000-000000004003') $$,
  'von Hand verbinden');
select throws_ok($$ select public.firmenkarte_verbinden(
  (select id from public.firmenkarte_buchungen where text = 'Coop Pronto'), '00000000-0000-0000-0000-000000004004') $$,
  'P0001', 'finanzen.karte_keine_firmenkarte', 'Spese mit eigenem Geld nicht verbinden');

select lives_ok($$ select public.firmenkarte_person_setzen(
  (select id from public.firmenkarte_buchungen where text = 'Coop Pronto'), '00000000-0000-0000-0000-0000000040b2') $$,
  'Person setzen');
select is((select wert -> 'spesen' -> 'karten' ->> '4711' from public.einstellungen where schluessel = 'finanzen'),
  '00000000-0000-0000-0000-0000000040b2', 'Kartenende 4711 gehört jetzt Mario');

select throws_ok($$ select public.firmenkarte_erledigen(
  (select id from public.firmenkarte_buchungen where text = 'Microsoft 365'), ' ') $$, 'P0001', 'finanzen.grund_fehlt',
  'erledigen braucht einen Grund');
select public.firmenkarte_erledigen((select id from public.firmenkarte_buchungen where text = 'Microsoft 365'), 'Abo, Rechnung per Mail');

select is(public.firmenkarte_nachfordern(array(select id from public.firmenkarte_abgleich where stand = 'offen')), 1,
  'eine Glocke für Mario');

-- Mario erfasst den fehlenden Beleg: Buchung wird von selbst verbunden.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000040a2", "role": "authenticated"}', true);
insert into public.spesen (person_id, datum, betrag_rappen, kategorie, zweck, bezahlt_mit) values
  ('00000000-0000-0000-0000-0000000040b2', '2026-10-31', 4200, 'Material', 'Schrauben', 'firmenkarte');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000040a1", "role": "authenticated"}', true);
select is((select stand from public.firmenkarte_abgleich where text = 'Coop Pronto'), 'verbunden',
  'nachgereichter Beleg verbindet sich selbst');

select * from finish();
rollback;
