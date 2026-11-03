-- Prüft Team & Ausweise vollständig: Kurs beantragen (nur für sich), bewilligen bis zur Grenze (Vorgesetzt) oder mit
-- Recht «personal», Kurstag als Abwesenheit «Weiterbildung», Ausweis nach «besucht», Kosten nur für Berechtigte,
-- Team-Übersicht mit «Heute» (Grund nur für Berechtigte) und Anforderungen je Rolle.
-- Ausführen: npm run db:test
begin;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000c1a1', 'tk-mt@test.local'),
  ('00000000-0000-0000-0000-00000000c1a2', 'tk-ad@test.local'),
  ('00000000-0000-0000-0000-00000000c1a3', 'tk-vg@test.local'),
  ('00000000-0000-0000-0000-00000000c1a4', 'tk-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-00000000c1b1', 'tk_mt', 'Mia Montage', '00000000-0000-0000-0000-00000000c1a1', 'montage', '{}', 'de'),
  ('00000000-0000-0000-0000-00000000c1b2', 'tk_ad', 'Arno Admin', '00000000-0000-0000-0000-00000000c1a2', 'admin', '{}', 'de'),
  ('00000000-0000-0000-0000-00000000c1b3', 'tk_vg', 'Vreni Vorgesetzt', '00000000-0000-0000-0000-00000000c1a3', 'projektleitung', '{}', 'de'),
  ('00000000-0000-0000-0000-00000000c1b4', 'tk_vk', 'Valentin Verkauf', '00000000-0000-0000-0000-00000000c1a4', 'verkauf', '{}', 'fr');
insert into public.personal_akten (person_id, vorgesetzt_id, funktion)
values ('00000000-0000-0000-0000-00000000c1b1', '00000000-0000-0000-0000-00000000c1b3', 'Monteurin PV');
insert into public.abwesenheiten (person_id, art, von, bis)
values ('00000000-0000-0000-0000-00000000c1b4', 'krank', '2026-11-20', '2026-11-21');

set local role authenticated;

-- ---------- Mitarbeiterin beantragt ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000c1a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a1', true);
select throws_ok($$ select public.kurs_speichern(null, '{"titel": "Erste Hilfe", "personen": ["00000000-0000-0000-0000-00000000c1b4"]}') $$,
                 '42501', 'kurs.kein_recht', 'Antrag nur für sich selbst');
create temp table k (n text primary key, id uuid) on commit drop;
grant all on k to authenticated;
insert into k values ('antrag', public.kurs_speichern(null, '{"titel": "Erste Hilfe Baustelle", "art": "erste_hilfe",
  "personen": ["00000000-0000-0000-0000-00000000c1b1"], "kosten_rappen": 38000, "stand": "angemeldet"}'));
select is((select stand from public.kurse where id = (select id from k where n = 'antrag')), 'beantragt',
          'Eigener Antrag bleibt «beantragt», auch wenn mehr verlangt wird');
select throws_ok($$ select public.kurs_entscheiden((select id from k where n = 'antrag'), true) $$, '42501', 'kurs.grenze',
                 'Eigenen Antrag nicht selbst bewilligen');

-- ---------- Vorgesetzte bewilligt bis zur Grenze ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000c1a3", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a3', true);
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-00000000c1b3' and titel_de like 'Kurs beantragt%'), 1,
          'Glocke an die Vorgesetzte');
select lives_ok($$ select public.kurs_entscheiden((select id from k where n = 'antrag'), true) $$, 'Vorgesetzte bewilligt');
select is((select stand from public.kurse where id = (select id from k where n = 'antrag')), 'bewilligt', 'Stand bewilligt');
select throws_ok($$ select public.kurs_speichern(null, '{"titel": "Speicher Swissolar", "personen": ["00000000-0000-0000-0000-00000000c1b1"],
                   "kosten_rappen": 145000, "stand": "bewilligt"}') $$, '42501', 'kurs.grenze', 'Über der Grenze nicht bewilligen');
insert into k values ('teuer', public.kurs_speichern(null, '{"titel": "Speicher Swissolar", "personen": ["00000000-0000-0000-0000-00000000c1b1"],
                   "kosten_rappen": 145000, "stand": "beantragt"}'));
select throws_ok($$ select public.kurs_speichern(null, '{"titel": "Fremd", "personen": ["00000000-0000-0000-0000-00000000c1b4"], "stand": "bewilligt"}') $$,
                 '42501', 'kurs.kein_recht', 'Nicht für fremde Mitarbeitende planen');

-- Anmelden: Kurstag wird Abwesenheit «Weiterbildung»
select lives_ok($$ select public.kurs_speichern((select id from k where n = 'antrag'), '{"titel": "Erste Hilfe Baustelle", "art": "erste_hilfe",
  "personen": ["00000000-0000-0000-0000-00000000c1b1"], "kosten_rappen": 38000, "stand": "angemeldet", "von": "2026-11-27",
  "anbieter": "Samariter Muri", "ort": "Muri AG"}') $$, 'Angemeldet mit Datum');
select is((select count(*)::int from public.abwesenheiten
            where kurs_id = (select id from k where n = 'antrag') and art = 'weiterbildung' and geloescht_am is null), 1,
          'Kurstag als Weiterbildung in der Einsatzplanung');
select lives_ok($$ select public.kurs_speichern((select id from k where n = 'antrag'), '{"titel": "Erste Hilfe Baustelle", "art": "erste_hilfe",
  "personen": ["00000000-0000-0000-0000-00000000c1b1"], "kosten_rappen": 38000, "stand": "angemeldet", "von": "2026-11-28",
  "anbieter": "Samariter Muri", "ort": "Muri AG"}') $$, 'Datum verschoben');
select is((select von from public.abwesenheiten
            where kurs_id = (select id from k where n = 'antrag') and geloescht_am is null), '2026-11-28'::date,
          'Abwesenheit wandert mit, die alte liegt im Papierkorb');

-- Besucht: Ausweis mit Gültigkeit 24 Monate und Aufgabe
select is(public.kurs_besucht((select id from k where n = 'antrag')), 1, 'Ein Ausweis entsteht');
select is((select gueltig_bis from public.qualifikationen where kurs_id = (select id from k where n = 'antrag')),
          '2028-11-28'::date, 'Gültig bis aus der Gültigkeit der Art');
select is(public.kurs_besucht((select id from k where n = 'antrag')), 0, 'Wiederholen ändert nichts');

-- ---------- Wer sieht Kosten ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000c1a4", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a4', true);
select ok((select bool_and(not (x ? 'kosten_rappen')) from jsonb_array_elements(public.team_kurse(2026) -> 'kurse') x
            where x ->> 'titel' like 'Erste Hilfe%' or x ->> 'titel' like 'Speicher%'), 'Andere sehen Kurse ohne Kosten');
select is((public.team_kurse(2026) ->> 'budget_rappen'), null, 'Budget nur mit Recht');
select is((select x -> 'heute' ->> 'grund' from jsonb_array_elements(public.team_uebersicht('2026-11-20')) x
            where x ->> 'id' = '00000000-0000-0000-0000-00000000c1b4'), 'krank', 'Eigener Grund sichtbar');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000c1a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a1', true);
select is((select x -> 'heute' ->> 'art' || '/' || coalesce(x -> 'heute' ->> 'grund', '-')
             from jsonb_array_elements(public.team_uebersicht('2026-11-20')) x
            where x ->> 'id' = '00000000-0000-0000-0000-00000000c1b4'), 'abwesend/-', 'Andere sehen nur «abwesend»');
select is((select x ->> 'vorgesetzt_name' from jsonb_array_elements(public.team_uebersicht()) x
            where x ->> 'id' = '00000000-0000-0000-0000-00000000c1b1'), 'Vreni Vorgesetzt', 'Vorgesetzt in der Übersicht');
select throws_ok($$ select public.ausweis_anforderung_speichern('erste_hilfe', '{"pflicht_fuer": []}') $$, '42501',
                 'team.kein_recht', 'Anforderungen nur Administration oder Recht «personal»');

-- ---------- Administration ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000c1a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a2', true);
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-00000000c1b2' and titel_de = 'Kurs beantragt: Speicher Swissolar'), 1,
          'Über der Grenze geht der Antrag an Recht «personal»');
select is((public.team_kurse(2026) ->> 'budget_rappen')::int, 1000000, 'Administration sieht das Budget');
select public.ausweis_anforderung_speichern('erste_hilfe', '{"pflicht_fuer": ["montage", "projektleitung"], "gueltig_monate": 36}');
select is((select eigenschaften from public.auswahlwerte where liste = 'qualifikation' and schluessel = 'erste_hilfe'),
          '{"pflicht_fuer": ["montage", "projektleitung"], "gueltig_monate": 36}'::jsonb, 'Pflicht und Gültigkeit gespeichert');

select * from finish();
rollback;
