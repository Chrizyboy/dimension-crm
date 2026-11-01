-- Prüft die Zuständigkeiten: Lead nach Sprache zu Filipe oder Loris, Regel mit Produkt geht vor, Stellvertretung
-- bei Abwesenheit, Person von Hand bleibt, Import bleibt, Offerte zu Andy, Regeln nur Administration.
-- Ausführen: npm run db:test
begin;
select plan(9);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000031a1', 'p31-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000031b1', 'filipe', 'Filipe Test', null, 'verkauf', '{}', 'fr'),
  ('00000000-0000-0000-0000-0000000031b2', 'loris', 'Loris Test', '00000000-0000-0000-0000-0000000031a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000031b3', 'andreas', 'Andy Test', null, 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000031b4', 'chris', 'Chris Test', null, 'admin', '{}', 'de')
on conflict (kuerzel) do update set aktiv = true;
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000031c1', 'person', 'privat', 'Léa', 'Exemple', 'fr'),
  ('00000000-0000-0000-0000-0000000031c2', 'person', 'privat', 'Max', 'Beispiel', 'de');

create temp table ids as select * from (values
  ('fr', public.lead_anlegen('{"kontakt": {"vorname": "Zoé", "nachname": "Essai", "sprache": "fr"}, "objekt": {"plz": "1630"}, "lead": {"quelle": "website"}}'::jsonb)),
  ('de', public.lead_anlegen('{"kontakt": {"vorname": "Urs", "nachname": "Probe", "sprache": "de"}, "objekt": {"plz": "5630"}, "lead": {"quelle": "website"}}'::jsonb))
) t(sprache, id);

select is((select k.kuerzel from public.verkaufschancen v join public.personen k on k.id = v.tour_person_id
            where v.id = (select id from ids where sprache = 'fr')), 'filipe', 'französisch → Filipe');
select is((select k.kuerzel from public.verkaufschancen v join public.personen k on k.id = v.tour_person_id
            where v.id = (select id from ids where sprache = 'de')), 'loris', 'deutsch → Loris');

-- Regel mit Produkt vor der Sprache
update public.einstellungen
   set wert = jsonb_set(wert, '{verkauf}', '[{"produkt": "waermepumpe", "person": "andreas"}]'::jsonb || (wert -> 'verkauf'))
 where schluessel = 'zustaendigkeiten';
insert into public.verkaufschancen (id, kontakt_id, interesse) values
  ('00000000-0000-0000-0000-0000000031d1', '00000000-0000-0000-0000-0000000031c2', '{waermepumpe}');
select is((select tour_person_id from public.verkaufschancen where id = '00000000-0000-0000-0000-0000000031d1'),
  '00000000-0000-0000-0000-0000000031b3'::uuid, 'Wärmepumpe → Andy (Regel mit Produkt zuerst)');

-- Stellvertretung
insert into public.abwesenheiten (person_id, art, von, bis) values
  ('00000000-0000-0000-0000-0000000031b1', 'ferien', current_date - 1, current_date + 7);
insert into public.verkaufschancen (id, kontakt_id) values
  ('00000000-0000-0000-0000-0000000031d2', '00000000-0000-0000-0000-0000000031c1');
select is((select tour_person_id from public.verkaufschancen where id = '00000000-0000-0000-0000-0000000031d2'),
  '00000000-0000-0000-0000-0000000031b2'::uuid, 'Filipe in den Ferien → Loris');

-- Von Hand gesetzt bleibt
insert into public.verkaufschancen (id, kontakt_id, tour_person_id) values
  ('00000000-0000-0000-0000-0000000031d3', '00000000-0000-0000-0000-0000000031c1', '00000000-0000-0000-0000-0000000031b4');
select is((select tour_person_id from public.verkaufschancen where id = '00000000-0000-0000-0000-0000000031d3'),
  '00000000-0000-0000-0000-0000000031b4'::uuid, 'Person von Hand bleibt');

-- Import der Vorlage (alt_id) bleibt ohne Zuteilung
insert into public.verkaufschancen (id, kontakt_id, alt_id) values
  ('00000000-0000-0000-0000-0000000031d4', '00000000-0000-0000-0000-0000000031c1', 'test31-import');
select is((select tour_person_id from public.verkaufschancen where id = '00000000-0000-0000-0000-0000000031d4'), null,
  'Import behält seine Zuteilung');

-- Offerte → Andy
select is(intern.offerte_verantwortlich(null, '00000000-0000-0000-0000-0000000031b1', false),
  '00000000-0000-0000-0000-0000000031b3'::uuid, 'Offerten → Andy');
insert into public.abwesenheiten (person_id, art, von, bis) values
  ('00000000-0000-0000-0000-0000000031b3', 'krank', current_date, current_date);
select is(intern.offerte_verantwortlich(null, null, false), '00000000-0000-0000-0000-0000000031b4'::uuid,
  'Andy krank → Chris');

-- Rechte
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000031a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000031a1', true);
select throws_ok($$ update public.einstellungen set wert = wert where schluessel = 'zustaendigkeiten' $$, '42501', null,
  'Verkauf ändert die Zuständigkeiten nicht');
reset role;

select * from finish();
rollback;
