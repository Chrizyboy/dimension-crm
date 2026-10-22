-- Prüft Phase 9: Projekt-Fahrplan (automatische und gesetzte Schritte, Checkliste aus der Vorlage, Fristen),
-- Bauplanung (übernehmen, fixieren, gebaut, zurücknehmen, rückgängig), Zeitplan mit Einsätzen,
-- Service-Fälle (Nummer, Verlauf, Erledigt-Datum) und Wartungsverträge (erste und nächste Wartung).
-- Ausführen: npm run db:test
begin;
select plan(35);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000009a1', 'p9-pl@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000009b1', 'p9_pl', 'Paula Projekt', '00000000-0000-0000-0000-0000000009a1', 'projektleitung', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000009c1', 'person', 'privat', 'Mia', 'Muster', 'de');
insert into public.objekte (id, kontakt_id, strasse, plz, ort) values
  ('00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009c1', 'Musterweg 1', '5630', 'Muri AG');
insert into public.projekte (id, nummer, kontakt_id, objekt_id, status, ablauf_vorlage_id, checkliste) values
  ('00000000-0000-0000-0000-0000000009e1', 'P9-T1', '00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000009d1',
   'auftrag', (select id from public.ablauf_vorlagen where schluessel = 'pv'), '{"drt": "ok", "rsF": "1", "pmF": ""}'),
  ('00000000-0000-0000-0000-0000000009e2', 'P9-T2', '00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000009d1',
   'auftrag', (select id from public.ablauf_vorlagen where schluessel = 'pv'), '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000009a1", "role": "authenticated"}', true);

-- Fahrplan: sechs Phasen, Vertrag automatisch erledigt, Checkliste aus der alten Vorlage übernommen
select is((select count(distinct phase)::int from public.projekt_fahrplan where projekt_id = '00000000-0000-0000-0000-0000000009e1'),
  6, 'Fahrplan hat sechs Phasen');
select is((select stand from public.projekt_fahrplan where projekt_id = '00000000-0000-0000-0000-0000000009e1' and schluessel = 'vertrag'),
  'erledigt', 'Auftrag: Vertrag ist automatisch erledigt');
select is((select stand from public.projekt_fahrplan where projekt_id = '00000000-0000-0000-0000-0000000009e1' and schluessel = 'netz'),
  'erledigt', 'Checkliste «DRT ok» gilt als Netzgesuch erledigt');
select is((select stand from public.projekt_fahrplan where projekt_id = '00000000-0000-0000-0000-0000000009e1' and schluessel = 'sina'),
  'teilweise', 'nur eines von zwei SiNa-Feldern: in Arbeit');
select is((select checkliste_gesamt::int from public.projekt_stand where projekt_id = '00000000-0000-0000-0000-0000000009e1'),
  7, 'Checkliste Elektriker hat sieben Punkte');
select throws_ok($$ select public.projekt_schritt_setzen('00000000-0000-0000-0000-0000000009e1', 'vertrag', '{"stand": "offen"}') $$,
  'P0001', 'projekt.schritt_automatisch', 'automatische Schritte lassen sich nicht von Hand setzen');
select throws_ok($$ select public.projekt_schritt_setzen('00000000-0000-0000-0000-0000000009e1', 'gemeinde', '{"stand": "fertig"}') $$,
  'P0001', 'projekt.stand_ungueltig', 'unbekannter Stand wird abgelehnt');

-- Gesetzte Schritte, Datum und Frist
select lives_ok($$ select public.projekt_schritt_setzen('00000000-0000-0000-0000-0000000009e1', 'gemeinde',
  '{"stand": "teilweise", "datum": "2026-09-01", "frist": "2026-09-15"}') $$, 'Gemeinde: eingereicht mit Frist');
select is((select eingereicht_am from public.projekt_fahrplan where projekt_id = '00000000-0000-0000-0000-0000000009e1' and schluessel = 'gemeinde'),
  '2026-09-01'::date, 'Eingereicht-Datum wird gespeichert');
select ok((select ueberfaellig from public.projekt_fahrplan where projekt_id = '00000000-0000-0000-0000-0000000009e1' and schluessel = 'gemeinde'),
  'Frist vorbei und nicht erledigt: überfällig');
select is((select bewilligungen_spaet::int from public.projekt_stand where projekt_id = '00000000-0000-0000-0000-0000000009e1'),
  1, 'Projekt zählt die späte Bewilligung');
select lives_ok($$ select public.projekt_schritt_setzen('00000000-0000-0000-0000-0000000009e1', 'abnahme',
  '{"stand": "erledigt", "datum": "2026-10-01"}') $$, 'Abnahme erledigt');
select is((select frist from public.projekt_fahrplan where projekt_id = '00000000-0000-0000-0000-0000000009e1' and schluessel = 'pronovo'),
  '2026-10-31'::date, 'Pronovo-Frist: 30 Tage nach der Abnahme');
select lives_ok($$ select public.projekt_schritt_setzen('00000000-0000-0000-0000-0000000009e1', 'material', '{"stand": "teilweise"}') $$,
  'Material: bestellt');
select is((select material_status from public.projekte where id = '00000000-0000-0000-0000-0000000009e1'), 'bestellt',
  'Material-Schritt schreibt den Material-Stand des Projekts');

-- Bauplanung: ohne Termin, mit Termin, zurücknehmen und rückgängig
select is(public.projekt_bau_planen('00000000-0000-0000-0000-0000000009e1',
  jsonb_build_object('standort_id', (select id from public.standorte where name = 'Muri'))), 'ohne_termin', 'Übernahme ohne Bautermin');
select is((select status || '/' || bau_status from public.projekte where id = '00000000-0000-0000-0000-0000000009e1'),
  'im_bau/ausstehend', 'im Bau, Termin ausstehend');
select is(public.projekt_bau_planen('00000000-0000-0000-0000-0000000009e2',
  jsonb_build_object('von', current_date + 10, 'bis', current_date + 13)), 'geplant', 'Termin in der Zukunft: geplant');
select is((select bau_status || '/' || werktage::int from public.projekte where id = '00000000-0000-0000-0000-0000000009e2'),
  'terminiert/' || intern.werktage(current_date + 10, current_date + 13), 'fixiert, Werktage gerechnet');
select is((select stand from public.projekt_fahrplan where projekt_id = '00000000-0000-0000-0000-0000000009e2' and schluessel = 'termin'),
  'erledigt', 'fester Einsatz: Bautermin im Fahrplan erledigt');
select lives_ok($$ select public.projekt_bau_rueckgaengig('00000000-0000-0000-0000-0000000009e2') $$, 'Rückgängig');
select is((select status || '/' || count(e.id) filter (where e.geloescht_am is null)
             from public.projekte p left join public.einsaetze e on e.projekt_id = p.id
            where p.id = '00000000-0000-0000-0000-0000000009e2' group by p.status),
  'auftrag/0', 'wieder Auftrag, Einsatz im Papierkorb');
select throws_ok($$ select public.projekt_bau_rueckgaengig('00000000-0000-0000-0000-0000000009e2') $$,
  'P0001', 'projekt.nichts_rueckgaengig', 'zweimal rückgängig geht nicht');

-- Zeitplan: Einsätze prüfen, «IBN durchgeführt» schliesst ab und legt die Anlage an
select throws_ok($$ select public.projekt_zeitplan_speichern('00000000-0000-0000-0000-0000000009e1',
  '{"einsaetze": [{"art": "intern", "von": "2026-05-10", "bis": "2026-05-08"}]}') $$,
  'P0001', 'einsatz.bis_vor_von', 'Ende vor Beginn wird abgelehnt');
select lives_ok($$ select public.projekt_zeitplan_speichern('00000000-0000-0000-0000-0000000009e1',
  '{"einsaetze": [{"art": "intern", "von": "2026-05-04", "bis": "2026-05-06"}], "bau_status": "fertig"}') $$,
  'Zeitplan mit IBN durchgeführt');
select is((select a.ibn_am from public.anlagen a where a.projekt_id = '00000000-0000-0000-0000-0000000009e1' and a.geloescht_am is null),
  '2026-05-06'::date, 'Anlage mit IBN = Ende des letzten Einsatzes');

-- Service-Fall: Nummer, Verlauf, Erledigt-Datum kommt und geht
insert into public.service_faelle (nummer, titel, kontakt_id) values ('', 'Test-Fall', '00000000-0000-0000-0000-0000000009c1');
select matches((select nummer from public.service_faelle where titel = 'Test-Fall'), '^S\d{3,}$', 'Fall bekommt eine S-Nummer');
select lives_ok($$ select public.service_notiz((select id from public.service_faelle where titel = 'Test-Fall'), 'Fernzugriff geprüft') $$,
  'Notiz an den Verlauf');
update public.service_faelle set status = 'erledigt' where titel = 'Test-Fall';
select isnt((select erledigt_am from public.service_faelle where titel = 'Test-Fall'), null, 'erledigt: Datum gesetzt');
update public.service_faelle set status = 'bearbeitung' where titel = 'Test-Fall';
select is((select erledigt_am from public.service_faelle where titel = 'Test-Fall'), null, 'wieder offen: Datum weg');

-- Wartungsvertrag: erste Wartung aus Start + Rhythmus, «erledigt» rechnet die nächste
insert into public.wartungsvertraege (kontakt_id, start_am, rhythmus_monate, notiz)
values ('00000000-0000-0000-0000-0000000009c1', '2026-01-15', 12, 'p9-test');
select is((select naechste_wartung from public.wartungsvertraege where notiz = 'p9-test'), '2027-01-15'::date,
  'erste Wartung = Start + Rhythmus');
select matches((select nummer from public.wartungsvertraege where notiz = 'p9-test'), '^W\d{3,}$', 'Vertrag bekommt eine W-Nummer');
select is(public.wartung_erledigt((select id from public.wartungsvertraege where notiz = 'p9-test'), '2027-03-01', 'ok'),
  '2028-03-01'::date, 'Wartung erledigt: nächste = Datum + Rhythmus');
select is((select jsonb_array_length(verlauf) from public.wartungsvertraege where notiz = 'p9-test'), 1, 'Eintrag im Verlauf');
update public.wartungsvertraege set status = 'gekuendigt' where notiz = 'p9-test';
select throws_ok($$ select public.wartung_erledigt((select id from public.wartungsvertraege where notiz = 'p9-test')) $$,
  'P0001', 'wartung.nicht_aktiv', 'gekündigter Vertrag: keine Wartung mehr');

select * from finish();
rollback;
