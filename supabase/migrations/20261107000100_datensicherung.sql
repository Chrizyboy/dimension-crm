-- Phase 16, Teil 1: Datensicherung wie V233 (Einstellungen › Backup): automatisch um 12:00 und 16:00 Schweizer Zeit,
-- 14 Tage aufbewahrt, «Jetzt sichern», herunterladen, wiederherstellen (nur Administration, vorher automatisch eine
-- Sicherung des jetzigen Stands) und eine Kopie in SharePoint («Direction Interne/CRM Backups»).
-- Anders als V233 (14 von 33 Sammlungen) sichert das CRM alle Fachtabellen. Die Datei (JSON, gzip) liegt im privaten
-- Speicher «sicherungen»; die Edge Function «sicherung» erstellt und spielt ein, der Zeitplan stösst sie an.
-- Wiederherstellen setzt geänderte Datensätze zurück und legt seither neu Erfasstes in den Papierkorb (V233 löschte
-- es). Was nach aussen geht oder Zugang regelt (Ausgangskorb, Posts, Personen, Rollen), bleibt immer, wie es ist.

insert into public.einstellungen (schluessel, wert) values ('sicherung', $j${
  "stunden": [12, 16],
  "tage_automatisch": 14,
  "tage_manuell": 90,
  "sharepoint_ordner": "Direction Interne/CRM Backups"
}$j$::jsonb)
on conflict (schluessel) do nothing;

create table public.sicherungen (
  id uuid primary key default gen_random_uuid(),
  -- «2026-10-26-12» für automatische (eine pro Termin, wie V233), sonst mit Zeitstempel
  slot text not null unique,
  art text not null check (art in ('automatisch', 'manuell', 'vor_wiederherstellung')),
  status text not null default 'laeuft' check (status in ('laeuft', 'ok', 'fehler', 'abgelaufen')),
  von uuid references public.personen (id),
  von_name text,
  begonnen_am timestamptz not null default now(),
  fertig_am timestamptz,
  anzahl jsonb not null default '{}',
  bytes bigint,
  pfad text,
  fehler text,
  sharepoint jsonb,
  wiederhergestellt_am timestamptz,
  wiederhergestellt_von text,
  wiederhergestellt_anzahl jsonb
);
create index sicherungen_begonnen_idx on public.sicherungen (begonnen_am desc);
alter table public.sicherungen enable row level security;
create policy "lesen" on public.sicherungen for select to authenticated using ((select intern.hat_recht('admin')));
comment on table public.sicherungen is 'Datensicherungen (Phase 16). Schreiben nur über die Edge Function «sicherung».';

-- Privater Speicher für die Sicherungsdateien; herunterladen darf nur die Administration.
insert into storage.buckets (id, name, public) values ('sicherungen', 'sicherungen', false)
on conflict (id) do nothing;
create policy "sicherungen lesen" on storage.objects for select to authenticated
  using (bucket_id = 'sicherungen' and intern.hat_recht('admin'));

-- Zwischenablage beim Wiederherstellen: Die Funktion lädt die Datei Tabelle für Tabelle hierher, dann spielt
-- sicherung_einspielen alles in einer einzigen Transaktion ein (ganz oder gar nicht).
create table intern.sicherung_puffer (
  lauf uuid not null,
  tabelle text not null,
  teil int not null,
  zeilen jsonb not null,
  angelegt_am timestamptz not null default now(),
  primary key (lauf, tabelle, teil)
);

/** Diese Tabellen gehören nicht in die Sicherung: Protokoll (wächst ständig), Postleitzahlen (kommen mit der Migration), die Sicherung selbst. */
create or replace function intern.sicherung_ohne() returns text[]
language sql immutable as $$
  select array['aenderungsprotokoll', 'plz_verzeichnis', 'plz_ortschaften', 'sicherungen']
$$;

/**
 * Diese Tabellen sind in der Sicherung (zum Nachsehen), werden aber nie zurückgesetzt: Was nach aussen geht
 * (sonst würde Gesendetes nochmals gesendet), wer sich anmelden darf, und Protokolle von Abläufen.
 */
create or replace function intern.sicherung_nie_zurueck() returns text[]
language sql immutable as $$
  select array['ausgangskorb', 'social_posts', 'personen', 'rollen', 'einladungen', 'benachrichtigungen',
               'integrations_protokoll', 'ki_aufrufe', 'automation_laeufe', 'quellen_laeufe', 'import_laeufe',
               'import_abgleich', 'eturnity_eingang', 'integrationen', 'app_info']
$$;

/** Alle Tabellen der Sicherung, nach Abhängigkeit geordnet (erst, worauf andere zeigen). */
create or replace function public.sicherung_tabellen()
returns table (tabelle text, stufe int)
language sql stable security definer set search_path = '' as $$
  with recursive t as (
    select c.oid, c.relname::text as name
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relname <> all (intern.sicherung_ohne())
  ), fk as (
    select distinct k.conrelid as von, k.confrelid as nach
      from pg_constraint k join t a on a.oid = k.conrelid join t b on b.oid = k.confrelid
     where k.contype = 'f' and k.conrelid <> k.confrelid
  ), tiefe (oid, stufe, weg) as (
    select oid, 0, array[oid] from t
    union all
    select fk.von, d.stufe + 1, d.weg || fk.von
      from tiefe d join fk on fk.nach = d.oid
     where fk.von <> all (d.weg) and d.stufe < 30
  )
  select t.name, max(d.stufe)::int from t join tiefe d on d.oid = t.oid group by t.name order by 2, 1
$$;

/** Inhalt einer Tabelle als JSON (nur für die Edge Function, Service-Schlüssel). */
create or replace function public.sicherung_tabelle(p_tabelle text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  if not exists (select 1 from public.sicherung_tabellen() s where s.tabelle = p_tabelle) then
    raise exception 'sicherung.tabelle_unbekannt' using errcode = 'P0001';
  end if;
  execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t', p_tabelle) into v;
  return v;
end
$$;

/**
 * Welcher automatische Termin ist dran? Wie V233: der letzte schon vorbeigegangene Termin von heute, sonst der
 * letzte von gestern. null, wenn dieser Termin schon gesichert ist (oder gerade läuft).
 */
create or replace function public.sicherung_faellig(p_jetzt timestamptz default now())
returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_stunden int[];
  v_ortszeit timestamp := p_jetzt at time zone 'Europe/Zurich';
  v_vorbei int[];
  v_slot text;
begin
  select array(select jsonb_array_elements_text(coalesce(wert -> 'stunden', '[12,16]'))::int order by 1)
    into v_stunden from public.einstellungen where schluessel = 'sicherung';
  v_stunden := coalesce(nullif(v_stunden, '{}'), array[12, 16]);
  v_vorbei := array(select h from unnest(v_stunden) h where h <= extract(hour from v_ortszeit));
  if cardinality(v_vorbei) > 0 then
    v_slot := to_char(v_ortszeit, 'YYYY-MM-DD') || '-' || lpad(v_vorbei[cardinality(v_vorbei)]::text, 2, '0');
  else
    v_slot := to_char(v_ortszeit - interval '1 day', 'YYYY-MM-DD') || '-' || lpad(v_stunden[cardinality(v_stunden)]::text, 2, '0');
  end if;
  if exists (select 1 from public.sicherungen s
              where s.slot = v_slot and (s.status = 'ok' or (s.status = 'laeuft' and s.begonnen_am > now() - interval '15 minutes'))) then
    return null;
  end if;
  return v_slot;
end
$$;

/**
 * Sicherung beginnen. Eine Sperre pro Termin wie in V233: Laufen zwei Aufrufe gleichzeitig, bekommt nur einer
 * die ID. Ein abgebrochener Lauf (Fehler oder länger als 15 Minuten) darf neu beginnen.
 */
create or replace function public.sicherung_beginnen(p_slot text, p_art text, p_person uuid default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_name text := (select p.name from public.personen p where p.id = p_person);
begin
  insert into public.sicherungen (slot, art, von, von_name)
  values (p_slot, p_art, p_person, coalesce(v_name, 'Zeitplan'))
  on conflict (slot) do update set status = 'laeuft', begonnen_am = now(), fehler = null, von = excluded.von,
                                   von_name = excluded.von_name
   where public.sicherungen.status = 'fehler'
      or (public.sicherungen.status = 'laeuft' and public.sicherungen.begonnen_am < now() - interval '15 minutes')
  returning id into v_id;
  return v_id;
end
$$;

/** Ergebnis festhalten. Misslingt eine automatische Sicherung, erfährt es die Administration in der Glocke. */
create or replace function public.sicherung_abschliessen(
  p_id uuid, p_ok boolean, p_anzahl jsonb default '{}', p_bytes bigint default null, p_pfad text default null,
  p_fehler text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.sicherungen;
begin
  update public.sicherungen
     set status = case when p_ok then 'ok' else 'fehler' end, fertig_am = now(), anzahl = coalesce(p_anzahl, '{}'),
         bytes = p_bytes, pfad = p_pfad, fehler = left(p_fehler, 300)
   where id = p_id
  returning * into v;
  if not p_ok and v.art = 'automatisch' then
    perform intern.benachrichtige_admins(null, 'kritisch', 'Datensicherung fehlgeschlagen',
                                         'Échec de la sauvegarde', coalesce(left(p_fehler, 200), ''),
                                         '#/settings?reiter=sicherung');
  end if;
end
$$;

/** Stand der Kopie in SharePoint ({ok, url, fehler, am}). */
create or replace function public.sicherung_sharepoint(p_id uuid, p_stand jsonb)
returns void
language sql security definer set search_path = '' as $$
  update public.sicherungen set sharepoint = p_stand || jsonb_build_object('am', now()) where id = p_id;
$$;

/**
 * Abgelaufene Sicherungen (automatische nach 14 Tagen, andere nach 90) als «abgelaufen» markieren und ihre Dateien
 * nennen, damit die Edge Function sie im Speicher entfernt. Die Zeile bleibt (wer, wann, wie viel).
 */
create or replace function public.sicherung_aufraeumen()
returns table (id uuid, pfad text)
language plpgsql security definer set search_path = '' as $$
declare
  v_e jsonb := coalesce((select wert from public.einstellungen where schluessel = 'sicherung'), '{}');
begin
  return query
  update public.sicherungen s set status = 'abgelaufen'
   where s.status in ('ok', 'fehler')
     and s.begonnen_am < now() - make_interval(days => case when s.art = 'automatisch'
                                                           then coalesce((v_e ->> 'tage_automatisch')::int, 14)
                                                           else coalesce((v_e ->> 'tage_manuell')::int, 90) end)
  returning s.id, s.pfad;
end
$$;

/** Teil einer Tabelle aus der Sicherungsdatei in die Zwischenablage legen. */
create or replace function public.sicherung_puffern(p_lauf uuid, p_tabelle text, p_teil int, p_zeilen jsonb)
returns void
language sql security definer set search_path = '' as $$
  insert into intern.sicherung_puffer (lauf, tabelle, teil, zeilen) values (p_lauf, p_tabelle, p_teil, p_zeilen)
  on conflict (lauf, tabelle, teil) do update set zeilen = excluded.zeilen;
$$;

/**
 * Spielt die gepufferte Sicherung ein, alles in einer Transaktion. Pro Tabelle (nach Abhängigkeit geordnet):
 *  * Datensätze, die sich seither geändert haben, bekommen die Werte der Sicherung (nur Spalten, die es in der
 *    Sicherung gibt; neuere Spalten bleiben). Unveränderte bleiben unberührt (kein Protokoll-Eintrag).
 *  * Fehlende Datensätze werden wieder angelegt.
 *  * Seither neu Erfasstes kommt in den Papierkorb (nur Tabellen mit Papierkorb), nichts wird hart gelöscht.
 * Während des Einspielens ruhen die Fach-Trigger (Prüfungen, Nummern, Summen, Automationen): Die Sicherung
 * enthält die damals gültigen Werte, und eine Prüfung wie «nur Entwürfe ändern» würde sonst jedes Zurücksetzen
 * verhindern. Protokoll und «geändert am» laufen weiter, damit nachvollziehbar bleibt, was zurückgesetzt wurde.
 * Ergebnis: Anzahl je Tabelle.
 */
create or replace function public.sicherung_einspielen(p_lauf uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_tabelle regclass;
  v_trigger text[];
  v_zeilen jsonb;
  v_spalten text[];
  v_pk text[];
  v_liste text;
  v_n_liste text;
  v_t_liste text;
  v_pk_gleich text;
  v_pk_liste text;
  v_geaendert int;
  v_neu int;
  v_papierkorb int;
  v_ergebnis jsonb := '{}';
begin
  perform set_config('crm.wiederherstellung', 'an', true);
  for r in
    select s.tabelle from public.sicherung_tabellen() s
     where s.tabelle <> all (intern.sicherung_nie_zurueck())
       and exists (select 1 from intern.sicherung_puffer p where p.lauf = p_lauf and p.tabelle = s.tabelle)
     order by s.stufe, s.tabelle
  loop
    v_tabelle := ('public.' || quote_ident(r.tabelle))::regclass;
    select coalesce(jsonb_agg(z), '[]') into v_zeilen
      from intern.sicherung_puffer p, jsonb_array_elements(p.zeilen) z
     where p.lauf = p_lauf and p.tabelle = r.tabelle;

    -- Spalten, die es heute gibt und die in der Sicherung stehen (ohne berechnete Spalten)
    select array_agg(a.attname::text order by a.attnum) into v_spalten
      from pg_attribute a
     where a.attrelid = v_tabelle and a.attnum > 0 and not a.attisdropped
       and a.attgenerated = '' and a.attidentity <> 'a'
       and exists (select 1 from jsonb_array_elements(v_zeilen) z where z ? a.attname::text);
    select array_agg(a.attname::text order by a.attnum) into v_pk
      from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
     where i.indrelid = v_tabelle and i.indisprimary;
    if v_spalten is null or v_pk is null or not (v_pk <@ v_spalten) then continue; end if;

    v_liste := (select string_agg(quote_ident(s), ', ') from unnest(v_spalten) s);
    v_n_liste := (select string_agg('n.' || quote_ident(s), ', ') from unnest(v_spalten) s);
    v_t_liste := (select string_agg('t.' || quote_ident(s), ', ') from unnest(v_spalten) s);
    v_pk_liste := (select string_agg(quote_ident(s), ', ') from unnest(v_pk) s);
    v_pk_gleich := (select string_agg(format('t.%1$I = n.%1$I', s), ' and ') from unnest(v_pk) s);

    -- Fach-Trigger dieser Tabelle ruhen lassen (wird mit der Transaktion wieder aktiv, auch bei einem Fehler)
    select array_agg(t.tgname::text) into v_trigger
      from pg_trigger t join pg_proc f on f.oid = t.tgfoid
     where t.tgrelid = v_tabelle and not t.tgisinternal and t.tgenabled <> 'D'
       and f.proname not in ('protokolliere', 'setze_geaendert_am');
    if v_trigger is not null then
      for i in 1 .. cardinality(v_trigger) loop
        execute format('alter table public.%I disable trigger %I', r.tabelle, v_trigger[i]);
      end loop;
    end if;

    -- Geänderte zurücksetzen; als Text vergleichen, so gehen auch Spalten ohne Gleichheit (z. B. json).
    execute format(
      'update public.%1$I t set (%2$s) = (select %3$s) from jsonb_populate_recordset(null::public.%1$I, $1) n
        where %4$s and row(%5$s)::text is distinct from row(%3$s)::text',
      r.tabelle, v_liste, v_n_liste, v_pk_gleich, v_t_liste)
      using v_zeilen;
    get diagnostics v_geaendert = row_count;

    -- Fehlende wieder anlegen
    execute format(
      'insert into public.%1$I (%2$s) select %3$s from jsonb_populate_recordset(null::public.%1$I, $1) n
        where not exists (select 1 from public.%1$I t where %4$s)',
      r.tabelle, v_liste, v_n_liste, v_pk_gleich)
      using v_zeilen;
    get diagnostics v_neu = row_count;

    -- Seither neu Erfasstes in den Papierkorb
    v_papierkorb := 0;
    if exists (select 1 from pg_attribute a where a.attrelid = v_tabelle and a.attname = 'geloescht_am'
                and not a.attisdropped) then
      execute format(
        'update public.%1$I t set geloescht_am = now() where t.geloescht_am is null
           and not exists (select 1 from jsonb_populate_recordset(null::public.%1$I, $1) n where %2$s)',
        r.tabelle, v_pk_gleich)
        using v_zeilen;
      get diagnostics v_papierkorb = row_count;
    end if;

    if v_trigger is not null then
      for i in 1 .. cardinality(v_trigger) loop
        execute format('alter table public.%I enable trigger %I', r.tabelle, v_trigger[i]);
      end loop;
    end if;

    if v_geaendert + v_neu + v_papierkorb > 0 then
      v_ergebnis := v_ergebnis || jsonb_build_object(r.tabelle, jsonb_build_object(
        'zurueck', v_geaendert + v_neu, 'papierkorb', v_papierkorb));
    end if;
  end loop;
  delete from intern.sicherung_puffer where lauf = p_lauf or angelegt_am < now() - interval '1 day';
  return v_ergebnis;
end
$$;

/** Wiederherstellung an der Sicherung festhalten und der Administration melden. */
create or replace function public.sicherung_wiederhergestellt(p_id uuid, p_person uuid, p_anzahl jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := (select p.name from public.personen p where p.id = p_person);
  v_am text;
begin
  update public.sicherungen set wiederhergestellt_am = now(), wiederhergestellt_von = v_name,
                                wiederhergestellt_anzahl = p_anzahl
   where id = p_id
  returning to_char(begonnen_am at time zone 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') into v_am;
  perform intern.benachrichtige_admins(p_person, 'warnung', 'Sicherung vom ' || v_am || ' wiederhergestellt',
                                       'Sauvegarde du ' || v_am || ' restaurée', coalesce(v_name, ''),
                                       '#/settings?reiter=sicherung');
end
$$;

-- Automationen: Beim Wiederherstellen löst nichts aus (wie beim Import). Ersetzt die Funktion aus Phase 12.
create or replace function intern.automation_import(p_alt_id text) returns boolean
language sql stable set search_path = '' as $$
  select (p_alt_id is not null and coalesce(auth.role(), '') = 'service_role')
      or coalesce(current_setting('crm.wiederherstellung', true), '') = 'an'
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'sicherung_tabellen()', 'sicherung_tabelle(text)', 'sicherung_faellig(timestamptz)',
    'sicherung_beginnen(text, text, uuid)', 'sicherung_abschliessen(uuid, boolean, jsonb, bigint, text, text)',
    'sicherung_sharepoint(uuid, jsonb)', 'sicherung_aufraeumen()', 'sicherung_puffern(uuid, text, int, jsonb)',
    'sicherung_einspielen(uuid)', 'sicherung_wiederhergestellt(uuid, uuid, jsonb)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end
$$;
