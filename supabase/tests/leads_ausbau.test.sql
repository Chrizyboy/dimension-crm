-- Prüft «Anfragen & Leads neu» (2.11.2026): Website-Lead mit Herkunft und Dach, gleiche Anfrage nur einmal, nur der
-- Server; Erstkontakt setzt sich beim ersten Anruf; nach 15 Min. Glocke an den Verkäufer, nach 2 Std. an die
-- Geschäftsleitung, je einmal; Dachdaten speichern; Nachfassen an Tag 3, 10, 21. Ausführen: npm run db:test
begin;
select plan(16);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000a1a1', 'ld-ve@test.local'),
  ('00000000-0000-0000-0000-00000000a1a2', 'ld-gl@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache, profil) values
  ('00000000-0000-0000-0000-00000000a1b1', 'ld_ve', 'Lea Verkauf', 'ld-ve@test.local', '00000000-0000-0000-0000-00000000a1a1', 'verkauf', '{}', 'de', '{}'),
  ('00000000-0000-0000-0000-00000000a1b2', 'ld_gl', 'Gian Leitung', 'ld-gl@test.local', '00000000-0000-0000-0000-00000000a1a2', 'admin', '{}', 'de', '{}');
update public.einstellungen
   set wert = wert || '{"aktiv_seit": "2020-01-01T00:00:00Z", "eskalation_an": ["ld_gl"], "arbeitszeit": {"tage": [1,2,3,4,5,6,7], "von": "00:00", "bis": "23:59"}}'
 where schluessel = 'verkauf';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a1a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a1a1', true);
select throws_ok($$ select public.lead_aus_website('{}') $$, '42501', null, 'Angemeldete legen keine Website-Leads an');
select throws_ok($$ select public.leads_erstkontakt_melden() $$, '42501', null, 'Melden macht nur der Zeitplan');
reset role;

set local role service_role;
select is(public.lead_aus_website($j${"kennung": "web:DS-PGTAP-1", "quelle": "webseite", "quelle_text": "Website (Offerten-Assistent)",
  "art": "neu", "eingang_am": "2026-11-02", "sprache": "de",
  "kontakt": {"vorname": "Sandra", "nachname": "Pgtaphuber", "email": "pgtaphuber@test.local", "telefon": "079 000 11 22"},
  "objekt": {"strasse": "Lindenweg 7", "plz": "5612", "ort": "Villmergen", "gebaeudeart": "einfamilienhaus"},
  "lead": {"interesse": ["pv", "batterie"], "notiz_intern": "Formular: Offerten-Assistent"},
  "herkunft": {"formular": "offerte", "seite": "/de/offerte/"}, "dach": {"flaeche_m2": 82, "ertrag_kwh": 14100},
  "verbrauch_kwh": 5500}$j$::jsonb) ->> 'ergebnis', 'neu', 'Website-Anfrage wird ein Lead');
select is(public.lead_aus_website('{"kennung": "web:DS-PGTAP-1", "quelle": "webseite", "kontakt": {}, "objekt": {}, "lead": {}}') ->> 'ergebnis',
  'schon', 'Dieselbe Anfrage zweimal gibt nur einen Lead');
reset role;

select is((select herkunft ->> 'seite' from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
            where k.nachname = 'Pgtaphuber'), '/de/offerte/', 'Herkunft steht am Lead');
select is((select (dach -> 'website' ->> 'flaeche_m2')::int from public.objekte o join public.kontakte k on k.id = o.kontakt_id
            where k.nachname = 'Pgtaphuber'), 82, 'Dachfläche aus dem Formular steht am Objekt');
select is((select verbrauch_kwh from public.objekte o join public.kontakte k on k.id = o.kontakt_id
            where k.nachname = 'Pgtaphuber'), 5500, 'Verbrauch aus dem Formular steht am Objekt');

-- Erinnerung und Meldung an die Geschäftsleitung
update public.verkaufschancen set tour_person_id = '00000000-0000-0000-0000-00000000a1b1', erstellt_am = now() - interval '20 minutes'
 where kontakt_id = (select id from public.kontakte where nachname = 'Pgtaphuber');
set local role service_role;
select ok(public.leads_erstkontakt_melden() >= 1, 'Nach 20 Minuten wird gemeldet');
reset role;
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-00000000a1b1'
            and titel_de like 'Jetzt anrufen: Sandra Pgtaphuber'), 1, 'Verkäufer bekommt die Glocke');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-00000000a1b2'
            and titel_de like '%Pgtaphuber'), 0, 'Geschäftsleitung noch nicht nach 20 Minuten');

update public.verkaufschancen set erstellt_am = now() - interval '3 hours'
 where kontakt_id = (select id from public.kontakte where nachname = 'Pgtaphuber');
set local role service_role;
select lives_ok($$ select public.leads_erstkontakt_melden() $$, 'Zweiter Lauf');
select lives_ok($$ select public.leads_erstkontakt_melden() $$, 'Dritter Lauf');
reset role;
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-00000000a1b2'
            and titel_de = 'Lead ohne Anruf: Sandra Pgtaphuber'), 1, 'Geschäftsleitung bekommt nach 2 Std. genau eine Meldung');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-00000000a1b1'
            and titel_de like 'Jetzt anrufen: Sandra Pgtaphuber'), 1, 'Verkäufer wird nur einmal erinnert');

-- Erstkontakt
insert into public.aktivitaeten (art, richtung, verkaufschance_id, kontakt_id, text)
select 'anruf', 'aus', v.id, v.kontakt_id, 'erreicht' from public.verkaufschancen v
 where v.kontakt_id = (select id from public.kontakte where nachname = 'Pgtaphuber');
select isnt((select erstkontakt_am from public.verkauf_geschaefte where name = 'Sandra Pgtaphuber'), null,
  'Der erste Anruf setzt den Erstkontakt, die Pipeline sieht ihn');

-- Nachfassen
select is((select jsonb_array_length(aktionen) from public.automationen where vorlage = 'offerte_nachfassen'), 12,
  'Nachfassen hat drei Runden (Tag 3, 10, 21)');

select * from finish();
rollback;
