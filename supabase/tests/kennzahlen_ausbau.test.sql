-- Prüft den Ausbau der Kennzahlen (Entscheid 0045): Zusatz-Fakten (Auftrag mit kWp und Produkten, Durchlaufzeiten,
-- Verlustgrund, IBN, Umsatz aus gestellten Rechnungen nur mit Recht, Service-Reaktion, Wartung), Ziele und
-- Wahrscheinlichkeiten nur mit Recht «finanzen» und geprüft, Monatsbericht einmal am 1. für die Finanz-Personen.
-- Die lokale Datenbank enthält importierte Daten: geprüft wird deshalb, ob die Testdatensätze enthalten sind.
-- Ausführen: npm run db:test
begin;
set local timezone = 'Europe/Zurich';
select plan(23);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'k39-vk@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'k39-bh@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, standort_id) values
  ('00000000-0000-0000-0000-0000000039b1', 'k39_vk', 'Vera Verkauf', '00000000-0000-0000-0000-0000000039a1', 'verkauf',
   (select id from public.standorte where kuerzel = 'bulle')),
  ('00000000-0000-0000-0000-0000000039b2', 'k39_bh', 'Berta Buchhaltung', '00000000-0000-0000-0000-0000000039a2',
   'buchhaltung', null);
insert into public.kontakte (id, art, kontaktart, vorname, nachname, telefon, sprache) values
  ('00000000-0000-0000-0000-0000000039c1', 'person', 'privat', 'Karl', 'Kennzahl', '+41790003901', 'fr');
insert into public.objekte (id, kontakt_id, strasse, plz, ort) values
  ('00000000-0000-0000-0000-0000000039d1', '00000000-0000-0000-0000-0000000039c1', 'Rue du Test 9', '1630', 'Bulle');

-- Lead vor 30 Tagen, Termin vor 20 Tagen, Interesse PV + Wallbox.
insert into public.verkaufschancen (id, kontakt_id, objekt_id, stufe, quelle, tour_person_id, eingang_am, termin_am,
                                    standort_id, interesse) values
  ('00000000-0000-0000-0000-0000000039e1', '00000000-0000-0000-0000-0000000039c1', '00000000-0000-0000-0000-0000000039d1',
   'neu', 'test39', '00000000-0000-0000-0000-0000000039b1', current_date - 30, current_date - 20 + time '10:00',
   (select id from public.standorte where kuerzel = 'bulle'), '{pv,wallbox}');
-- Offerte vor 10 Tagen gesendet, angenommen; zweite Offerte verloren mit Grund.
insert into public.offerten (id, nummer, kontakt_id, verkaufschance_id, status, angebot_am, entscheid_am, betrag_rappen,
                             verantwortlich_id, standort_id, leistung_kwp, batterie, verlustgrund) values
  ('00000000-0000-0000-0000-0000000039f1', 'T39-1', '00000000-0000-0000-0000-0000000039c1',
   '00000000-0000-0000-0000-0000000039e1', 'angenommen', current_date - 10, current_date - 4, 2000000,
   '00000000-0000-0000-0000-0000000039b1', (select id from public.standorte where kuerzel = 'bulle'), 12.4, 'Speicher 10 kWh', null),
  ('00000000-0000-0000-0000-0000000039f2', 'T39-2', '00000000-0000-0000-0000-0000000039c1', null, 'verloren',
   current_date - 15, current_date - 2, 3000000, '00000000-0000-0000-0000-0000000039b1',
   (select id from public.standorte where kuerzel = 'bulle'), 20, null, 'Preis');
-- Projekt vor 4 Tagen unterschrieben, Baubeginn gestern, IBN heute mit 12.4 kWp.
insert into public.projekte (id, nummer, kontakt_id, objekt_id, offerte_id, status, standort_id, vertragswert_rappen,
                             verantwortlich_id, unterzeichnet_am, baubeginn) values
  ('00000000-0000-0000-0000-000000003901', 'T39-P1', '00000000-0000-0000-0000-0000000039c1',
   '00000000-0000-0000-0000-0000000039d1', '00000000-0000-0000-0000-0000000039f1', 'im_bau',
   (select id from public.standorte where kuerzel = 'bulle'), 2162000, '00000000-0000-0000-0000-0000000039b1',
   current_date - 4, current_date - 1);
insert into public.anlagen (objekt_id, projekt_id, ibn_am, leistung_kwp) values
  ('00000000-0000-0000-0000-0000000039d1', '00000000-0000-0000-0000-000000003901', current_date, 12.4);
-- Gestellte Rechnung (exkl. 10'000, total 10'810), noch offen; ein Entwurf zählt nicht.
insert into public.rechnungen (id, art, status, kontakt_id, firma_id, titel, positionen, mwst_satz,
                               datum, faellig_am, projekt_id) values
  ('00000000-0000-0000-0000-000000003911', 'anzahlung', 'gestellt', '00000000-0000-0000-0000-0000000039c1',
   (select firma_id from public.standorte where kuerzel = 'bulle'), 'Acompte',
   '[{"text": "Acompte", "menge": 1, "preis_rappen": 1000000}]', 8.1,
   current_date - 3, current_date + 27, '00000000-0000-0000-0000-000000003901'),
  ('00000000-0000-0000-0000-000000003912', 'frei', 'entwurf', '00000000-0000-0000-0000-0000000039c1',
   (select firma_id from public.standorte where kuerzel = 'bulle'), 'Entwurf',
   '[{"text": "Entwurf", "menge": 1, "preis_rappen": 500000}]', 8.1,
   current_date, null, null);
-- Service-Fall mit Termin innerhalb der Reaktionszeit.
insert into public.service_faelle (id, nummer, titel, kontakt_id, person_id, prioritaet, komponente, termin_am) values
  ('00000000-0000-0000-0000-000000003921', '', 'Wechselrichter aus', '00000000-0000-0000-0000-0000000039c1',
   '00000000-0000-0000-0000-0000000039b1', 'hoch', 'wechselrichter', now() + interval '1 day');
-- Aktiver Wartungsvertrag, heute begonnen.
insert into public.wartungsvertraege (id, kontakt_id, status, paket, start_am, preis_netto_rappen, anlage_kwp) values
  ('00000000-0000-0000-0000-000000003931', '00000000-0000-0000-0000-0000000039c1', 'aktiv', 'comfort', current_date,
   34900, 12.4);

-- Anonym: nichts
set local role anon;
select throws_ok($$ select * from public.kennzahlen_zusatz(current_date - 30, current_date) $$, '42501', null,
  'Zusatz-Kennzahlen nicht anonym');
reset role;

-- Als Vera (Verkauf): Fakten ohne Rechnungen
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a1', true);
create temp table z on commit drop as select * from public.kennzahlen_zusatz(current_date - 60, current_date);

select is((select kwp from z where schluessel = 'auftrag' and id = '00000000-0000-0000-0000-0000000039f1'), 12.4::numeric,
  'Auftrag mit kWp');
select is((select zusatz from z where schluessel = 'auftrag' and id = '00000000-0000-0000-0000-0000000039f1'),
  'batterie,pv,wallbox', 'Produkte aus Lead-Interesse und Batterie der Offerte');
select is((select tage from z where schluessel = 'auftrag' and id = '00000000-0000-0000-0000-0000000039f1'), 6,
  'Offerte → Auftrag in Tagen (bis Unterschrift)');
select is((select betrag_rappen from z where schluessel = 'auftrag' and id = '00000000-0000-0000-0000-0000000039f1'),
  2162000::bigint, 'Auftragswert = Vertragswert inkl. MWST');
select is((select tage from z where schluessel = 'dauer_termin' and id = '00000000-0000-0000-0000-0000000039e1'), 10,
  'Lead → Termin 10 Tage');
select is((select tage from z where schluessel = 'dauer_offerte' and id = '00000000-0000-0000-0000-0000000039f1'), 10,
  'Termin → Offerte 10 Tage');
select is((select zusatz from z where schluessel = 'verlust' and id = '00000000-0000-0000-0000-0000000039f2'), 'Preis',
  'Verlustgrund');
select is((select tage from z where schluessel = 'baubeginn' and id = '00000000-0000-0000-0000-000000003901'), 3,
  'Unterschrift → Baubeginn');
select is((select (kwp, tage)::text from z where schluessel = 'ibn' and id = '00000000-0000-0000-0000-000000003901'),
  '(12.400,4)', 'IBN mit kWp und Tagen ab Unterschrift');
select ok(exists (select 1 from z where schluessel = 'projekt_stand' and id = '00000000-0000-0000-0000-000000003901'),
  'offenes Projekt im Stand');
select is((select split_part(zusatz, '|', 2) from z where schluessel = 'fall_neu'
            and id = '00000000-0000-0000-0000-000000003921'), 'ok', 'Reaktion eingehalten (Termin vor Frist)');
select is((select zusatz from z where schluessel = 'wartung_aktiv' and id = '00000000-0000-0000-0000-000000003931'),
  'comfort', 'aktiver Wartungsvertrag mit Paket');
select is((select count(*)::int from z where art = 'rechnung'), 0, 'Verkauf sieht keine Rechnungen');
select throws_ok($$ select public.kennzahlen_einstellungen_setzen('{"ziele": {"2026": {"gesamt": 100}}}') $$, '42501',
  'kennzahlen.kein_recht', 'Ziele nur mit Recht finanzen');
reset role;

-- Als Berta (Buchhaltung, Recht finanzen)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a2', true);
create temp table zb on commit drop as select * from public.kennzahlen_zusatz(current_date - 60, current_date);
select is((select betrag_rappen from zb where schluessel = 'umsatz' and id = '00000000-0000-0000-0000-000000003911'),
  1000000::bigint, 'Umsatz = gestellte Rechnung exkl. MWST');
select ok(not exists (select 1 from zb where id = '00000000-0000-0000-0000-000000003912'), 'Entwurf zählt nicht');
select is((select (betrag_rappen, zusatz)::text from zb where schluessel = 'rechnung_offen'
            and id = '00000000-0000-0000-0000-000000003911'), '(1081000,0)', 'offen = Total, Mahnstufe 0');
select lives_ok($$ select public.kennzahlen_einstellungen_setzen(
  '{"ziele": {"2026": {"gesamt": 360000000, "personen": {"00000000-0000-0000-0000-0000000039b1": 70000000}}},
    "wahrscheinlichkeit": {"offeriert": 40, "nachfassen": 20, "vertagt": 10, "alt": 5}}') $$, 'Ziele und Wahrscheinlichkeit setzen');
select throws_ok($$ select public.kennzahlen_einstellungen_setzen('{"wahrscheinlichkeit": {"offeriert": 140}}') $$,
  'P0001', 'kennzahlen.wert_ungueltig', 'Wahrscheinlichkeit über 100 abgelehnt');
select throws_ok($$ select public.kennzahlen_einstellungen_setzen('{"quellen_kosten_rappen": {}}') $$,
  'P0001', 'kennzahlen.schluessel_ungueltig', 'fremde Schlüssel abgelehnt');
reset role;

select is((select wert #>> '{ziele,2026,personen,00000000-0000-0000-0000-0000000039b1}' from public.einstellungen
            where schluessel = 'kennzahlen'), '70000000', 'Ziel je Person gespeichert');

-- Monatsbericht: nur am 1. (Rückgabe 0 an anderen Tagen), sonst eine Glocke je Finanz-Person.
select is(public.kennzahlen_monatsbericht_melden(),
  case when extract(day from (now() at time zone 'Europe/Zurich')) = 1
       then (select count(*)::int from public.benachrichtigungen where titel_de like 'Monatsbericht%'
               and erstellt_am >= now() - interval '1 minute')
       else 0 end,
  'Monatsbericht nur am 1. des Monats');

select * from finish();
rollback;
