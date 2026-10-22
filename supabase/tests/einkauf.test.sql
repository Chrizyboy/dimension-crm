-- Prüft Phase 9a: Materialliste je Projekt, Bestellvorschlag (Lager zuerst, dann günstigster Lieferant),
-- Freigabe, Bestell-Mail nur nach Freigabe, «bestellt» beim Versand, Wareneingang mit Reservierung,
-- Lagerbuchungen, Nachbestellen unter Mindestmenge und das Recht «preise» für Bestellungen.
-- Ausführen: npm run db:test
begin;
select plan(31);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a9a1', 'p9a-pl@test.local'),
  ('00000000-0000-0000-0000-00000000a9a2', 'p9a-mo@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-00000000a9b1', 'p9a_pl', 'Paula Einkauf', '00000000-0000-0000-0000-00000000a9a1', 'projektleitung', '{}'),
  ('00000000-0000-0000-0000-00000000a9b2', 'p9a_mo', 'Max Montage', '00000000-0000-0000-0000-00000000a9a2', 'montage', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-00000000a9c1', 'person', 'privat', 'Luc', 'Exemple', 'fr');
insert into public.offerten (id, nummer, kontakt_id) values
  ('00000000-0000-0000-0000-00000000a9f1', 'T9A-1', '00000000-0000-0000-0000-00000000a9c1'),
  ('00000000-0000-0000-0000-00000000a9f2', 'T9A-2', '00000000-0000-0000-0000-00000000a9c1');
update public.offerten set anzahl_module = 20, wechselrichter = 'Testwechselrichter 10 kW'
 where id = '00000000-0000-0000-0000-00000000a9f2';
insert into public.artikel (id, name, kategorie, einheit) values
  ('00000000-0000-0000-0000-00000000a901', 'Testmodul 450 W', 'module', 'Stk'),
  ('00000000-0000-0000-0000-00000000a902', 'Testschiene ohne Preis', 'unterkonstruktion', 'Stk'),
  ('00000000-0000-0000-0000-00000000a903', 'Testwechselrichter 10 kW', 'wechselrichter', 'Stk');
insert into public.lieferantenpreise (artikel_id, lieferant_id, artikelnummer, ek_rappen) values
  ('00000000-0000-0000-0000-00000000a901', (select id from public.lieferanten where name = 'Krannich'), 'K-450', 12000),
  ('00000000-0000-0000-0000-00000000a901', (select id from public.lieferanten where name = 'Tritec'), 'T-450', 11000);
insert into public.kalkulationen (offerte_id, positionen) values ('00000000-0000-0000-0000-00000000a9f1', '[
  {"name": "Testmodul 450 W", "menge": 8, "einheit": "Stk", "artikelId": "00000000-0000-0000-0000-00000000a901", "kategorie": "module"},
  {"name": "Testschiene", "menge": 4, "einheit": "Stk", "artikelId": "00000000-0000-0000-0000-00000000a902", "kategorie": "unterkonstruktion"},
  {"name": "Montage", "menge": 10, "einheit": "Std.", "artikelId": null, "kategorie": "dienstleistungen"}]');
insert into public.projekte (id, nummer, kontakt_id, offerte_id, status, standort_id) values
  ('00000000-0000-0000-0000-00000000a9e1', 'P9A-B', '00000000-0000-0000-0000-00000000a9c1', '00000000-0000-0000-0000-00000000a9f1',
   'auftrag', (select id from public.standorte where kuerzel = 'bulle')),
  ('00000000-0000-0000-0000-00000000a9e2', 'P9A-M', '00000000-0000-0000-0000-00000000a9c1', '00000000-0000-0000-0000-00000000a9f2',
   'auftrag', (select id from public.standorte where kuerzel = 'muri'));
insert into public.lagerbestand (lagerort_id, artikel_id, menge) values
  ((select id from public.lagerorte where name = 'Lager Bulle'), '00000000-0000-0000-0000-00000000a901', 5);

-- Sequenzen kennen kein Rollback: den Stand der Bestellnummer merken und am Ende zurücksetzen.
create temp table t_seq on commit drop as select last_value, is_called from intern.bestell_nummer;
create temp table t_b (id uuid) on commit drop;
grant all on t_b to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a9a1", "role": "authenticated"}', true);

-- Materialliste
select is(public.projekt_material_vorschlagen('00000000-0000-0000-0000-00000000a9e1'), 2,
  'Materialliste aus der Kalkulation, ohne Dienstleistungen');
select throws_ok($$ select public.projekt_material_vorschlagen('00000000-0000-0000-0000-00000000a9e1') $$,
  'P0001', 'einkauf.material_schon_da', 'zweiter Vorschlag überschreibt nichts');
select is(public.projekt_material_vorschlagen('00000000-0000-0000-0000-00000000a9e2'), 2,
  'ohne Kalkulation: Module und Wechselrichter aus der Offerte');
select is((select artikel_id from public.projekt_material where projekt_id = '00000000-0000-0000-0000-00000000a9e2' and quelle = 'offerte'
            and artikel_id is not null), '00000000-0000-0000-0000-00000000a903'::uuid, 'Wechselrichter-Text findet den Artikel');

-- Bestellvorschlag: 8 Module, 5 an Lager in Bulle, 3 bestellen beim günstigeren Tritec; Schiene ohne Preis
select is(public.bestellvorschlag('00000000-0000-0000-0000-00000000a9e1') - 'bestellungen',
  '{"reserviert": 1, "ohne_lieferant": 1}'::jsonb, 'Lager reserviert, Schiene ohne Lieferant gemeldet');
insert into t_b select id from public.bestellungen where projekt_id = '00000000-0000-0000-0000-00000000a9e1';
select is((select reserviert from public.lager_uebersicht where artikel_id = '00000000-0000-0000-0000-00000000a901'), 5.000,
  'fünf Module im Lager Bulle für das Projekt reserviert');
select results_eq($$ select l.name, b.nummer ~ '^B\d{4}$', b.total_rappen, b.lagerort_id is not null
                      from public.bestellungen b join public.lieferanten l on l.id = b.lieferant_id join t_b on t_b.id = b.id $$,
  $$ values ('Tritec'::text, true, 33000::bigint, true) $$, 'Entwurf B… beim günstigsten Lieferanten, ans Lager Bulle');
select is((public.bestellvorschlag('00000000-0000-0000-0000-00000000a9e1') -> 'bestellungen'), '[]'::jsonb,
  'zweiter Vorschlag bestellt nichts doppelt');
select is((select fehlt from public.projekt_material_stand where artikel_id = '00000000-0000-0000-0000-00000000a901'
            and projekt_id = '00000000-0000-0000-0000-00000000a9e1'), 0.000, 'Module sind gedeckt (Lager + Entwurf)');

-- Freigabe und Bestell-Mail
select throws_ok($$ select public.ausgang_anlegen(jsonb_build_object('an', 'bestellung@lieferant.test', 'betreff', 'Bestellung',
  'text', 'x', 'bezug_tabelle', 'bestellungen', 'bezug_id', (select id from t_b), 'freigeben', true)) $$,
  'P0001', 'einkauf.nicht_freigegeben', 'keine Bestell-Mail vor der Freigabe');
select lives_ok($$ select public.bestellung_freigeben((select id from t_b)) $$, 'Bestellung freigegeben');
select throws_ok($$ update public.bestellpositionen set menge = 9 where bestellung_id = (select id from t_b) $$,
  'P0001', 'einkauf.nicht_entwurf', 'nach der Freigabe sind die Positionen fest');
select lives_ok($$ select public.ausgang_anlegen(jsonb_build_object('an', 'bestellung@lieferant.test', 'betreff', 'Bestellung',
  'text', 'x', 'bezug_tabelle', 'bestellungen', 'bezug_id', (select id from t_b), 'schluessel', 'bestellung:' || (select id from t_b),
  'freigeben', true)) $$, 'Bestell-Mail im Ausgangskorb');
select throws_ok($$ select public.bestellung_zuruecknehmen((select id from t_b)) $$,
  'P0001', 'einkauf.mail_unterwegs', 'Freigabe zurücknehmen geht nicht mehr, wenn die Mail unterwegs ist');
reset role;
update public.ausgangskorb set status = 'gesendet', gesendet_am = now() where bezug_id = (select id from t_b);
set local role authenticated;
select is((select status from public.bestellungen where id = (select id from t_b)), 'bestellt', 'gesendete Mail: Bestellung ist bestellt');
select is((select material_status from public.projekte where id = '00000000-0000-0000-0000-00000000a9e1'), 'bestellt',
  'Fahrplan-Schritt Material: bestellt');

-- Wareneingang: zuerst 2, dann 1; die Ware wird im Lager für das Projekt reserviert
select is(public.wareneingang_buchen((select id from t_b), jsonb_build_object('positionen',
  (select jsonb_agg(jsonb_build_object('id', id, 'menge', 2)) from public.bestellpositionen where bestellung_id = (select id from t_b)))),
  'teilgeliefert', 'Teillieferung');
select is(public.wareneingang_buchen((select id from t_b), jsonb_build_object('positionen',
  (select jsonb_agg(jsonb_build_object('id', id, 'menge', 1)) from public.bestellpositionen where bestellung_id = (select id from t_b)))),
  'geliefert', 'Rest geliefert');
select results_eq($$ select menge, reserviert from public.lager_uebersicht where artikel_id = '00000000-0000-0000-0000-00000000a901' $$,
  $$ values (8.000, 8.000) $$, 'Lager: 8 da, alle 8 für das Projekt reserviert');
select throws_ok($$ select public.bestellung_stornieren((select id from t_b), 'zu spät') $$,
  'P0001', 'einkauf.nicht_stornierbar', 'gelieferte Bestellung lässt sich nicht stornieren');

-- Lagerbuchungen
select lives_ok($$ select public.lager_buchen(jsonb_build_object('art', 'eingang', 'artikel_id', '00000000-0000-0000-0000-00000000a902', 'menge', 4)) $$,
  'Eingang ohne Bestellung');
select lives_ok($$ select public.lager_buchen(jsonb_build_object('art', 'reservierung', 'menge', 4, 'projekt_material_id',
  (select id from public.projekt_material where artikel_id = '00000000-0000-0000-0000-00000000a902'))) $$, 'Schiene reserviert');
select is((select material_status from public.projekte where id = '00000000-0000-0000-0000-00000000a9e1'), 'lager',
  'alles da: Fahrplan-Schritt Material ist erledigt');
select throws_ok($$ select public.lager_buchen(jsonb_build_object('art', 'reservierung', 'menge', 1, 'projekt_material_id',
  (select id from public.projekt_material where artikel_id = '00000000-0000-0000-0000-00000000a902'))) $$,
  'P0001', 'einkauf.lager_zu_wenig', 'mehr reservieren als frei ist geht nicht');
select throws_ok($$ select public.lager_buchen(jsonb_build_object('art', 'inventur', 'artikel_id', '00000000-0000-0000-0000-00000000a901', 'menge', 6)) $$,
  'P0001', 'einkauf.unter_reserviert', 'Inventur unter die Reservierungen wird abgelehnt');
select lives_ok($$ select public.lager_buchen(jsonb_build_object('art', 'entnahme', 'menge', 8, 'projekt_material_id',
  (select id from public.projekt_material where artikel_id = '00000000-0000-0000-0000-00000000a901'
     and projekt_id = '00000000-0000-0000-0000-00000000a9e1'))) $$, 'Module an die Baustelle');
select results_eq($$ select l.menge, l.reserviert, m.entnommen, m.reserviert from public.lager_uebersicht l, public.projekt_material m
                      where l.artikel_id = '00000000-0000-0000-0000-00000000a901' and m.id = (select id from public.projekt_material
                        where artikel_id = '00000000-0000-0000-0000-00000000a901' and projekt_id = '00000000-0000-0000-0000-00000000a9e1') $$,
  $$ values (0.000, 0.000, 8.000, 0.000) $$, 'Entnahme bucht aus der Reservierung des Projekts');

-- Muri hat kein Lager: Lieferung direkt auf die Baustelle. Nachbestellen unter Mindestmenge.
select is(intern.projekt_lagerort('00000000-0000-0000-0000-00000000a9e2'), null, 'Projekt in Muri: kein Lager, direkt auf die Baustelle');
update public.lagerbestand set mindestmenge = 10 where artikel_id = '00000000-0000-0000-0000-00000000a901';
select public.lager_nachbestellen((select id from public.lagerorte where name = 'Lager Bulle'));
select is((select sum(p.menge) from public.bestellpositionen p join public.bestellungen b on b.id = p.bestellung_id
            where b.status = 'entwurf' and b.projekt_id is null and p.artikel_id = '00000000-0000-0000-0000-00000000a901'), 10.000,
  'unter Mindestmenge: Entwurf ans Lager über die fehlende Menge');

-- Recht «preise»: Montage sieht keine Bestellungen (Einkaufspreise) und kann keinen Vorschlag machen
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a9a2", "role": "authenticated"}', true);
select is((select count(*) from public.bestellungen), 0::bigint, 'ohne Recht «preise» keine Bestellungen sichtbar');
select throws_ok($$ select public.bestellvorschlag('00000000-0000-0000-0000-00000000a9e1') $$,
  'P0001', 'einkauf.kein_recht', 'ohne Recht «preise» kein Bestellvorschlag');
reset role;
select setval('intern.bestell_nummer', last_value, is_called) from t_seq;

select * from finish();
rollback;
