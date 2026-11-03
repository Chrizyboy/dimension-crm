-- Prüft den Assistenten: Gespräche sieht nur die Person selbst (auch nicht die Administration), alte Gespräche gehen
-- in den Papierkorb, Firmen-Aufträge ändert nur die Administration, eigene Aufträge nur die Person.
-- Ausführen: npm run db:test
begin;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'p39-vk@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'p39-admin@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000039b1', 't39vk', 'Verkauf Test', '00000000-0000-0000-0000-0000000039a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000039b2', 't39ad', 'Admin Test', '00000000-0000-0000-0000-0000000039a2', 'admin', '{admin}', 'de');

select ok((select count(*) from public.ki_vorlagen where person_id is null and geloescht_am is null) >= 10,
  'Firmen-Aufträge sind angelegt');
select ok((select wert -> 'funktionen' ? 'frage' from public.einstellungen where schluessel = 'ki'),
  'Stufe für Fragen ans CRM eingetragen');

-- Altes Gespräch der Verkaufsperson (100 Tage)
insert into public.ki_gespraeche (id, person_id, titel) values
  ('00000000-0000-0000-0000-0000000039c1', '00000000-0000-0000-0000-0000000039b1', 'Alt');
alter table public.ki_gespraeche disable trigger geaendert;
update public.ki_gespraeche set geaendert_am = now() - interval '100 days' where id = '00000000-0000-0000-0000-0000000039c1';
alter table public.ki_gespraeche enable trigger geaendert;
insert into public.ki_gespraeche (id, person_id, titel) values
  ('00000000-0000-0000-0000-0000000039c2', '00000000-0000-0000-0000-0000000039b1', 'Neu');
select isnt((select geloescht_am from public.ki_gespraeche where id = '00000000-0000-0000-0000-0000000039c1'), null,
  'Gespräch älter als 90 Tage liegt im Papierkorb');

-- Verkauf sieht das eigene Gespräch und legt einen eigenen Auftrag an, aber keinen Firmen-Auftrag
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a1', true);
select is((select count(*)::int from public.ki_gespraeche where id = '00000000-0000-0000-0000-0000000039c2'), 1,
  'Person sieht ihr Gespräch');
select lives_ok($$ insert into public.ki_vorlagen (person_id, art, titel_de, titel_fr, auftrag)
                   values ('00000000-0000-0000-0000-0000000039b1', 'frage', 'Meins', 'Le mien', 'Frage') $$,
  'eigener Auftrag');
select throws_ok($$ insert into public.ki_vorlagen (art, titel_de, titel_fr, auftrag)
                    values ('frage', 'Firma', 'Firme', 'Frage') $$, '42501', null,
  'Verkauf legt keinen Firmen-Auftrag an');
reset role;

-- Die Administration sieht fremde Gespräche und eigene Aufträge anderer nicht
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a2', true);
select is((select count(*)::int from public.ki_gespraeche where person_id = '00000000-0000-0000-0000-0000000039b1'), 0,
  'Administration sieht fremde Gespräche nicht');
select is((select count(*)::int from public.ki_vorlagen where person_id = '00000000-0000-0000-0000-0000000039b1'), 0,
  'eigene Aufträge anderer bleiben privat');
reset role;

select * from finish();
rollback;
