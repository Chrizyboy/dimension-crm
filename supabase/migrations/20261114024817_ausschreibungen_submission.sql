-- Ausschreibungen vollständig (2.11.2026, Entscheid 0050): eine Submission von der Publikation bis zum Zuschlag.
-- Neu: Eckdaten und Zuschlagskriterien, Go/No-Go mit Vorschlag, Eingabe-Checkliste, Prüfung durch eine zweite
-- Person, Öffnungsprotokoll mit allen Anbietern (Mitbewerber), Zuschlag legt das Projekt an. Dazu firmenweite
-- Eignungsnachweise mit Ablaufdatum und eine Referenzliste für Eingaben. Regeln liegen in «einstellungen» (Regel 8).

-- Dossier: Eckdaten der Submission -----------------------------------------------------------------------
alter table public.ausschreibungen
  add column verantwortlich_id  uuid references public.personen (id),
  add column verfahren          text check (verfahren in ('offen', 'selektiv', 'einladung', 'freihaendig')),
  add column auftragsart        text check (auftragsart in ('bau', 'liefer', 'dienst')),
  add column leistung_kwp       numeric(10, 1),
  add column schaetzung_rappen  bigint,
  add column ausfuehrung_von    date,
  add column ausfuehrung_bis    date,
  add column kriterien          jsonb not null default '[]',
  add column varianten          boolean,
  add column arge               boolean,
  add column eignung_ref_kwp    numeric(10, 1),
  add column frist_oeffnung     timestamptz,
  add column zuschlag_erwartet  date,
  add column bindefrist_monate  int,
  add column eingabe_adresse    text,
  add column gng_vorschlag      jsonb,
  add column gng_entscheid      text check (gng_entscheid in ('go', 'nogo')),
  add column gng_grund          text,
  add column gng_von            uuid references public.personen (id),
  add column gng_am             timestamptz,
  add column checkliste         jsonb not null default '{}',
  add column pruefung_von       uuid references public.personen (id),
  add column pruefung_am        timestamptz,
  add column angebot_rappen     bigint,
  add column rang               int,
  add column anbieter_anzahl    int,
  add column zuschlag_rappen    bigint,
  add column gewinner           text,
  add column entscheid_datum    date,
  add column beschwerde_bis     date,
  add column debriefing_am      date,
  add column ohne_protokoll     text,
  add column projekt_id         uuid references public.projekte (id);

comment on column public.ausschreibungen.kriterien is 'Zuschlagskriterien: [{name, gewicht}] in Prozent (Summe 100).';
comment on column public.ausschreibungen.gng_vorschlag is 'Go/No-Go-Vorschlag im Moment des Entscheids: {punkte, empfehlung, teile[]}.';
comment on column public.ausschreibungen.checkliste is 'Erledigte Punkte der Eingabe-Checkliste: {schluessel: {am, von}}; Punkte aus «ausschreibungen.checkliste».';
comment on column public.ausschreibungen.ohne_protokoll is 'Warum es kein Öffnungsprotokoll gibt (z. B. nicht öffentliche Öffnung); sonst ist es Pflicht.';
create index ausschreibungen_verantwortlich_idx on public.ausschreibungen (verantwortlich_id) where geloescht_am is null;

-- Öffnungsprotokoll: alle Anbieter einer Submission mit Preis und Rang (daraus die Mitbewerber) -------------
create table public.ausschreibung_angebote (
  id               uuid primary key default gen_random_uuid(),
  ausschreibung_id uuid not null references public.ausschreibungen (id),
  anbieter         text not null,
  ort              text,
  betrag_rappen    bigint not null check (betrag_rappen > 0),
  rang             int,
  wir              boolean not null default false,
  bemerkung        text
);
select intern.richte_fachtabelle_ein('ausschreibung_angebote');
create index ausschreibung_angebote_dossier_idx on public.ausschreibung_angebote (ausschreibung_id) where geloescht_am is null;
create index ausschreibung_angebote_anbieter_idx on public.ausschreibung_angebote (lower(anbieter)) where geloescht_am is null;
comment on table public.ausschreibung_angebote is 'Öffnungsprotokoll: jedes Angebot einer Submission (wir = eigenes). Grundlage für Mitbewerber und Preisvergleich.';

-- Eignungsnachweise der Firma (Betreibungsauszug, SUVA, AHV …) mit Ablaufdatum ------------------------------
create table public.firmen_nachweise (
  id             uuid primary key default gen_random_uuid(),
  firma_id       uuid not null references public.firmen (id),
  art            text not null,
  ausgestellt_am date not null,
  gueltig_bis    date not null,
  datei_pfad     text,
  notiz          text
);
select intern.richte_fachtabelle_ein('firmen_nachweise');
create index firmen_nachweise_idx on public.firmen_nachweise (firma_id, art, gueltig_bis desc) where geloescht_am is null;
comment on table public.firmen_nachweise is 'Eignungsnachweise je Firma. Arten und Gültigkeit in «ausschreibungen.nachweise». Der jüngste je Art gilt.';

insert into storage.buckets (id, name, public) values ('nachweise', 'nachweise', false)
on conflict (id) do nothing;
create policy "nachweise lesen" on storage.objects for select to authenticated
  using (bucket_id = 'nachweise' and intern.hat_recht('basis'));
create policy "nachweise ablegen" on storage.objects for insert to authenticated
  with check (bucket_id = 'nachweise' and intern.hat_recht('basis'));

-- Referenzliste für Eingaben (aus Projekten übernommen oder von Hand) ---------------------------------------
create table public.submission_referenzen (
  id              uuid primary key default gen_random_uuid(),
  projekt_id      uuid references public.projekte (id),
  titel           text not null,
  ort             text,
  leistung_kwp    numeric(10, 1),
  jahr            int,
  gebaeude        text,
  auftraggeber    text,
  ansprechperson  text,
  telefon         text,
  sprache         text not null default 'de' check (sprache in ('de', 'fr')),
  freigegeben     boolean not null default true,
  notiz           text
);
select intern.richte_fachtabelle_ein('submission_referenzen');
create unique index submission_referenzen_projekt_idx on public.submission_referenzen (projekt_id)
  where projekt_id is not null and geloescht_am is null;
comment on column public.submission_referenzen.freigegeben is 'Nur freigegebene Referenzen (Auftraggeber einverstanden) erscheinen in Eingaben.';

-- Einstellungen ergänzen (nur fehlende Schlüssel, Bestehendes bleibt) ------------------------------------------
update public.einstellungen set wert = $json${
  "nachweise": [
    {"art": "handelsregister", "de": "Handelsregisterauszug", "fr": "Extrait du registre du commerce", "monate": 6},
    {"art": "betreibung", "de": "Betreibungsregisterauszug", "fr": "Extrait du registre des poursuites", "monate": 3},
    {"art": "suva", "de": "SUVA-Bestätigung", "fr": "Attestation SUVA", "monate": 12},
    {"art": "ahv", "de": "AHV/IV/EO-Bestätigung", "fr": "Attestation AVS/AI/APG", "monate": 12},
    {"art": "bvg", "de": "BVG-Bestätigung (Pensionskasse)", "fr": "Attestation LPP (caisse de pension)", "monate": 12},
    {"art": "mwst", "de": "MWST-Bestätigung", "fr": "Attestation TVA", "monate": 12},
    {"art": "steuern", "de": "Steuerbestätigung", "fr": "Attestation fiscale", "monate": 12},
    {"art": "haftpflicht", "de": "Betriebshaftpflicht", "fr": "Assurance RC entreprise", "monate": 12},
    {"art": "gav", "de": "Paritätische Kommission (GAV)", "fr": "Commission paritaire (CCT)", "monate": 12}
  ],
  "nachweise_zustaendig": [],
  "nachweise_vorlauf_tage": 30,
  "checkliste": [
    {"schluessel": "unterlagen", "de": "Unterlagen geladen und abgelegt", "fr": "Documents téléchargés et classés"},
    {"schluessel": "nachweise", "de": "Eignungsnachweise gültig bis zur Eingabe", "fr": "Attestations valables jusqu'au dépôt", "auto": "nachweise"},
    {"schluessel": "referenzen", "de": "Referenzen ausgewählt", "fr": "Références choisies"},
    {"schluessel": "lv", "de": "Leistungsverzeichnis ausgefüllt", "fr": "Descriptif / série de prix remplis"},
    {"schluessel": "programm", "de": "Ausführungsprogramm", "fr": "Programme des travaux"},
    {"schluessel": "selbstdeklaration", "de": "Selbstdeklaration unterschrieben", "fr": "Autodéclaration signée"},
    {"schluessel": "pruefung", "de": "Prüfung durch zweite Person", "fr": "Contrôle par une deuxième personne", "auto": "pruefung"},
    {"schluessel": "versand", "de": "Unterschrieben und versandt", "fr": "Signé et envoyé"}
  ],
  "gng": {"go": 65, "pruefen": 45, "referenzen": 3, "monate_quote": 24},
  "nogo_gruende": ["kapazitaet", "zu_klein", "gesamtlos", "eignung", "zu_weit", "preis", "frist", "andere"],
  "pruefen": ["chris"],
  "pruefen_vertretung": ["andreas"],
  "pruefen_ab_rappen": 10000000,
  "beschwerde_tage": 20,
  "post_arbeitstage": 2
}$json$::jsonb || wert
 where schluessel = 'ausschreibungen';

-- Rechte: Tabellen lesen alle mit Grundrecht (RLS aus richte_fachtabelle_ein); geändert wird über Funktionen
-- oder direkt (Nachweise, Referenzen), protokolliert und ohne hartes Löschen.
