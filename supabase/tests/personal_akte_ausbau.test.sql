-- Prüft die vollständige Personal-Akte: Felder (AHV, IBAN normalisiert und geprüft), wer was sieht (Recht
-- «personal» alles, die Person selbst ohne Lohn und Notiz, Vorgesetzte nur Anstellung und Notfall, andere nichts),
-- Gespräche mit nächstem Termin, vertrauliche Dokumente und die Personal-Fristen in der Glocke.
-- Ausführen: npm run db:test
begin;
select plan(28);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a1a1', 'pa-mt@test.local'),
  ('00000000-0000-0000-0000-00000000a1a2', 'pa-ad@test.local'),
  ('00000000-0000-0000-0000-00000000a1a3', 'pa-vg@test.local'),
  ('00000000-0000-0000-0000-00000000a1a4', 'pa-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-00000000a1b1', 'pa_mt', 'Max Montage', '00000000-0000-0000-0000-00000000a1a1', 'montage', '{}', 'de'),
  ('00000000-0000-0000-0000-00000000a1b2', 'pa_ad', 'Alma Admin', '00000000-0000-0000-0000-00000000a1a2', 'admin', '{}', 'de'),
  ('00000000-0000-0000-0000-00000000a1b3', 'pa_vg', 'Vera Vorgesetzt', '00000000-0000-0000-0000-00000000a1a3', 'projektleitung', '{}', 'de'),
  ('00000000-0000-0000-0000-00000000a1b4', 'pa_vk', 'Vito Verkauf', '00000000-0000-0000-0000-00000000a1a4', 'verkauf', '{}', 'fr');

set local role authenticated;

-- ---------- Als Administration (Recht «personal») ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a1a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a1a2', true);

insert into public.personal_akten (person_id, vorgesetzt_id, funktion, vertragsart, eintritt, probezeit_bis,
                                   bewilligung, bewilligung_bis, ahv_nr, iban, notiz, notfall_name)
values ('00000000-0000-0000-0000-00000000a1b1', '00000000-0000-0000-0000-00000000a1b3', 'Monteur PV', 'unbefristet',
        '2026-08-21', '2026-11-20', 'b', '2026-12-01', '7569217076985', 'ch93 0076 2011 6238 5295 7',
        'nur GL', 'Sara Montage');
select is((select ahv_nr || ' ' || iban from public.personal_akten where person_id = '00000000-0000-0000-0000-00000000a1b1'),
          '756.9217.0769.85 CH9300762011623852957', 'AHV-Nummer und IBAN einheitlich gespeichert');
select throws_ok($$ update public.personal_akten set ahv_nr = '123.4567.8901.23'
                     where person_id = '00000000-0000-0000-0000-00000000a1b1' $$, '23514', null, 'AHV-Nummer geprüft');
select throws_ok($$ update public.personal_akten set vorgesetzt_id = person_id
                     where person_id = '00000000-0000-0000-0000-00000000a1b1' $$, '23514', null,
                 'Niemand ist sich selbst vorgesetzt');
insert into public.personal_loehne (person_id, gueltig_ab, lohnart, betrag_rappen, anzahl_loehne)
values ('00000000-0000-0000-0000-00000000a1b1', '2026-08-21', 'monat', 520000, 13);
insert into public.personal_dokumente (person_id, art, titel, datei_pfad)
values ('00000000-0000-0000-0000-00000000a1b1', 'vertrag', 'Arbeitsvertrag', '00000000-0000-0000-0000-00000000a1b1/vertrag.pdf');
select is(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') ->> 'sicht', 'personal', 'Admin: Sicht personal');
select is(jsonb_array_length(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') -> 'loehne'), 1,
          'Admin sieht den Lohn');
select is(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') ->> 'vorgesetzt_name', 'Vera Vorgesetzt',
          'Name der/des Vorgesetzten');

-- ---------- Als die Person selbst ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a1a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a1a1', true);
select is(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') ->> 'sicht', 'selbst', 'Selbst: Sicht selbst');
select ok(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') -> 'loehne' = 'null'::jsonb, 'Selbst: kein Lohn');
select ok(not (public.personal_akte('00000000-0000-0000-0000-00000000a1b1') ? 'notiz'), 'Selbst: keine Notiz');
select is((select count(*)::int from public.personal_loehne), 0, 'Selbst: Lohn-Tabelle leer');
update public.personal_akten set funktion = 'Chef', iban = 'CH5604835012345678009'
 where person_id = '00000000-0000-0000-0000-00000000a1b1';
select is((select funktion || ' ' || iban from public.personal_akten where person_id = '00000000-0000-0000-0000-00000000a1b1'),
          'Monteur PV CH5604835012345678009', 'Selbst: IBAN ja, Funktion nein');
select throws_ok($$ insert into public.personal_dokumente (person_id, art, titel, datei_pfad)
  values ('00000000-0000-0000-0000-00000000a1b1', 'vertrag', 'X', '00000000-0000-0000-0000-00000000a1b1/x.pdf') $$,
  '42501', null, 'Selbst: keinen Vertrag ablegen');
insert into public.personal_dokumente (person_id, art, titel, datei_pfad)
values ('00000000-0000-0000-0000-00000000a1b1', 'bewilligung', 'Ausweis B', '00000000-0000-0000-0000-00000000a1b1/b.jpg');
select is(jsonb_array_length(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') -> 'dokumente'), 2,
          'Selbst: sieht alle eigenen Dokumente');
select throws_ok($$ select public.personal_gespraech_speichern('00000000-0000-0000-0000-00000000a1b1', '2026-11-01', 'jahr') $$,
                 '42501', 'team.kein_recht', 'Selbst: kein Gespräch über sich erfassen');

-- ---------- Als Vorgesetzte ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a1a3", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a1a3', true);
select ok(intern.ist_vorgesetzt('00000000-0000-0000-0000-00000000a1b1'), 'ist_vorgesetzt');
select is(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') ->> 'sicht', 'vorgesetzt', 'Vorgesetzt: Sicht');
select is(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') ->> 'funktion', 'Monteur PV',
          'Vorgesetzt: sieht die Anstellung');
select ok(not (public.personal_akte('00000000-0000-0000-0000-00000000a1b1') ?| array['ahv_nr', 'iban', 'geburtsdatum', 'notiz']),
          'Vorgesetzt: nichts Privates');
select is(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') ->> 'notfall_name', 'Sara Montage',
          'Vorgesetzt: Notfallkontakt');
select is(jsonb_array_length(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') -> 'dokumente'), 1,
          'Vorgesetzt: Vertrag ausgeblendet');
select is((select count(*)::int from public.personal_akten where person_id = '00000000-0000-0000-0000-00000000a1b1'), 0,
          'Vorgesetzt: Tabelle nicht direkt lesbar');
select throws_ok($$ select public.personal_gespraech_speichern('00000000-0000-0000-0000-00000000a1b1', '2026-11-01',
                     'jahr', null, '2026-10-01') $$, 'P0001', 'team.gespraech_naechstes', 'Nächstes nach diesem');
select lives_ok($$ select public.personal_gespraech_speichern('00000000-0000-0000-0000-00000000a1b1', '2026-11-01',
                    'jahr', 'Ziel: IBN selbständig', '2027-11-01') $$, 'Vorgesetzt erfasst ein Gespräch');
select is(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') ->> 'naechstes_gespraech', '2027-11-01',
          'Nächstes Gespräch steht in der Akte');

-- ---------- Als jemand anderes ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a1a4", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a1a4', true);
select ok(public.personal_akte('00000000-0000-0000-0000-00000000a1b1') is null, 'Andere: nichts');
select is((select count(*)::int from public.personal_gespraeche), 0, 'Andere: keine Gespräche');

-- ---------- Fristen ----------
reset role;
set local role service_role;
-- Probezeit (20.11.) und Bewilligung (1.12.) liegen im Vorlauf, das Gespräch (1.11.2027) nicht.
select is(public.personal_fristen_melden('2026-11-02'), 2, 'Zwei Personal-Fristen gemeldet');
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-00000000a1b1' and titel_de like 'Frist:%'), 1,
          'Die Person bekommt nur die Bewilligung (nicht die Probezeit)');
reset role;

select * from finish();
rollback;
