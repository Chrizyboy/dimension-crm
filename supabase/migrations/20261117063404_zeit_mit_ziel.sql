-- Jede Zeit hat ein Ziel (Chris 4.11.2026): ein Projekt, einen Service-Fall (auch über den Rapport, z. B. Wartung)
-- oder einen internen Posten wie Lager/Werkstatt. Zeit «ohne Baustelle» gibt es nicht mehr, damit jede Stunde
-- in der Nachkalkulation oder als interne Zeit sichtbar ist. Die internen Posten sind Daten in
-- einstellungen.baustelle.interne_posten (nur Administration), nicht im Code.

insert into public.einstellungen (schluessel, wert) values ('baustelle', $j${
  "interne_posten": [
    {"schluessel": "lager", "de": "Lager / Werkstatt", "fr": "Dépôt / atelier"},
    {"schluessel": "fahrzeug", "de": "Fahrzeug", "fr": "Véhicule"},
    {"schluessel": "weiterbildung", "de": "Weiterbildung", "fr": "Formation"}
  ]
}$j$::jsonb)
on conflict (schluessel) do update set wert = excluded.wert || public.einstellungen.wert;

alter table public.zeiten
  add column if not exists service_fall_id uuid references public.service_faelle (id),
  add column if not exists intern text;
comment on column public.zeiten.service_fall_id is 'Service-Fall, auf den die Zeit geht (aus dem Rapport oder direkt gewählt).';
comment on column public.zeiten.intern is 'Interner Posten ohne Kunde (Schlüssel aus einstellungen.baustelle.interne_posten, z. B. lager).';
create index if not exists zeiten_service_idx on public.zeiten (service_fall_id) where geloescht_am is null;

/**
 * Ziel der Zeit prüfen und ergänzen: aus dem Rapport kommen Projekt und Service-Fall; ein interner Posten steht
 * allein. Nur beim Anlegen oder wenn sich das Ziel ändert, damit alte Zeiten beim Prüfen nicht scheitern.
 */
create or replace function intern.zeit_ziel() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r public.rapporte;
begin
  if new.rapport_id is not null then
    select * into r from public.rapporte where id = new.rapport_id;
    new.projekt_id := coalesce(new.projekt_id, r.projekt_id);
    new.service_fall_id := coalesce(new.service_fall_id, r.service_fall_id);
  end if;
  new.intern := nullif(trim(new.intern), '');
  if new.intern is not null then
    if new.projekt_id is not null or new.service_fall_id is not null or new.rapport_id is not null then
      raise exception using errcode = 'P0001', message = 'baustelle.zeit_ein_ziel';
    end if;
    if not exists (select 1 from jsonb_array_elements(coalesce(intern.baustelle_cfg() -> 'interne_posten', '[]')) x
                    where x ->> 'schluessel' = new.intern) then
      raise exception using errcode = 'P0001', message = 'baustelle.zeit_posten_unbekannt';
    end if;
  elsif new.projekt_id is null and new.service_fall_id is null and new.rapport_id is null then
    raise exception using errcode = 'P0001', message = 'baustelle.zeit_ohne_ziel';
  end if;
  return new;
end
$$;
drop trigger if exists ziel on public.zeiten;
create trigger ziel before insert or update of projekt_id, rapport_id, service_fall_id, intern on public.zeiten
  for each row execute function intern.zeit_ziel();

/**
 * Zeit starten (p: id, rapport_id, projekt_id, service_fall_id, intern, start, art). Läuft schon eine Zeit, endet
 * sie beim neuen Start: wer auf die nächste Baustelle fährt, muss nicht zuerst stoppen. Ohne Ziel kein Start.
 */
create or replace function public.zeit_starten(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_person uuid := intern.meine_person_id();
  v_start timestamptz := coalesce(nullif(p ->> 'start', '')::timestamptz, now());
begin
  if v_person is null then raise exception using errcode = 'P0001', message = 'baustelle.keine_person'; end if;
  if exists (select 1 from public.zeiten where id = v_id) then return v_id; end if;
  if v_start > now() + interval '10 minutes' then raise exception using errcode = 'P0001', message = 'baustelle.zeit_zukunft'; end if;
  update public.zeiten set stopp = greatest(v_start, start + interval '1 minute')
   where person_id = v_person and stopp is null and geloescht_am is null;
  insert into public.zeiten (id, person_id, rapport_id, projekt_id, service_fall_id, intern, start, art)
  values (v_id, v_person, nullif(p ->> 'rapport_id', '')::uuid, nullif(p ->> 'projekt_id', '')::uuid,
          nullif(p ->> 'service_fall_id', '')::uuid, nullif(p ->> 'intern', ''), v_start,
          coalesce(nullif(p ->> 'art', ''), 'arbeit'));
  return v_id;
end
$$;

/**
 * Zeit von Hand erfassen oder korrigieren (p: id, person_id, start, stopp, pause_min, art, projekt_id,
 * service_fall_id, intern, rapport_id, notiz). Für andere Personen nur mit Recht preise (Policy prüft).
 */
create or replace function public.zeit_speichern(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_start timestamptz := (p ->> 'start')::timestamptz;
  v_stopp timestamptz := nullif(p ->> 'stopp', '')::timestamptz;
begin
  if v_start is null then raise exception using errcode = 'P0001', message = 'baustelle.zeit_start_fehlt'; end if;
  if v_stopp is not null and v_stopp <= v_start then raise exception using errcode = 'P0001', message = 'baustelle.zeit_stopp_vor_start'; end if;
  if coalesce(nullif(p ->> 'pause_min', '')::int, 0) < 0 then raise exception using errcode = 'P0001', message = 'baustelle.zeit_pause'; end if;
  insert into public.zeiten as z (id, person_id, start, stopp, pause_min, art, projekt_id, service_fall_id, intern, rapport_id, notiz)
  values (v_id, coalesce(nullif(p ->> 'person_id', '')::uuid, intern.meine_person_id()), v_start, v_stopp,
          coalesce(nullif(p ->> 'pause_min', '')::int, 0), coalesce(nullif(p ->> 'art', ''), 'arbeit'),
          nullif(p ->> 'projekt_id', '')::uuid, nullif(p ->> 'service_fall_id', '')::uuid, nullif(p ->> 'intern', ''),
          nullif(p ->> 'rapport_id', '')::uuid, nullif(trim(p ->> 'notiz'), ''))
  on conflict (id) do update set start = excluded.start, stopp = excluded.stopp, pause_min = excluded.pause_min,
     art = excluded.art, projekt_id = excluded.projekt_id, service_fall_id = excluded.service_fall_id,
     intern = excluded.intern,
     -- rapport_id mitgeschickt (auch leer): gilt, sonst bleibt der Rapport-Bezug (z. B. Korrektur nur der Uhrzeit).
     rapport_id = case when p ? 'rapport_id' then excluded.rapport_id else z.rapport_id end, notiz = excluded.notiz;
  return v_id;
end
$$;

-- Liste mit dem Ziel als Text (Projekt, Service-Fall oder interner Posten), für Prüfung und Lohn-Export.
drop view if exists public.zeiten_liste;
create view public.zeiten_liste with (security_invoker = true) as
select z.*,
       pe.name as person, pe.kuerzel as person_kuerzel,
       p.nummer as projekt_nummer,
       f.nummer as service_nummer,
       r.nummer as rapport_nummer,
       ip ->> 'de' as intern_de, ip ->> 'fr' as intern_fr,
       (z.start at time zone 'Europe/Zurich')::date as tag,
       case when z.stopp is null then null
            else round((extract(epoch from (z.stopp - z.start)) / 3600.0 - z.pause_min / 60.0)::numeric, 2) end as stunden
  from public.zeiten z
  join public.personen pe on pe.id = z.person_id
  left join public.projekte p on p.id = z.projekt_id
  left join public.service_faelle f on f.id = z.service_fall_id
  left join public.rapporte r on r.id = z.rapport_id
  left join lateral (select x from jsonb_array_elements(coalesce(intern.baustelle_cfg() -> 'interne_posten', '[]')) x
                      where x ->> 'schluessel' = z.intern limit 1) i(ip) on true
 where z.geloescht_am is null;
grant select on public.zeiten_liste to authenticated;

-- Bisherige Zeiten mit Rapport, aber ohne Service-Fall: Service-Fall nachtragen (für die Auswertung pro Fall).
update public.zeiten z set service_fall_id = r.service_fall_id
  from public.rapporte r
 where r.id = z.rapport_id and z.service_fall_id is null and r.service_fall_id is not null;
