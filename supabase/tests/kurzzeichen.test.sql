-- Prüft das Kurzzeichen je Person: Vorschlag aus dem Namen, Ausweichen bei Besetzung, eigene Eingabe wird
-- gross geschrieben, Namenswechsel ändert es nicht, doppelte und zu lange werden abgelehnt, kuerzel bleibt.
-- Ausführen: npm run db:test
begin;
select plan(8);

insert into public.personen (id, kuerzel, name) values
  ('00000000-0000-0000-0000-0000000034a1', 'kz-test-1', 'Quirin Zwahlen');
insert into public.personen (id, kuerzel, name) values
  ('00000000-0000-0000-0000-0000000034a2', 'kz-test-2', 'Quentin Zbinden');
insert into public.personen (id, kuerzel, name) values
  ('00000000-0000-0000-0000-0000000034a3', 'kz-test-3', 'Xaver');

select is((select kurzzeichen from public.personen where id = '00000000-0000-0000-0000-0000000034a1'), 'QZ',
  'Vorname + Nachname');
select is((select kurzzeichen from public.personen where id = '00000000-0000-0000-0000-0000000034a2'), 'QZB',
  'besetzt → mehr Buchstaben vom Nachnamen');
select is((select kurzzeichen from public.personen where id = '00000000-0000-0000-0000-0000000034a3'), 'XA',
  'ein Wort → zwei Buchstaben');

update public.personen set name = 'Quirin Zwahlen-Muster' where id = '00000000-0000-0000-0000-0000000034a1';
select is((select kurzzeichen from public.personen where id = '00000000-0000-0000-0000-0000000034a1'), 'QZ',
  'Namenswechsel lässt das Kurzzeichen');

update public.personen set kurzzeichen = ' xv ' where id = '00000000-0000-0000-0000-0000000034a3';
select is((select kurzzeichen from public.personen where id = '00000000-0000-0000-0000-0000000034a3'), 'XV',
  'eigene Eingabe gross und ohne Leerzeichen');
select is((select kuerzel from public.personen where id = '00000000-0000-0000-0000-0000000034a3'), 'kz-test-3',
  'technischer Schlüssel kuerzel bleibt');

select throws_ok($$update public.personen set kurzzeichen = 'QZ' where id = '00000000-0000-0000-0000-0000000034a3'$$,
  '23505', null, 'doppeltes Kurzzeichen abgelehnt');
select throws_ok($$update public.personen set kurzzeichen = 'ABCDE' where id = '00000000-0000-0000-0000-0000000034a3'$$,
  '23514', null, 'mehr als vier Zeichen abgelehnt');

select * from finish();
rollback;
