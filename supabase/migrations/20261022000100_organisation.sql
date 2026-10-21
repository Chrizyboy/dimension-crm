-- Phase 3, Teil 1: Organisation, Konfiguration und die gemeinsame Einrichtung aller Fachtabellen.
-- Alles, was sich ändern kann (Stufen, Regionen, Kategorien), ist Daten statt Code (CLAUDE.md Regel 8).

-- Mitarbeitende. Die Verknüpfung mit dem Login (auth_user_id) entsteht in Phase 4 über Microsoft-SSO.
-- Passwörter aus der Vorlage werden bewusst NICHT übernommen.
create table public.personen (
  id            uuid primary key default gen_random_uuid(),
  kuerzel       text not null unique,            -- z. B. «andreas», wie in der Vorlage
  name          text not null,
  email         text unique,
  rolle         text not null default 'mitarbeit' check (rolle in ('admin', 'mitarbeit')),
  -- Zusatzrechte: 'preise' (Einkaufspreise sehen), 'finanzen' (Liquidität). Rollen-Feinschliff in Phase 4.
  rechte        text[] not null default '{}',
  -- Sichtbare Bereiche; leer = alle (Vorlage: «regs»).
  bereiche      text[] not null default '{}',
  aktiv         boolean not null default true,
  sprache       text not null default 'de' check (sprache in ('de', 'fr')),
  darstellung   text,
  standort_id   uuid,
  profil        jsonb not null default '{}',     -- Funktion, Pensum, Mobil, Notfallkontakt …
  zuletzt_aktiv timestamptz,
  auth_user_id  uuid unique references auth.users (id) on delete set null
);

-- Prüft, ob die angemeldete Person ein Recht hat. 'basis' = jede aktive Person.
-- security definer, damit die Prüfung selbst nicht an RLS auf «personen» scheitert.
create or replace function intern.hat_recht(p_recht text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.personen p
    where p.auth_user_id = auth.uid()
      and p.aktiv
      and p.geloescht_am is null
      and (p.rolle = 'admin' or p_recht = 'basis' or p_recht = any (p.rechte))
  );
end;
$$;

-- RLS-Regeln rufen hat_recht als angemeldete Person auf; ohne diese Rechte schlägt jede Abfrage fehl.
grant usage on schema intern to authenticated;
grant execute on function intern.hat_recht(text) to authenticated;

-- Richtet eine Fachtabelle einheitlich ein, damit keine Tabelle eine Regel vergisst:
-- Standardspalten, Papierkorb, Protokoll, geaendert_am, RLS mit Leserecht p_recht.
-- Hartes Löschen ist für die App nicht erlaubt (keine delete-Policy, CLAUDE.md Regel 5).
create or replace function intern.richte_fachtabelle_ein(p_tabelle text, p_recht text default 'basis')
returns void
language plpgsql
as $$
begin
  execute format($f$
    alter table public.%1$I
      add column if not exists erstellt_am  timestamptz not null default now(),
      add column if not exists erstellt_von uuid default auth.uid(),
      add column if not exists geaendert_am timestamptz not null default now(),
      add column if not exists geloescht_am timestamptz,
      -- Herkunft aus der Vorlage V233: alte ID und der vollständige alte Datensatz,
      -- damit beim Import nie ein Feld verloren geht.
      add column if not exists alt_id   text unique,
      add column if not exists alt_daten jsonb
  $f$, p_tabelle);
  execute format('create trigger protokoll after insert or update or delete on public.%I
                  for each row execute function intern.protokolliere()', p_tabelle);
  execute format('create trigger geaendert before update on public.%I
                  for each row execute function intern.setze_geaendert_am()', p_tabelle);
  execute format('alter table public.%I enable row level security', p_tabelle);
  execute format('create policy lesen on public.%I for select to authenticated using (intern.hat_recht(%L))', p_tabelle, p_recht);
  execute format('create policy anlegen on public.%I for insert to authenticated with check (intern.hat_recht(%L))', p_tabelle, p_recht);
  execute format('create policy aendern on public.%I for update to authenticated using (intern.hat_recht(%L)) with check (intern.hat_recht(%L))', p_tabelle, p_recht, p_recht);
end;
$$;

select intern.richte_fachtabelle_ein('personen');

-- Firmen: Dimension Solaire GmbH (Muri) und Dimension Solaire Sàrl (Bulle).
create table public.firmen (
  id        uuid primary key default gen_random_uuid(),
  kuerzel   text not null unique,
  name      text not null,
  strasse   text,
  plz       text,
  ort       text,
  sprache   text not null check (sprache in ('de', 'fr')),
  uid_nr    text,                                  -- CHE-Nummer, wird in den Einstellungen gepflegt
  mwst_nr   text
);
select intern.richte_fachtabelle_ein('firmen');

create table public.standorte (
  id        uuid primary key default gen_random_uuid(),
  kuerzel   text not null unique,                  -- 'muri', 'bulle'
  name      text not null,
  firma_id  uuid not null references public.firmen (id),
  strasse   text,
  plz       text,
  ort       text
);
select intern.richte_fachtabelle_ein('standorte');
alter table public.personen add constraint personen_standort_fk foreign key (standort_id) references public.standorte (id);

-- Lagerorte als Daten: heute nur Bulle; ein zweites Lager kommt ohne Umbau dazu (Entscheid 0009).
create table public.lagerorte (
  id          uuid primary key default gen_random_uuid(),
  standort_id uuid not null references public.standorte (id),
  name        text not null,
  adresse     text,
  aktiv       boolean not null default true
);
select intern.richte_fachtabelle_ein('lagerorte');

-- Touren/Regionen für die Verkaufsplanung (Vorlage: «1 – Kanton Zug» …). PLZ-Regeln folgen in Phase 6.
create table public.regionen (
  id          uuid primary key default gen_random_uuid(),
  nummer      int not null unique,
  name        text not null,
  standort_id uuid references public.standorte (id),
  plz_regeln  jsonb not null default '[]'
);
select intern.richte_fachtabelle_ein('regionen');

-- Alle Auswahllisten an einem Ort: Verkaufsstufen, Quellen, Gebäudearten, Projekt-Status …
-- «liste» gruppiert, «schluessel» ist der stabile Wert im Code und in den Daten.
create table public.auswahlwerte (
  id           uuid primary key default gen_random_uuid(),
  liste        text not null,
  schluessel   text not null,
  text_de      text not null,
  text_fr      text not null,
  reihenfolge  int not null default 0,
  farbe        text,                                -- Token-Name, z. B. 'ok', 'warn'
  eigenschaften jsonb not null default '{}',        -- z. B. {"abschluss": "gewonnen"}
  aktiv        boolean not null default true,
  unique (liste, schluessel)
);
select intern.richte_fachtabelle_ein('auswahlwerte');

-- Einstellungen als Schlüssel/Wert (Vorlage: Sammlung «meta» und «finset»).
create table public.einstellungen (
  id         uuid primary key default gen_random_uuid(),
  schluessel text not null unique,
  wert       jsonb not null default '{}'
);
select intern.richte_fachtabelle_ein('einstellungen');
