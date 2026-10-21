-- Phase 3, Teil 2: Kontakt → Objekt → Verkaufschance, dazu Zeitachse, Aufgaben und Dokumente.
-- In der Vorlage gab es keine Kunden-Tabelle; ein Kunde war nur eine Nummer auf Lead und Offerte.

-- Fortlaufende Kundennummer (K0001 …). Der Import setzt sie auf den Stand der Vorlage.
create sequence public.kundennummer_seq;

create table public.kontakte (
  id            uuid primary key default gen_random_uuid(),
  kundennummer  int not null unique default nextval('public.kundennummer_seq'),
  art           text not null default 'person' check (art in ('person', 'firma')),
  -- Privat, Partner, Architekt:in, Elektriker:in, Lieferant, Behörde … (auswahlwerte 'kontaktart')
  kontaktart    text not null default 'privat',
  anrede        text,
  vorname       text,
  nachname      text,
  firma         text,
  email         text,
  telefon       text,
  sprache       text not null default 'de' check (sprache in ('de', 'fr')),
  werbesperre   boolean not null default false,
  einwilligung  jsonb,                               -- {quelle, datum, kanal} gemäss revDSG
  notiz         text
);
select intern.richte_fachtabelle_ein('kontakte');
create index kontakte_suche_idx on public.kontakte
  using gin ((coalesce(vorname, '') || ' ' || coalesce(nachname, '') || ' ' || coalesce(firma, '') || ' ' || coalesce(email, '')) gin_trgm_ops);

-- Liegenschaft. Ein Kontakt kann mehrere haben; eine Nachrüstung ist eine weitere Verkaufschance am selben Objekt.
create table public.objekte (
  id            uuid primary key default gen_random_uuid(),
  kontakt_id    uuid not null references public.kontakte (id),
  strasse       text,
  plz           text,
  ort           text,
  kanton        text,
  breite        double precision,
  laenge        double precision,
  region_id     uuid references public.regionen (id),
  gebaeudeart   text,                               -- auswahlwerte 'gebaeudeart'
  dachform      text,                               -- auswahlwerte 'dachform'
  eigentum      text,                               -- auswahlwerte 'eigentum'
  dach          jsonb not null default '{}',        -- Fläche, Ausrichtung, Neigung, Material
  verbrauch_kwh int,
  netzbetreiber text,
  gemeinde      text
);
select intern.richte_fachtabelle_ein('objekte');
create index objekte_kontakt_idx on public.objekte (kontakt_id);

-- Verkaufschance (in der Oberfläche «Anfragen & Leads»). Nummer L001 … bleibt aus der Vorlage.
create table public.verkaufschancen (
  id                  uuid primary key default gen_random_uuid(),
  nummer              text not null unique,
  kontakt_id          uuid not null references public.kontakte (id),
  objekt_id           uuid references public.objekte (id),
  stufe               text not null default 'neu',      -- auswahlwerte 'verkaufsstufe'
  quelle              text,                             -- auswahlwerte 'quelle'
  eingang_am          date,
  zustaendig          text,                             -- Muri, Bulle, Andy (Vorlage «zu»)
  erstkontakt_standort text,                            -- Vorlage «erst»
  zugewiesen_von      text,                             -- Vorlage «zuvon»
  region_id           uuid references public.regionen (id),
  tour_person_id      uuid references public.personen (id),
  termin_am           timestamptz,
  termin_dauer_min    int,
  termin_bestaetigt   jsonb,                            -- Bestätigung an Kunde
  outlook             jsonb,                            -- Outlook-Termin (Phase 8)
  wiedervorlage_am    date,
  wiedervorlage_grund text,
  verlustgrund        text,
  interesse           text[] not null default '{}',     -- pv, batterie, wallbox, waermepumpe
  finanzierung        text,
  zeithorizont        text,
  foerderung          text,
  erreichbarkeit      text,
  erledigt            boolean,
  offerte_status      text,                             -- neu, bearbeitung, offeriert
  offerte_von         text,
  offerte_seit        timestamptz,
  offerte_hinweis     text,
  offerte_hinweis_von text,
  offerte_rueckfrage  text,
  zur_offerte_am      date,
  besichtigung        jsonb,
  luftbild            jsonb,
  kommentar_kunde     text,
  notiz_intern        text,
  verlauf_text        text                              -- alter Textverlauf «hist», wird in Phase 5 zur Zeitachse
);
select intern.richte_fachtabelle_ein('verkaufschancen');
create index verkaufschancen_kontakt_idx on public.verkaufschancen (kontakt_id);
create index verkaufschancen_stufe_idx on public.verkaufschancen (stufe) where geloescht_am is null;

-- Zeitachse: Anruf, Mail, Besuch, Brief, Notiz, SMS, System-Ereignis.
create table public.aktivitaeten (
  id                uuid primary key default gen_random_uuid(),
  art               text not null,                      -- auswahlwerte 'aktivitaet'
  richtung          text check (richtung in ('ein', 'aus')),
  zeitpunkt         timestamptz not null default now(),
  text              text,
  ergebnis          text,
  person_id         uuid references public.personen (id),
  kontakt_id        uuid references public.kontakte (id),
  verkaufschance_id uuid references public.verkaufschancen (id),
  projekt_id        uuid,                               -- Fremdschlüssel nach Anlage von «projekte»
  mail_kennung      text,                               -- Message-ID, verhindert doppelten Import
  details           jsonb not null default '{}'
);
select intern.richte_fachtabelle_ein('aktivitaeten');
create index aktivitaeten_kontakt_idx on public.aktivitaeten (kontakt_id, zeitpunkt desc);

-- Aufgaben, an jedes Objekt hängbar (bezug_tabelle + bezug_id).
create table public.aufgaben (
  id            uuid primary key default gen_random_uuid(),
  titel         text not null,
  faellig_am    date,
  person_id     uuid references public.personen (id),
  bezug_tabelle text,
  bezug_id      uuid,
  erledigt_am   timestamptz,
  erledigt_von  uuid references public.personen (id)
);
select intern.richte_fachtabelle_ein('aufgaben');

-- Dokumente: Dateien im eigenen Speicher (Bucket «dokumente») oder als Verweis auf SharePoint.
create table public.dokumente (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  mime_typ      text,
  bytes         bigint,
  ordner        text,                                 -- angebot, bilder, werkvertrag, beleg …
  speicher      text not null check (speicher in ('intern', 'sharepoint')),
  speicher_pfad text,                                 -- Pfad im Bucket
  sharepoint_url  text,
  sharepoint_pfad text,
  sharepoint_status jsonb,                            -- Sicherungsstatus aus der Vorlage (kbfiles)
  bezug_tabelle text,
  bezug_id      uuid,
  hochgeladen_von text,
  hochgeladen_am  timestamptz
);
select intern.richte_fachtabelle_ein('dokumente');
create index dokumente_bezug_idx on public.dokumente (bezug_tabelle, bezug_id);

-- Kundenordner in SharePoint (Vorlage: kbfolders).
create table public.sharepoint_ordner (
  id          uuid primary key default gen_random_uuid(),
  kontakt_id  uuid references public.kontakte (id),
  name        text not null,
  ordner_id   text not null,
  url         text,
  unterordner jsonb not null default '{}'
);
select intern.richte_fachtabelle_ein('sharepoint_ordner');
