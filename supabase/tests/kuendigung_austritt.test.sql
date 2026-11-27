-- Prüft die Kündigung: nur Administration erfasst sie, bis und mit Austrittstag gelten die Rechte, danach nicht
-- mehr; der Zeitplan schaltet die Person aus und gibt Offenes an die Nachfolge, Erledigtes bleibt.
-- Ausführen: npm run db:test
begin;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a1a1', 'p-kue-admin@test.local'),
  ('00000000-0000-0000-0000-00000000a1a2', 'p-kue-geht@test.local'),
  ('00000000-0000-0000-0000-00000000a1a3', 'p-kue-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-00000000a1b1', 'kue_admin', 'Ada Admin', '00000000-0000-0000-0000-00000000a1a1', 'verkauf', '{admin}', 'de'),
  ('00000000-0000-0000-0000-00000000a1b2', 'kue_geht', 'Gerd Geht', '00000000-0000-0000-0000-00000000a1a2', 'projektleitung', '{}', 'fr'),
  ('00000000-0000-0000-0000-00000000a1b3', 'kue_neu', 'Nina Neu', null, 'projektleitung', '{}', 'fr'),
  ('00000000-0000-0000-0000-00000000a1b4', 'kue_vk', 'Vera Verkauf', '00000000-0000-0000-0000-00000000a1a3', 'verkauf', '{}', 'de');
insert into public.aufgaben (id, titel, person_id, erledigt_am) values
  ('00000000-0000-0000-0000-00000000a1c1', 'Offen', '00000000-0000-0000-0000-00000000a1b2', null),
  ('00000000-0000-0000-0000-00000000a1c2', 'Erledigt', '00000000-0000-0000-0000-00000000a1b2', now());
insert into public.einstellungen (schluessel, wert) values ('test_kuendigung', '{"service": "kue_geht", "andere": "kue_vk"}')
on conflict (schluessel) do update set wert = excluded.wert;

-- Nicht-Admin darf keine Kündigung erfassen
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a1a3", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a1a3', true);
select throws_ok($$ select public.person_austritt_setzen('00000000-0000-0000-0000-00000000a1b2', current_date) $$,
  '42501', null, 'Verkauf erfasst keine Kündigung');

-- Administration erfasst Kündigung mit Nachfolge, Austritt in der Zukunft
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a1a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a1a1', true),
       set_config('dw.rechte', '', true);
select lives_ok($$ select public.person_austritt_setzen('00000000-0000-0000-0000-00000000a1b2',
  intern.heute_ch() + 30, '00000000-0000-0000-0000-00000000a1b3') $$, 'Administration erfasst Kündigung');
reset role;

select is((select austritt from public.personal_akten where person_id = '00000000-0000-0000-0000-00000000a1b2'
            and geloescht_am is null), intern.heute_ch() + 30, 'Austritt steht auch in der Personal-Akte');
select ok('basis' = any (intern.wirksame_rechte('00000000-0000-0000-0000-00000000a1b2')),
  'vor dem Austritt: Zugang wie bisher');

-- Austrittstag ist vorbei
update public.personen set austritt_am = intern.heute_ch() - 1 where id = '00000000-0000-0000-0000-00000000a1b2';
select is(intern.wirksame_rechte('00000000-0000-0000-0000-00000000a1b2'), null::text[],
  'nach dem Austrittstag: keine Rechte mehr, auch vor dem Zeitplan');
select is(intern.austritte_vollziehen(), 1, 'Zeitplan vollzieht einen Austritt');
select is((select aktiv from public.personen where id = '00000000-0000-0000-0000-00000000a1b2'), false,
  'Person ist ausgeschaltet');
select is((select count(*)::int from public.personen where id = '00000000-0000-0000-0000-00000000a1b2'
            and geloescht_am is null), 1, 'Daten bleiben (nicht gelöscht)');
select is((select person_id from public.aufgaben where id = '00000000-0000-0000-0000-00000000a1c1'),
  '00000000-0000-0000-0000-00000000a1b3'::uuid, 'offene Aufgabe geht an die Nachfolge');
select is((select person_id from public.aufgaben where id = '00000000-0000-0000-0000-00000000a1c2'),
  '00000000-0000-0000-0000-00000000a1b2'::uuid, 'erledigte Aufgabe bleibt bei der Person');
select is((select wert from public.einstellungen where schluessel = 'test_kuendigung'),
  '{"service": "kue_neu", "andere": "kue_vk"}'::jsonb, 'Regeln in den Einstellungen gehen an die Nachfolge');

select * from finish();
rollback;
