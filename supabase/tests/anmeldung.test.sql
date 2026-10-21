-- Prüft Phase 4: Rollen als Daten, wirksame Rechte, wer sich anmelden darf und was man selbst ändern darf.
-- Ausführen: npm run db:test
begin;
select plan(16);

-- Testpersonen (unabhängig von seed.sql, damit der Test überall gleich läuft).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'chefin@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'monteur@test.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'buchhalter@test.local');
insert into public.personen (kuerzel, name, email, rolle, auth_user_id) values
  ('t_chefin', 'Test Chefin', 'chefin@test.local', 'admin', '00000000-0000-0000-0000-0000000000b1'),
  ('t_monteur', 'Test Monteur', 'MONTEUR@test.local', 'montage', '00000000-0000-0000-0000-0000000000b2'),
  ('t_buchhalter', 'Test Buchhalter', 'buchhalter@test.local', 'buchhaltung', '00000000-0000-0000-0000-0000000000b3');
insert into public.kreditor_zahlungen (firma, betrag_rappen) values ('Testlieferant', 100);

-- Konfiguration
select ok((select count(*) from public.rollen) >= 6, 'mindestens sechs Rollen sind als Daten angelegt');
select is((select email from public.personen where kuerzel = 't_monteur'), 'monteur@test.local', 'E-Mail wird klein gespeichert');

-- Anmelde-Hook: nur erfasste, aktive Personen bekommen ein Konto
select is(intern.vor_konto_anlage('{"user": {"email": "Monteur@Test.local"}}'), '{}'::jsonb, 'erfasste Person darf ein Konto bekommen');
select is((intern.vor_konto_anlage('{"user": {"email": "fremd@example.com"}}') -> 'error' ->> 'http_code')::int, 403, 'fremde Adresse wird abgewiesen');
update public.personen set aktiv = false where kuerzel = 't_monteur';
select is((intern.vor_konto_anlage('{"user": {"email": "monteur@test.local"}}') -> 'error' ->> 'http_code')::int, 403, 'deaktivierte Person bekommt kein Konto');
update public.personen set aktiv = true where kuerzel = 't_monteur';

-- Rechte aus der Rolle
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000b3", "role": "authenticated"}', true);
select ok((select count(*) from public.kreditor_zahlungen) >= 1, 'Buchhaltung sieht Finanzen über ihre Rolle');
select ok((public.meine_anmeldung() -> 'rechte') ? 'finanzen', 'meine_anmeldung liefert die Rechte der Rolle');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}', true);
select is((select count(*) from public.kreditor_zahlungen), 0::bigint, 'Montage sieht keine Finanzen');
select is((select count(*) from public.aenderungsprotokoll where tabelle = 'kreditor_zahlungen'), 0::bigint,
  'auch das Änderungsprotokoll verrät keine Finanzdaten');

-- Selbst-Beförderung ist nicht möglich: das Update trifft keine Zeile.
update public.personen set rolle = 'admin' where kuerzel = 't_monteur';
select is((select rolle from public.personen where kuerzel = 't_monteur'), 'montage', 'niemand ändert die eigene Rolle');
update public.rollen set rechte = '{admin}' where schluessel = 'montage';
select is((select rechte from public.rollen where schluessel = 'montage'), '{}'::text[], 'Rollen ändert nur die Administration');

-- Mein Konto: erlaubte Felder ja, alles andere nein
select lives_ok($$ select public.aendere_mein_konto('{"mobil": "+41 76 000 00 00"}') $$, 'eigenes Profil lässt sich ändern');
select is((select profil ->> 'mobil' from public.personen where kuerzel = 't_monteur'), '+41 76 000 00 00', 'Profil ist gespeichert');
select throws_ok($$ select public.aendere_mein_konto('{"rolle": "admin"}') $$, '22023', null, 'Rolle lässt sich über Mein Konto nicht ändern');

-- Admin darf, aber die letzte Admin-Person kann sich nicht selbst aussperren
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);
update public.personen set rechte = '{preise}' where kuerzel = 't_monteur';
select is((select rechte from public.personen where kuerzel = 't_monteur'), '{preise}'::text[], 'Admin vergibt Zusatzrechte');
reset role;
-- Alle anderen Admins (z. B. aus seed.sql) vorübergehend entfernen, dann die letzte Admin-Person testen.
update public.personen set rolle = 'verkauf' where rolle = 'admin' and kuerzel <> 't_chefin';
select throws_ok($$ update public.personen set aktiv = false where kuerzel = 't_chefin' $$, 'P0001', null,
  'die letzte Admin-Person kann nicht deaktiviert werden');

select * from finish();
rollback;
