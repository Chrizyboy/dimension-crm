-- Prüft die Rechte nach dem Go-live (Modul-Prüfung 33A): Privates in der Personal-Akte statt im Profil, Freigabe
-- im Ausgangskorb je Art und Abwesenheiten nur selbst, Planung oder Administration. Ausführen: npm run db:test
begin;
select plan(16);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000043a1', 'p43-ad@test.local'),
  ('00000000-0000-0000-0000-0000000043a2', 'p43-vk@test.local'), ('00000000-0000-0000-0000-0000000043a3', 'p43-bh@test.local'),
  ('00000000-0000-0000-0000-0000000043a4', 'p43-pl@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache, aussendienst, profil) values
  ('00000000-0000-0000-0000-0000000043b1', 'p43_ad', 'Alma Admin', '00000000-0000-0000-0000-0000000043a1', 'admin', '{}', 'de', false, '{}'),
  ('00000000-0000-0000-0000-0000000043b2', 'p43_vk', 'Vera Verkauf', '00000000-0000-0000-0000-0000000043a2', 'verkauf', '{}', 'de', true,
   '{"position": "Verkauf", "strasse": "Feldweg 3", "plz": "5630", "ort": "Muri AG", "notfallName": "Paul", "pensum": "80%"}'),
  ('00000000-0000-0000-0000-0000000043b3', 'p43_bh', 'Berta Buchhaltung', '00000000-0000-0000-0000-0000000043a3', 'buchhaltung', '{}', 'de', false, '{}'),
  ('00000000-0000-0000-0000-0000000043b4', 'p43_pl', 'Pia Projektleitung', '00000000-0000-0000-0000-0000000043a4', 'projektleitung', '{}', 'de', false, '{}');

-- 1. Privates wandert in die Akte, das Profil behält nur Öffentliches
select is((select profil from public.personen where id = '00000000-0000-0000-0000-0000000043b2'), '{"position": "Verkauf"}'::jsonb,
  'Profil ohne Privates');
select is((select row(strasse, plz, ort, notfall_name, pensum)::text from public.personal_akten
            where person_id = '00000000-0000-0000-0000-0000000043b2'), '("Feldweg 3",5630,"Muri AG",Paul,80)',
  'Adresse, Notfallkontakt und Pensum in der Akte');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000043a2", "role": "authenticated"}', true);
select throws_ok($$select public.aendere_mein_konto('{"strasse": "Neu 1"}')$$, '22023', null, 'Mein Konto nimmt keine Adresse mehr');
select lives_ok($$select public.aendere_mein_konto('{"mobil": "+41 76 000 00 00"}')$$, 'öffentliche Angaben gehen weiter');
select is((select plz from public.aussendienst_heim() where person_id = '00000000-0000-0000-0000-0000000043b2'), '5630',
  'Heimadresse für die Tagesroute');

-- Andere sehen die Akte nicht (ausser die Administration)
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000043a3", "role": "authenticated"}', true);
select is((select count(*)::int from public.personal_akten_sicht where person_id = '00000000-0000-0000-0000-0000000043b2'), 0,
  'Akte fremder Personen unsichtbar');
select is((select count(*)::int from public.aussendienst_heim() where person_id = '00000000-0000-0000-0000-0000000043b2'), 1,
  'nur die Heimadresse ist für die Route sichtbar');
reset role;
select set_config('request.jwt.claims', '', true);

-- 2. Freigabe je Art
insert into public.ausgangskorb (id, kanal, art, an, betreff, text, status, absender_person_id) values
  ('00000000-0000-0000-0000-0000000043c1', 'mail', 'newsletter', 'a@beispiel.test', 'News', 'x', 'wartet', null),
  ('00000000-0000-0000-0000-0000000043c2', 'mail', 'mahnung', 'b@beispiel.test', 'Mahnung', 'x', 'wartet', null),
  ('00000000-0000-0000-0000-0000000043c3', 'mail', 'offerte', 'c@beispiel.test', 'Offerte', 'x', 'wartet', '00000000-0000-0000-0000-0000000043b2'),
  ('00000000-0000-0000-0000-0000000043c4', 'mail', 'frei', 'd@beispiel.test', 'Frage', 'x', 'wartet', null);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000043a2", "role": "authenticated"}', true);
select throws_ok($$select public.ausgang_freigeben(array['00000000-0000-0000-0000-0000000043c1'::uuid])$$, '42501',
  'ausgang.freigabe_kein_recht', 'Newsletter nicht durch den Verkauf');
select throws_ok($$select public.ausgang_freigeben(array['00000000-0000-0000-0000-0000000043c2'::uuid])$$, '42501',
  'ausgang.freigabe_kein_recht', 'Mahnung nicht durch den Verkauf');
select is(public.ausgang_freigeben(array['00000000-0000-0000-0000-0000000043c3'::uuid]), 1, 'eigene Mail gibt man selbst frei');

-- Mahnungen gibt zusätzlich nur die Freigabe-Person frei (Entscheid 0054); hier ist das die Buchhaltung.
reset role;
select set_config('request.jwt.claims', '', true);
update public.einstellungen set wert = jsonb_set(wert, '{mahnlauf,freigabe_person_ids}', '["00000000-0000-0000-0000-0000000043b3"]')
 where schluessel = 'finanzen';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000043a3", "role": "authenticated"}', true);
select is(public.ausgang_freigeben(array['00000000-0000-0000-0000-0000000043c2'::uuid]), 1, 'Mahnung durch die Buchhaltung');
select is(public.ausgang_freigeben(array['00000000-0000-0000-0000-0000000043c4'::uuid]), 1, 'ohne Absender darf jede Person');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000043a1", "role": "authenticated"}', true);
select is(public.ausgang_freigeben(array['00000000-0000-0000-0000-0000000043c1'::uuid]), 1, 'Newsletter durch die Administration');

-- 3. Abwesenheiten
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000043a2", "role": "authenticated"}', true);
select lives_ok($$insert into public.abwesenheiten (person_id, art, von, bis)
                  values ('00000000-0000-0000-0000-0000000043b2', 'ferien', current_date + 30, current_date + 34)$$,
  'eigene Ferien erfassen');
select throws_ok($$insert into public.abwesenheiten (person_id, art, von, bis)
                   values ('00000000-0000-0000-0000-0000000043b3', 'ferien', current_date + 30, current_date + 34)$$,
  '42501', null, 'nicht für andere ohne Planung');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000043a4", "role": "authenticated"}', true);
select lives_ok($$insert into public.abwesenheiten (person_id, art, von, bis)
                  values ('00000000-0000-0000-0000-0000000043b3', 'krank', current_date, current_date)$$,
  'Projektleitung plant für alle');
reset role;

select * from finish();
rollback;
