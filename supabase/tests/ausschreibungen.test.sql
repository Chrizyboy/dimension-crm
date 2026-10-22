-- Prüft Phase 8b: Ausschreibungs-Monitor. Bewerten und Einzugsgebiet, drei Spuren, Dossier statt Doppelte,
-- Regeln als harte Sperren (Mail nur an Firmen, Vergabestelle bis Zuschlag, Sperrliste, einmal nachfassen),
-- Rechte (Andy bewilligt, Chris sendet), Lead erst beim Senden, Antwort erkennen und Quellen-Kontrolle.
-- Ausführen: npm run db:test
begin;
select plan(45);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000008b0a1', 'as-andy@test.local'),
  ('00000000-0000-0000-0000-00000008b0a2', 'as-chris@test.local'),
  ('00000000-0000-0000-0000-00000008b0a3', 'as-vera@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-00000008b0b1', 'as_andy', 'Andy Test', '00000000-0000-0000-0000-00000008b0a1', 'mitarbeit', '{}'),
  ('00000000-0000-0000-0000-00000008b0b2', 'as_chris', 'Chris Test', '00000000-0000-0000-0000-00000008b0a2', 'mitarbeit', '{}'),
  ('00000000-0000-0000-0000-00000008b0b3', 'as_vera', 'Vera Test', '00000000-0000-0000-0000-00000008b0a3', 'verkauf', '{}');
update public.einstellungen set wert = wert || '{"bewilligen": ["as_andy"], "bewilligen_vertretung": [], "senden": ["as_chris"],
  "senden_vertretung": [], "innendienst": ["as_vera"], "alarm": ["as_chris"]}' where schluessel = 'ausschreibungen';

create temporary table t (name text primary key, id uuid) on commit drop;
grant all on t to authenticated;

-- Bewerten und Einzugsgebiet
select ok((select punkte >= 3 and pv from intern.as_bewerten('Neubau Schulhaus mit Photovoltaikanlage')), 'PV-Stichwort gibt Punkte');
select ok((select aus from intern.as_bewerten('Unterhaltsreinigung Verwaltung')), 'Reinigung ist nicht relevant');
select cmp_ok(intern.fahrzeit_min('5630', '6300'), '<', 60, 'Muri – Zug liegt im Einzugsgebiet');
select cmp_ok(intern.fahrzeit_min('5630', '1200'), '>', 60, 'Muri – Genf liegt ausserhalb');

-- Spur Angebot (simap): neu, Vergabestelle gesperrt, nicht doppelt
insert into t select 'angebot', (public.ausschreibung_einlesen('{"quelle": "simap", "quell_id": "t-p1", "art": "ausschreibung",
  "titel": "Photovoltaikanlage Schulhaus Testdorf", "plz": "5600", "vergabestelle": "Gemeinde Testdorf AG",
  "frist_eingabe": "2099-01-15T12:00:00+01", "frist_fragen": "2099-01-05", "frist_begehung": "2099-01-02T09:00:00+01",
  "quell_url": "https://www.simap.ch/test"}') ->> 'id')::uuid;
select is((select spur || '/' || status from public.ausschreibungen where id = (select id from t where name = 'angebot')),
  'angebot/pruefen', 'offene Ausschreibung mit PV: Spur Angebot, zum Prüfen');
select matches((select nummer from public.ausschreibungen where id = (select id from t where name = 'angebot')),
  '^AS-\d{4}-\d{4}$', 'Dossier bekommt eine AS-Nummer');
select is(public.ausschreibung_einlesen('{"quelle": "simap", "quell_id": "t-p1", "art": "ausschreibung",
  "titel": "Photovoltaikanlage Schulhaus Testdorf", "plz": "5600"}') ->> 'aktion', 'unveraendert', 'zweites Einlesen legt nichts doppelt an');
select is(public.ausschreibung_einlesen('{"quelle": "simap", "quell_id": "t-x1", "titel": "Unterhaltsreinigung", "plz": "5600"}') ->> 'aktion',
  'uebersprungen', 'nicht relevante Meldung wird übersprungen');
select is(public.ausschreibung_einlesen('{"quelle": "simap", "quell_id": "t-x2", "titel": "Photovoltaik Genf", "kanton": "GE"}') ->> 'grund',
  'ausserhalb', 'Kanton ausserhalb des Gebiets wird übersprungen');
select isnt(intern.gesperrt(null, 'Gemeinde Testdorf AG'), null, 'Vergabestelle ist bis zum Zuschlag gesperrt');
insert into public.kontakte (id, art, kontaktart, firma, email) values
  ('00000000-0000-0000-0000-00000008b0c1', 'firma', 'firma', 'Gemeinde Testdorf AG', 'bau@testdorf.test');

-- Spur Akquise (Baugesuche): Privat nur Brief, Firma per Mail, Doppelte als Dossier, fehlender Kontakt
insert into t select 'privat', (public.ausschreibung_einlesen('{"quelle": "amtsblatt", "quell_id": "t-b1", "art": "baugesuch",
  "titel": "Neubau Einfamilienhaus", "gemeinde": "Testdorf", "plz": "5600", "parzelle": "1234", "bauherr": "Mia Muster",
  "bauherr_art": "privat", "kontakte": [{"rolle": "bauherr", "art": "privat", "name": "Mia Muster", "strasse": "Weg 1",
  "plz": "5600", "ort": "Testdorf"}], "quell_url": "https://amtsblattportal.ch/test/b1"}') ->> 'id')::uuid;
select is((select kanal from public.anschreiben where ausschreibung_id = (select id from t where name = 'privat')), 'brief',
  'Privatperson: Brief, nie Mail');
insert into t select 'firma', (public.ausschreibung_einlesen('{"quelle": "amtsblatt", "quell_id": "t-b2", "art": "baugesuch",
  "titel": "Neubau Gewerbehalle", "gemeinde": "Testdorf", "plz": "5600", "parzelle": "77", "bauherr": "Muster Immobilien AG",
  "bauherr_art": "firma", "kontakte": [{"rolle": "architekt", "art": "firma", "name": "Beispiel Architekten AG",
  "email": "info@architekten.test", "quelle_link": "https://amtsblattportal.ch/test/b2"}]}') ->> 'id')::uuid;
select is((select status from public.ausschreibungen where id = (select id from t where name = 'firma')), 'entwurf', 'Entwurf ist bereit');
select is((select kanal from public.anschreiben where ausschreibung_id = (select id from t where name = 'firma')), 'mail',
  'Firma mit Mail-Adresse: Mail');
select ok((select betreff like '%' || a.nummer || '%' from public.anschreiben s join public.ausschreibungen a on a.id = s.ausschreibung_id
  where a.id = (select id from t where name = 'firma')), 'die Dossiernummer steht im Betreff');
insert into t select 'doppelt', (public.ausschreibung_einlesen('{"quelle": "hand", "quell_id": "t-b3", "art": "baugesuch",
  "titel": "Neubau Einfamilienhaus, Profilierung", "gemeinde": "Testdorf", "plz": "5600", "parzelle": "1234"}') ->> 'id')::uuid;
select is((select haupt_id from public.ausschreibungen where id = (select id from t where name = 'doppelt')),
  (select id from t where name = 'privat'), 'gleiche Gemeinde und Parzelle: ein Dossier');
insert into t select 'leer', (public.ausschreibung_einlesen('{"quelle": "amtsblatt", "quell_id": "t-b4", "art": "baugesuch",
  "titel": "Dachsanierung Mehrfamilienhaus", "gemeinde": "Testdorf", "plz": "5600", "bauherr_art": "firma"}') ->> 'id')::uuid;
select is((select status from public.ausschreibungen where id = (select id from t where name = 'leer')), 'kontakt_fehlt',
  'ohne Kontakt: Status «Kontakt fehlt»');
select is((select count(*)::int from public.aufgaben where bezug_id = (select id from t where name = 'leer')
  and person_id = '00000000-0000-0000-0000-00000008b0b3'), 1, 'der Innendienst bekommt eine Aufgabe');

-- Rechte: Andy bewilligt, Chris sendet
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000008b0a3", "role": "authenticated"}', true);
select throws_ok(format($$ select public.anschreiben_bewilligen(array[%L]::uuid[]) $$,
  (select s.id from public.anschreiben s where s.ausschreibung_id = (select id from t where name = 'firma'))),
  'ausschreibung.kein_recht', 'Verkauf darf nicht bewilligen');
select throws_ok($$ select public.ausschreibungen_pruefen() $$, 'ausschreibung.kein_recht', 'den täglichen Lauf startet nur der Server');
select lives_ok(format($$ select public.dossier_kontakt_speichern(jsonb_build_object('ausschreibung_id', %L, 'rolle', 'gu',
  'art', 'firma', 'name', 'Test GU AG', 'email', 'gu@gu.test', 'quelle_link', 'https://gu.test')) $$, (select id from t where name = 'leer')),
  'Innendienst erfasst den Kontakt mit Quelle');
select is((select status from public.ausschreibungen where id = (select id from t where name = 'leer')), 'entwurf',
  'danach ist der Entwurf bereit');
select throws_ok(format($$ select public.dossier_kontakt_speichern(jsonb_build_object('ausschreibung_id', %L, 'rolle', 'gu',
  'art', 'firma', 'name', 'Ohne Quelle AG')) $$, (select id from t where name = 'leer')), 'ausschreibung.quelle_fehlt',
  'ohne Quelle kein Kontakt');
select throws_ok($$ select public.ausgang_anlegen(jsonb_build_object('kanal', 'mail', 'an', 'bau@testdorf.test', 'betreff', 'x',
  'text', 'y', 'kontakt_id', '00000000-0000-0000-0000-00000008b0c1')) $$, 'ausgang.gesperrt',
  'Vergabestelle ist auch im Ausgangskorb gesperrt (alle Module)');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000008b0a1", "role": "authenticated"}', true);
select is(public.anschreiben_bewilligen(array(select s.id from public.anschreiben s
  where s.ausschreibung_id in (select id from t where name in ('firma', 'privat')))), 2, 'Andy bewilligt zwei auf einmal');
select throws_ok(format($$ select public.anschreiben_senden(array[%L]::uuid[]) $$,
  (select s.id from public.anschreiben s where s.ausschreibung_id = (select id from t where name = 'firma'))),
  'ausschreibung.kein_recht', 'Andy sendet nicht selbst');
select throws_ok(format($$ select public.ausschreibung_entscheiden(%L, 'nicht_teilnehmen') $$, (select id from t where name = 'angebot')),
  'ausschreibung.grund_fehlt', 'Nicht teilnehmen nur mit Grund');
select is(public.ausschreibung_entscheiden((select id from t where name = 'angebot'), 'teilnehmen'), 'teilnahme', 'Andy entscheidet: teilnehmen');
select is((select o.art from public.offerten o join public.ausschreibungen a on a.offerte_id = o.id
  where a.id = (select id from t where name = 'angebot')), 'submission', 'Teilnahme legt eine Offerte vom Typ Submission an');
select is((select count(*)::int from public.kalender_eintraege where quelle = 'crm' and geloescht_am is null
  and extern_id like 'as:' || (select id from t where name = 'angebot') || ':%'), 3, 'drei Fristen stehen im Kalender');
select cmp_ok((select count(*)::int from public.aufgaben where bezug_id = (select id from t where name = 'angebot')), '>=', 6,
  'Erinnerungen 7 und 2 Tage vor jeder Frist');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000008b0a2", "role": "authenticated"}', true);
select is(public.anschreiben_senden(array(select s.id from public.anschreiben s where s.status = 'bewilligt'
  and s.ausschreibung_id in (select id from t where name in ('firma', 'privat')))), 2, 'Chris sendet');
select ok((select text like '%Chris Rosenberg%' and text like '%keine Werbung%' from public.ausgangskorb
  where bezug_id = (select s.id from public.anschreiben s where s.ausschreibung_id = (select id from t where name = 'firma'))),
  'Mail hat feste Signatur und Abmelde-Satz');
select is((select status from public.ausgangskorb where bezug_id = (select s.id from public.anschreiben s
  where s.ausschreibung_id = (select id from t where name = 'firma'))), 'freigegeben', 'Mail ist freigegeben und geht hinaus');
select is((select v.stufe || '/' || (v.wiedervorlage_am = intern.arbeitstage_plus(current_date, 5))::text
  from public.verkaufschancen v join public.ausschreibungen a on a.verkaufschance_id = v.id
  where a.id = (select id from t where name = 'firma')), 'angeschrieben/true', 'Lead erst jetzt: Angeschrieben, Wiedervorlage in 5 Arbeitstagen');

-- Antwort erkennen und Nachfassen (Server)
reset role;
select set_config('request.jwt.claims', '', true);
insert into public.aktivitaeten (art, richtung, text, kontakt_id, details)
select 'mail', 'ein', 'Re: ' || s.betreff || E'\nBitte keine Werbung mehr.', k.kontakt_id, jsonb_build_object('von', k.email)
  from public.anschreiben s join public.ausschreibung_kontakte k on k.id = s.dossier_kontakt_id
 where s.ausschreibung_id = (select id from t where name = 'firma');
select is((select status from public.ausschreibungen where id = (select id from t where name = 'firma')), 'kein_interesse',
  'Antwort «keine Werbung» wird erkannt');
select isnt(intern.gesperrt('info@architekten.test', null), null, 'und die Adresse steht auf der Sperrliste');
update public.anschreiben set versendet_am = now() - interval '14 days' where ausschreibung_id = (select id from t where name = 'privat');
select is((public.ausschreibungen_pruefen() ->> 'nachfassen')::int, 1, 'ohne Antwort: einmal nachfassen');
select is((public.ausschreibungen_pruefen() ->> 'nachfassen')::int, 0, 'nie ein zweites Mal');

-- Beobachten: Elektro-Gesamtlos wartet auf den Zuschlag, dann Akquise beim Gewinner
insert into t select 'elektro', (public.ausschreibung_einlesen('{"quelle": "simap", "quell_id": "t-p2", "art": "ausschreibung",
  "titel": "Elektroinstallationen Neubau Werkhof", "plz": "5600", "vergabestelle": "Testdorf Werke"}') ->> 'id')::uuid;
select is((select spur || '/' || ausloeser from public.ausschreibungen where id = (select id from t where name = 'elektro')),
  'beobachten/zuschlag', 'Elektro-Gesamtlos: beobachten bis zum Zuschlag');
select is(public.ausschreibung_einlesen('{"quelle": "simap", "quell_id": "t-p2", "art": "zuschlag", "titel": "x",
  "kontakte": [{"rolle": "gewinner", "art": "firma", "name": "Strom Gewinner AG", "email": "info@gewinner.test"}]}') ->> 'aktion',
  'aktualisiert', 'Zuschlag zum bekannten Projekt');
select is((select spur || '/' || status from public.ausschreibungen where id = (select id from t where name = 'elektro')),
  'akquise/entwurf', 'nach dem Zuschlag: Spur Akquise mit Entwurf an den Gewinner');
select is(intern.gesperrt(null, 'Testdorf Werke'), null, 'die Sperre der Vergabestelle ist aufgehoben');

-- Papierkorb: offene Anschreiben gehen mit dem Dossier und kommen mit ihm zurück
update public.ausschreibungen set geloescht_am = now() where id = (select id from t where name = 'elektro');
select is((select count(*)::int from public.anschreiben where ausschreibung_id = (select id from t where name = 'elektro')
  and geloescht_am is null), 0, 'Dossier im Papierkorb: Entwurf auch');
update public.ausschreibungen set geloescht_am = null where id = (select id from t where name = 'elektro');
select is((select count(*)::int from public.anschreiben where ausschreibung_id = (select id from t where name = 'elektro')
  and geloescht_am is null and status = 'entwurf'), 1, 'wiederhergestellt: Entwurf wieder da');

-- Quellen-Kontrolle
-- Andere Läufe ausblenden, damit der Test nicht vom Stand der Entwicklungsdatenbank abhängt.
update public.quellen_laeufe set geloescht_am = now() where geloescht_am is null;
insert into public.quellen_laeufe (quelle, beginn, ok) values ('simap', now() - interval '5 days', true);
select cmp_ok((public.ausschreibungen_pruefen() ->> 'quellen_alarm')::int, '>=', 1, 'stille Quelle löst Alarm aus');

select * from finish();
rollback;
