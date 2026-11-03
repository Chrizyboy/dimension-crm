-- Prüft den Dienst-Wächter (Microsoft je Person, Zeitplan-Job, Sicherung, SMS-Guthaben, AbaNinja), den Zustand der
-- Dienste und die Checklisten Eintritt/Austritt (Modul-Prüfung 28A). Ausführen: npm run db:test
begin;
select plan(14);

delete from intern.dienst_meldungen;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000042a1', 'p42-ad@test.local'),
  ('00000000-0000-0000-0000-0000000042a2', 'p42-mo@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000042b1', 'p42_ad', 'Alma Admin', '00000000-0000-0000-0000-0000000042a1', 'admin', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000042b2', 'p42_mo', 'Marc Monteur', '00000000-0000-0000-0000-0000000042a2', 'montage', '{}', 'fr'),
  ('00000000-0000-0000-0000-0000000042b3', 'p42_ne', 'Nina Neu', null, 'montage', '{}', 'de');
insert into intern.microsoft_verbindungen (person_id, konto, token, fehler) values
  ('00000000-0000-0000-0000-0000000042b2', 'marc@beispiel.test', 'x', 'neu_verbinden');
insert into intern.zeitplan_laeufe (job, zuletzt_am, ok, meldung) values ('p42_job', now(), false, 'graph_401')
on conflict (job) do update set zuletzt_am = now(), ok = false, meldung = 'graph_401';
insert into public.personal_akten (person_id, eintritt) values ('00000000-0000-0000-0000-0000000042b3', current_date + 10);
insert into public.handbuch_eintraege (id, art, titel_de, titel_fr, datum) values
  ('00000000-0000-0000-0000-0000000042f1', 'prozess', 'Offerte erstellen', 'Créer une offre', current_date - 400);

select ok(public.dienste_pruefen('{"sms": {"ok": true, "credits": 42}, "abaninja": {"ok": false, "meldung": "401"}}') >= 5,
  'Wächter meldet mehrere Ausfälle');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000042b2'
             and titel_de = 'Microsoft neu verbinden' and popup), 1, 'Person selbst: Microsoft neu verbinden');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000042b1'
             and titel_de = 'Microsoft getrennt: Marc Monteur'), 1, 'Administration erfährt es auch');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000042b1'
             and titel_de like 'Zeitplan: «p42_job»%'), 1, 'fehlender Job an die Administration');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000042b1'
             and titel_de = 'SMS-Guthaben fast leer: 42'), 1, 'wenig SMS-Guthaben');
select is((select zuletzt_ok from public.integrationen where dienst = 'abaninja'), false, 'AbaNinja im Zustand als gestört');

-- Zweiter Lauf: nichts doppelt
select public.dienste_pruefen('{"sms": {"ok": true, "credits": 42}, "abaninja": {"ok": false, "meldung": "401"}}');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000042b1'
             and titel_de like 'SMS-Guthaben%'), 1, 'nur einmal pro Ausfall');

-- Behoben und wieder kaputt: läutet erneut
select public.dienste_pruefen('{"sms": {"ok": true, "credits": 900}}');
select ok(not exists (select 1 from intern.dienst_meldungen where schluessel = 'sms_guthaben'), 'Guthaben wieder ok');
select public.dienste_pruefen('{"sms": {"ok": true, "credits": 10}}');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000042b1'
             and titel_de like 'SMS-Guthaben%'), 2, 'neuer Ausfall läutet wieder');

-- Checkliste «Neue Person»: fünf Aufgaben an die Administration, nur einmal
select is((select count(*)::int from public.aufgaben where bezug_tabelle = 'personen'
             and bezug_id = '00000000-0000-0000-0000-0000000042b3' and person_id = '00000000-0000-0000-0000-0000000042b1'), 5,
  'Checkliste Eintritt');
select is((select faellig_am from public.aufgaben where bezug_id = '00000000-0000-0000-0000-0000000042b3'
             and person_id = '00000000-0000-0000-0000-0000000042b1' and titel like 'Einladung%'), current_date + 9, 'Einladung am Vortag');

select is((select count(*)::int from public.aufgaben where person_id = '00000000-0000-0000-0000-0000000042b1'
             and titel = 'Prozess prüfen: Offerte erstellen'), 1, 'alter Prozess kommt zur Prüfung, nur einmal');

-- Zustand der Dienste: nur Administration
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000042a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000042a1', true);
select ok(exists (select 1 from jsonb_array_elements(public.dienste_zustand() -> 'microsoft') m
                   where m ->> 'name' = 'Marc Monteur' and not (m ->> 'ok')::boolean), 'Zustand zeigt getrennte Person');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000042a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000042a2', true);
select throws_ok('select public.dienste_zustand()', '42501', null, 'Monteur sieht den Zustand nicht');
reset role;

select * from finish();
rollback;
