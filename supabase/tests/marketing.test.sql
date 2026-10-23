-- Prüft Phase 11: Zielgruppe (Gruppe, Versandgrund, Sperre), Abmelden in der App und per Link, Serien-Mail über den
-- Ausgangskorb (abgemeldete und doppelte fallen weg, freigegeben), Newsletter-Empfänger nach Segment und nie zweimal,
-- Serienbrief im Verlauf, Social-Post-Freigabe (Text, Länge, Bild, Verbindung), Veröffentlichen nur durch den Server,
-- Ergebnis je Netzwerk, Tokens unsichtbar, CI-Stil nur Admin.
-- Ausführen: npm run db:test
begin;
select plan(30);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000011a1', 'p11-vk@test.local'),
  ('00000000-0000-0000-0000-0000000011a2', 'p11-ad@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000011b1', 'p11_vk', 'Mara Marketing', '00000000-0000-0000-0000-0000000011a1', 'verkauf', '{}'),
  ('00000000-0000-0000-0000-0000000011b2', 'p11_ad', 'Adrian Admin', '00000000-0000-0000-0000-0000000011a2', 'admin', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, email, sprache, einwilligung, werbesperre) values
  ('00000000-0000-0000-0000-0000000011c1', 'person', 'privat', 'Anna', 'Kundin', 'anna@beispiel.test', 'de', null, false),
  ('00000000-0000-0000-0000-0000000011c2', 'person', 'privat', 'Luc', 'Exemple', 'luc@beispiel.test', 'fr',
   '{"datum": "2026-05-02", "quelle": "Messe Bulle"}', false),
  ('00000000-0000-0000-0000-0000000011c3', 'person', 'privat', 'Otto', 'Ohnegrund', 'otto@beispiel.test', 'de', null, false),
  ('00000000-0000-0000-0000-0000000011c4', 'person', 'privat', 'Gabi', 'Gesperrt', 'gabi@beispiel.test', 'de',
   '{"datum": "2026-05-02", "quelle": "Webseite"}', true);
insert into public.projekte (id, nummer, kontakt_id, status, bau_status, standort_id) values
  ('00000000-0000-0000-0000-0000000011e1', '911001', '00000000-0000-0000-0000-0000000011c1', 'im_bau', 'terminiert',
   (select id from public.standorte where kuerzel = 'muri'));
insert into public.newsletter_empfaenger (id, email, name, einwilligung) values
  ('00000000-0000-0000-0000-0000000011d1', 'Neu@Beispiel.test', 'Nina Neu', '{"datum": "2026-06-01", "quelle": "Formular", "sprache": "de"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000011a1", "role": "authenticated"}', true);

-- Zielgruppe
select is((select gruppe from public.marketing_zielgruppe where id = '00000000-0000-0000-0000-0000000011c1'), 'kunde',
  'Projekt im Bau: Gruppe Kunde');
select is((select versandgrund from public.marketing_zielgruppe where id = '00000000-0000-0000-0000-0000000011c1'), 'kunde',
  'Kunde hat einen Versandgrund');
select is((select versandgrund from public.marketing_zielgruppe where id = '00000000-0000-0000-0000-0000000011c2'), 'einwilligung',
  'Einwilligung mit Datum ist ein Versandgrund');
select is((select versandgrund from public.marketing_zielgruppe where id = '00000000-0000-0000-0000-0000000011c3'), null,
  'ohne Kauf und ohne Einwilligung kein Versandgrund');
select is((select standort from public.marketing_zielgruppe where id = '00000000-0000-0000-0000-0000000011c1'), 'muri',
  'Standort aus dem Projekt');

-- Abmelden in der App
select public.marketing_sperre('00000000-0000-0000-0000-0000000011c3', true, 'will keine Werbung');
select ok((select werbesperre from public.kontakte where id = '00000000-0000-0000-0000-0000000011c3'), 'Abmelden setzt die Werbesperre');
select is((select count(*)::int from public.aktivitaeten where kontakt_id = '00000000-0000-0000-0000-0000000011c3'
            and details ->> 'marketing' = 'abgemeldet'), 1, 'Abmelden steht im Verlauf');
select throws_ok($$ select public.marketing_einwilligung('00000000-0000-0000-0000-0000000011c3', current_date, ' ') $$,
  'P0001', 'marketing.einwilligung_unvollstaendig', 'Einwilligung braucht Datum und Nachweis');

-- Serien-Mail
select is((public.marketing_senden($j${"art": "serienmail", "betreff": "Neuigkeiten", "mails": [
  {"kontakt_id": "00000000-0000-0000-0000-0000000011c1", "an": "anna@beispiel.test", "betreff": "Neuigkeiten", "text": "Guten Tag Anna Kundin", "sprache": "de"},
  {"kontakt_id": "00000000-0000-0000-0000-0000000011c1", "an": "ANNA@beispiel.test", "betreff": "Neuigkeiten", "text": "doppelt", "sprache": "de"},
  {"kontakt_id": "00000000-0000-0000-0000-0000000011c4", "an": "gabi@beispiel.test", "betreff": "Neuigkeiten", "text": "gesperrt", "sprache": "de"}
]}$j$) ->> 'angelegt')::int, 1, 'Serien-Mail: doppelte Adresse und abgemeldeter Kontakt fallen weg');
select is((select status from public.ausgangskorb where an = 'anna@beispiel.test' and art = 'serienmail'), 'freigegeben',
  'Serien-Mail liegt freigegeben im Ausgangskorb (Klick auf Senden = Freigabe)');
select is((select anzahl from public.kampagnen where art = 'serienmail' and betreff = 'Neuigkeiten'), 1,
  'Serien-Mail steht in «Letzte Aktionen» mit Anzahl');
select throws_ok($$ select public.marketing_senden('{"art": "serienmail", "mails": []}') $$,
  'P0001', 'marketing.keine_empfaenger', 'ohne Empfänger kein Versand');

-- Serienbrief
select ok(public.marketing_vermerken('serienbrief', 'Ihre Solaranlage', '{00000000-0000-0000-0000-0000000011c1}') is not null,
  'Serienbrief vermerken');
select is((select count(*)::int from public.aktivitaeten where kontakt_id = '00000000-0000-0000-0000-0000000011c1' and art = 'brief'), 1,
  'Serienbrief steht im Verlauf des Kontakts');

-- Newsletter
insert into public.newsletter (id, thema, segment, text_de, text_fr, betreff_de, betreff_fr) values
  ('00000000-0000-0000-0000-0000000011f1', 'Winterstrom', '{"gruppen": [], "einzelne": true}', 'Text', 'Texte', 'Winter', 'Hiver');
select is((select count(*)::int from public.newsletter_empfaenger_fuer('00000000-0000-0000-0000-0000000011f1')
            where email in ('anna@beispiel.test', 'luc@beispiel.test', 'neu@beispiel.test', 'otto@beispiel.test', 'gabi@beispiel.test')), 3,
  'Newsletter: Kundin, Einwilligung und Einzel-Empfänger; nicht ohne Grund, nicht abgemeldet');
update public.newsletter set segment = '{"sprache": "fr", "einzelne": false}' where id = '00000000-0000-0000-0000-0000000011f1';
select is((select array_agg(email) from public.newsletter_empfaenger_fuer('00000000-0000-0000-0000-0000000011f1')
            where email like '%@beispiel.test'), '{luc@beispiel.test}', 'Segment nach Sprache');
select is((public.marketing_senden($j${"art": "newsletter", "newsletter_id": "00000000-0000-0000-0000-0000000011f1", "betreff": "Hiver", "mails": [
  {"kontakt_id": "00000000-0000-0000-0000-0000000011c2", "an": "luc@beispiel.test", "betreff": "Hiver", "text": "Bonjour Luc Exemple,", "sprache": "fr"}]}$j$) ->> 'angelegt')::int,
  1, 'Newsletter senden');
select ok((select erhalten from public.newsletter_empfaenger_fuer('00000000-0000-0000-0000-0000000011f1') where email = 'luc@beispiel.test'),
  'danach als «erhalten» markiert');
select is((public.marketing_senden($j${"art": "newsletter", "newsletter_id": "00000000-0000-0000-0000-0000000011f1", "betreff": "Hiver", "mails": [
  {"kontakt_id": "00000000-0000-0000-0000-0000000011c2", "an": "luc@beispiel.test", "betreff": "Hiver", "text": "nochmals", "sprache": "fr"}]}$j$) ->> 'uebersprungen')::int,
  1, 'Newsletter geht nie zweimal an dieselbe Adresse');
select is((select status from public.newsletter where id = '00000000-0000-0000-0000-0000000011f1'), 'versendet', 'Newsletter ist versendet');

-- Social Media
insert into public.social_posts (id, thema, netzwerke, sprache, texte) values
  ('00000000-0000-0000-0000-000000001191', 'Winterstrom', '{instagram,linkedin}', 'de', '{"instagram": {"de": "Hallo"}}');
select throws_ok($$ select public.social_freigeben('00000000-0000-0000-0000-000000001191') $$,
  'P0001', 'social.bild_fehlt', 'Instagram braucht ein Bild');
update public.social_posts set bilder = '["00000000-0000-0000-0000-000000000001"]' where id = '00000000-0000-0000-0000-000000001191';
select throws_ok($$ select public.social_freigeben('00000000-0000-0000-0000-000000001191') $$,
  'P0001', 'social.nicht_verbunden', 'ohne Verbindung keine Freigabe');
reset role;
insert into intern.social_konten (dienst, name, token) values ('meta', 'Dimension Solaire', 'x'), ('linkedin', 'Dimension Solaire', 'y');
set local role authenticated;
select throws_ok($$ select public.social_freigeben('00000000-0000-0000-0000-000000001191') $$,
  'P0001', 'social.text_fehlt', 'jedes Netzwerk braucht Text');
update public.social_posts set texte = jsonb_build_object('instagram', jsonb_build_object('de', repeat('x', 2201)), 'linkedin', jsonb_build_object('de', 'Hallo'))
 where id = '00000000-0000-0000-0000-000000001191';
select throws_ok($$ select public.social_freigeben('00000000-0000-0000-0000-000000001191') $$,
  'P0001', 'social.zu_lang', 'Instagram höchstens 2200 Zeichen');
update public.social_posts set texte = '{"instagram": {"de": "Hallo #solar"}, "linkedin": {"de": "Hallo"}}' where id = '00000000-0000-0000-0000-000000001191';
select lives_ok($$ select public.social_freigeben('00000000-0000-0000-0000-000000001191', now() - interval '1 minute') $$, 'Freigeben und planen');
select throws_ok($$ select * from public.social_beanspruchen() $$, '42501', null, 'veröffentlichen darf nur der Server');
select throws_ok($$ select * from public.social_konto_lesen('meta') $$, '42501', null, 'Tokens bleiben unsichtbar');

reset role;
select is((select count(*)::int from public.social_beanspruchen() where id = '00000000-0000-0000-0000-000000001191'), 1,
  'Server holt den fälligen Post');
select public.social_ergebnis('00000000-0000-0000-0000-000000001191', '{"instagram": {"ok": true, "id": "1"}, "linkedin": {"ok": false, "fehler": "neu_verbinden"}}');
select is((select status from public.social_posts where id = '00000000-0000-0000-0000-000000001191'), 'fehler',
  'ein Netzwerk gescheitert: Status Fehler, Instagram bleibt gepostet');

-- CI-Stil nur Admin
set local role authenticated;
select throws_ok($$ update public.einstellungen set wert = jsonb_set(wert, '{social,ci}', '"anders"') where schluessel = 'marketing' $$,
  '42501', 'marketing.ci_nur_admin', 'CI-Stil ändert nur die Administration');

select * from finish();
rollback;
