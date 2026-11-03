-- Prüft die neuen Auslöser für Service, Rapport und Bestellung (Modul-Prüfung 22A/24A): Signale aus den Tabellen,
-- Durchsicht für Bestellungen ohne Bestätigung oder mit überfälligem Liefertermin, Platzhalter und Ziel-Links.
-- Ausführen: npm run db:test
begin;
select plan(11);

update public.automationen set aktiv = false where vorlage is not null;
update intern.automation_signale set verteilt = true where not verteilt;

insert into public.kontakte (id, art, kontaktart, vorname, nachname, email, sprache) values
  ('00000000-0000-0000-0000-0000000032c1', 'person', 'privat', 'Nora', 'Beispiel', 'nora@beispiel.test', 'fr');
insert into public.lieferanten (id, name, email_bestellung, sprache) values
  ('00000000-0000-0000-0000-0000000032e1', 'Solar Grosshandel Test AG', 'bestellung@grosshandel.test', 'de');

-- Service-Fall: neu und erledigt
insert into public.service_faelle (id, nummer, kontakt_id, titel, kategorie) values
  ('00000000-0000-0000-0000-0000000032f1', 'S9321', '00000000-0000-0000-0000-0000000032c1', 'Wechselrichter meldet Fehler', 'stoerung');
select is((select count(*)::int from intern.automation_signale where ereignis = 'service.neu'
             and bezug_id = '00000000-0000-0000-0000-0000000032f1'), 1, 'neuer Fall gibt service.neu');
update public.service_faelle set status = 'erledigt', erledigt_am = current_date where id = '00000000-0000-0000-0000-0000000032f1';
select is((select count(*)::int from intern.automation_signale where ereignis = 'service.erledigt'
             and bezug_id = '00000000-0000-0000-0000-0000000032f1'), 1, 'erledigter Fall gibt service.erledigt');
select is(intern.automation_kontext('service_faelle', '00000000-0000-0000-0000-0000000032f1') #>> '{platzhalter,Fall}', 'S9321',
  'Platzhalter Fall');
select is(intern.automation_ziel('service_faelle', '00000000-0000-0000-0000-0000000032f1'),
  '/aftersales?fall=00000000-0000-0000-0000-0000000032f1', 'Link zum Fall');

-- Rapport abgeschlossen
insert into public.rapporte (id, service_fall_id, art, datum, verrechnung) values
  ('00000000-0000-0000-0000-0000000032a1', '00000000-0000-0000-0000-0000000032f1', 'service', current_date, 'kostenpflichtig');
update public.rapporte set abgeschlossen_am = now() where id = '00000000-0000-0000-0000-0000000032a1';
select is((select count(*)::int from intern.automation_signale where ereignis = 'rapport.abgeschlossen'
             and bezug_id = '00000000-0000-0000-0000-0000000032a1'), 1, 'abgeschlossener Rapport gibt rapport.abgeschlossen');
select is(intern.automation_kontext('rapporte', '00000000-0000-0000-0000-0000000032a1') #>> '{rapport,verrechnung}',
  'kostenpflichtig', 'Kontext kennt die Verrechnung');

-- Bestellungen
insert into public.bestellungen (id, nummer, lieferant_id, status, bestellt_am, liefertermin) values
  ('00000000-0000-0000-0000-0000000032b1', 'B9321', '00000000-0000-0000-0000-0000000032e1', 'bestellt', current_date - 5, current_date + 10),
  ('00000000-0000-0000-0000-0000000032b2', 'B9322', '00000000-0000-0000-0000-0000000032e1', 'bestellt', current_date - 20, current_date - 2);
update public.bestellungen set bestaetigt_am = current_date - 18 where id = '00000000-0000-0000-0000-0000000032b2';
-- Erste Durchsicht ist Basis (Bestand löst nichts aus), darum Basis vorher setzen
insert into intern.automation_durchsicht (ereignis) values ('bestellung.ohne_bestaetigung'), ('bestellung.ueberfaellig')
on conflict (ereignis) do nothing;
select intern.automationen_durchsehen(true);
select is((select count(*)::int from intern.automation_signale where ereignis = 'bestellung.ohne_bestaetigung'
             and bezug_id = '00000000-0000-0000-0000-0000000032b1' and not basis), 1, 'ohne Bestätigung nach 3 Tagen');
select is((select count(*)::int from intern.automation_signale where ereignis = 'bestellung.ohne_bestaetigung'
             and bezug_id = '00000000-0000-0000-0000-0000000032b2'), 0, 'bestätigte Bestellung fragt nicht nach');
select is((select count(*)::int from intern.automation_signale where ereignis = 'bestellung.ueberfaellig'
             and bezug_id = '00000000-0000-0000-0000-0000000032b2' and not basis), 1, 'überfälliger Liefertermin');
select is(intern.automation_kontext('bestellungen', '00000000-0000-0000-0000-0000000032b2') #>> '{kontakt,email}',
  'bestellung@grosshandel.test', 'Mail geht an die Bestell-Adresse des Lieferanten');
update public.bestellungen set status = 'teilgeliefert' where id = '00000000-0000-0000-0000-0000000032b1';
select is((select count(*)::int from intern.automation_signale where ereignis = 'bestellung.teilgeliefert'
             and bezug_id = '00000000-0000-0000-0000-0000000032b1'), 1, 'Teillieferung gibt ein Signal');

select * from finish();
rollback;
