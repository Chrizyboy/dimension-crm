-- Phase 3, Teil 4b: Werkverträge (Chris, 21.10.2026: «Werkverträge fehlen»).
-- In V233 war der Werkvertrag nur ein Feld am Projekt. Jetzt ein eigener Datensatz mit Versionen,
-- damit Sprache, Firma, Konditionen und Unterschrift nachvollziehbar sind.

create table public.werkvertraege (
  id                 uuid primary key default gen_random_uuid(),
  nummer             text not null unique,            -- gleiche Nummer wie Offerte/Projekt
  offerte_id         uuid references public.offerten (id),
  projekt_id         uuid references public.projekte (id),
  kontakt_id         uuid not null references public.kontakte (id),
  firma_id           uuid references public.firmen (id),  -- GmbH Muri oder Sàrl Bulle
  sprache            text not null default 'de' check (sprache in ('de', 'fr')),
  version            int not null default 1,
  betrag_rappen      bigint,                          -- Vertragswert exkl. MWST
  -- Zahlungskonditionen in Prozent, z. B. [50, 30, 20] oder [80, 20]; daraus entsteht der Zahlungsplan.
  konditionen        int[] not null default '{}',
  status             text not null default 'entwurf'
                     check (status in ('entwurf', 'erstellt', 'versendet', 'unterschrieben', 'storniert')),
  erstellt_datum     date,
  versendet_am       timestamptz,
  unterschrieben_am  date,
  unterschrift       jsonb,                           -- digitale Unterschrift (z. B. Skribble), später
  dokument_id        uuid references public.dokumente (id),
  notiz              text
);
select intern.richte_fachtabelle_ein('werkvertraege');
create index werkvertraege_kontakt_idx on public.werkvertraege (kontakt_id);
create index werkvertraege_projekt_idx on public.werkvertraege (projekt_id);
