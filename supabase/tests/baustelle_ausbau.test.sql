-- Prüft den Ausbau Baustelle & Rapporte (Entscheid 0045): Schritte je Projektart, Tagesrapport ohne Unterschrift,
-- Abnahme mit Unterschrift und Vorbehalt, Teamzeiten, Meldungen mit Aufgabe und Glocke, Seriennummern in die
-- Anlage, Visieren mit Rückfrage, Soll-Stunden, Baustellen heute, Wochenblatt, Auswertung, Mappe.
-- Ausführen: npm run db:test
begin;
select plan(41);
set local timezone = 'Europe/Zurich';

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000ba5a1', 'ba-mo@test.local'),
  ('00000000-0000-0000-0000-0000000ba5a2', 'ba-mo2@test.local'),
  ('00000000-0000-0000-0000-0000000ba5a3', 'ba-pl@test.local'),
  ('00000000-0000-0000-0000-0000000ba5a4', 'ba-fremd@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000ba5b1', 'ba_mo', 'Marco Montage', '00000000-0000-0000-0000-0000000ba5a1', 'montage', '{}'),
  ('00000000-0000-0000-0000-0000000ba5b2', 'ba_mo2', 'Diogo Montage', '00000000-0000-0000-0000-0000000ba5a2', 'montage', '{}'),
  ('00000000-0000-0000-0000-0000000ba5b3', 'ba_pl', 'Laura Leitung', '00000000-0000-0000-0000-0000000ba5a3', 'projektleitung', '{}'),
  ('00000000-0000-0000-0000-0000000ba5b4', 'ba_fremd', 'Fritz Fremd', '00000000-0000-0000-0000-0000000ba5a4', 'montage', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache, telefon) values
  ('00000000-0000-0000-0000-0000000ba5c1', 'person', 'privat', 'Thomas', 'Brunner', 'de', '+41 79 000 00 00');
insert into public.objekte (id, kontakt_id, strasse, plz, ort, dachform) values
  ('00000000-0000-0000-0000-0000000ba5d1', '00000000-0000-0000-0000-0000000ba5c1', 'Bachstrasse 12', '5630', 'Muri AG', 'satteldach'),
  ('00000000-0000-0000-0000-0000000ba5d2', '00000000-0000-0000-0000-0000000ba5c1', 'Flachweg 1', '5630', 'Muri AG', 'flachdach');
insert into public.offerten (id, nummer, kontakt_id, objekt_id, leistung_kwp, anzahl_module, wechselrichter, batterie) values
  ('00000000-0000-0000-0000-0000000ba5e1', 'BA-O1', '00000000-0000-0000-0000-0000000ba5c1', '00000000-0000-0000-0000-0000000ba5d1',
   10, 26, 'Huawei SUN2000-10K', 'Huawei LUNA2000 10 kWh'),
  ('00000000-0000-0000-0000-0000000ba5e2', 'BA-O2', '00000000-0000-0000-0000-0000000ba5c1', '00000000-0000-0000-0000-0000000ba5d2',
   20, 46, 'Fronius Symo', null);
insert into public.projekte (id, nummer, kontakt_id, objekt_id, offerte_id, status, bau_status, verantwortlich_id, ablauf_vorlage_id) values
  ('00000000-0000-0000-0000-0000000ba5f1', 'BA-P1', '00000000-0000-0000-0000-0000000ba5c1', '00000000-0000-0000-0000-0000000ba5d1',
   '00000000-0000-0000-0000-0000000ba5e1', 'im_bau', 'terminiert', '00000000-0000-0000-0000-0000000ba5b3',
   (select id from public.ablauf_vorlagen where schluessel = 'pv')),
  ('00000000-0000-0000-0000-0000000ba5f2', 'BA-P2', '00000000-0000-0000-0000-0000000ba5c1', '00000000-0000-0000-0000-0000000ba5d2',
   '00000000-0000-0000-0000-0000000ba5e2', 'im_bau', 'terminiert', '00000000-0000-0000-0000-0000000ba5b3',
   (select id from public.ablauf_vorlagen where schluessel = 'pv'));
insert into public.einsaetze (id, projekt_id, art, von, bis, personen, notiz) values
  ('00000000-0000-0000-0000-0000000ba501', '00000000-0000-0000-0000-0000000ba5f1', 'intern', current_date - 3, current_date + 1,
   '{00000000-0000-0000-0000-0000000ba5b1,00000000-0000-0000-0000-0000000ba5b2}', 'Hund im Garten, Tor schliessen');

-- Einstellungen und Faustregel (als Systembenutzer)
select ok((select wert ? 'schritte' and wert ? 'sicherheit' from public.einstellungen where schluessel = 'baustelle'),
  'Einstellung baustelle mit Schritten und Sicherheits-Check');
select ok(intern.baustelle_liste('00000000-0000-0000-0000-0000000ba5f1', 'schritte') @> '[{"schluessel": "speicher"}]',
  'mit Batterie gehört der Schritt Speicher dazu');
select ok(not intern.baustelle_liste('00000000-0000-0000-0000-0000000ba5f2', 'schritte') @> '[{"schluessel": "speicher"}]',
  'ohne Batterie fehlt der Schritt Speicher');
select is((intern.baustelle_soll('00000000-0000-0000-0000-0000000ba5f1')).stunden, 53.0,
  'Soll Satteldach: 10 kWp × 4.5 h + Speicher 8 h');
select is((intern.baustelle_soll('00000000-0000-0000-0000-0000000ba5f2')).stunden, 64.0, 'Soll Flachdach: 20 kWp × 3.2 h');

-- Monteur am Handy
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000ba5a1", "role": "authenticated"}', true);
select throws_ok($$ update public.einstellungen set wert = wert where schluessel = 'baustelle' $$, '42501', 'baustelle.kein_recht',
  'Monteur ändert die Baustellen-Einstellung nicht');
select public.rapport_speichern('{"id": "00000000-0000-0000-0000-0000000ba511", "art": "montage", "projekt_id": "00000000-0000-0000-0000-0000000ba5f1",
  "einsatz_id": "00000000-0000-0000-0000-0000000ba501", "sicherheit": {"punkte": {"geruest": true}}}');
select public.rapport_speichern('{"id": "00000000-0000-0000-0000-0000000ba511", "schritte": {"sicherheit": true}}');
select public.rapport_speichern('{"id": "00000000-0000-0000-0000-0000000ba511", "schritte": {"unterkonstruktion": true}}');
select is((select schritte from public.rapporte where id = '00000000-0000-0000-0000-0000000ba511'),
  '{"sicherheit": true, "unterkonstruktion": true}'::jsonb, 'Schritte vom Handy werden zusammengeführt');
select ok((select sicherheit -> 'punkte' ->> 'geruest' = 'true' from public.rapporte where id = '00000000-0000-0000-0000-0000000ba511'),
  'Sicherheits-Check gespeichert');

-- Teamzeiten
select is(public.zeit_team_starten(jsonb_build_object('rapport_id', '00000000-0000-0000-0000-0000000ba511', 'start', now() - interval '3 hours',
  'personen', '[{"person_id": "00000000-0000-0000-0000-0000000ba5b1", "id": "00000000-0000-0000-0000-0000000ba521"},
               {"person_id": "00000000-0000-0000-0000-0000000ba5b2", "id": "00000000-0000-0000-0000-0000000ba522"}]'::jsonb)), 2,
  'Teamleitung startet die Zeit für zwei Personen');
select is(public.zeit_team_starten('{"rapport_id": "00000000-0000-0000-0000-0000000ba511",
  "personen": [{"person_id": "00000000-0000-0000-0000-0000000ba5b2", "id": "00000000-0000-0000-0000-0000000ba522"}]}'), 0,
  'zweimal gesendet = einmal gestartet');
select throws_ok($$ select public.zeit_team_starten('{"rapport_id": "00000000-0000-0000-0000-0000000ba511",
  "personen": [{"person_id": "00000000-0000-0000-0000-0000000ba5b4", "id": "00000000-0000-0000-0000-0000000ba523"}]}') $$,
  'P0001', 'baustelle.nicht_im_team', 'wer nicht im Einsatz ist, wird nicht gestempelt');
select ok((select '00000000-0000-0000-0000-0000000ba5b2'::uuid = any (team) from public.rapporte where id = '00000000-0000-0000-0000-0000000ba511'),
  'Team steht im Rapport');

-- Meldung
select public.meldung_erfassen('{"id": "00000000-0000-0000-0000-0000000ba531", "rapport_id": "00000000-0000-0000-0000-0000000ba511",
  "art": "schaden", "text": "Dachrinne eingedrückt", "weiter": true}');
select public.meldung_erfassen('{"id": "00000000-0000-0000-0000-0000000ba531", "rapport_id": "00000000-0000-0000-0000-0000000ba511",
  "art": "schaden", "text": "Dachrinne eingedrückt", "weiter": true}');
select throws_ok($$ select public.meldung_erfassen('{"art": "schaden", "text": " ", "rapport_id": "00000000-0000-0000-0000-0000000ba511"}') $$,
  'P0001', 'baustelle.meldung_leer', 'leere Meldung geht nicht');

-- Tagesrapport ohne Unterschrift; Text aus den Schritten
select lives_ok($$ select public.rapport_abschliessen('00000000-0000-0000-0000-0000000ba511', '{}') $$,
  'Tagesrapport der Montage geht ohne Unterschrift');
select ok((select arbeiten like 'Gerüst und Sicherheit eingerichtet, Dachhaken%' from public.rapporte where id = '00000000-0000-0000-0000-0000000ba511'),
  'ohne getippten Text gelten die Schritte als Arbeiten');
select is((select count(*)::int from public.zeiten where rapport_id = '00000000-0000-0000-0000-0000000ba511' and stopp is null), 0,
  'Abschluss stoppt die Zeiten des ganzen Teams');

-- Abnahme am letzten Tag
select public.rapport_speichern('{"id": "00000000-0000-0000-0000-0000000ba512", "art": "montage", "projekt_id": "00000000-0000-0000-0000-0000000ba5f1",
  "einsatz_id": "00000000-0000-0000-0000-0000000ba501", "schritte": {"module": true},
  "seriennummern": [{"id": "s1", "art": "wechselrichter", "modell": "SUN2000", "seriennummer": "HW-123"},
                    {"id": "s2", "art": "batterie", "seriennummer": "LU-9"}]}');
select throws_ok($$ select public.rapport_abschliessen('00000000-0000-0000-0000-0000000ba512', '{"montage_fertig": true}') $$,
  'P0001', 'baustelle.unterschrift_fehlt', 'die Abnahme braucht die Unterschrift');
select public.rapport_abschliessen('00000000-0000-0000-0000-0000000ba512', '{"montage_fertig": true,
  "unterschrift": {"name": "Thomas Brunner", "dokument_id": "00000000-0000-0000-0000-0000000ba5d9"},
  "vorbehalte": [{"text": "Dachrinne ersetzen"}]}');
select is((select bau_status from public.projekte where id = '00000000-0000-0000-0000-0000000ba5f1'), 'ibn', 'Abnahme meldet das Projekt zur IBN');
select is((select jsonb_array_length(vorbehalte) from public.rapporte where id = '00000000-0000-0000-0000-0000000ba512'), 1, 'Vorbehalt gespeichert');

-- Monteur sieht keine fremden Wochen
select is(jsonb_array_length(public.zeiten_wochenblatt(date_trunc('week', current_date)::date) -> 'personen'), 1,
  'Monteur sieht im Wochenblatt nur sich');
select throws_ok($$ select public.zeiten_woche_bestaetigen(date_trunc('week', current_date)::date + 1) $$,
  'P0001', 'baustelle.woche_montag', 'Woche nur ab Montag');
select lives_ok($$ select public.zeiten_woche_bestaetigen(date_trunc('week', current_date)::date) $$, 'Woche bestätigt');
select lives_ok($$ select public.zeiten_woche_bestaetigen(date_trunc('week', current_date)::date) $$, 'zweimal bestätigt schadet nicht');
select throws_ok($$ select public.rapport_visieren('00000000-0000-0000-0000-0000000ba511') $$, 'P0001', 'baustelle.recht_fehlt',
  'Monteur visiert nicht');
select throws_ok($$ select public.baustelle_auswertung(current_date - 30, current_date) $$, 'P0001', 'baustelle.recht_fehlt',
  'Auswertung nur mit Recht preise');
select ok((public.baustellen_mappe('00000000-0000-0000-0000-0000000ba5f1') -> 'hinweise' -> 0 ->> 'text') = 'Hund im Garten, Tor schliessen',
  'Mappe bringt die Hinweise der Projektleitung');
select is((public.baustellen_infos('{00000000-0000-0000-0000-0000000ba501}') -> '00000000-0000-0000-0000-0000000ba501' -> 'team' -> 0 ->> 'name'),
  'Diogo Montage', 'Infos bringen das Team mit IDs');

-- Projektleitung
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000ba5a3", "role": "authenticated"}', true);
select is((select count(*)::int from public.aufgaben where person_id = '00000000-0000-0000-0000-0000000ba5b3'
            and bezug_tabelle = 'baustellen_meldungen' and erledigt_am is null), 1, 'Meldung gibt der Projektleitung eine Aufgabe (einmal)');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000ba5b3'
            and titel_de like 'Meldung M%'), 1, 'und eine Glocke');
select public.meldung_erledigen('00000000-0000-0000-0000-0000000ba531', 'Spengler bestellt');
select ok((select erledigt_am is not null from public.baustellen_meldungen where id = '00000000-0000-0000-0000-0000000ba531'), 'Meldung erledigt');
select is((select count(*)::int from public.aufgaben where bezug_id = '00000000-0000-0000-0000-0000000ba531' and erledigt_am is null), 0,
  'Aufgabe dazu ist erledigt');
select is((select count(*)::int from public.aufgaben where bezug_id = '00000000-0000-0000-0000-0000000ba512' and titel like 'Abnahme mit Vorbehalt%'), 1,
  'Vorbehalt gibt der Projektleitung eine Aufgabe');
select public.rapport_visieren('00000000-0000-0000-0000-0000000ba511', 'Wie viele Ziegel ersetzt?');
select public.rapport_visieren('00000000-0000-0000-0000-0000000ba511');
select ok((select visiert_am is not null and rueckfrage is null from public.rapporte where id = '00000000-0000-0000-0000-0000000ba511'),
  'Visieren löscht die Rückfrage');
select public.baustelle_soll_setzen('00000000-0000-0000-0000-0000000ba5f1', 60);
select is((intern.baustelle_soll('00000000-0000-0000-0000-0000000ba5f1')).quelle, 'hand', 'Soll von Hand geht vor');
select is(intern.baustelle_fortschritt('00000000-0000-0000-0000-0000000ba5f1'), 38, 'Fortschritt: 3 von 8 Schritten');
select is((public.baustellen_heute() -> 'baustellen' -> 0 ->> 'nummer'), 'BA-P1', 'Baustellen heute zeigt die Baustelle');
select ok((public.baustellen_heute() -> 'baustellen' -> 0 ->> 'rapport_gestern_fehlt')::boolean, 'fehlender Rapport von gestern fällt auf');
select ok(jsonb_array_length(public.zeiten_wochenblatt(date_trunc('week', current_date)::date) -> 'personen') >= 2,
  'Projektleitung sieht alle im Wochenblatt');
select ok(public.baustelle_auswertung(current_date - 30, current_date + 1) -> 'fertig' @> '[{"nummer": "BA-P1"}]',
  'Auswertung zählt die fertige Baustelle');

-- IBN: Seriennummern in die Anlage
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000ba5a1", "role": "authenticated"}', true);
select public.rapport_speichern('{"id": "00000000-0000-0000-0000-0000000ba513", "art": "ibn", "projekt_id": "00000000-0000-0000-0000-0000000ba5f1",
  "arbeiten": "IBN mit Elektriker"}');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000ba5b1'
            and titel_de like 'Rückfrage%'), 1, 'Rückfrage geht an den Monteur');
select public.rapport_abschliessen('00000000-0000-0000-0000-0000000ba513', '{"ohne_unterschrift": "Kunde nicht da"}');
reset role;
select ok((select komponenten @> '[{"seriennummer": "HW-123"}, {"seriennummer": "LU-9"}]' from public.anlagen
            where projekt_id = '00000000-0000-0000-0000-0000000ba5f1'), 'Seriennummern sind in der Anlage');

select * from finish();
rollback;
