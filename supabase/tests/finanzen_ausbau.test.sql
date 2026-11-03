-- Prüft «Finanzen vollständig» (Entscheid 0044): Gesellschaft und Prüfschritt neuer Lieferantenrechnungen,
-- «geprüft» (Visum der Eingangsrechnung) macht zahlbereit, Freigabe der Buchhaltung, Zahllauf mit
-- zweiter Person, Kontoauszug ohne Doppelte und mit erkannter Zahlung, MWST-Schätzung, Marge, Monatsabschluss.
-- Ausführen: npm run db:test
begin;
select plan(27);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'f39-bh@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'f39-gl@test.local'),
  ('00000000-0000-0000-0000-0000000039a3', 'f39-pl@test.local'),
  ('00000000-0000-0000-0000-0000000039a4', 'f39-vk@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000039b1', 'f39_bh', 'Erika Buchhaltung', '00000000-0000-0000-0000-0000000039a1', 'buchhaltung', '{}'),
  ('00000000-0000-0000-0000-0000000039b2', 'f39_gl', 'Gian Leitung', '00000000-0000-0000-0000-0000000039a2', 'buchhaltung', '{}'),
  ('00000000-0000-0000-0000-0000000039b3', 'f39_pl', 'Paul Projekt', '00000000-0000-0000-0000-0000000039a3', 'projektleitung', '{}'),
  ('00000000-0000-0000-0000-0000000039b4', 'f39_vk', 'Vera Verkauf', '00000000-0000-0000-0000-0000000039a4', 'verkauf', '{}');

insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000039c1', 'person', 'privat', 'Beat', 'Beispiel', 'de');
insert into public.projekte (id, nummer, kontakt_id, status, standort_id, vertragswert_rappen, verantwortlich_id) values
  ('00000000-0000-0000-0000-0000000039e1', '939001', '00000000-0000-0000-0000-0000000039c1', 'im_bau',
   (select id from public.standorte where kuerzel = 'muri'), 5405000, '00000000-0000-0000-0000-0000000039b3');

-- Neue Lieferantenrechnung wie aus dem AbaNinja-Abgleich: wartet auf Freigabe, Gesellschaft vom Projekt.
insert into public.kreditor_zahlungen (id, firma, text, betrag_rappen, faellig_am, status, quelle, projekt_id, offen_rappen, rechnung_am) values
  ('00000000-0000-0000-0000-0000000039d1', 'Krannich Solar AG', 'Module 939001', 1932000, current_date + 10, 'offen', 'abaninja',
   '00000000-0000-0000-0000-0000000039e1', 1932000, current_date),
  ('00000000-0000-0000-0000-0000000039d2', 'Swisscom', 'Telefon', 68420, current_date + 5, 'offen', 'abaninja', null, 68420, current_date),
  ('00000000-0000-0000-0000-0000000039d3', 'Elektro Huber', 'Kabel', 120000, current_date + 20, 'offen', 'abaninja', null, 120000, current_date);
select is((select pruefung from public.kreditor_zahlungen where id = '00000000-0000-0000-0000-0000000039d1'), 'freigabe',
  'neue Rechnung aus AbaNinja wartet auf die Freigabe');
select is((select pruefung from public.kreditor_zahlungen where id = '00000000-0000-0000-0000-0000000039d2'), 'freigabe',
  'auch ohne Projekt zuerst zur Freigabe');
select is((select firma_id from public.kreditor_zahlungen where id = '00000000-0000-0000-0000-0000000039d1'),
  (select firma_id from public.standorte where kuerzel = 'muri'), 'Gesellschaft aus dem Standort des Projekts');
update public.kreditor_zahlungen set geprueft = true where id = '00000000-0000-0000-0000-0000000039d3';
select is((select pruefung from public.kreditor_zahlungen where id = '00000000-0000-0000-0000-0000000039d3'), 'bereit',
  'geprüft (Visum der Eingangsrechnung) macht zahlbereit');

set local role authenticated;

-- Verkauf: sieht nichts und darf nichts freigeben.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a4", "role": "authenticated"}', true);
select is((select count(*)::int from public.kreditor_zahlungen), 0, 'ohne Recht finanzen keine Tabelle der Zahlungen');
select throws_ok($$ select public.kreditor_pruefung('00000000-0000-0000-0000-0000000039d1', 'bereit') $$,
  'P0001', 'finanzen.kein_recht', 'Freigabe nur mit Recht finanzen');
select is((select count(*)::int from public.zahllaeufe), 0, 'Verkauf sieht keine Zahlläufe');
select is((select count(*)::int from public.finanz_konten), 0, 'Verkauf sieht keine Konten');
select throws_ok($$ select public.kreditor_pruefung('00000000-0000-0000-0000-0000000039d1', 'visum') $$,
  'P0001', 'finanzen.kein_recht', 'auch ein unbekannter Schritt scheitert ohne Recht');
select is((select count(*)::int from public.mwst_abrechnungen), 0, 'Verkauf sieht keine MWST');

-- Buchhaltung: freigeben, Zahllauf vorbereiten.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);
select throws_ok($$ select public.kreditor_pruefung('00000000-0000-0000-0000-0000000039d1', 'visum') $$,
  'P0001', 'finanzen.schritt_falsch', 'Visum ist kein Schritt der Finanzen');
select throws_ok($$ select public.zahllauf_anlegen((select id from public.firmen where kuerzel = 'gmbh'), null, current_date,
  array['00000000-0000-0000-0000-0000000039d1']::uuid[]) $$,
  'P0001', 'finanzen.zahllauf_ungueltig', 'nicht freigegebene Rechnung kommt in keinen Zahllauf');
select throws_ok($$ select public.kreditor_pruefung('00000000-0000-0000-0000-0000000039d2', 'zurueckgehalten') $$,
  'P0001', 'finanzen.grund_fehlt', 'Zurückhalten braucht einen Grund');
select lives_ok($$ select public.kreditor_pruefung('00000000-0000-0000-0000-0000000039d1', 'bereit') $$, 'Buchhaltung gibt frei');
update public.kreditor_zahlungen set skonto_prozent = 2, skonto_bis = current_date + 3 where id = '00000000-0000-0000-0000-0000000039d1';
select is((select skonto_rappen from public.kreditor_zahlungen where id = '00000000-0000-0000-0000-0000000039d1'), 38640::bigint,
  'Skonto in Franken gerechnet');
insert into public.finanz_konten (id, firma_id, name, iban, stand_rappen, stand_am) values
  ('00000000-0000-0000-0000-0000000039f1', (select id from public.firmen where kuerzel = 'gmbh'), 'UBS Muri',
   'CH93 0027 3273 1234 5678 9', 10000000, current_date - 3);
create temp table t_zl on commit drop as
  select public.zahllauf_anlegen((select id from public.firmen where kuerzel = 'gmbh'), '00000000-0000-0000-0000-0000000039f1',
         current_date + 1, array['00000000-0000-0000-0000-0000000039d1']::uuid[]) as id;
select is((select count(*)::int from public.kreditor_zahlungen where zahllauf_id = (select id from t_zl)), 1, 'Zahllauf vorbereitet');
select throws_ok($$ select public.zahllauf_freigeben((select id from t_zl)) $$,
  'P0001', 'finanzen.vier_augen', 'wer vorbereitet, gibt nicht frei');
select throws_ok($$ select public.kreditor_pruefung('00000000-0000-0000-0000-0000000039d1', 'klaeren', 'x') $$,
  'P0001', 'finanzen.im_zahllauf', 'Rechnung im Zahllauf bleibt fest');

-- Zweite Person gibt frei.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true);
select lives_ok($$ select public.zahllauf_freigeben((select id from t_zl)) $$, 'zweite Person gibt frei');

-- Kontoauszug: Ausgang mit Betrag minus Skonto setzt die Rechnung auf bezahlt, zweimal einlesen ergibt keine Doppelten.
select is(public.kontoauszug_einlesen('00000000-0000-0000-0000-0000000039f1', 8106640, current_date,
  '[{"datum": "2026-11-03", "betrag_rappen": -1893360, "text": "Krannich", "bank_referenz": "A1"},
    {"datum": "2026-11-03", "betrag_rappen": 2840000, "text": "Gerber", "bank_referenz": "A2"}]'),
  '{"neu": 2, "bezahlt": 1}'::jsonb, 'Auszug: zwei Buchungen, eine Zahlung erkannt');
select is(public.kontoauszug_einlesen('00000000-0000-0000-0000-0000000039f1', 8106640, current_date,
  '[{"datum": "2026-11-03", "betrag_rappen": -1893360, "text": "Krannich", "bank_referenz": "A1"}]'),
  '{"neu": 0, "bezahlt": 0}'::jsonb, 'derselbe Auszug noch einmal: nichts doppelt');
select is((select status from public.kreditor_zahlungen where id = '00000000-0000-0000-0000-0000000039d1'), 'bezahlt',
  'Rechnung bezahlt');
select is((select stand_rappen from public.finanz_konten where id = '00000000-0000-0000-0000-0000000039f1'), 8106640::bigint,
  'Kontostand aus dem Auszug');

-- MWST: Vorsteuer aus der Lieferantenrechnung im laufenden Quartal, verbindlicher Betrag ersetzt die Schätzung.
-- 19'320.00 inkl. 8.1 % → Vorsteuer 1'447.66 (die Rechnung ohne Gesellschaft zählt nicht).
select is((select vorsteuer_rappen from public.mwst_schaetzung(current_date, current_date)
            where firma_id = (select id from public.firmen where kuerzel = 'gmbh')), 144766::bigint,
  'Vorsteuer aus Lieferantenrechnungen geschätzt');
insert into public.mwst_abrechnungen (firma_id, periode, betrag_rappen, faellig_am)
  select id, to_char(current_date, 'YYYY') || '-Q' || extract(quarter from current_date)::int, 123400, current_date + 60
    from public.firmen where kuerzel = 'gmbh';
select is((select zahllast_rappen || '|' || verbindlich from public.mwst_schaetzung(current_date, current_date)
            where firma_id = (select id from public.firmen where kuerzel = 'gmbh')), '123400|true',
  'verbindlicher Betrag aus AbaNinja gilt');

-- Marge und Monatsabschluss.
select is((select umsatz_rappen from public.marge_uebersicht() where nummer = '939001'), 5000000::bigint,
  'Marge: Umsatz exkl. MWST');
select is((public.monatsabschluss_stand(to_char(current_date, 'YYYY-MM')) ->> 'pruefung_offen')::int >= 1, true,
  'Abschluss zählt offene Prüfungen');

select * from finish();
rollback;
