-- Prüft die Dachsuche des Grossprojekt-Monitors (Phase 8c): Gebiete um die Standorte (die nächsten zuerst), Fortschritt
-- je Gebiet, Treffer nur mit genug Punkten, nichts doppelt (gleiches Gebäude oder gleicher Ort, auch Verworfenes),
-- Ein/Aus über die Einstellung und nur der Server darf Treffer aufnehmen.
-- Ausführen: npm run db:test
begin;
select plan(14);

create temporary table t (name text primary key, id uuid) on commit drop;
-- Fester Massstab, damit der Test nicht von der aktuellen Einstellung abhängt (Standard seit 31.10.2026: ab 35 Punkten).
update public.einstellungen set wert = jsonb_set(wert, '{suche,ab_punkte}', '50') where schluessel = 'grossprojekte';

-- Gebiete
select cmp_ok((select count(*)::int from intern.gp_kacheln()), '>', 1000, 'Gebiete um Muri und Bulle (2 × 2 km, 30 km Umkreis)');
select is((select jsonb_array_length(public.grossprojekt_suche_naechste(2))), 2, 'der Zeitplan bekommt die gewünschte Anzahl Gebiete');
select is((public.grossprojekt_suche_naechste(1) -> 0 ->> 'kachel'),
  (select kachel from intern.gp_kacheln() order by abstand, kachel limit 1), 'die nächsten Gebiete zuerst');
select public.grossprojekt_suche_kachel_fertig((public.grossprojekt_suche_naechste(1) -> 0 ->> 'kachel'), 340, 4, 1);
select isnt((public.grossprojekt_suche_naechste(1) -> 0 ->> 'kachel'),
  (select kachel from intern.gp_kacheln() order by abstand, kachel limit 1), 'durchsuchtes Gebiet kommt erst nach einem Jahr wieder');

-- Treffer aufnehmen
insert into t select 'halle', public.grossprojekt_aus_suche('{"egid": "8c0001", "strasse": "Teststrasse 14", "plz": "5630",
  "gemeinde": "Muri (AG)", "lage_e": 2669400, "lage_n": 1237300, "nutzung": "industrie", "dachflaeche_m2": 1600,
  "dach_klasse": 5, "stromertrag_kwh": 275000, "heizung": "oel", "heizung_jahr": 1996, "baujahr": 1979,
  "quell_url": "https://map.geo.admin.ch/test"}', 'Dachsuche: Test');
select isnt((select id from t where name = 'halle'), null, 'grosses Industriedach mit Ölheizung wird aufgenommen');
select is((select quelle || '/' || stand || '/' || bauherr_art || '/' || titel from public.grossprojekte where id = (select id from t where name = 'halle')),
  'suche/pruefen/unbekannt/Industriegebäude, Teststrasse 14', 'Quelle Dachsuche, zum Prüfen, Bauherrschaft offen, Titel aus der Nutzung');
select cmp_ok((select punkte from public.grossprojekte where id = (select id from t where name = 'halle')), '>=', 50, 'mit genug Punkten');
select is((select count(*)::int from public.aktivitaeten where grossprojekt_id = (select id from t where name = 'halle')), 1, 'Verlauf: gefunden');

select is(public.grossprojekt_aus_suche('{"egid": "8c0001", "plz": "5630", "nutzung": "industrie", "dachflaeche_m2": 1600}'), null,
  'gleiches Gebäude nicht doppelt');
select is(public.grossprojekt_aus_suche('{"egid": "8c0002", "plz": "5630", "lage_e": 2669410, "lage_n": 1237290,
  "nutzung": "industrie", "dachflaeche_m2": 1600}'), null, 'auch kein zweiter Treffer am gleichen Ort');
select is(public.grossprojekt_aus_suche('{"egid": "8c0003", "plz": "5630", "lage_e": 2671000, "lage_n": 1239000,
  "nutzung": "verwaltung", "dachflaeche_m2": 520, "heizung": "waermepumpe"}'), null, 'zu wenig Punkte: nicht in die Liste');

-- Ein/Aus und Rechte
update public.einstellungen set wert = jsonb_set(wert, '{suche,aktiv}', 'false') where schluessel = 'grossprojekte';
select is(public.grossprojekt_suche_naechste(3), '[]'::jsonb, 'angehaltene Suche gibt keine Gebiete');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000008e1', 'gp-suche@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000008e2', 'gp_suche', 'Suche Test', '00000000-0000-0000-0000-0000000008e1', 'verkauf', '{}');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000008e1", "role": "authenticated"}', true);
select throws_ok($$ select public.grossprojekt_aus_suche('{"egid": "8c0009"}') $$, '42501', null, 'nur der Server nimmt Treffer auf');
select cmp_ok((public.grossprojekt_suche_stand() ->> 'durchsucht')::int, '>=', 1, 'Stand der Suche für die App');

select * from finish();
rollback;
