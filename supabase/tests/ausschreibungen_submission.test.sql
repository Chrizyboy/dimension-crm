-- Prüft Ausschreibungen vollständig (Entscheid 0039): Go/No-Go-Vorschlag, No-Go nur mit Grund, Eckdaten und
-- Zuschlagskriterien, Checkliste, Prüfung durch eine zweite Person, Eingabe mit Betrag, Öffnungsprotokoll als
-- Pflicht, Zuschlag legt das Projekt an, Absage mit Beschwerdefrist, Nachweise melden, Mitbewerber, Auswertung.
-- Ausführen: npm run db:test
begin;
select plan(30);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000390a1', 'sub-andy@test.local'),
  ('00000000-0000-0000-0000-0000000390a2', 'sub-chris@test.local'),
  ('00000000-0000-0000-0000-0000000390a3', 'sub-buha@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000390b1', 'sub_andy', 'Andy Sub', '00000000-0000-0000-0000-0000000390a1', 'mitarbeit', '{}'),
  ('00000000-0000-0000-0000-0000000390b2', 'sub_chris', 'Chris Sub', '00000000-0000-0000-0000-0000000390a2', 'mitarbeit', '{}'),
  ('00000000-0000-0000-0000-0000000390b3', 'sub_buha', 'Buha Sub', '00000000-0000-0000-0000-0000000390a3', 'mitarbeit', '{}');
update public.einstellungen set wert = wert || '{"bewilligen": ["sub_andy"], "bewilligen_vertretung": [], "pruefen": ["sub_chris"],
  "pruefen_vertretung": [], "nachweise_zustaendig": ["sub_buha"], "pruefen_ab_rappen": 10000000}' where schluessel = 'ausschreibungen';

create temporary table t (name text primary key, id uuid) on commit drop;
grant all on t to authenticated;

insert into t select 'sub', (public.ausschreibung_einlesen('{"quelle": "simap", "quell_id": "sub-1", "art": "ausschreibung",
  "titel": "Photovoltaikanlage Turnhalle Testdorf", "plz": "5610", "vergabestelle": "Gemeinde Subdorf",
  "frist_eingabe": "2099-03-15T12:00:00+01", "quell_url": "https://www.simap.ch/sub"}') ->> 'id')::uuid;
insert into t select 'nein', (public.ausschreibung_einlesen('{"quelle": "simap", "quell_id": "sub-2", "art": "ausschreibung",
  "titel": "Photovoltaik Werkhof Klein", "plz": "5610", "vergabestelle": "Gemeinde Klein",
  "frist_eingabe": "2099-03-20T12:00:00+01"}') ->> 'id')::uuid;
insert into public.submission_referenzen (titel, leistung_kwp, jahr) values
  ('Ref A', 150, extract(year from current_date)::int), ('Ref B', 120, extract(year from current_date)::int - 1),
  ('Ref C', 200, extract(year from current_date)::int - 2);

-- Als Andy (bewilligt)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000390a1", "role": "authenticated"}', true);

select throws_ok(format($$ select public.submission_speichern(%L, '{"kriterien": [{"name": "Preis", "gewicht": 60}]}') $$,
  (select id from t where name = 'sub')), 'ausschreibung.kriterien_summe', 'Zuschlagskriterien müssen 100 % ergeben');
select lives_ok(format($$ select public.submission_speichern(%L, '{"leistung_kwp": 180, "schaetzung_rappen": 26000000,
  "verfahren": "offen", "kriterien": [{"name": "Preis", "gewicht": 50}, {"name": "Qualität", "gewicht": 30}, {"name": "Referenzen", "gewicht": 20}]}') $$,
  (select id from t where name = 'sub')), 'Eckdaten speichern');
select is((select jsonb_array_length(kriterien) from public.ausschreibungen where id = (select id from t where name = 'sub')), 3,
  'drei Kriterien gespeichert');

select ok((public.ausschreibung_gng((select id from t where name = 'sub')) ->> 'punkte')::int between 0 and 100, 'Vorschlag 0–100 Punkte');
select is(jsonb_array_length(public.ausschreibung_gng((select id from t where name = 'sub')) -> 'teile'), 6, 'Vorschlag in sechs Teilen');
select is((select x ->> 'punkte' from jsonb_array_elements(public.ausschreibung_gng((select id from t where name = 'sub')) -> 'teile') x
  where x ->> 'teil' = 'eignung'), '20', 'drei Referenzen ab halber Grösse: Eignung erfüllt');
select is((select x ->> 'punkte' from jsonb_array_elements(public.ausschreibung_gng((select id from t where name = 'sub')) -> 'teile') x
  where x ->> 'teil' = 'nachweise'), '0', 'ohne Nachweise: keine Punkte');

select throws_ok(format($$ select public.ausschreibung_entscheiden(%L, 'nicht_teilnehmen', '{"grund": "zu klein"}') $$,
  (select id from t where name = 'nein')), 'ausschreibung.nogo_fehlt', 'No-Go nur mit Grund aus der Liste');
select is(public.ausschreibung_entscheiden((select id from t where name = 'nein'), 'nicht_teilnehmen', '{"nogo": "zu_klein"}'),
  'nicht_teilnehmen', 'No-Go mit Grund');
select is((select gng_entscheid || '/' || gng_grund from public.ausschreibungen where id = (select id from t where name = 'nein')),
  'nogo/zu_klein', 'Grund für die Auswertung gespeichert');

select is(public.ausschreibung_entscheiden((select id from t where name = 'sub'), 'teilnehmen'), 'teilnahme', 'Go: teilnehmen');
select ok((select gng_vorschlag ? 'punkte' and gng_entscheid = 'go' and verantwortlich_id = '00000000-0000-0000-0000-0000000390b1'
  from public.ausschreibungen where id = (select id from t where name = 'sub')), 'Vorschlag, Entscheid und Verantwortung festgehalten');
select throws_ok(format($$ select public.submission_checkliste(%L, 'pruefung', true) $$, (select id from t where name = 'sub')),
  'ausschreibung.punkt_auto', 'automatische Punkte nicht von Hand');
select ok((public.submission_checkliste((select id from t where name = 'sub'), 'lv', true)) ? 'lv', 'Punkt abhaken');
select throws_ok(format($$ select public.ausschreibung_entscheiden(%L, 'eingereicht', '{"form": "post"}') $$,
  (select id from t where name = 'sub')), 'ausschreibung.betrag_fehlt', 'Eingabe nur mit Betrag');
select throws_ok(format($$ select public.ausschreibung_entscheiden(%L, 'eingereicht', '{"form": "post", "betrag_rappen": 26360000}') $$,
  (select id from t where name = 'sub')), 'ausschreibung.pruefung_fehlt', 'ab CHF 100''000 erst prüfen lassen');
select throws_ok(format($$ select public.submission_pruefen(%L) $$, (select id from t where name = 'sub')),
  'ausschreibung.kein_recht', 'wer prüfen darf, steht in der Einstellung');

-- Als Chris (prüft)
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000390a2", "role": "authenticated"}', true);
select lives_ok(format($$ select public.submission_pruefen(%L) $$, (select id from t where name = 'sub')), 'zweite Person prüft');

-- Wieder Andy: eingeben, Protokoll, Zuschlag
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000390a1", "role": "authenticated"}', true);
select is(public.ausschreibung_entscheiden((select id from t where name = 'sub'), 'eingereicht',
  '{"form": "post", "betrag_rappen": 26360000}'), 'eingereicht', 'eingereicht mit Betrag');
select throws_ok(format($$ select public.ausschreibung_entscheiden(%L, 'zuschlag') $$, (select id from t where name = 'sub')),
  'ausschreibung.protokoll_fehlt', 'Zuschlag erst mit Öffnungsprotokoll');
select is(public.submission_protokoll((select id from t where name = 'sub'), '[
  {"anbieter": "Solar Konkurrenz GmbH", "betrag_rappen": 25000000},
  {"anbieter": "Dimension Solaire", "betrag_rappen": 26360000, "wir": true},
  {"anbieter": "Elektro Teuer AG", "betrag_rappen": 29000000}]'), 3, 'Protokoll mit drei Angeboten');
select is((select rang || '/' || anbieter_anzahl from public.ausschreibungen where id = (select id from t where name = 'sub')), '2/3',
  'wir sind auf Rang 2 von 3');
select is(public.ausschreibung_entscheiden((select id from t where name = 'sub'), 'zuschlag'), 'zuschlag', 'Zuschlag');
select isnt((select projekt_id from public.ausschreibungen where id = (select id from t where name = 'sub')), null,
  'Zuschlag legt das Projekt an');
select is((select o.status from public.offerten o join public.ausschreibungen a on a.offerte_id = o.id
  where a.id = (select id from t where name = 'sub')), 'angenommen', 'Offerte angenommen');
select is((select count(*)::int from public.kontaktsperren where ausschreibung_id = (select id from t where name = 'sub')
  and aufgehoben_am is null), 0, 'Kontaktsperre zur Vergabestelle aufgehoben');

select is((select submissionen::int || '/' || erster::int from public.ausschreibung_mitbewerber() where anbieter = 'Solar Konkurrenz GmbH'),
  '1/1', 'Mitbewerber aus dem Protokoll');
select ok((public.ausschreibungen_auswertung(current_date - 1, current_date) ->> 'gewonnen')::int >= 1, 'Auswertung zählt den Zuschlag');

-- Nachweise: der Server meldet fehlende einmal je Art an die Zuständigen
reset role;
select set_config('request.jwt.claims', '', true);
select cmp_ok(public.nachweise_melden(), '>', 0, 'fehlende Nachweise geben Aufgaben');
select is(public.nachweise_melden(), 0, 'zweiter Lauf meldet nichts doppelt');

select * from finish();
rollback;
