-- Phase 3, Teil 6: Spesen, Finanzen & Liquidität (Recht 'finanzen'), Marketing und Handbuch.

create table public.spesen (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid references public.personen (id),
  datum         date not null,
  betrag_rappen bigint not null,
  kategorie     text not null,
  zweck         text,
  notiz         text,
  beleg_id      uuid references public.dokumente (id),
  status        text not null default 'eingereicht',  -- eingereicht, genehmigt, ausbezahlt, storniert
  ausbezahlt_am date,
  ausbezahlt_von text,
  storniert_am  date,
  storniert_von text,
  mail          jsonb
);
select intern.richte_fachtabelle_ein('spesen');

-- Rechnungen an uns (Kreditoren) mit Priorität, z. B. «Betreibung droht» (Vorlage: finpay).
create table public.kreditor_zahlungen (
  id            uuid primary key default gen_random_uuid(),
  firma         text not null,
  text          text,
  kategorie     text,
  rechnung_nr   text,
  rechnung_am   date,
  betrag_rappen bigint,
  faellig_am    date,
  geplant_am    date,
  prioritaet    text,
  status        text not null default 'offen',
  geprueft      boolean not null default false,
  fixkosten_id  uuid,
  monat         text,
  notiz         text,
  quelle        text
);
select intern.richte_fachtabelle_ein('kreditor_zahlungen', 'finanzen');

-- Materialzahlungen je Baustelle (Vorlage: finmat).
create table public.material_zahlungen (
  id          uuid primary key default gen_random_uuid(),
  baustelle   text not null,
  projekt_id  uuid references public.projekte (id),
  bautermin   date,
  geplant_am  date,
  zahlbar_bis date,
  positionen  jsonb not null default '[]',
  archiviert  boolean not null default false,
  notiz       text,
  quelle      text
);
select intern.richte_fachtabelle_ein('material_zahlungen', 'finanzen');

-- Fixkosten mit Rhythmus (Vorlage: finfix).
create table public.fixkosten (
  id            uuid primary key default gen_random_uuid(),
  bezeichnung   text not null,
  gruppe        text,
  detail        text,
  betrag_rappen bigint not null,
  rhythmus      text not null,                        -- monat, quartal, jahr
  tag           int,
  start_monat   text,
  ab            date,
  bis           date,
  standort      text,
  aktiv         boolean not null default true,
  notiz         text,
  quelle        text
);
select intern.richte_fachtabelle_ein('fixkosten', 'finanzen');
alter table public.kreditor_zahlungen add constraint kreditor_fixkosten_fk foreign key (fixkosten_id) references public.fixkosten (id);

-- Erwartete Zahlungseingänge mit Wahrscheinlichkeit (Vorlage: finin).
create table public.erwartete_eingaenge (
  id            uuid primary key default gen_random_uuid(),
  kunde         text not null,
  projekt_id    uuid references public.projekte (id),
  text          text,
  betrag_rappen bigint,
  erwartet_am   date,
  eingang_am    date,
  wahrscheinlichkeit text,                            -- sicher, wahrscheinlich, unsicher
  status        text not null default 'offen',
  geprueft      boolean not null default false,
  quelle        text
);
select intern.richte_fachtabelle_ein('erwartete_eingaenge', 'finanzen');

-- Kontostand, MWST-Satz und Planungshorizont (Vorlage: finset).
create table public.finanz_einstellungen (
  id         uuid primary key default gen_random_uuid(),
  schluessel text not null unique,
  wert       jsonb not null
);
select intern.richte_fachtabelle_ein('finanz_einstellungen', 'finanzen');

-- Marketing
create table public.kampagnen (
  id        uuid primary key default gen_random_uuid(),
  art       text not null,                            -- serienmail, serienbrief
  betreff   text,
  anzahl    int,
  kontakte  uuid[] not null default '{}',
  versendet_am timestamptz,
  versendet_von text
);
select intern.richte_fachtabelle_ein('kampagnen');

create table public.newsletter (
  id       uuid primary key default gen_random_uuid(),
  thema    text not null,
  segment  jsonb,
  text_de  text,
  text_fr  text,
  status   text not null default 'entwurf'
);
select intern.richte_fachtabelle_ein('newsletter');

-- Newsletter-Empfänger mit Einwilligung, auch ohne Kundenbeziehung (Vorlage: nlkontakte).
create table public.newsletter_empfaenger (
  id           uuid primary key default gen_random_uuid(),
  kontakt_id   uuid references public.kontakte (id),
  email        text not null,
  name         text,
  einwilligung jsonb,
  gesperrt     boolean not null default false
);
select intern.richte_fachtabelle_ein('newsletter_empfaenger');

create table public.social_posts (
  id          uuid primary key default gen_random_uuid(),
  thema       text,
  idee        text,
  datum       date,
  zeit        time,
  netzwerke   text[] not null default '{}',
  format      text,
  sprache     text,
  texte       jsonb not null default '{}',
  bilder      jsonb not null default '[]',
  status      text not null default 'entwurf',
  verfasst_von text,
  details     jsonb not null default '{}'
);
select intern.richte_fachtabelle_ein('social_posts');

-- Gelernter Schreibstil und Signatur je Person (Vorlage: aistil, signatures).
create table public.schreibstile (
  id        uuid primary key default gen_random_uuid(),
  person_id uuid references public.personen (id),
  regeln    jsonb not null default '[]',
  beispiele jsonb not null default '[]'
);
select intern.richte_fachtabelle_ein('schreibstile');

create table public.signaturen (
  id        uuid primary key default gen_random_uuid(),
  person_id uuid references public.personen (id),
  sprache   text not null default 'de',
  html      text not null
);
select intern.richte_fachtabelle_ein('signaturen');

-- Handbuch: Prozessbeschreibungen und Erklärvideos (Vorlage: prozesse, videos).
create table public.handbuch_eintraege (
  id             uuid primary key default gen_random_uuid(),
  art            text not null check (art in ('prozess', 'video')),
  titel_de       text not null,
  titel_fr       text,
  beschreibung_de text,
  beschreibung_fr text,
  version        text,
  datum          date,
  dauer_s        int,
  reihenfolge    int,
  datei_de_id    uuid references public.dokumente (id),
  datei_fr_id    uuid references public.dokumente (id),
  vorschaubild_id uuid references public.dokumente (id),
  versionen      jsonb not null default '[]'
);
select intern.richte_fachtabelle_ein('handbuch_eintraege');
