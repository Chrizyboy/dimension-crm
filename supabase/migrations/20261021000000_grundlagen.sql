-- Phase 1: Grundbausteine, auf denen alle späteren Tabellen aufbauen.
-- Fachtabellen (Kontakt, Objekt, Verkaufschance …) folgen in Phase 3.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm; -- schnelle Ähnlichkeitssuche (Ctrl K, Dubletten)

-- Eigenes Schema für interne Hilfsfunktionen, damit public übersichtlich bleibt.
create schema if not exists intern;

-- Setzt geaendert_am automatisch. Jede Fachtabelle hängt diesen Trigger an.
create or replace function intern.setze_geaendert_am()
returns trigger
language plpgsql
as $$
begin
  new.geaendert_am := now();
  return new;
end;
$$;

-- Vollständiges Änderungsprotokoll (wer, was, wann, vorher/nachher).
-- Bau-Auftrag Kap. 5: nichts wird hart gelöscht, alles nachvollziehbar.
create table public.aenderungsprotokoll (
  id          bigint generated always as identity primary key,
  tabelle     text        not null,
  datensatz   uuid,
  aktion      text        not null check (aktion in ('erstellt', 'geaendert', 'papierkorb', 'wiederhergestellt', 'geloescht')),
  vorher      jsonb,
  nachher     jsonb,
  benutzer    uuid        default auth.uid(),
  zeitpunkt   timestamptz not null default now()
);
create index aenderungsprotokoll_datensatz_idx on public.aenderungsprotokoll (tabelle, datensatz, zeitpunkt desc);

alter table public.aenderungsprotokoll enable row level security;
-- Lesen dürfen vorerst nur angemeldete Benutzer; Rollen-Feinschliff folgt in Phase 4.
create policy "angemeldete lesen protokoll" on public.aenderungsprotokoll
  for select to authenticated using (true);
-- Schreiben nur über den Trigger (security definer), nie direkt aus der App.

-- Generischer Protokoll-Trigger. Ein Wechsel von geloescht_am null -> Wert
-- zählt als «papierkorb», zurück als «wiederhergestellt».
create or replace function intern.protokolliere()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aktion text;
  v_id uuid;
begin
  if tg_op = 'INSERT' then
    v_aktion := 'erstellt';
    v_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_id := new.id;
    v_aktion := case
      when old.geloescht_am is null and new.geloescht_am is not null then 'papierkorb'
      when old.geloescht_am is not null and new.geloescht_am is null then 'wiederhergestellt'
      else 'geaendert'
    end;
  else
    v_aktion := 'geloescht';
    v_id := old.id;
  end if;

  insert into public.aenderungsprotokoll (tabelle, datensatz, aktion, vorher, nachher)
  values (
    tg_table_name,
    v_id,
    v_aktion,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- Versions- und Zustandsinfo; die App liest sie für die Kachel «Datenbank».
create table public.app_info (
  schluessel text primary key,
  wert       text not null,
  geaendert_am timestamptz not null default now()
);
alter table public.app_info enable row level security;
create policy "alle lesen app_info" on public.app_info for select to anon, authenticated using (true);

insert into public.app_info (schluessel, wert) values
  ('schema_version', '1'),
  ('phase', '1');

-- Einfache Gesundheitsprüfung, auch ohne Anmeldung aufrufbar.
create or replace function public.gesundheit()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'zeit', now(),
    'schema_version', (select wert from public.app_info where schluessel = 'schema_version')
  );
$$;
grant execute on function public.gesundheit() to anon, authenticated;
