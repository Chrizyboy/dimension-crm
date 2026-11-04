-- Prüft «Team stempelt gemeinsam» (Chris 4.11.2026): ein Start/Stopp für alle im heutigen Einsatz,
-- auf dasselbe Ziel; wer nicht im Team ist, kann nicht gestempelt werden.
-- Ausführen: npm run db:test
begin;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000d1a1', 'tz-ds@test.local'),
  ('00000000-0000-0000-0000-00000000d1a2', 'tz-dd@test.local'), ('00000000-0000-0000-0000-00000000d1a3', 'tz-xx@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache, profil) values
  ('00000000-0000-0000-0000-00000000d1b1', 'tz_ds', 'Diogo Eins', 'tz-ds@test.local', '00000000-0000-0000-0000-00000000d1a1', 'montage', '{}', 'fr', '{}'),
  ('00000000-0000-0000-0000-00000000d1b2', 'tz_dd', 'Diogo Zwei', 'tz-dd@test.local', '00000000-0000-0000-0000-00000000d1a2', 'montage', '{}', 'fr', '{}'),
  ('00000000-0000-0000-0000-00000000d1b3', 'tz_xx', 'Xaver Fremd', 'tz-xx@test.local', '00000000-0000-0000-0000-00000000d1a3', 'montage', '{}', 'de', '{}');
insert into public.kontakte (id, vorname, nachname) values ('00000000-0000-0000-0000-00000000d1c1', 'Sophie', 'Morand');
insert into public.projekte (id, nummer, titel, kontakt_id) values
  ('00000000-0000-0000-0000-00000000d1e1', 'P-TZ-1', 'Dach', '00000000-0000-0000-0000-00000000d1c1');
insert into public.einsaetze (projekt_id, art, von, bis, personen) values
  ('00000000-0000-0000-0000-00000000d1e1', 'intern', (now() at time zone 'Europe/Zurich')::date, (now() at time zone 'Europe/Zurich')::date,
   array['00000000-0000-0000-0000-00000000d1b1', '00000000-0000-0000-0000-00000000d1b2']::uuid[]);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000d1a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d1a1', true);

select is((select jsonb_array_length(public.mein_team_heute())), 2, 'Team heute: beide Diogos');
select is((select public.mein_team_heute() -> 0 ->> 'name'), 'Diogo Eins', 'ich zuerst');

select is(public.zeit_team(jsonb_build_object('aktion', 'start', 'intern', 'lager', 'start', now() - interval '2 hours', 'personen', jsonb_build_array(
  jsonb_build_object('person_id', '00000000-0000-0000-0000-00000000d1b1', 'id', '00000000-0000-0000-0000-00000000d1d1'),
  jsonb_build_object('person_id', '00000000-0000-0000-0000-00000000d1b2', 'id', '00000000-0000-0000-0000-00000000d1d2')))), 2,
  'ein Start für beide (Lager)');
select is(public.zeit_team(jsonb_build_object('aktion', 'start', 'projekt_id', '00000000-0000-0000-0000-00000000d1e1', 'start', now() - interval '1 hour',
  'personen', jsonb_build_array(
  jsonb_build_object('person_id', '00000000-0000-0000-0000-00000000d1b1', 'id', '00000000-0000-0000-0000-00000000d1d3'),
  jsonb_build_object('person_id', '00000000-0000-0000-0000-00000000d1b2', 'id', '00000000-0000-0000-0000-00000000d1d4')))), 2,
  'Wechsel auf die Baustelle beendet die Lager-Zeit');
select is((select (public.mein_team_heute() -> 1 ->> 'laeuft')::boolean), true, 'Zeit des Kollegen läuft');

select throws_ok($$ select public.zeit_team(jsonb_build_object('aktion', 'start', 'intern', 'lager', 'personen', jsonb_build_array(
  jsonb_build_object('person_id', '00000000-0000-0000-0000-00000000d1b3')))) $$, 'P0001', 'baustelle.nicht_im_team', 'Fremde nicht');

select is(public.zeit_team(jsonb_build_object('aktion', 'stopp', 'pause_min', 30, 'personen',
  jsonb_build_array('00000000-0000-0000-0000-00000000d1b1', '00000000-0000-0000-0000-00000000d1b2'))), 2, 'ein Stopp für beide');

select * from finish();
rollback;
