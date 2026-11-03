-- Papierkorb überall (Chris 3.11.2026: «es muss überall die Möglichkeit haben, Sachen zu löschen»).
-- Ein Weg für alle Bereiche: In den Papierkorb legen, Papierkorb ansehen, Wiederherstellen.
-- Nie hart löschen (CLAUDE.md Regel 5). Wer bearbeiten darf, darf auch in den Papierkorb legen:
-- Die Funktionen laufen mit den Rechten der Person (security invoker), RLS der Tabelle entscheidet.
-- Gebuchtes (Rechnungen ab gestellt, Zahlungen, Spesen, Lager, exportierte Zeiten) wird storniert,
-- nicht weggeworfen; das prüft `intern.papierkorb_sperre`.

-- Warum eine eigene Prüfung statt nur RLS: RLS kennt nur «darf ändern»; ob ein Datensatz fachlich
-- noch weg darf, hängt am Stand. Läuft als definer, damit sie auch Stände lesen kann, die die
-- Person nicht sieht (die Änderung selbst läuft danach wieder mit ihren Rechten).
create or replace function intern.papierkorb_sperre(p_tabelle text, p_id uuid, p_zurueck boolean default false)
returns text
language plpgsql
stable
security definer
set search_path = public, intern
as $$
declare
  v_text text;
  v_zeit timestamptz;
begin
  if p_zurueck then
    -- Zusammengeführte Doppelte bleiben weg, sonst gäbe es den Kunden wieder zweimal.
    if p_tabelle = 'kontakte'
       and exists (select 1 from public.kontakte where id = p_id and zusammengefuehrt_in is not null) then
      return 'papierkorb.zusammengefuehrt';
    end if;
    return null;
  end if;

  case p_tabelle
    when 'rechnungen' then
      select status into v_text from public.rechnungen where id = p_id;
      if v_text is not null and v_text <> 'entwurf' then return 'papierkorb.rechnung_stornieren'; end if;
    when 'bestellungen' then
      select status into v_text from public.bestellungen where id = p_id;
      if v_text is not null and v_text not in ('entwurf', 'storniert') then return 'papierkorb.bestellung_stornieren'; end if;
    when 'spesen', 'spesen_auszahlungen' then
      return 'papierkorb.spesen_stornieren';
    when 'rechnung_zahlungen', 'kreditor_zahlungen', 'firmenkarte_buchungen', 'lagerbewegungen', 'lagerbestand', 'zeiten_wochen' then
      return 'papierkorb.gebucht';
    when 'zeiten' then
      select exportiert_am into v_zeit from public.zeiten where id = p_id;
      if v_zeit is not null then return 'papierkorb.zeit_exportiert'; end if;
    when 'personen' then
      return 'papierkorb.person_deaktivieren';
    when 'ausgangskorb' then
      select status into v_text from public.ausgangskorb where id = p_id;
      if v_text = 'wird_gesendet' then return 'papierkorb.wird_gesendet'; end if;
    when 'werkvertraege' then
      select unterschrieben_am into v_zeit from public.werkvertraege where id = p_id;
      if v_zeit is not null and not intern.hat_recht('admin') then return 'papierkorb.nur_admin'; end if;
    when 'rapporte' then
      select abgeschlossen_am into v_zeit from public.rapporte where id = p_id;
      if v_zeit is not null and not intern.hat_recht('admin') then return 'papierkorb.nur_admin'; end if;
    else
      null;
  end case;
  return null;
end;
$$;
revoke all on function intern.papierkorb_sperre(text, uuid, boolean) from public;
grant execute on function intern.papierkorb_sperre(text, uuid, boolean) to authenticated;

-- Nur Fachtabellen (eingerichtet mit `richte_fachtabelle_ein`) mit Spalte geloescht_am.
create or replace function intern.papierkorb_tabelle_pruefen(p_tabelle text)
returns void
language plpgsql
stable
security definer
set search_path = public, intern
as $$
begin
  if not exists (select 1 from intern.tabellen_leserecht where tabelle = p_tabelle)
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = p_tabelle and column_name = 'geloescht_am'
     ) then
    raise exception 'papierkorb.unbekannt';
  end if;
end;
$$;
revoke all on function intern.papierkorb_tabelle_pruefen(text) from public;
grant execute on function intern.papierkorb_tabelle_pruefen(text) to authenticated;

/** Legt einen Datensatz in den Papierkorb. Wiederholbar: liegt er schon dort, passiert nichts. */
create or replace function public.papierkorb_legen(p_tabelle text, p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, intern
as $$
declare
  v_sperre text;
  v_anzahl int;
begin
  v_sperre := intern.papierkorb_sperre(p_tabelle, p_id, false);
  if v_sperre is not null then raise exception '%', v_sperre; end if;
  perform intern.papierkorb_tabelle_pruefen(p_tabelle);
  execute format('update public.%I set geloescht_am = now() where id = $1 and geloescht_am is null', p_tabelle)
    using p_id;
  get diagnostics v_anzahl = row_count;
  if v_anzahl = 0 then
    execute format('select count(*) from public.%I where id = $1 and geloescht_am is not null', p_tabelle)
      into v_anzahl using p_id;
    if v_anzahl = 0 then raise exception 'papierkorb.kein_recht'; end if;
  end if;
end;
$$;
grant execute on function public.papierkorb_legen(text, uuid) to authenticated;

/** Holt einen Datensatz aus dem Papierkorb zurück. */
create or replace function public.papierkorb_wiederherstellen(p_tabelle text, p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, intern
as $$
declare
  v_sperre text;
  v_anzahl int;
begin
  v_sperre := intern.papierkorb_sperre(p_tabelle, p_id, true);
  if v_sperre is not null then raise exception '%', v_sperre; end if;
  perform intern.papierkorb_tabelle_pruefen(p_tabelle);
  execute format('update public.%I set geloescht_am = null where id = $1 and geloescht_am is not null', p_tabelle)
    using p_id;
  get diagnostics v_anzahl = row_count;
  if v_anzahl = 0 then raise exception 'papierkorb.kein_recht'; end if;
end;
$$;
grant execute on function public.papierkorb_wiederherstellen(text, uuid) to authenticated;

-- Anzeige-Titel einer Zeile aus den Spalten, die die Tabelle hat (Nummer + Titel/Name/Betreff …).
create or replace function intern.papierkorb_titel_ausdruck(p_tabelle text)
returns text
language plpgsql
stable
set search_path = public, intern
as $$
declare
  v_spalten text[];
  v_teile text[] := '{}';
  v_name text;
  k text;
begin
  select array_agg(column_name::text) into v_spalten
  from information_schema.columns where table_schema = 'public' and table_name = p_tabelle;
  if 'nummer' = any (v_spalten) then v_teile := v_teile || 'nummer::text'; end if;
  foreach k in array array['titel', 'name', 'bezeichnung', 'betreff', 'kennzeichen', 'firma', 'nachname'] loop
    if k = 'nachname' and k = any (v_spalten) and 'vorname' = any (v_spalten) then
      v_name := coalesce(v_name || ', ', '') || format('nullif(concat_ws(%L, vorname, nachname), %L)', ' ', '');
    elsif k = any (v_spalten) then
      v_name := coalesce(v_name || ', ', '') || format('nullif(%I::text, %L)', k, '');
    end if;
  end loop;
  if v_name is not null then v_teile := v_teile || format('coalesce(%s)', v_name); end if;
  foreach k in array array['text', 'notiz', 'beschreibung'] loop
    if k = any (v_spalten) and array_length(v_teile, 1) is null then
      v_teile := v_teile || format('left(%I::text, 80)', k);
    end if;
  end loop;
  if array_length(v_teile, 1) is null then return 'null::text'; end if;
  return format('nullif(concat_ws(%L, %s), %L)', ' · ', array_to_string(v_teile, ', '), '');
end;
$$;

/**
 * Inhalt des Papierkorbs über alle Bereiche, die die Person lesen darf (RLS der Tabellen),
 * neueste zuerst. Wer gelöscht hat, steht im Änderungsprotokoll.
 */
create or replace function public.papierkorb_liste(p_grenze int default 300)
returns table (
  tabelle text,
  id uuid,
  titel text,
  geloescht_am timestamptz,
  geloescht_von text
)
language plpgsql
stable
security invoker
set search_path = public, intern
as $$
declare
  r record;
  v_sql text := '';
begin
  for r in
    select l.tabelle
    from intern.tabellen_leserecht l
    where l.tabelle not in ('personen', 'aenderungsprotokoll', 'ki_aufrufe', 'sicherungen')
      and exists (
        select 1 from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = l.tabelle and c.column_name = 'geloescht_am'
      )
      and exists (
        select 1 from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = l.tabelle and c.column_name = 'id' and c.data_type = 'uuid'
      )
      and intern.hat_recht(l.recht)
  loop
    v_sql := v_sql || case when v_sql = '' then '' else ' union all ' end
      || format(
        '(select %L::text, t.id, %s, t.geloescht_am from public.%I t where t.geloescht_am is not null order by t.geloescht_am desc limit %s)',
        r.tabelle, intern.papierkorb_titel_ausdruck(r.tabelle), r.tabelle, greatest(1, least(p_grenze, 1000))
      );
  end loop;
  if v_sql = '' then return; end if;
  return query execute format(
    'select z.tabelle, z.id, z.titel, z.geloescht_am, (
        select p.name from public.aenderungsprotokoll a join public.personen p on p.auth_user_id = a.benutzer
        where a.tabelle = z.tabelle and a.datensatz = z.id and a.aktion = %L
        order by a.zeitpunkt desc limit 1)
     from (%s) as z(tabelle, id, titel, geloescht_am)
     order by z.geloescht_am desc limit %s',
    'papierkorb', v_sql, greatest(1, least(p_grenze, 1000))
  );
end;
$$;
grant execute on function public.papierkorb_liste(int) to authenticated;
