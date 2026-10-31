-- Prüft die automatische Dateiablage (Entscheid 0030): aus = nichts passiert; ein = neue Offerte bekommt einen
-- Ordner, Annahme/Verlust ändern das Ziel, Projekt hängt sich an, alte Offerten bleiben aussen vor; Ergebnis
-- verschiebt Pfade der Dateien mit; Dateien gehen in die Ablage statt ins Kunden-Backup; Rechte.
-- Ausführen: npm run db:test
begin;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000030a1', 'p30-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000030b1', 'p30_vk', 'Vera Vertrieb', '00000000-0000-0000-0000-0000000030a1', 'verkauf', '{}', 'de');
insert into public.kontakte (id, art, kontaktart, vorname, nachname) values
  ('00000000-0000-0000-0000-0000000030c1', 'person', 'privat', 'Lea', 'Beispiel');
insert into public.objekte (kontakt_id, ort) values ('00000000-0000-0000-0000-0000000030c1', 'Riaz');

-- Vor dem Start (aktiv_seit 2.11.2026) bzw. aus: keine Ordner
insert into public.offerten (id, nummer, kontakt_id, sprache) values
  ('00000000-0000-0000-0000-0000000030d0', 'T30-0', '00000000-0000-0000-0000-0000000030c1', 'fr');
select is((select count(*)::int from public.ablage_ordner), 0, 'Ablage aus: kein Ordner');

-- Einschalten
update public.einstellungen set wert = wert || jsonb_build_object('aktiv', true, 'aktiv_seit', now()) where schluessel = 'ablage';
insert into public.offerten (id, nummer, kontakt_id, sprache) values
  ('00000000-0000-0000-0000-0000000030d1', 'T30-1', '00000000-0000-0000-0000-0000000030c1', 'fr');
select is((select soll from public.ablage_ordner where offerte_id = '00000000-0000-0000-0000-0000000030d1'), 'offerte',
  'neue Offerte bekommt einen Ordner bei den Offerten');
update public.offerten set entscheid = 'vertagt' where id = '00000000-0000-0000-0000-0000000030d0';
select is((select count(*)::int from public.ablage_ordner where offerte_id = '00000000-0000-0000-0000-0000000030d0'), 0,
  'Offerte von vorher bleibt aussen vor');

insert into public.offerten (id, nummer, kontakt_id, sprache, alt_id) values
  ('00000000-0000-0000-0000-0000000030d9', 'T30-9', '00000000-0000-0000-0000-0000000030c1', 'fr', 'test30-import');
select is((select count(*)::int from public.ablage_ordner where offerte_id = '00000000-0000-0000-0000-0000000030d9'), 0,
  'Übernommenes aus der Vorlage bekommt keinen Ordner');
select is((select count(*)::int from public.ablage_offen(10) o where o.nummer = 'T30-1'), 1, 'Server sieht den Ordner');
select is((select o.kunde || ' | ' || o.ort || ' | ' || o.standort from public.ablage_offen(10) o where o.nummer = 'T30-1'),
  'Lea Beispiel | Riaz | bulle', 'Name, Ort aus dem Objekt, Standort aus der Sprache');

-- Angelegt
select public.ablage_ergebnis((select id from public.ablage_ordner where offerte_id = '00000000-0000-0000-0000-0000000030d1'),
  true, 'offerte', 'BULLE/D 2026/T30-1 - Lea Beispiel - Riaz', 'item1', 'https://sp/D%202026/T30-1');
select is((select count(*)::int from public.ablage_offen(10) o where o.nummer = 'T30-1'), 0, 'angelegt: nichts mehr zu tun');

-- Datei der Offerte: in die Ablage, nicht ins Kunden-Backup
insert into public.dokumente (id, name, ordner, speicher, speicher_pfad, bezug_tabelle, bezug_id) values
  ('00000000-0000-0000-0000-0000000030e1', 'Offerte.pdf', 'offerte', 'intern', 'x/Offerte.pdf', 'offerten',
   '00000000-0000-0000-0000-0000000030d1');
select is((select count(*)::int from public.ablage_dateien_offen(10) where id = '00000000-0000-0000-0000-0000000030e1'), 1,
  'Datei wartet auf die Ablage');
select is((select count(*)::int from public.sicherung_offen(10, null) where id = '00000000-0000-0000-0000-0000000030e1'), 0,
  'Kunden-Backup lässt sie aus');
update public.dokumente
   set sharepoint_pfad = 'BULLE/D 2026/T30-1 - Lea Beispiel - Riaz/Devis/Offerte.pdf',
       sharepoint_url = 'https://sp/D%202026/T30-1/Devis/Offerte.pdf',
       sharepoint_status = '{"ok": true, "ablage": true}'
 where id = '00000000-0000-0000-0000-0000000030e1';
select is((select count(*)::int from public.ablage_dateien_offen(10) where id = '00000000-0000-0000-0000-0000000030e1'), 0,
  'abgelegte Datei ist erledigt');

-- Annahme → zu den Aufträgen; Projekt hängt sich an
update public.offerten set entscheid = 'angenommen', entscheid_am = '2027-01-10' where id = '00000000-0000-0000-0000-0000000030d1';
select is((select soll from public.ablage_ordner where offerte_id = '00000000-0000-0000-0000-0000000030d1'), 'auftrag',
  'angenommen: Ziel Aufträge');
select is((select jahr_auftrag from public.ablage_offen(10) o where o.nummer = 'T30-1'), 2027, 'Jahr des Auftrags');
insert into public.projekte (id, nummer, kontakt_id, offerte_id) values
  ('00000000-0000-0000-0000-0000000030f1', 'T30-1', '00000000-0000-0000-0000-0000000030c1', '00000000-0000-0000-0000-0000000030d1');
select is((select projekt_id from public.ablage_ordner where offerte_id = '00000000-0000-0000-0000-0000000030d1'),
  '00000000-0000-0000-0000-0000000030f1'::uuid, 'Projekt nutzt den Ordner der Offerte');

-- Verschoben: Pfad und Link der Datei ziehen mit
select public.ablage_ergebnis((select id from public.ablage_ordner where offerte_id = '00000000-0000-0000-0000-0000000030d1'),
  true, 'auftrag', 'BULLE/A 2027/T30-1 - Lea Beispiel - Riaz', 'item1', 'https://sp/A%202027/T30-1');
select is((select sharepoint_pfad || ' ' || sharepoint_url from public.dokumente where id = '00000000-0000-0000-0000-0000000030e1'),
  'BULLE/A 2027/T30-1 - Lea Beispiel - Riaz/Devis/Offerte.pdf https://sp/A%202027/T30-1/Devis/Offerte.pdf',
  'Datei zieht mit');

-- Projekt hält den Ordner bei den Aufträgen
update public.offerten set entscheid = 'verloren' where id = '00000000-0000-0000-0000-0000000030d1';
select is((select soll from public.ablage_ordner where offerte_id = '00000000-0000-0000-0000-0000000030d1'), 'auftrag',
  'mit Projekt bleibt der Ordner bei den Aufträgen');

-- Fehler: eine Stunde Pause
insert into public.offerten (id, nummer, kontakt_id, sprache) values
  ('00000000-0000-0000-0000-0000000030d2', 'T30-2', '00000000-0000-0000-0000-0000000030c1', 'de');
select public.ablage_ergebnis((select id from public.ablage_ordner where offerte_id = '00000000-0000-0000-0000-0000000030d2'),
  false, p_fehler => 'kein_zugriff');
select is((select count(*)::int from public.ablage_offen(10) o where o.nummer = 'T30-2'), 0, 'nach Fehler: Pause');

-- Rechte
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000030a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000030a1', true);
select throws_ok($$ select * from public.ablage_offen(1) $$, '42501', null, 'App darf nicht abarbeiten');
select throws_ok($$ update public.einstellungen set wert = wert where schluessel = 'ablage' $$, '42501', null,
  'Verkauf ändert die Ablage-Regeln nicht');
reset role;

select * from finish();
rollback;
