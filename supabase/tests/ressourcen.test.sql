-- Prüft Phase 17: Fahrzeuge und Geräte (Einträge setzen Frist, Kilometer und Zustand; wiederholbar; Schaden in
-- die Glocke; Übergabe im Verlauf), Kurse und Ausweise (ändern nur Administration oder die Person selbst),
-- Personal-Akte (nur Administration und die Person; Notiz nur Administration) und die Fristen-Meldung
-- (einmal pro Frist, an die zugeteilte Person oder die Administration).
-- Ausführen: npm run db:test
begin;
select plan(34);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000017a1', 'p17-mt@test.local'),
  ('00000000-0000-0000-0000-0000000017a2', 'p17-ad@test.local'),
  ('00000000-0000-0000-0000-0000000017a3', 'p17-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000017b1', 'p17_mt', 'Max Monteur', '00000000-0000-0000-0000-0000000017a1', 'montage', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000017b2', 'p17_ad', 'Alma Admin', '00000000-0000-0000-0000-0000000017a2', 'admin', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000017b3', 'p17_vk', 'Vito Verkauf', '00000000-0000-0000-0000-0000000017a3', 'verkauf', '{}', 'fr');
insert into public.fahrzeuge (id, kennzeichen, bezeichnung, km_stand, km_stand_am, naechste_mfk) values
  ('00000000-0000-0000-0000-0000000017f1', 'ZZ 917 001', 'Testbus', 50000, '2026-09-01', '2026-11-10');
insert into public.geraete (id, art, bezeichnung, inventar_nr, pruef_monate, person_id) values
  ('00000000-0000-0000-0000-0000000017e1', 'absturzsicherung', 'Gurt Test', 'P17-001', 12,
   '00000000-0000-0000-0000-0000000017b1');

-- Als Monteur
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000017a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000017a1', true);

select throws_ok($$ insert into public.ressourcen_eintraege (fahrzeug_id, art) values
  ('00000000-0000-0000-0000-0000000017f1', 'notiz') $$, '42501', null, 'Einträge nur über die Funktion');
select throws_ok($$ select public.ressource_eintrag_erfassen(null, '00000000-0000-0000-0000-0000000017f1', null,
  'pruefung', '2026-10-20') $$, 'P0001', 'ressourcen.art', 'Prüfung gibt es nur für Geräte');
select throws_ok($$ select public.ressource_eintrag_erfassen(null, '00000000-0000-0000-0000-0000000017f1', null,
  'uebergabe', '2026-10-20') $$, 'P0001', 'ressourcen.art', 'Übergabe nur über «Übergeben»');
select throws_ok($$ select public.ressource_eintrag_erfassen(null, '00000000-0000-0000-0000-0000000017f1', null,
  'km_stand', '2026-10-20', 49000) $$, 'P0001', 'ressourcen.km_kleiner', 'Kilometer gehen nicht zurück');
select throws_ok($$ select public.ressource_eintrag_erfassen(null, '00000000-0000-0000-0000-0000000017f1', null,
  'mfk', '2026-10-20') $$, 'P0001', 'ressourcen.mfk_naechste', 'MFK braucht die nächste MFK');
select throws_ok($$ select public.ressource_eintrag_erfassen(null, '00000000-0000-0000-0000-0000000017f1', null,
  'notiz', '2030-01-01') $$, 'P0001', 'ressourcen.datum', 'Datum nicht in der Zukunft');

select public.ressource_eintrag_erfassen('00000000-0000-0000-0000-0000000017c1', '00000000-0000-0000-0000-0000000017f1',
  null, 'service', '2026-10-20', 52000, 45000, null, null, 'Ölwechsel');
select public.ressource_eintrag_erfassen('00000000-0000-0000-0000-0000000017c1', '00000000-0000-0000-0000-0000000017f1',
  null, 'service', '2026-10-20', 52000, 45000, null, null, 'Ölwechsel');
select is((select count(*)::int from public.ressourcen_eintraege where fahrzeug_id = '00000000-0000-0000-0000-0000000017f1'),
  1, 'gleiche ID vom Handy legt nichts doppelt an');
select is((select km_stand || ' ' || naechster_service || ' ' || service_km from public.fahrzeuge
            where id = '00000000-0000-0000-0000-0000000017f1'),
  '52000 2027-10-20 72000', 'Service setzt Kilometer, nächsten Service in 12 Monaten und bei +20''000 km');
select is((select person_id from public.ressourcen_eintraege where id = '00000000-0000-0000-0000-0000000017c1'),
  '00000000-0000-0000-0000-0000000017b1'::uuid, 'Eintrag gehört der erfassenden Person');

select public.ressource_eintrag_erfassen(null, '00000000-0000-0000-0000-0000000017f1', null, 'mfk', '2026-10-21',
  null, null, null, '2028-10-21');
select is((select naechste_mfk from public.fahrzeuge where id = '00000000-0000-0000-0000-0000000017f1'),
  '2028-10-21'::date, 'MFK setzt die nächste MFK vom Ausweis');

select throws_ok($$ select public.ressource_eintrag_erfassen(null, null, '00000000-0000-0000-0000-0000000017e1',
  'pruefung', '2026-10-20') $$, 'P0001', 'ressourcen.ergebnis_fehlt', 'Prüfung braucht ein Ergebnis');
select public.ressource_eintrag_erfassen(null, null, '00000000-0000-0000-0000-0000000017e1', 'pruefung', '2026-10-20',
  null, null, 'maengel');
select is((select naechste_pruefung || ' ' || zustand from public.geraete where id = '00000000-0000-0000-0000-0000000017e1'),
  '2027-10-20 maengel', 'Prüfung setzt nächste Prüfung und Zustand');
select public.ressource_eintrag_erfassen(null, null, '00000000-0000-0000-0000-0000000017e1', 'schaden', '2026-10-21',
  null, null, null, null, 'Naht offen');
select is((select zustand from public.geraete where id = '00000000-0000-0000-0000-0000000017e1'), 'defekt',
  'Schaden setzt das Gerät auf defekt');

-- Übergabe: in den Bus, dann an Vito
select public.ressource_uebergeben(null, '00000000-0000-0000-0000-0000000017e1', null,
  '00000000-0000-0000-0000-0000000017f1', null);
select is((select coalesce(person_id::text, '-') || ' ' || fahrzeug_id from public.geraete
            where id = '00000000-0000-0000-0000-0000000017e1'),
  '- 00000000-0000-0000-0000-0000000017f1', 'Gerät liegt jetzt im Fahrzeug');
select public.ressource_uebergeben(null, '00000000-0000-0000-0000-0000000017e1', '00000000-0000-0000-0000-0000000017b3',
  null, 'für Messung');
select is((select text from public.ressourcen_eintraege where geraet_id = '00000000-0000-0000-0000-0000000017e1'
            and art = 'uebergabe' order by erstellt_am desc, text desc limit 1),
  'Testbus ZZ 917 001 → Vito Verkauf · für Messung', 'Übergabe steht im Verlauf (vorher → nachher)');
select throws_ok($$ select public.ressource_uebergeben('00000000-0000-0000-0000-0000000017f1', null, null,
  '00000000-0000-0000-0000-0000000017f1') $$, 'P0001', 'ressourcen.bezug', 'Fahrzeug nicht in ein Fahrzeug');

-- Ausweise: eigene ja, fremde nein
select lives_ok($$ insert into public.qualifikationen (person_id, art, erworben_am, gueltig_bis) values
  ('00000000-0000-0000-0000-0000000017b1', 'absturzsicherung', '2024-11-15', '2026-11-15') $$,
  'eigenen Ausweis erfassen');
select throws_ok($$ insert into public.qualifikationen (person_id, art) values
  ('00000000-0000-0000-0000-0000000017b3', 'erste_hilfe') $$, '42501', null, 'fremden Ausweis nicht');
select is((select count(*)::int from public.qualifikationen where person_id = '00000000-0000-0000-0000-0000000017b1'), 1,
  'Ausweise lesen alle mit Grundrecht');

-- Personal-Akte: eigene ja, Admin-Felder bleiben leer
insert into public.personal_akten (person_id, notfall_name, notiz, pensum) values
  ('00000000-0000-0000-0000-0000000017b1', 'Mia Monteur', 'selbst geschrieben', 80);
select is((select coalesce(notiz, '-') || ' ' || coalesce(pensum::text, '-') || ' ' || notfall_name
             from public.personal_akten where person_id = '00000000-0000-0000-0000-0000000017b1'),
  '- - Mia Monteur', 'Person füllt Notfallkontakt, Notiz und Pensum bleiben der Administration');
select throws_ok($$ insert into public.personal_akten (person_id, notfall_name) values
  ('00000000-0000-0000-0000-0000000017b3', 'X') $$, '42501', null, 'fremde Akte nicht anlegen');

-- Als Verkauf: fremde Akte unsichtbar
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000017a3", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000017a3', true);
select is((select count(*)::int from public.personal_akten where person_id = '00000000-0000-0000-0000-0000000017b1'), 0,
  'fremde Personal-Akte unsichtbar');
select is((select count(*)::int from public.personal_akten_sicht where person_id = '00000000-0000-0000-0000-0000000017b1'), 0,
  'auch nicht über die Sicht');
update public.qualifikationen set gueltig_bis = '2030-01-01' where person_id = '00000000-0000-0000-0000-0000000017b1';
select is((select gueltig_bis from public.qualifikationen where person_id = '00000000-0000-0000-0000-0000000017b1'),
  '2026-11-15'::date, 'fremden Ausweis nicht ändern');

-- Als Administration
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000017a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000017a2', true);
update public.personal_akten set notiz = 'Probezeit bis 31.12.', pensum = 80
 where person_id = '00000000-0000-0000-0000-0000000017b1';
select is((select notiz || ' ' || pensum from public.personal_akten_sicht
            where person_id = '00000000-0000-0000-0000-0000000017b1'),
  'Probezeit bis 31.12. 80', 'Administration sieht und ändert alles');
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-0000000017b2' and titel_de like 'Schaden: Gurt Test%'),
  1, 'Schaden meldet sich in der Glocke der Administration');

-- Monteur sieht die Notiz nicht
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000017a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000017a1', true);
select is((select coalesce(notiz, '-') from public.personal_akten_sicht
            where person_id = '00000000-0000-0000-0000-0000000017b1'),
  '-', 'Person sieht die Notiz der Administration nicht');
update public.personal_akten set pensum = 100, notfall_telefon = '+41 79 000 00 00'
 where person_id = '00000000-0000-0000-0000-0000000017b1';
select is((select pensum || ' ' || notfall_telefon from public.personal_akten_sicht
            where person_id = '00000000-0000-0000-0000-0000000017b1'),
  '80 +41 79 000 00 00', 'Person ändert Notfallkontakt, Pensum bleibt');

-- Fristen
select is((select string_agg(art || ':' || faellig_am, ' ' order by art) from public.fristen
            where bezug_id in ('00000000-0000-0000-0000-0000000017f1', '00000000-0000-0000-0000-0000000017e1')
               or (art = 'ausweis' and person_id = '00000000-0000-0000-0000-0000000017b1')),
  'ausweis:2026-11-15 mfk:2028-10-21 pruefung:2027-10-20 service:2027-10-20', 'Fristen-Sicht: MFK, Service, Prüfung, Ausweis');
select throws_ok($$ select public.fristen_melden() $$, '42501', null, 'Fristen melden nur der Zeitplan');

reset role;
set local role service_role;
select ok(public.fristen_melden('2026-10-26') >= 1, 'Ausweis innerhalb 60 Tagen wird gemeldet');
reset role;
select is((select string_agg(p.kuerzel, ',' order by p.kuerzel) from public.aufgaben a
             join public.personen p on p.id = a.person_id
            where a.bezug_tabelle = 'qualifikationen' and p.kuerzel like 'p17%'),
  'p17_ad,p17_mt', 'Ausweis: Aufgabe für die Person und die Administration');
set local role service_role;
select public.fristen_melden('2026-10-26');
reset role;
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-0000000017b1' and titel_de like 'Frist:%'),
  1, 'dieselbe Frist meldet sich nur einmal');
select is((select count(*)::int from public.aufgaben a where a.bezug_id = '00000000-0000-0000-0000-0000000017f1'),
  0, 'MFK in zwei Jahren noch nicht gemeldet');

select * from finish();
rollback;
