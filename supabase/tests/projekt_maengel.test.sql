-- Prüft Mängelliste und Beteiligte je Projekt (Entscheid 0045, Schritt 2): Übergabe erst ohne offene Mängel,
-- Speichern wiederholbar mit ID aus der App, Beteiligte nur mit bekannter Rolle und ohne Doppelte.
-- Ausführen: npm run db:test
begin;
select plan(10);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000045a1', 'pl-maengel@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000045b1', 'pl_maengel', 'Petra Mangel', '00000000-0000-0000-0000-0000000045a1', 'projektleitung', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000045c1', 'person', 'privat', 'Max', 'Muster', 'de'),
  ('00000000-0000-0000-0000-0000000045c2', 'firma', 'firma', null, null, 'de');
update public.kontakte set firma = 'Elektro Beispiel AG' where id = '00000000-0000-0000-0000-0000000045c2';
insert into public.projekte (id, nummer, kontakt_id, status, bau_status, ablauf_vorlage_id) values
  ('00000000-0000-0000-0000-0000000045d1', 'P-TEST-045', '00000000-0000-0000-0000-0000000045c1', 'im_bau', 'ibn',
   (select id from public.ablauf_vorlagen where schluessel = 'pv'));

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000045a1", "role": "authenticated"}', true);

select is(public.projekt_mangel_speichern('00000000-0000-0000-0000-0000000045e1', '00000000-0000-0000-0000-0000000045d1',
  '{"text": "Kabelkanal Dach Süd fehlt Deckel", "art": "restarbeit"}'),
  '00000000-0000-0000-0000-0000000045e1'::uuid, 'Mangel mit ID aus der App angelegt');
select lives_ok($$ select public.projekt_mangel_speichern('00000000-0000-0000-0000-0000000045e1', '00000000-0000-0000-0000-0000000045d1',
  '{"text": "Kabelkanal Dach Süd: Deckel fehlt", "art": "restarbeit"}') $$, 'Nochmals senden ändert statt doppelt');
select is((select count(*)::int from public.projekt_maengel where projekt_id = '00000000-0000-0000-0000-0000000045d1'), 1, 'Nur ein Eintrag');
select is((select maengel_offen from public.projekt_signale where projekt_id = '00000000-0000-0000-0000-0000000045d1'), 1, 'Signal zählt offene Mängel');

select throws_ok($$ select public.projekt_schritt_setzen('00000000-0000-0000-0000-0000000045d1', 'uebergabe', '{"stand": "erledigt"}') $$,
  'projekte.maengel_offen', 'Übergabe gesperrt, solange ein Mangel offen ist');
select lives_ok($$ select public.projekt_mangel_erledigen('00000000-0000-0000-0000-0000000045e1', true, 'Deckel montiert') $$, 'Mangel erledigt');
select lives_ok($$ select public.projekt_schritt_setzen('00000000-0000-0000-0000-0000000045d1', 'uebergabe', '{"stand": "erledigt"}') $$,
  'Danach ist die Übergabe frei');

select is(public.projekt_beteiligt_setzen('00000000-0000-0000-0000-0000000045d1', '00000000-0000-0000-0000-0000000045c2', 'elektriker'),
          public.projekt_beteiligt_setzen('00000000-0000-0000-0000-0000000045d1', '00000000-0000-0000-0000-0000000045c2', 'elektriker', 'Herr Beispiel'),
          'Gleicher Beteiligter mit gleicher Rolle nur einmal');
select throws_ok($$ select public.projekt_beteiligt_setzen('00000000-0000-0000-0000-0000000045d1', '00000000-0000-0000-0000-0000000045c2', 'astronaut') $$,
  'projekte.rolle_unbekannt', 'Unbekannte Rolle abgelehnt');
select is((public.projekt_akte('00000000-0000-0000-0000-0000000045d1') -> 'beteiligte' -> 0 ->> 'name'), 'Elektro Beispiel AG',
  'Akte zeigt Beteiligte mit Namen');

select * from finish();
rollback;
