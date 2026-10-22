-- Prüft Phase 9b: «Mein Tag» nur mit eigenen Einsätzen, Rapport und Zeiten wiederholbar (offline), nur eine
-- laufende Zeit, eigene Zeiten privat, Nachtrag-Preis nur mit Recht «preise», Abschluss mit Unterschrift und
-- seine Folgen (Montage fertig, IBN, Service, Wartung), Prüfung und Lohn-Export der Zeiten, Garantiefall.
-- Ausführen: npm run db:test
begin;
select plan(37);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000b9a1', 'p9b-mo@test.local'),
  ('00000000-0000-0000-0000-00000000b9a2', 'p9b-mo2@test.local'),
  ('00000000-0000-0000-0000-00000000b9a3', 'p9b-pl@test.local'),
  ('00000000-0000-0000-0000-00000000b9a4', 'p9b-bh@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-00000000b9b1', 'p9b_mo', 'Max Montage', '00000000-0000-0000-0000-00000000b9a1', 'montage', '{}'),
  ('00000000-0000-0000-0000-00000000b9b2', 'p9b_mo2', 'Mia Montage', '00000000-0000-0000-0000-00000000b9a2', 'montage', '{}'),
  ('00000000-0000-0000-0000-00000000b9b3', 'p9b_pl', 'Paul Leitung', '00000000-0000-0000-0000-00000000b9a3', 'projektleitung', '{}'),
  ('00000000-0000-0000-0000-00000000b9b4', 'p9b_bh', 'Bea Buchhaltung', '00000000-0000-0000-0000-00000000b9a4', 'buchhaltung', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache, telefon) values
  ('00000000-0000-0000-0000-00000000b9c1', 'person', 'privat', 'Lea', 'Beispiel', 'de', '+41 76 000 00 00');
insert into public.objekte (id, kontakt_id, strasse, plz, ort) values
  ('00000000-0000-0000-0000-00000000b9d1', '00000000-0000-0000-0000-00000000b9c1', 'Musterweg 1', '1630', 'Bulle');
insert into public.projekte (id, nummer, kontakt_id, objekt_id, status, bau_status) values
  ('00000000-0000-0000-0000-00000000b9e1', 'P9B-1', '00000000-0000-0000-0000-00000000b9c1', '00000000-0000-0000-0000-00000000b9d1', 'im_bau', 'terminiert'),
  ('00000000-0000-0000-0000-00000000b9e2', 'P9B-2', '00000000-0000-0000-0000-00000000b9c1', '00000000-0000-0000-0000-00000000b9d1', 'im_bau', 'terminiert');
insert into public.einsaetze (projekt_id, art, von, bis, personen) values
  ('00000000-0000-0000-0000-00000000b9e1', 'intern', current_date, current_date + 1, '{00000000-0000-0000-0000-00000000b9b1}'),
  ('00000000-0000-0000-0000-00000000b9e2', 'intern', current_date, current_date, '{00000000-0000-0000-0000-00000000b9b2}');
insert into public.service_faelle (id, kontakt_id, titel, status, person_id, termin_am) values
  ('00000000-0000-0000-0000-00000000b9f1', '00000000-0000-0000-0000-00000000b9c1', 'Wechselrichter meldet Fehler', 'neu',
   '00000000-0000-0000-0000-00000000b9b1', now());
insert into public.wartungsvertraege (id, kontakt_id, projekt_id, status, rhythmus_monate, naechste_wartung) values
  ('00000000-0000-0000-0000-00000000b9f2', '00000000-0000-0000-0000-00000000b9c1', '00000000-0000-0000-0000-00000000b9e2',
   'aktiv', 12, current_date);

-- Sequenzen kennen kein Rollback: Stand merken und am Ende zurücksetzen.
create temp table t_seq on commit drop as
  select (select last_value from intern.rapport_nummer) as r, (select is_called from intern.rapport_nummer) as ri,
         (select last_value from intern.nachtrag_nummer) as n, (select is_called from intern.nachtrag_nummer) as ni;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000b9a1", "role": "authenticated"}', true);

-- Mein Tag
select is(jsonb_array_length(public.mein_tag(current_date, current_date) -> 'eintraege'), 2,
  'Mein Tag: eigener Einsatz und eigener Service-Termin, nicht der Einsatz der Kollegin');
select is(public.mein_tag(current_date, current_date) -> 'eintraege' -> 0 -> 'kunde' ->> 'telefon', '+41 76 000 00 00',
  'Mein Tag bringt Kunde mit Telefon');
select throws_ok($$ select public.mein_tag(current_date, current_date, '00000000-0000-0000-0000-00000000b9b2') $$,
  'P0001', 'baustelle.fremde_person', 'Monteur sieht den Tag anderer nicht');

-- Rapport: wiederholbar mit der ID vom Handy
select is(public.rapport_speichern('{"id": "00000000-0000-0000-0000-00000000b901", "art": "montage",
  "projekt_id": "00000000-0000-0000-0000-00000000b9e1", "arbeiten": "Module montiert"}'),
  '00000000-0000-0000-0000-00000000b901'::uuid, 'Rapport mit eigener ID angelegt');
select public.rapport_speichern('{"id": "00000000-0000-0000-0000-00000000b901", "arbeiten": "Module montiert, DC verlegt"}');
select is((select count(*)::int from public.rapporte where projekt_id = '00000000-0000-0000-0000-00000000b9e1'), 1,
  'zweites Senden ändert den Rapport, legt keinen zweiten an');
select matches((select nummer from public.rapporte where id = '00000000-0000-0000-0000-00000000b901'), '^R\d{4}$', 'Nummer R0001 …');
select is((select person_id from public.rapporte where id = '00000000-0000-0000-0000-00000000b901'),
  '00000000-0000-0000-0000-00000000b9b1'::uuid, 'Rapport gehört dem Monteur');
select throws_ok($$ select public.rapport_speichern('{"art": "montage"}') $$, 'P0001', 'baustelle.rapport_ohne_bezug',
  'Rapport braucht Projekt, Service-Fall oder Wartungsvertrag');

-- Zeiten: Start/Stopp vom Handy, nur eine läuft
select public.zeit_starten(jsonb_build_object('id', '00000000-0000-0000-0000-00000000b911', 'rapport_id', '00000000-0000-0000-0000-00000000b901',
  'start', now() - interval '3 hours'));
select public.zeit_starten(jsonb_build_object('id', '00000000-0000-0000-0000-00000000b911', 'start', now()));
select is((select count(*)::int from public.zeiten where person_id = '00000000-0000-0000-0000-00000000b9b1'), 1,
  'zweiter Start mit derselben ID legt nichts doppelt an');
select is((select projekt_id from public.zeiten where id = '00000000-0000-0000-0000-00000000b911'),
  '00000000-0000-0000-0000-00000000b9e1'::uuid, 'Zeit übernimmt das Projekt des Rapports');
select public.zeit_starten(jsonb_build_object('id', '00000000-0000-0000-0000-00000000b912', 'start', now() - interval '1 hour', 'art', 'reise'));
select is((select count(*)::int from public.zeiten where person_id = '00000000-0000-0000-0000-00000000b9b1' and stopp is null), 1,
  'neuer Start beendet die laufende Zeit');
select public.zeit_stoppen(jsonb_build_object('id', '00000000-0000-0000-0000-00000000b912', 'stopp', now() - interval '30 minutes'));
select lives_ok($$ select public.zeit_stoppen('{"id": "00000000-0000-0000-0000-00000000b912"}') $$, 'zweites Stoppen schadet nicht');
select is((select stunden from public.zeiten_liste where id = '00000000-0000-0000-0000-00000000b912'), 0.50, 'Stunden in der Liste');
select throws_ok($$ select public.zeit_starten(jsonb_build_object('start', now() + interval '1 hour')) $$, 'P0001', 'baustelle.zeit_zukunft',
  'kein Start in der Zukunft');
select public.zeit_starten(jsonb_build_object('id', '00000000-0000-0000-0000-00000000b913', 'rapport_id', '00000000-0000-0000-0000-00000000b901',
  'start', now() - interval '20 minutes'));

-- Nachtrag: Monteur erfasst, Preis nur mit Recht «preise»
select public.nachtrag_speichern('{"id": "00000000-0000-0000-0000-00000000b921", "rapport_id": "00000000-0000-0000-0000-00000000b901",
  "beschreibung": "Zusätzliche Steckdose im Keller", "stunden": 1.5}');
select is((select projekt_id from public.nachtraege where id = '00000000-0000-0000-0000-00000000b921'),
  '00000000-0000-0000-0000-00000000b9e1'::uuid, 'Nachtrag hängt am Projekt des Rapports');
select throws_ok($$ select public.nachtrag_speichern('{"id": "00000000-0000-0000-0000-00000000b921", "beschreibung": "x", "betrag_rappen": 50000}') $$,
  'P0001', 'baustelle.nachtrag_preis', 'Monteur setzt keinen Preis');

-- Abschluss
select throws_ok($$ select public.rapport_abschliessen('00000000-0000-0000-0000-00000000b901', '{}') $$, 'P0001', 'baustelle.unterschrift_fehlt',
  'ohne Unterschrift oder Grund kein Abschluss');
select public.rapport_abschliessen('00000000-0000-0000-0000-00000000b901', '{"montage_fertig": true,
  "unterschrift": {"name": "Lea Beispiel", "dokument_id": "00000000-0000-0000-0000-00000000b9d9"}}');
select ok((select abgeschlossen_am is not null and unterschrift_kunde ->> 'name' = 'Lea Beispiel' from public.rapporte
            where id = '00000000-0000-0000-0000-00000000b901'), 'Rapport abgeschlossen mit Unterschrift');
select is((select count(*)::int from public.zeiten where rapport_id = '00000000-0000-0000-0000-00000000b901' and stopp is null), 0,
  'Abschluss beendet die laufende Zeit des Rapports');
select is((select status from public.nachtraege where id = '00000000-0000-0000-0000-00000000b921'), 'vom_kunden_bestaetigt',
  'mit der Unterschrift ist der Nachtrag bestätigt');
select is((select bau_status from public.projekte where id = '00000000-0000-0000-0000-00000000b9e1'), 'ibn',
  'Montage fertig: Baustelle wartet auf die IBN');
select throws_ok($$ select public.rapport_speichern('{"id": "00000000-0000-0000-0000-00000000b901", "arbeiten": "nachträglich"}') $$,
  'P0001', 'baustelle.rapport_abgeschlossen', 'abgeschlossener Rapport ist fest');
select lives_ok($$ select public.rapport_abschliessen('00000000-0000-0000-0000-00000000b901', '{}') $$, 'zweiter Abschluss schadet nicht');

-- IBN-Rapport: Anlage mit IBN-Datum, Projekt abgeschlossen
select public.rapport_speichern('{"id": "00000000-0000-0000-0000-00000000b902", "art": "ibn", "projekt_id": "00000000-0000-0000-0000-00000000b9e1",
  "arbeiten": "Anlage in Betrieb genommen", "pruefpunkte": {"isolation": "200"}}');
select public.rapport_abschliessen('00000000-0000-0000-0000-00000000b902', '{"ohne_unterschrift": "Kunde nicht anwesend"}');
select ok((select ibn_am = current_date from public.anlagen where projekt_id = '00000000-0000-0000-0000-00000000b9e1'),
  'IBN legt die Anlage mit IBN-Datum an');
select is((select status || '/' || bau_status from public.projekte where id = '00000000-0000-0000-0000-00000000b9e1'), 'abgeschlossen/fertig',
  'IBN schliesst das Projekt ab');

-- Service-Rapport
select public.rapport_speichern('{"id": "00000000-0000-0000-0000-00000000b903", "art": "service", "service_fall_id": "00000000-0000-0000-0000-00000000b9f1",
  "arbeiten": "Wechselrichter neu gestartet"}');
select throws_ok($$ select public.rapport_abschliessen('00000000-0000-0000-0000-00000000b903', '{"ohne_unterschrift": "Fernwartung"}') $$,
  'P0001', 'baustelle.verrechnung_fehlt', 'Service braucht die Verrechnung');
select public.rapport_abschliessen('00000000-0000-0000-0000-00000000b903', '{"ohne_unterschrift": "Fernwartung", "verrechnung": "garantie", "fall_erledigt": true}');
select is((select status || '/' || jsonb_array_length(verlauf) from public.service_faelle where id = '00000000-0000-0000-0000-00000000b9f1'),
  'erledigt/1', 'Service-Rapport im Verlauf, Fall erledigt');

-- Wartungs-Rapport
select public.rapport_speichern('{"id": "00000000-0000-0000-0000-00000000b904", "art": "wartung", "wartungsvertrag_id": "00000000-0000-0000-0000-00000000b9f2",
  "arbeiten": "Jahreswartung"}');
select public.rapport_abschliessen('00000000-0000-0000-0000-00000000b904', '{"ohne_unterschrift": "Kunde abwesend", "verrechnung": "vertrag"}');
select is((select naechste_wartung from public.wartungsvertraege where id = '00000000-0000-0000-0000-00000000b9f2'),
  (current_date + interval '12 months')::date, 'Wartung erledigt, nächste in einem Jahr');

-- Zeiten sind privat; prüfen und Lohn-Export
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000b9a2", "role": "authenticated"}', true);
select is((select count(*)::int from public.zeiten), 0, 'Kollegin sieht fremde Zeiten nicht');
select throws_ok($$ select public.zeiten_pruefen(array['00000000-0000-0000-0000-00000000b912'::uuid]) $$, 'P0001', 'baustelle.recht_fehlt',
  'Monteur prüft keine Zeiten');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000b9a3", "role": "authenticated"}', true);
select is(public.zeiten_pruefen(array['00000000-0000-0000-0000-00000000b911', '00000000-0000-0000-0000-00000000b912']::uuid[]), 2,
  'Projektleitung prüft gestoppte Zeiten');
select throws_ok($$ select public.zeiten_exportieren(array['00000000-0000-0000-0000-00000000b912'::uuid]) $$, 'P0001', 'baustelle.recht_fehlt',
  'Lohn-Export nur mit Recht «finanzen»');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000b9a1", "role": "authenticated"}', true);
select throws_ok($$ update public.zeiten set pause_min = 30 where id = '00000000-0000-0000-0000-00000000b912' $$, 'P0001', 'baustelle.zeit_geprueft',
  'geprüfte Zeit ändert der Monteur nicht mehr');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000b9a4", "role": "authenticated"}', true);
select isnt(public.zeiten_exportieren(array['00000000-0000-0000-0000-00000000b911', '00000000-0000-0000-0000-00000000b912']::uuid[]), null,
  'Buchhaltung exportiert die geprüften Zeiten');
select throws_ok($$ update public.zeiten set pause_min = 15 where id = '00000000-0000-0000-0000-00000000b912' $$, 'P0001', 'baustelle.zeit_exportiert',
  'exportierte Zeit ist fest');

-- Abschluss zurücknehmen nur mit Recht «preise»; Garantiefall
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000b9a1", "role": "authenticated"}', true);
select throws_ok($$ select public.rapport_oeffnen('00000000-0000-0000-0000-00000000b901') $$, 'P0001', 'baustelle.recht_fehlt',
  'Monteur öffnet keinen abgeschlossenen Rapport');
insert into public.garantiefaelle (id, service_fall_id, hersteller, komponente, status)
values ('00000000-0000-0000-0000-00000000b931', '00000000-0000-0000-0000-00000000b9f1', 'Testhersteller', 'Wechselrichter', 'offen');
update public.garantiefaelle set status = 'gemeldet', rma_nummer = 'RMA-1' where id = '00000000-0000-0000-0000-00000000b931';
select is((select gemeldet_am from public.garantiefaelle where id = '00000000-0000-0000-0000-00000000b931'), current_date,
  'Garantiefall: Datum kommt mit dem Status');

reset role;
select setval('intern.rapport_nummer', r, ri) from t_seq;
select setval('intern.nachtrag_nummer', n, ni) from t_seq;

select * from finish();
rollback;
