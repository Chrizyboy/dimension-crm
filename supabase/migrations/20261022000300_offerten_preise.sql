-- Phase 3, Teil 3: Preisliste, Lieferanten, Kalkulationen und Offerten.

create table public.lieferanten (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  kontakt_id uuid references public.kontakte (id),
  email_bestellung text,                              -- Bestellungen gehen nach Freigabe als Mail mit PDF (Phase 9a)
  kundennummer_bei_lieferant text,
  aktiv      boolean not null default true,
  notiz      text
);
select intern.richte_fachtabelle_ein('lieferanten');

-- Artikel der Preisliste. Einkaufspreise stehen bewusst getrennt in «lieferantenpreise» (Recht 'preise'),
-- damit alle die Preisliste sehen, aber nur Berechtigte die Einkaufspreise.
create table public.artikel (
  id              uuid primary key default gen_random_uuid(),
  artikelnummer   text,
  name            text not null,
  kategorie       text not null,                      -- auswahlwerte 'artikelkategorie'
  hersteller_gruppe text,
  einheit         text not null default 'Stk',
  leistung_w      int,                                -- Modulleistung in Watt
  verkauf_rappen  bigint,                             -- Bruttopreis
  marge           numeric(6, 4),
  rabatt          numeric(6, 4),
  skonto          numeric(6, 4),
  bevorzugter_lieferant_id uuid references public.lieferanten (id),
  gewicht_kg      numeric(10, 2),
  masse           text,
  masse_art       text,
  masse_quelle    jsonb,
  datenblaetter   jsonb not null default '{}',        -- {de, fr, en}
  quelle          text,
  archiviert_am   timestamptz,
  archiviert_von  text,
  archiv_grund    text,
  nachfolger_id   uuid references public.artikel (id)
);
select intern.richte_fachtabelle_ein('artikel');
create index artikel_suche_idx on public.artikel using gin ((name || ' ' || coalesce(artikelnummer, '')) gin_trgm_ops);

create table public.lieferantenpreise (
  id            uuid primary key default gen_random_uuid(),
  artikel_id    uuid not null references public.artikel (id),
  -- leer, wenn die Vorlage einen Einkaufspreis ohne Lieferant hatte (wird in Phase 7 nachgetragen)
  lieferant_id  uuid references public.lieferanten (id),
  artikelnummer text,
  ek_rappen     bigint,
  stand         date,
  unique (artikel_id, lieferant_id)
);
select intern.richte_fachtabelle_ein('lieferantenpreise', 'preise');

create table public.preisvorlagen (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  system  text,
  quelle  text
);
select intern.richte_fachtabelle_ein('preisvorlagen');

create table public.preisvorlage_positionen (
  id              uuid primary key default gen_random_uuid(),
  preisvorlage_id uuid not null references public.preisvorlagen (id),
  artikel_id      uuid not null references public.artikel (id),
  menge           numeric(12, 3) not null,
  reihenfolge     int not null default 0
);
select intern.richte_fachtabelle_ein('preisvorlage_positionen');

-- Offerte. Nummer (1016xx, 2000xx …) bleibt aus der Vorlage. Mehrere Versionen pro Offerte möglich.
create table public.offerten (
  id                uuid primary key default gen_random_uuid(),
  nummer            text not null unique,
  kontakt_id        uuid not null references public.kontakte (id),
  objekt_id         uuid references public.objekte (id),
  verkaufschance_id uuid references public.verkaufschancen (id),
  jahr              int,
  titel             text,
  sprache           text not null default 'de' check (sprache in ('de', 'fr')),
  status            text not null default 'in_arbeit',  -- auswahlwerte 'offertstatus'
  angebot_am        date,
  angebot_am_frueher date[],
  betrag_rappen     bigint,                           -- Angebotswert exkl. MWST
  leistung_kwp      numeric(10, 3),
  anzahl_module     int,
  wechselrichter    text,
  batterie          text,
  betrag_manuell    boolean not null default false,
  entscheid         text,                             -- angenommen, abgelehnt, vertagt
  entscheid_am      date,
  entscheid_von     text,
  vertagt_grund     text,
  nachfassen        text,
  nachfassen_am     date,
  zurueckgegeben    jsonb,
  versionen         jsonb not null default '[]',      -- frühere Versionen mit Betrag und PDF
  verantwortlich_id uuid references public.personen (id),
  eturnity_id       text                              -- Übernahme aus Eturnity (Phase 7)
);
select intern.richte_fachtabelle_ein('offerten');
create index offerten_kontakt_idx on public.offerten (kontakt_id);
alter table public.aktivitaeten add column offerte_id uuid references public.offerten (id);

-- Kalkulation zu einer Offerte (Vorlage: kalkulationen; dort noch leer).
create table public.kalkulationen (
  id          uuid primary key default gen_random_uuid(),
  offerte_id  uuid references public.offerten (id),
  titel       text,
  rabatt      numeric(6, 4),
  notiz       text,
  positionen  jsonb not null default '[]',
  leistung_kwp numeric(10, 3),
  netto_rappen bigint,
  total_rappen bigint
);
select intern.richte_fachtabelle_ein('kalkulationen');
