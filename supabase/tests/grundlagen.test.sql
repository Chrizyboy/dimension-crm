-- Prüft die Grundbausteine aus Phase 1: Gesundheit, Protokoll-Trigger, Papierkorb-Logik.
-- Ausführen: npm run db:test
begin;
select plan(6);

select is((public.gesundheit() ->> 'ok')::boolean, true, 'gesundheit() meldet ok');

-- Testtabelle mit denselben Pflichtspalten wie spätere Fachtabellen.
create table public.test_ding (
  id uuid primary key default gen_random_uuid(),
  name text,
  geloescht_am timestamptz,
  geaendert_am timestamptz default now()
);
create trigger protokoll after insert or update or delete on public.test_ding
  for each row execute function intern.protokolliere();
create trigger geaendert before update on public.test_ding
  for each row execute function intern.setze_geaendert_am();

insert into public.test_ding (id, name) values ('00000000-0000-0000-0000-000000000001', 'Anlage Muri');
update public.test_ding set name = 'Anlage Bulle';
update public.test_ding set geloescht_am = now();
update public.test_ding set geloescht_am = null;

select results_eq(
  $$ select aktion from public.aenderungsprotokoll
     where tabelle = 'test_ding' order by id $$,
  array['erstellt', 'geaendert', 'papierkorb', 'wiederhergestellt'],
  'Protokoll hält jede Aktion in der richtigen Reihenfolge fest'
);
select is(
  (select vorher ->> 'name' from public.aenderungsprotokoll where tabelle = 'test_ding' and aktion = 'geaendert'),
  'Anlage Muri',
  'Vorher-Wert wird gespeichert'
);
select is(
  (select nachher ->> 'name' from public.aenderungsprotokoll where tabelle = 'test_ding' and aktion = 'geaendert'),
  'Anlage Bulle',
  'Nachher-Wert wird gespeichert'
);

-- Unangemeldete dürfen das Protokoll nicht lesen (RLS).
set local role anon;
select is((select count(*) from public.aenderungsprotokoll), 0::bigint, 'anon sieht kein Protokoll');
reset role;

select ok(
  (select relrowsecurity from pg_class where oid = 'public.aenderungsprotokoll'::regclass),
  'RLS ist auf dem Protokoll aktiv'
);

select * from finish();
rollback;
