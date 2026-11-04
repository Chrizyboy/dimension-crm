-- Prüft den Schutz für den Import am Stichtag: von einer Person geänderte Zeilen werden erkannt, Änderungen ohne
-- Person (Import, Zeitplan) nicht; nur der Import (service_role) darf fragen; unbekannte Tabellen werden abgelehnt.
-- Ausführen: npm run db:test
begin;
select plan(5);

insert into public.kontakte (id, art, kontaktart, vorname, nachname, alt_id) values
  ('00000000-0000-0000-0000-0000000041c1', 'person', 'privat', 'Anna', 'Import', 'test:kunde:1'),
  ('00000000-0000-0000-0000-0000000041c2', 'person', 'privat', 'Beat', 'Import', 'test:kunde:2');

-- Änderung ohne Person (wie der Import): zählt nicht.
update public.kontakte set vorname = 'Anna B.' where alt_id = 'test:kunde:1';
-- Änderung durch eine Person: zählt.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000041a1"}', true);
update public.kontakte set vorname = 'Beat C.' where alt_id = 'test:kunde:2';
select set_config('request.jwt.claims', '', true);

select is((select array_agg(alt_id) from public.import_von_hand_geaendert('kontakte', array['test:kunde:1', 'test:kunde:2'])),
          array['test:kunde:2'], 'nur die von einer Person geänderte Zeile');
select is((select count(*)::int from public.import_von_hand_geaendert('kontakte', array['test:kunde:9'])), 0,
          'unbekannte alt_id: nichts');
select throws_ok($$select * from public.import_von_hand_geaendert('kontakte; drop table x', array['a'])$$,
                 'import_tabelle_unbekannt', 'Tabellenname wird geprüft');
select ok(not has_function_privilege('authenticated', 'public.import_von_hand_geaendert(text, text[])', 'execute'),
          'angemeldete Personen dürfen nicht fragen');
select ok(has_function_privilege('service_role', 'public.import_von_hand_geaendert(text, text[])', 'execute'),
          'der Import darf fragen');

select * from finish();
rollback;
