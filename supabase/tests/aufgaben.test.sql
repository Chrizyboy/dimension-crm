-- Prüft Aufgaben (Entscheid 0045): Sichtbarkeit eigene/vergebene, Vertretung bei Abwesenheit, Glocke beim Zuteilen
-- und Erledigen, Wiederholung, Notiz im Verlauf des Leads, Kommentar mit @Kurzzeichen, Morgen-Glocke einmal pro Tag.
-- Ausführen: npm run db:test
begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'p39-a@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'p39-b@test.local'),
  ('00000000-0000-0000-0000-0000000039a3', 'p39-c@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000039b1', 'p39a', 'Anna Auftrag', '00000000-0000-0000-0000-0000000039a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000039b2', 'p39b', 'Beat Bearbeiter', '00000000-0000-0000-0000-0000000039a2', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000039b3', 'p39c', 'Carla Fremd', '00000000-0000-0000-0000-0000000039a3', 'verkauf', '{}', 'de');
update public.einstellungen set wert = jsonb_set(coalesce(wert, '{}'), '{stellvertretung,p39b}', '"p39c"')
 where schluessel = 'zustaendigkeiten';
update public.einstellungen set wert = wert || '{"sichtbarkeit": "eigene"}' where schluessel = 'aufgaben';
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000039c1', 'person', 'privat', 'Max', 'Meier', 'de');
insert into public.verkaufschancen (id, kontakt_id) values
  ('00000000-0000-0000-0000-0000000039d1', '00000000-0000-0000-0000-0000000039c1');

-- Anna vergibt eine Aufgabe an Beat (zum Lead, monatlich).
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}';
insert into public.aufgaben (id, titel, faellig_am, person_id, bezug_tabelle, bezug_id, wiederholung) values
  ('00000000-0000-0000-0000-0000000039e1', 'Meier zurückrufen', current_date, '00000000-0000-0000-0000-0000000039b2',
   'verkaufschancen', '00000000-0000-0000-0000-0000000039d1', 'monat');
select is((select bezug_name from public.aufgaben_liste where id = '00000000-0000-0000-0000-0000000039e1'),
  'Max Meier', 'Bezug mit Namen');
reset role;
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000039b2'),
  1, 'Glocke an Beat beim Zuteilen');

-- Carla sieht sie nicht (weder eigen noch vergeben).
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000039a3", "role": "authenticated"}';
select is((select count(*)::int from public.aufgaben where id = '00000000-0000-0000-0000-0000000039e1'), 0,
  'Fremde sehen die Aufgabe nicht');
reset role;

-- Beat ist abwesend, Carla vertritt ihn: jetzt sieht sie sie.
insert into public.abwesenheiten (person_id, art, von, bis) values
  ('00000000-0000-0000-0000-0000000039b2', 'ferien', current_date - 1, current_date + 3);
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000039a3", "role": "authenticated"}';
select is((select vertretung from public.aufgaben_liste where id = '00000000-0000-0000-0000-0000000039e1'), true,
  'Stellvertretung sieht die Aufgabe');
reset role;
select lives_ok($$select public.aufgaben_melden((intern.heute_zuerich() + time '08:00') at time zone 'Europe/Zurich')$$, 'Morgen-Glocke läuft');
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-0000000039b3' and titel_de = 'Deine Aufgaben heute'),
  case when extract(isodow from intern.heute_zuerich()) > 5 then 0 else 1 end, 'Morgen-Glocke an Carla (Vertretung), nur werktags');
select public.aufgaben_melden((intern.heute_zuerich() + time '09:00') at time zone 'Europe/Zurich');
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-0000000039b3' and titel_de = 'Deine Aufgaben heute'),
  case when extract(isodow from intern.heute_zuerich()) > 5 then 0 else 1 end, 'nur einmal pro Tag');
delete from public.abwesenheiten where person_id = '00000000-0000-0000-0000-0000000039b2';

-- Beat kommentiert mit @p39a und erledigt mit Notiz.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}';
insert into public.aufgaben_kommentare (aufgabe_id, text) values ('00000000-0000-0000-0000-0000000039e1', 'Erledige ich, @P39A');
select public.aufgabe_erledigen('00000000-0000-0000-0000-0000000039e1', 'Will Speicher, Offerte B');
reset role;
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-0000000039b1' and titel_de like 'Beat Bearbeiter:%'), 1,
  'Kommentar meldet Anna einmal (Erstellerin und @Kurzzeichen)');
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-0000000039b1' and titel_de like 'Erledigt%'), 1,
  'Glocke an Anna beim Erledigen');
select is((select text from public.aktivitaeten where verkaufschance_id = '00000000-0000-0000-0000-0000000039d1'),
  E'Aufgabe erledigt: Meier zurückrufen\nWill Speicher, Offerte B', 'Notiz im Verlauf des Leads');
select is((select faellig_am from public.aufgaben where vorgaenger_id = '00000000-0000-0000-0000-0000000039e1'),
  (current_date + interval '1 month')::date, 'nächste Aufgabe einen Monat später');
select is((select person_id from public.aufgaben where vorgaenger_id = '00000000-0000-0000-0000-0000000039e1'),
  '00000000-0000-0000-0000-0000000039b2'::uuid, 'gleiche Person');

-- Wieder öffnen und nochmals erledigen erzeugt keine zweite Folgeaufgabe.
update public.aufgaben set erledigt_am = null where id = '00000000-0000-0000-0000-0000000039e1';
update public.aufgaben set erledigt_am = now() where id = '00000000-0000-0000-0000-0000000039e1';
select is((select count(*)::int from public.aufgaben where vorgaenger_id = '00000000-0000-0000-0000-0000000039e1'), 1,
  'Wiederholung nur einmal');

-- Einstellungen nur Administration.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}';
select throws_ok($$update public.einstellungen set wert = wert || '{"sichtbarkeit": "alle"}' where schluessel = 'aufgaben'$$,
  '42501', 'aufgaben.kein_recht', 'Regeln nur Administration');
reset role;

select * from finish();
rollback;
