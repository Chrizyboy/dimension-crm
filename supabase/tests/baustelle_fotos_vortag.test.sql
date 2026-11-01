-- Prüft Pflichtfotos-Einstellung, «Stopp vergessen?» und die Vortags-Auslöser für Montage und Service (Modul-Prüfung 23A).
-- Ausführen: npm run db:test
begin;
select plan(8);

update public.automationen set aktiv = false where vorlage is not null;
update intern.automation_signale set verteilt = true where not verteilt;

select is(jsonb_array_length((select wert from public.einstellungen where schluessel = 'baustelle') #> '{pflichtfotos,service}'), 3,
  'Service hat drei Pflichtfotos');
select has_column('public', 'dokumente', 'kategorie', 'Dokument kennt die Foto-Kategorie');

-- Stopp vergessen
insert into public.zeiten (id, person_id, start) values
  ('00000000-0000-0000-0000-0000000038d1', (select id from public.personen order by name limit 1), now() - interval '11 hours'),
  ('00000000-0000-0000-0000-0000000038d2', (select id from public.personen order by name limit 1 offset 1), now() - interval '2 hours');
select is(public.zeiten_vergessen_melden(), 1, 'nur die Zeit über 10 Stunden wird gemeldet');
select is(public.zeiten_vergessen_melden(), 0, 'und nur einmal');
select ok((select popup from public.benachrichtigungen where titel_de = 'Stopp vergessen?' order by erstellt_am desc limit 1),
  'Glocke mit Popup');

-- Vortag: Uhrzeit der SMS-Erinnerung auf 00:00, damit der Test zu jeder Tageszeit läuft
insert into public.einstellungen (schluessel, wert) values ('sms_erinnerung', '{"uhrzeit": "00:00"}')
on conflict (schluessel) do update set wert = public.einstellungen.wert || '{"uhrzeit": "00:00"}';
insert into public.kontakte (id, art, kontaktart, vorname, nachname, telefon, sprache) values
  ('00000000-0000-0000-0000-0000000038c1', 'person', 'privat', 'Tom', 'Beispiel', '+41760000000', 'de');
insert into public.projekte (id, nummer, kontakt_id, titel) values
  ('00000000-0000-0000-0000-0000000038a1', 'P9381', '00000000-0000-0000-0000-0000000038c1', 'PV Vortag');
insert into public.einsaetze (id, projekt_id, art, von, bis) values
  ('00000000-0000-0000-0000-0000000038e1', '00000000-0000-0000-0000-0000000038a1', 'intern',
   (now() at time zone 'Europe/Zurich')::date + 1, (now() at time zone 'Europe/Zurich')::date + 2),
  ('00000000-0000-0000-0000-0000000038e2', '00000000-0000-0000-0000-0000000038a1', 'intern',
   (now() at time zone 'Europe/Zurich')::date + 5, (now() at time zone 'Europe/Zurich')::date + 6);
insert into public.service_faelle (id, nummer, kontakt_id, titel, termin_am) values
  ('00000000-0000-0000-0000-0000000038f1', 'S9381', '00000000-0000-0000-0000-0000000038c1', 'Zähler prüfen',
   ((now() at time zone 'Europe/Zurich')::date + 1 + time '09:00') at time zone 'Europe/Zurich');
insert into intern.automation_durchsicht (ereignis) values ('einsatz.morgen'), ('service.termin_morgen')
on conflict (ereignis) do nothing;
select intern.automationen_durchsehen(true);
select is((select count(*)::int from intern.automation_signale where ereignis = 'einsatz.morgen'
             and bezug_id = '00000000-0000-0000-0000-0000000038a1' and not basis), 1, 'nur der Einsatz von morgen');
select is((select count(*)::int from intern.automation_signale where ereignis = 'service.termin_morgen'
             and bezug_id = '00000000-0000-0000-0000-0000000038f1' and not basis), 1, 'Service-Termin morgen');
select is(jsonb_array_length(public.automation_katalog() -> 'ereignisse'), 21, 'Katalog kennt die zwei neuen Auslöser');

select * from finish();
rollback;
