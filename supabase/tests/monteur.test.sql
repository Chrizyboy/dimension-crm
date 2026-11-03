-- Monteur-Version: einfache Ansicht als Eigenschaft der Rolle; Monteur ist in Montage aufgegangen (2.11.2026),
-- Montage hat die volle Ansicht (Rapport, Service, Fahrzeuge). meine_anmeldung liefert die Ansicht mit.
-- Ausführen: npm run db:test
begin;
select plan(4);

select is((select ansicht from public.rollen where schluessel = 'montage'), 'voll', 'Rolle Montage hat die volle Ansicht');
select is((select aktiv from public.rollen where schluessel = 'monteur'), false, 'Rolle Monteur ist in Montage aufgegangen');
select throws_ok($$update public.rollen set ansicht = 'bunt' where schluessel = 'montage'$$, '23514', null, 'Nur voll oder einfach');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000a0a0', 't-monteur@test.local');
insert into public.personen (kuerzel, name, email, rolle, sprache, auth_user_id)
values ('t_monteur', 'Test Monteur', 't-monteur@test.local', 'monteur', 'de', '00000000-0000-0000-0000-00000000a0a0');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a0a0", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a0a0', true);
select is(public.meine_anmeldung() ->> 'ansicht', 'einfach', 'meine_anmeldung liefert die Ansicht der Rolle');

select * from finish();
rollback;
