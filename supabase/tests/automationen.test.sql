-- Prüft Phase 12: Vorlagen und Katalog, Prüfung beim Speichern, Rechte (nur Administration), Signale aus Tabellen
-- (nie aus dem Import), Läufe Schritt für Schritt (Bedingung, Aufgabe, Meldung, Warten, Prüfen, Server-Schritt),
-- Mail und SMS nur über den Ausgangskorb mit Freigabe (ausser «automatisch»), Werbesperre, Bezug im Papierkorb,
-- Basis beim ersten Durchsehen, Mahnstufe erst nach dem Senden, Benachrichtigungen nur für sich, Lauf beenden.
-- Ausführen: npm run db:test
begin;
select plan(40);

-- Die Ausführung handelt als Person (request.jwt.claim.sub, nur für die Transaktion); darum setzt der Test
-- beim Wechsel der Person beide Angaben.
-- Eigene Ausgangslage: die mitgelieferten Vorlagen ausschalten, damit nur die Test-Automationen laufen.
update public.automationen set aktiv = false where vorlage is not null;
update intern.automation_signale set verteilt = true where not verteilt;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000012a1', 'p12-vk@test.local'),
  ('00000000-0000-0000-0000-0000000012a2', 'p12-ad@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000012b1', 'p12_vk', 'Vera Vertrieb', '00000000-0000-0000-0000-0000000012a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000012b2', 'p12_ad', 'Adam Admin', '00000000-0000-0000-0000-0000000012a2', 'admin', '{}', 'fr');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, email, telefon, sprache, werbesperre) values
  ('00000000-0000-0000-0000-0000000012c1', 'person', 'privat', 'Ruth', 'Rechnung', 'ruth@beispiel.test', '+41790001201', 'de', true);

-- Katalog und Vorlagen
select is(jsonb_array_length(public.automation_katalog() -> 'ereignisse'), 11, 'Katalog kennt 11 Auslöser');
select is((select count(*)::int from public.automationen where vorlage is not null and geloescht_am is null), 11,
  '10 Vorlagen aus dem Auftrag plus Meilenstein-Meldung');
select is((select count(*)::int from public.automationen where vorlage is not null and modus <> 'freigabe'), 0,
  'alle Vorlagen stehen auf «mit Freigabe»');

-- Rechte: Verkauf sieht und ändert keine Automationen
set local role authenticated;
select set_config('request.jwt.claims', '{\"sub\": \"00000000-0000-0000-0000-0000000012a1\", \"role\": \"authenticated\"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000012a1', true);
select is((select count(*)::int from public.automationen), 0, 'Verkauf sieht keine Automationen');
select throws_ok($$ insert into public.automationen (name_de, name_fr, ausloeser, aktionen) values ('x', 'x', 'lead.neu', '[{"art": "zuteilen"}]') $$,
  '42501', null, 'Verkauf legt keine Automation an');
select throws_ok($$ update public.einstellungen set wert = wert where schluessel = 'automationen' $$,
  '42501', 'automation.kein_recht', 'Einstellungen der Automationen nur Administration');
select throws_ok($$ select public.automationen_abarbeiten(1) $$, '42501', null, 'App kann die Ausführung nicht anstossen');

-- Administration: Prüfung beim Speichern
select set_config('request.jwt.claims', '{\"sub\": \"00000000-0000-0000-0000-0000000012a2\", \"role\": \"authenticated\"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000012a2', true);
select throws_ok($$ insert into public.automationen (name_de, name_fr, ausloeser, aktionen) values ('x', 'x', 'gibt.es_nicht', '[{"art": "zuteilen"}]') $$,
  'P0001', 'automation.ausloeser_unbekannt', 'unbekannter Auslöser');
select throws_ok($$ insert into public.automationen (name_de, name_fr, ausloeser, aktionen) values ('x', 'x', 'lead.neu', '[]') $$,
  'P0001', 'automation.keine_aktion', 'ohne Aktion');
select throws_ok($$ insert into public.automationen (name_de, name_fr, ausloeser, aktionen) values ('x', 'x', 'lead.neu', '[{"art": "warten", "tage": 0}]') $$,
  'P0001', 'automation.warten_tage', 'Warten braucht Tage');
select throws_ok($$ insert into public.automationen (name_de, name_fr, ausloeser, aktionen) values ('x', 'x', 'lead.neu', '[{"art": "loeschen"}]') $$,
  'P0001', 'automation.aktion_unbekannt', 'unbekannte Aktion');

insert into public.automationen (id, name_de, name_fr, ausloeser, aktiv, modus, bedingungen, aktionen) values
  ('00000000-0000-0000-0000-0000000012d1', 'Test Lead', 'Test lead', 'lead.neu', true, 'freigabe',
   '[{"feld": "lead.quelle", "op": "!=", "wert": "messe"}]',
   '[{"art": "aufgabe", "an": ["person:00000000-0000-0000-0000-0000000012b1"], "titel": {"de": "Anrufen: {Name}", "fr": "Appeler : {Name}"}, "faellig_tage": 1},
     {"art": "benachrichtigung", "an": ["person:00000000-0000-0000-0000-0000000012b2"], "titel": {"de": "Neu: {Name}", "fr": "Nouveau : {Name}"}},
     {"art": "mail", "absender": ["person:00000000-0000-0000-0000-0000000012b2"], "betreff": {"de": "Danke {Vorname}", "fr": "Merci {Vorname}"}, "text": {"de": "{Anrede}", "fr": "{Anrede}"}},
     {"art": "warten", "tage": 3},
     {"art": "pruefen", "bedingungen": [{"feld": "lead.stufe", "op": "=", "wert": "neu"}]},
     {"art": "outlook_termin"}]');
select ok((select aktiv_seit is not null and ausfuehren_als = '00000000-0000-0000-0000-0000000012b2'
             from public.automationen where id = '00000000-0000-0000-0000-0000000012d1'),
  'Einschalten merkt «ab jetzt» und wer sie eingerichtet hat');

-- Signale: neuer Lead von Hand, Lead aus dem Import nicht
select set_config('request.jwt.claims', '{\"sub\": \"00000000-0000-0000-0000-0000000012a1\", \"role\": \"authenticated\"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000012a1', true);
select public.lead_anlegen('{"kontakt": {"vorname": "Lea", "nachname": "Probe", "email": "lea@beispiel.test", "telefon": "079 000 12 01", "sprache": "fr"}, "objekt": {"plz": "1630", "ort": "Bulle"}, "lead": {"quelle": "website"}}');
reset role;
select is((select count(*)::int from intern.automation_signale s join public.verkaufschancen v on v.id = s.bezug_id
            join public.kontakte k on k.id = v.kontakt_id where s.ereignis = 'lead.neu' and k.email = 'lea@beispiel.test'), 1,
  'neuer Lead gibt ein Signal');
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
insert into public.verkaufschancen (kontakt_id, stufe, alt_id) values ('00000000-0000-0000-0000-0000000012c1', 'neu', 'v233-test-12');
reset role;
select is((select count(*)::int from intern.automation_signale s join public.verkaufschancen v on v.id = s.bezug_id
            where v.alt_id = 'v233-test-12'), 0, 'Import der Vorlage löst nichts aus');

-- Abarbeiten (Server)
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select ok((public.automationen_abarbeiten(50) ->> 'neue_laeufe')::int >= 1, 'Signal wird zum Lauf');
reset role;
create temp table l12 on commit drop as
  select l.* from public.automation_laeufe l where l.automation_id = '00000000-0000-0000-0000-0000000012d1';
grant select on l12 to authenticated, service_role;
select is((select stand from l12), 'wartet', 'Lauf wartet nach «Warten»');
select ok((select weiter_am > now() + interval '2 days' from l12), 'weiter in 3 Tagen');
select is((select titel from public.aufgaben where lauf_id = (select id from l12)), 'Anrufen: Lea Probe',
  'Aufgabe mit eingesetztem Platzhalter, mit Lauf');
select is((select person_id from public.aufgaben where lauf_id = (select id from l12)), '00000000-0000-0000-0000-0000000012b1'::uuid,
  'Aufgabe bei der gewählten Person');
select is((select titel_fr from public.benachrichtigungen where lauf_id = (select id from l12) and person_id = '00000000-0000-0000-0000-0000000012b2' and titel_fr like 'Nouveau%'),
  'Nouveau : Lea Probe', 'Benachrichtigung zweisprachig');
select is((select status from public.ausgangskorb where schluessel = 'automation:' || (select id from l12) || ':3'), 'wartet',
  'Mail wartet im Ausgangskorb auf Freigabe');
select is((select betreff from public.ausgangskorb where schluessel = 'automation:' || (select id from l12) || ':3'), 'Merci Lea',
  'Mail in der Sprache des Kunden');
select is((select count(*)::int from public.benachrichtigungen where lauf_id = (select id from l12)
            and person_id = '00000000-0000-0000-0000-0000000012b2' and ziel like '/outbox?eintrag=%'), 1,
  'Absender bekommt «Entwurf wartet auf Freigabe»');

-- Benachrichtigungen nur für sich
set local role authenticated;
select set_config('request.jwt.claims', '{\"sub\": \"00000000-0000-0000-0000-0000000012a1\", \"role\": \"authenticated\"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000012a1', true);
select is((select count(*)::int from public.benachrichtigungen where lauf_id = (select id from l12)), 0,
  'Verkauf sieht die Meldungen der Administration nicht');
select is((select count(*)::int from public.automation_laeufe), 0, 'Verkauf sieht kein Protokoll');
select throws_ok($$ select public.automation_lauf_abbrechen((select id from l12)) $$, '42501', 'recht.fehlt', 'Lauf beenden nur Administration');
select set_config('request.jwt.claims', '{\"sub\": \"00000000-0000-0000-0000-0000000012a2\", \"role\": \"authenticated\"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000012a2', true);
select ok(public.benachrichtigungen_gelesen() >= 2, 'eigene Meldungen als gelesen markieren');
reset role;

-- Nach dem Warten: Prüfen trifft zu, Server-Schritt hält an
update public.automation_laeufe set weiter_am = now() - interval '1 minute' where id = (select id from l12);
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select public.automationen_abarbeiten(50);
select is((select stand from public.automation_laeufe where id = (select id from l12)), 'server', 'Outlook wartet auf den Server');
select is((select count(*)::int from jsonb_array_elements(public.automation_server_offen(10)) s where (s ->> 'lauf_id')::uuid = (select id from l12)), 1,
  'Server holt den offenen Schritt');
select public.automation_server_ergebnis((select id from l12), 6, 'uebersprungen', 'nicht_eingerichtet');
select public.automationen_abarbeiten(50);
reset role;
select is((select stand from public.automation_laeufe where id = (select id from l12)), 'fertig', 'nach dem Server-Schritt fertig');

-- Bedingung nicht erfüllt
insert into public.automationen (id, name_de, name_fr, ausloeser, aktiv, bedingungen, aktionen) values
  ('00000000-0000-0000-0000-0000000012d2', 'Nur Messe', 'Salon', 'lead.neu', true,
   '[{"feld": "lead.quelle", "op": "=", "wert": "messe"}]', '[{"art": "zuteilen"}]');
-- Werbung an gesperrten Kunden, automatisch
insert into public.automationen (id, name_de, name_fr, ausloeser, aktiv, modus, aktionen) values
  ('00000000-0000-0000-0000-0000000012d3', 'Werbung', 'Pub', 'lead.neu', true, 'automatisch',
   '[{"art": "mail", "werbung": true, "absender": ["rolle:admin"], "betreff": {"de": "Aktion", "fr": "Action"}, "text": {"de": "x", "fr": "x"}}]'),
  ('00000000-0000-0000-0000-0000000012d4', 'Automatisch', 'Auto', 'lead.neu', true, 'automatisch',
   '[{"art": "mail", "absender": ["rolle:admin"], "betreff": {"de": "Willkommen", "fr": "Bienvenue"}, "text": {"de": "x", "fr": "x"}}]');
update public.automationen set aktiv_seit = now() - interval '1 minute' where id in
  ('00000000-0000-0000-0000-0000000012d2', '00000000-0000-0000-0000-0000000012d3', '00000000-0000-0000-0000-0000000012d4');
insert into public.verkaufschancen (id, kontakt_id, stufe, quelle) values
  ('00000000-0000-0000-0000-0000000012e1', '00000000-0000-0000-0000-0000000012c1', 'neu', 'website');
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select public.automationen_abarbeiten(50);
reset role;
select is((select stand from public.automation_laeufe where automation_id = '00000000-0000-0000-0000-0000000012d2'
            and bezug_id = '00000000-0000-0000-0000-0000000012e1'), 'uebersprungen', 'Bedingung nicht erfüllt: übersprungen');
select is((select protokoll -> 0 ->> 'meldung' from public.automation_laeufe where automation_id = '00000000-0000-0000-0000-0000000012d2'
            and bezug_id = '00000000-0000-0000-0000-0000000012e1'), 'bedingung', 'Protokoll nennt die Bedingung');
select is((select protokoll -> 1 ->> 'meldung' from public.automation_laeufe where automation_id = '00000000-0000-0000-0000-0000000012d3'
            and bezug_id = '00000000-0000-0000-0000-0000000012e1'), 'werbesperre', 'Werbung nie an Kunden mit Werbesperre');
select is((select status from public.ausgangskorb where kontakt_id = '00000000-0000-0000-0000-0000000012c1' and betreff = 'Willkommen'),
  'freigegeben', '«automatisch» gibt die Mail frei');

-- Bezug im Papierkorb beendet den Lauf
update public.automationen set aktiv = false where id = '00000000-0000-0000-0000-0000000012d1';
insert into public.automationen (id, name_de, name_fr, ausloeser, aktiv, aktionen) values
  ('00000000-0000-0000-0000-0000000012d5', 'Warten', 'Attendre', 'lead.neu', true, '[{"art": "warten", "tage": 1}, {"art": "zuteilen"}]');
update public.automationen set aktiv_seit = now() - interval '1 minute' where id = '00000000-0000-0000-0000-0000000012d5';
insert into public.verkaufschancen (id, kontakt_id, stufe, quelle) values
  ('00000000-0000-0000-0000-0000000012e2', '00000000-0000-0000-0000-0000000012c1', 'neu', 'website');
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select public.automationen_abarbeiten(50);
reset role;
update public.verkaufschancen set geloescht_am = now() where id = '00000000-0000-0000-0000-0000000012e2';
update public.automation_laeufe set weiter_am = now() - interval '1 minute'
 where automation_id = '00000000-0000-0000-0000-0000000012d5' and bezug_id = '00000000-0000-0000-0000-0000000012e2';
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select public.automationen_abarbeiten(50);
reset role;
select is((select stand from public.automation_laeufe where automation_id = '00000000-0000-0000-0000-0000000012d5'
            and bezug_id = '00000000-0000-0000-0000-0000000012e2'), 'abgebrochen', 'Lead im Papierkorb: Lauf endet');

-- Ausgeschaltete Automation startet keinen neuen Lauf
select is((select count(*)::int from public.automation_laeufe where automation_id = '00000000-0000-0000-0000-0000000012d1'
            and bezug_id = '00000000-0000-0000-0000-0000000012e2'), 0, 'ausgeschaltet: kein Lauf');

-- Erstes Durchsehen: Bestand ist Basis
delete from intern.automation_durchsicht;
insert into public.rechnungen (id, art, status, kontakt_id, firma_id, titel, positionen, inkl_mwst, faellig_am)
values ('00000000-0000-0000-0000-0000000012f1', 'teilzahlung', 'gestellt', '00000000-0000-0000-0000-0000000012c1',
        (select id from public.firmen limit 1), 'Teilrechnung Test', '[{"text": "Tranche", "preis_rappen": 100000}]', true,
        current_date - 30);
select intern.automationen_durchsehen(true);
select ok((select basis from intern.automation_signale where ereignis = 'rechnung.ueberfaellig'
            and bezug_id = '00000000-0000-0000-0000-0000000012f1'), 'erstes Durchsehen: alte Rechnung ist Basis, löst nichts aus');

-- Mahnstufe steigt erst, wenn die Mahnung gesendet ist
insert into public.ausgangskorb (id, kanal, art, an, betreff, text, status, bezug_tabelle, bezug_id, kontakt_id)
values ('00000000-0000-0000-0000-0000000012f2', 'mail', 'mahnung', 'ruth@beispiel.test', 'Zahlungserinnerung', 'x', 'wartet',
        'rechnungen', '00000000-0000-0000-0000-0000000012f1', '00000000-0000-0000-0000-0000000012c1');
select is((select mahnstufe from public.rechnungen where id = '00000000-0000-0000-0000-0000000012f1'), 0, 'Entwurf: Mahnstufe bleibt');
update public.ausgangskorb set status = 'gesendet' where id = '00000000-0000-0000-0000-0000000012f2';
select is((select mahnstufe from public.rechnungen where id = '00000000-0000-0000-0000-0000000012f1'), 1, 'gesendet: Mahnstufe 1');
select ok((select mahnfrist > current_date from public.rechnungen where id = '00000000-0000-0000-0000-0000000012f1'), 'neue Mahnfrist');

select * from finish();
rollback;
