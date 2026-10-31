-- Prüft Phase 18: Posteingang. Fristen in Arbeitszeit, feste Regeln beim Aufnehmen (intern, Werbung, Formular),
-- Einordnen mit Zuordnung über Nummern und Zuständigkeit (Projekt, Einstellung, Stellvertretung), Glocke bei Anfrage
-- und Störung, Erinnern in drei Stufen, «beantwortet» aus gesendeten Mails und aus dem Ausgangskorb, Sichtbarkeit
-- persönlicher Mails, Änderungen nur über posteingang_setzen, Einstellung nur Administration.
-- Ausführen: npm run db:test
begin;
select plan(31);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000018a1', 'pe-anna@test.local'),
  ('00000000-0000-0000-0000-0000000018a2', 'pe-ben@test.local'),
  ('00000000-0000-0000-0000-0000000018a3', 'pe-chef@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000018b1', 'pe_anna', 'Anna Test', 'pe-anna@dimension-solaire.ch',
   '00000000-0000-0000-0000-0000000018a1', 'mitarbeit', '{}'),
  ('00000000-0000-0000-0000-0000000018b2', 'pe_ben', 'Ben Test', 'pe-ben@dimension-solaire.ch',
   '00000000-0000-0000-0000-0000000018a2', 'mitarbeit', '{}'),
  ('00000000-0000-0000-0000-0000000018b3', 'pe_chef', 'Chef Test', 'pe-chef@dimension-solaire.ch',
   '00000000-0000-0000-0000-0000000018a3', 'admin', '{admin}');
update public.integrationen set einstellungen = einstellungen || '{"eigene_domains": ["dimension-solaire.ch"]}'
 where dienst = 'microsoft';
update public.einstellungen set wert = wert || '{"zustaendig": {"standard": {"de": "pe_anna", "fr": "pe_ben"}},
  "vertretung": {"pe_ben": "pe_anna"}, "eskalation": ["pe_chef"]}'::jsonb
 where schluessel = 'posteingang';

create temporary table t (name text primary key, id uuid) on commit drop;
grant all on t to authenticated;

-- Fristen in Arbeitszeit (Mo–Fr 07:30–17:30 Zürich)
select is(intern.pe_arbeitszeit_plus('2026-11-06 18:00+01', 240, intern.pe_einstellung()), '2026-11-09 11:30+01'::timestamptz,
  'Freitagabend + 4 Arbeitsstunden = Montag 11:30');
select is(intern.pe_arbeitszeit_plus('2026-11-02 16:30+01', 120, intern.pe_einstellung()), '2026-11-03 08:30+01'::timestamptz,
  'über den Feierabend: Rest am nächsten Morgen');
select is(intern.pe_arbeitszeit_plus('2026-12-24 17:00+01', 60, intern.pe_einstellung()), '2026-12-28 08:00+01'::timestamptz,
  'Weihnachten und Stephanstag zählen nicht');
select is(intern.pe_arbeitsminuten('2026-11-06 16:30+01', '2026-11-09 08:30+01', intern.pe_einstellung()), 120,
  'Wochenende zählt nicht zur Reaktionszeit');

-- Aufnehmen mit festen Regeln (Server)
select is(public.posteingang_aufnehmen('00000000-0000-0000-0000-0000000018b1', 'me', $j$[
  {"kennung": "<pe1@x>", "outlook_id": "o1", "konversation": "k1", "eingang_am": "2026-11-02T09:00:00+01:00",
   "von": "kunde.pe@bluewin.ch", "von_name": "Kunde PE", "betreff": "Wechselrichter Fehler", "vorschau": "Fehler 3002"},
  {"kennung": "<pe2@x>", "outlook_id": "o2", "eingang_am": "2026-11-02T09:00:00+01:00", "von": "newsletter@shop-pe.ch",
   "betreff": "Rabatt"},
  {"kennung": "<pe3@x>", "outlook_id": "o3", "eingang_am": "2026-11-02T09:00:00+01:00", "von": "pe-ben@dimension-solaire.ch",
   "betreff": "Mittag?"},
  {"kennung": "<pe4@x>", "outlook_id": "o4", "eingang_am": "2026-11-02T09:00:00+01:00", "von": "anfrage@solar-guide.ch",
   "betreff": "solar-guide.ch: Anfrage von Muster"},
  {"kennung": "<pe5@x>", "outlook_id": "o5", "konversation": "k5", "eingang_am": "2026-11-02T09:00:00+01:00",
   "von": "sophie.pe@gmail.com", "betreff": "Demande d'offre", "vorschau": "Bonjour"}
]$j$), 5, 'fünf neue Mails');
select is(public.posteingang_aufnehmen('00000000-0000-0000-0000-0000000018b1', 'me',
  '[{"kennung": "<pe1@x>", "outlook_id": "o1", "von": "kunde.pe@bluewin.ch"}]'), 0, 'dieselbe Mail nur einmal');
select is((select stand || '/' || art from public.posteingang where kennung = '<pe2@x>'), 'abgelegt/werbung', 'Newsletter abgelegt');
select is((select stand || '/' || art || '/' || sichtbar from public.posteingang where kennung = '<pe3@x>'), 'abgelegt/intern/person',
  'Kollegin intern, nur im eigenen Postfach sichtbar');
select is((select stand || '/' || erledigt_grund from public.posteingang where kennung = '<pe4@x>'), 'erledigt/automatisch',
  'Formular-Anfrage macht schon der Job «anfragen»');
select is((select stand || '/' || sichtbar from public.posteingang where kennung = '<pe1@x>'), 'neu/person',
  'unbekannter Absender im persönlichen Postfach: erst einordnen');
select is((select count(*)::int from public.posteingang_unsortiert(10) u where u.id in
  (select id from public.posteingang where kennung like '<pe%')), 2, 'zwei Mails warten auf die KI');

-- Einordnen: Projekt-Nummer führt zu Kunde und Projektleitung
with k as (insert into public.kontakte (vorname, nachname, email) values ('Kunde', 'PE', 'kunde.pe2@bluewin.ch') returning id)
insert into t select 'kunde', id from k;
with p as (insert into public.projekte (nummer, kontakt_id, verantwortlich_id)
  values ('PE-2026-001', (select id from t where name = 'kunde'), '00000000-0000-0000-0000-0000000018b2') returning id)
insert into t select 'projekt', id from p;
select public.posteingang_sortieren((select id from public.posteingang where kennung = '<pe1@x>'),
  '{"art": "stoerung", "sprache": "de", "dringend": true, "antwort_noetig": true, "zusammenfassung": "Anlage steht",
    "nummern": ["pe-2026-001"]}');
select is((select projekt_id from public.posteingang where kennung = '<pe1@x>'), (select id from t where name = 'projekt'),
  'Projekt über die Nummer gefunden (Gross-/Kleinschreibung egal)');
select is((select kontakt_id from public.posteingang where kennung = '<pe1@x>'), (select id from t where name = 'kunde'),
  'Kunde aus dem Projekt');
select is((select zustaendig_id from public.posteingang where kennung = '<pe1@x>'), '00000000-0000-0000-0000-0000000018b2'::uuid,
  'zuständig ist die Projektleitung');
select is((select stand || '/' || sichtbar from public.posteingang where kennung = '<pe1@x>'), 'offen/team',
  'Störung: offen und fürs Team sichtbar');
select is((select frist_am from public.posteingang where kennung = '<pe1@x>'), '2026-11-02 11:00+01'::timestamptz,
  'Störung: 2 Arbeitsstunden');
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000018b2'
  and titel_de = 'Störung gemeldet'), 1, 'Störung meldet sich gleich mit der Glocke');

-- Einordnen nach Sprache und Stellvertretung (Ben ist laut Outlook abwesend)
insert into public.kalender_eintraege (person_id, beginn, ende, anzeige_als, quelle)
values ('00000000-0000-0000-0000-0000000018b2', now() - interval '1 hour', now() + interval '1 day', 'oof', 'outlook');
select public.posteingang_sortieren((select id from public.posteingang where kennung = '<pe5@x>'),
  '{"art": "anfrage", "sprache": "fr", "antwort_noetig": true, "zusammenfassung": "Veut une offre"}');
select is((select zustaendig_id::text || '/' || vertretung_fuer::text from public.posteingang where kennung = '<pe5@x>'),
  '00000000-0000-0000-0000-0000000018b1/00000000-0000-0000-0000-0000000018b2', 'Französisch → Ben, abwesend → Anna');
select is((select frist_am from public.posteingang where kennung = '<pe5@x>'), '2026-11-02 13:00+01'::timestamptz,
  'Anfrage: 4 Arbeitsstunden');

-- Beantwortet: gesendete Mail im gleichen Verlauf (auch direkt aus Outlook)
select is(public.posteingang_antworten('[{"konversation": "k1", "von": "pe-ben@dimension-solaire.ch",
  "an": ["kunde.pe@bluewin.ch"], "zeitpunkt": "2026-11-02T10:00:00+01:00"}]'), 1, 'Antwort erkannt');
select is((select stand || '/' || erledigt_grund || '/' || reaktion_minuten || '/' || erledigt_von
  from public.posteingang where kennung = '<pe1@x>'),
  'erledigt/beantwortet/60/00000000-0000-0000-0000-0000000018b2', 'erledigt mit Reaktionszeit und Person');

-- Erinnern: Vorwarnung, Frist um, doppelte Frist an die Leitung (je einmal)
update public.posteingang set frist_am = now() + interval '10 minutes', eskalation_am = now() + interval '2 hours'
 where kennung = '<pe5@x>';
select public.posteingang_erinnern();
select is((select erinnert from public.posteingang where kennung = '<pe5@x>'), 1, 'Vorwarnung');
update public.posteingang set frist_am = now() - interval '1 minute' where kennung = '<pe5@x>';
select public.posteingang_erinnern();
select public.posteingang_erinnern();
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000018b1'
  and titel_de = 'Antwortfrist überschritten'), 1, 'Frist um: einmal Glocke');
update public.posteingang set eskalation_am = now() - interval '1 minute' where kennung = '<pe5@x>';
select public.posteingang_erinnern();
select is((select count(*)::int from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000018b3'
  and titel_de = 'Kunde wartet doppelt so lange wie vorgesehen'), 1, 'doppelte Frist: Glocke an die Leitung');

-- Beantwortet aus dem Ausgangskorb
with a as (insert into public.ausgangskorb (kanal, an, betreff, text, status, bezug_tabelle, bezug_id)
  values ('mail', 'sophie.pe@gmail.com', 'Re', 'Bonjour', 'freigegeben', 'posteingang',
          (select id from public.posteingang where kennung = '<pe5@x>')) returning id)
insert into t select 'ausgang', id from a;
update public.ausgangskorb set status = 'gesendet', gesendet_am = now() where id = (select id from t where name = 'ausgang');
select is((select stand || '/' || erledigt_grund from public.posteingang where kennung = '<pe5@x>'), 'erledigt/beantwortet',
  'gesendet aus dem CRM zählt sofort');

-- Sichtbarkeit und Änderungen aus der App
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000018a2", "role": "authenticated"}', true);
select is((select count(*)::int from public.posteingang where kennung = '<pe3@x>'), 0,
  'Interne Mail in Annas Postfach sieht Ben nicht');
select is((select count(*)::int from public.posteingang where kennung = '<pe1@x>'), 1, 'Kundenmail sieht das Team');
with u as (update public.posteingang set stand = 'erledigt' where kennung = '<pe1@x>' returning 1)
select is((select count(*)::int from u), 0, 'direkt ändern geht nicht (nur über posteingang_setzen)');
select public.posteingang_setzen((select id from public.posteingang where kennung = '<pe1@x>'), 'oeffnen');
select is((select stand from public.posteingang where kennung = '<pe1@x>'), 'offen', 'wieder öffnen mit alter Frist');
select throws_ok($$ select public.posteingang_setzen((select id from public.posteingang where kennung = '<pe1@x>'), 'art',
  '{"art": "quatsch"}') $$, 'posteingang.art_unbekannt', 'unbekannte Art abgelehnt');
select throws_ok($$ update public.einstellungen set wert = wert || '{"aktiv": false}' where schluessel = 'posteingang' $$,
  '42501', 'posteingang.kein_recht', 'Einstellung nur Administration');
reset role;
select set_config('request.jwt.claims', '', true);

select * from finish();
rollback;
