-- Prüft den Merker der Rechte in intern.hat_recht (Tempo, Migration tempo_listen): gleiche Antworten wie ohne
-- Merker, eigener Merker je Person und nie alte Rechte nach einer Änderung an Person oder Rolle.
-- Ausführen: npm run db:test
begin;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000077a1', 'merker-verkauf@test.local'),
  ('00000000-0000-0000-0000-0000000077a2', 'merker-buchhaltung@test.local');
insert into public.personen (id, kuerzel, name, email, rolle, auth_user_id) values
  ('00000000-0000-0000-0000-0000000077b1', 'mk_verkauf', 'Merker Verkauf', 'merker-verkauf@test.local', 'verkauf',
   '00000000-0000-0000-0000-0000000077a1'),
  ('00000000-0000-0000-0000-0000000077b2', 'mk_buch', 'Merker Buchhaltung', 'merker-buchhaltung@test.local', 'buchhaltung',
   '00000000-0000-0000-0000-0000000077a2');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000077a1", "role": "authenticated"}', true);
select ok(intern.hat_recht('basis') and not intern.hat_recht('finanzen'), 'Verkauf: basis ja, finanzen nein');
select ok(not intern.hat_recht('finanzen'), 'zweiter Aufruf aus dem Merker gibt dasselbe');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000077a2", "role": "authenticated"}', true);
select ok(intern.hat_recht('finanzen'), 'andere Person bekommt ihre eigenen Rechte, nicht den Merker der vorigen');

reset role;
update public.personen set rolle = 'buchhaltung' where id = '00000000-0000-0000-0000-0000000077b1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000077a1", "role": "authenticated"}', true);
select ok(intern.hat_recht('finanzen'), 'nach Rollenwechsel gilt sofort die neue Rolle');

reset role;
update public.personen set rechte = rechte || array['gl'] where id = '00000000-0000-0000-0000-0000000077b1';
set local role authenticated;
select ok(intern.hat_recht('preise'), 'Zusatz «gl» wirkt sofort');

reset role;
update public.personen set aktiv = false where id = '00000000-0000-0000-0000-0000000077b1';
set local role authenticated;
select ok(not intern.hat_recht('basis'), 'deaktivierte Person verliert sofort alle Rechte');

select * from finish();
rollback;
