-- Prüft den Werkvertrag nach der Vorlage Muri (Entscheid 0030): Zahlungsbedingungen 70/30, 100 % und eigene
-- Anzahlung in CHF (ganze Franken, letzte Rate = Rest), Angaben im Vertrag, neue Version nach Versand,
-- Anzahlungsrechnung aus dem Vertrag (nur mit Recht «finanzen», keine doppelte) und Einstellung nur Administration.
-- Ausführen: npm run db:test
begin;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000030a1', 'wv-admin@test.local'),
  ('00000000-0000-0000-0000-0000000030a2', 'wv-verkauf@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000030b1', 'wv_admin', 'Ada Admin', '00000000-0000-0000-0000-0000000030a1', 'admin', '{}'),
  ('00000000-0000-0000-0000-0000000030b2', 'wv_verkauf', 'Vito Verkauf', '00000000-0000-0000-0000-0000000030a2', 'verkauf', '{}');

-- Zahlungsplan ohne Datenbank-Zugriff auf Projekte: reine Rechnung
select results_eq($$ select betrag_rappen from public.zahlungsplan_vorschlag(1000001, '{"kondition": "70_30"}', 'fr', '2026-10-31') $$,
  array[700000::bigint, 300001::bigint], '70/30: Anzahlung auf ganze Franken, Saldo nimmt den Rest');
select results_eq($$ select bezeichnung from public.zahlungsplan_vorschlag(1000001, '{"kondition": "70_30"}', 'fr', '2026-10-31') $$,
  array['70 % matériel, à la signature du contrat', '30 % après la mise en service'], 'Texte in der Vertragssprache');
select results_eq($$ select betrag_rappen from public.zahlungsplan_vorschlag(629683, '{"kondition": "anzahlung", "anzahlung_rappen": 400000}', 'de', '2026-10-31') $$,
  array[400000::bigint, 229683::bigint], 'Eigene Anzahlung CHF 4''000, Rest nach Inbetriebnahme');
select results_eq($$ select betrag_rappen from public.zahlungsplan_vorschlag(500000, '{"kondition": "anzahlung", "anzahlung_rappen": 600000}', 'de', '2026-10-31') $$,
  array[500000::bigint], 'Anzahlung ab Vertragswert ergibt eine einzige Rate');
select results_eq($$ select betrag_rappen from public.zahlungsplan_vorschlag(2500000, '{"kondition": "40_30_30"}', 'de', '2026-10-31') $$,
  array[1000000::bigint, 750000::bigint, 750000::bigint], '40/30/30 für normale Anlagen');
select is((select bezeichnung from public.zahlungsplan_vorschlag(1000000, '{"kondition": "70_30"}', 'fr', '2026-10-31') where nr = 1),
  '70 % matériel, à la signature du contrat', '70/30 Batterie: Material zuerst');
select results_eq($$ select bezeichnung || ' ' || betrag_rappen from public.zahlungsplan_vorschlag(1234500,
  '{"kondition": "eigene", "raten": [{"text": "50 % Anzahlung", "prozent": 50}, {"text": "50 % Schluss", "prozent": 50}]}', 'de', '2026-10-31') $$,
  array['50 % Anzahlung 617300', '50 % Schluss 617200'], 'Eigene Raten mit Bezeichnung');
select throws_ok($$ select * from public.zahlungsplan_vorschlag(500000, '{"kondition": "eigene", "raten": [{"text": "a", "prozent": 60}, {"text": "b", "prozent": 30}]}', 'de', '2026-10-31') $$,
  'auftrag.raten_summe', 'Eigene Raten müssen 100 % ergeben');
select is((select count(*) from public.zahlungsplan_vorschlag(1195808, '{"kondition": "100"}', 'de', '2026-10-31')), 1::bigint,
  '100 % ist eine Rate');
select throws_ok($$ select * from public.zahlungsplan_vorschlag(500000, '{"kondition": "anzahlung"}', 'de', '2026-10-31') $$,
  'auftrag.anzahlung_fehlt', 'Eigene Anzahlung braucht einen Betrag');
select is((select faellig_am from public.zahlungsplan_vorschlag(1000000, '{"kondition": "70_30"}', 'de', '2026-10-31') where nr = 1),
  '2026-11-10'::date, 'Anzahlung fällig 10 Tage nach Unterzeichnung');

-- Auftrag mit eigener Anzahlung und Angaben
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000030a1", "role": "authenticated"}', true);
create temporary table t30 (o uuid, w uuid, r uuid) on commit drop;
grant all on t30 to authenticated;
insert into t30 (o) values (gen_random_uuid());
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache, email) values
  ('00000000-0000-0000-0000-0000000030c1', 'person', 'privat', 'Jules', 'Exemple', 'fr', 'jules@test.local');
insert into public.offerten (id, nummer, kontakt_id, standort_id, sprache, status, titel, batterie, betrag_rappen)
values ((select o from t30), '193001', '00000000-0000-0000-0000-0000000030c1',
        (select id from public.standorte where kuerzel = 'bulle'), 'fr', 'offeriert', 'Batterie 13,8 kWh', 'Huawei LUNA2000', 584000);
select lives_ok(format($$ select public.auftrag_erstellen(%L, '{"vertragswert_rappen": 629683, "kondition": "anzahlung",
  "anzahlung_rappen": 400000, "unterzeichnet_am": "2026-10-28",
  "angaben": {"gegenstand": "Batterie 13,8 kWh à Bulle", "beginn": "semaine du 9 novembre", "unbekannt": "x", "material": ""}}') $$,
  (select o from t30)), 'Auftrag mit eigener Anzahlung erstellen');
update t30 set w = (select id from public.werkvertraege where offerte_id = (select o from t30));
select is((select angaben ->> 'gegenstand' from public.werkvertraege where id = (select w from t30)), 'Batterie 13,8 kWh à Bulle',
  'Gegenstand gespeichert');
select ok((select not (angaben ? 'unbekannt') and not (angaben ? 'material') from public.werkvertraege where id = (select w from t30)),
  'nur bekannte, nicht leere Angaben');
select is((select v.schluessel from public.projekte p join public.ablauf_vorlagen v on v.id = p.ablauf_vorlage_id
            where p.offerte_id = (select o from t30)), 'speicher', 'Projekt bekommt den Fahrplan (Batterie = Speicher)');
select is((select angaben -> 'zahlung' from public.werkvertraege where id = (select w from t30)),
  '{"kondition": "anzahlung", "anzahlung_rappen": 400000}'::jsonb, 'Zahlungsbedingung am Vertrag');
select is((select (anzahlung ->> 'betrag_rappen')::bigint from public.werkvertraege_liste where id = (select w from t30)),
  400000::bigint, 'Liste zeigt die Anzahlung');

-- Versendet, dann geändert: neue Version, wieder «erstellt»; ohne «angaben» bleiben die Texte
select public.werkvertrag_status((select w from t30), 'versendet');
select public.auftrag_erstellen((select o from t30), '{"vertragswert_rappen": 629683, "kondition": "70_30", "unterzeichnet_am": "2026-10-28"}');
select is((select status || ' V' || version from public.werkvertraege where id = (select w from t30)), 'erstellt V2',
  'geänderter versendeter Vertrag wird neue Version');
select is((select angaben ->> 'beginn' from public.werkvertraege where id = (select w from t30)), 'semaine du 9 novembre',
  'Angaben bleiben ohne «angaben»');

-- Anzahlungsrechnung: nicht ohne «finanzen», sonst angelegt und gestellt, beim zweiten Mal dieselbe
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000030a2", "role": "authenticated"}', true);
select throws_ok(format($$ select public.werkvertrag_anzahlungsrechnung(%L) $$, (select w from t30)),
  'finanzen.kein_recht', 'Verkauf stellt keine Rechnung');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000030a1", "role": "authenticated"}', true);
update t30 set r = public.werkvertrag_anzahlungsrechnung((select w from t30));
select is((select status || ' ' || art || ' ' || total_rappen from public.rechnungen where id = (select r from t30)),
  'gestellt anzahlung 440800', 'Anzahlungsrechnung gestellt über die erste Rate (70 % in Franken)');
select is(public.werkvertrag_anzahlungsrechnung((select w from t30)), (select r from t30), 'kein zweites Mal');

-- Einstellung «werkvertrag» nur Administration
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000030a2", "role": "authenticated"}', true);
select throws_ok($$ update public.einstellungen set wert = wert || '{"unterzeichner": "X"}' where schluessel = 'werkvertrag' $$,
  '42501', null, 'Verkauf ändert die Werkvertrag-Einstellung nicht');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000030a1", "role": "authenticated"}', true);
select is((select wert ->> 'unterzeichner' from public.einstellungen where schluessel = 'werkvertrag'), 'Chris Rosenberg',
  'Unterzeichner ist Chris Rosenberg');
reset role;

select * from finish();
rollback;
