-- Prüft den Termin-Link (03.11.2026): Link nur mit Login und als Entwurf im Ausgangskorb; freie Zeiten ohne
-- Outlook-Termine und Abwesenheiten; Buchen setzt den Termin, gibt der zuständigen Person eine Glocke, und danach
-- gilt der Link nicht mehr; besetzte Zeiten und fremde Schlüssel werden abgelehnt. Ausführen: npm run db:test
begin;
select plan(14);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000c1a1', 'tl-ve@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache, profil) values
  ('00000000-0000-0000-0000-00000000c1b1', 'tl_ve', 'Tina Verkauf', 'tl-ve@test.local', '00000000-0000-0000-0000-00000000c1a1', 'verkauf', '{}', 'de', '{}');
-- Besuchszeiten jeden Tag rund um die Uhr, damit der Test nicht vom Wochentag abhängt.
update public.einstellungen
   set wert = jsonb_set(wert, '{termin_link,zeiten}', '{"1":["00:00","23:30"],"2":["00:00","23:30"],"3":["00:00","23:30"],
     "4":["00:00","23:30"],"5":["00:00","23:30"],"6":["00:00","23:30"],"7":["00:00","23:30"]}')
       || '{"feiertage": []}'
 where schluessel = 'verkauf';
-- Ohne Vorlauf und ohne Obergrenze, sonst fällt «morgen 14:00» am späten Nachmittag aus der Liste.
update public.einstellungen
   set wert = jsonb_set(jsonb_set(wert, '{termin_link,vorlauf_stunden}', '0'), '{termin_link,max_zeiten}', '1000')
 where schluessel = 'verkauf';
update public.einstellungen set wert = wert || '{"feiertage": []}' where schluessel = 'posteingang';

set local role service_role;
select is(public.lead_aus_website($j${"kennung": "web:TL-PGTAP-1", "quelle": "webseite", "art": "neu", "sprache": "de",
  "kontakt": {"vorname": "Marta", "nachname": "Pgtaplink", "email": "pgtaplink@test.local", "telefon": "079 913 47 26"},
  "objekt": {"strasse": "Dorfstrasse 1", "plz": "5630", "ort": "Muri AG"}, "lead": {}}$j$::jsonb) ->> 'ergebnis', 'neu', 'Lead angelegt');
reset role;
update public.verkaufschancen set tour_person_id = '00000000-0000-0000-0000-00000000c1b1'
 where kontakt_id = (select id from public.kontakte where nachname = 'Pgtaplink');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000c1a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a1', true);
select throws_ok($$ select public.termin_link_zeiten('x') $$, '42501', null, 'Zeiten fragt nur der Server ab');
select ok(public.termin_link_senden((select v.id from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
  where k.nachname = 'Pgtaplink'), 'sms') ->> 'link' like 'https://www.dimension-solaire.ch/de/termin/?t=%', 'Link zeigt auf die Website');
reset role;

select is((select status from public.ausgangskorb where art = 'termin_link' and text like '%Marta Pgtaplink%'), 'wartet',
  'SMS wartet im Ausgangskorb auf Freigabe');
select ok((select text like '%/de/termin/?t=%' from public.ausgangskorb where art = 'termin_link' and text like '%Pgtaplink%'),
  'SMS enthält den Link');

-- Morgen 10:00 ist ein Outlook-Termin; morgen 14:00 bleibt frei.
insert into public.kalender_eintraege (person_id, beginn, ende, betreff, anzeige_als)
values ('00000000-0000-0000-0000-00000000c1b1',
        ((current_date + 1) + time '10:00') at time zone 'Europe/Zurich',
        ((current_date + 1) + time '11:00') at time zone 'Europe/Zurich', 'Sitzung', 'busy');
-- Übermorgen ist die Person abwesend.
insert into public.abwesenheiten (person_id, art, von, bis) values ('00000000-0000-0000-0000-00000000c1b1', 'ferien', current_date + 2, current_date + 2);

set local role service_role;
create temp table z on commit drop as
  select public.termin_link_zeiten((select termin_link from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
    where k.nachname = 'Pgtaplink')) as r;
select is((select r ->> 'gueltig' from z), 'true', 'Schlüssel gilt');
select is((select r ->> 'vorname' from z), 'Marta', 'Nur der Vorname geht an die Website');
select ok(not exists (select 1 from z, jsonb_array_elements_text(r -> 'zeiten') t
  where t::timestamptz = ((current_date + 1) + time '10:00') at time zone 'Europe/Zurich'), 'Outlook-Termin ist nicht frei');
select ok(exists (select 1 from z, jsonb_array_elements_text(r -> 'zeiten') t
  where t::timestamptz = ((current_date + 1) + time '14:00') at time zone 'Europe/Zurich'), 'Freie Zeit wird angeboten');
select ok(not exists (select 1 from z, jsonb_array_elements_text(r -> 'zeiten') t
  where (t::timestamptz at time zone 'Europe/Zurich')::date = current_date + 2), 'Abwesenheit hat keine Zeiten');

select is(public.termin_link_buchen((select termin_link from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
  where k.nachname = 'Pgtaplink'), ((current_date + 1) + time '10:00') at time zone 'Europe/Zurich') ->> 'fehler', 'besetzt',
  'Besetzte Zeit wird abgelehnt');
select is(public.termin_link_buchen((select termin_link from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
  where k.nachname = 'Pgtaplink'), ((current_date + 1) + time '14:00') at time zone 'Europe/Zurich', 'Bitte klingeln') ->> 'ok', 'true',
  'Freie Zeit wird gebucht');
reset role;

select is((select stufe from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id where k.nachname = 'Pgtaplink'),
  'termin_vereinbart', 'Lead hat jetzt einen Termin');
set local role service_role;
select is(public.termin_link_zeiten((select termin_link from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
  where k.nachname = 'Pgtaplink')) ->> 'gueltig', 'false', 'Nach der Buchung gilt der Link nicht mehr');
reset role;

select * from finish();
rollback;
