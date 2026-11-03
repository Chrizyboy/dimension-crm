-- Prüft Team & Ausweise, Fragen 5 und 6: Pflicht-Ausweise je Tätigkeit (Regeln, Tätigkeiten im Zeitplan)
-- und Geburtstage/Dienstjubiläen für «Mein Tag» (ohne Jahrgang, abschaltbar).
-- Ausführen: npm run db:test
begin;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000d2a1', 'ta-mt@test.local'),
  ('00000000-0000-0000-0000-00000000d2a2', 'ta-ad@test.local'),
  ('00000000-0000-0000-0000-00000000d2a3', 'ta-m2@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-00000000d2b1', 'ta_mt', 'Mia Montage', '00000000-0000-0000-0000-00000000d2a1', 'montage', '{}', 'de'),
  ('00000000-0000-0000-0000-00000000d2b2', 'ta_ad', 'Arno Admin', '00000000-0000-0000-0000-00000000d2a2', 'admin', '{}', 'de'),
  ('00000000-0000-0000-0000-00000000d2b3', 'ta_m2', 'Max Monteur', '00000000-0000-0000-0000-00000000d2a3', 'montage', '{}', 'fr');
insert into public.personal_akten (person_id, geburtsdatum, eintritt) values
  ('00000000-0000-0000-0000-00000000d2b1', '1990-11-24', '2020-11-25'),
  ('00000000-0000-0000-0000-00000000d2b3', '1985-12-31', '2025-11-23');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-00000000d2c1', 'person', 'privat', 'Lea', 'Beispiel', 'de');
insert into public.objekte (id, kontakt_id, strasse, plz, ort) values
  ('00000000-0000-0000-0000-00000000d2d1', '00000000-0000-0000-0000-00000000d2c1', 'Musterweg 1', '5630', 'Muri AG');
insert into public.projekte (id, nummer, kontakt_id, objekt_id, status, bau_status) values
  ('00000000-0000-0000-0000-00000000d2e1', 'PTA-1', '00000000-0000-0000-0000-00000000d2c1', '00000000-0000-0000-0000-00000000d2d1', 'im_bau', 'terminiert');
insert into public.einsaetze (id, projekt_id, art, von, bis, personen) values
  ('00000000-0000-0000-0000-00000000d2f1', '00000000-0000-0000-0000-00000000d2e1', 'intern', '2026-11-24', '2026-11-26',
   '{00000000-0000-0000-0000-00000000d2b1,00000000-0000-0000-0000-00000000d2b3}'),
  ('00000000-0000-0000-0000-00000000d2f2', '00000000-0000-0000-0000-00000000d2e1', 'intern', '2026-11-30', '2026-11-30',
   '{00000000-0000-0000-0000-00000000d2b3}');

set local role authenticated;

-- ---------- Tätigkeiten ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000d2a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d2a2', true);

select lives_ok($$ select public.taetigkeit_anforderung_speichern('anhaenger', '{"ausweise": ["fuehrerausweis_b"], "wer": "einer"}') $$,
                'Administration ändert die Pflicht');
select is((select eigenschaften ->> 'wer' || ':' || (eigenschaften -> 'ausweise' ->> 0) from public.auswahlwerte
            where liste = 'taetigkeit' and schluessel = 'anhaenger'), 'einer:fuehrerausweis_b', 'Pflicht gespeichert');
select throws_ok($$ select public.taetigkeit_anforderung_speichern('anhaenger', '{"ausweise": ["gibtsnicht"]}') $$,
                 'P0001', 'team.ausweis_unbekannt', 'Unbekannter Ausweis abgewiesen');
select lives_ok($$ select public.taetigkeit_anforderung_speichern('geruest', '{"text_de": "Gerüst", "text_fr": "Échafaudage",
                   "ausweise": ["absturzsicherung"]}') $$, 'Neue Tätigkeit');
select throws_ok($$ select public.projekt_zeitplan_speichern('00000000-0000-0000-0000-00000000d2e1', '{"einsaetze": [{"id": "00000000-0000-0000-0000-00000000d2f2",
                   "art": "intern", "von": "2026-11-30", "bis": "2026-11-30", "taetigkeiten": ["gibtsnicht"]}]}') $$,
                 'P0001', 'team.taetigkeit_unbekannt', 'Unbekannte Tätigkeit im Zeitplan abgewiesen');
-- Zeitplan-Dialog speichert Tätigkeiten mit.
select lives_ok($$ select public.projekt_zeitplan_speichern('00000000-0000-0000-0000-00000000d2e1', '{"bau_status": "terminiert",
  "einsaetze": [{"id": "00000000-0000-0000-0000-00000000d2f1", "art": "intern", "von": "2026-11-24", "bis": "2026-11-26",
                 "personen": ["00000000-0000-0000-0000-00000000d2b1", "00000000-0000-0000-0000-00000000d2b3"], "taetigkeiten": ["geruest"]},
                {"id": "00000000-0000-0000-0000-00000000d2f2", "art": "intern", "von": "2026-11-30", "bis": "2026-11-30",
                 "personen": ["00000000-0000-0000-0000-00000000d2b3"], "taetigkeiten": ["dach_alt", "dach_alt"]}]}') $$,
                'Zeitplan mit Tätigkeiten gespeichert');
select is((select array_agg(array_to_string(taetigkeiten, ',') order by von) from public.einsaetze
            where projekt_id = '00000000-0000-0000-0000-00000000d2e1' and geloescht_am is null),
          '{geruest,dach_alt}'::text[], 'Tätigkeiten je Einsatz, ohne Doppelte');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000d2a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d2a1', true);
select throws_ok($$ select public.taetigkeit_anforderung_speichern('anhaenger', '{"ausweise": []}') $$, '42501', 'team.kein_recht',
                 'Pflicht ändern nur Administration oder Recht «personal»');

-- ---------- Geburtstage und Jubiläen ----------
select is((select jsonb_agg(x ->> 'art' || ':' || (x ->> 'datum') order by x ->> 'datum')
             from jsonb_array_elements(public.team_anlaesse('2026-11-22') -> 'anlaesse') x
            where x ->> 'person_id' in ('00000000-0000-0000-0000-00000000d2b1', '00000000-0000-0000-0000-00000000d2b3')),
          '["jubilaeum:2026-11-23", "geburtstag:2026-11-24", "jubilaeum:2026-11-25"]'::jsonb,
          'Nächste 7 Tage: Jubiläum Max, Geburtstag und Jubiläum Mia');
select is((select (x ->> 'jahre')::int from jsonb_array_elements(public.team_anlaesse('2026-11-22') -> 'anlaesse') x
            where x ->> 'person_id' = '00000000-0000-0000-0000-00000000d2b1' and x ->> 'art' = 'jubilaeum'), 6,
          'Jubiläum in vollen Jahren');
select ok(not (public.team_anlaesse('2026-11-22')::text like '%1990%'), 'Nie der Jahrgang');
select public.team_anlass_zeigen(false);
select is((select count(*)::int from jsonb_array_elements(public.team_anlaesse('2026-11-22') -> 'anlaesse') x
            where x ->> 'person_id' = '00000000-0000-0000-0000-00000000d2b1'), 0, 'Mia blendet sich aus');
select is((public.team_anlaesse('2026-11-22') ->> 'ich_verborgen')::boolean, true, 'Eigener Schalter sichtbar');

select * from finish();
rollback;
