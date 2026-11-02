-- Prüft «Rechnungen vollständig» (2.11.2026): Ausbuchen bis «bezahlt», Mahnsperre und Zusage im Mahnlauf,
-- Freigabe von Mahnungen nur durch die Freigabe-Person, Erinnerung beim Senden, «Verrechnen auslösen» nur durch den
-- zuständigen Projektleiter nach dem Meilenstein (Entwurf und Glocke für die Buchhaltung), Zahlungsstand für die
-- Projektleitung, Eingangsrechnungen mit Erst- und Zweitvisum (vier Augen), Übernahme aus dem AbaNinja-Abgleich.
-- Ausführen: npm run db:test
begin;
select plan(30);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000051a1', 're-bh@test.local'),
  ('00000000-0000-0000-0000-0000000051a2', 're-pl@test.local'),
  ('00000000-0000-0000-0000-0000000051a3', 're-pl2@test.local'),
  ('00000000-0000-0000-0000-0000000051a4', 're-gl@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, erstellt_am) values
  ('00000000-0000-0000-0000-0000000051b1', 're_bh', 'Bea Buchhaltung', '00000000-0000-0000-0000-0000000051a1', 'buchhaltung', '{}', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000051b2', 're_pl', 'Paul Projekt', '00000000-0000-0000-0000-0000000051a2', 'projektleitung', '{}', now()),
  ('00000000-0000-0000-0000-0000000051b3', 're_pl2', 'Petra Projekt', '00000000-0000-0000-0000-0000000051a3', 'projektleitung', '{}', now()),
  ('00000000-0000-0000-0000-0000000051b4', 're_gl', 'Gina Leitung', '00000000-0000-0000-0000-0000000051a4', 'verkauf', '{}', now());
update public.einstellungen
   set wert = jsonb_set(jsonb_set(wert, '{mahnlauf,freigabe_person_ids}', '["00000000-0000-0000-0000-0000000051b4"]'),
                        '{eingang,gl_person_ids}', '["00000000-0000-0000-0000-0000000051b4", "00000000-0000-0000-0000-0000000051b2"]')
 where schluessel = 'finanzen';

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a1", "role": "authenticated"}', true);
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache, email) values
  ('00000000-0000-0000-0000-0000000051c1', 'person', 'privat', 'Rita', 'Rechnung', 'de', 'rita@beispiel.test');
insert into public.projekte (id, nummer, kontakt_id, status, bau_status, standort_id, vertragswert_rappen, verantwortlich_id) values
  ('00000000-0000-0000-0000-0000000051e1', '951001', '00000000-0000-0000-0000-0000000051c1', 'im_bau', 'terminiert',
   (select id from public.standorte where kuerzel = 'muri'), 2000000, '00000000-0000-0000-0000-0000000051b2');
insert into public.zahlungsplan (id, projekt_id, bezeichnung, betrag_rappen, faellig_am) values
  ('00000000-0000-0000-0000-0000000051f1', '00000000-0000-0000-0000-0000000051e1', '30 % bei Vertragsunterzeichnung', 600000, current_date - 40),
  ('00000000-0000-0000-0000-0000000051f2', '00000000-0000-0000-0000-0000000051e1', '70 % nach Inbetriebnahme', 1400000, null);
-- Eine gestellte, seit 40 Tagen fällige Rechnung aus der ersten Tranche.
create temp table t_r (name text primary key, id uuid) on commit drop;
grant all on t_r to authenticated;
insert into t_r select 'anz', public.rechnung_entwurf('{"zahlungsplan_id": "00000000-0000-0000-0000-0000000051f1"}');
select public.rechnung_stellen((select id from t_r where name = 'anz'), current_date - 70);

set local role authenticated;

-- Buchhaltung: Mahnlauf, Mahnsperre, Ausbuchen ------------------------------------------------------------------
select is((select stufe || '|' || aktion from public.mahnlauf_vorschlag() where rechnung_id = (select id from t_r where name = 'anz')),
  '0|senden', 'Mahnlauf schlägt zuerst die freundliche Erinnerung vor');
select public.rechnung_mahnsperre((select id from t_r where name = 'anz'), current_date + 10, 'Reklamation Speicher');
select is((select aktion || '|' || grund from public.mahnlauf_vorschlag() where rechnung_id = (select id from t_r where name = 'anz')),
  'ueberspringen|sperre', 'Mahnsperre: übersprungen mit Grund');
select throws_ok(format('select public.rechnung_mahnsperre(%L, current_date + 3, %L)', (select id from t_r where name = 'anz'), ''),
  'P0001', 'finanzen.grund_fehlt', 'Mahnsperre braucht einen Grund');
select public.rechnung_mahnsperre((select id from t_r where name = 'anz'), null, null);
select throws_ok(format($q$select public.ausgang_anlegen(jsonb_build_object('art', 'zahlungserinnerung', 'an', 'rita@beispiel.test',
  'betreff', 'Erinnerung', 'text', 'x', 'bezug_tabelle', 'rechnungen', 'bezug_id', %L, 'freigeben', true))$q$,
  (select id from t_r where name = 'anz')), 'P0001', 'finanzen.mahnung_nur_freigeber', 'Buchhaltung darf Erinnerung nicht freigeben');
select ok(not public.mahnung_darf_freigeben(), 'Buchhaltung ist nicht Freigabe-Person');
select throws_ok(format('select public.rechnung_mahnen(%L)', (select id from t_r where name = 'anz')),
  'P0001', 'finanzen.mahnung_nur_freigeber', 'auch per Post mahnt nur die Freigabe-Person');
insert into t_r select 'ag', public.ausgang_anlegen(jsonb_build_object('art', 'zahlungserinnerung', 'an', 'rita@beispiel.test',
  'betreff', 'Erinnerung', 'text', 'x', 'bezug_tabelle', 'rechnungen', 'bezug_id', (select id from t_r where name = 'anz')));
select is((select aktion || '|' || grund from public.mahnlauf_vorschlag() where rechnung_id = (select id from t_r where name = 'anz')),
  'ueberspringen|unterwegs', 'wartende Erinnerung im Ausgangskorb: nicht doppelt');

-- Freigabe-Person (Gina) gibt frei, Versand setzt «erinnert»
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a4", "role": "authenticated"}', true);
select ok(public.mahnung_darf_freigeben(), 'Gina ist Freigabe-Person');
select lives_ok(format('select public.ausgang_freigeben(array[%L]::uuid[])', (select id from t_r where name = 'ag')),
  'Freigabe-Person gibt die Erinnerung frei');
reset role;
update public.ausgangskorb set status = 'gesendet', gesendet_am = now() where id = (select id from t_r where name = 'ag');
select is((select erinnert_am from public.rechnungen where id = (select id from t_r where name = 'anz')), current_date,
  'gesendete Erinnerung: Datum gemerkt, Stufe bleibt 0');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a1", "role": "authenticated"}', true);

select throws_ok(format('select public.rechnung_ausbuchen(%L, 999999999, %L, %L)', (select id from t_r where name = 'anz'), 'rundung', 'x'),
  'P0001', 'finanzen.betrag_ungueltig', 'nicht mehr ausbuchen als offen');
insert into public.rechnung_zahlungen (rechnung_id, betrag_rappen, datum)
  values ((select id from t_r where name = 'anz'), 599980, current_date);
select is((select status from public.rechnungen where id = (select id from t_r where name = 'anz')), 'teilbezahlt', 'Zahlung 20 Rappen zu wenig');
select public.rechnung_ausbuchen((select id from t_r where name = 'anz'), 20, 'rundung', 'Rundung Bank');
select is((select status || '|' || offen_rappen from public.rechnungen_liste where id = (select id from t_r where name = 'anz')),
  'bezahlt|0', 'nach dem Ausbuchen bezahlt, nichts mehr offen');
select ok((select bezahlt_am is not null from public.zahlungsplan where id = '00000000-0000-0000-0000-0000000051f1'),
  'Tranche im Zahlungsplan bezahlt');
select ok((select count(*) >= 2 from jsonb_array_elements(public.rechnung_verlauf((select id from t_r where name = 'anz')))),
  'Verlauf enthält Ereignisse und Zahlung');

-- Verrechnen auslösen ------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a3", "role": "authenticated"}', true);
select throws_ok($$ select public.tranche_verrechnen('00000000-0000-0000-0000-0000000051f2') $$,
  'P0001', 'finanzen.nur_projektleiter', 'anderer Projektleiter darf nicht auslösen');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a2", "role": "authenticated"}', true);
select throws_ok($$ select public.tranche_verrechnen('00000000-0000-0000-0000-0000000051f2') $$,
  'P0001', 'finanzen.meilenstein_offen', 'vor der Inbetriebnahme noch nicht');
reset role;
update public.projekte set bau_status = 'fertig' where id = '00000000-0000-0000-0000-0000000051e1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a2", "role": "authenticated"}', true);
select is((select (t ->> 'bezeichnung') || '|' || (t -> 'meilenstein' ->> 'erreicht')
             from jsonb_array_elements(public.zahlungsstand_projekte()) p, jsonb_array_elements(p -> 'tranchen') t
            where t ->> 'id' = '00000000-0000-0000-0000-0000000051f2'),
  '70 % nach Inbetriebnahme|true', 'Projektleiter sieht seinen Zahlungsstand, Meilenstein erreicht');
insert into t_r select 'sch', public.tranche_verrechnen('00000000-0000-0000-0000-0000000051f2');
select is((select auth.uid()), '00000000-0000-0000-0000-0000000051a2'::uuid, 'danach wieder als Projektleiter angemeldet');
select is((select count(*)::int from public.rechnungen_liste), 0, 'Projektleiter sieht die Rechnungsliste nicht');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a1", "role": "authenticated"}', true);
select is((select status || '|' || art from public.rechnungen where id = (select id from t_r where name = 'sch')), 'entwurf|schluss',
  'Buchhaltung findet den Entwurf der Schlussrechnung');
select ok((select verrechnen_ausgeloest_von = '00000000-0000-0000-0000-0000000051b2' from public.zahlungsplan
            where id = '00000000-0000-0000-0000-0000000051f2'), 'Auslösung mit Person gemerkt');
reset role;
select ok(exists (select 1 from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000051b1'
                    and ziel = '/invoices?rechnung=' || (select id from t_r where name = 'sch')), 'Glocke für die Buchhaltung');
set local role authenticated;

-- Eingangsrechnungen ------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a1", "role": "authenticated"}', true);
insert into t_r select 'ein', public.eingang_speichern(null, jsonb_build_object('lieferant', 'Krannich Solar AG', 'nummer', 'RE 1',
  'betrag_rappen', 1428620, 'projekt_id', '00000000-0000-0000-0000-0000000051e1'));
select is((select status || '|' || visum_gl_noetig from public.eingangsrechnungen where id = (select id from t_r where name = 'ein')),
  'visum_pl|true', 'mit Projekt direkt zum Erstvisum, ohne Bestellung braucht es die GL');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a3", "role": "authenticated"}', true);
select is((select count(*)::int from public.eingangsrechnungen_liste where id = (select id from t_r where name = 'ein')), 0,
  'anderer Projektleiter sieht die Rechnung nicht');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a2", "role": "authenticated"}', true);
select is(public.eingang_visieren((select id from t_r where name = 'ein'), true, 'Fracht prüfen'), 'visum_gl',
  'Erstvisum durch den Projektleiter, weiter zur GL');
select throws_ok(format('select public.eingang_visieren(%L, true, null)', (select id from t_r where name = 'ein')),
  'P0001', 'finanzen.vier_augen', 'Zweitvisum nicht durch dieselbe Person');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000051a4", "role": "authenticated"}', true);
select is(public.eingang_visieren((select id from t_r where name = 'ein'), true, null), 'bereit', 'Zweitvisum der GL: bereit');

-- Aus dem Abgleich mit AbaNinja (Kreditor-Zahlung) entsteht eine Eingangsrechnung
reset role;
insert into public.kreditor_zahlungen (firma, betrag_rappen, offen_rappen, status, quelle, abaninja_uuid, projekt_id, rechnung_nr)
values ('Tritec AG', 300000, 300000, 'offen', 'abaninja', 'test-uuid-951', '00000000-0000-0000-0000-0000000051e1', 'INV-9');
select is((select status || '|' || visum_pl_person_id from public.eingangsrechnungen where abaninja_uuid = 'test-uuid-951'),
  'visum_pl|00000000-0000-0000-0000-0000000051b2', 'Beleg aus AbaNinja kommt zum Projektleiter');
update public.kreditor_zahlungen set status = 'bezahlt', offen_rappen = 0, bezahlt_am = current_date where abaninja_uuid = 'test-uuid-951';
select is((select status from public.eingangsrechnungen where abaninja_uuid = 'test-uuid-951'), 'bezahlt',
  'Abgleich setzt bezahlt');

select * from finish();
rollback;
