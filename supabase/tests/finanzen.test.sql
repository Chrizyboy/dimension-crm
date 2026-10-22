-- Prüft Phase 10: Rechnungen nur mit Recht «finanzen», Entwurf aus Tranche, Schluss mit Nachträgen, Service-Rapport,
-- Stellen mit Nummer und Fälligkeit, gestellte Rechnung fest, Zahlungen bis «bezahlt» (auch im Zahlungsplan),
-- Mahnen bis Stufe 3, Stornieren, Abgleich mit AbaNinja (Zahlung und Lieferantenrechnung mit Projekt),
-- Nachkalkulation, Spesen (eigene sehen, Storno, ausbezahlt nur Buchhaltung).
-- Ausführen: npm run db:test
begin;
select plan(37);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000010a1', 'p10-bh@test.local'),
  ('00000000-0000-0000-0000-0000000010a2', 'p10-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000010b1', 'p10_bh', 'Bea Buchhaltung', '00000000-0000-0000-0000-0000000010a1', 'buchhaltung', '{}'),
  ('00000000-0000-0000-0000-0000000010b2', 'p10_vk', 'Vera Verkauf', '00000000-0000-0000-0000-0000000010a2', 'verkauf', '{}');
-- Sequenzen kennen kein Rollback: Stand merken und am Ende zurücksetzen.
create temp table t_seq on commit drop as
  select (select last_value from intern.rapport_nummer) as r, (select is_called from intern.rapport_nummer) as ri,
         (select last_value from intern.nachtrag_nummer) as n, (select is_called from intern.nachtrag_nummer) as ni;

-- Nachträge mit Preis legt nur an, wer «preise» hat: Testdaten als Buchhaltung anlegen.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000010a1", "role": "authenticated"}', true);
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000010c1', 'person', 'privat', 'Luc', 'Exemple', 'fr');
insert into public.projekte (id, nummer, kontakt_id, status, bau_status, standort_id, vertragswert_rappen, werktage) values
  ('00000000-0000-0000-0000-0000000010e1', '910001', '00000000-0000-0000-0000-0000000010c1', 'im_bau', 'terminiert',
   (select id from public.standorte where kuerzel = 'bulle'), 3000000, 2);
insert into public.zahlungsplan (id, projekt_id, bezeichnung, betrag_rappen, faellig_am) values
  ('00000000-0000-0000-0000-0000000010f1', '00000000-0000-0000-0000-0000000010e1', 'Acompte 30 %', 900000, current_date),
  ('00000000-0000-0000-0000-0000000010f2', '00000000-0000-0000-0000-0000000010e1', 'Montage 60 %', 1800000, null),
  ('00000000-0000-0000-0000-0000000010f3', '00000000-0000-0000-0000-0000000010e1', 'Solde 10 %', 300000, null);
insert into public.nachtraege (id, projekt_id, beschreibung, betrag_rappen, status) values
  ('00000000-0000-0000-0000-000000001091', '00000000-0000-0000-0000-0000000010e1', 'Zusätzlicher Überspannungsschutz', 50000, 'vom_kunden_bestaetigt'),
  ('00000000-0000-0000-0000-000000001092', '00000000-0000-0000-0000-0000000010e1', 'Nicht bestätigt', 10000, 'offen');
insert into public.rapporte (id, art, datum, projekt_id, verrechnung, material) values
  ('00000000-0000-0000-0000-000000001081', 'service', current_date, '00000000-0000-0000-0000-0000000010e1', 'kostenpflichtig',
   '[{"bezeichnung": "Sicherung 16 A", "menge": 2, "einheit": "Stk"}]'),
  ('00000000-0000-0000-0000-000000001082', 'service', current_date, '00000000-0000-0000-0000-0000000010e1', 'garantie', '[]');
insert into public.zeiten (person_id, rapport_id, projekt_id, start, stopp, pause_min) values
  ('00000000-0000-0000-0000-0000000010b1', '00000000-0000-0000-0000-000000001081', '00000000-0000-0000-0000-0000000010e1',
   now() - interval '2 hours', now() - interval '30 minutes', 0);
insert into public.spesen (id, person_id, datum, betrag_rappen, kategorie, zweck, status) values
  ('00000000-0000-0000-0000-000000001071', '00000000-0000-0000-0000-0000000010b2', current_date, 2450, 'Verpflegung', 'Kundenbesuch', 'eingereicht'),
  ('00000000-0000-0000-0000-000000001072', '00000000-0000-0000-0000-0000000010b2', current_date, 1200, 'Parkieren', 'Messe', 'eingereicht'),
  ('00000000-0000-0000-0000-000000001073', '00000000-0000-0000-0000-0000000010b1', current_date, 900, 'Parkieren', 'Bank', 'eingereicht');

set local role authenticated;

-- Verkauf: keine Rechnungen, nur eigene Spesen
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000010a2", "role": "authenticated"}', true);
select throws_ok($$ select public.rechnung_entwurf('{"zahlungsplan_id": "00000000-0000-0000-0000-0000000010f1"}') $$,
  'P0001', 'finanzen.kein_recht', 'ohne Recht finanzen kein Rechnungsentwurf');
select is((select count(*)::int from public.rechnungen_liste), 0, 'ohne Recht finanzen keine Rechnungen sichtbar');
select is((select count(*)::int from public.spesen where id::text like '00000000-0000-0000-0000-00000000107%'), 2,
  'Spesen: jede Person sieht nur ihre eigenen');
select throws_ok($$ select public.spesen_auszahlen('{00000000-0000-0000-0000-000000001071}') $$,
  'P0001', 'finanzen.kein_recht', 'ausbezahlt nur durch die Buchhaltung');
select throws_ok($$ select public.spesen_stornieren('00000000-0000-0000-0000-000000001072', '') $$,
  'P0001', 'finanzen.grund_fehlt', 'Storno braucht einen Grund');
select public.spesen_stornieren('00000000-0000-0000-0000-000000001072', 'doppelt erfasst');
select is((select status from public.spesen where id = '00000000-0000-0000-0000-000000001072'), 'storniert', 'eigene Spesen storniert');
select throws_ok($$ update public.spesen set betrag_rappen = 1 where id = '00000000-0000-0000-0000-000000001072' $$,
  'P0001', 'finanzen.spesen_fest', 'stornierte Spesen sind fest');

-- Buchhaltung
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000010a1", "role": "authenticated"}', true);
select is((select count(*)::int from public.offene_tranchen where projekt_id = '00000000-0000-0000-0000-0000000010e1'), 3,
  'drei Tranchen geplant');
create temp table t_r (name text primary key, id uuid) on commit drop;
grant all on t_r to authenticated;
insert into t_r select 'anz', public.rechnung_entwurf('{"zahlungsplan_id": "00000000-0000-0000-0000-0000000010f1"}');
select is((select art || '|' || total_rappen || '|' || inkl_mwst from public.rechnungen where id = (select id from t_r where name = 'anz')),
  'anzahlung|900000|true', 'erste Tranche wird Anzahlung, Betrag inkl. MWST');
select is((select netto_rappen + mwst_rappen from public.rechnungen where id = (select id from t_r where name = 'anz')), 900000::bigint,
  'Netto plus MWST ergibt den Tranchenbetrag');
select is((select k.kuerzel from public.rechnungen r join public.firmen k on k.id = r.firma_id where r.id = (select id from t_r where name = 'anz')),
  'sarl', 'Firma vom Standort (Bulle = Sàrl)');
select is((select sprache || '|' || titel from public.rechnungen where id = (select id from t_r where name = 'anz')),
  'fr|Facture d''acompte 910001', 'Titel in der Sprache des Kunden');
select is(public.rechnung_entwurf('{"zahlungsplan_id": "00000000-0000-0000-0000-0000000010f1"}'), (select id from t_r where name = 'anz'),
  'zweiter Entwurf zur selben Tranche gibt den bestehenden zurück');
insert into t_r select 'frei', public.rechnung_entwurf('{"kontakt_id": "00000000-0000-0000-0000-0000000010c1"}');
select throws_ok(format('select public.rechnung_stellen(%L)', (select id from t_r where name = 'frei')), 'P0001', 'finanzen.rechnung_leer',
  'Rechnung ohne Positionen lässt sich nicht stellen');
select matches(public.rechnung_stellen((select id from t_r where name = 'anz')), '^R\d{4}-\d+$', 'Nummer im Format R2026-17');
select is((select faellig_am - datum from public.rechnungen where id = (select id from t_r where name = 'anz')), 30,
  'fällig nach der Zahlungsfrist der Firma');
select is((select rechnung_nr from public.zahlungsplan where id = '00000000-0000-0000-0000-0000000010f1'),
  (select nummer from public.rechnungen where id = (select id from t_r where name = 'anz')), 'Tranche trägt die Rechnungsnummer');
select throws_ok(format('update public.rechnungen set positionen = %L where id = %L', '[]', (select id from t_r where name = 'anz')),
  'P0001', 'finanzen.rechnung_gestellt', 'gestellte Rechnung ist fest');

-- Zahlungen
insert into public.rechnung_zahlungen (rechnung_id, betrag_rappen) select id, 400000 from t_r where name = 'anz';
select is((select status from public.rechnungen where id = (select id from t_r where name = 'anz')), 'teilbezahlt', 'Teilzahlung');
insert into public.rechnung_zahlungen (rechnung_id, betrag_rappen) select id, 500000 from t_r where name = 'anz';
select is((select status || '|' || (bezahlt_am is not null) from public.rechnungen where id = (select id from t_r where name = 'anz')),
  'bezahlt|true', 'voll bezahlt');
select isnt((select bezahlt_am from public.zahlungsplan where id = '00000000-0000-0000-0000-0000000010f1'), null,
  'Zahlungsplan: Tranche bezahlt (Fahrplan «Anzahlung»)');
select throws_ok($$ select public.rechnung_stornieren((select id from t_r where name = 'anz'), 'Fehler') $$,
  'P0001', 'finanzen.schon_bezahlt', 'bezahlte Rechnung nicht stornierbar');

-- Montage und Schluss mit Nachträgen
insert into t_r select 'mon', public.rechnung_entwurf('{"zahlungsplan_id": "00000000-0000-0000-0000-0000000010f2"}');
select is((select art from public.rechnungen where id = (select id from t_r where name = 'mon')), 'teilzahlung', 'mittlere Tranche = Teilrechnung');
select public.rechnung_stellen((select id from t_r where name = 'mon'), current_date - 40);
insert into t_r select 'sch', public.rechnung_entwurf('{"zahlungsplan_id": "00000000-0000-0000-0000-0000000010f3"}');
select is((select art || '|' || jsonb_array_length(positionen) || '|' || total_rappen from public.rechnungen where id = (select id from t_r where name = 'sch')),
  'schluss|2|' || (300000 + round(50000 * 1.081))::bigint, 'letzte Tranche = Schluss mit bestätigtem Nachtrag inkl. MWST');
select public.rechnung_stellen((select id from t_r where name = 'sch'));
select is((select status from public.nachtraege where id = '00000000-0000-0000-0000-000000001091'), 'verrechnet', 'Nachtrag verrechnet');

-- Mahnen
select throws_ok($$ select public.rechnung_mahnen((select id from t_r where name = 'sch')) $$, 'P0001', 'finanzen.nicht_ueberfaellig',
  'nicht fällige Rechnung wird nicht gemahnt');
select public.rechnung_mahnen((select id from t_r where name = 'mon'));
select public.rechnung_mahnen((select id from t_r where name = 'mon'));
select is(public.rechnung_mahnen((select id from t_r where name = 'mon')), 3, 'Mahnstufe 3');
select is((select mahnfrist - gemahnt_am from public.rechnungen where id = (select id from t_r where name = 'mon')), 10, 'Mahnfrist 10 Tage');
select throws_ok($$ select public.rechnung_mahnen((select id from t_r where name = 'mon')) $$, 'P0001', 'finanzen.mahnstufe_max',
  'nach Stufe 3 keine weitere Mahnung');

-- Stornieren
select public.rechnung_stornieren((select id from t_r where name = 'sch'), 'falscher Betrag');
select is((select status from public.nachtraege where id = '00000000-0000-0000-0000-000000001091'), 'vom_kunden_bestaetigt',
  'Storno gibt den Nachtrag wieder frei');
select is((select rechnung_nr from public.zahlungsplan where id = '00000000-0000-0000-0000-0000000010f3'), null, 'Storno gibt die Tranche frei');

-- Service-Rapport
select throws_ok($$ select public.rechnung_entwurf('{"rapport_id": "00000000-0000-0000-0000-000000001082"}') $$,
  'P0001', 'finanzen.rapport_nicht_verrechenbar', 'Garantie-Rapport wird nicht verrechnet');
insert into t_r select 'srv', public.rechnung_entwurf('{"rapport_id": "00000000-0000-0000-0000-000000001081"}');
select is((select positionen -> 0 ->> 'menge' || '|' || (positionen -> 0 ->> 'preis_rappen') || '|' || inkl_mwst
             from public.rechnungen where id = (select id from t_r where name = 'srv')),
  '1.50|12000|false', 'Service: 1.5 h zum Stundensatz, exkl. MWST');

-- AbaNinja-Abgleich
select is(public.abaninja_abgleich_anwenden(jsonb_build_object(
  'rechnungen', jsonb_build_array(jsonb_build_object('uuid', 'aba-1', 'reference', (select nummer from public.rechnungen where id = (select id from t_r where name = 'mon')),
                                                     'status', 'partial', 'offen_rappen', 800000)),
  'belege', jsonb_build_array(jsonb_build_object('uuid', 'beleg-1', 'nummer', 'K-77', 'reference', 'Projekt 910001 Module',
                                                  'lieferant', 'Testgrosshandel', 'total_rappen', 1081000, 'offen_rappen', 1081000)))) ->> 'zahlungen',
  '1', 'Abgleich bucht die Zahlung aus AbaNinja');
select is((select bezahlt_rappen from public.rechnungen where id = (select id from t_r where name = 'mon')), 1000000::bigint,
  'bezahlt = Total minus offen in AbaNinja');
select is((select projekt_id from public.kreditor_zahlungen where abaninja_uuid = 'beleg-1'), '00000000-0000-0000-0000-0000000010e1'::uuid,
  'Lieferantenrechnung dem Projekt zugeordnet (Nummer in der Referenz)');

-- Nachkalkulation
select is((public.nachkalkulation('00000000-0000-0000-0000-0000000010e1') -> 'ist' ->> 'material_rappen')::bigint, 1000000::bigint,
  'Nachkalkulation: Material aus der Lieferantenrechnung, exkl. MWST');

reset role;
select setval('intern.rapport_nummer', r, ri) from t_seq;
select setval('intern.nachtrag_nummer', n, ni) from t_seq;

select * from finish();
rollback;
