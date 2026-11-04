-- Rollen mit Zusätzen (2.11.2026): «gl» umfasst die Fachrechte, «admin» nur das System; Vorgesetzte sehen Zeiten
-- und erfassen Abwesenheiten der eigenen Mitarbeitenden; Posteingang nur eigenes Postfach und Team-Postfächer.
-- Ausführen: npm run db:test
begin;
select plan(15);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000055a1', 'rz-gl@test.local'),
  ('00000000-0000-0000-0000-0000000055a2', 'rz-ad@test.local'), ('00000000-0000-0000-0000-0000000055a3', 'rz-mo@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000055b1', 'rz_gl', 'Gina Leitung', '00000000-0000-0000-0000-0000000055a1', 'projektleitung', '{gl}', 'de'),
  ('00000000-0000-0000-0000-0000000055b2', 'rz_ad', 'Adi System', '00000000-0000-0000-0000-0000000055a2', 'verkauf', '{admin}', 'de'),
  ('00000000-0000-0000-0000-0000000055b3', 'rz_mo', 'Mo Montage', '00000000-0000-0000-0000-0000000055a3', 'montage', '{}', 'de');
insert into public.personal_akten (person_id, vorgesetzt_id)
values ('00000000-0000-0000-0000-0000000055b3', '00000000-0000-0000-0000-0000000055b2');
insert into public.zeiten (id, person_id, start, stopp, art, intern) values
  ('00000000-0000-0000-0000-0000000055c1', '00000000-0000-0000-0000-0000000055b3', now() - interval '3 hours', now() - interval '1 hour', 'arbeit', 'lager');
insert into public.posteingang (id, kennung, outlook_id, postfach, abgeholt_von, postfach_person_id, eingang_am, an) values
  ('00000000-0000-0000-0000-0000000055d1', '<rz1@x>', 'rz1', 'mo@test.local', '00000000-0000-0000-0000-0000000055b3',
   '00000000-0000-0000-0000-0000000055b3', now(), '{}'),
  ('00000000-0000-0000-0000-0000000055d2', '<rz2@x>', 'rz2', 'info@test.local', '00000000-0000-0000-0000-0000000055b3', null, now(), '{}');

-- 1. Wirksame Rechte
select is(intern.wirksame_rechte('00000000-0000-0000-0000-0000000055b1'),
  '{basis,finanzen,gl,marge,personal,planung,preise,visum}', 'GL umfasst alle Fachrechte, nicht admin');
select is(intern.wirksame_rechte('00000000-0000-0000-0000-0000000055b2'), '{admin,basis,marge}',
  'Administration ohne GL: nur System plus die Rechte der Rolle');
select ok('00000000-0000-0000-0000-0000000055b1' = any (intern.personal_berechtigte())
          and not '00000000-0000-0000-0000-0000000055b2' = any (intern.personal_berechtigte()),
  'Personal-Fristen gehen an GL, nicht an die Administration');

set local role authenticated;
-- 2. Administration ohne GL
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000055a2", "role": "authenticated"}', true);
select ok(intern.hat_recht('admin') and not intern.hat_recht('finanzen') and not intern.hat_recht('personal'),
  'Administration sieht keine Finanzen und keine Personal-Akten');
select is((select count(*)::int from public.rechnungen), 0, 'keine Rechnungen für die Administration ohne GL');
select is(public.meine_anmeldung() -> 'bereiche' -> 0, '"dashboard"'::jsonb, 'Seitenleiste nach der Rolle im Geschäft');
select is((select count(*)::int from public.zeiten where id = '00000000-0000-0000-0000-0000000055c1'), 1,
  'Vorgesetzter sieht die Zeiten der eigenen Mitarbeitenden');
select lives_ok($$insert into public.abwesenheiten (person_id, art, von, bis)
                  values ('00000000-0000-0000-0000-0000000055b3', 'ferien', current_date + 40, current_date + 41)$$,
  'Vorgesetzter erfasst Abwesenheiten der eigenen Mitarbeitenden');
select ok(public.darf_abwesenheit_erfassen('00000000-0000-0000-0000-0000000055b3')
          and not public.darf_abwesenheit_erfassen('00000000-0000-0000-0000-0000000055b1'), 'Anzeige: nur eigene Mitarbeitende');
select is((select count(*)::int from public.posteingang where id = '00000000-0000-0000-0000-0000000055d1'), 0,
  'persönliches Postfach anderer unsichtbar, auch für die Administration');
select is((select count(*)::int from public.posteingang where id = '00000000-0000-0000-0000-0000000055d2'), 1, 'info@ sieht jede Person');

-- 3. Geschäftsleitung
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000055a1", "role": "authenticated"}', true);
select is(public.meine_anmeldung() -> 'bereiche', '[]'::jsonb, 'GL sieht alle Bereiche');
select is((select count(*)::int from public.zeiten where id = '00000000-0000-0000-0000-0000000055c1'), 1, 'GL sieht alle Zeiten');
select is((select count(*)::int from public.posteingang where id = '00000000-0000-0000-0000-0000000055d1'), 0,
  'auch GL sieht kein fremdes Postfach');
select throws_ok($$update public.einstellungen set wert = wert where schluessel = 'posteingang'$$, '42501', null,
  'GL ändert keine Einstellungen');
reset role;

select * from finish();
rollback;
