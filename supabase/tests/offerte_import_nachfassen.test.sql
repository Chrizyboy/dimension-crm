-- Prüft: Setzt der Import (V233) eine übernommene Offerte auf «offeriert», beginnt kein Nachfass-Plan und keine
-- Gültigkeit. Senden durch den Zeitplan oder eine Person ohne Import beginnt ihn wie bisher.
-- Ausführen: npm run db:test
begin;
select plan(5);

insert into public.kontakte (id, art, kontaktart, vorname, nachname) values
  ('00000000-0000-0000-0000-0000000042c1', 'person', 'privat', 'Iris', 'Import42');
insert into public.offerten (id, nummer, kontakt_id, sprache, status, angebot_am, alt_id, alt_daten) values
  ('00000000-0000-0000-0000-0000000042d1', 'T42-1', '00000000-0000-0000-0000-0000000042c1', 'de', 'angenommen',
   '2025-03-01', 'project:T42-1', '{"statusKey": "closed"}'),
  ('00000000-0000-0000-0000-0000000042d2', 'T42-2', '00000000-0000-0000-0000-0000000042c1', 'de', 'bearbeitung',
   '2025-03-01', 'project:T42-2', '{"statusKey": "edit"}');

-- Wie der Import: ohne Person, alt_daten neu (gewonnen ohne Ordner → zurück auf offeriert).
update public.offerten set status = 'offeriert', alt_daten = '{"statusKey": "sent", "_statusVorlage": "closed"}'
 where id = '00000000-0000-0000-0000-0000000042d1';
select is((select nachfassen_am from public.offerten where id = '00000000-0000-0000-0000-0000000042d1'), null::date,
  'Import: kein Nachfassen am');
select is((select nachfass_ergebnis from public.offerten where id = '00000000-0000-0000-0000-0000000042d1'), null::text,
  'Import: kein Nachfass-Plan');
select is((select gueltig_bis from public.offerten where id = '00000000-0000-0000-0000-0000000042d1'), null::date,
  'Import: keine neue Gültigkeit');

-- Senden ohne Import (alt_daten bleibt): Plan beginnt wie bisher, auch bei übernommenen Offerten.
update public.offerten set status = 'offeriert' where id = '00000000-0000-0000-0000-0000000042d2';
select is((select nachfass_ergebnis from public.offerten where id = '00000000-0000-0000-0000-0000000042d2'), 'gesendet',
  'Senden: Nachfass-Plan beginnt');
select isnt((select nachfassen_am from public.offerten where id = '00000000-0000-0000-0000-0000000042d2'), null::date,
  'Senden: Nachfassen am gesetzt');

select * from finish();
rollback;
