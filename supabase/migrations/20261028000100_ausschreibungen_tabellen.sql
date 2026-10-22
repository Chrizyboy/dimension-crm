-- Phase 8b, Teil 1: Ausschreibungs-Monitor, Tabellen (Konzept vom 21.10.2026, Entscheid 0017).
-- Jede Meldung (simap, Amtsblatt, Baugesuch) wird ein Dossier mit einer von drei Spuren:
--   angebot     wir offerieren selbst (offene Ausschreibung mit PV-Los)
--   akquise     wir schreiben die richtige Firma, Gemeinde oder Bauherrschaft an (Zuschlag, Baugesuch)
--   beobachten  noch zu früh; ein Auslöser (Zuschlag, Planer, Baubewilligung, Datum) schaltet die Spur um
-- Regeln und Texte liegen als Daten in «einstellungen» (Regel 8), nicht im Code.

-- Dossier ----------------------------------------------------------------------------------------------
alter table public.ausschreibungen
  add column nummer           text unique,
  add column standort_id      uuid references public.standorte (id),
  add column sprache          text not null default 'de' check (sprache in ('de', 'fr')),
  add column plz              text,
  add column parzelle         text,
  add column bauherr          text,
  add column bauherr_art      text check (bauherr_art in ('privat', 'firma', 'gemeinde', 'landwirtschaft')),
  add column punkte           int not null default 0,
  add column begruendung      text,
  add column frist_fragen     date,
  add column frist_begehung   timestamptz,
  add column frist_eingabe    timestamptz,
  add column ausloeser        text check (ausloeser in ('zuschlag', 'planer', 'baubewilligung', 'datum')),
  add column ausloeser_am     date,
  add column beobachten_seit  date,
  add column grund            text,
  add column haupt_id         uuid references public.ausschreibungen (id),
  add column korrigiert_am    timestamptz,
  add column eingereicht_am   date,
  add column eingereicht_form text,
  add column vergabestelle_kontakt_id uuid references public.kontakte (id);

alter table public.ausschreibungen alter column status set default 'pruefen';
alter table public.ausschreibungen
  add constraint ausschreibungen_art_check check (art in (
    'ausschreibung', 'elektro_gesamtlos', 'zuschlag', 'planermandat', 'vorankuendigung', 'baugesuch')),
  add constraint ausschreibungen_status_check check (status in (
    'pruefen', 'teilnahme', 'kalkulation', 'eingereicht', 'zuschlag', 'absage', 'nicht_teilnehmen',
    'kontakt_fehlt', 'entwurf', 'bewilligt', 'versendet', 'nachfassen', 'antwort', 'lead', 'kein_interesse',
    'beobachten', 'spaeter', 'verworfen', 'archiviert'));

create sequence public.ausschreibung_nummer_seq;
create index ausschreibungen_offen_idx on public.ausschreibungen (spur, status) where geloescht_am is null;
create index ausschreibungen_dossier_idx on public.ausschreibungen (lower(gemeinde), parzelle) where geloescht_am is null;
create index ausschreibungen_haupt_idx on public.ausschreibungen (haupt_id) where haupt_id is not null;

comment on column public.ausschreibungen.nummer is 'Dossiernummer AS-2026-0001, steht im Betreff jedes Anschreibens (Antworten finden).';
comment on column public.ausschreibungen.haupt_id is 'Doppelte Meldung (gleiche Gemeinde und Parzelle oder Bauherrschaft): gehört zu diesem Dossier.';
comment on column public.ausschreibungen.punkte is 'Bewertung aus Stichworten (Einstellung «ausschreibungen.stichworte»); daraus Priorität A/B/C.';
comment on column public.ausschreibungen.grund is 'Warum verworfen, nicht teilgenommen oder später.';

-- Dossiernummer beim Anlegen vergeben (auch für Meldungen, die von Hand erfasst werden).
create or replace function intern.ausschreibung_nummer() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.nummer is null then
    new.nummer := 'AS-' || extract(year from now())::int || '-' || lpad(nextval('public.ausschreibung_nummer_seq')::text, 4, '0');
  end if;
  return new;
end
$$;
create trigger nummer before insert on public.ausschreibungen for each row execute function intern.ausschreibung_nummer();

-- Offerte vom Typ Submission (Spur Angebot: Kunde ist die Vergabestelle).
alter table public.offerten add column art text not null default 'normal' check (art in ('normal', 'submission'));

-- Verlauf eines Dossiers in der gemeinsamen Zeitachse.
alter table public.aktivitaeten add column ausschreibung_id uuid references public.ausschreibungen (id);
create index aktivitaeten_ausschreibung_idx on public.aktivitaeten (ausschreibung_id, zeitpunkt desc)
  where ausschreibung_id is not null;

-- Fristen eines Dossiers als ganztägige Einträge im CRM-Kalender (nicht aus Outlook).
alter table public.kalender_eintraege drop constraint kalender_eintraege_quelle_check;
alter table public.kalender_eintraege add constraint kalender_eintraege_quelle_check
  check (quelle in ('datei', 'einfuegen', 'outlook', 'crm'));

-- Wer gehört zum Dossier? -------------------------------------------------------------------------------
create table public.ausschreibung_kontakte (
  id               uuid primary key default gen_random_uuid(),
  ausschreibung_id uuid not null references public.ausschreibungen (id),
  rolle            text not null check (rolle in (
    'bauherr', 'architekt', 'gu', 'planer', 'gemeinde', 'gewinner', 'vergabestelle')),
  art              text not null check (art in ('privat', 'firma', 'gemeinde', 'behoerde')),
  name             text not null,
  firma            text,
  email            text,
  telefon          text,
  strasse          text,
  plz              text,
  ort              text,
  sprache          text not null default 'de' check (sprache in ('de', 'fr')),
  kontakt_id       uuid references public.kontakte (id),
  quelle_link      text not null,
  notiz            text
);
select intern.richte_fachtabelle_ein('ausschreibung_kontakte');
create index ausschreibung_kontakte_dossier_idx on public.ausschreibung_kontakte (ausschreibung_id) where geloescht_am is null;
comment on column public.ausschreibung_kontakte.quelle_link is
  'Woher die Angabe stammt (Publikation, Webseite der Firma). Ohne Quelle kein Anschreiben (Regel des Konzepts).';
comment on column public.ausschreibung_kontakte.art is 'privat: nur Brief oder Anruf, nie Mail. firma, gemeinde, behoerde: Mail erlaubt.';

-- Anschreiben (Mail, Brief, Anruf) ----------------------------------------------------------------------
create table public.anschreiben (
  id                uuid primary key default gen_random_uuid(),
  ausschreibung_id  uuid not null references public.ausschreibungen (id),
  dossier_kontakt_id uuid not null references public.ausschreibung_kontakte (id),
  kanal             text not null check (kanal in ('mail', 'brief', 'anruf')),
  art               text not null default 'erst' check (art in ('erst', 'nachfassen')),
  sprache           text not null default 'de' check (sprache in ('de', 'fr')),
  an                text,
  betreff           text not null,
  text              text not null,
  status            text not null default 'entwurf' check (status in ('entwurf', 'bewilligt', 'versendet', 'abgelehnt')),
  abgelehnt_grund   text,
  bewilligt_von     uuid references public.personen (id),
  bewilligt_am      timestamptz,
  versendet_von     uuid references public.personen (id),
  versendet_am      timestamptz,
  ausgang_id        uuid references public.ausgangskorb (id),
  aufgabe_id        uuid references public.aufgaben (id),
  verkaufschance_id uuid references public.verkaufschancen (id),
  antwort_am        timestamptz,
  antwort_art       text check (antwort_art in ('interesse', 'kein_interesse', 'keine_werbung'))
);
select intern.richte_fachtabelle_ein('anschreiben');
create index anschreiben_offen_idx on public.anschreiben (status) where geloescht_am is null;
create index anschreiben_dossier_idx on public.anschreiben (ausschreibung_id) where geloescht_am is null;
create unique index anschreiben_ein_entwurf_idx on public.anschreiben (dossier_kontakt_id, art)
  where geloescht_am is null and status <> 'abgelehnt';
comment on table public.anschreiben is
  'Erst-Anschreiben und höchstens ein Nachfassen pro Kontakt. Der Text ist änderbar, Signatur und Abmelde-Satz nicht.';

-- Zentrale Sperrliste (gilt für alle Module: der Ausgangskorb prüft sie) ------------------------------------
create table public.kontaktsperren (
  id               uuid primary key default gen_random_uuid(),
  art              text not null check (art in ('email', 'domain', 'name')),
  wert             text not null,
  grund            text not null,
  bis              date,
  ausschreibung_id uuid references public.ausschreibungen (id),
  aufgehoben_am    timestamptz,
  aufgehoben_von   uuid references public.personen (id)
);
select intern.richte_fachtabelle_ein('kontaktsperren');
create index kontaktsperren_wert_idx on public.kontaktsperren (art, lower(wert))
  where aufgehoben_am is null and geloescht_am is null;
comment on table public.kontaktsperren is
  'Wer nicht angeschrieben werden darf: «keine Werbung», von Hand gesperrt, Vergabestelle bis zum Zuschlag.';

-- Quellen-Kontrolle: jeder Lauf einer Quelle mit Zahlen; bleibt eine Quelle still, gibt es Alarm.
create table public.quellen_laeufe (
  id            uuid primary key default gen_random_uuid(),
  quelle        text not null,
  beginn        timestamptz not null default now(),
  ende          timestamptz,
  ok            boolean,
  gelesen       int not null default 0,
  neu           int not null default 0,
  aktualisiert  int not null default 0,
  meldung       text
);
select intern.richte_fachtabelle_ein('quellen_laeufe');
create index quellen_laeufe_idx on public.quellen_laeufe (quelle, beginn desc);

-- Einstellungen (alles änderbar ohne Programmieren) ------------------------------------------------------
insert into public.einstellungen (schluessel, wert) values ('ausschreibungen', $json${
  "bewilligen": ["andreas"],
  "bewilligen_vertretung": ["chris"],
  "senden": ["chris"],
  "senden_vertretung": ["loris"],
  "innendienst": ["loris"],
  "alarm": ["chris"],
  "fahrzeit_max": 60,
  "fahrzeit": {"umweg": 1.3, "kmh": 60, "zuschlag_min": 5},
  "kantone": ["FR", "VD", "NE", "VS", "BE", "AG", "LU", "ZG", "SZ", "ZH", "SO", "BL"],
  "nachfassen_arbeitstage": 5,
  "beobachten_monate": 6,
  "erinnern_tage": [7, 2],
  "bewilligen_erinnern_arbeitstage": 2,
  "bewilligen_vertretung_arbeitstage": 3,
  "frist_beide_tage": 7,
  "quelle_still_tage": 2,
  "privat_briefe": true,
  "zusammenfassung_mail": false,
  "simap_zeiten": ["06:52", "12:00", "17:00"],
  "amtsblatt_zeiten": ["06:52"],
  "pruefen_zeit": "07:00",
  "simap_cpv": ["09331200", "09332000", "45261215", "09330000", "45311000", "45315000", "71321000"],
  "amtsblatt_rubriken": ["BP-ZH", "BP-BE", "BP-ZG", "BP-SZ", "BP-SO", "BP-BL", "BP-VS"],
  "stichworte": {
    "stark": ["photovoltaik", "photovoltaïque", "photovoltaique", "pv-anlage", "pv anlage", "solaranlage", "solarstrom",
              "solarpanel", "panneaux solaires", "centrale solaire", "installation solaire", "solaire"],
    "mittel": ["wärmepumpe", "waermepumpe", "pompe à chaleur", "dachsanierung", "dacherneuerung", "réfection de toiture",
               "batteriespeicher", "stromspeicher", "neubau", "construction nouvelle", "nouvelle construction", "energetische sanierung"],
    "schwach": ["mehrfamilienhaus", "einfamilienhaus", "schulhaus", "turnhalle", "werkhof", "gewerbe", "industrie", "halle",
                "landwirtschaft", "scheune", "stall", "immeuble", "villa", "école", "hangar", "ferme", "rural", "umbau", "anbau",
                "transformation", "agrandissement"],
    "aus": ["reinigung", "nettoyage", "catering", "software", "informatik", "versicherung", "assurance", "reklame",
            "fällung", "abattage", "mobilfunk", "antenne", "zaun", "clôture", "parkplatz"],
    "planer": ["planer", "planung", "fachplan", "ingenieur", "bauherrenvertretung", "mandat", "honorar", "études", "mandataire"],
    "elektro": ["elektroinstallation", "elektroanlagen", "elektro-", "installations électriques", "électricité"]
  },
  "signatur": {
    "de": "Freundliche Grüsse\n\nChris Rosenberg\nGeschäftsführer\nDimension Solaire GmbH\nLuzernerstrasse 35, 5630 Muri AG\nchris@dimension-solaire.ch",
    "fr": "Meilleures salutations\n\nChris Rosenberg\nDirecteur\nDimension Solaire Sàrl\nChemin des Crêts 4, 1630 Bulle\nchris@dimension-solaire.ch"
  },
  "ps": {
    "de": "PS: Sie möchten keine Nachrichten mehr von uns? Eine kurze Antwort mit «keine Werbung» genügt, wir tragen Sie sofort aus.",
    "fr": "PS : Vous ne souhaitez plus recevoir de messages de notre part ? Répondez simplement « pas de publicité », nous vous retirons immédiatement."
  },
  "vorlagen": {
    "de": {
      "betreff": "{projekt} in {gemeinde} – Photovoltaik von Dimension Solaire ({nummer})",
      "baugesuch": "{anrede}\n\nIm Amtsblatt haben wir Ihr Bauvorhaben «{projekt}» in {gemeinde} gesehen. Wir planen und bauen Photovoltaikanlagen, Speicher und Wärmepumpen in Ihrer Region.\n\nGerne zeigen wir Ihnen unverbindlich, was eine Solaranlage auf diesem Gebäude bringt: Ertrag, Kosten und Förderung, abgestimmt auf Ihre Planung.\n\nSind Sie offen für ein kurzes Gespräch?",
      "zuschlag": "{anrede}\n\nHerzliche Gratulation zum Zuschlag für «{projekt}» in {gemeinde}. Für die Photovoltaik stehen wir Ihnen gerne als Partner zur Seite: Planung, Montage und Inbetriebnahme aus einer Hand, ganz in Ihrer Nähe.\n\nDürfen wir Ihnen eine Offerte machen?",
      "nachfassen_betreff": "Nachfrage: {projekt} in {gemeinde} ({nummer})",
      "nachfassen": "{anrede}\n\nVor einigen Tagen haben wir Ihnen zu «{projekt}» geschrieben. Passt eine Photovoltaikanlage in Ihre Planung? Eine kurze Rückmeldung freut uns.",
      "anrede_firma": "Sehr geehrte Damen und Herren",
      "anruf": "Gesprächsleitfaden\n1. Vorstellen: Dimension Solaire, PV und Wärmepumpen aus der Region.\n2. Anlass: Baugesuch «{projekt}» in {gemeinde} ({nummer}).\n3. Frage: Ist eine Solaranlage vorgesehen? Wer plant die Elektro- und Dacharbeiten?\n4. Angebot: unverbindlicher Besuch oder Richtofferte.\n5. Bei «kein Interesse» oder «keine Werbung»: danken und im CRM festhalten."
    },
    "fr": {
      "betreff": "{projekt} à {gemeinde} – photovoltaïque par Dimension Solaire ({nummer})",
      "baugesuch": "{anrede}\n\nNous avons vu votre projet « {projekt} » à {gemeinde} dans la feuille officielle. Nous planifions et installons des centrales photovoltaïques, des batteries et des pompes à chaleur dans votre région.\n\nNous vous montrons volontiers, sans engagement, ce qu'une installation solaire apporterait sur ce bâtiment : production, coûts et subventions, en accord avec votre planification.\n\nSeriez-vous disponible pour un bref échange ?",
      "zuschlag": "{anrede}\n\nToutes nos félicitations pour l'adjudication de « {projekt} » à {gemeinde}. Pour la partie photovoltaïque, nous serions heureux d'être votre partenaire : planification, montage et mise en service, tout près de chez vous.\n\nPouvons-nous vous soumettre une offre ?",
      "nachfassen_betreff": "Suivi : {projekt} à {gemeinde} ({nummer})",
      "nachfassen": "{anrede}\n\nIl y a quelques jours, nous vous avons écrit au sujet de « {projekt} ». Une installation photovoltaïque s'intègre-t-elle dans votre projet ? Une brève réponse nous ferait plaisir.",
      "anrede_firma": "Madame, Monsieur",
      "anruf": "Guide d'appel\n1. Présentation : Dimension Solaire, photovoltaïque et pompes à chaleur de la région.\n2. Motif : demande de permis « {projekt} » à {gemeinde} ({nummer}).\n3. Question : une installation solaire est-elle prévue ? Qui planifie l'électricité et la toiture ?\n4. Offre : visite sans engagement ou offre indicative.\n5. En cas de « pas intéressé » ou « pas de publicité » : remercier et noter dans le CRM."
    }
  }
}$json$::jsonb)
on conflict (schluessel) do nothing;
