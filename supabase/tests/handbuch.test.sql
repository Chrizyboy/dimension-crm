-- Prüft Phase 15: Prozesse und Videos ablegen nur Administration, neue Datei schiebt die alte Fassung nach
-- «Frühere Versionen», gleicher Titel ist ein Fehler, entfernen = Papierkorb. «Fehler melden»: Nummer, Glocke für
-- die Administration (nicht für die meldende Person), jede Person sieht nur ihre Meldungen, Antwort nur
-- Administration und mit Glocke für die meldende Person.
-- Ausführen: npm run db:test
begin;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000015a1', 'p15-vk@test.local'),
  ('00000000-0000-0000-0000-0000000015a2', 'p15-ad@test.local'),
  ('00000000-0000-0000-0000-0000000015a3', 'p15-mt@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000015b1', 'p15_vk', 'Vera Vertrieb', '00000000-0000-0000-0000-0000000015a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000015b2', 'p15_ad', 'Adam Admin', '00000000-0000-0000-0000-0000000015a2', 'admin', '{}', 'fr'),
  ('00000000-0000-0000-0000-0000000015b3', 'p15_mt', 'Moritz Monteur', '00000000-0000-0000-0000-0000000015a3', 'verkauf', '{}', 'de');
insert into public.dokumente (id, name, speicher, ordner) values
  ('00000000-0000-0000-0000-0000000015d1', 'Prozess_Test_v1.pdf', 'intern', 'handbuch'),
  ('00000000-0000-0000-0000-0000000015d2', 'Prozess_Test_v2.pdf', 'intern', 'handbuch');

-- Als Verkauf: nur lesen
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000015a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000015a1', true);
select throws_ok($$ select public.handbuch_speichern(null, 'prozess', 'P15 Ablauf', null, null, null, '1.0', null,
  '00000000-0000-0000-0000-0000000015d1', null) $$, '42501', 'handbuch.kein_recht', 'Prozess ablegen nur Administration');
select throws_ok($$ insert into public.handbuch_eintraege (art, titel_de) values ('prozess', 'Direkt') $$, '42501', null,
  'auch direkt kein Anlegen ohne Administration');

-- Als Administration
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000015a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000015a2', true);
select throws_ok($$ select public.handbuch_speichern(null, 'prozess', '  ', null, null, null, '1.0', null,
  '00000000-0000-0000-0000-0000000015d1', null) $$, 'P0001', 'handbuch.titel_fehlt', 'Titel ist Pflicht');
select throws_ok($$ select public.handbuch_speichern(null, 'prozess', 'P15 Ablauf', null, null, null, '1.0', null,
  null, null) $$, 'P0001', 'handbuch.datei_fehlt', 'neuer Prozess braucht eine Datei');
select lives_ok($$ select set_config('test.p15', public.handbuch_speichern(null, 'prozess', 'P15 Ablauf', 'Test', null, null,
  '1.0', '2026-10-01', '00000000-0000-0000-0000-0000000015d1', null)::text, true) $$, 'Administration legt Prozess ab');
select throws_ok($$ select public.handbuch_speichern(null, 'prozess', ' p15 ablauf ', null, null, null, '1.0', null,
  '00000000-0000-0000-0000-0000000015d2', null) $$, 'P0001', 'handbuch.doppelt', 'gleicher Titel: «Neue Version» verwenden');

select public.handbuch_speichern(current_setting('test.p15')::uuid, 'prozess', 'P15 Ablauf', 'Test', null, null, '1.1',
  '2026-10-20', '00000000-0000-0000-0000-0000000015d2', null);
select is((select version || ' ' || datei_de_id::text from public.handbuch_eintraege where id = current_setting('test.p15')::uuid),
  '1.1 00000000-0000-0000-0000-0000000015d2', 'neue Version mit neuer Datei');
select is((select versionen -> 0 ->> 'version' || ' ' || (versionen -> 0 ->> 'datei_de_id')
             from public.handbuch_eintraege where id = current_setting('test.p15')::uuid),
  '1.0 00000000-0000-0000-0000-0000000015d1', 'alte Fassung unter «Frühere Versionen»');
select public.handbuch_speichern(current_setting('test.p15')::uuid, 'prozess', 'P15 Ablauf', 'Neu beschrieben', null, null,
  '1.1', null, null, null);
select is((select jsonb_array_length(versionen) from public.handbuch_eintraege where id = current_setting('test.p15')::uuid),
  1, 'nur Text geändert: keine weitere Fassung');

select public.handbuch_entfernen(current_setting('test.p15')::uuid);
select isnt((select geloescht_am from public.handbuch_eintraege where id = current_setting('test.p15')::uuid), null,
  'entfernen legt in den Papierkorb');

-- Verkauf meldet
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000015a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000015a1', true);
select throws_ok($$ select public.rueckmeldung_melden('Titel', ' ', null, 'sales', 'normal', 'x') $$, 'P0001',
  'handbuch.text_fehlt', 'Beschreibung ist Pflicht');
select throws_ok($$ insert into public.rueckmeldungen (titel, text) values ('a', 'b') $$, '42501', null,
  'Meldungen nur über «Fehler melden»');
select set_config('test.m15', public.rueckmeldung_melden('P15 Offerte speichert nicht', 'Fehler beim Speichern', 'Gespeichert',
  'quotes', 'dringend', 'Chrome, 1440×900, de') ->> 'id', true);
select is((select person_id from public.rueckmeldungen where id = current_setting('test.m15')::uuid),
  '00000000-0000-0000-0000-0000000015b1'::uuid, 'Meldung gehört der meldenden Person');
select throws_ok($$ select public.rueckmeldung_beantworten(current_setting('test.m15')::uuid, 'erledigt', 'x') $$, '42501',
  'handbuch.kein_recht', 'antworten nur Administration');
reset role;
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-0000000015b2' and art = 'kritisch' and titel_de like 'Neue Meldung T%'),
  1, 'Administration bekommt eine dringende Glocke');
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-0000000015b1' and titel_de like 'Neue Meldung T%'),
  0, 'meldende Person bekommt keine eigene Glocke');

-- Andere Person sieht die Meldung nicht
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000015a3", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000015a3', true);
select is((select count(*)::int from public.rueckmeldungen where id = current_setting('test.m15')::uuid), 0,
  'andere Personen sehen fremde Meldungen nicht');

-- Administration sieht und antwortet
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000015a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000015a2', true);
select is((select count(*)::int from public.rueckmeldungen where id = current_setting('test.m15')::uuid), 1,
  'Administration sieht alle Meldungen');
select public.rueckmeldung_beantworten(current_setting('test.m15')::uuid, 'erledigt', 'Ist behoben');
reset role;
select is((select status || ' / ' || antwort || ' / ' || antwort_von from public.rueckmeldungen
            where id = current_setting('test.m15')::uuid), 'erledigt / Ist behoben / Adam Admin', 'Antwort gespeichert');
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-0000000015b1' and art = 'ok' and titel_de like 'Antwort auf deine Meldung T%'),
  1, 'meldende Person bekommt die Antwort in der Glocke');

select * from finish();
rollback;
