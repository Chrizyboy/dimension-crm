-- Anmelde-Mails in einer Sprache: Login-Metadaten «sprache» folgen der Person und der Wahl auf der Anmeldeseite.
-- Ausführen: npm run db:test
begin;
select plan(6);

insert into public.personen (kuerzel, name, email, rolle, sprache)
values ('t_spr', 'Test Sprache', 't-sprache@test.local', 'verkauf', 'fr');

-- Neues Login übernimmt die Sprache der Person.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000b0b0', 't-sprache@test.local');
select is((select raw_user_meta_data ->> 'sprache' from auth.users where id = '00000000-0000-0000-0000-00000000b0b0'),
  'fr', 'Neues Login bekommt die Sprache der Person');

-- Mitgegebene Sprache geht vor.
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000b0b1', 't-sprache-2@test.local', '{"sprache": "de"}');
select is((select raw_user_meta_data ->> 'sprache' from auth.users where id = '00000000-0000-0000-0000-00000000b0b1'),
  'de', 'Mitgegebene Sprache bleibt');

-- Person ändert ihre Sprache: Login zieht nach.
update public.personen set sprache = 'de' where kuerzel = 't_spr';
select is((select raw_user_meta_data ->> 'sprache' from auth.users where id = '00000000-0000-0000-0000-00000000b0b0'),
  'de', 'Änderung an der Person geht ins Login');

-- Anmeldeseite (ohne Anmeldung): Wahl FR setzt die Sprache, Unsinn wird ignoriert.
set local role anon;
select lives_ok($$select public.anmelde_sprache('T-Sprache@test.local', 'fr')$$, 'Anmeldeseite darf die Sprache setzen');
select lives_ok($$select public.anmelde_sprache('t-sprache@test.local', 'it')$$, 'Unbekannte Sprache wird still ignoriert');
reset role;
select is((select raw_user_meta_data ->> 'sprache' from auth.users where id = '00000000-0000-0000-0000-00000000b0b0'),
  'fr', 'Gewählte Sprache steht im Login, «it» hat nichts geändert');

select * from finish();
rollback;
