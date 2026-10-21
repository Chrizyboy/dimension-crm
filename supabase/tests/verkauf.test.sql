-- Prüft Phase 6: Standort nach PLZ, Lead anlegen, Stand wechseln mit Pflichtangaben, Kontakt erfassen,
-- Kalender ersetzen (Papierkorb statt Löschen) und den Lead-Monatsbericht.
-- Ausführen: npm run db:test
begin;
select plan(20);

-- Standort und Sprache aus der PLZ (V170), ohne Internet-Dienst
select is(public.standort_fuer_plz('5630'), 'muri', 'PLZ 5630 (AG) gehört zu Muri');
select is(public.standort_fuer_plz('1630'), 'bulle', 'PLZ 1630 (FR) gehört zu Bulle');
select is(public.standort_fuer_plz('1716'), 'muri', 'Sensebezirk (1716) gehört zu Muri');
select is((select sprache from public.plz_auskunft('1630')), 'fr', 'Bulle schreibt französisch');
select ok((select hoehe from public.plz_auskunft('3752')) > 500, 'PLZ-Auskunft liefert die Höhe über Meer');

-- Testperson für «Termin bei»
insert into public.personen (id, kuerzel, name, email, rolle) values
  ('00000000-0000-0000-0000-0000000006a1', 't6_aussen', 'Test Aussendienst', 'aussen6@test.local', 'verkauf');

-- Lead anlegen: neuer Kontakt, Gebäude und Lead in einem Schritt, Nummer von der Datenbank
create temporary table t6 (vc uuid) on commit drop;
insert into t6 select public.lead_anlegen(jsonb_build_object(
  'kontakt', jsonb_build_object('vorname', 'Lea', 'nachname', 'Testlead6', 'telefon', '076 666 00 01'),
  'objekt', jsonb_build_object('strasse', 'Testweg 6', 'plz', '1630', 'ort', 'Bulle'),
  'lead', jsonb_build_object('quelle', 'website', 'interesse', jsonb_build_array('pv', 'batterie'))));
select ok((select nummer ~ '^L\d+$' from public.verkaufschancen where id = (select vc from t6)), 'neuer Lead bekommt eine L-Nummer');
select is((select s.kuerzel from public.verkaufschancen v join public.standorte s on s.id = v.standort_id
            where v.id = (select vc from t6)), 'bulle', 'Standort folgt der PLZ');
select is((select k.sprache from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
            where v.id = (select vc from t6)), 'fr', 'Sprache des Kontakts folgt dem Standort');
select is((select stand from public.verkauf_geschaefte where verkaufschance_id = (select vc from t6)), 'lead_neu',
  'neuer Lead steht in «Lead neu»');
select throws_ok($$ select public.lead_anlegen('{"kontakt": {}}') $$, 'lead.name_fehlt', 'ohne Namen kein Lead');

-- Stand wechseln: Pflichtangaben wie in V233
select throws_ok(format($$ select public.setze_stand(%L, 'lead_spaeter', '{}') $$, (select vc from t6)),
  'stand.datum_fehlt', '«später kontaktieren» braucht ein Datum');
select throws_ok(format($$ select public.setze_stand(%L, 'termin', jsonb_build_object('termin_am', now() + interval '1 day')) $$,
  (select vc from t6)), 'stand.person_fehlt', 'Termin braucht «Termin bei»');
select throws_ok(format($$ select public.setze_stand(%L, 'offeriert', '{}') $$, (select vc from t6)),
  'stand.braucht_offerte', 'ein Lead kann ohne Offerte nicht «offeriert» sein');
select throws_ok(format($$ select public.setze_stand(%L, 'kein', '{}') $$, (select vc from t6)),
  'stand.grund_fehlt', '«kein Interesse» braucht einen Grund');

-- Kontakt erfassen: Ergebnis «Termin» setzt den Termin und vermerkt beides im Verlauf
select lives_ok(format($$ select public.lead_kontakt_erfassen(%L, 'anruf', 'aus', 'termin', 'Besuch vereinbart',
  jsonb_build_object('termin_am', date_trunc('hour', now()) + interval '2 days', 'person_id', %L)) $$,
  (select vc from t6), '00000000-0000-0000-0000-0000000006a1'), 'Kontakt mit Ergebnis «Termin» erfassen');
select is((select stand from public.verkauf_geschaefte where verkaufschance_id = (select vc from t6)), 'termin',
  'Lead steht danach in «Termin vereinbart»');
select ok((select count(*) from public.aktivitaeten where verkaufschance_id = (select vc from t6)) >= 2,
  'Anruf und Standwechsel stehen im Verlauf');

-- Kalender neu laden: alte Einträge im gleichen Zeitraum kommen in den Papierkorb
select public.kalender_ersetzen('00000000-0000-0000-0000-0000000006a1', 'datei', jsonb_build_array(
  jsonb_build_object('beginn', '2026-11-02T08:00:00+01', 'ende', '2026-11-02T09:00:00+01', 'betreff', 'Alt')));
select is(public.kalender_ersetzen('00000000-0000-0000-0000-0000000006a1', 'datei', jsonb_build_array(
  jsonb_build_object('beginn', '2026-11-02T08:30:00+01', 'ende', '2026-11-02T10:00:00+01', 'betreff', 'Neu'))), 1,
  'neue Kalenderdatei ersetzt die Termine im Zeitraum');
select is((select count(*) from public.kalender_eintraege
            where person_id = '00000000-0000-0000-0000-0000000006a1' and geloescht_am is not null), 1::bigint,
  'der alte Termin liegt im Papierkorb, nichts ist hart gelöscht');

-- Monatsbericht zählt den Lead in seinem Eingangsmonat bei seiner Quelle
select ok((select erhalten from public.lead_monatsbericht(current_date) where quelle = 'website') >= 1,
  'Monatsbericht zählt den neuen Lead bei seiner Quelle');

select * from finish();
rollback;
