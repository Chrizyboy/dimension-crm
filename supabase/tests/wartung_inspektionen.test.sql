-- Prüft Wartung Teil 2 (Entscheid 0044): Termin setzen, Ankündigung einmal pro Termin im Ausgangskorb (wartet auf
-- Freigabe), Termin nach «Wartung erledigt» leer, Mein Tag zeigt die Inspektion, Anlagen ohne Vertrag mit Angebot
-- (Serie, nicht doppelt am selben Tag) und Vorjahreswerte aus dem letzten Wartungs-Rapport.
-- Ausführen: npm run db:test
begin;
select plan(14);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000039a1', 'wi-pl@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000039b1', 'wi_pl', 'Paul Plan', '00000000-0000-0000-0000-0000000039a1', 'admin', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache, email) values
  ('00000000-0000-0000-0000-0000000039c1', 'person', 'privat', 'Lea', 'Inspekt', 'fr', 'lea.inspekt@example.ch'),
  ('00000000-0000-0000-0000-0000000039c2', 'person', 'privat', 'Tom', 'Ohne', 'de', 'tom.ohne@example.ch');
insert into public.objekte (id, kontakt_id, ort) values
  ('00000000-0000-0000-0000-0000000039d1', '00000000-0000-0000-0000-0000000039c1', 'Bulle'),
  ('00000000-0000-0000-0000-0000000039d2', '00000000-0000-0000-0000-0000000039c2', 'Muri AG');
insert into public.anlagen (id, objekt_id, leistung_kwp, ibn_am) values
  ('00000000-0000-0000-0000-0000000039e1', '00000000-0000-0000-0000-0000000039d1', 12, '2025-03-01'),
  ('00000000-0000-0000-0000-0000000039e2', '00000000-0000-0000-0000-0000000039d2', 64, '2025-06-01');
insert into public.wartungsvertraege (id, kontakt_id, anlage_id, start_am, paket, anlage_kwp, sprache) values
  ('00000000-0000-0000-0000-0000000039f1', '00000000-0000-0000-0000-0000000039c1', '00000000-0000-0000-0000-0000000039e1',
   current_date + 1, 'premium', 12, 'fr');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);

-- Termin
select throws_ok($$ select public.wartung_termin_setzen('00000000-0000-0000-0000-0000000039f1', now() + interval '5 days',
  now() + interval '4 days', null) $$, 'wartung.termin_ungueltig', 'Ende vor Beginn abgelehnt');
select lives_ok($$ select public.wartung_termin_setzen('00000000-0000-0000-0000-0000000039f1',
  date_trunc('day', now() + interval '5 days') + interval '8 hours', date_trunc('day', now() + interval '5 days') + interval '11 hours',
  '00000000-0000-0000-0000-0000000039b1') $$, 'Termin gesetzt');
select is(jsonb_array_length((select public.mein_tag(current_date + 5, current_date + 5) -> 'eintraege')), 1, 'Mein Tag zeigt die Inspektion');
select is((select public.mein_tag(current_date + 5, current_date + 5) -> 'eintraege' -> 0 ->> 'typ'), 'wartung', 'als Wartung');

-- Ankündigung (Zeitplan): einmal, wartet auf Freigabe, in der Kundensprache
reset role;
select is(public.wartung_ankuendigungen(), 1, 'Ankündigung angelegt');
select is(public.wartung_ankuendigungen(), 0, 'nicht doppelt');
select is((select status || '/' || sprache from public.ausgangskorb where bezug_id = '00000000-0000-0000-0000-0000000039f1'),
  'wartet/fr', 'wartet auf Freigabe, Französisch');
select matches((select betreff from public.ausgangskorb where bezug_id = '00000000-0000-0000-0000-0000000039f1'),
  '^Inspection de votre installation', 'Text aus der Vorlage');

-- Erledigt: Termin leer
select public.wartung_erledigt('00000000-0000-0000-0000-0000000039f1', current_date, 'ok');
select is((select termin_von from public.wartungsvertraege where id = '00000000-0000-0000-0000-0000000039f1'), null,
  'Nach «erledigt» ist der Termin leer');

-- Ohne Vertrag
select ok(not exists (select 1 from public.wartung_ohne_vertrag where anlage_id = '00000000-0000-0000-0000-0000000039e1'),
  'Anlage mit Vertrag erscheint nicht');
select is((select paket || '/' || tarif_rappen from public.wartung_ohne_vertrag where anlage_id = '00000000-0000-0000-0000-0000000039e2'),
  'premium/95000', 'über 50 kWp: Premium mit Tarif');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);
select is(public.wartung_angebot_senden(array['00000000-0000-0000-0000-0000000039e2'::uuid]), 1, 'Angebot gesendet');
select is(public.wartung_angebot_senden(array['00000000-0000-0000-0000-0000000039e2'::uuid]), 0, 'am selben Tag nicht doppelt');

-- Vorjahr aus dem letzten abgeschlossenen Wartungs-Rapport
reset role;
insert into public.rapporte (art, datum, wartungsvertrag_id, pruefpunkte, abgeschlossen_am)
values ('wartung', current_date - 365, '00000000-0000-0000-0000-0000000039f1', '{"isolation": "41"}', now() - interval '365 days');
select is(public.wartung_vorjahr('00000000-0000-0000-0000-0000000039f1') -> 'werte' ->> 'isolation', '41', 'Vorjahreswert');

select * from finish();
rollback;
