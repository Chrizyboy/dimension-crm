-- Phase 3, Teil 5: ERP-Erweiterung (Entscheid 0009). Tabellen jetzt, Oberflächen in Phase 9, 9a und 9b.

-- Subunternehmer (Elektriker, Gerüstbau, Dachdecker …) und ihre Aufträge.
create table public.subunternehmer (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  gewerk      text,                                  -- elektro, geruest, dach, sanitaer …
  kontakt_id  uuid references public.kontakte (id),
  aktiv       boolean not null default true
);
select intern.richte_fachtabelle_ein('subunternehmer');

create table public.subunternehmer_auftraege (
  id                uuid primary key default gen_random_uuid(),
  subunternehmer_id uuid not null references public.subunternehmer (id),
  projekt_id        uuid not null references public.projekte (id),
  leistung          text not null,
  betrag_rappen     bigint,
  termin_von        date,
  termin_bis        date,
  status            text not null default 'angefragt'
);
select intern.richte_fachtabelle_ein('subunternehmer_auftraege');

-- Bestellungen bei Lieferanten. Versand als Mail mit PDF erst nach Freigabe (CLAUDE.md Regel 6).
create table public.bestellungen (
  id              uuid primary key default gen_random_uuid(),
  nummer          text not null unique,
  lieferant_id    uuid not null references public.lieferanten (id),
  projekt_id      uuid references public.projekte (id),
  lagerort_id     uuid references public.lagerorte (id),
  status          text not null default 'entwurf',  -- entwurf, freigegeben, bestellt, teilgeliefert, geliefert
  freigegeben_von uuid references public.personen (id),
  freigegeben_am  timestamptz,
  bestellt_am     date,
  liefertermin    date,
  total_rappen    bigint,
  notiz           text
);
select intern.richte_fachtabelle_ein('bestellungen');

create table public.bestellpositionen (
  id             uuid primary key default gen_random_uuid(),
  bestellung_id  uuid not null references public.bestellungen (id),
  artikel_id     uuid references public.artikel (id),
  bezeichnung    text not null,
  menge          numeric(12, 3) not null,
  einheit        text not null default 'Stk',
  ek_rappen      bigint,
  geliefert_menge numeric(12, 3) not null default 0
);
select intern.richte_fachtabelle_ein('bestellpositionen');

-- Lager: Bestand je Artikel und Lagerort, jede Veränderung als Bewegung (Eingang, Reservierung, Entnahme).
create table public.lagerbestand (
  id          uuid primary key default gen_random_uuid(),
  lagerort_id uuid not null references public.lagerorte (id),
  artikel_id  uuid not null references public.artikel (id),
  menge       numeric(12, 3) not null default 0,
  reserviert  numeric(12, 3) not null default 0,
  mindestmenge numeric(12, 3),
  unique (lagerort_id, artikel_id)
);
select intern.richte_fachtabelle_ein('lagerbestand');

create table public.lagerbewegungen (
  id            uuid primary key default gen_random_uuid(),
  lagerort_id   uuid not null references public.lagerorte (id),
  artikel_id    uuid not null references public.artikel (id),
  art           text not null check (art in ('eingang', 'reservierung', 'freigabe', 'entnahme', 'korrektur')),
  menge         numeric(12, 3) not null,
  projekt_id    uuid references public.projekte (id),
  bestellung_id uuid references public.bestellungen (id),
  zeitpunkt     timestamptz not null default now(),
  person_id     uuid references public.personen (id),
  notiz         text
);
select intern.richte_fachtabelle_ein('lagerbewegungen');

-- Tagesrapport von der Baustelle (Monteur-Ansicht am Handy, Phase 9b).
create table public.rapporte (
  id          uuid primary key default gen_random_uuid(),
  projekt_id  uuid references public.projekte (id),
  service_fall_id uuid references public.service_faelle (id),
  art         text not null default 'montage' check (art in ('montage', 'service', 'ibn')),
  datum       date not null,
  person_id   uuid references public.personen (id),
  team        uuid[] not null default '{}',
  arbeiten    text,
  material    jsonb not null default '[]',
  fotos       uuid[] not null default '{}',          -- Verweise auf dokumente
  unterschrift_kunde jsonb,
  abgeschlossen_am timestamptz
);
select intern.richte_fachtabelle_ein('rapporte');

-- Arbeitszeit mit Start/Stopp; Export an den AbaNinja-Lohn (Lohn bleibt in AbaNinja).
create table public.zeiten (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.personen (id),
  projekt_id  uuid references public.projekte (id),
  rapport_id  uuid references public.rapporte (id),
  start       timestamptz not null,
  stopp       timestamptz,
  pause_min   int not null default 0,
  taetigkeit  text,
  exportiert_am timestamptz,
  check (stopp is null or stopp > start)
);
select intern.richte_fachtabelle_ein('zeiten');

-- Ferien, Krankheit, Schule … (auch aus Outlook gelesen, Phase 9).
create table public.abwesenheiten (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.personen (id),
  art        text not null,                         -- ferien, krank, schule, militaer, sonstiges
  von        date not null,
  bis        date not null,
  halbtag    boolean not null default false,
  quelle     text not null default 'crm',           -- crm oder outlook
  outlook_id text,
  check (bis >= von)
);
select intern.richte_fachtabelle_ein('abwesenheiten');

-- Nachträge (Zusatzleistungen auf der Baustelle), fliessen in die Schlussrechnung (Phase 10).
create table public.nachtraege (
  id            uuid primary key default gen_random_uuid(),
  projekt_id    uuid not null references public.projekte (id),
  rapport_id    uuid references public.rapporte (id),
  beschreibung  text not null,
  betrag_rappen bigint,
  status        text not null default 'offen',     -- offen, vom_kunden_bestaetigt, verrechnet, abgelehnt
  bestaetigt_am timestamptz
);
select intern.richte_fachtabelle_ein('nachtraege');

-- Ausschreibungs-Monitor (Phase 8b): drei Spuren Angebot, Akquise, Beobachten.
create table public.ausschreibungen (
  id             uuid primary key default gen_random_uuid(),
  quelle         text not null,                     -- simap, Feuille officielle FR, Amtsblatt AG …
  quell_id       text,
  quell_url      text,
  art            text not null,                     -- ausschreibung, baugesuch, zuschlag
  spur           text not null check (spur in ('angebot', 'akquise', 'beobachten')),
  prioritaet     text check (prioritaet in ('A', 'B', 'C')),
  titel          text not null,
  beschreibung   text,
  gemeinde       text,
  kanton         text,
  fahrzeit_min   int,                               -- ab Muri oder Bulle, Einzugsgebiet 60 Min.
  vergabestelle  text,
  frist          date,
  publiziert_am  date,
  status         text not null default 'neu',       -- neu, bewilligt, abgelehnt, spaeter, kontakt_fehlt, versendet …
  entscheid_von  uuid references public.personen (id),
  entscheid_am   timestamptz,
  kontaktsperre_bis date,                           -- Kontaktsperre Vergabestelle bis Zuschlag
  wiedervorlage_am date,
  verkaufschance_id uuid references public.verkaufschancen (id),
  offerte_id     uuid references public.offerten (id),
  rohdaten       jsonb,
  unique (quelle, quell_id)
);
select intern.richte_fachtabelle_ein('ausschreibungen');
