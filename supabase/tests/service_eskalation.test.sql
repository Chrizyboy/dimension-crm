-- Prüft die Eskalation dringender Service-Fälle (Modul-Prüfung 22A): nach 2 Stunden ohne Reaktion Glocke an
-- zuständige Person und Stellvertretung, nach 4 Stunden an die Administration; Reaktion stoppt; nur der Server.
-- Ausführen: npm run db:test
begin;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000033a1', 'p33-sv@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000033b1', 'p33_sv', 'Sina Service', '00000000-0000-0000-0000-0000000033a1', 'projektleitung', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000033b2', 'p33_vt', 'Viktor Vertretung', null, 'projektleitung', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000033b3', 'p33_ad', 'Ada Admin', null, 'admin', '{}', 'de');
update public.einstellungen set wert = jsonb_set(wert, '{stellvertretung,p33_sv}', '"p33_vt"') where schluessel = 'zustaendigkeiten';
insert into public.kontakte (id, art, kontaktart, vorname, nachname) values
  ('00000000-0000-0000-0000-0000000033c1', 'person', 'privat', 'Hans', 'Beispiel');

insert into public.service_faelle (id, nummer, kontakt_id, titel, prioritaet, person_id, erstellt_am) values
  ('00000000-0000-0000-0000-0000000033f1', 'S9331', '00000000-0000-0000-0000-0000000033c1', 'Anlage aus', 'hoch',
   '00000000-0000-0000-0000-0000000033b1', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-0000000033f2', 'S9332', '00000000-0000-0000-0000-0000000033c1', 'Frage', 'normal',
   '00000000-0000-0000-0000-0000000033b1', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-0000000033f3', 'S9333', '00000000-0000-0000-0000-0000000033c1', 'Ganz neu', 'hoch',
   '00000000-0000-0000-0000-0000000033b1', now() - interval '30 minutes');

select is(public.service_eskalieren(), 1, 'nur der dringende Fall nach 2 Stunden');
select is((select array_agg(person_id order by person_id) from public.benachrichtigungen where ziel like '%33f1'),
  array['00000000-0000-0000-0000-0000000033b1', '00000000-0000-0000-0000-0000000033b2']::uuid[],
  'Glocke an zuständige Person und Stellvertretung');
select is(public.service_eskalieren(), 0, 'nicht zweimal in derselben Stufe');

update public.service_faelle set erstellt_am = now() - interval '5 hours' where id = '00000000-0000-0000-0000-0000000033f1';
select is(public.service_eskalieren(), 1, 'nach der doppelten Zeit zweite Stufe');
select ok(exists (select 1 from public.benachrichtigungen where ziel like '%33f1' and art = 'kritisch'
                   and person_id = '00000000-0000-0000-0000-0000000033b3'), 'zweite Stufe an die Administration');

-- Reaktion stoppt die Eskalation
update public.service_faelle set erstellt_am = now() - interval '3 hours' where id = '00000000-0000-0000-0000-0000000033f3';
update public.service_faelle set status = 'in_arbeit' where id = '00000000-0000-0000-0000-0000000033f3';
select isnt((select reaktion_am from public.service_faelle where id = '00000000-0000-0000-0000-0000000033f3'), null,
  'Stand geändert = Reaktion');
select is(public.service_eskalieren(), 0, 'nach Reaktion keine Glocke');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000033a1", "role": "authenticated"}', true);
select throws_ok($$ select public.service_eskalieren() $$, '42501', null, 'nur der Server');

select * from finish();
rollback;
