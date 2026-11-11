-- Prüft Zeiterfassung und Abwesenheiten (Entscheid 0059): Antrag/Bewilligung durch die Zeit-Leitung, Krank sofort,
-- Sichtbarkeit (Leitung alle, sonst nur eigene), Feiertage, Soll/Saldo und Ferienkonto.
-- Ausführen: npm run db:test
begin;
select plan(28);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000fe0a1', 'ze-vk@test.local'),
  ('00000000-0000-0000-0000-0000000fe0a2', 'ze-le@test.local'),
  ('00000000-0000-0000-0000-0000000fe0a3', 'ze-mt@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache, standort_id) values
  ('00000000-0000-0000-0000-0000000fe0b1', 'ze_vk', 'Vera Verkauf', '00000000-0000-0000-0000-0000000fe0a1', 'verkauf', '{}', 'de',
   (select id from public.standorte where kuerzel = 'muri')),
  ('00000000-0000-0000-0000-0000000fe0b2', 'ze_le', 'Lars Leitung', '00000000-0000-0000-0000-0000000fe0a2', 'verkauf', '{}', 'de',
   (select id from public.standorte where kuerzel = 'muri')),
  ('00000000-0000-0000-0000-0000000fe0b3', 'ze_mt', 'Mia Montage', '00000000-0000-0000-0000-0000000fe0a3', 'montage', '{}', 'fr',
   (select id from public.standorte where kuerzel = 'bulle'));
update public.einstellungen set wert = jsonb_set(wert, '{leitung}', '["ze_le"]') where schluessel = 'zeiterfassung';
insert into public.personal_akten (person_id, pensum) values ('00000000-0000-0000-0000-0000000fe0b3', 80);
insert into public.zeiten (person_id, intern, start, stopp, pause_min) values
  ('00000000-0000-0000-0000-0000000fe0b3', 'lager', '2026-11-09 07:00+01', '2026-11-09 16:30+01', 60);

set local role authenticated;
create temp table k (n text primary key, id uuid) on commit drop;
grant all on k to authenticated;

-- ---------- Mitarbeiterin beantragt ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000fe0a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000fe0a1', true);
insert into k values ('ferien', public.abwesenheit_speichern(
  '{"art": "ferien", "von": "2026-12-21", "bis": "2026-12-31", "bemerkung": "Familie im Tessin"}'));
select is((select status from public.abwesenheiten where id = (select id from k where n = 'ferien')), 'beantragt',
          'Ferien der Mitarbeiterin sind beantragt');
insert into k values ('krank', public.abwesenheit_speichern('{"art": "krank", "von": "2026-11-10"}'));
select is((select status from public.abwesenheiten where id = (select id from k where n = 'krank')), 'bewilligt',
          'Krank gilt sofort');
select throws_ok($$ select public.abwesenheit_speichern('{"art": "ferien", "von": "2026-12-24", "bis": "2026-12-24"}') $$,
                 'P0001', 'zeit.ueberschneidung', 'Keine doppelten Abwesenheiten');
select throws_ok($$ select public.abwesenheit_entscheiden((select id from k where n = 'ferien'), true) $$,
                 '42501', 'zeit.kein_recht', 'Nicht selbst bewilligen');
select throws_ok($$ update public.abwesenheiten set status = 'bewilligt' where id = (select id from k where n = 'ferien') $$,
                 '42501', 'zeit.kein_recht', 'Stand nicht direkt setzen');
select is((select count(*)::int from public.abwesenheiten where person_id <> '00000000-0000-0000-0000-0000000fe0b1'
             and person_id::text like '00000000-0000-0000-0000-0000000fe%'), 0, 'Sieht keine fremden Abwesenheiten');
select is((select count(*)::int from public.zeiten where person_id = '00000000-0000-0000-0000-0000000fe0b3'), 0,
          'Sieht keine fremden Zeiten');
select is(jsonb_array_length(public.zeiterfassung(2026, '2026-11-09') -> 'personen'), 1, 'Übersicht nur mit sich selbst');
select is((public.zeiterfassung(2026, '2026-11-09') ->> 'leitung')::boolean, false, 'Keine Leitung');
select throws_ok($$ select public.zeit_tage('00000000-0000-0000-0000-0000000fe0b3', '2026-11-09', '2026-11-15') $$,
                 '42501', 'zeit.kein_recht', 'Fremde Tage gesperrt');
select throws_ok($$ select public.zeitkonto_setzen('00000000-0000-0000-0000-0000000fe0b1', 2026, 5, 0) $$,
                 '42501', 'zeit.kein_recht', 'Übertrag nur Leitung');

-- ---------- Zeit-Leitung ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000fe0a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000fe0a2', true);
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000fe0b2'
             and titel_de = 'Abwesenheit zu bewilligen'), 1, 'Glocke an die Leitung für den Antrag');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000fe0b2'
             and titel_de = 'Abwesenheit gemeldet'), 1, 'Glocke an die Leitung für Krank');
select ok((public.zeiterfassung(2026, '2026-11-09') ->> 'leitung')::boolean, 'Leitung erkannt');
select ok(jsonb_array_length(public.zeiterfassung(2026, '2026-11-09') -> 'personen') >= 3, 'Leitung sieht alle');
select ok((public.zeiterfassung(2026, '2026-11-09') -> 'offen') @> jsonb_build_array(jsonb_build_object('id', (select id from k where n = 'ferien'))), 'Antrag offen');
select is((select count(*)::int from public.zeiten where person_id = '00000000-0000-0000-0000-0000000fe0b3'), 1,
          'Leitung sieht fremde Zeiten');
select throws_ok($$ select public.abwesenheit_entscheiden((select id from k where n = 'ferien'), false) $$,
                 'P0001', 'zeit.grund_fehlt', 'Ablehnen nur mit Grund');
select lives_ok($$ select public.abwesenheit_entscheiden((select id from k where n = 'ferien'), true) $$, 'Leitung bewilligt');
insert into k values ('eigen', public.abwesenheit_speichern('{"art": "ferien", "von": "2026-11-23", "bis": "2026-11-23"}'));
select is((select status from public.abwesenheiten where id = (select id from k where n = 'eigen')), 'bewilligt',
          'Leitung trägt eigene Ferien direkt ein');
select lives_ok($$ select public.zeitkonto_setzen('00000000-0000-0000-0000-0000000fe0b1', 2026, 3.5, 120) $$, 'Übertrag gesetzt');

-- Rechnen: Mia (Bulle, 80 %) arbeitet am 9.11. 8.5 Std., Soll 42.5 × 0.8 / 5 = 6.8; 8.12. ist Feiertag.
select is((public.zeit_tage('00000000-0000-0000-0000-0000000fe0b3', '2026-11-09', '2026-11-09') -> 0 ->> 'soll_h')::numeric,
          6.8::numeric, 'Soll nach Pensum');
select is((public.zeit_tage('00000000-0000-0000-0000-0000000fe0b3', '2026-11-09', '2026-11-09') -> 0 ->> 'ist_h')::numeric,
          8.5::numeric, 'Ist ohne Pause');
select is((public.zeit_tage('00000000-0000-0000-0000-0000000fe0b3', '2026-12-08', '2026-12-08') -> 0 ->> 'soll_h')::numeric,
          0::numeric, 'Feiertag ohne Soll');

-- ---------- Ferienkonto der Mitarbeiterin ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000fe0a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000fe0a1', true);
select is((intern.zeit_konto('00000000-0000-0000-0000-0000000fe0b1', 2026, '2026-11-09') -> 'ferien' ->> 'geplant')::numeric, 8.0::numeric,
          '21.–31.12.: 8 Ferientage (ohne Wochenende und Weihnachten/Stephanstag)');
select is((intern.zeit_konto('00000000-0000-0000-0000-0000000fe0b1', 2026, '2026-11-09') -> 'ferien' ->> 'rest')::numeric, 20.5::numeric,
          'Rest = 25 + 3.5 Übertrag − 8');
select lives_ok($$ update public.abwesenheiten set bis = '2026-12-30' where id = (select id from k where n = 'ferien') $$,
                'Mitarbeiterin ändert bewilligte Ferien');
select is((select status from public.abwesenheiten where id = (select id from k where n = 'ferien')), 'beantragt',
          'Geänderte Ferien brauchen wieder eine Bewilligung');

select * from finish();
rollback;
