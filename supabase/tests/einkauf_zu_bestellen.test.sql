-- Prüft «Zu bestellen» und Sammelbestellung (Modul-Prüfung 24A): Material entsteht beim Auftrag, Liste mit
-- «bestellen bis», Zusammenfassen der Entwürfe eines Lieferanten ans Lager, Material-Stand der Projekte.
-- Ausführen: npm run db:test
begin;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000035a1', 'p35-pl@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000035b1', 'p35_pl', 'Pia Planung', '00000000-0000-0000-0000-0000000035a1', 'projektleitung', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname) values
  ('00000000-0000-0000-0000-0000000035c1', 'person', 'privat', 'Tom', 'Beispiel');
insert into public.artikel (id, name, kategorie, einheit) values
  ('00000000-0000-0000-0000-000000003501', 'Testmodul 430 W', 'module', 'Stk');
insert into public.lieferantenpreise (artikel_id, lieferant_id, artikelnummer, ek_rappen) values
  ('00000000-0000-0000-0000-000000003501', (select id from public.lieferanten where name = 'Tritec'), 'T-430', 10000);
insert into public.offerten (id, nummer, kontakt_id) values
  ('00000000-0000-0000-0000-0000000035f1', 'T35-1', '00000000-0000-0000-0000-0000000035c1'),
  ('00000000-0000-0000-0000-0000000035f2', 'T35-2', '00000000-0000-0000-0000-0000000035c1');
insert into public.kalkulationen (offerte_id, positionen)
select o, '[{"name": "Testmodul 430 W", "menge": 10, "einheit": "Stk", "artikelId": "00000000-0000-0000-0000-000000003501", "kategorie": "module"}]'
  from unnest(array['00000000-0000-0000-0000-0000000035f1', '00000000-0000-0000-0000-0000000035f2']::uuid[]) o;
insert into public.projekte (id, nummer, kontakt_id, offerte_id, status, standort_id, baubeginn) values
  ('00000000-0000-0000-0000-0000000035e1', 'P935-1', '00000000-0000-0000-0000-0000000035c1', '00000000-0000-0000-0000-0000000035f1',
   'auftrag', (select id from public.standorte where kuerzel = 'bulle'), current_date + 30),
  ('00000000-0000-0000-0000-0000000035e2', 'P935-2', '00000000-0000-0000-0000-0000000035c1', '00000000-0000-0000-0000-0000000035f2',
   'auftrag', (select id from public.standorte where kuerzel = 'bulle'), current_date + 20);

select is((select count(*)::int from public.projekt_material where projekt_id in
  ('00000000-0000-0000-0000-0000000035e1', '00000000-0000-0000-0000-0000000035e2')), 2, 'Auftrag legt die Materialliste an');

create temp table t_seq on commit drop as select last_value, is_called from intern.bestell_nummer;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000035a1", "role": "authenticated"}', true);

select is((select bestellen_bis from public.zu_bestellen() where nummer = 'P935-2'), current_date + 6,
  'bestellen bis = Baubeginn minus 14 Tage Lieferfrist');
select is((select nummer from public.zu_bestellen() where nummer like 'P935-%' limit 1), 'P935-2', 'früheste zuerst');

select public.bestellvorschlag('00000000-0000-0000-0000-0000000035e1');
select public.bestellvorschlag('00000000-0000-0000-0000-0000000035e2');
select is((select count(*)::int from public.bestellungen where status = 'entwurf' and geloescht_am is null
             and projekt_id in ('00000000-0000-0000-0000-0000000035e1', '00000000-0000-0000-0000-0000000035e2')), 2,
  'pro Projekt ein Entwurf');
select isnt(public.bestellungen_zusammenfassen((select id from public.lieferanten where name = 'Tritec'),
  (select id from public.lagerorte where name = 'Lager Bulle')), null, 'zusammengefasst');
select is((select count(*)::int from public.bestellungen b join public.bestellpositionen p on p.bestellung_id = b.id
            join public.projekt_material m on m.id = p.projekt_material_id
           where b.status = 'entwurf' and b.geloescht_am is null and b.projekt_id is null
             and m.projekt_id in ('00000000-0000-0000-0000-0000000035e1', '00000000-0000-0000-0000-0000000035e2')), 2,
  'eine Sammelbestellung mit beiden Baustellen');
select is((select count(*)::int from public.zu_bestellen() where nummer like 'P935-%'), 0,
  'im Entwurf gilt als unterwegs, nichts mehr zu bestellen');

reset role;
select setval('intern.bestell_nummer', (select last_value from t_seq), (select is_called from t_seq));
select * from finish();
rollback;
