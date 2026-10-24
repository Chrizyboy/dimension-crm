-- Prüft Phase 14: «Mein Tag» zeigt jeder Person ihre Termine, Aufgaben, Nachfassen, Leads, Zahlungen, Service und
-- Kontrollen (Aufgaben «von mir vergeben» getrennt), anonym gibt es nichts; Kennzahlen liefern Detail-Zeilen mit
-- Standort und Betrag, Kosten pro Lead-Quelle sind prüfbar änderbar, Auftragsbestand rechnet den Rest,
-- Auslastung zählt Einsatztage pro Woche, Marge nur mit Recht «preise» oder «finanzen».
-- Die lokale Datenbank enthält importierte Daten: geprüft wird deshalb, ob die Testdatensätze enthalten sind.
-- Ausführen: npm run db:test
begin;
set local timezone = 'Europe/Zurich';
select plan(25);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000014a1', 'p14-vk@test.local'),
  ('00000000-0000-0000-0000-0000000014a2', 'p14-ad@test.local'),
  ('00000000-0000-0000-0000-0000000014a3', 'p14-mo@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, standort_id) values
  ('00000000-0000-0000-0000-0000000014b1', 'p14_vk', 'Vera Verkauf', '00000000-0000-0000-0000-0000000014a1', 'verkauf',
   (select id from public.standorte where kuerzel = 'bulle')),
  ('00000000-0000-0000-0000-0000000014b2', 'p14_ad', 'Adam Admin', '00000000-0000-0000-0000-0000000014a2', 'admin', null),
  ('00000000-0000-0000-0000-0000000014b3', 'p14_mo', 'Mona Montage', '00000000-0000-0000-0000-0000000014a3', 'montage', null);
insert into public.kontakte (id, art, kontaktart, vorname, nachname, telefon, sprache) values
  ('00000000-0000-0000-0000-0000000014c1', 'person', 'privat', 'Tina', 'Tagesprobe', '+41790001401', 'fr');
insert into public.objekte (id, kontakt_id, strasse, plz, ort) values
  ('00000000-0000-0000-0000-0000000014d1', '00000000-0000-0000-0000-0000000014c1', 'Rue du Test 4', '1630', 'Bulle');

-- Lead mit Besichtigung heute 10 Uhr (Vera) und ein neuer Lead ohne Zuständige in Bulle.
insert into public.verkaufschancen (id, kontakt_id, objekt_id, stufe, quelle, tour_person_id, termin_am, standort_id) values
  ('00000000-0000-0000-0000-0000000014e1', '00000000-0000-0000-0000-0000000014c1', '00000000-0000-0000-0000-0000000014d1',
   'neu', 'test14', '00000000-0000-0000-0000-0000000014b1', current_date + time '10:00',
   (select id from public.standorte where kuerzel = 'bulle')),
  ('00000000-0000-0000-0000-0000000014e2', '00000000-0000-0000-0000-0000000014c1', '00000000-0000-0000-0000-0000000014d1',
   'neu', 'test14', null, null, (select id from public.standorte where kuerzel = 'bulle'));

-- Offerte vor 20 Tagen gesendet = nachfassen fällig.
insert into public.offerten (id, nummer, kontakt_id, verkaufschance_id, status, angebot_am, betrag_rappen, verantwortlich_id, standort_id) values
  ('00000000-0000-0000-0000-0000000014f1', 'T14-1', '00000000-0000-0000-0000-0000000014c1', '00000000-0000-0000-0000-0000000014e1',
   'offeriert', current_date - 20, 2000000, '00000000-0000-0000-0000-0000000014b1',
   (select id from public.standorte where kuerzel = 'bulle'));

-- Projekt im Bau mit Zahlungsplan (Anzahlung verrechnet und gestern fällig), Einsätzen und Anlage.
insert into public.projekte (id, nummer, kontakt_id, objekt_id, status, bau_status, standort_id, vertragswert_rappen,
                             verantwortlich_id, unterzeichnet_am) values
  ('00000000-0000-0000-0000-000000001401', 'T14-P1', '00000000-0000-0000-0000-0000000014c1', '00000000-0000-0000-0000-0000000014d1',
   'im_bau', 'terminiert', (select id from public.standorte where kuerzel = 'bulle'), 3000000,
   '00000000-0000-0000-0000-0000000014b1', current_date - 5);
insert into public.zahlungsplan (id, projekt_id, bezeichnung, betrag_rappen, faellig_am, rechnung_am) values
  ('00000000-0000-0000-0000-000000001411', '00000000-0000-0000-0000-000000001401', 'Acompte 30 %', 900000, current_date - 1, current_date - 10),
  ('00000000-0000-0000-0000-000000001412', '00000000-0000-0000-0000-000000001401', 'Solde 70 %', 2100000, null, null);
insert into public.einsaetze (projekt_id, art, von, bis, personen) values
  ('00000000-0000-0000-0000-000000001401', 'montage', current_date, current_date, '{00000000-0000-0000-0000-0000000014b1}'),
  -- nächste Woche Montag bis Mittwoch: drei Werktage für Mona
  ('00000000-0000-0000-0000-000000001401', 'montage', current_date - (extract(isodow from current_date)::int - 1) + 7,
   current_date - (extract(isodow from current_date)::int - 1) + 9, '{00000000-0000-0000-0000-0000000014b3}');
insert into public.anlagen (objekt_id, projekt_id, naechste_kontrolle) values
  ('00000000-0000-0000-0000-0000000014d1', '00000000-0000-0000-0000-000000001401', current_date + 10);
insert into public.service_faelle (id, nummer, titel, kontakt_id, person_id, prioritaet, termin_am) values
  ('00000000-0000-0000-0000-000000001421', '', 'Wechselrichter piept', '00000000-0000-0000-0000-0000000014c1',
   '00000000-0000-0000-0000-0000000014b1', 'hoch', current_date + 1 + time '09:00');

-- Aufgabe von Adam an Vera, heute fällig.
insert into public.aufgaben (titel, person_id, erstellt_von, faellig_am) values
  ('Rückruf Tina', '00000000-0000-0000-0000-0000000014b1', '00000000-0000-0000-0000-0000000014a2', current_date);

-- Anonym: nichts
set local role anon;
select throws_ok($$ select public.heute_fuer_mich() $$, '42501', null, 'Mein Tag nicht anonym');
select throws_ok($$ select * from public.kennzahlen_fakten(current_date - 30, current_date) $$, '42501', null, 'Kennzahlen nicht anonym');
reset role;

-- Als Vera (Verkauf)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000014a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000014a1', true);
create temp table tag on commit drop as select public.heute_fuer_mich() as t;

select is((select jsonb_agg(z ->> 'art' order by z ->> 'art') from tag, jsonb_array_elements(t -> 'termine' -> 'zeilen') z),
  '["besichtigung", "einsatz", "service"]'::jsonb, 'Termine heute und morgen: Besichtigung, Einsatz, Service');
select is((select z ->> 'zeit' from tag, jsonb_array_elements(t -> 'termine' -> 'zeilen') z where z ->> 'art' = 'besichtigung'),
  '10:00', 'Besichtigung mit Uhrzeit in Schweizer Zeit');
select is((select (t -> 'aufgaben' ->> 'anzahl')::int from tag), 1, 'eine Aufgabe für mich');
select is((select t -> 'aufgaben' -> 'zeilen' -> 0 ->> 'titel' from tag), 'Rückruf Tina', 'Aufgabe mit Titel');
select is((select (t -> 'vergeben' ->> 'anzahl')::int from tag), 0, 'Vera hat nichts vergeben');
select is((select z ->> 'id' from tag, jsonb_array_elements(t -> 'nachfassen' -> 'zeilen') z),
  '00000000-0000-0000-0000-0000000014f1', 'Offerte nachfassen (nur meine)');
select ok((select bool_or(z ->> 'id' = '00000000-0000-0000-0000-0000000014e2') from tag, jsonb_array_elements(t -> 'neue_leads' -> 'zeilen') z),
  'neuer Lead ohne Zuständige am eigenen Standort');
select ok((select bool_or(z ->> 'titel' = 'Tina Tagesprobe' and (z ->> 'ueberfaellig')::boolean and (z ->> 'betrag_rappen')::int = 900000)
             from tag, jsonb_array_elements(t -> 'zahlungen' -> 'zeilen') z), 'überfällige Zahlung im eigenen Projekt');
select ok((select bool_or(z ->> 'id' = '00000000-0000-0000-0000-000000001421' and z ->> 'prioritaet' = 'hoch')
             from tag, jsonb_array_elements(t -> 'service' -> 'zeilen') z), 'eigener Service-Fall');
select ok((select bool_or(z ->> 'art' = 'kontrolle' and z ->> 'id' = '00000000-0000-0000-0000-000000001401')
             from tag, jsonb_array_elements(t -> 'kontrollen' -> 'zeilen') z), 'Kontrolle der Anlage in 10 Tagen');

-- Kennzahlen mit Detail-Zeilen
create temp table fakt on commit drop as select * from public.kennzahlen_fakten(current_date - 30, current_date);
select is((select standort || ' ' || betrag_rappen from fakt where schluessel = 'gesendet' and id = '00000000-0000-0000-0000-0000000014f1'),
  'bulle 2000000', 'gesendete Offerte mit Standort und Betrag');
select ok(exists (select 1 from fakt where schluessel = 'nf_faellig' and id = '00000000-0000-0000-0000-0000000014f1'), 'Nachfassen fällig gezählt');
select ok(exists (select 1 from fakt where schluessel = 'termine' and id = '00000000-0000-0000-0000-0000000014e1'), 'Kundentermin gezählt');
select is((select betrag_rappen from fakt where schluessel = 'zahlung_ueberfaellig' and id = '00000000-0000-0000-0000-000000001401'),
  900000::bigint, 'überfällige Zahlung');
select ok(exists (select 1 from fakt where schluessel = 'faelle_offen' and id = '00000000-0000-0000-0000-000000001421'), 'offener Service-Fall');
select is((select count(*)::int from fakt where schluessel = 'quelle_offerte' and quelle = 'test14'), 1, 'Lead-Quelle bis zur Offerte verfolgt');

-- Kosten pro Lead-Quelle
select lives_ok($$ select public.kennzahlen_quellen_kosten('test14', 5000) $$, 'Kosten pro Lead setzen');
select throws_ok($$ select public.kennzahlen_quellen_kosten('test14', -1) $$, 'P0001', 'kennzahlen.kosten_ungueltig', 'negative Kosten abgelehnt');

-- Betrieb: Auftragsbestand, Marge ohne Recht nicht dabei
create temp table betrieb on commit drop as select public.kennzahlen_betrieb(current_date - 30, current_date) as b;
select is((select (x ->> 'rest_rappen')::bigint from betrieb, jsonb_array_elements(b -> 'auftragsbestand') x
            where x ->> 'id' = '00000000-0000-0000-0000-000000001401'), 2100000::bigint, 'Auftragsbestand: Vertrag minus verrechnet');
select ok((select not (b ? 'marge') from betrieb), 'Marge nur mit Recht preise oder finanzen');
select is((select (z ->> 'gebucht')::numeric from betrieb, jsonb_array_elements(b -> 'auslastung' -> 'wochen' -> 1 -> 'zellen') z
            where z ->> 'person' = '00000000-0000-0000-0000-0000000014b3'), 3::numeric, 'Auslastung: drei Einsatztage nächste Woche');
reset role;
select is((select wert -> 'quellen_kosten_rappen' -> 'test14' from public.einstellungen where schluessel = 'kennzahlen'),
  '5000'::jsonb, 'Kosten gespeichert');

-- Als Adam (Administration)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000014a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000014a2', true);
select is((select z ->> 'unter' from jsonb_array_elements(public.heute_fuer_mich() -> 'vergeben' -> 'zeilen') z
            where z ->> 'titel' = 'Rückruf Tina'), 'Vera Verkauf', 'von mir vergeben: mit Name der Person');

select * from finish();
rollback;
