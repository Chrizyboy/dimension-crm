-- Prüft Phase 8c: Grossprojekt-Monitor für Contracting. Punkte und Ausschlüsse, Schätzung, Treffer aus Meldungen des
-- Ausschreibungs-Monitors, von Hand erfassen, Gebäudedaten (von Hand Eingetragenes bleibt), Stand nur über die Abläufe,
-- Bewilligen nur Andy/Vertretung mit Lead, Verwerfen mit Grund, Wiedervorlage und Glocke einmal pro Treffer.
-- Ausführen: npm run db:test
begin;
select plan(31);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000008c1', 'gp-andy@test.local'),
  ('00000000-0000-0000-0000-0000000008c2', 'gp-vera@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000008d1', 'gp_andy', 'Andy Test', '00000000-0000-0000-0000-0000000008c1', 'mitarbeit', '{}'),
  ('00000000-0000-0000-0000-0000000008d2', 'gp_vera', 'Vera Test', '00000000-0000-0000-0000-0000000008c2', 'verkauf', '{}');
update public.einstellungen set wert = wert || '{"bewilligen": ["gp_andy"], "bewilligen_vertretung": []}'
 where schluessel = 'grossprojekte';

create temporary table t (name text primary key, id uuid) on commit drop;
grant all on t to authenticated;

-- Punkte und Ausschlüsse (Server ohne Login)
with n as (insert into public.grossprojekte (titel, quell_url, plz, gemeinde, bauherr, bauherr_art, nutzung, dachflaeche_m2, stromertrag_kwh,
  heizung, heizung_jahr)
values ('Gewerbehalle Test', 'https://test/1', '5630', 'Muri AG', 'Muster Immobilien AG', 'immobilien', 'gewerbe', 1800, 330000,
  'oel', 1998)
returning id) insert into t select 'gross', id from n;
select cmp_ok((select punkte from public.grossprojekte where id = (select id from t where name = 'gross')), '>=', 80,
  'grosses Gewerbedach mit alter Ölheizung ab Muri: mindestens 80 Punkte');
select is((select art from public.grossprojekte where id = (select id from t where name = 'gross')), 'beides', 'PV und Wärme');
select matches((select nummer from public.grossprojekte where id = (select id from t where name = 'gross')), '^GP-\d{4}-\d{4}$',
  'bekommt eine GP-Nummer');
select is((select schaetzung ->> 'kwp' from public.grossprojekte where id = (select id from t where name = 'gross')), '324',
  'kWp aus der Fläche (1''800 m² × 0.18)');
select is((select (schaetzung ->> 'investition_rappen')::bigint from public.grossprojekte where id = (select id from t where name = 'gross')),
  32400000::bigint, 'Investition nach Staffel (über 300 kWp CHF 1''000 pro kWp)');
select ok((select (schaetzung ->> 'preis_rp_kwh')::numeric between 5 and 20 from public.grossprojekte
  where id = (select id from t where name = 'gross')), 'Contracting-Preis in plausibler Grösse');
select is((select fahrzeit_min is not null and standort_id is not null from public.grossprojekte
  where id = (select id from t where name = 'gross')), true, 'Fahrzeit und Standort aus der PLZ');

with n as (insert into public.grossprojekte (titel, quell_url, plz, nutzung, dachflaeche_m2, heizung) values
  ('EFH', 'x', '1630', 'efh', 120, 'oel') returning id) insert into t select 'efh', id from n;
select is((select punkte || '/' || ausschluss from public.grossprojekte where id = (select id from t where name = 'efh')), '0/efh',
  'Einfamilienhaus: 0 Punkte, ausgeschlossen');
with n as (insert into public.grossprojekte (titel, quell_url, plz, nutzung, dachflaeche_m2, geschuetzt) values
  ('Schloss', 'x', '1630', 'verwaltung', 2000, true) returning id) insert into t select 'schloss', id from n;
select is((select ausschluss from public.grossprojekte where id = (select id from t where name = 'schloss')), 'geschuetzt',
  'geschütztes Gebäude ausgeschlossen');
with n as (insert into public.grossprojekte (titel, quell_url, plz, nutzung, dachflaeche_m2) values
  ('St. Moritz', 'x', '7500', 'gewerbe', 2000) returning id) insert into t select 'genf', id from n;
select is((select ausschluss from public.grossprojekte where id = (select id from t where name = 'genf')), 'fahrzeit',
  'mehr als 2 Stunden Fahrt: ausgeschlossen');
update public.grossprojekte set heizung = 'gas', heizung_jahr = extract(year from current_date)::int - 3
 where id = (select id from t where name = 'gross');
select cmp_ok((select (d ->> 'punkte')::int from public.grossprojekte g, jsonb_array_elements(g.punkte_details) d
  where g.id = (select id from t where name = 'gross') and d ->> 'was' = 'heizung'), '<', 16, 'junge Heizung gibt weniger Punkte');

-- Treffer aus dem Ausschreibungs-Monitor
select isnt((public.ausschreibung_einlesen('{"quelle": "amtsblatt", "quell_id": "gp-b1", "art": "baugesuch",
  "titel": "Neubau Überbauung mit 24 Wohnungen", "gemeinde": "Wohlen AG", "plz": "5610",
  "bauherr": "Wohnbaugenossenschaft Test", "quell_url": "https://amtsblattportal.ch/test/gp-b1"}') ->> 'grossprojekt'), null,
  'Überbauung im Amtsblatt wird Grossprojekt');
select is((select bauherr_art || '/' || nutzung || '/' || wohnungen from public.grossprojekte where quell_id = 'gp-b1'),
  'genossenschaft/ueberbauung/24', 'Art der Bauherrschaft, Nutzung und Wohnungen aus dem Text');
select isnt((select ausschreibung_id from public.grossprojekte where quell_id = 'gp-b1'), null, 'mit Dossier des Ausschreibungs-Monitors verknüpft');
select isnt((public.ausschreibung_einlesen('{"quelle": "amtsblatt", "quell_id": "gp-b2", "art": "baugesuch",
  "titel": "Heizungsersatz Ölheizung durch Wärmepumpe, Gewerbehaus", "gemeinde": "Bulle", "plz": "1630",
  "bauherr": "Muster SA", "quell_url": "https://test/gp-b2"}') ->> 'grossprojekt'), null,
  'Heizungsersatz ohne PV-Wort wird trotzdem Grossprojekt');
select is((select heizungsersatz from public.grossprojekte where quell_id = 'gp-b2'), true, 'Heizungsersatz erkannt');
select is(public.ausschreibung_einlesen('{"quelle": "amtsblatt", "quell_id": "gp-b3", "art": "baugesuch",
  "titel": "Neubau Einfamilienhaus mit Garage", "gemeinde": "Bulle", "plz": "1630", "quell_url": "https://test/gp-b3"}') ->> 'grossprojekt',
  null, 'Einfamilienhaus wird kein Grossprojekt');
select is((select count(*)::int from public.grossprojekte where quell_id = 'gp-b1'), 1, 'gleiche Meldung nur einmal');

-- Gebäudedaten: leere Felder füllen, von Hand Eingetragenes bleibt
select public.grossprojekt_anreichern((select id from public.grossprojekte where quell_id = 'gp-b1'),
  '{"dachflaeche_m2": 1300, "dach_klasse": 4, "stromertrag_kwh": 220000, "heizung": "oel", "wohnungen": 99, "egid": "123"}', 'Test');
select is((select dachflaeche_m2 || '/' || wohnungen || '/' || egid from public.grossprojekte where quell_id = 'gp-b1'), '1300/24/123',
  'Dach ergänzt, Wohnungen aus dem Text bleiben');
select isnt((select angereichert_am from public.grossprojekte where quell_id = 'gp-b1'), null, 'Zeitpunkt der Anreicherung');

-- Als Vera (Verkauf): erfassen ja, Stand direkt ändern nein, bewilligen nein, verwerfen nur mit Grund
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000008c2", "role": "authenticated"}', true);
select throws_ok($$ select public.grossprojekt_speichern('{"titel": "Ohne Quelle"}') $$, 'P0001', 'grossprojekt.quelle_fehlt',
  'ohne Fundort wird nichts gespeichert');
insert into t select 'hand', public.grossprojekt_speichern('{"titel": "Schulhaus Test", "quell_url": "Gespräch Gemeinde",
  "plz": "1630", "gemeinde": "Bulle", "bauherr": "Commune de Test", "bauherr_art": "gemeinde", "nutzung": "schule",
  "dachflaeche_m2": "900", "heizung": "gas"}');
select is((select stand from public.grossprojekte where id = (select id from t where name = 'hand')), 'pruefen', 'von Hand erfasst: zum Prüfen');
select throws_ok($$ update public.grossprojekte set stand = 'bewilligt' where id = (select id from t where name = 'hand') $$,
  '42501', 'grossprojekt.nur_ablauf', 'Stand nie direkt über die Tabelle');
select throws_ok($$ select public.grossprojekt_entscheiden((select id from t where name = 'hand'), 'bewilligen') $$,
  '42501', 'grossprojekt.nicht_bewilligen', 'Verkauf darf nicht bewilligen');
select throws_ok($$ select public.grossprojekt_entscheiden((select id from t where name = 'hand'), 'verwerfen') $$,
  'P0001', 'grossprojekt.grund_fehlt', 'Verwerfen braucht einen Grund');
select public.grossprojekt_entscheiden((select id from t where name = 'hand'), 'beobachten',
  jsonb_build_object('wiedervorlage_am', current_date - 1, 'grund', 'Baubewilligung abwarten'));
select is((select stand from public.grossprojekte where id = (select id from t where name = 'hand')), 'beobachten', 'beobachten');

-- Als Andy: bewilligen legt den Lead an
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000008c1", "role": "authenticated"}', true);
insert into t select 'lead', public.grossprojekt_entscheiden((select id from t where name = 'hand'), 'bewilligen');
select is((select quelle || '/' || stufe from public.verkaufschancen where id = (select id from t where name = 'lead')),
  'grossprojekt/neu', 'Lead mit Quelle «Grossprojekt»');
select is((select stand || '/' || (verkaufschance_id = (select id from t where name = 'lead'))::text from public.grossprojekte
  where id = (select id from t where name = 'hand')), 'bewilligt/true', 'Grossprojekt bewilligt und mit dem Lead verknüpft');

-- Zeitplan (ohne Login): Wiedervorlage und Glocke einmal pro Treffer
reset role;
select set_config('request.jwt.claims', '', true);
update public.grossprojekte set stand = 'beobachten', wiedervorlage_am = current_date - 1 where id = (select id from t where name = 'gross');
select cmp_ok((public.grossprojekte_melden() ->> 'wieder')::int, '>=', 1, 'fällige Wiedervorlage wieder zum Prüfen');
select cmp_ok((select count(*)::int from public.benachrichtigungen
  where person_id = '00000000-0000-0000-0000-0000000008d1' and ziel = '/contracting?projekt=' || (select id from t where name = 'gross')),
  '=', 1, 'Andy bekommt starken Treffer in die Glocke');
select is((public.grossprojekte_melden() ->> 'gemeldet')::int, 0, 'zweiter Lauf meldet nichts doppelt');

select * from finish();
rollback;
