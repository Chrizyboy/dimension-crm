-- Prüft «Preise vollständig» (Entscheid 0039): Standard-Marge, Preisverlauf, Preisliste einlesen (prüfen, übernehmen,
-- neue Artikel), Freigabe von Rabatt/Marge (P4) und Übernahme in die Offerte, Leistungen ohne Kosten für alle.
-- Ausführen: npm run db:test
begin;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'pr-verkauf@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'pr-gl@test.local'),
  ('00000000-0000-0000-0000-0000000039a3', 'pr-montage@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000039b1', 'pr_verkauf', 'Vera Verkauf', '00000000-0000-0000-0000-0000000039a1', 'verkauf', '{preise}'),
  ('00000000-0000-0000-0000-0000000039b2', 'pr_gl', 'Gina Leitung', '00000000-0000-0000-0000-0000000039a2', 'verkauf', '{preise}'),
  ('00000000-0000-0000-0000-0000000039b3', 'pr_montage', 'Mo Montage', '00000000-0000-0000-0000-0000000039a3', 'monteur', '{}');
update public.einstellungen set wert = wert || '{"freigabe_person_ids": ["00000000-0000-0000-0000-0000000039b2"]}'
 where schluessel = 'preise';
insert into public.lieferanten (id, name) values ('00000000-0000-0000-0000-0000000039c1', 'Prüf-Grosshandel AG');
insert into public.kontakte (id, art, kontaktart, vorname, nachname) values
  ('00000000-0000-0000-0000-0000000039d1', 'person', 'privat', 'Lea', 'Muster');
insert into public.offerten (id, nummer, kontakt_id, status) values
  ('00000000-0000-0000-0000-0000000039e1', '939001', '00000000-0000-0000-0000-0000000039d1', 'offeriert');

-- Standard-Marge der Kategorie beim Anlegen
insert into public.artikel (id, artikelnummer, name, kategorie, leistung_w) values
  ('00000000-0000-0000-0000-0000000039f1', 'PR-485', 'Prüfmodul 485', 'module', 485),
  ('00000000-0000-0000-0000-0000000039f2', 'PR-SP10', 'Prüfspeicher 10 kWh', 'batteriespeicher', null);
select is((select marge from public.artikel where artikelnummer = 'PR-485'), 0.25::numeric(6, 4), 'Module: Standard-Marge 25 %');
select is((select marge from public.artikel where artikelnummer = 'PR-SP10'), 0.18::numeric(6, 4), 'Speicher: Standard-Marge 18 %');
insert into public.lieferantenpreise (artikel_id, lieferant_id, artikelnummer, ek_rappen, stand) values
  ('00000000-0000-0000-0000-0000000039f1', '00000000-0000-0000-0000-0000000039c1', 'G-485', 9232, '2026-10-03'),
  ('00000000-0000-0000-0000-0000000039f2', '00000000-0000-0000-0000-0000000039c1', 'G-SP10', 415000, '2026-10-03');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);

-- Kalkulation mit der Offerte, die den Speicher enthält
insert into public.kalkulationen (id, titel, offerte_id, rabatt, positionen) values
  ('00000000-0000-0000-0000-000000003901', 'Prüfung Muster', '00000000-0000-0000-0000-0000000039e1', 3,
   '[{"key":"a","artikelId":"00000000-0000-0000-0000-0000000039f1","name":"Prüfmodul 485","kategorie":"module","wp":485,"menge":22,"ekRappen":9232,"marge":0.25,"skonto":0.015},
     {"key":"b","artikelId":"00000000-0000-0000-0000-0000000039f2","name":"Prüfspeicher 10 kWh","kategorie":"batteriespeicher","menge":1,"ekRappen":415000,"marge":0.18,"skonto":0.015,"varianten":["B"]},
     {"key":"c","artikelId":null,"leistung":"montage_pv","name":"Montage PV","kategorie":"dienstleistungen","menge":44,"ekRappen":6500,"preisRappen":9800,"marge":0,"skonto":0}]');

-- Preisliste einlesen: geändert, neu, gleich, fehlt
select is((public.preis_import_anlegen('Prüf-Grosshandel AG', '00000000-0000-0000-0000-0000000039c1', 'liste.xlsx', '{}',
  '[{"artikelnummer":"G-SP10","name":"Prüfspeicher 10 kWh","ek_rappen":439000},
    {"artikelnummer":"G-NEU500","name":"Prüfmodul 500","ek_rappen":9580,"leistung_w":500}]', true)) -> 'geaendert',
  '1'::jsonb, 'Ein Preis geändert');
select is((select zaehlung ->> 'neu' from public.preis_importe where dateiname = 'liste.xlsx'), '1', 'Ein Artikel neu');
select is((select zaehlung ->> 'fehlt' from public.preis_importe where dateiname = 'liste.xlsx'), '1', 'Modul fehlt in der Liste');
select is((select zaehlung ->> 'offerten' from public.preis_importe where dateiname = 'liste.xlsx'), '1', 'Eine offene Offerte betroffen');
select is((select e -> 'offerten' from public.preis_importe, jsonb_array_elements(ergebnis) e
            where dateiname = 'liste.xlsx' and e ->> 'artikelnummer' = 'G-SP10'), '["939001"]'::jsonb, 'Offertnummer genannt');
select is((select ek_rappen from public.lieferantenpreise where artikelnummer = 'G-SP10'), 415000::bigint, 'Vor dem Übernehmen unverändert');

select is(public.preis_import_uebernehmen((select id from public.preis_importe where dateiname = 'liste.xlsx'), null,
  (select jsonb_build_array(jsonb_build_object('i', (e ->> 'i')::int, 'kategorie', 'module'))
     from public.preis_importe, jsonb_array_elements(ergebnis) e where dateiname = 'liste.xlsx' and e ->> 'art' = 'neu')),
  '{"neu": 1, "geaendert": 1}'::jsonb, 'Übernommen: 1 geändert, 1 neu');
select is((select ek_rappen from public.preisliste where artikelnummer = 'PR-SP10'), 439000::bigint, 'Neuer Einkauf in der Preisliste');
select is((select quelle from public.preisverlauf where artikel_id = '00000000-0000-0000-0000-0000000039f2' and neu = 439000),
  'Prüf-Grosshandel AG', 'Preisverlauf mit Quelle');
select is((select count(*) from public.preisliste where name = 'Prüfmodul 500' and marge = 0.25), 1::bigint, 'Neuer Artikel mit Standard-Marge');
select throws_ok($$ select public.preis_import_verwerfen((select id from public.preis_importe where dateiname = 'liste.xlsx')) $$,
  'preise.import_erledigt', 'Erledigter Import nicht nochmals');

-- Freigabe: Rabatt 3 % frei, Variante B mit Speicher (18 %) über der Mindestmarge → keine Freigabe nötig
update public.kalkulationen set variante = 'B' where id = '00000000-0000-0000-0000-000000003901';
select is((public.kalkulation_freigabe_pruefen('00000000-0000-0000-0000-000000003901')) ->> 'noetig', 'false', '3 % Rabatt ohne Freigabe');
-- 12 % Rabatt → Freigabe nötig, Übernahme abgelehnt
update public.kalkulationen set rabatt = 12 where id = '00000000-0000-0000-0000-000000003901';
select throws_ok($$ select public.kalkulation_in_offerte('00000000-0000-0000-0000-000000003901') $$,
  'preise.freigabe_noetig', 'Ohne Freigabe nicht in die Offerte');
select public.kalkulation_freigabe_anfragen('00000000-0000-0000-0000-000000003901', 'Konkurrenzofferte');
reset role;
select is((select count(*) from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000039b2'
            and titel_de like 'Rabatt freigeben%'), 1::bigint, 'Geschäftsleitung bekommt die Glocke');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true);
select public.kalkulation_freigeben('00000000-0000-0000-0000-000000003901', true, null);
-- Freigeben ja, Regeln ändern nein: Einstellungen ändert nur die Administration
select throws_ok($$ select public.preise_regeln_setzen('{"rabatt_frei_prozent": 20}') $$,
  '42501', 'preise.nur_admin', 'Freigebende ohne Administration ändern keine Regeln');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);
select public.kalkulation_in_offerte('00000000-0000-0000-0000-000000003901');
reset role;
-- 22 × 117.13 + 5257.85 (neuer Preis steht in der Kalkulation noch alt: 4970.66) + 44 × 98 → abzüglich 12 %
select is((select batterie from public.offerten where id = '00000000-0000-0000-0000-0000000039e1'), 'Prüfspeicher 10 kWh',
  'Freigegeben: Werte in der Offerte');

-- Leistungen: Verkauf für alle, Kosten nur mit Recht «preise»
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a3", "role": "authenticated"}', true);
select is((select kosten_rappen from public.leistungen_liste where schluessel = 'montage_pv'), null::bigint, 'Montage sieht keine Kosten');
select is((select verkauf_rappen from public.leistungen_liste where schluessel = 'montage_pv'), 9800::bigint, 'Montage sieht den Verkaufspreis');

select * from finish();
rollback;
