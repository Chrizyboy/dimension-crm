-- Prüft Kunden Schritt 2 (Entscheid 0045): neue Felder am Kunden und Gebäude, Doppelte zusammenführen
-- (nur Administration, alles umgehängt auch bei gestellter Rechnung, Ansprechpersonen ohne Doppelte,
-- leere Felder ergänzt, Doppelter im Papierkorb, Eintrag im Verlauf).
-- Ausführen: npm run db:test
begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000042a1', 'p42-admin@test.local'),
  ('00000000-0000-0000-0000-0000000042a2', 'p42-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000042b1', 'p42_admin', 'Ada Admin', '00000000-0000-0000-0000-0000000042a1', 'admin', '{admin}', 'de'),
  ('00000000-0000-0000-0000-0000000042b2', 'p42_vk', 'Vera Verkauf', '00000000-0000-0000-0000-0000000042a2', 'verkauf', '{}', 'de');

-- Behalten (K1, Firma), doppelt (K2, gleiche Firma mit Telefon und Mail), eine Person (K3) an beiden.
insert into public.kontakte (id, art, kontaktart, firma, nachname, email, telefon, werbesperre, uid_nr) values
  ('00000000-0000-0000-0000-0000000042c1', 'firma', 'gewerbe', 'Muster AG', null, null, null, false, null),
  ('00000000-0000-0000-0000-0000000042c2', 'firma', 'gewerbe', 'Muster AG', null, 'info@muster.test', '+41 26 000 00 00', true, 'CHE-111.222.333'),
  ('00000000-0000-0000-0000-0000000042c3', 'person', 'privat', null, 'Beispiel', null, null, false, null);
insert into public.kontakt_zugehoerigkeiten (person_id, firma_id, hauptkontakt) values
  ('00000000-0000-0000-0000-0000000042c3', '00000000-0000-0000-0000-0000000042c1', true),
  ('00000000-0000-0000-0000-0000000042c3', '00000000-0000-0000-0000-0000000042c2', true);

-- Neue Felder
update public.kontakte set betreuer_id = '00000000-0000-0000-0000-0000000042b1', herkunft = 'messe',
  rechnungsadresse = '{"name": "Muster AG Buchhaltung", "strasse": "Weg 1", "plz": "1630", "ort": "Bulle"}', zahlungsfrist_tage = 10
 where id = '00000000-0000-0000-0000-0000000042c1';
select is((select zahlungsfrist_tage from public.kontakte where id = '00000000-0000-0000-0000-0000000042c1'), 10, 'eigene Zahlungsfrist');
select throws_ok($$update public.kontakte set zahlungsfrist_tage = 500 where id = '00000000-0000-0000-0000-0000000042c1'$$,
  '23514', null, 'Zahlungsfrist höchstens 120 Tage');
insert into public.objekte (id, kontakt_id, ort, vor_ort, heizung) values
  ('00000000-0000-0000-0000-0000000042e1', '00000000-0000-0000-0000-0000000042c2', 'Bulle', 'Schlüssel beim Hauswart', 'Öl');
select is((select vor_ort from public.objekte where id = '00000000-0000-0000-0000-0000000042e1'), 'Schlüssel beim Hauswart',
  'Vor-Ort-Hinweis am Gebäude');

-- Am Doppelten: gestellte Rechnung, Aufgabe
insert into public.rechnungen (id, art, status, kontakt_id, firma_id, titel, positionen, inkl_mwst, faellig_am)
values ('00000000-0000-0000-0000-0000000042f1', 'teilzahlung', 'gestellt', '00000000-0000-0000-0000-0000000042c2',
        (select id from public.firmen limit 1), 'Test 42', '[{"text": "Tranche", "preis_rappen": 100000}]', true, current_date);
insert into public.aufgaben (id, titel, bezug_tabelle, bezug_id) values
  ('00000000-0000-0000-0000-0000000042a9', 'Rückruf', 'kontakte', '00000000-0000-0000-0000-0000000042c2');
select throws_ok($$update public.rechnungen set kontakt_id = '00000000-0000-0000-0000-0000000042c1'
  where id = '00000000-0000-0000-0000-0000000042f1'$$, 'P0001', 'finanzen.rechnung_gestellt',
  'gestellte Rechnung behält sonst ihren Kunden');

-- Verkauf darf nicht zusammenführen
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000042a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000042a2', true);
select throws_ok($$select public.kontakt_zusammenfuehren('00000000-0000-0000-0000-0000000042c1', '00000000-0000-0000-0000-0000000042c2')$$,
  '42501', 'kunden.zusammenfuehren_kein_recht', 'nur Administration führt zusammen');

-- Administration
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000042a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000042a1', true);
select ok(public.kontakt_zusammenfuehren('00000000-0000-0000-0000-0000000042c1', '00000000-0000-0000-0000-0000000042c2') >= 3,
  'zusammengeführt, Einträge umgehängt');
reset role;

select is((select kontakt_id from public.rechnungen where id = '00000000-0000-0000-0000-0000000042f1'),
  '00000000-0000-0000-0000-0000000042c1'::uuid, 'gestellte Rechnung hängt am Behaltenen');
select is((select kontakt_id from public.objekte where id = '00000000-0000-0000-0000-0000000042e1'),
  '00000000-0000-0000-0000-0000000042c1'::uuid, 'Gebäude hängt am Behaltenen');
select is((select bezug_id from public.aufgaben where id = '00000000-0000-0000-0000-0000000042a9'),
  '00000000-0000-0000-0000-0000000042c1'::uuid, 'Aufgabe hängt am Behaltenen');
select is((select count(*)::int from public.kontakt_zugehoerigkeiten
            where person_id = '00000000-0000-0000-0000-0000000042c3' and geloescht_am is null), 1,
  'Ansprechperson nur einmal');
select is((select email || ' | ' || uid_nr || ' | ' || werbesperre from public.kontakte where id = '00000000-0000-0000-0000-0000000042c1'),
  'info@muster.test | CHE-111.222.333 | true', 'leere Felder ergänzt, Werbesperre übernommen');
select is((select zusammengefuehrt_in from public.kontakte where id = '00000000-0000-0000-0000-0000000042c2' and geloescht_am is not null),
  '00000000-0000-0000-0000-0000000042c1'::uuid, 'Doppelter im Papierkorb, nicht gelöscht');
select is((select count(*)::int from public.aktivitaeten where kontakt_id = '00000000-0000-0000-0000-0000000042c1' and art = 'aenderung'),
  1, 'im Verlauf festgehalten');
select is(current_setting('intern.zusammenfuehren', true), '', 'Merkmal danach wieder aus');

select * from finish();
rollback;
