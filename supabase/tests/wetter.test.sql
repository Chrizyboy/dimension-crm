-- Prüft «Wetter auf den Baustellen» (3.11.2026, Entscheid 0050): PLZ für den Zeitplan, Speichern nur durch den
-- Zeitplan, Baustellen nur für Team und Projektleitung, «Achtung» nach den Schwellen der Einstellungen.
-- Ausführen: npm run db:test
begin;
set local timezone = 'Europe/Zurich';
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000045a1', 'we-mo@test.local'),
  ('00000000-0000-0000-0000-0000000045a2', 'we-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle) values
  ('00000000-0000-0000-0000-0000000045b1', 'we_mo', 'Moritz Wetter', '00000000-0000-0000-0000-0000000045a1', 'montage'),
  ('00000000-0000-0000-0000-0000000045b2', 'we_vk', 'Vreni Wetter', '00000000-0000-0000-0000-0000000045a2', 'verkauf');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000045c1', 'person', 'privat', 'Rita', 'Regenprobe', 'de');
insert into public.objekte (id, kontakt_id, strasse, plz, ort) values
  ('00000000-0000-0000-0000-0000000045d1', '00000000-0000-0000-0000-0000000045c1', 'Wolkenweg 1', '6280', 'Hochdorf');
insert into public.projekte (id, nummer, titel, kontakt_id, objekt_id) values
  ('00000000-0000-0000-0000-0000000045e1', 'T45-1', 'PV Regenprobe', '00000000-0000-0000-0000-0000000045c1',
   '00000000-0000-0000-0000-0000000045d1');
insert into public.einsaetze (projekt_id, von, bis, personen) values
  ('00000000-0000-0000-0000-0000000045e1', current_date, current_date + 1, array['00000000-0000-0000-0000-0000000045b1'::uuid]);

select ok('6280' = any (public.wetter_plz()), 'PLZ der Baustelle wird geholt');
select is(public.wetter_speichern(jsonb_build_array(
  jsonb_build_object('plz', '6280', 'datum', current_date, 'tmin', 4.2, 'tmax', 11.8, 'regen_mm', 0.2, 'wind_kmh', 20),
  jsonb_build_object('plz', '6280', 'datum', current_date + 1, 'tmin', 3, 'tmax', 9, 'regen_mm', 8.4),
  jsonb_build_object('plz', 'abc', 'datum', current_date)), 'lauf-1'), 2, 'zwei gültige Tage gespeichert');
select is(public.wetter_speichern(jsonb_build_array(
  jsonb_build_object('plz', '6280', 'datum', current_date, 'tmin', 5, 'tmax', 12, 'regen_mm', 0)), 'lauf-2'), 1,
  'neuer Lauf überschreibt den Tag');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000045a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000045a1', true);
select throws_ok($$ select public.wetter_speichern('[]', null) $$, '42501', null, 'App darf nicht speichern');
select is(jsonb_array_length(public.wetter_baustellen()), 2, 'Montage sieht ihre Baustelle an zwei Tagen');
select is((select (z ->> 'tmax')::numeric from jsonb_array_elements(public.wetter_baustellen()) z
            where (z ->> 'datum')::date = current_date), 12.0, 'Wert aus dem neuesten Lauf');
select is((select (z ->> 'achtung')::boolean from jsonb_array_elements(public.wetter_baustellen()) z
            where (z ->> 'datum')::date = current_date + 1), true, 'Regen über der Schwelle gibt Achtung');
select throws_ok($$ update public.einstellungen set wert = wert || '{"tage": 9}' where schluessel = 'wetter' $$,
  '42501', null, 'Wetter-Einstellungen nur Administration');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000045a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000045a2', true);
select is(jsonb_array_length(public.wetter_baustellen()), 0, 'Verkauf ohne Einsatz sieht keine Baustelle');

select * from finish();
rollback;
