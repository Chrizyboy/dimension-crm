-- Registrier-Link fürs Handy und Erstvisum von Rechnungen (2.11.2026). Ausführen: npm run db:test
begin;
select plan(14);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000056a1', 'rl-ad@test.local'),
  ('00000000-0000-0000-0000-0000000056a2', 'rl-pl@test.local'), ('00000000-0000-0000-0000-0000000056a3', 'rl-vk@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000056b1', 'rl_ad', 'Ada Admin', 'rl-ad@test.local', '00000000-0000-0000-0000-0000000056a1', 'verkauf', '{admin}', 'de'),
  ('00000000-0000-0000-0000-0000000056b2', 'rl_pl', 'Pia Leitung', 'rl-pl@test.local', '00000000-0000-0000-0000-0000000056a2', 'projektleitung', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000056b3', 'rl_vk', 'Vik Verkauf', 'rl-vk@test.local', '00000000-0000-0000-0000-0000000056a3', 'verkauf', '{}', 'de');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000056c1', 'person', 'privat', 'Lea', 'Beispiel', 'de');
insert into public.projekte (id, nummer, kontakt_id, titel, verantwortlich_id) values
  ('00000000-0000-0000-0000-0000000056d1', 'P-T56', '00000000-0000-0000-0000-0000000056c1', 'PV Beispiel', '00000000-0000-0000-0000-0000000056b2');
insert into public.rechnungen (id, firma_id, art, status, kontakt_id, projekt_id, titel, positionen, netto_rappen, mwst_rappen, total_rappen) values
  ('00000000-0000-0000-0000-0000000056e1', (select id from public.firmen limit 1), 'schluss', 'entwurf', '00000000-0000-0000-0000-0000000056c1',
   '00000000-0000-0000-0000-0000000056d1', 'Schlussrechnung', '[{"text": "PV-Anlage", "menge": 1, "preis_rappen": 1000000}]',
   1000000, 81000, 1081000);

set local role authenticated;
-- 1. Link erstellen (nur Administration)
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000056a3", "role": "authenticated"}', true);
select throws_ok($$select public.person_mit_link_anlegen('Diogo Test', 'montage')$$, '42501', 'registrierung.kein_recht',
  'Link nur durch die Administration');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000056a1", "role": "authenticated"}', true);
create temp table l on commit drop as select public.person_mit_link_anlegen('Diogo Test', 'montage', 'fr') as r;
grant select on l to authenticated, anon;
select is((select kuerzel || '/' || rolle || '/' || coalesce(email, '-') from public.personen
            where id = ((select r from l) ->> 'person_id')::uuid), 'diogo/montage/-', 'Person ohne Mail erfasst');
reset role;
select set_config('request.jwt.claims', '', true);

-- 2. Einlösen ohne Anmeldung
set local role anon;
select is(public.registrier_link_pruefen((select r ->> 'schluessel' from l)), '{"vorname": "Diogo", "sprache": "fr"}',
  'Link zeigt Vorname und Sprache');
select is(public.registrier_link_pruefen('falsch'), null, 'falscher Link gilt nicht');
select throws_ok($$select public.registrier_link_einloesen((select r ->> 'schluessel' from l), 'rl-vk@test.local')$$,
  'P0001', 'registrierung.email_vergeben', 'Adresse einer anderen Person abgelehnt');
select throws_ok($$select public.registrier_link_einloesen((select r ->> 'schluessel' from l), 'kein-mail')$$,
  'P0001', 'registrierung.email_ungueltig', 'ungültige Adresse abgelehnt');
select is(public.registrier_link_einloesen((select r ->> 'schluessel' from l), ' Diogo.Privat@Beispiel.test ') ->> 'email',
  'diogo.privat@beispiel.test', 'private Adresse gesetzt');
select throws_ok($$select public.registrier_link_einloesen((select r ->> 'schluessel' from l), 'x@beispiel.test')$$,
  'P0001', 'registrierung.link_ungueltig', 'Link gilt nur einmal');
reset role;
select is((intern.vor_konto_anlage('{"user": {"email": "diogo.privat@beispiel.test"}}')), '{}'::jsonb,
  'mit der privaten Adresse kann er sich jetzt anmelden');

-- 3. Erstvisum
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000056a2", "role": "authenticated"}', true);
select is((select count(*)::int from public.rechnungen), 0, 'Projektleitung sieht die Rechnungen-Tabelle nicht');
select is((select total_rappen from public.rechnungen_zum_visum()), 1081000::bigint, 'aber den Entwurf ihres Projekts zum Visum');
select lives_ok($$select public.rechnung_visieren('00000000-0000-0000-0000-0000000056e1')$$, 'Erstvisum geben');
select isnt((select visum_am from public.rechnungen_zum_visum()), null, 'Visum ist vermerkt');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000056a3", "role": "authenticated"}', true);
select throws_ok($$select public.rechnung_visieren('00000000-0000-0000-0000-0000000056e1')$$, '42501', 'rechnung.visum_kein_recht',
  'Verkauf visiert nicht');
reset role;

select * from finish();
rollback;
