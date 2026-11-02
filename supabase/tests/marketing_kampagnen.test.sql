-- Prüft Marketing vollständig (Entscheid 0039): Kennzeichen, Kampagne am Lead (Website, Messe, Antwort auf Mail,
-- Quelle), Messe-Lead (wiederholbar, Aufgabe, Einwilligung), Zahlen je Kampagne, Kosten nur mit Recht, Zuordnen
-- nur Finanzen, Öffnen/Klick nur über den Server und nur echte Links, Social «von Hand», Fotos für Werbung.
-- Ausführen: npm run db:test
begin;
select plan(24);

delete from intern.social_konten;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'mk-vk@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'mk-bh@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000039b1', 'mk_vk', 'Vera Verkauf', '00000000-0000-0000-0000-0000000039a1', 'verkauf', '{}'),
  ('00000000-0000-0000-0000-0000000039b2', 'mk_bh', 'Beat Buchhaltung', '00000000-0000-0000-0000-0000000039a2', 'verkauf', '{finanzen}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, email, sprache) values
  ('00000000-0000-0000-0000-0000000039c1', 'person', 'privat', 'Rita', 'Antwort', 'rita@beispiel.test', 'de');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);

-- Kampagnen und Kennzeichen
insert into public.marketing_kampagnen (id, name, art, status, start_am, ende_am, budget_rappen) values
  ('00000000-0000-0000-0000-0000000039d1', 'Salon Énergie Bulle', 'messe', 'laeuft', current_date - 1, current_date + 2, 550000),
  ('00000000-0000-0000-0000-0000000039d2', 'Batterie nachrüsten', 'aktion', 'laeuft', current_date - 20, current_date + 20, 50000),
  ('00000000-0000-0000-0000-0000000039d3', 'Google Ads Freiamt', 'online', 'laeuft', current_date - 60, null, null);
select is((select kennzeichen from public.marketing_kampagnen where id = '00000000-0000-0000-0000-0000000039d1'),
  'salon-energie-bulle', 'Kennzeichen aus dem Namen, ohne Akzente');
select is((select quelle from public.marketing_kampagnen where id = '00000000-0000-0000-0000-0000000039d1'), 'messe',
  'Quelle aus der Art');
insert into public.marketing_kampagnen (name) values ('Salon Énergie Bulle!');
select is((select count(*)::int from public.marketing_kampagnen where kennzeichen like 'salon-energie-bulle%'), 2,
  'gleicher Name: eigenes Kennzeichen');

-- Kampagne am Lead
select public.lead_anlegen('{"kontakt": {"vorname": "Web", "nachname": "Formular"}, "lead": {"quelle": "webseite",
  "kommentar_kunde": "Interesse: PV\nKampagne: google-ads-freiamt"}}');
select is((select kampagne_id from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id where k.nachname = 'Formular'),
  '00000000-0000-0000-0000-0000000039d3'::uuid, 'Website: Kampagne aus dem Formular-Feld');
select public.lead_anlegen('{"kontakt": {"vorname": "Max", "nachname": "Messe"}, "lead": {"quelle": "messe"}}');
select is((select kampagne_id from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id where k.nachname = 'Messe'),
  '00000000-0000-0000-0000-0000000039d1'::uuid, 'Messe: Kampagne der laufenden Messe');
select public.marketing_senden($j${"art": "serienmail", "betreff": "Batterie", "kampagne_id": "00000000-0000-0000-0000-0000000039d2",
  "mails": [{"kontakt_id": "00000000-0000-0000-0000-0000000039c1", "an": "rita@beispiel.test", "betreff": "Batterie",
  "text": "Guten Tag, mehr unter https://www.dimension-solaire.ch/batterie", "sprache": "de"}]}$j$);
select is((select kampagne_id from public.kampagnen where betreff = 'Batterie'), '00000000-0000-0000-0000-0000000039d2'::uuid,
  'Versand gehört zur Kampagne');
select public.lead_anlegen('{"kontakt_id": "00000000-0000-0000-0000-0000000039c1", "lead": {"quelle": "direktkontakt"}}');
select is((select kampagne_id from public.verkaufschancen where kontakt_id = '00000000-0000-0000-0000-0000000039c1'),
  '00000000-0000-0000-0000-0000000039d2'::uuid, 'Antwort auf die Serien-Mail: Lead der Kampagne');

-- Messe-Lead am Handy
select ok(public.messe_lead_erfassen('{"id": "11111111-2222-3333-4444-555555555555", "kampagne_id": "00000000-0000-0000-0000-0000000039d1",
  "vorname": "Nicole", "nachname": "Castella", "telefon": "+41 79 412 08 33", "plz": "1663", "ort": "Gruyères",
  "interesse": ["pv", "batterie"], "termin": true, "newsletter": true, "sprache": "fr"}') is not null, 'Messe-Lead erfasst');
select is(public.messe_lead_erfassen('{"id": "11111111-2222-3333-4444-555555555555", "kampagne_id": "00000000-0000-0000-0000-0000000039d1",
  "vorname": "Nicole", "nachname": "Castella"}'),
  (select id from public.verkaufschancen where alt_id = 'messe-crm:11111111-2222-3333-4444-555555555555'),
  'nochmals gesendet (Handy offline): kein zweiter Lead');
select is((select count(*)::int from public.aufgaben where titel like 'Messe-Lead anrufen: % Castella%'), 1,
  'Aufgabe «anrufen» für die zuständige Person');
select is((select v.wiedervorlage_grund from public.verkaufschancen v where v.alt_id like 'messe-crm:%'), 'Termin gewünscht (Messe)',
  'Terminwunsch als Wiedervorlage');
select ok((select k.einwilligung ->> 'quelle' = 'Salon Énergie Bulle' from public.kontakte k join public.verkaufschancen v
            on v.kontakt_id = k.id where v.alt_id like 'messe-crm:%'), 'Einwilligung Newsletter mit der Messe als Nachweis');
select throws_ok($$ select public.messe_lead_erfassen('{"id": "x1", "kampagne_id": "00000000-0000-0000-0000-0000000039d2"}') $$,
  'P0001', 'marketing.keine_messe', 'nur an einer Messe');

-- Zahlen: Verkauf sieht Leads, aber keine Kosten
select is((select leads from public.kampagnen_zahlen() where kampagne_id = '00000000-0000-0000-0000-0000000039d1'), 2,
  'Messe: zwei Leads');
select is((select kosten_rappen from public.kampagnen_zahlen() where kampagne_id = '00000000-0000-0000-0000-0000000039d1'), null,
  'ohne Recht keine Kosten');
select is((select count(*)::int from public.marketing_budget(extract(year from current_date)::int)), 0, 'ohne Recht kein Budget');

-- Kosten aus AbaNinja: zuordnen nur mit Finanzen
reset role;
insert into public.kreditor_zahlungen (id, firma, text, betrag_rappen, rechnung_am, status) values
  ('00000000-0000-0000-0000-0000000039e1', 'Espace Messe AG', 'Standmiete Salon', 320000, current_date - 5, 'offen');
set local role authenticated;
select throws_ok($$ select public.marketing_kosten_zuordnen('00000000-0000-0000-0000-0000000039e1', '00000000-0000-0000-0000-0000000039d1', 'messe') $$,
  '42501', 'finanzen.kein_recht', 'zuordnen nur mit Recht Finanzen');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true);
select is((select count(*)::int from public.marketing_kosten_offen() where id = '00000000-0000-0000-0000-0000000039e1'), 1,
  'Rechnung mit Stichwort «Messe» erscheint zum Zuordnen');
select public.marketing_kosten_zuordnen('00000000-0000-0000-0000-0000000039e1', '00000000-0000-0000-0000-0000000039d1', 'messe');
select is((select kosten_rappen from public.kampagnen_zahlen() where kampagne_id = '00000000-0000-0000-0000-0000000039d1'), 320000::bigint,
  'Kosten der Kampagne aus der Rechnung');

-- Öffnungen und Klicks: nur der Server, nur Links aus der Mail
select throws_ok($$ select public.marketing_zaehlen(gen_random_uuid(), 'oeffnung') $$, '42501', null, 'zählen nur der Server');
reset role;
select ok(not public.marketing_zaehlen((select id from public.ausgangskorb where an = 'rita@beispiel.test'), 'klick', 'https://boese.example'),
  'fremder Link wird nicht umgeleitet');
select ok(public.marketing_zaehlen((select id from public.ausgangskorb where an = 'rita@beispiel.test'), 'klick',
  'https://www.dimension-solaire.ch/batterie'), 'Link aus der Mail zählt');

-- Social Media von Hand
set local role authenticated;
insert into public.social_posts (id, thema, netzwerke, sprache, texte) values
  ('00000000-0000-0000-0000-0000000039f1', 'Referenz', '{facebook}', 'de', '{"facebook": {"de": "Neue Anlage"}}');
select public.social_freigeben('00000000-0000-0000-0000-0000000039f1', now() - interval '1 minute');
reset role;
select is(public.social_von_hand_melden(), 1, 'ohne Verbindung: Glocke «Jetzt posten»');
select is((select count(*)::int from public.social_beanspruchen() where id = '00000000-0000-0000-0000-0000000039f1'), 0,
  'von Hand wird nie automatisch gepostet');

select * from finish();
rollback;
