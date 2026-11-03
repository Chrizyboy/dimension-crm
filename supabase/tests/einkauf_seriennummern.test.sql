-- Prüft Seriennummern beim Wareneingang (Modul-Prüfung 24A): an Position und Materialzeile, als Komponente
-- an die Anlage (neue und bestehende), ersetzen statt doppeln, Recht wie Bestellung.
-- Ausführen: npm run db:test
begin;
select plan(6);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000034a1', 'p34-mo@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000034b1', 'p34_mo', 'Mia Montage', '00000000-0000-0000-0000-0000000034a1', 'montage', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname) values
  ('00000000-0000-0000-0000-0000000034c1', 'person', 'privat', 'Eva', 'Beispiel');
insert into public.objekte (id, kontakt_id, ort) values ('00000000-0000-0000-0000-0000000034d1', '00000000-0000-0000-0000-0000000034c1', 'Bulle');
insert into public.artikel (id, name, kategorie, hersteller_gruppe, einheit) values
  ('00000000-0000-0000-0000-000000003401', 'Testwechselrichter 8 kW', 'wechselrichter', 'Testhersteller', 'Stk');
insert into public.projekte (id, nummer, kontakt_id, objekt_id, status) values
  ('00000000-0000-0000-0000-0000000034e1', 'P934', '00000000-0000-0000-0000-0000000034c1', '00000000-0000-0000-0000-0000000034d1', 'auftrag');
insert into public.projekt_material (id, projekt_id, artikel_id, bezeichnung, menge, einheit) values
  ('00000000-0000-0000-0000-0000000034f1', '00000000-0000-0000-0000-0000000034e1', '00000000-0000-0000-0000-000000003401',
   'Testwechselrichter 8 kW', 2, 'Stk');
insert into public.lieferanten (id, name) values ('00000000-0000-0000-0000-0000000034a9', 'Test Lieferant 34');
insert into public.bestellungen (id, nummer, lieferant_id, projekt_id, status) values
  ('00000000-0000-0000-0000-0000000034b9', 'B934', '00000000-0000-0000-0000-0000000034a9', '00000000-0000-0000-0000-0000000034e1', 'entwurf');
insert into public.bestellpositionen (id, bestellung_id, artikel_id, bezeichnung, menge, projekt_material_id) values
  ('00000000-0000-0000-0000-0000000034c9', '00000000-0000-0000-0000-0000000034b9', '00000000-0000-0000-0000-000000003401',
   'Testwechselrichter 8 kW', 2, '00000000-0000-0000-0000-0000000034f1');
update public.bestellungen set status = 'bestellt' where id = '00000000-0000-0000-0000-0000000034b9';

select is(public.seriennummern_erfassen('00000000-0000-0000-0000-0000000034b9',
  '[{"id": "00000000-0000-0000-0000-0000000034c9", "seriennummern": ["SN-2", " SN-1 ", ""]}]'), 1, 'eine Position erfasst');
select is((select seriennummern from public.projekt_material where id = '00000000-0000-0000-0000-0000000034f1'),
  array['SN-1', 'SN-2'], 'Materialzeile kennt die Seriennummern (bereinigt, sortiert)');

-- IBN: Anlage entsteht und bekommt die Komponente
insert into public.anlagen (id, projekt_id, objekt_id, komponenten) values
  ('00000000-0000-0000-0000-0000000034aa', '00000000-0000-0000-0000-0000000034e1', '00000000-0000-0000-0000-0000000034d1',
   '[{"art": "pv", "anzahl": 20}]');
select is((select k ->> 'seriennummer' from public.anlagen a, jsonb_array_elements(a.komponenten) k
            where a.id = '00000000-0000-0000-0000-0000000034aa' and k ->> 'quelle' = 'wareneingang'), 'SN-1, SN-2',
  'neue Anlage hat die Seriennummern als Komponente');
select is((select jsonb_array_length(komponenten) from public.anlagen where id = '00000000-0000-0000-0000-0000000034aa'), 2,
  'Komponenten aus der Offerte bleiben');

-- Korrektur bei bestehender Anlage: ersetzt, nicht doppelt
select public.seriennummern_erfassen('00000000-0000-0000-0000-0000000034b9',
  '[{"id": "00000000-0000-0000-0000-0000000034c9", "seriennummern": ["SN-1", "SN-3"]}]');
select is((select k ->> 'seriennummer' from public.anlagen a, jsonb_array_elements(a.komponenten) k
            where a.id = '00000000-0000-0000-0000-0000000034aa' and k ->> 'quelle' = 'wareneingang'), 'SN-1, SN-3',
  'Korrektur ersetzt die Komponente aus dem Wareneingang');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000034a1", "role": "authenticated"}', true);
select throws_ok($$ select public.seriennummern_erfassen('00000000-0000-0000-0000-0000000034b9',
  '[{"id": "00000000-0000-0000-0000-0000000034c9", "seriennummern": ["X"]}]') $$, 'P0001', 'einkauf.position_fehlt',
  'ohne Recht Preise keine Bestellung sichtbar');

select * from finish();
rollback;
