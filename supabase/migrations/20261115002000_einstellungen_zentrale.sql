-- Einstellungen an einem Ort (Chris, 3.11.2026: «Ja, alles so bauen», «Alles zentral»), Etappe 1.
-- 1. Regionen bekommen echte PLZ-Regeln: eine neue Adresse ohne Region erhält sie aus der PLZ (vorher von Hand).
-- 2. Papierkorb über alle Fachtabellen: ansehen und wiederherstellen (nur Administration), nichts wird hart gelöscht.

-- 1. Region aus der PLZ. Regeln wie bei den Standorten: [{"plz_von": 5600, "plz_bis": 5649}, {"kantone": ["ZG"]}].
--    Die erste passende Region (nach Nummer) gewinnt.
create or replace function public.region_fuer_plz(p_plz text)
returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  z  int := nullif(left(regexp_replace(coalesce(p_plz, ''), '\D', '', 'g'), 4), '')::int;
  kt text;
  g  record;
  r  jsonb;
begin
  if z is null then return null; end if;
  select v.kanton into kt from public.plz_verzeichnis v where v.plz = lpad(z::text, 4, '0') limit 1;
  for g in select id, plz_regeln from public.regionen where geloescht_am is null order by nummer loop
    for r in select jsonb_array_elements(case when jsonb_typeof(g.plz_regeln) = 'array' then g.plz_regeln else '[]' end) loop
      continue when r ? 'kantone' and (kt is null or not (r -> 'kantone') ? kt);
      continue when r ? 'plz_von' and z < (r ->> 'plz_von')::int;
      continue when r ? 'plz_bis' and z > (r ->> 'plz_bis')::int;
      continue when not (r ? 'kantone' or r ? 'plz_von' or r ? 'plz_bis');
      return g.id;
    end loop;
  end loop;
  return null;
end
$$;
revoke execute on function public.region_fuer_plz(text) from public, anon;
grant execute on function public.region_fuer_plz(text) to authenticated;

-- Nur wenn die Region leer ist: von Hand Gewähltes bleibt, Übernommenes aus der Vorlage auch.
create or replace function intern.objekt_region_setzen()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.region_id is null and new.plz is not null
     and (tg_op = 'INSERT' or new.plz is distinct from old.plz) then
    new.region_id := public.region_fuer_plz(new.plz);
  end if;
  return new;
end
$$;
revoke execute on function intern.objekt_region_setzen() from public, anon, authenticated;
drop trigger if exists region_setzen on public.objekte;
create trigger region_setzen before insert or update of plz on public.objekte
  for each row execute function intern.objekt_region_setzen();

-- 2. Papierkorb: alle Datensätze mit geloescht_am aus den Fachtabellen, neueste zuerst, mit Bezeichnung und
--    wer gelöscht hat (aus dem Änderungsprotokoll). Nur Administration.
create or replace function public.papierkorb(p_limit int default 300)
returns table (tabelle text, id uuid, bezeichnung text, geloescht_am timestamptz, geloescht_von uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  t text;
  sql text := '';
begin
  if not intern.hat_recht('admin') then
    raise exception using message = 'einstellungen.kein_recht', errcode = '42501';
  end if;
  for t in
    select l.tabelle from intern.tabellen_leserecht l
     where exists (select 1 from information_schema.columns c
                    where c.table_schema = 'public' and c.table_name = l.tabelle and c.column_name = 'geloescht_am')
       and exists (select 1 from information_schema.columns c
                    where c.table_schema = 'public' and c.table_name = l.tabelle and c.column_name = 'id' and c.data_type = 'uuid')
  loop
    sql := sql || case when sql = '' then '' else ' union all ' end || format(
      $f$select %1$L::text, x.id, intern.papierkorb_bezeichnung(to_jsonb(x)), x.geloescht_am
           from public.%1$I x where x.geloescht_am is not null$f$, t);
  end loop;
  if sql = '' then return; end if;
  return query execute format(
    $f$select p.t, p.id, p.b, p.g,
              (select a.benutzer from public.aenderungsprotokoll a
                where a.tabelle = p.t and a.datensatz = p.id and a.aktion = 'papierkorb'
                order by a.zeitpunkt desc limit 1)
         from (%s) p(t, id, b, g) order by p.g desc limit %s$f$, sql, greatest(1, least(coalesce(p_limit, 300), 2000)));
end
$$;
revoke execute on function public.papierkorb(int) from public, anon;
grant execute on function public.papierkorb(int) to authenticated;

-- Lesbare Bezeichnung aus den üblichen Feldern (Nummer, Name, Titel, Betreff …).
create or replace function intern.papierkorb_bezeichnung(d jsonb)
returns text
language sql immutable set search_path = '' as $$
  select left(coalesce(
    nullif(concat_ws(' · ', nullif(d ->> 'nummer', ''),
      coalesce(nullif(d ->> 'name', ''), nullif(d ->> 'titel', ''), nullif(d ->> 'betreff', ''),
               nullif(d ->> 'bezeichnung', ''), nullif(d ->> 'text_de', ''),
               nullif(trim(concat_ws(' ', d ->> 'vorname', d ->> 'nachname')), ''), nullif(d ->> 'firma', ''),
               nullif(d ->> 'zweck', ''), nullif(d ->> 'notiz', ''))), ''),
    d ->> 'id'), 140)
$$;

create or replace function public.papierkorb_wiederherstellen(p_tabelle text, p_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if not intern.hat_recht('admin') then
    raise exception using message = 'einstellungen.kein_recht', errcode = '42501';
  end if;
  if not exists (select 1 from intern.tabellen_leserecht l where l.tabelle = p_tabelle) then
    raise exception using message = 'papierkorb.unbekannt';
  end if;
  execute format('update public.%I set geloescht_am = null where id = $1 and geloescht_am is not null', p_tabelle)
    using p_id;
  get diagnostics n = row_count;
  return n > 0;
end
$$;
revoke execute on function public.papierkorb_wiederherstellen(text, uuid) from public, anon;
grant execute on function public.papierkorb_wiederherstellen(text, uuid) to authenticated;
