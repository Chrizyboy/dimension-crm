-- Prüft den Papierkorb für alle Bereiche: in den Papierkorb legen, Liste mit Titel und «wer»,
-- Sperren für Gebuchtes (stornieren statt löschen), Wiederherstellen.
-- Ausführen: npm run db:test
begin;
select plan(11);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000077a1', 'pk-a@test.local'),
  ('00000000-0000-0000-0000-0000000077a2', 'pk-b@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000077b1', 'pk77a', 'Paula Korb', '00000000-0000-0000-0000-0000000077a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000077b2', 'pk77b', 'Bruno Fremd', '00000000-0000-0000-0000-0000000077a2', 'verkauf', '{}', 'de');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000077c1', 'person', 'privat', 'Max', 'Papier', 'de');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000077a1", "role": "authenticated"}';

select lives_ok($$select public.papierkorb_legen('kontakte', '00000000-0000-0000-0000-0000000077c1')$$,
  'Kontakt in den Papierkorb');
select isnt((select geloescht_am from public.kontakte where id = '00000000-0000-0000-0000-0000000077c1'), null,
  'geloescht_am gesetzt');
select lives_ok($$select public.papierkorb_legen('kontakte', '00000000-0000-0000-0000-0000000077c1')$$,
  'zweimal ist kein Fehler');
select is((select titel || ' / ' || coalesce(geloescht_von, '?') from public.papierkorb_liste()
            where id = '00000000-0000-0000-0000-0000000077c1'),
  'Max Papier / Paula Korb', 'Papierkorb zeigt Titel und wer');
select throws_ok($$select public.papierkorb_legen('spesen', gen_random_uuid())$$,
  'papierkorb.spesen_stornieren', 'Spesen nur stornieren');
select throws_ok($$select public.papierkorb_legen('personen', gen_random_uuid())$$,
  'papierkorb.person_deaktivieren', 'Personen nur deaktivieren');
select throws_ok($$select public.papierkorb_legen('aenderungsprotokoll', gen_random_uuid())$$,
  'papierkorb.unbekannt', 'nur Fachtabellen');
-- Bruno hat nichts weggelegt: sieht es nicht und holt es nicht zurück (nur Administration oder wer es weglegte).
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000077a2", "role": "authenticated"}';
select is((select count(*)::int from public.papierkorb_liste() where id = '00000000-0000-0000-0000-0000000077c1'), 0,
  'fremde Einträge nicht im eigenen Papierkorb');
select throws_ok($$select public.papierkorb_zurueckholen('kontakte', '00000000-0000-0000-0000-0000000077c1')$$,
  'papierkorb.nur_eigene', 'nur eigene zurückholen');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000077a1", "role": "authenticated"}';
select lives_ok($$select public.papierkorb_zurueckholen('kontakte', '00000000-0000-0000-0000-0000000077c1')$$,
  'Wiederherstellen');
select is((select geloescht_am from public.kontakte where id = '00000000-0000-0000-0000-0000000077c1'), null,
  'wieder da');

reset role;
select * from finish();
rollback;
