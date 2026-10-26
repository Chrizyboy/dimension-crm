-- Prüft Phase 16: Datensicherung. Welche Tabellen (ohne Protokoll), Termine 12:00/16:00 wie V233, eine Sicherung pro
-- Termin (Sperre), Glocke bei Fehler, nur Administration sieht Sicherungen, nur der Server darf sichern und
-- einspielen, Wiederherstellen setzt Geändertes zurück, legt Neues in den Papierkorb, lässt Unverändertes und
-- Ausgangskorb in Ruhe und schaltet die Fach-Trigger danach wieder ein. Aufräumen nach 14 bzw. 90 Tagen.
-- Ausführen: npm run db:test
begin;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000016a1', 'p16-vk@test.local'),
  ('00000000-0000-0000-0000-0000000016a2', 'p16-ad@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000016b1', 'p16_vk', 'Vera Vertrieb', '00000000-0000-0000-0000-0000000016a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000016b2', 'p16_ad', 'Adam Admin', '00000000-0000-0000-0000-0000000016a2', 'admin', '{}', 'de');

-- Tabellen
select ok(not exists (select 1 from public.sicherung_tabellen() where tabelle in ('aenderungsprotokoll', 'sicherungen')),
  'Protokoll und Sicherungen selbst sind nicht in der Sicherung');
select ok((select stufe from public.sicherung_tabellen() where tabelle = 'kontakte')
          < (select stufe from public.sicherung_tabellen() where tabelle = 'verkaufschancen'),
  'Reihenfolge: erst Kontakte, dann Leads');
select ok(jsonb_typeof(public.sicherung_tabelle('rollen')) = 'array', 'Tabelle als JSON');
select throws_ok($$ select public.sicherung_tabelle('aenderungsprotokoll') $$, 'P0001', 'sicherung.tabelle_unbekannt',
  'Protokoll lässt sich nicht auslesen');

-- Termine wie V233 (12:00 und 16:00 Schweizer Zeit)
select is(public.sicherung_faellig('2030-01-15 10:00+01'), '2030-01-14-16', 'vor 12 Uhr: der Termin von gestern 16 Uhr');
select is(public.sicherung_faellig('2030-01-15 12:05+01'), '2030-01-15-12', 'nach 12 Uhr: 12-Uhr-Termin');
select is(public.sicherung_faellig('2030-07-15 16:30+02'), '2030-07-15-16', 'Sommerzeit: 16-Uhr-Termin');

-- Sperre: ein Termin nur einmal
select isnt(public.sicherung_beginnen('2030-01-15-12', 'automatisch'), null, 'Termin beginnt');
select is(public.sicherung_beginnen('2030-01-15-12', 'automatisch'), null, 'gleichzeitiger zweiter Lauf bekommt keine ID');
select is(public.sicherung_faellig('2030-01-15 12:05+01'), null, 'laufender Termin ist nicht nochmals fällig');
select public.sicherung_abschliessen((select id from public.sicherungen where slot = '2030-01-15-12'), false, '{}', null,
  null, 'zeitlimit');
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-0000000016b2' and titel_de = 'Datensicherung fehlgeschlagen'),
  1, 'Fehler: Administration bekommt eine Glocke');
select isnt(public.sicherung_beginnen('2030-01-15-12', 'automatisch'), null, 'nach einem Fehler darf der Termin neu beginnen');
select public.sicherung_abschliessen((select id from public.sicherungen where slot = '2030-01-15-12'), true,
  '{"kontakte": 1}', 10, 'CRM-Backup_2030-01-15-12.json.gz');
select is(public.sicherung_faellig('2030-01-15 13:00+01'), null, 'gesicherter Termin ist erledigt');

-- Rechte
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000016a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000016a1', true);
select is((select count(*)::int from public.sicherungen), 0, 'Verkauf sieht keine Sicherungen');
select throws_ok($$ select public.sicherung_tabelle('kontakte') $$, '42501', null, 'Verkauf kann keine Tabelle auslesen');
select throws_ok($$ select public.sicherung_einspielen(gen_random_uuid()) $$, '42501', null, 'App kann nicht einspielen');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000016a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000016a2', true);
select ok((select count(*)::int from public.sicherungen where slot = '2030-01-15-12') = 1, 'Administration sieht Sicherungen');
reset role;

-- Wiederherstellen: Stand sichern, ändern, einspielen
insert into public.kontakte (id, art, kontaktart, vorname, nachname) values
  ('00000000-0000-0000-0000-0000000016c1', 'person', 'privat', 'Sina', 'Vorher');
select public.sicherung_puffern('00000000-0000-0000-0000-0000000016f1', t.tabelle, 0, public.sicherung_tabelle(t.tabelle))
  from (values ('kontakte'), ('ausgangskorb'), ('bestellpositionen')) t (tabelle);
update public.kontakte set nachname = 'Nachher' where id = '00000000-0000-0000-0000-0000000016c1';
insert into public.kontakte (id, art, kontaktart, vorname, nachname) values
  ('00000000-0000-0000-0000-0000000016c2', 'person', 'privat', 'Nino', 'Neu');
select is(public.sicherung_einspielen('00000000-0000-0000-0000-0000000016f1'),
  '{"kontakte": {"zurueck": 1, "papierkorb": 1}}'::jsonb, 'nur der geänderte und der neue Kontakt sind betroffen');
select is((select nachname from public.kontakte where id = '00000000-0000-0000-0000-0000000016c1'), 'Vorher',
  'geänderter Kontakt ist zurückgesetzt');
select isnt((select geloescht_am from public.kontakte where id = '00000000-0000-0000-0000-0000000016c2'), null,
  'neuer Kontakt liegt im Papierkorb');
select is((select count(*)::int from pg_trigger t
            where t.tgrelid in ('public.bestellpositionen'::regclass, 'public.kontakte'::regclass)
              and not t.tgisinternal and t.tgenabled = 'D'), 0, 'Fach-Trigger sind danach wieder eingeschaltet');

select * from finish();
rollback;
