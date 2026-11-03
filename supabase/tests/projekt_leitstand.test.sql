-- Prüft Leitstand und Projekt-Akte (Entscheid 0048): Signale je Projekt (fällige Tranche, offene Nachträge,
-- nächster Einsatz), die Akte in einer Abfrage und Einträge im Verlauf.
-- Ausführen: npm run db:test
begin;
select plan(9);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000039a1', 'pl-leitung@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000039b1', 'pl_leitung', 'Paul Leitung', '00000000-0000-0000-0000-0000000039a1', 'projektleitung', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000039c1', 'person', 'privat', 'Mia', 'Muster', 'de');
insert into public.projekte (id, nummer, kontakt_id, status, bau_status, verantwortlich_id) values
  ('00000000-0000-0000-0000-0000000039d1', 'P-TEST-039', '00000000-0000-0000-0000-0000000039c1', 'im_bau', 'terminiert',
   '00000000-0000-0000-0000-0000000039b1');
insert into public.zahlungsplan (projekt_id, bezeichnung, betrag_rappen, faellig_am) values
  ('00000000-0000-0000-0000-0000000039d1', 'Anzahlung 30 %', 1167000, current_date - 3),
  ('00000000-0000-0000-0000-0000000039d1', 'Nach Montage 60 %', 2334000, current_date + 30);
insert into public.nachtraege (projekt_id, beschreibung) values
  ('00000000-0000-0000-0000-0000000039d1', 'Batterie im Keller, Kabelweg länger');
insert into public.einsaetze (projekt_id, art, von, bis) values
  ('00000000-0000-0000-0000-0000000039d1', 'intern', current_date + 9, current_date + 11);

select is((select tranchen_faellig_rappen from public.projekt_signale where projekt_id = '00000000-0000-0000-0000-0000000039d1'),
  1167000::bigint, 'Nur die fällige Tranche zählt als zu verrechnen');
select is((select nachtraege_offen from public.projekt_signale where projekt_id = '00000000-0000-0000-0000-0000000039d1'),
  1, 'Offener Nachtrag gezählt');
select is((select naechster_einsatz from public.projekt_signale where projekt_id = '00000000-0000-0000-0000-0000000039d1'),
  current_date + 9, 'Nächster Einsatz');
select is((select verantwortlich_id from public.projekt_signale where projekt_id = '00000000-0000-0000-0000-0000000039d1'),
  '00000000-0000-0000-0000-0000000039b1'::uuid, 'Projektleitung für «Meine»');

select is(jsonb_array_length(public.projekt_akte('00000000-0000-0000-0000-0000000039d1') -> 'tranchen'), 2, 'Akte: Tranchen');
select is(jsonb_array_length(public.projekt_akte('00000000-0000-0000-0000-0000000039d1') -> 'einsaetze'), 1, 'Akte: Einsätze');

-- Verlauf als angemeldete Projektleitung
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);
select lives_ok($$ select public.projekt_vermerken('00000000-0000-0000-0000-0000000039d1', 'anruf', 'AEW: Zusage kommt diese Woche') $$,
  'Anruf festhalten');
select is((public.projekt_akte('00000000-0000-0000-0000-0000000039d1') -> 'verlauf' -> 0 ->> 'person'), 'Paul Leitung',
  'Verlauf zeigt, wer es festgehalten hat');
select throws_ok($$ select public.projekt_vermerken('00000000-0000-0000-0000-0000000039d1', 'notiz', '  ') $$,
  'projekte.text_fehlt', 'Leerer Eintrag abgelehnt');

select * from finish();
rollback;
