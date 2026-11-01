-- Prüft Bewertungsanfrage nach der IBN (KI-Einschätzung, einzeln senden mit Google- und Empfehlungs-Link, nicht bei
-- Werbesperre) und das Empfehlungsprogramm (Code im Lead, Gutschrift erst mit unterschriebenem Werkvertrag,
-- Dankes-Mail wartet auf Freigabe). Modul-Prüfung 32A. Ausführen: npm run db:test
begin;
select plan(16);

update public.einstellungen set wert = wert || '{"bewertung_link": "https://g.page/r/beispiel/review", "bewertung_link_fr": "https://g.page/r/exemple/review"}'
 where schluessel = 'automationen';
select is(intern.bewertung_link('fr'), 'https://g.page/r/exemple/review', 'Romandie: eigener Link');
select is(intern.bewertung_link('de'), 'https://g.page/r/beispiel/review', 'Deutschschweiz');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000044a1', 'p44-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000044b1', 'p44_vk', 'Vreni Verkauf', '00000000-0000-0000-0000-0000000044a1', 'verkauf', '{}', 'de');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, email, sprache, werbesperre) values
  ('00000000-0000-0000-0000-0000000044c1', 'person', 'privat', 'Erika', 'Empfehler', 'erika@beispiel.test', 'de', false),
  ('00000000-0000-0000-0000-0000000044c2', 'person', 'privat', 'Nils', 'Neukunde', 'nils@beispiel.test', 'fr', false),
  ('00000000-0000-0000-0000-0000000044c3', 'person', 'privat', 'Sven', 'Sperre', 'sven@beispiel.test', 'de', true);
insert into public.objekte (id, kontakt_id, plz, ort) values
  ('00000000-0000-0000-0000-0000000044d1', '00000000-0000-0000-0000-0000000044c1', '5630', 'Muri AG'),
  ('00000000-0000-0000-0000-0000000044d3', '00000000-0000-0000-0000-0000000044c3', '5630', 'Muri AG');
insert into public.projekte (id, nummer, kontakt_id, objekt_id, titel, unterzeichnet_am, verantwortlich_id) values
  ('00000000-0000-0000-0000-0000000044e1', 'P9441', '00000000-0000-0000-0000-0000000044c1', '00000000-0000-0000-0000-0000000044d1', 'PV Erika', current_date - 90, '00000000-0000-0000-0000-0000000044b1'),
  ('00000000-0000-0000-0000-0000000044e3', 'P9443', '00000000-0000-0000-0000-0000000044c3', '00000000-0000-0000-0000-0000000044d3', 'PV Sven', current_date - 90, null);

-- IBN vor 20 Tagen: Anlage entsteht → Anfrage, fällig nach 14 Tagen
insert into public.anlagen (projekt_id, objekt_id, ibn_am) values
  ('00000000-0000-0000-0000-0000000044e1', '00000000-0000-0000-0000-0000000044d1', current_date - 20),
  ('00000000-0000-0000-0000-0000000044e3', '00000000-0000-0000-0000-0000000044d3', current_date - 20);
select is((select faellig_am from public.bewertungsanfragen where projekt_id = '00000000-0000-0000-0000-0000000044e1'),
  current_date - 6, 'Anfrage nach der IBN, fällig nach 14 Tagen');
select ok(exists (select 1 from public.bewertungen_offen(50) where id =
  (select id from public.bewertungsanfragen where projekt_id = '00000000-0000-0000-0000-0000000044e1')), 'fällig für die KI');

select public.bewertung_einschaetzen(id, '{"einschaetzung": "zufrieden", "grund": "Dankes-Mail nach der IBN."}')
  from public.bewertungsanfragen where projekt_id in ('00000000-0000-0000-0000-0000000044e1', '00000000-0000-0000-0000-0000000044e3');
select is((select status || ':' || einschaetzung from public.bewertungsanfragen where projekt_id = '00000000-0000-0000-0000-0000000044e1'),
  'bereit:zufrieden', 'Einschätzung gespeichert, bereit zur Freigabe');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000044b1'
             and titel_de = 'Bewertungsanfrage prüfen: Erika Empfehler'), 1, 'Glocke an die verantwortliche Person');
select ok(not exists (select 1 from public.ausgangskorb where kontakt_id = '00000000-0000-0000-0000-0000000044c1'),
  'ohne Freigabe geht nichts raus');

-- Einzeln senden (Klick = Freigabe)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000044a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000044a1', true);
select public.bewertung_senden((select id from public.bewertungsanfragen where projekt_id = '00000000-0000-0000-0000-0000000044e1'));
select throws_ok(format('select public.bewertung_senden(%L)',
  (select id from public.bewertungsanfragen where projekt_id = '00000000-0000-0000-0000-0000000044e3')),
  'P0001', 'empfehlung.werbesperre', 'nicht bei Werbesperre');
reset role;
select is((select status from public.ausgangskorb where kontakt_id = '00000000-0000-0000-0000-0000000044c1' and art = 'bewertung'),
  'freigegeben', 'Mail freigegeben im Ausgangskorb');
select ok((select text from public.ausgangskorb where kontakt_id = '00000000-0000-0000-0000-0000000044c1' and art = 'bewertung')
            like 'Guten Tag Erika Empfehler%https://g.page/r/beispiel/review%empfehlung?code=EMP-%', 'Google- und Empfehlungs-Link');
select is((select status from public.bewertungsanfragen where projekt_id = '00000000-0000-0000-0000-0000000044e1'), 'gesendet',
  'Anfrage gesendet');

-- Empfehlung: Lead mit Code im Kommentar
insert into public.verkaufschancen (id, kontakt_id, kommentar_kunde, quelle) values
  ('00000000-0000-0000-0000-0000000044f1', '00000000-0000-0000-0000-0000000044c2',
   'Mein Nachbar hat mir das empfohlen, Code ' || lower((select empfehlungs_code from public.kontakte where id = '00000000-0000-0000-0000-0000000044c1')),
   'webseite');
select is((select quelle || ':' || empfohlen_von from public.verkaufschancen where id = '00000000-0000-0000-0000-0000000044f1'),
  'empfehlung:00000000-0000-0000-0000-0000000044c1', 'Code erkannt: Quelle Empfehlung, empfohlen von Erika');
select is((select status from public.empfehlungen where verkaufschance_id = '00000000-0000-0000-0000-0000000044f1'), 'lead',
  'Empfehlung erfasst');

-- Projekt ohne Unterschrift: noch keine Gutschrift; mit Unterschrift: vorgemerkt, Dankes-Mail wartet
insert into public.projekte (id, nummer, kontakt_id, verkaufschance_id, titel) values
  ('00000000-0000-0000-0000-0000000044e2', 'P9442', '00000000-0000-0000-0000-0000000044c2', '00000000-0000-0000-0000-0000000044f1', 'PV Nils');
select is((select gutschrift_rappen from public.empfehlungen where verkaufschance_id = '00000000-0000-0000-0000-0000000044f1'), null,
  'ohne Werkvertrag keine Gutschrift');
update public.projekte set unterzeichnet_am = current_date where id = '00000000-0000-0000-0000-0000000044e2';
select is((select status || ':' || gutschrift_rappen from public.empfehlungen where verkaufschance_id = '00000000-0000-0000-0000-0000000044f1'),
  'auftrag:20000', 'Werkvertrag unterschrieben: Gutschrift vorgemerkt');
select is((select status from public.ausgangskorb where kontakt_id = '00000000-0000-0000-0000-0000000044c1' and art = 'empfehlung_dank'),
  'wartet', 'Dankes-Mail wartet auf Freigabe');

select * from finish();
rollback;
