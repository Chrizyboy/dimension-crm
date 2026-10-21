-- Phase 3, Teil 4: Ablauf-Vorlagen je Produkt, Projekte, Einsätze, Anlagen, Zahlungsplan, Service und Verträge.

-- Ablauf (Fahrplan) je Produkt: PV, Wärmepumpe, Speicher-Nachrüstung, Wallbox (Entscheid 0009).
create table public.ablauf_vorlagen (
  id        uuid primary key default gen_random_uuid(),
  schluessel text not null unique,
  name_de   text not null,
  name_fr   text not null,
  aktiv     boolean not null default true
);
select intern.richte_fachtabelle_ein('ablauf_vorlagen');

create table public.ablauf_schritte (
  id              uuid primary key default gen_random_uuid(),
  ablauf_vorlage_id uuid not null references public.ablauf_vorlagen (id),
  phase           text not null,                      -- Auftrag, Bewilligungen, Vorbereitung, Montage, IBN, Abschluss
  schluessel      text not null,
  name_de         text not null,
  name_fr         text not null,
  reihenfolge     int not null,
  frist_tage      int,                                -- Richtwert ab Auftrag
  pflicht         boolean not null default true,
  unique (ablauf_vorlage_id, schluessel)
);
select intern.richte_fachtabelle_ein('ablauf_schritte');

create table public.projekte (
  id                uuid primary key default gen_random_uuid(),
  nummer            text not null unique,              -- gleiche Nummer wie die angenommene Offerte
  kontakt_id        uuid not null references public.kontakte (id),
  objekt_id         uuid references public.objekte (id),
  offerte_id        uuid references public.offerten (id),
  verkaufschance_id uuid references public.verkaufschancen (id),
  ablauf_vorlage_id uuid references public.ablauf_vorlagen (id),
  titel             text,
  status            text not null default 'auftrag',   -- auswahlwerte 'projektstatus'
  bau_status        text,                              -- auswahlwerte 'baustatus'
  standort_id       uuid references public.standorte (id),
  verantwortlich_id uuid references public.personen (id),
  architekt         text,
  elektriker        text,
  material_status   text,                              -- lager, bestellt …
  werktage          numeric(6, 1),
  baubeginn         date,
  unterzeichnet_am  date,
  vertragswert_rappen bigint,
  vertrag_sprache   text,
  werkvertrag       jsonb,
  checkliste        jsonb not null default '{}',       -- DRT, AI, Schema, IAT, RS/PM, Zertifikat
  bewilligungen     jsonb not null default '{}',
  zahlungskonditionen text
);
select intern.richte_fachtabelle_ein('projekte');
create index projekte_kontakt_idx on public.projekte (kontakt_id);
alter table public.aktivitaeten add constraint aktivitaeten_projekt_fk foreign key (projekt_id) references public.projekte (id);

-- Stand jedes Ablauf-Schritts im Projekt: offen, teilweise, erledigt, nicht nötig.
create table public.projekt_schritte (
  id              uuid primary key default gen_random_uuid(),
  projekt_id      uuid not null references public.projekte (id),
  ablauf_schritt_id uuid references public.ablauf_schritte (id),
  schluessel      text not null,
  stand           text not null default 'offen' check (stand in ('offen', 'teilweise', 'erledigt', 'nicht_noetig')),
  frist           date,
  erledigt_am     date,
  notiz           text,
  unique (projekt_id, schluessel)
);
select intern.richte_fachtabelle_ein('projekt_schritte');

-- Einsätze (Montage-Tage) für die Planung von Teams und Subunternehmern.
create table public.einsaetze (
  id          uuid primary key default gen_random_uuid(),
  projekt_id  uuid not null references public.projekte (id),
  art         text not null default 'geplant',
  von         date not null,
  bis         date not null,
  team        text[] not null default '{}',
  notiz       text
);
select intern.richte_fachtabelle_ein('einsaetze');

-- Gebaute Anlage mit Komponenten, Seriennummern, IBN und Garantien.
create table public.anlagen (
  id            uuid primary key default gen_random_uuid(),
  projekt_id    uuid references public.projekte (id),
  objekt_id     uuid not null references public.objekte (id),
  leistung_kwp  numeric(10, 3),
  komponenten   jsonb not null default '[]',
  ibn_am        date,
  garantie_bis  date,
  naechste_kontrolle date,
  monitoring    jsonb
);
select intern.richte_fachtabelle_ein('anlagen');

-- Zahlungsplan (Tranchen) je Projekt, Abgleich mit AbaNinja in Phase 10.
create table public.zahlungsplan (
  id              uuid primary key default gen_random_uuid(),
  projekt_id      uuid not null references public.projekte (id),
  bezeichnung     text not null,
  betrag_rappen   bigint not null,
  faellig_am      date,
  rechnung_nr     text,
  rechnung_am     date,
  bezahlt_am      date,
  mahnstufe       int not null default 0,
  mahnfrist       date,
  abaninja_id     text
);
select intern.richte_fachtabelle_ein('zahlungsplan');

create table public.service_faelle (
  id            uuid primary key default gen_random_uuid(),
  nummer        text not null unique,                -- S001 …
  kontakt_id    uuid references public.kontakte (id),
  anlage_id     uuid references public.anlagen (id),
  projekt_id    uuid references public.projekte (id),
  titel         text not null,
  kategorie     text,
  prioritaet    text,
  status        text not null default 'neu',
  person_id     uuid references public.personen (id),
  termin_am     timestamptz,
  garantie      boolean,
  beschreibung  text,
  verlauf       jsonb not null default '[]',
  erledigt_am   date
);
select intern.richte_fachtabelle_ein('service_faelle');

create table public.wartungsvertraege (
  id            uuid primary key default gen_random_uuid(),
  kontakt_id    uuid not null references public.kontakte (id),
  anlage_id     uuid references public.anlagen (id),
  offerte_id    uuid references public.offerten (id),
  leistungen    jsonb not null default '[]',
  preis_rappen  bigint,
  rhythmus_monate int,
  letzte_wartung date,
  naechste_wartung date,
  verlauf       jsonb not null default '[]'
);
select intern.richte_fachtabelle_ein('wartungsvertraege');

-- Interne Rückmeldungen ans CRM-Team (Vorlage: tickets).
create table public.rueckmeldungen (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  status      text not null default 'neu',
  antwort     text,
  antwort_von text
);
select intern.richte_fachtabelle_ein('rueckmeldungen');
