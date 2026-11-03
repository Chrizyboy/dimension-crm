-- Prüft den Ausbau «Fahrzeuge & Geräte vollständig» (Entscheid 0039): neue Eintrag-Arten setzen ihre Frist,
-- Schäden haben einen Stand, Ausleihe mit «zurück bis», Reservierungen (nur von Hand, Frage 1 B) in der
-- Belegung, monatliche Kilometer-Erinnerung (einmal pro Monat) und Kosten pro Fahrzeug (nur Recht «finanzen»).
-- Ausführen: npm run db:test
begin;
select plan(26);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'fp-mt@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'fp-ad@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000039b1', 'fp_mt', 'Mia Monteurin', '00000000-0000-0000-0000-0000000039a1', 'montage', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000039b2', 'fp_ad', 'Arno Admin', '00000000-0000-0000-0000-0000000039a2', 'admin', '{}', 'de');
insert into public.fahrzeuge (id, kennzeichen, bezeichnung, person_id, km_stand, km_stand_am, leasing_beginn, leasing_bis,
                              leasing_rate_rappen, praemie_rappen, kaufpreis_rappen) values
  ('00000000-0000-0000-0000-0000000039f1', 'ZZ 939 001', 'Testbus', '00000000-0000-0000-0000-0000000039b1', 10000,
   '2026-09-30', '2025-03-01', '2027-02-28', 68900, 120000, 4500000),
  ('00000000-0000-0000-0000-0000000039f2', 'ZZ 939 002', 'Ersatzbus', null, 5000, '2026-10-01', null, null, null, null, null);
insert into public.geraete (id, art, bezeichnung, inventar_nr, pruef_monate) values
  ('00000000-0000-0000-0000-0000000039e1', 'hebegeraet', 'Lift Test', 'FP-001', 12);
insert into public.kontakte (id, art, nachname) values
  ('00000000-0000-0000-0000-0000000039d1', 'person', 'Fischer');
insert into public.objekte (id, kontakt_id, ort) values
  ('00000000-0000-0000-0000-0000000039d2', '00000000-0000-0000-0000-0000000039d1', 'Villmergen');
insert into public.projekte (id, nummer, kontakt_id, objekt_id) values
  ('00000000-0000-0000-0000-000000003911', 'FP-939', '00000000-0000-0000-0000-0000000039d1',
   '00000000-0000-0000-0000-0000000039d2');
insert into public.einsaetze (id, projekt_id, art, von, bis, personen) values
  ('00000000-0000-0000-0000-000000003901', '00000000-0000-0000-0000-000000003911', 'intern', '2026-11-02', '2026-11-04',
   '{00000000-0000-0000-0000-0000000039b1}');

-- Als Monteurin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a1', true);

select throws_ok($$ select public.ressource_eintrag_erfassen(null, '00000000-0000-0000-0000-0000000039f1', null,
  'tanken', '2026-10-20', 10400) $$, 'P0001', 'ressourcen.kosten_fehlt', 'Tanken braucht einen Betrag');
select public.ressource_eintrag_erfassen(null, '00000000-0000-0000-0000-0000000039f1', null, 'tanken', '2026-10-20',
  10400, 9850, null, null, null, null, 52.4);
select is((select liter from public.ressourcen_eintraege where fahrzeug_id = '00000000-0000-0000-0000-0000000039f1'
            and art = 'tanken'), 52.40::numeric, 'Tanken speichert Liter');
select is((select km_stand from public.fahrzeuge where id = '00000000-0000-0000-0000-0000000039f1'), 10400,
  'Tanken mit Kilometern setzt den Kilometerstand');
select public.ressource_eintrag_erfassen(null, '00000000-0000-0000-0000-0000000039f1', null, 'reifen', '2026-10-21',
  null, 9500, null, '2027-04-01', 'Winter montiert');
select is((select naechster_reifenwechsel from public.fahrzeuge where id = '00000000-0000-0000-0000-0000000039f1'),
  '2027-04-01'::date, 'Reifenwechsel setzt den nächsten Wechsel');
select public.ressource_eintrag_erfassen(null, '00000000-0000-0000-0000-0000000039f1', null, 'vignette', '2026-10-21',
  null, 4000);
select is((select vignette_bis from public.fahrzeuge where id = '00000000-0000-0000-0000-0000000039f1'),
  '2027-01-31'::date, 'Vignette gilt bis Ende Januar des Folgejahres');
select ok(exists (select 1 from public.fristen where bezug_id = '00000000-0000-0000-0000-0000000039f1' and art = 'leasing'),
  'Leasing-Ende steht in den Fristen');

-- Schaden am Gerät: Stand offen, defekt; erledigt → wieder in Ordnung
select public.ressource_eintrag_erfassen('00000000-0000-0000-0000-0000000039c1', null,
  '00000000-0000-0000-0000-0000000039e1', 'schaden', '2026-10-22', null, null, null, null, 'Seil ausgefranst');
select is((select stand from public.ressourcen_eintraege where id = '00000000-0000-0000-0000-0000000039c1'), 'offen',
  'Schaden beginnt offen');
select is((select zustand from public.geraete where id = '00000000-0000-0000-0000-0000000039e1'), 'defekt',
  'Schaden setzt das Gerät auf defekt');
select throws_ok($$ select public.ressource_schaden_setzen('00000000-0000-0000-0000-0000000039c1', 'weg') $$,
  'P0001', 'ressourcen.stand', 'Nur bekannte Stände');
select public.ressource_schaden_setzen('00000000-0000-0000-0000-0000000039c1', 'erledigt', 'Seil ersetzt', 18000);
select is((select stand || ' ' || kosten_rappen || ' ' || erledigung from public.ressourcen_eintraege
            where id = '00000000-0000-0000-0000-0000000039c1'), 'erledigt 18000 Seil ersetzt',
  'Erledigt mit Text und Kosten');
select is((select zustand from public.geraete where id = '00000000-0000-0000-0000-0000000039e1'), 'ok',
  'Erledigter Schaden setzt das Gerät wieder in Ordnung');

-- Ausleihe mit «zurück bis»
select public.ressource_uebergeben(null, '00000000-0000-0000-0000-0000000039e1', '00000000-0000-0000-0000-0000000039b1',
  null, null, '2026-11-06');
select ok((select uebernommen_am is not null and zurueck_bis = '2026-11-06' from public.geraete
            where id = '00000000-0000-0000-0000-0000000039e1'), 'Ausleihe merkt seit wann und bis wann');
select ok(exists (select 1 from public.fristen where bezug_id = '00000000-0000-0000-0000-0000000039e1' and art = 'ausleihe'),
  'Ausleihe steht in den Fristen');
select ok((select text like '% · bis 06.11.2026' from public.ressourcen_eintraege
            where geraet_id = '00000000-0000-0000-0000-0000000039e1' and art = 'uebergabe'), 'Verlauf nennt «bis»');
select public.ressource_uebergeben(null, '00000000-0000-0000-0000-0000000039e1', null);
select ok((select uebernommen_am is null and zurueck_bis is null from public.geraete
            where id = '00000000-0000-0000-0000-0000000039e1'), 'Zurück ins Lager löscht die Ausleihe');

-- Belegung nur von Hand (Frage 1 B): der Einsatz allein belegt kein Fahrzeug, eine Reservierung schon
select is((select count(*)::int from public.ressourcen_belegung where einsatz_id = '00000000-0000-0000-0000-000000003901'),
  0, 'Fahrzeug folgt dem Team nicht automatisch');
select throws_ok($$ select public.ressource_reservieren(null, '00000000-0000-0000-0000-0000000039f2', null,
  '2026-11-05', '2026-11-02') $$, 'P0001', 'ressourcen.zeitraum', 'Bis nicht vor von');
select public.ressource_reservieren('00000000-0000-0000-0000-000000003921', '00000000-0000-0000-0000-0000000039f2', null,
  '2026-11-02', '2026-11-04', 'einsatz', '00000000-0000-0000-0000-000000003901');
select public.ressource_reservieren('00000000-0000-0000-0000-000000003921', '00000000-0000-0000-0000-0000000039f2', null,
  '2026-11-02', '2026-11-04', 'einsatz', '00000000-0000-0000-0000-000000003901');
select is((select count(*)::int from public.ressourcen_reservierungen where id = '00000000-0000-0000-0000-000000003921'),
  1, 'gleiche ID ändert statt doppelt');
select is((select projekt from public.ressourcen_belegung where reservierung_id = '00000000-0000-0000-0000-000000003921'),
  'Fischer, Villmergen', 'Reservierung für den Einsatz zeigt Kunde und Ort');
select public.ressource_reservierung_aufheben('00000000-0000-0000-0000-000000003921');
select is((select count(*)::int from public.ressourcen_belegung where einsatz_id = '00000000-0000-0000-0000-000000003901'),
  0, 'Aufheben gibt das Fahrzeug frei');
select throws_ok($$ insert into public.ressourcen_reservierungen (fahrzeug_id, von, bis) values
  ('00000000-0000-0000-0000-0000000039f2', '2026-11-02', '2026-11-02') $$, '42501', null, 'Reservierung nur über die Funktion');

-- Kosten nur mit Recht «finanzen»
select throws_ok($$ select public.fuhrpark_kosten(2026) $$, '42501', 'ressourcen.kein_recht', 'Kosten nur mit «finanzen»');

-- Als Administration
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a2', true);
select is((select z ->> 'treibstoff_rappen' || ' ' || (z ->> 'unterhalt_rappen') || ' ' || (z ->> 'uebrige_rappen')
                  || ' ' || (z ->> 'km')
             from jsonb_array_elements(public.fuhrpark_kosten(2026) -> 'fahrzeuge') z
            where z ->> 'kennzeichen' = 'ZZ 939 001'), '9850 9500 4000 400',
  'Kosten nach Art getrennt, gefahrene Kilometer im Jahr');
select ok((select (z ->> 'leasing_rappen')::bigint % 68900 = 0 and (z ->> 'leasing_rappen')::bigint > 0
                  and not z ? 'privatanteil_rappen'
             from jsonb_array_elements(public.fuhrpark_kosten(2026) -> 'fahrzeuge') z
            where z ->> 'kennzeichen' = 'ZZ 939 001'), 'Leasing als Rate × Monate, kein Privatanteil');

-- Kilometer-Erinnerung: einmal pro Fahrzeug und Monat, nur mit fester Person
reset role;
select is(public.fuhrpark_km_erinnern('2026-11-02'), 1, 'Erinnert die fest zugeteilte Person');
select is(public.fuhrpark_km_erinnern('2026-11-03'), 0, 'Im selben Monat nur einmal');

select * from finish();
rollback;
