-- Prüft Vorrat (höchstens «pro_woche» neue Grossprojekte, die besten zuerst) und Recherche (Warteschlange, Ergebnis,
-- Übernehmen per Klick, Schritte als Aufgaben) der Grossprojekte (Phase 8c, Nachtrag 31.10.2026).
-- Ausführen: npm run db:test
begin;
select plan(16);

create temporary table t (name text primary key, id uuid) on commit drop;
-- Fester Massstab, damit der Test nicht von der aktuellen Einstellung abhängt (Standard seit 31.10.2026: ab 35 Punkten).
update public.einstellungen set wert = jsonb_set(wert, '{suche,ab_punkte}', '50') where schluessel = 'grossprojekte';
grant all on t to authenticated;

update public.einstellungen set wert = jsonb_set(wert, '{suche,pro_woche}', '2') where schluessel = 'grossprojekte';
-- Andere neue Grossprojekte dieser Woche zählen nicht (sonst hinge der Test vom Datenstand ab).
update public.grossprojekte set erstellt_am = now() - interval '30 days' where erstellt_am > now() - interval '8 days';

-- Vorrat
select ok(public.grossprojekt_in_vorrat('{"egid": "8r0001", "strasse": "Weg 1", "plz": "5630", "gemeinde": "Muri (AG)",
  "lage_e": 2669000, "lage_n": 1236000, "nutzung": "industrie", "dachflaeche_m2": 1600, "heizung": "oel"}', 'Test 1'),
  'guter Treffer kommt in den Vorrat');
select ok(not public.grossprojekt_in_vorrat('{"egid": "8r0001", "plz": "5630", "nutzung": "industrie", "dachflaeche_m2": 1600}'),
  'gleiches Gebäude nicht zweimal');
select ok(not public.grossprojekt_in_vorrat('{"egid": "8r0009", "plz": "5630", "lage_e": 2669010, "lage_n": 1236010,
  "nutzung": "industrie", "dachflaeche_m2": 1600}'), 'gleicher Ort nicht zweimal');
select ok(not public.grossprojekt_in_vorrat('{"egid": "8r0002", "plz": "5630", "nutzung": "verwaltung", "dachflaeche_m2": 520,
  "heizung": "waermepumpe"}'), 'zu wenig Punkte: nicht in den Vorrat');
select public.grossprojekt_in_vorrat('{"egid": "8r0003", "strasse": "Weg 3", "plz": "5630", "lage_e": 2671000, "lage_n": 1238000,
  "nutzung": "gewerbe", "dachflaeche_m2": 900, "heizung": "gas"}');
select public.grossprojekt_in_vorrat('{"egid": "8r0004", "strasse": "Weg 4", "plz": "5630", "lage_e": 2672000, "lage_n": 1239000,
  "nutzung": "spital", "dachflaeche_m2": 2500, "heizung": "oel"}');
select is((select count(*)::int from public.grossprojekte where egid like '8r%'), 0, 'im Vorrat, aber noch nicht in der Liste');

select is(public.grossprojekt_vorrat_freigeben(), 2, 'pro Woche höchstens so viele wie eingestellt');
select is((select string_agg(egid, ',' order by egid) from public.grossprojekte where egid like '8r%'), '8r0001,8r0004',
  'die mit den meisten Punkten zuerst');
select is(public.grossprojekt_vorrat_freigeben(), 0, 'Woche voll: nichts mehr');
select is((public.grossprojekt_suche_stand() ->> 'vorrat')::int >= 1, true, 'Stand zeigt den Vorrat');

-- Recherche
insert into t select 'gp', id from public.grossprojekte where egid = '8r0004';
select is((select recherche_stand from public.grossprojekte where id = (select id from t)), 'wartet', 'Neues wartet auf die Recherche');
select is((public.grossprojekt_recherche_offen(5) -> 0 ->> 'id')::uuid, (select id from t), 'beste zuerst an die Recherche');
select public.grossprojekt_recherche_speichern((select id from t), '{"eigentuemer": {"name": "Spital Test AG", "art": "gewerbe"},
  "naechste_schritte": [{"titel": "Eigentum bestätigen", "text": "Grundbuch", "in_tagen": 2}, {"titel": "Anrufen", "text": "", "in_tagen": 5}]}');
select is((select recherche_stand || '/' || (recherche #>> '{eigentuemer,name}') from public.grossprojekte where id = (select id from t)),
  'fertig/Spital Test AG', 'Ergebnis abgelegt, nichts übernommen');
select is((select bauherr from public.grossprojekte where id = (select id from t)), null, 'Bauherrschaft erst nach dem Klick');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000008f1', 'gp-recherche@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000008f2', 'gp_rech', 'Recherche Test', '00000000-0000-0000-0000-0000000008f1', 'verkauf', '{}');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000008f1", "role": "authenticated"}', true);
select throws_ok($$ select public.grossprojekt_recherche_offen(1) $$, '42501', null, 'nur der Server holt Recherchen');
select public.grossprojekt_recherche_uebernehmen((select id from t), 'Spital Test AG', 'gewerbe',
  '{"name": "Anna Beispiel", "funktion": "Leitung Technik"}');
select is((select bauherr || '/' || (ansprechperson ->> 'name') from public.grossprojekte where id = (select id from t)),
  'Spital Test AG/Anna Beispiel', 'übernommen per Klick');
select is(public.grossprojekt_schritte_als_aufgaben((select id from t),
  (select recherche -> 'naechste_schritte' from public.grossprojekte where id = (select id from t))), 2, 'Schritte als Aufgaben');

select * from finish();
rollback;
