-- Prüft die Pipeline der Grossprojekte (Neuentwurf 2.11.2026): Stufe beginnt beim Bewilligen, nur über den Ablauf
-- änderbar, «verloren» mit Grund, Vertrag mit Datum und Leistung, Akte pflegen, Verlauf von Hand.
-- Ausführen: npm run db:test
begin;
select plan(14);

create temporary table t (name text primary key, id uuid) on commit drop;
grant all on t to authenticated;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000009a1', 'gp-pipeline@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000009a2', 'gp_pipe', 'Pipeline Test', '00000000-0000-0000-0000-0000000009a1', 'admin', '{admin}');

select ok((select wert -> 'pipeline' -> 'stufen' from public.einstellungen where schluessel = 'grossprojekte') is not null,
  'Stufen sind Daten in der Einstellung');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000009a1", "role": "authenticated"}', true);

insert into t values ('gp', public.grossprojekt_speichern('{"titel": "Halle Pipeline", "quell_url": "Test", "plz": "5630",
  "gemeinde": "Muri", "bauherr": "Halle Pipeline AG", "bauherr_art": "gewerbe", "nutzung": "industrie", "dachflaeche_m2": 2000}'));
select throws_ok($$ select public.grossprojekt_stufe_setzen((select id from t), 'erstkontakt') $$, 'P0001',
  'grossprojekt.nicht_bewilligt', 'Stufe erst nach dem Bewilligen');

select public.grossprojekt_entscheiden((select id from t), 'bewilligen');
select is((select stufe from public.grossprojekte where id = (select id from t)), 'qualifizieren', 'Bewilligen beginnt bei Qualifizieren');

-- Im Test läuft alles in einer Transaktion: den Merker des Ablaufs zurücksetzen (in der App endet er mit dem Aufruf).
select set_config('gp.ablauf', '', true);
select throws_ok($$ update public.grossprojekte set stufe = 'vertrag' where id = (select id from t) $$, '42501',
  'grossprojekt.nur_ablauf', 'Stufe nicht direkt über die Tabelle');

select public.grossprojekt_stufe_setzen((select id from t), 'besichtigung');
select is((select stufe from public.grossprojekte where id = (select id from t)), 'besichtigung', 'Stufe gesetzt');
select ok((select count(*) from public.aktivitaeten where grossprojekt_id = (select id from t) and details ->> 'art' = 'stufe') = 1,
  'Stufe im Verlauf');

select throws_ok($$ select public.grossprojekt_stufe_setzen((select id from t), 'verloren') $$, 'P0001',
  'grossprojekt.grund_fehlt', 'verloren nur mit Grund');
select throws_ok($$ select public.grossprojekt_stufe_setzen((select id from t), 'irgendwas') $$, 'P0001',
  'grossprojekt.stufe_unbekannt', 'unbekannte Stufe');

select public.grossprojekt_akte_setzen((select id from t), '{"naechster_schritt": "Lastgang anfordern",
  "naechster_schritt_am": "2026-11-09", "kontakte": [{"name": "Anna Beispiel", "rolle": "entscheider"}],
  "unterlagen": {"grundbuch": "2026-11-02"}, "rechnung": {"kwp": 300, "eigenverbrauch_prozent": 60},
  "youdera": {"dossier_am": "2026-11-02"}}');
select is((select naechster_schritt || '/' || naechster_schritt_am || '/' || (kontakte -> 0 ->> 'name') || '/' || (rechnung ->> 'kwp')
  from public.grossprojekte where id = (select id from t)), 'Lastgang anfordern/2026-11-09/Anna Beispiel/300', 'Akte gepflegt');
select ok((select count(*) from public.aktivitaeten where grossprojekt_id = (select id from t) and details ->> 'art' in ('schritt', 'youdera')) = 2,
  'nächster Schritt und Dossier im Verlauf');
select throws_ok($$ select public.grossprojekt_akte_setzen((select id from t), '{"kontakte": {"name": "x"}}') $$, 'P0001',
  'grossprojekt.ungueltig', 'Kontakte nur als Liste');

select public.grossprojekt_vermerken((select id from t), 'anruf', 'Interessiert, Termin vereinbart');
select ok(exists (select 1 from public.aktivitaeten where grossprojekt_id = (select id from t) and details ->> 'art' = 'anruf'),
  'Anruf im Verlauf');

select public.grossprojekt_stufe_setzen((select id from t), 'vertrag', '{"datum": "2026-11-20"}');
select is((select vertrag_am || '/' || vertrag_kwp from public.grossprojekte where id = (select id from t)), '2026-11-20/300',
  'Vertrag mit Datum und Leistung aus dem Rechner');

select public.grossprojekt_stufe_setzen((select id from t), 'verloren', '{"grund": "Kunde baut selbst"}');
select is((select grund || '/' || coalesce(vertrag_am::text, '-') from public.grossprojekte where id = (select id from t)),
  'Kunde baut selbst/-', 'verloren mit Grund, Vertrag gelöscht');

select * from finish();
rollback;
