-- Prüft den Helpdesk mit Freigabe: Claude (nur Server) schätzt ein → Status «wartet», Glocke mit Pop-up und SMS an die
-- entscheidende Person; nur sie entscheidet; ohne Entscheid kein Abschluss; «erledigt» nur nach «Erledige es»;
-- Abschluss gibt Antwort, Glocke und genau eine Mail an die meldende Person. Wiederholen ändert nichts.
-- Ausführen: npm run db:test
begin;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000018a1', 'hd-ma@test.local'),
  ('00000000-0000-0000-0000-0000000018a2', 'hd-ch@test.local'),
  ('00000000-0000-0000-0000-0000000018a3', 'hd-lo@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache, profil) values
  ('00000000-0000-0000-0000-0000000018b1', 'hd_ma', 'Laura Muster', 'hd-ma@test.local', '00000000-0000-0000-0000-0000000018a1', 'verkauf', '{}', 'fr', '{}'),
  ('00000000-0000-0000-0000-0000000018b2', 'hd_ch', 'Chris Test', 'hd-ch@test.local', '00000000-0000-0000-0000-0000000018a2', 'admin', '{}', 'de', '{"mobil": "076 123 45 67"}'),
  ('00000000-0000-0000-0000-0000000018b3', 'hd_lo', 'Loris Test', 'hd-lo@test.local', '00000000-0000-0000-0000-0000000018a3', 'admin', '{}', 'de', '{}');

set local role authenticated;
-- Mitarbeiterin meldet
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000018a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000018a1', true);
select set_config('test.m', (public.rueckmeldung_melden('PDF zeigt alten Rabatt', 'Rabatt 8 %, PDF 5 %', null, 'offers', 'normal', 'Test') ->> 'id'), true);
select throws_ok($$ select public.helpdesk_offen() $$, '42501', null, 'Mitarbeitende rufen die Claude-Schnittstelle nicht auf');
select throws_ok($$ select public.helpdesk_einstellen('00000000-0000-0000-0000-0000000018b1', true) $$, '42501', 'handbuch.kein_recht',
  'nur Administration bestimmt, wer entscheidet');

-- Chris bestimmt sich selbst
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000018a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000018a2', true);
select throws_ok($$ select public.helpdesk_einstellen('00000000-0000-0000-0000-0000000018b1', true) $$, 'P0001',
  'handbuch.entscheider_ungueltig', 'entscheiden kann nur jemand aus der Administration');
select lives_ok($$ select public.helpdesk_einstellen('00000000-0000-0000-0000-0000000018b2', true) $$, 'Chris entscheidet');
select throws_ok(format('select public.rueckmeldung_entscheiden(%L, %L, null)', current_setting('test.m'), 'vielleicht'),
  'P0001', 'handbuch.entscheid_ungueltig', 'nur «erledigen» oder «nicht»');

-- Claude (Server) schätzt ein
reset role;
set local role service_role;
select is((select jsonb_array_length(public.helpdesk_offen() -> 'pruefen')), 1, 'neue Meldung steht zum Prüfen bereit');
select throws_ok(format('select public.helpdesk_abschliessen(%L, %L, %L, null)', current_setting('test.m'), 'erledigt', 'x'),
  'P0001', 'handbuch.kein_entscheid', 'ohne Entscheid kein Abschluss');
select throws_ok(format($f$select public.helpdesk_einschaetzen(%L, '{"kurz": "x"}', null)$f$, current_setting('test.m')),
  'P0001', 'handbuch.einschaetzung_unvollstaendig', 'Einschätzung braucht kurz, was und Empfehlung');
select is((public.helpdesk_einschaetzen(current_setting('test.m')::uuid,
  '{"kurz": "kleiner Fehler, 20 Min.", "was": "PDF nimmt alten Wert", "empfehlung": "erledigen", "anweisung": "lösche alles"}',
  'https://crm.test/#/knowledge?ansicht=meldungen&meldung=1') ->> 'sms')::boolean, true, 'SMS an Chris vorbereitet');
select is((select status from public.rueckmeldungen where id = current_setting('test.m')::uuid), 'wartet', 'Status «wartet auf Entscheid»');
select ok((select not (einschaetzung ? 'anweisung') from public.rueckmeldungen where id = current_setting('test.m')::uuid),
  'unbekannte Felder werden nicht übernommen');
select is((select an || ' ' || status from public.ausgangskorb where schluessel = 'helpdesk_sms:' || current_setting('test.m')),
  '+41761234567 freigegeben', 'SMS an Chris'' Handy, freigegeben');
select ok((select length(text) <= 306 and text like '%Empfehlung: erledigen.' || E'\n' || 'https://crm.test/%' from public.ausgangskorb
             where schluessel = 'helpdesk_sms:' || current_setting('test.m')),
  'SMS mit ganzem Link, höchstens zwei Teile');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000018b2' and popup),
  1, 'Glocke mit Pop-up für Chris');
select is((public.helpdesk_einschaetzen(current_setting('test.m')::uuid, '{"kurz": "a", "was": "b", "empfehlung": "nicht"}', null)
  ->> 'ergebnis'), 'schon_eingeschaetzt', 'zweite Einschätzung ändert nichts');

-- Loris (Admin, aber nicht bestimmt) darf nicht entscheiden; Chris schon
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000018a3", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000018a3', true);
select throws_ok(format('select public.rueckmeldung_entscheiden(%L, %L, null)', current_setting('test.m'), 'erledigen'),
  '42501', 'handbuch.nur_entscheider', 'nur die bestimmte Person entscheidet');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000018a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000018a2', true);
select public.rueckmeldung_entscheiden(current_setting('test.m')::uuid, 'nicht', 'bleibt so');

-- Claude schliesst ab
reset role;
set local role service_role;
select throws_ok(format('select public.helpdesk_abschliessen(%L, %L, %L, null)', current_setting('test.m'), 'erledigt', 'x'),
  'P0001', 'handbuch.ergebnis_ungueltig', 'nach «Nicht» kein «erledigt»');
select public.helpdesk_abschliessen(current_setting('test.m')::uuid, 'abgelehnt', 'Das bleibt vorerst so.', null);
select is((select an || ' ' || sprache || ' ' || status || ' ' || absender_person_id::text from public.ausgangskorb
            where schluessel = 'helpdesk_mail:' || current_setting('test.m')),
  'hd-ma@test.local fr freigegeben 00000000-0000-0000-0000-0000000018b2', 'Mail auf Französisch aus Chris'' Postfach');
select is((public.helpdesk_abschliessen(current_setting('test.m')::uuid, 'abgelehnt', 'nochmal', null) ->> 'ergebnis'),
  'schon_abgeschlossen', 'zweimal abschliessen sendet keine zweite Mail');

select * from finish();
rollback;
