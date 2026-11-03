-- Prüft das Adressbuch der Geschäftspartner: Rollen mit Angaben, Verbindung zu Lieferanten/Subunternehmern,
-- Liste nur mit Partnern, Akte, Doppelte, Netzbetreiber je Gemeinde (ElCom), Provision für Vermittler und
-- Fristen der Nachweise. Entscheid 0049. Ausführen: npm run db:test
begin;
select plan(19);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000049a1', 'ab-admin@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000049b1', 'ab_admin', 'Ada Adressbuch', '00000000-0000-0000-0000-0000000049a1', 'admin', '{}', 'de');
insert into public.kontakte (id, art, kontaktart, firma, email, telefon, sprache) values
  ('00000000-0000-0000-0000-0000000049c1', 'firma', 'firma', 'Beispiel Netz AG', 'netz@beispiel.test', null, 'de'),
  ('00000000-0000-0000-0000-0000000049c2', 'firma', 'firma', 'Muster Solarhandel GmbH', 'shop@muster.test', '+41 32 000 00 20', 'de'),
  ('00000000-0000-0000-0000-0000000049c3', 'firma', 'firma', 'Vermittlung Vogt', 'vogt@beispiel.test', null, 'de');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000049c4', 'person', 'privat', 'Karl', 'Kunde', 'de'),
  ('00000000-0000-0000-0000-0000000049c5', 'person', 'privat', 'Paula', 'Partner', 'de');

-- 1. Rollen ---------------------------------------------------------------------------------------------------
insert into public.kontakt_rollen (kontakt_id, rolle, angaben) values
  ('00000000-0000-0000-0000-0000000049c2', 'lieferant', '{"kundennummer": "K-778", "bestell_email": "bestellung@muster.test"}');
select is((select kundennummer_bei_lieferant || ' ' || email_bestellung from public.lieferanten
            where kontakt_id = '00000000-0000-0000-0000-0000000049c2'),
  'K-778 bestellung@muster.test', 'Rolle Lieferant legt den Lieferanten für den Einkauf an');
select throws_ok($$ insert into public.kontakt_rollen (kontakt_id, rolle) values
  ('00000000-0000-0000-0000-0000000049c2', 'lieferant') $$, '23505', null, 'Jede Rolle nur einmal pro Partner');
insert into public.kontakt_rollen (kontakt_id, rolle) values ('00000000-0000-0000-0000-0000000049c2', 'subunternehmer');
select ok(exists (select 1 from public.subunternehmer where kontakt_id = '00000000-0000-0000-0000-0000000049c2'),
  'Rolle Subunternehmer legt den Subunternehmer an');

insert into public.partner_angaben (kontakt_id, strasse, plz, ort, uid_nr) values
  ('00000000-0000-0000-0000-0000000049c2', 'Werkstrasse 4', '1630', 'Bulle', 'CHE-000.000.045');
insert into public.kontakt_zugehoerigkeiten (person_id, firma_id, funktion, hauptkontakt) values
  ('00000000-0000-0000-0000-0000000049c5', '00000000-0000-0000-0000-0000000049c2', 'Innendienst', true);

-- 2. Liste und Akte -------------------------------------------------------------------------------------------
select is((select rollen from public.adressbuch_uebersicht where id = '00000000-0000-0000-0000-0000000049c2'),
  array['lieferant', 'subunternehmer'], 'Liste zeigt die Rollen in fester Reihenfolge');
select is((select ort || ' / ' || hauptkontakt || ' / ' || kundennummer_bei from public.adressbuch_uebersicht
            where id = '00000000-0000-0000-0000-0000000049c2'),
  'Bulle / Paula Partner / K-778', 'Liste zeigt Ort, Hauptkontakt und unsere Kundennummer');
select ok(not exists (select 1 from public.adressbuch_uebersicht where id = '00000000-0000-0000-0000-0000000049c4'),
  'Kunden ohne Rolle stehen nicht im Adressbuch');

-- 3. Doppelte -------------------------------------------------------------------------------------------------
select is((select grund from public.partner_dubletten('Muster Solarhandel', null, null, 'CHE-000.000.045')),
  'uid', 'Doppelte: gleiche UID');
select is((select id from public.partner_dubletten('Solarhandel Muster AG')),
  '00000000-0000-0000-0000-0000000049c2'::uuid, 'Doppelte: Name ohne Rechtsform, Wörter vertauscht');

-- 4. Netzbetreiber je Gemeinde --------------------------------------------------------------------------------
select is(public.netzbetreiber_verzeichnis_speichern(
  '[{"bfs_nr": 4236, "gemeinde": "Muri (AG)", "elcom_id": "999", "netzbetreiber": "Beispiel Netz AG"},
    {"bfs_nr": 2125, "gemeinde": "Bulle", "elcom_id": "998", "netzbetreiber": "Netz Greyerz"},
    {"bfs_nr": 2125, "gemeinde": "Bulle", "elcom_id": "997", "netzbetreiber": "Zweitnetz SA"}]', 2026), 3,
  'ElCom-Verzeichnis eingelesen');
select throws_ok($$ select public.netzbetreiber_verzeichnis_speichern('[]', 2026) $$, 'P0001', 'adressbuch.elcom_leer',
  'Leeres Verzeichnis ersetzt nichts');
select public.plz_gemeinden_speichern('[{"plz": "5630", "bfs_nr": 4236, "gemeinde": "Muri (AG)"},
                                        {"plz": "1630", "bfs_nr": 2125, "gemeinde": "Bulle"}]');
insert into public.kontakt_rollen (kontakt_id, rolle, angaben) values
  ('00000000-0000-0000-0000-0000000049c1', 'netzbetreiber', '{"elcom_id": "999", "antwort_tage": 20}');
select is((select kontakt_id from public.netzbetreiber_fuer('5630')), '00000000-0000-0000-0000-0000000049c1'::uuid,
  'Netzbetreiber über die PLZ gefunden, mit Partner im Adressbuch');

insert into public.objekte (id, kontakt_id, plz, ort) values
  ('00000000-0000-0000-0000-0000000049d1', '00000000-0000-0000-0000-0000000049c4', '5630', 'Muri AG'),
  ('00000000-0000-0000-0000-0000000049d2', '00000000-0000-0000-0000-0000000049c4', '1630', 'Bulle');
select is((select netzbetreiber from public.objekte where id = '00000000-0000-0000-0000-0000000049d1'), 'Beispiel Netz AG',
  'Neues Gebäude bekommt den Netzbetreiber automatisch');
select is((select netzbetreiber from public.objekte where id = '00000000-0000-0000-0000-0000000049d2'), null,
  'Zwei mögliche Netzbetreiber: bleibt leer zur Auswahl');
select is(public.netzbetreiber_zuordnen() ->> 'neu', '2', 'Zuordnen legt die fehlenden Netzbetreiber als Partner an');

insert into public.projekte (id, nummer, kontakt_id, objekt_id, titel) values
  ('00000000-0000-0000-0000-0000000049e1', 'P9451', '00000000-0000-0000-0000-0000000049c4', '00000000-0000-0000-0000-0000000049d1', 'PV Karl');
insert into public.projekt_schritte (projekt_id, schluessel, stand, eingereicht_am) values
  ('00000000-0000-0000-0000-0000000049e1', 'netz', 'offen', current_date - 20);
select is((select gesuche_offen || ':' || gesuche_alt || ':' || gemeinden from public.adressbuch_uebersicht
            where id = '00000000-0000-0000-0000-0000000049c1'),
  '1:1:1', 'Netzbetreiber: offenes Gesuch, länger als 15 Tage, eine Gemeinde');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000049a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000049a1', true);
select is(jsonb_array_length(public.partner_akte('00000000-0000-0000-0000-0000000049c1') -> 'gesuche'), 1,
  'Akte zeigt das offene Gesuch');
reset role;

-- 5. Provision für Vermittler ---------------------------------------------------------------------------------
insert into public.kontakt_rollen (kontakt_id, rolle, angaben) values
  ('00000000-0000-0000-0000-0000000049c3', 'vermittler', '{"provision_prozent": 3}');
insert into public.verkaufschancen (id, kontakt_id, quelle, empfohlen_von) values
  ('00000000-0000-0000-0000-0000000049f1', '00000000-0000-0000-0000-0000000049c4', 'empfehlung', '00000000-0000-0000-0000-0000000049c3');
insert into public.projekte (id, nummer, kontakt_id, verkaufschance_id, titel, vertragswert_rappen) values
  ('00000000-0000-0000-0000-0000000049e2', 'P9452', '00000000-0000-0000-0000-0000000049c4', '00000000-0000-0000-0000-0000000049f1',
   'PV Karl Vermittlung', 3243000);
update public.projekte set unterzeichnet_am = current_date where id = '00000000-0000-0000-0000-0000000049e2';
select is((select status || ':' || gutschrift_rappen from public.empfehlungen
            where verkaufschance_id = '00000000-0000-0000-0000-0000000049f1'),
  'auftrag:' || round(3243000 / (1 + public.mwst_satz() / 100) * 3 / 100)::bigint,
  'Vertrag unterschrieben: Provision 3 % vom Wert exkl. MWST vorgemerkt');

insert into public.rechnungen (id, art, status, kontakt_id, firma_id, projekt_id, titel, positionen, inkl_mwst, faellig_am)
values ('00000000-0000-0000-0000-0000000049f2', 'schluss', 'gestellt', '00000000-0000-0000-0000-0000000049c4',
        (select id from public.firmen limit 1), '00000000-0000-0000-0000-0000000049e2', 'Schlussrechnung',
        '[{"text": "Rest", "preis_rappen": 100000}]', true, current_date);
insert into public.rechnung_zahlungen (rechnung_id, betrag_rappen) values ('00000000-0000-0000-0000-0000000049f2', 100000);
select ok(exists (select 1 from public.aufgaben where bezug_tabelle = 'empfehlungen'
                   and titel like 'Provision auszahlen: Vermittlung Vogt%'),
  'Schlussrechnung bezahlt: Aufgabe «Provision auszahlen»');

-- 6. Fristen der Nachweise ------------------------------------------------------------------------------------
insert into public.partner_nachweise (kontakt_id, art, gueltig_bis) values
  ('00000000-0000-0000-0000-0000000049c2', 'haftpflicht', current_date + 10),
  ('00000000-0000-0000-0000-0000000049c2', 'suva', current_date + 200);
select is(public.partner_fristen_melden() >= 1 and public.partner_fristen_melden() = 0, true,
  'Ablaufender Nachweis wird einmal gemeldet, der ferne nicht');

select * from finish();
rollback;
