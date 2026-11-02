-- Prüft den Spesen-Ausbau (Entscheid 0039): Kilometer rechnen, MWST aus dem Betrag, Hinweise (doppelt, ohne Beleg,
-- Richtwert), Prüfen/Rückfrage/Ablehnen nur Buchhaltung mit Glocke, Antwort auf Rückfrage, Auszahlungslauf ohne
-- Firmenkarte, feste Stände und Spesen in der Nachkalkulation.
-- Ausführen: npm run db:test
begin;
select plan(26);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'sp-bh@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'sp-mt@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000039b1', 'sp_bh', 'Bea Buchhaltung', '00000000-0000-0000-0000-0000000039a1', 'buchhaltung', '{}'),
  ('00000000-0000-0000-0000-0000000039b2', 'sp_mt', 'Mario Montage', '00000000-0000-0000-0000-0000000039a2', 'montage', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000039c1', 'person', 'privat', 'Anna', 'Huber', 'de');
insert into public.projekte (id, nummer, kontakt_id, status, vertragswert_rappen) values
  ('00000000-0000-0000-0000-0000000039e1', '939001', '00000000-0000-0000-0000-0000000039c1', 'im_bau', 3243000);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true);

-- Erfassen als Monteur ------------------------------------------------------------------------------------------
insert into public.spesen (id, person_id, datum, betrag_rappen, kategorie, zweck, art, km, projekt_id) values
  ('00000000-0000-0000-0000-000000003901', '00000000-0000-0000-0000-0000000039b2', current_date, 1, 'Kilometer Privatauto',
   'Baustelle Romont', 'kilometer', 42, '00000000-0000-0000-0000-0000000039e1');
select is((select betrag_rappen from public.spesen where id = '00000000-0000-0000-0000-000000003901'), 2940::bigint,
  'Kilometer: 42 km × 0.70 = CHF 29.40');

insert into public.spesen (id, person_id, datum, betrag_rappen, kategorie, zweck, mwst_satz, projekt_id, personen, status) values
  ('00000000-0000-0000-0000-000000003902', '00000000-0000-0000-0000-0000000039b2', current_date, 3240, 'Verpflegung',
   'Mittagessen', 8.1, '00000000-0000-0000-0000-0000000039e1', 1, 'ausbezahlt');
select is((select status from public.spesen where id = '00000000-0000-0000-0000-000000003902'), 'eingereicht',
  'neue Spese ist immer eingereicht');
select is((select mwst_rappen from public.spesen where id = '00000000-0000-0000-0000-000000003902'), 243::bigint,
  'MWST aus dem Betrag inkl. gerechnet');

insert into public.spesen (id, person_id, datum, betrag_rappen, kategorie, zweck) values
  ('00000000-0000-0000-0000-000000003903', '00000000-0000-0000-0000-0000000039b2', current_date, 3240, 'Verpflegung', 'nochmals');
select ok((select 'doppelt' = any (hinweise) from public.spesen_liste where id = '00000000-0000-0000-0000-000000003903'),
  'Hinweis doppelt: gleiche Person, Datum, Betrag');
select ok((select 'ohne_beleg' = any (hinweise) from public.spesen_liste where id = '00000000-0000-0000-0000-000000003903'),
  'Hinweis ohne Beleg ab CHF 20');
select ok(not ((select 'ohne_beleg' = any (hinweise) from public.spesen_liste where id = '00000000-0000-0000-0000-000000003901')),
  'Kilometer brauchen keinen Beleg');

insert into public.spesen (id, person_id, datum, betrag_rappen, kategorie, zweck, personen) values
  ('00000000-0000-0000-0000-000000003904', '00000000-0000-0000-0000-0000000039b2', current_date - 1, 18600, 'Kundenessen',
   'Unterschrift Werkvertrag', 2);
select ok((select 'richtwert' = any (hinweise) from public.spesen_liste where id = '00000000-0000-0000-0000-000000003904'),
  'Hinweis über Richtwert (2 × CHF 60)');

insert into public.spesen (id, person_id, datum, betrag_rappen, kategorie, zweck, bezahlt_mit) values
  ('00000000-0000-0000-0000-000000003905', '00000000-0000-0000-0000-0000000039b2', current_date, 9640, 'Fahrt / Kilometer',
   'Diesel Firmenbus', 'firmenkarte');

select throws_ok($$ select public.spesen_geprueft('{00000000-0000-0000-0000-000000003901}') $$,
  'P0001', 'finanzen.kein_recht', 'prüfen nur Buchhaltung');
select throws_ok($$ update public.spesen set status = 'geprueft' where id = '00000000-0000-0000-0000-000000003901' $$,
  'P0001', 'finanzen.kein_recht', 'Stand geprüft nicht von Hand');
select lives_ok($$ update public.spesen set zweck = 'Baustelle Romont Overney' where id = '00000000-0000-0000-0000-000000003901' $$,
  'eingereichte Spese ändert die Person selbst');

-- Buchhaltung -------------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);
select is(public.spesen_geprueft('{00000000-0000-0000-0000-000000003901,00000000-0000-0000-0000-000000003902,00000000-0000-0000-0000-000000003905}'),
  3, 'drei geprüft');
select throws_ok($$ select public.spesen_rueckfrage('00000000-0000-0000-0000-000000003904', ' ') $$,
  'P0001', 'finanzen.grund_fehlt', 'Rückfrage braucht Text');
select public.spesen_rueckfrage('00000000-0000-0000-0000-000000003904', 'Wer war dabei?');
select is((select status from public.spesen where id = '00000000-0000-0000-0000-000000003904'), 'rueckfrage', 'Rückfrage gesetzt');
reset role;
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000039b2'
            and titel_de like 'Rückfrage%'), 1, 'Glocke zur Rückfrage');
set local role authenticated;
select public.spesen_ablehnen('00000000-0000-0000-0000-000000003903', 'doppelt erfasst');
select is((select status from public.spesen where id = '00000000-0000-0000-0000-000000003903'), 'abgelehnt', 'abgelehnt');

-- Person beantwortet die Rückfrage ----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true);
update public.spesen set notiz = 'Mit Herrn und Frau Huber' where id = '00000000-0000-0000-0000-000000003904';
select is((select status from public.spesen where id = '00000000-0000-0000-0000-000000003904'), 'eingereicht',
  'Antwort auf Rückfrage: wieder eingereicht');
select throws_ok($$ update public.spesen set betrag_rappen = 100 where id = '00000000-0000-0000-0000-000000003901' $$,
  'P0001', 'finanzen.spesen_fest', 'geprüfte Spese ändert die Person nicht mehr');
select throws_ok($$ update public.spesen set zweck = 'x' where id = '00000000-0000-0000-0000-000000003903' $$,
  'P0001', 'finanzen.spesen_fest', 'abgelehnte Spese ist fest');

-- Auszahlung --------------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);
select isnt(public.spesen_auszahlung('{00000000-0000-0000-0000-000000003901,00000000-0000-0000-0000-000000003902,00000000-0000-0000-0000-000000003905}',
  '2026-11-25', 'lohn', null), null, 'Auszahlungslauf erstellt');
select is((select status from public.spesen where id = '00000000-0000-0000-0000-000000003905'), 'geprueft',
  'Firmenkarte wird nie ausbezahlt');
select is((select titel || ' ' || anzahl || ' ' || total_rappen from public.spesen_auszahlungen_liste
            where id = (select auszahlung_id from public.spesen where id = '00000000-0000-0000-0000-000000003901')),
  'Lohn November 2026 2 6180', 'Lauf mit Titel, Anzahl und Total');
select is((select ausbezahlt_mit from public.spesen where id = '00000000-0000-0000-0000-000000003902'), 'lohn', 'mit dem Lohn');
reset role;
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000039b2'
            and titel_de like 'Spesen ausbezahlt%'), 1, 'eine Glocke je Person');
set local role authenticated;
select throws_ok($$ update public.spesen set betrag_rappen = 1 where id = '00000000-0000-0000-0000-000000003902' $$,
  'P0001', 'finanzen.spesen_fest', 'ausbezahlte Spese ist fest, auch für die Buchhaltung');
select is((public.nachkalkulation('00000000-0000-0000-0000-0000000039e1') -> 'ist' ->> 'spesen_rappen')::bigint,
  2940::bigint + 3240 - 243, 'Nachkalkulation: Spesen mit Projekt exkl. MWST');
select is((select count(*)::int from public.spesen_projekte() where nummer = '939001'), 1, 'Projekt zur Auswahl');

select * from finish();
rollback;
