-- Prüft die Rechte-Lücken vom 1.11.2026: Einstellungen nur Administration (ausser bewusst offene Schlüssel),
-- kein fremder Absender im Ausgangskorb, Stammdaten nur Administration.
-- Ausführen: npm run db:test
begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000031a1', 'p31-mo@test.local'),
  ('00000000-0000-0000-0000-0000000031a2', 'p31-ad@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000031b1', 'p31_mo', 'Marco Monteur', '00000000-0000-0000-0000-0000000031a1', 'montage', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000031b2', 'p31_ad', 'Alma Admin', '00000000-0000-0000-0000-0000000031a2', 'admin', '{}', 'de');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000031a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000031a1', true);

-- Einstellungen
select throws_ok($$ update public.einstellungen set wert = '7.7' where schluessel = 'mwst_satz' $$, '42501',
  'einstellungen.kein_recht', 'Montage ändert den MWST-Satz nicht');
select throws_ok($$ update public.einstellungen set wert = wert where schluessel = 'sicherung' $$, '42501', null,
  'Montage ändert die Datensicherung nicht');
select throws_ok($$ update public.einstellungen set wert = wert || '{"automatisch": true}' where schluessel = 'sms_erinnerung' $$,
  '42501', null, 'Montage schaltet die SMS-Automatik nicht ein');
select throws_ok($$ update public.einstellungen set schluessel = 'ki_alt' where schluessel = 'ki' $$, '42501', null,
  'Umbenennen ist kein Schlupfloch');
select throws_ok($$ insert into public.einstellungen (schluessel, wert) values ('neu_p31', '{}') $$, '42501', null,
  'neue Schlüssel nur Administration');
-- Seit 3.11.2026 (Entscheid 0047): auch Kosten pro Lead und Marketing-Vorlagen ändert nur die Administration.
select throws_ok($$ select public.kennzahlen_quellen_kosten('Website', 5000) $$, '42501', 'einstellungen.nur_admin',
  'Kosten pro Lead nur Administration');
select throws_ok($$ update public.einstellungen set wert = wert where schluessel = 'marketing' $$, '42501',
  'einstellungen.nur_admin', 'Marketing-Vorlagen nur Administration');

-- Ausgangskorb
select lives_ok($$ select public.ausgang_anlegen('{"an": "kunde@example.ch", "betreff": "Test", "text": "Hallo"}') $$,
  'eigene Mail anlegen geht');
select throws_ok($$ select public.ausgang_anlegen('{"an": "kunde@example.ch", "betreff": "Test", "text": "Hallo",
    "absender_person_id": "00000000-0000-0000-0000-0000000031b2"}') $$, '42501', 'ausgang.fremder_absender',
  'Montage sendet nicht im Namen einer anderen Person');
select throws_ok($$ update public.ausgangskorb set absender_person_id = '00000000-0000-0000-0000-0000000031b2'
                    where absender_person_id = '00000000-0000-0000-0000-0000000031b1' $$, '42501', null,
  'Absender nachträglich auf eine andere Person ändern geht nicht');

-- Stammdaten
select is((select count(*)::int from public.auswahlwerte) > 0, true, 'Auswahllisten lesen alle');
select throws_ok($$ insert into public.regionen (nummer, name) values (931, 'X') $$, '42501', null,
  'Montage legt keine Region an');
select results_eq($$ with u as (update public.standorte set name = name returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'Montage ändert keine Standorte');

-- Administration darf
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000031a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000031a2', true);
select lives_ok($$ update public.einstellungen set wert = wert where schluessel = 'mwst_satz' $$,
  'Administration ändert Einstellungen');

select * from finish();
rollback;
