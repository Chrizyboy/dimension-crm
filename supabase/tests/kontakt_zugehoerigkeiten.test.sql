-- Prüft die Ansprechpersonen (Person ↔ Firma): ein Hauptkontakt pro Firma, keine Doppelten,
-- nicht sich selbst, Papierkorb statt Löschen und die Sicht mit direkter Nummer.
-- Ausführen: npm run db:test
begin;
select plan(8);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000039a1', 'zg-verkauf@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000039b1', 'zg_verkauf', 'Zora Zug', '00000000-0000-0000-0000-0000000039a1', 'verkauf', '{}');
insert into public.kontakte (id, art, kontaktart, firma, sprache) values
  ('00000000-0000-0000-0000-0000000039c1', 'firma', 'lieferant', 'Beispiel Solar AG', 'de');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, telefon, sprache) values
  ('00000000-0000-0000-0000-0000000039c2', 'person', 'privat', 'Mia', 'Muster', '+41 79 000 00 01', 'de'),
  ('00000000-0000-0000-0000-0000000039c3', 'person', 'privat', 'Noe', 'Nebel', '+41 79 000 00 02', 'fr');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a1', true);

insert into public.kontakt_zugehoerigkeiten (person_id, firma_id, funktion, hauptkontakt, telefon_direkt) values
  ('00000000-0000-0000-0000-0000000039c2', '00000000-0000-0000-0000-0000000039c1', 'Innendienst', true, '+41 32 000 00 10');
select is((select telefon from public.kontakt_zugehoerigkeiten_sicht where person_id = '00000000-0000-0000-0000-0000000039c2'),
  '+41 32 000 00 10', 'Sicht zeigt die direkte Nummer');
select is((select firma_name from public.kontakt_zugehoerigkeiten_sicht where person_id = '00000000-0000-0000-0000-0000000039c2'),
  'Beispiel Solar AG', 'Sicht zeigt den Firmennamen');

insert into public.kontakt_zugehoerigkeiten (person_id, firma_id, funktion, hauptkontakt) values
  ('00000000-0000-0000-0000-0000000039c3', '00000000-0000-0000-0000-0000000039c1', 'Aussendienst', true);
select is((select count(*)::int from public.kontakt_zugehoerigkeiten
            where firma_id = '00000000-0000-0000-0000-0000000039c1' and hauptkontakt and geloescht_am is null),
  1, 'Nur ein Hauptkontakt pro Firma');
select is((select hauptkontakt from public.kontakt_zugehoerigkeiten where person_id = '00000000-0000-0000-0000-0000000039c3'),
  true, 'Der neue Hauptkontakt gewinnt');

select throws_ok($$ insert into public.kontakt_zugehoerigkeiten (person_id, firma_id) values
  ('00000000-0000-0000-0000-0000000039c2', '00000000-0000-0000-0000-0000000039c1') $$, '23505', null, 'Keine doppelte Zugehörigkeit');
select throws_ok($$ insert into public.kontakt_zugehoerigkeiten (person_id, firma_id) values
  ('00000000-0000-0000-0000-0000000039c1', '00000000-0000-0000-0000-0000000039c1') $$, '23514', null, 'Nicht zu sich selbst');

-- Papierkorb: weg aus der Sicht, danach wieder neu anlegbar
update public.kontakt_zugehoerigkeiten set geloescht_am = now() where person_id = '00000000-0000-0000-0000-0000000039c2';
select is((select count(*)::int from public.kontakt_zugehoerigkeiten_sicht where firma_id = '00000000-0000-0000-0000-0000000039c1'),
  1, 'Im Papierkorb nicht mehr in der Sicht');
select lives_ok($$ insert into public.kontakt_zugehoerigkeiten (person_id, firma_id) values
  ('00000000-0000-0000-0000-0000000039c2', '00000000-0000-0000-0000-0000000039c1') $$, 'Nach dem Papierkorb wieder anlegbar');

select * from finish();
rollback;
