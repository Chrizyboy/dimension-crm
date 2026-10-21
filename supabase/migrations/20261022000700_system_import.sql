-- Phase 3, Teil 7: System-Tabellen, Import-Abgleich und Speicher für Dokumente.

-- Ausgangskorb: alles, was nach aussen geht, wartet hier auf Freigabe (CLAUDE.md Regel 6).
create table public.ausgangskorb (
  id            uuid primary key default gen_random_uuid(),
  kanal         text not null default 'mail' check (kanal in ('mail', 'sms', 'brief')),
  an            text not null,
  betreff       text,
  html          text,
  text          text,
  status        text not null default 'wartet',      -- wartet, freigegeben, wird_gesendet, gesendet, fehler
  freigegeben_von uuid references public.personen (id),
  gesendet_am   timestamptz,
  bezug_tabelle text,
  bezug_id      uuid
);
select intern.richte_fachtabelle_ein('ausgangskorb');

-- Einladungen neuer Mitarbeitender. Codes werden nie gespeichert (in Phase 4 über Microsoft).
create table public.einladungen (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  name         text,
  person_id    uuid references public.personen (id),
  eingeladen_von text,
  gueltig_bis  timestamptz,
  verwendet_am timestamptz,
  widerrufen_am timestamptz
);
select intern.richte_fachtabelle_ein('einladungen', 'admin');

-- Altes Änderungsprotokoll der Vorlage (ein Eintrag pro Änderung), nur lesbar.
create table public.altes_protokoll (
  id         uuid primary key default gen_random_uuid(),
  zeitpunkt  timestamptz not null,
  person     text,
  sammlung   text,
  datensatz  text,
  aktion     text,
  aenderungen jsonb not null default '[]'
);
select intern.richte_fachtabelle_ein('altes_protokoll', 'admin');

-- Jeder Importlauf mit Zählbericht. Wiederholbar: der Import aktualisiert anhand von alt_id.
create table public.import_laeufe (
  id          uuid primary key default gen_random_uuid(),
  quelle      text not null,
  export_vom  timestamptz,
  export_von  text,
  gestartet_am timestamptz not null default now(),
  beendet_am  timestamptz,
  ok          boolean,
  bericht     jsonb not null default '{}'
);
select intern.richte_fachtabelle_ein('import_laeufe', 'admin');

-- Abgleichsliste alt → neu: jede Zeile der Vorlage mit ihrem Ziel. Grundlage der Zählung.
create table public.import_abgleich (
  id          uuid primary key default gen_random_uuid(),
  sammlung    text not null,
  alt_schluessel text not null,
  ziel_tabelle text not null,
  ziel_id     uuid not null,
  unique (sammlung, alt_schluessel, ziel_tabelle, ziel_id)
);
select intern.richte_fachtabelle_ein('import_abgleich', 'admin');

-- Setzt die nächste Kundennummer nach dem Import (nur für den Import-Schlüssel, nie für die App).
create or replace function public.setze_naechste_kundennummer(p_naechste int)
returns void
language sql
security definer
set search_path = public
as $$
  select setval('public.kundennummer_seq', greatest(p_naechste, (select coalesce(max(kundennummer), 0) + 1 from public.kontakte)), false);
$$;
revoke execute on function public.setze_naechste_kundennummer(int) from public, anon, authenticated;
grant execute on function public.setze_naechste_kundennummer(int) to service_role;

-- Privater Speicher für Dokumente. Zugriff nur angemeldet; Feinschliff je Bereich in Phase 4.
insert into storage.buckets (id, name, public) values ('dokumente', 'dokumente', false)
on conflict (id) do nothing;
create policy "dokumente lesen" on storage.objects for select to authenticated
  using (bucket_id = 'dokumente' and intern.hat_recht('basis'));
create policy "dokumente hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'dokumente' and intern.hat_recht('basis'));

update public.app_info set wert = '2' where schluessel = 'schema_version';
update public.app_info set wert = '3' where schluessel = 'phase';

-- Leere Änderungen (gleiche Werte, z. B. ein wiederholter Import) sollen weder geaendert_am verschieben
-- noch das Protokoll füllen. Ersetzt die Funktionen aus Phase 1; bestehende Migrationen bleiben unverändert.
create or replace function intern.setze_geaendert_am()
returns trigger
language plpgsql
as $$
begin
  if to_jsonb(new) - 'geaendert_am' = to_jsonb(old) - 'geaendert_am' then
    new.geaendert_am := old.geaendert_am;
  else
    new.geaendert_am := now();
  end if;
  return new;
end;
$$;

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
    if to_jsonb(new) = to_jsonb(old) then
      return new;
    end if;
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
