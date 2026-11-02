-- Prüft Service & Garantie Schritt 2 (2.11.2026): Einsatz mit Leitung, Team und Dauer (Stand, Verlauf, Zeitplan,
-- Mein Tag für das Team), Eintrag vom Handy nur einmal pro ID, Seriennummer vor Ort, Anlage-Akte.
-- Ausführen: npm run db:test
begin;
select plan(15);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000029a1', 'se-an@test.local'),
  ('00000000-0000-0000-0000-0000000029a2', 'se-mo@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache, profil) values
  ('00000000-0000-0000-0000-0000000029b1', 'se_an', 'Anna Einsatz', 'se-an@test.local', '00000000-0000-0000-0000-0000000029a1', 'admin', '{}', 'de', '{}'),
  ('00000000-0000-0000-0000-0000000029b2', 'se_mo', 'Mario Einsatz', 'se-mo@test.local', '00000000-0000-0000-0000-0000000029a2', 'montage', '{}', 'de', '{}');
insert into public.kontakte (id, vorname, nachname) values ('00000000-0000-0000-0000-0000000029c1', 'Rita', 'Gisler');
insert into public.objekte (id, kontakt_id, strasse, plz, ort) values
  ('00000000-0000-0000-0000-0000000029d1', '00000000-0000-0000-0000-0000000029c1', 'Feldweg 3', '5630', 'Muri AG');
insert into public.anlagen (id, objekt_id, leistung_kwp, komponenten) values
  ('00000000-0000-0000-0000-0000000029f1', '00000000-0000-0000-0000-0000000029d1', 9.6,
   '[{"art": "wechselrichter", "hersteller": "Fronius", "seriennummer": "ALT-1"}]');
insert into public.service_faelle (id, nummer, titel, anlage_id, kategorie, prioritaet, status) values
  ('00000000-0000-0000-0000-0000000029e1', 'S9201', 'Wechselrichter aus', '00000000-0000-0000-0000-0000000029f1', 'stoerung', 'normal', 'bearbeitung');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000029a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000029a1', true);

select lives_ok($$ select public.service_einsatz('00000000-0000-0000-0000-0000000029e1', (current_date + 1) + time '08:00', 180,
  '00000000-0000-0000-0000-0000000029b1', array['00000000-0000-0000-0000-0000000029b2', '00000000-0000-0000-0000-0000000029b1']::uuid[]) $$,
  'Einsatz planen');
select is((select status from public.service_faelle where id = '00000000-0000-0000-0000-0000000029e1'), 'termin', 'Stand wird «Termin»');
select is((select team from public.service_faelle where id = '00000000-0000-0000-0000-0000000029e1'),
  array['00000000-0000-0000-0000-0000000029b2']::uuid[], 'Team ohne die Leitung doppelt');
select ok((select verlauf -> -1 ->> 'text' like 'Einsatz % · se_an, se_mo' from public.service_faelle where id = '00000000-0000-0000-0000-0000000029e1'),
  'Planung im Verlauf mit Kürzeln');
select is((select array[dauer_minuten, cardinality(personen)] from public.service_termine where id = '00000000-0000-0000-0000-0000000029e1'),
  array[180, 2], 'Zeitplan: 3 Stunden, zwei Personen');
select is((select kunde from public.service_termine where id = '00000000-0000-0000-0000-0000000029e1'), 'Rita Gisler', 'Kunde aus der Anlage');

-- Mein Tag des Teams
select is((select jsonb_array_length(public.mein_tag(current_date + 1, current_date + 1, null) -> 'eintraege')), 1, 'Leitung sieht den Termin');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000029a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000029a2', true);
select is((select e -> 'service' -> 'anlage' -> 'komponenten' -> 0 ->> 'seriennummer'
             from jsonb_array_elements(public.mein_tag(current_date + 1, current_date + 1, null) -> 'eintraege') e
            where e ->> 'typ' = 'service'), 'ALT-1', 'Team sieht den Termin mit Seriennummer');

-- Handy: angekommen, zweimal gesendet
select public.service_eintrag_handy('00000000-0000-0000-0000-0000000029e1', '00000000-0000-0000-0000-0000000029aa', 'besuch', '', now());
select public.service_eintrag_handy('00000000-0000-0000-0000-0000000029e1', '00000000-0000-0000-0000-0000000029aa', 'besuch', '', now());
select is((select count(*)::int from public.service_faelle f, jsonb_array_elements(f.verlauf) v
            where f.id = '00000000-0000-0000-0000-0000000029e1' and v ->> 'art' = 'besuch'), 1, 'Angekommen nur einmal');
select is((select v ->> 'text' from public.service_faelle f, jsonb_array_elements(f.verlauf) v
            where f.id = '00000000-0000-0000-0000-0000000029e1' and v ->> 'art' = 'besuch'), 'Vor Ort angekommen', 'Standardtext');

select lives_ok($$ select public.service_checkliste('00000000-0000-0000-0000-0000000029e1', 0, true) $$, 'Monteur hakt am Handy ab');

-- Seriennummer vor Ort
select public.service_seriennummer('00000000-0000-0000-0000-0000000029e1', 0, 'NEU-2');
select is((select komponenten -> 0 ->> 'seriennummer' from public.anlagen where id = '00000000-0000-0000-0000-0000000029f1'), 'NEU-2', 'Seriennummer an der Anlage');
select ok((select verlauf -> -1 ->> 'text' = 'Seriennummer wechselrichter: ALT-1 → NEU-2' from public.service_faelle where id = '00000000-0000-0000-0000-0000000029e1'),
  'alte Nummer bleibt im Verlauf');

-- Anlage-Akte und Einsatz entfernen
select is((public.anlage_akte('00000000-0000-0000-0000-0000000029f1') -> 'faelle' -> 0 ->> 'nummer'), 'S9201', 'Akte zeigt die Fälle');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000029a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000029a1', true);
select public.service_einsatz('00000000-0000-0000-0000-0000000029e1', null, null, '00000000-0000-0000-0000-0000000029b1', '{}');
select is((select array[status, coalesce(cardinality(team), 0)::text] from public.service_faelle where id = '00000000-0000-0000-0000-0000000029e1'),
  array['bearbeitung', '0'], 'ohne Termin zurück in Bearbeitung, Team leer');

select * from finish();
rollback;
