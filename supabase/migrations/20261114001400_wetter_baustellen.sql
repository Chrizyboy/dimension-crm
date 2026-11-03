-- Wetter auf den Baustellen (M5 A, Quelle M7 B MeteoSwiss Open Data, 3.11.2026, Entscheid 0050):
-- Der Zeitplan holt einmal pro Stunde die lokale Prognose von MeteoSwiss (data.geo.admin.ch, gratis, ohne Schlüssel)
-- für die Postleitzahlen der Einsätze der nächsten Tage und legt sie in `wetter_prognose` ab. Die App liest nur
-- die Tabelle, nie MeteoSwiss direkt: so bleibt der Abruf an einem Ort, und Handys laden nicht je 1 MB CSV.
-- Welche Spalten der CSV gelesen werden und ab wann eine Warnung erscheint, steht in `einstellungen.wetter`
-- (nur Administration), damit sich ein geänderter Parameter-Code ohne neue Version anpassen lässt.

-- 1. Einstellungen ------------------------------------------------------------------------------------------
insert into public.einstellungen (schluessel, wert) values ('wetter', jsonb_build_object(
  'tage', 5,
  -- Codes der Tageswerte in der lokalen Prognose (ogd-local-forecasting_meta_parameters.csv).
  'parameter', jsonb_build_object('tmax', 'tre200dx', 'tmin', 'tre200dn', 'regen_mm', 'rka150d0',
                                  'regen_prozent', 'rp0003d0', 'wind_kmh', 'fu3010dx', 'symbol', 'jp2000d0'),
  -- Ab hier zeigt die Karte den Tag als «Achtung» (Montage auf dem Dach).
  'warnung', jsonb_build_object('regen_mm', 5, 'wind_kmh', 50, 'frost_c', 0, 'hitze_c', 32)
))
on conflict (schluessel) do nothing;

-- Ändern nur Administration: das übernimmt der allgemeine Schutz der Einstellungen (einstellungen.kein_recht).

-- 2. Zwischenspeicher der Prognose ---------------------------------------------------------------------------
-- Kein Fachdatensatz (nur eine Kopie von MeteoSwiss), darum ohne Papierkorb: alte Tage räumt wetter_speichern weg.
create table if not exists public.wetter_prognose (
  plz           text not null,
  datum         date not null,
  tmin          numeric(4, 1),
  tmax          numeric(4, 1),
  regen_mm      numeric(5, 1),
  regen_prozent smallint,
  wind_kmh      smallint,
  symbol        smallint,
  lauf          text,
  geholt_am     timestamptz not null default now(),
  primary key (plz, datum)
);
alter table public.wetter_prognose enable row level security;
drop policy if exists wetter_lesen on public.wetter_prognose;
create policy wetter_lesen on public.wetter_prognose for select to authenticated using ((select intern.hat_recht('basis')));
revoke insert, update, delete on public.wetter_prognose from anon, authenticated;

/** Postleitzahlen, für die der Zeitplan eine Prognose holt: Einsätze der nächsten Tage und die Standorte. */
create or replace function public.wetter_plz() returns text[]
language sql stable security definer set search_path = '' as $$
  with heute as (select (now() at time zone 'Europe/Zurich')::date as d),
       tage as (select coalesce(((select wert ->> 'tage' from public.einstellungen where schluessel = 'wetter'))::int, 5) as n)
  select coalesce(array_agg(distinct x.plz order by x.plz), '{}') from (
    select o.plz from public.einsaetze e join public.projekte p on p.id = e.projekt_id
      join public.objekte o on o.id = p.objekt_id, heute, tage
     where e.geloescht_am is null and e.von <= heute.d + tage.n and coalesce(e.bis, e.von) >= heute.d
    union
    select s.plz from public.standorte s where s.geloescht_am is null
  ) x where x.plz ~ '^\d{4}$';
$$;
revoke execute on function public.wetter_plz() from public, anon, authenticated;
grant execute on function public.wetter_plz() to service_role;

/**
 * Prognose speichern (nur Zeitplan): [{plz, datum, tmin, tmax, regen_mm, regen_prozent, wind_kmh, symbol}].
 * Überschreibt den Tag, räumt Tage älter als 7 Tage weg. Gibt die Anzahl gespeicherter Zeilen zurück.
 */
create or replace function public.wetter_speichern(p_zeilen jsonb, p_lauf text default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  insert into public.wetter_prognose as w (plz, datum, tmin, tmax, regen_mm, regen_prozent, wind_kmh, symbol, lauf, geholt_am)
  select z ->> 'plz', (z ->> 'datum')::date, (z ->> 'tmin')::numeric, (z ->> 'tmax')::numeric,
         (z ->> 'regen_mm')::numeric, round((z ->> 'regen_prozent')::numeric)::smallint,
         round((z ->> 'wind_kmh')::numeric)::smallint, round((z ->> 'symbol')::numeric)::smallint, p_lauf, now()
    from jsonb_array_elements(coalesce(p_zeilen, '[]')) z
   where z ->> 'plz' ~ '^\d{4}$' and z ->> 'datum' ~ '^\d{4}-\d{2}-\d{2}$'
  on conflict (plz, datum) do update
     set tmin = excluded.tmin, tmax = excluded.tmax, regen_mm = excluded.regen_mm,
         regen_prozent = excluded.regen_prozent, wind_kmh = excluded.wind_kmh, symbol = excluded.symbol,
         lauf = excluded.lauf, geholt_am = excluded.geholt_am;
  get diagnostics n = row_count;
  delete from public.wetter_prognose where datum < (now() at time zone 'Europe/Zurich')::date - 7;
  return n;
end
$$;
revoke execute on function public.wetter_speichern(jsonb, text) from public, anon, authenticated;
grant execute on function public.wetter_speichern(jsonb, text) to service_role;

-- 3. Für «Mein Tag» ------------------------------------------------------------------------------------------
/**
 * Meine Baustellen der nächsten Tage mit Wetter (M5 A: Montage und Projektleitung): Einsätze, bei denen ich im
 * Team bin oder das Projekt leite. Ein Eintrag je Baustelle und Tag; `achtung` nach den Schwellen der Einstellungen.
 */
create or replace function public.wetter_baustellen() returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  heute date := (now() at time zone 'Europe/Zurich')::date;
  e jsonb := coalesce((select wert from public.einstellungen where schluessel = 'wetter'), '{}');
  n int := coalesce((e ->> 'tage')::int, 5);
  w jsonb := coalesce(e -> 'warnung', '{}');
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'tag.kein_recht';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'datum', t.datum, 'projekt_id', p.id, 'nummer', p.nummer, 'titel', p.titel,
             'ort', concat_ws(' ', o.plz, o.ort), 'plz', o.plz, 'leite_ich', p.verantwortlich_id = ich,
             'tmin', x.tmin, 'tmax', x.tmax, 'regen_mm', x.regen_mm, 'regen_prozent', x.regen_prozent,
             'wind_kmh', x.wind_kmh, 'symbol', x.symbol, 'geholt_am', x.geholt_am,
             'achtung', case when x.plz is null then null else
               (x.regen_mm >= coalesce((w ->> 'regen_mm')::numeric, 5)
                or x.wind_kmh >= coalesce((w ->> 'wind_kmh')::numeric, 50)
                or x.tmin <= coalesce((w ->> 'frost_c')::numeric, 0)
                or x.tmax >= coalesce((w ->> 'hitze_c')::numeric, 32)) end))
           order by t.datum, p.nummer)
      from public.einsaetze es
      join public.projekte p on p.id = es.projekt_id
      left join public.objekte o on o.id = p.objekt_id
      cross join lateral generate_series(greatest(es.von, heute), least(coalesce(es.bis, es.von), heute + n - 1),
                                         interval '1 day') g
      cross join lateral (select g::date as datum) t
      left join public.wetter_prognose x on x.plz = o.plz and x.datum = t.datum
     where es.geloescht_am is null and p.geloescht_am is null
       and (ich = any (es.personen) or p.verantwortlich_id = ich)
       and es.von <= heute + n - 1 and coalesce(es.bis, es.von) >= heute), '[]');
end
$$;
revoke execute on function public.wetter_baustellen() from public, anon;
grant execute on function public.wetter_baustellen() to authenticated;
