-- Prüft Phase 5: Kundenstand, Kundenübersicht unter RLS, Dubletten, Zeitachse, Datenexport.
-- Ausführen: npm run db:test
begin;
select plan(17);

-- Eigene Testdaten, unabhängig von seed.sql und vom Import.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'verkauf5@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'monteur5@test.local');
insert into public.personen (kuerzel, name, email, rolle, auth_user_id) values
  ('t5_verkauf', 'Test Verkauf', 'verkauf5@test.local', 'verkauf', '00000000-0000-0000-0000-0000000000c1'),
  ('t5_monteur', 'Test Monteur', 'monteur5@test.local', 'montage', '00000000-0000-0000-0000-0000000000c2');

insert into public.kontakte (id, vorname, nachname, email, telefon) values
  ('00000000-0000-0000-0000-00000000a001', 'Anna', 'Testkundin', 'anna@test.local', '+41 76 555 00 01'),
  ('00000000-0000-0000-0000-00000000a002', 'Beat', 'Testkunde', 'beat@test.local', '076 555 00 02'),
  ('00000000-0000-0000-0000-00000000a003', 'Anna', 'Testkundin-Doppel', 'ANNA@test.local', null);
insert into public.objekte (kontakt_id, strasse, plz, ort) values
  ('00000000-0000-0000-0000-00000000a001', 'Testweg 1', '5630', 'Muri');

-- Stand: neue Anfrage → Lead; Offerte offeriert und überfällig → Nachfassen; Projekt im Bau → Bau.
insert into public.verkaufschancen (id, nummer, kontakt_id, stufe, eingang_am) values
  ('00000000-0000-0000-0000-00000000b001', 'T5-L1', '00000000-0000-0000-0000-00000000a001', 'neu', current_date - 30);
select is((select stand from public.kundenstand('00000000-0000-0000-0000-00000000a001')), 'lead_neu', 'neue Anfrage ergibt Stand «Lead neu»');

insert into public.offerten (id, nummer, kontakt_id, verkaufschance_id, status, angebot_am, betrag_rappen) values
  ('00000000-0000-0000-0000-00000000c001', 'T5-O1', '00000000-0000-0000-0000-00000000a001',
   '00000000-0000-0000-0000-00000000b001', 'offeriert', current_date - 20, 2500000);
select is((select stand from public.kundenstand('00000000-0000-0000-0000-00000000a001')), 'nachfassen',
  'offerierte Offerte nach Ablauf der Frist ergibt «Nachfassen»');

update public.offerten set nachfassen_am = current_date + 10 where id = '00000000-0000-0000-0000-00000000c001';
select is((select stand from public.kundenstand('00000000-0000-0000-0000-00000000a001')), 'vertagt',
  'Nachfassen in der Zukunft ergibt «vertagt»');

insert into public.projekte (nummer, kontakt_id, offerte_id, status, baubeginn) values
  ('T5-P1', '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000c001', 'im_bau', current_date - 2);
select is((select stand from public.kundenstand('00000000-0000-0000-0000-00000000a001')), 'bau',
  'Projekt zur Offerte übersteuert den Stand der Offerte');

select is((select stand from public.kundenstand('00000000-0000-0000-0000-00000000a002')), null, 'ohne Geschäft kein Stand');

-- Kundenübersicht und Dubletten
select is((select ort from public.kunden_uebersicht where id = '00000000-0000-0000-0000-00000000a001'), 'Muri',
  'Übersicht zeigt die Adresse aus dem Gebäude');
select ok((select moegliche_dublette from public.kunden_uebersicht where id = '00000000-0000-0000-0000-00000000a003'),
  'gleiche Mail (gross/klein egal) wird als Dublette markiert');
select ok(not (select moegliche_dublette from public.kunden_uebersicht where id = '00000000-0000-0000-0000-00000000a002'),
  'eindeutiger Kontakt ist keine Dublette');
select is((select telefon_ziffern from public.kunden_uebersicht where id = '00000000-0000-0000-0000-00000000a001'),
  '0765550001', 'Telefonnummer +41 wird zu Ziffern mit 0');
select is((select grund from public.moegliche_dubletten('', '', '0765550002') limit 1), 'telefon',
  'Dublettenprüfung findet gleiche Telefonnummer in anderer Schreibweise');
select is((select count(*) from public.moegliche_dubletten('Anna Testkundin', '', '', '00000000-0000-0000-0000-00000000a001')
            where id = '00000000-0000-0000-0000-00000000a001'), 0::bigint, 'der eigene Kontakt zählt nicht als Dublette');

-- Zeitachse und Export
insert into public.aktivitaeten (kontakt_id, art, text, ergebnis) values
  ('00000000-0000-0000-0000-00000000a001', 'anruf', 'Nicht erreicht, später nochmals', 'nicht_erreicht');
select ok((select count(*) from public.kunden_zeitachse('00000000-0000-0000-0000-00000000a001')
            where art in ('aktivitaet:anruf', 'anfrage', 'offerte', 'baubeginn')) = 4,
  'Zeitachse enthält Anruf, Anfrage, Offerte und Baubeginn');
select is((public.kontakt_export('00000000-0000-0000-0000-00000000a001') -> 'offerten' -> 0 ->> 'nummer'), 'T5-O1',
  'Datenexport enthält die Offerten');

-- Zugriff: angemeldete Personen mit Recht «basis» sehen Kunden, Unangemeldete nichts.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);
select is((select count(*) from public.kunden_uebersicht where kundennummer is not null
            and id in ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a002')), 2::bigint,
  'Verkauf sieht die Kunden in der Übersicht');
select is((select stand from public.kundenstand('00000000-0000-0000-0000-00000000a002')), null, 'Verkauf darf den Stand abfragen');
reset role;

set local role anon;
select throws_ok($$ select * from public.kundenstand('00000000-0000-0000-0000-00000000a001') $$, '42501', null,
  'anon darf den Stand nicht abfragen');
reset role;

-- Zugriffsregeln werden einmal pro Abfrage geprüft (initPlan), nicht pro Zeile. Ausnahme ist das
-- Protokoll: dort hängt das nötige Recht von der Tabelle in der jeweiligen Zeile ab.
select is((select count(*) from pg_policies where schemaname = 'public' and tablename <> 'aenderungsprotokoll'
            and (qual ~ '^intern\.hat_recht' or with_check ~ '^intern\.hat_recht')), 0::bigint,
  'keine Zugriffsregel ruft hat_recht ohne select auf');

select * from finish();
rollback;
