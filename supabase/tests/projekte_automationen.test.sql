-- Prüft die Projekt-Auslöser (Modul-Prüfung 22A): Frist eines Fahrplan-Schritts vorbei und Material nicht bestellt,
-- obwohl «bestellen bis» erreicht ist; Eingereichtes und Bestelltes lösen nichts aus.
-- Ausführen: npm run db:test
begin;
select plan(7);

update public.automationen set aktiv = false where vorlage is not null;
update intern.automation_signale set verteilt = true where not verteilt;
update public.einstellungen set wert = '{"lieferfrist_tage": 14}' where schluessel = 'einkauf';

insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000037c1', 'person', 'privat', 'Lea', 'Muster', 'de');
insert into public.projekte (id, nummer, kontakt_id, titel, baubeginn, material_status, ablauf_vorlage_id) values
  ('00000000-0000-0000-0000-0000000037a1', 'P9371', '00000000-0000-0000-0000-0000000037c1', 'PV Testdach', current_date + 10, null, (select id from public.ablauf_vorlagen where schluessel = 'pv')),
  ('00000000-0000-0000-0000-0000000037a2', 'P9372', '00000000-0000-0000-0000-0000000037c1', 'PV Bestellt', current_date + 10, 'bestellt', (select id from public.ablauf_vorlagen where schluessel = 'pv')),
  ('00000000-0000-0000-0000-0000000037a3', 'P9373', '00000000-0000-0000-0000-0000000037c1', 'PV Später', current_date + 60, null, (select id from public.ablauf_vorlagen where schluessel = 'pv'));
insert into public.projekt_schritte (projekt_id, schluessel, stand, frist, eingereicht_am) values
  ('00000000-0000-0000-0000-0000000037a1', 'schema', 'offen', current_date - 3, null),
  ('00000000-0000-0000-0000-0000000037a1', 'gemeinde', 'offen', current_date - 3, current_date - 20);

insert into intern.automation_durchsicht (ereignis) values ('projekt.frist_ueberfaellig'), ('projekt.material_faellig')
on conflict (ereignis) do nothing;
select intern.automationen_durchsehen(true);

select is((select count(*)::int from intern.automation_signale where ereignis = 'projekt.frist_ueberfaellig'
             and bezug_id = '00000000-0000-0000-0000-0000000037a1' and daten ->> 'schritt' = 'schema' and not basis), 1,
  'Frist vorbei gibt ein Signal');
select is((select count(*)::int from intern.automation_signale where ereignis = 'projekt.frist_ueberfaellig'
             and bezug_id = '00000000-0000-0000-0000-0000000037a1' and daten ->> 'schritt' = 'gemeinde'), 0,
  'eingereichtes Gesuch überwacht «Gesuch eingereicht»');
select is((select count(*)::int from intern.automation_signale where ereignis = 'projekt.material_faellig'
             and bezug_id = '00000000-0000-0000-0000-0000000037a1' and not basis), 1, 'Material nicht bestellt, bestellen bis erreicht');
select is((select count(*)::int from intern.automation_signale where ereignis = 'projekt.material_faellig'
             and bezug_id in ('00000000-0000-0000-0000-0000000037a2', '00000000-0000-0000-0000-0000000037a3')), 0,
  'bestellt oder noch Zeit: kein Signal');
select is(intern.automation_kontext('projekte', '00000000-0000-0000-0000-0000000037a1',
            '{"schritt_de": "Material bestellen", "schritt_fr": "Commander le matériel"}') #>> '{platzhalter,Meilenstein}',
  'Material bestellen', 'Platzhalter Meilenstein');

-- Zweite Durchsicht am selben Tag: nichts doppelt
select intern.automationen_durchsehen(true);
select is((select count(*)::int from intern.automation_signale where ereignis = 'projekt.material_faellig'
             and bezug_id = '00000000-0000-0000-0000-0000000037a1'), 1, 'Material-Signal nur einmal');
select ok(intern.automation_bedingung(intern.automation_kontext('projekte', '00000000-0000-0000-0000-0000000037a1'),
            '{"feld": "projekt.schritte.uebergabe", "op": "!=", "wert": "erledigt"}'), 'Übergabe offen: Bedingung erfüllt');

select * from finish();
rollback;
