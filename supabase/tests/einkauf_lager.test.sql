-- Prüft Einkauf Schritt 2 (Entscheid 0041): Lagerplatz, Rüstliste und Ausgeben an die Baustelle, Rückgabe von der
-- Baustelle, Inventur nur mit Abweichungen und Reklamationen beim Lieferanten (nur mit Recht «preise»).
-- Ausführen: npm run db:test
begin;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000ec0a1', 'ec-lager@test.local'),
  ('00000000-0000-0000-0000-0000000ec0a2', 'ec-montage@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000ec0b1', 'ec_ek', 'Lea Lager', 'ec-lager@test.local', '00000000-0000-0000-0000-0000000ec0a1', 'projektleitung', '{preise}'),
  ('00000000-0000-0000-0000-0000000ec0b2', 'ec_mo', 'Mo Montage', 'ec-montage@test.local', '00000000-0000-0000-0000-0000000ec0a2', 'montage', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000ec0c1', 'person', 'privat', 'Paul', 'Rime', 'fr');
insert into public.artikel (id, name, kategorie, einheit) values
  ('00000000-0000-0000-0000-0000000ec001', 'Testmodul 460 W', 'module', 'Stk'),
  ('00000000-0000-0000-0000-0000000ec002', 'Testklemme', 'unterkonstruktion', 'Stk');
insert into public.projekte (id, nummer, kontakt_id, status, standort_id) values
  ('00000000-0000-0000-0000-0000000ec0e1', 'PEC-1', '00000000-0000-0000-0000-0000000ec0c1', 'auftrag',
   (select id from public.standorte where kuerzel = 'bulle'));
insert into public.projekt_material (id, projekt_id, artikel_id, bezeichnung, menge, reserviert) values
  ('00000000-0000-0000-0000-0000000ec0f1', '00000000-0000-0000-0000-0000000ec0e1', '00000000-0000-0000-0000-0000000ec001', 'Testmodul 460 W', 10, 6),
  ('00000000-0000-0000-0000-0000000ec0f2', '00000000-0000-0000-0000-0000000ec0e1', '00000000-0000-0000-0000-0000000ec002', 'Testklemme', 40, 0);
insert into public.lagerbestand (lagerort_id, artikel_id, menge, reserviert) values
  ((select id from public.lagerorte where name = 'Lager Bulle'), '00000000-0000-0000-0000-0000000ec001', 8, 6),
  ((select id from public.lagerorte where name = 'Lager Bulle'), '00000000-0000-0000-0000-0000000ec002', 100, 0);
insert into public.bestellungen (id, lieferant_id, status) values
  ('00000000-0000-0000-0000-0000000ec0d1', (select id from public.lieferanten where name = 'Tritec'), 'entwurf');

create temp table t_rek (id uuid) on commit drop;
grant all on t_rek to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000ec0a1", "role": "authenticated"}', true);

-- Lagerplatz
select lives_ok($$ select public.lagerplatz_setzen((select id from public.lagerorte where name = 'Lager Bulle'),
  '00000000-0000-0000-0000-0000000ec002', ' A-01 ') $$, 'Lagerplatz gesetzt');
select is((select lagerplatz from public.lager_uebersicht where artikel_id = '00000000-0000-0000-0000-0000000ec002'), 'A-01',
  'Lagerplatz in der Übersicht, ohne Leerzeichen');

-- Rüstliste: sortiert nach Lagerplatz, mit offen, reserviert und frei
select results_eq($$ select bezeichnung, lagerplatz, offen, reserviert, frei from public.ruestliste('00000000-0000-0000-0000-0000000ec0e1') $$,
  $$ values ('Testklemme'::text, 'A-01'::text, 40.000, 0.000, 100.000), ('Testmodul 460 W', null, 10.000, 6.000, 2.000) $$,
  'Rüstliste nach Lagerplatz');
select is(public.projekt_ruesten('00000000-0000-0000-0000-0000000ec0e1', jsonb_build_array(
  jsonb_build_object('id', '00000000-0000-0000-0000-0000000ec0f1', 'menge', 7),
  jsonb_build_object('id', '00000000-0000-0000-0000-0000000ec0f2', 'menge', 40),
  jsonb_build_object('id', '00000000-0000-0000-0000-0000000ec0f2', 'menge', 0))), 2, 'zwei Positionen ausgegeben, leere übersprungen');
select results_eq($$ select entnommen, reserviert from public.projekt_material where id = '00000000-0000-0000-0000-0000000ec0f1' $$,
  $$ values (7.000, 0.000) $$, 'Module: erst aus der Reservierung, dann aus Freiem');
select results_eq($$ select menge, reserviert from public.lagerbestand where artikel_id = '00000000-0000-0000-0000-0000000ec001' $$,
  $$ values (1.000, 0.000) $$, 'Lager Module: 8 − 7');
select is((select count(*)::int from public.lagerbewegungen where projekt_id = '00000000-0000-0000-0000-0000000ec0e1'
            and art = 'entnahme' and notiz = 'Rüstliste'), 2, 'Entnahmen mit Notiz «Rüstliste»');
select throws_ok($$ select public.projekt_ruesten('00000000-0000-0000-0000-0000000ec0e1', '[{"id": "00000000-0000-0000-0000-0000000ec0f1", "menge": 5}]') $$,
  'P0001', 'einkauf.lager_zu_wenig', 'nicht mehr ausgeben als an Lager');

-- Rückgabe von der Baustelle
select lives_ok($$ select public.lager_buchen('{"art": "rueckgabe", "projekt_material_id": "00000000-0000-0000-0000-0000000ec0f2", "menge": 12}') $$,
  'zwölf Klemmen zurück');
select results_eq($$ select (select entnommen from public.projekt_material where id = '00000000-0000-0000-0000-0000000ec0f2'),
                            (select menge from public.lagerbestand where artikel_id = '00000000-0000-0000-0000-0000000ec002') $$,
  $$ values (28.000, 72.000) $$, 'Entnahme kleiner, Lager grösser');
select throws_ok($$ select public.lager_buchen('{"art": "rueckgabe", "projekt_material_id": "00000000-0000-0000-0000-0000000ec0f2", "menge": 29}') $$,
  'P0001', 'einkauf.mehr_als_entnommen', 'nicht mehr zurück als entnommen');

-- Inventur: nur Abweichungen
select is(public.inventur_buchen((select id from public.lagerorte where name = 'Lager Bulle'), jsonb_build_array(
  jsonb_build_object('artikel_id', '00000000-0000-0000-0000-0000000ec001', 'menge', 1),
  jsonb_build_object('artikel_id', '00000000-0000-0000-0000-0000000ec002', 'menge', 70),
  jsonb_build_object('artikel_id', '00000000-0000-0000-0000-0000000ec002', 'menge', null)), 'Jahresinventur'), 1,
  'nur die Klemmen weichen ab');
select results_eq($$ select menge, art, notiz from public.lagerbewegungen
                      where artikel_id = '00000000-0000-0000-0000-0000000ec002' and notiz like 'Inventur%' $$,
  $$ values (-2.000, 'korrektur'::text, 'Inventur · Jahresinventur'::text) $$, 'Differenz als Korrektur gebucht');

-- Reklamationen
select lives_ok($$ insert into t_rek select public.reklamation_speichern('{"bestellung_id": "00000000-0000-0000-0000-0000000ec0d1",
  "grund": "defekt", "menge": 2, "beschreibung": "Glas gesprungen"}') $$, 'Reklamation erfasst');
select throws_ok($$ select public.reklamation_speichern(jsonb_build_object('id', (select id from t_rek), 'status', 'erledigt')) $$,
  'P0001', 'einkauf.loesung_fehlt', 'erledigt nur mit Lösung');
select lives_ok($$ select public.reklamation_speichern(jsonb_build_object('id', (select id from t_rek), 'status', 'erledigt',
  'loesung', 'ersatz')) $$, 'erledigt mit Ersatz');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000ec0a2", "role": "authenticated"}', true);
select throws_ok($$ select public.reklamation_speichern('{"bestellung_id": "00000000-0000-0000-0000-0000000ec0d1", "grund": "fehlt"}') $$,
  'P0001', 'einkauf.kein_recht', 'Montage ohne Recht «preise» kann nicht reklamieren');

select * from finish();
rollback;
