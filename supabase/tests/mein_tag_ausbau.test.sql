-- Prüft den Ausbau von «Mein Tag» (2.11.2026, Entscheid 0039): Verschieben (Aufgabe neu fällig, Nachfassen nur
-- für mich ausgeblendet), Grund «seit X Tagen», Freigaben im Ausgangskorb, Wochenziele (nur Admin/Finanzen setzen)
-- und «Team heute» ohne Grund der Abwesenheit.
-- Ausführen: npm run db:test
begin;
set local timezone = 'Europe/Zurich';
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'mt-vk@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'mt-ad@test.local'),
  ('00000000-0000-0000-0000-0000000039a3', 'mt-mo@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, standort_id) values
  ('00000000-0000-0000-0000-0000000039b1', 'mt_vk', 'Vera Ausbau', '00000000-0000-0000-0000-0000000039a1', 'verkauf',
   (select id from public.standorte where kuerzel = 'muri')),
  ('00000000-0000-0000-0000-0000000039b2', 'mt_ad', 'Adam Ausbau', '00000000-0000-0000-0000-0000000039a2', 'admin', null),
  ('00000000-0000-0000-0000-0000000039b3', 'mt_mo', 'Mona Ausbau', '00000000-0000-0000-0000-0000000039a3', 'montage', null);
insert into public.kontakte (id, art, kontaktart, vorname, nachname, telefon, sprache) values
  ('00000000-0000-0000-0000-0000000039c1', 'person', 'privat', 'Tom', 'Ausbauprobe', '+41790003901', 'de');
insert into public.objekte (id, kontakt_id, strasse, plz, ort) values
  ('00000000-0000-0000-0000-0000000039d1', '00000000-0000-0000-0000-0000000039c1', 'Bachweg 3', '5630', 'Muri AG');
insert into public.verkaufschancen (id, kontakt_id, objekt_id, stufe, quelle, tour_person_id, standort_id) values
  ('00000000-0000-0000-0000-0000000039e1', '00000000-0000-0000-0000-0000000039c1', '00000000-0000-0000-0000-0000000039d1',
   'neu', 'test39', '00000000-0000-0000-0000-0000000039b1', (select id from public.standorte where kuerzel = 'muri'));
-- Offerte vor 14 Tagen gesendet = nachfassen fällig.
insert into public.offerten (id, nummer, kontakt_id, verkaufschance_id, status, angebot_am, betrag_rappen, verantwortlich_id, standort_id) values
  ('00000000-0000-0000-0000-0000000039f1', 'T39-1', '00000000-0000-0000-0000-0000000039c1', '00000000-0000-0000-0000-0000000039e1',
   'offeriert', current_date - 14, 3148000, '00000000-0000-0000-0000-0000000039b1',
   (select id from public.standorte where kuerzel = 'muri'));
-- Aufgabe von Adam an Vera, heute fällig.
insert into public.aufgaben (id, titel, person_id, erstellt_von, faellig_am) values
  ('00000000-0000-0000-0000-000000003901', 'Unterlagen senden', '00000000-0000-0000-0000-0000000039b1',
   '00000000-0000-0000-0000-0000000039a2', current_date);
-- Mail von Vera wartet auf Freigabe.
insert into public.ausgangskorb (kanal, an, betreff, text, status, absender_person_id) values
  ('mail', 'kunde@test.local', 'Terminbestätigung', 'Hallo', 'wartet', '00000000-0000-0000-0000-0000000039b1');
-- Mona ist heute in den Ferien.
insert into public.abwesenheiten (person_id, art, von, bis) values
  ('00000000-0000-0000-0000-0000000039b3', 'ferien', current_date - 1, current_date + 2);

-- Als Vera
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a1', true);
create temp table t1 on commit drop as select public.heute_fuer_mich() as t;

select is((select (z ->> 'tage')::int from t1, jsonb_array_elements(t -> 'nachfassen' -> 'zeilen') z where z ->> 'id' = '00000000-0000-0000-0000-0000000039f1'),
  14, 'Nachfassen sagt, wie lange die Offerte schon offen ist');
select is((select z ->> 'von' from t1, jsonb_array_elements(t -> 'aufgaben' -> 'zeilen') z where z ->> 'titel' = 'Unterlagen senden'),
  'Adam Ausbau', 'Aufgabe sagt, wer sie vergeben hat');
select is((select (t -> 'freigaben' ->> 'anzahl')::int from t1), 1, 'eigene Mail wartet auf Freigabe');
select is((select jsonb_typeof(t -> 'ziele') from t1), 'null', 'ohne Ziele keine Ziele');
select is((select (t ->> 'darf_ziele')::boolean from t1), false, 'Verkauf darf keine Ziele setzen');

-- Verschieben
select throws_ok($$ select public.tag_verschieben('nachfassen', '00000000-0000-0000-0000-0000000039f1', current_date) $$,
  'P0001', 'tag.datum_ungueltig', 'nicht auf heute verschieben');
select lives_ok($$ select public.tag_verschieben('nachfassen', '00000000-0000-0000-0000-0000000039f1', current_date + 1) $$,
  'Nachfassen auf morgen');
select is((select count(*)::int from jsonb_array_elements(public.heute_fuer_mich() -> 'nachfassen' -> 'zeilen') z
            where z ->> 'id' = '00000000-0000-0000-0000-0000000039f1'), 0, 'verschobenes Nachfassen ist weg');
select is((select nachfassen_am from public.offerten where id = '00000000-0000-0000-0000-0000000039f1'), null,
  'Offerte selbst bleibt unverändert (Stand-Regeln im Verkauf)');
select lives_ok($$ select public.tag_verschieben('nachfassen', '00000000-0000-0000-0000-0000000039f1', null) $$, 'wieder zeigen');
select is((select count(*)::int from jsonb_array_elements(public.heute_fuer_mich() -> 'nachfassen' -> 'zeilen') z
            where z ->> 'id' = '00000000-0000-0000-0000-0000000039f1'), 1, 'Nachfassen ist zurück');
select lives_ok($$ select public.tag_verschieben('aufgabe', '00000000-0000-0000-0000-000000003901', current_date + 3) $$,
  'eigene Aufgabe verschieben');
select is((select faellig_am from public.aufgaben where id = '00000000-0000-0000-0000-000000003901'), current_date + 3,
  'Aufgabe ist neu fällig');
select throws_ok($$ select public.kennzahlen_ziele_setzen('00000000-0000-0000-0000-0000000039b1', '{"termine": 4}') $$,
  '42501', 'tag.ziele_kein_recht', 'Verkauf setzt keine Ziele');

-- Team heute: Mona abwesend, ohne Grund
select is((select z ->> 'status' from jsonb_array_elements(public.team_heute()) z where z ->> 'name' = 'Mona Ausbau'),
  'abwesend', 'Mona ist abwesend');
select is((select count(*)::int from jsonb_array_elements(public.team_heute()) z where z::text like '%ferien%'), 0,
  'Grund der Abwesenheit bleibt verborgen');

-- Als Adam (Administration): Ziele für Vera setzen
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a2', true);
select lives_ok($$ select public.kennzahlen_ziele_setzen('00000000-0000-0000-0000-0000000039b1', '{"termine": 4, "auftrag_monat_rappen": 25000000}') $$,
  'Administration setzt Ziele');

select * from finish();
rollback;
