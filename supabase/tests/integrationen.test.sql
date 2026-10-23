-- Prüft Phase 8: Ausgangskorb (anlegen, prüfen, ändern, freigeben, verwerfen, nie doppelt), SMS-Erinnerung
-- am Vortag (eine pro Termin, «automatisch» nur vom Zeitplan), Rechte der Server-Funktionen und die
-- Übernahme von Anfragen aus Mails (Dubletten über die Mail-Kennung), verschobene Outlook-Termine.
-- Ausführen: npm run db:test
begin;
select plan(26);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000008a1', 'i8-verkauf@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000008b1', 'i8_verkauf', 'Vera Testverkauf', '00000000-0000-0000-0000-0000000008a1', 'verkauf', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000008a1", "role": "authenticated"}', true);

-- Ausgangskorb: Prüfungen beim Anlegen
select throws_ok($$ select public.ausgang_anlegen('{"kanal": "mail", "an": "kein-mail", "betreff": "x", "text": "y"}') $$,
  'ausgang.adresse_ungueltig', 'ungültige Mail-Adresse wird abgelehnt');
select throws_ok($$ select public.ausgang_anlegen('{"kanal": "mail", "an": "a@b.ch", "text": "y"}') $$,
  'ausgang.betreff_fehlt', 'Mail ohne Betreff wird abgelehnt');
select throws_ok($$ select public.ausgang_anlegen('{"kanal": "sms", "an": "12", "text": "y"}') $$,
  'ausgang.nummer_ungueltig', 'SMS an eine ungültige Nummer wird abgelehnt');
select throws_ok($$ select public.ausgang_anlegen('{"kanal": "fax", "an": "a@b.ch"}') $$,
  'ausgang.kanal', 'unbekannte Versandart wird abgelehnt');

create temporary table t8 (name text primary key, id uuid) on commit drop;
grant all on t8 to authenticated;
insert into t8 select 'mail', public.ausgang_anlegen(
  '{"kanal": "mail", "an": "kunde@beispiel.test", "betreff": "Offerte", "text": "Guten Tag", "schluessel": "t8:eins"}');
select is((select status from public.ausgangskorb where id = (select id from t8 where name = 'mail')), 'wartet',
  'ohne Freigabe wartet die Mail');
select is((select absender_person_id from public.ausgangskorb where id = (select id from t8 where name = 'mail')),
  '00000000-0000-0000-0000-0000000008b1'::uuid, 'Absender ist die Person, die die Mail erstellt');
select throws_ok($$ select public.ausgang_anlegen(
  '{"kanal": "mail", "an": "kunde@beispiel.test", "betreff": "Offerte", "text": "x", "schluessel": "t8:eins"}') $$,
  'ausgang.doppelt', 'dieselbe Nachricht kommt nicht zweimal in den Ausgangskorb');

select lives_ok(format($$ select public.ausgang_aendern(%L, '{"betreff": "Ihre Offerte", "cc": "chef@beispiel.test"}') $$,
  (select id from t8 where name = 'mail')), 'vor der Freigabe lässt sich die Mail ändern');
select is((select betreff || ' / ' || cc from public.ausgangskorb where id = (select id from t8 where name = 'mail')),
  'Ihre Offerte / chef@beispiel.test', 'Änderung ist gespeichert');
select is(public.ausgang_freigeben(array[(select id from t8 where name = 'mail')]), 1, 'Freigabe zählt einen Eintrag');
select is((select freigegeben_von from public.ausgangskorb where id = (select id from t8 where name = 'mail')),
  '00000000-0000-0000-0000-0000000008b1'::uuid, 'die Freigabe hält fest, wer freigegeben hat');
select throws_ok(format($$ select public.ausgang_aendern(%L, '{"text": "anders"}') $$, (select id from t8 where name = 'mail')),
  'ausgang.nicht_aenderbar', 'freigegebene Mails ändert niemand mehr');

insert into t8 select 'sms', public.ausgang_anlegen('{"kanal": "sms", "an": "079 123 45 67", "text": "Hallo", "freigeben": true}');
select is((select an || ' ' || status from public.ausgangskorb where id = (select id from t8 where name = 'sms')),
  '+41791234567 freigegeben', 'SMS-Nummer im Format +41, «Senden» im Dialog ist die Freigabe');
select lives_ok(format($$ select public.ausgang_verwerfen(%L, 'doch nicht') $$, (select id from t8 where name = 'sms')),
  'freigegebene SMS lässt sich vor dem Versand noch verwerfen');

-- Server-Funktionen sind für die App gesperrt
select throws_ok($$ select * from public.ausgang_holen(1) $$, '42501', null, 'nur der Server holt Einträge zum Senden');
select throws_ok($$ select public.anfrage_uebernehmen('{}') $$, '42501', null, 'nur der Server übernimmt Anfragen aus Mails');
select throws_ok($$ select public.ms_verbindung_lesen('00000000-0000-0000-0000-0000000008b1') $$, '42501', null,
  'Microsoft-Token liest nur der Server');
select is((select count(*)::int from public.integrations_protokoll), 0, 'das Protokoll der Dienste sehen nur Admins');
select is(public.meine_microsoft_verbindung(), null, 'ohne Verbindung: keine Angaben');

-- SMS-Erinnerung am Vortag: eine pro Termin
insert into t8 select 'lead', public.lead_anlegen(jsonb_build_object(
  'kontakt', jsonb_build_object('vorname', 'Sina', 'nachname', 'Testsms8', 'telefon', '079 888 00 08'),
  'objekt', jsonb_build_object('strasse', 'Testweg 8', 'plz', '5630', 'ort', 'Muri AG'),
  'lead', jsonb_build_object('quelle', 'website', 'interesse', jsonb_build_array('pv'))));
select public.lead_kontakt_erfassen((select id from t8 where name = 'lead'), 'anruf', 'aus', 'termin', 'Besuch',
  jsonb_build_object('termin_am', ((current_date + 1)::text || ' 10:00')::timestamp at time zone 'Europe/Zurich',
                     'person_id', '00000000-0000-0000-0000-0000000008b1'));
select ok((select handy and text like '%Testsms8%' from public.sms_erinnerungen(current_date + 1)
            where verkaufschance_id = (select id from t8 where name = 'lead')), 'Termin von morgen mit Text und Handynummer');
select is(public.sms_erinnerungen_senden(current_date + 1, array[(select id from t8 where name = 'lead')]), 1,
  '«Senden» legt die SMS in den Ausgangskorb');
select is(public.sms_erinnerungen_senden(current_date + 1, array[(select id from t8 where name = 'lead')]), 0,
  'ein zweites «Senden» legt keine zweite SMS an');
select throws_ok($$ select public.sms_erinnerungen_senden(current_date + 1, null, true) $$, 'recht.fehlt',
  '«automatisch» darf nur der Zeitplan sagen');

-- Anfrage aus einer Mail (als Server): Dublette über die Mail-Kennung
reset role;
select is((public.anfrage_uebernehmen(jsonb_build_object('kennung', '<t8@beispiel.test>', 'quelle', 'solar-guide',
  'kontakt', jsonb_build_object('vorname', 'Max', 'nachname', 'Testanfrage8', 'email', 'max8@beispiel.test'),
  'objekt', jsonb_build_object('plz', '5630', 'ort', 'Muri AG'), 'lead', '{}')) ->> 'ergebnis')
  || '/' || (public.anfrage_uebernehmen(jsonb_build_object('kennung', '<t8@beispiel.test>', 'quelle', 'solar-guide',
  'kontakt', jsonb_build_object('vorname', 'Max', 'nachname', 'Testanfrage8'), 'objekt', '{}', 'lead', '{}')) ->> 'ergebnis'),
  'neu/schon', 'dieselbe Mail legt nur einmal einen Lead an');

-- Outlook-Abgleich: ein Termin, der aus der Vergangenheit in die Zukunft verschoben wurde, kommt mit
insert into public.kalender_eintraege (person_id, beginn, ende, betreff, quelle, extern_id) values
  ('00000000-0000-0000-0000-0000000008b1', now() - interval '10 days', now() - interval '10 days' + interval '1 hour',
   'Alt', 'outlook', 't8-verschoben');
select is(public.kalender_abgleichen('00000000-0000-0000-0000-0000000008b1', now(), now() + interval '7 days',
  jsonb_build_array(jsonb_build_object('extern_id', 't8-verschoben', 'betreff', 'Neu',
    'beginn', now() + interval '2 days', 'ende', now() + interval '2 days 1 hour'))),
  1, 'verschobener Outlook-Termin wird übernommen');
select is((select string_agg(betreff, ',') from public.kalender_eintraege
            where extern_id = 't8-verschoben' and geloescht_am is null),
  'Neu', 'und ersetzt die alte Zeile');

select * from finish();
rollback;
