-- Prüft das Datenmodell aus Phase 3: Jede Fachtabelle hat Papierkorb, Protokoll und RLS,
-- die Konfiguration ist vorhanden, und die Rechte greifen (Finanzen nur mit Recht).
-- Ausführen: npm run db:test
begin;
select plan(17);

-- Alle Tabellen mit geloescht_am sind Fachtabellen und müssen vollständig eingerichtet sein.
create temp table fach on commit drop as
  select c.oid, c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'geloescht_am' and not a.attisdropped);

select cmp_ok((select count(*) from fach), '>=', 60::bigint, 'mindestens 60 Fachtabellen angelegt');
select is((select count(*) from fach where not exists (
  select 1 from pg_class c where c.oid = fach.oid and c.relrowsecurity)), 0::bigint, 'jede Fachtabelle hat RLS');
select is((select count(*) from fach where not exists (
  select 1 from pg_trigger t where t.tgrelid = fach.oid and t.tgname = 'protokoll')), 0::bigint, 'jede Fachtabelle hat den Protokoll-Trigger');
select is((select count(*) from fach where not exists (
  select 1 from pg_trigger t where t.tgrelid = fach.oid and t.tgname = 'geaendert')), 0::bigint, 'jede Fachtabelle hat den geaendert_am-Trigger');
select is((select count(*) from pg_policies where schemaname = 'public' and cmd = 'DELETE'), 0::bigint,
  'keine Tabelle erlaubt hartes Löschen aus der App');
select is((select count(*) from fach where not exists (
  select 1 from pg_attribute a where a.attrelid = fach.oid and a.attname = 'alt_daten')), 0::bigint, 'jede Fachtabelle kann den alten Datensatz aufnehmen');

-- Konfiguration als Daten
select is((select count(*) from public.firmen), 2::bigint, 'zwei Firmen (GmbH Muri, Sàrl Bulle)');
select results_eq($$ select s.kuerzel from public.lagerorte l join public.standorte s on s.id = l.standort_id $$,
  array['bulle'], 'eigenes Lager nur in Bulle');
select is((select count(*) from public.ablauf_vorlagen), 4::bigint, 'Abläufe für PV, Wärmepumpe, Speicher, Wallbox');
select is((select count(*) from public.ablauf_schritte s join public.ablauf_vorlagen v on v.id = s.ablauf_vorlage_id where v.schluessel = 'pv'),
  20::bigint, 'PV-Ablauf hat die 20 Schritte des V233-Fahrplans');
select is((select count(*) from public.auswahlwerte where liste = 'verkaufsstufe'), 7::bigint, 'sieben Verkaufsstufen');
select ok((select count(*) from public.lieferanten where name in ('Krannich', 'Solarmarkt', 'Tritec', 'PM Green')) = 4, 'die vier Hauptlieferanten sind angelegt');

-- Rechte: eine Person ohne Recht «finanzen» sieht keine Kreditoren, eine mit Recht schon.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'dm-verkauf@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'dm-finanzen@test.local');
insert into public.personen (kuerzel, name, auth_user_id, rechte) values
  ('test_verkauf', 'Test Verkauf', '00000000-0000-0000-0000-0000000000a1', '{}'),
  ('test_finanzen', 'Test Finanzen', '00000000-0000-0000-0000-0000000000a2', '{finanzen}');
insert into public.kreditor_zahlungen (firma, betrag_rappen) values ('Testlieferant', 12345);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
select is((select count(*) from public.kreditor_zahlungen), 0::bigint, 'ohne Recht «finanzen» keine Kreditoren sichtbar');
select cmp_ok((select count(*) from public.firmen), '=', 2::bigint, 'Grunddaten sind für alle Mitarbeitenden sichtbar');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}', true);
select ok((select count(*) from public.kreditor_zahlungen) >= 1, 'mit Recht «finanzen» sichtbar');
reset role;

set local role anon;
select is((select count(*) from public.kontakte), 0::bigint, 'ohne Anmeldung keine Kontakte');
reset role;

-- Kundennummer läuft weiter, auch nach einem Import mit hohen Nummern. Die Nummer liegt über allem,
-- was lokal schon steht (Import, Browser-Tests), damit der Test in jeder Datenbank gleich läuft.
-- Sequenzen kennen kein Rollback: den Stand merken und am Ende zurücksetzen.
create temporary table t_seq as select last_value, is_called from public.kundennummer_seq;
create temporary table t_hoch as select coalesce(max(kundennummer), 0) + 1000 as nr from public.kontakte;
insert into public.kontakte (kundennummer, nachname) select nr, 'Import' from t_hoch;
select public.setze_naechste_kundennummer(1);
insert into public.kontakte (nachname) values ('Neu');
select is((select kundennummer from public.kontakte where nachname = 'Neu'), (select nr + 1 from t_hoch),
  'nächste Kundennummer folgt auf die höchste');
select setval('public.kundennummer_seq', last_value, is_called) from t_seq;

select * from finish();
rollback;
