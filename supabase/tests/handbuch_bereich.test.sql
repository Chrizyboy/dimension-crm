-- Prüft Entscheid 0043: Prozesse und Videos einem Bereich zuordnen, nur Administration; leer hebt die Zuordnung auf,
-- ungültige Namen lehnt die Tabelle ab.
-- Ausführen: npm run db:test
begin;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'hb39-vk@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'hb39-ad@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000039b1', 'hb39_vk', 'Vera Vertrieb', '00000000-0000-0000-0000-0000000039a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000039b2', 'hb39_ad', 'Adam Admin', '00000000-0000-0000-0000-0000000039a2', 'admin', '{}', 'de');
insert into public.dokumente (id, name, speicher, ordner) values
  ('00000000-0000-0000-0000-0000000039d1', 'Prozess_Offerte.pdf', 'intern', 'handbuch');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a2', true);
select set_config('test.hb39', public.handbuch_speichern(null, 'prozess', 'HB39 Offerte senden', null, null, null, '1.0',
  null, '00000000-0000-0000-0000-0000000039d1', null)::text, true);
select public.handbuch_bereich_setzen(current_setting('test.hb39')::uuid, 'quotes');
select is((select bereich from public.handbuch_eintraege where id = current_setting('test.hb39')::uuid), 'quotes',
  'Administration ordnet den Prozess dem Bereich Offerten zu');
select throws_ok($$ select public.handbuch_bereich_setzen(current_setting('test.hb39')::uuid, 'Offerten!') $$, '23514', null,
  'nur gültige Bereichs-Kennungen');
select public.handbuch_bereich_setzen(current_setting('test.hb39')::uuid, '  ');
select is((select bereich from public.handbuch_eintraege where id = current_setting('test.hb39')::uuid), null,
  'leer hebt die Zuordnung auf');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a1', true);
select throws_ok($$ select public.handbuch_bereich_setzen(current_setting('test.hb39')::uuid, 'sales') $$, '42501',
  'handbuch.kein_recht', 'zuordnen nur Administration');
select is((select count(*)::int from public.handbuch_eintraege where id = current_setting('test.hb39')::uuid), 1,
  'alle dürfen den Eintrag lesen');

select * from finish();
rollback;
