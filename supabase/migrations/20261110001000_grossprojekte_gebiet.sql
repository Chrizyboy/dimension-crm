-- Grossprojekte (Phase 8c, Nachtrag 31.10.2026), Antworten von Chris:
-- 1. Suchgebiet = alle Regionen von www.dimension-solaire.ch/de/regionen/ (Bulle: Freiburg, Greyerzerland, Waadt,
--    Genf, Neuenburg, Jura, Wallis, Berner Jura und Biel; Muri: Aargau, Luzern, Zug, Zürich). Ein Gebiet ist jetzt
--    eine PLZ mit Radius, damit die Administration im CRM eines dazunehmen kann, ohne Koordinaten zu kennen.
-- 2. Keine harte Schwelle («einfach alles, was interessant ist»): mehr kommt in den Vorrat, die Punkte ordnen,
--    pro Woche gehen weiterhin nur die besten 10 in die Liste. Mindestgrössen bleiben im CRM einstellbar.
-- 3. Intern verantwortlich für Grossprojekte ist Chris, je Grossprojekt änderbar. Seine Aufgaben und die Glocke.

-- WGS84 (Grad) nach LV95 (Meter), Näherung von swisstopo (genau auf etwa 1 m, für Kacheln mehr als genug).
create or replace function intern.lv95(p_breite double precision, p_laenge double precision, out e int, out n int)
language sql immutable set search_path = '' as $$
  with x as (select (p_breite * 3600 - 169028.66) / 10000 as f, (p_laenge * 3600 - 26782.5) / 10000 as l)
  select round(2600072.37 + 211455.93 * l - 10938.51 * l * f - 0.36 * l * f ^ 2 - 44.54 * l ^ 3)::int,
         round(1200147.07 + 308807.95 * f + 3745.25 * l ^ 2 + 76.63 * f ^ 2 - 194.56 * l ^ 2 * f + 119.79 * f ^ 3)::int
    from x
$$;

update public.einstellungen set wert = jsonb_set(jsonb_set(wert, '{fahrzeit_max}', '120'), '{suche}',
  (wert -> 'suche') || $json${
    "zentren": [
      {"name": "Muri und Freiamt", "plz": "5630", "radius_km": 25, "standort": "muri"},
      {"name": "Aargau West (Aarau)", "plz": "5000", "radius_km": 20, "standort": "muri"},
      {"name": "Aargau Ost (Baden)", "plz": "5400", "radius_km": 15, "standort": "muri"},
      {"name": "Luzern", "plz": "6003", "radius_km": 30, "standort": "muri"},
      {"name": "Zug", "plz": "6300", "radius_km": 12, "standort": "muri"},
      {"name": "Zürich", "plz": "8001", "radius_km": 20, "standort": "muri"},
      {"name": "Winterthur", "plz": "8400", "radius_km": 15, "standort": "muri"},
      {"name": "Greyerzerland (Bulle)", "plz": "1630", "radius_km": 25, "standort": "bulle"},
      {"name": "Freiburg", "plz": "1700", "radius_km": 20, "standort": "bulle"},
      {"name": "Waadt (Lausanne, Riviera)", "plz": "1003", "radius_km": 30, "standort": "bulle"},
      {"name": "Waadt Nord (Yverdon)", "plz": "1400", "radius_km": 20, "standort": "bulle"},
      {"name": "Genf", "plz": "1201", "radius_km": 15, "standort": "bulle"},
      {"name": "Neuenburg", "plz": "2000", "radius_km": 20, "standort": "bulle"},
      {"name": "Jura (Delémont)", "plz": "2800", "radius_km": 25, "standort": "bulle"},
      {"name": "Berner Jura und Biel", "plz": "2502", "radius_km": 20, "standort": "bulle"},
      {"name": "Unterwallis (Martigny)", "plz": "1920", "radius_km": 20, "standort": "bulle"},
      {"name": "Mittelwallis (Sion)", "plz": "1950", "radius_km": 20, "standort": "bulle"},
      {"name": "Oberwallis (Visp)", "plz": "3930", "radius_km": 20, "standort": "bulle"}
    ],
    "kacheln_pro_lauf": 10,
    "min_grundflaeche_m2": 500,
    "min_dach_m2": 300,
    "ab_punkte": 35
  }$json$::jsonb) || '{"verantwortlich": ["chris"]}'::jsonb
 where schluessel = 'grossprojekte';

/** Alle Kacheln der Suchgebiete mit Abstand zum nächsten Zentrum (Meter). Zentrum per PLZ oder mit e/n (LV95). */
create or replace function intern.gp_kacheln() returns table (kachel text, e_min int, n_min int, e_max int, n_max int, abstand numeric)
language sql stable security definer set search_path = '' as $$
  with s as (select intern.gp_cfg() -> 'suche' as c),
  z as (
    select coalesce((x ->> 'e')::int, (intern.lv95(p.breite, p.laenge)).e) as e,
           coalesce((x ->> 'n')::int, (intern.lv95(p.breite, p.laenge)).n) as n,
           (x ->> 'radius_km')::numeric * 1000 as r, coalesce((s.c ->> 'kachel_km')::int, 2) * 1000 as k
      from s cross join jsonb_array_elements(coalesce(s.c -> 'zentren', '[]')) x
      left join public.plz_verzeichnis p on p.plz = x ->> 'plz'
     where coalesce((x ->> 'aktiv')::boolean, true)
  ),
  k as (
    select z.k, ke, kn, sqrt(power(ke + z.k / 2.0 - z.e, 2) + power(kn + z.k / 2.0 - z.n, 2)) as d, z.r
      from z,
           generate_series(((z.e - z.r) / z.k)::int * z.k, (z.e + z.r)::int, z.k) ke,
           generate_series(((z.n - z.r) / z.k)::int * z.k, (z.n + z.r)::int, z.k) kn
     where z.e is not null and z.n is not null
  )
  select distinct on (ke, kn) (ke / 1000) || '_' || (kn / 1000), ke, kn, ke + k.k, kn + k.k, round(d)
    from k where d <= r
   order by ke, kn, d
$$;

-- ---------- Intern verantwortlich ----------

alter table public.grossprojekte add column verantwortlich_id uuid references public.personen (id);
comment on column public.grossprojekte.verantwortlich_id is
  'Wer bei uns das Grossprojekt betreut (Standard aus einstellungen.grossprojekte.verantwortlich), änderbar';

-- Neue Grossprojekte bekommen die Person aus der Einstellung.
create or replace function intern.grossprojekt_verantwortlich_vorgeben() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.verantwortlich_id is null then new.verantwortlich_id := (intern.gp_personen('verantwortlich'))[1]; end if;
  return new;
end
$$;
create trigger verantwortlich_vorgeben before insert on public.grossprojekte
  for each row execute function intern.grossprojekt_verantwortlich_vorgeben();

update public.grossprojekte set verantwortlich_id = (intern.gp_personen('verantwortlich'))[1]
 where verantwortlich_id is null and geloescht_am is null;

/** Verantwortliche Person eines Grossprojekts ändern (alle mit Recht «basis»), mit Vermerk im Verlauf. */
create or replace function public.grossprojekt_verantwortlich_setzen(p_id uuid, p_person uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  update public.grossprojekte set verantwortlich_id = p_person where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'grossprojekt.weg'; end if;
  perform intern.gp_vermerk(p_id, 'Verantwortlich: ' || coalesce((select name from public.personen where id = p_person), '–'));
end
$$;
revoke execute on function public.grossprojekt_verantwortlich_setzen(uuid, uuid) from public, anon;
grant execute on function public.grossprojekt_verantwortlich_setzen(uuid, uuid) to authenticated;

/** Vorgeschlagene nächste Schritte als Aufgaben anlegen: für die verantwortliche Person, sonst für mich. */
create or replace function public.grossprojekt_schritte_als_aufgaben(p_id uuid, p_schritte jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_fuer uuid;
  v_n int := 0;
  s jsonb;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  select coalesce(g.verantwortlich_id, intern.meine_person_id()) into v_fuer
    from public.grossprojekte g where g.id = p_id and g.geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'grossprojekt.weg'; end if;
  for s in select * from jsonb_array_elements(coalesce(p_schritte, '[]')) loop
    continue when nullif(trim(s ->> 'titel'), '') is null;
    insert into public.aufgaben (titel, text, faellig_am, person_id, bezug_tabelle, bezug_id)
    values (left(trim(s ->> 'titel'), 200), nullif(trim(s ->> 'text'), ''),
            current_date + coalesce(nullif(s ->> 'in_tagen', '')::int, 7), v_fuer, 'grossprojekte', p_id);
    v_n := v_n + 1;
  end loop;
  perform intern.gp_vermerk(p_id, v_n || ' Schritte als Aufgaben angelegt');
  return v_n;
end
$$;

-- Glocke für neue starke Treffer: an Andy (bewilligt) und an die verantwortliche Person (Chris).

/**
 * Zeitplan (stündlich): fällige «Beobachten» wieder zum Prüfen legen und neue starke Treffer (ab «melden_ab»
 * Punkten) einmal in der Glocke melden: an Andy (sonst die Administration) und an die verantwortliche Person.
 */
create or replace function public.grossprojekte_melden() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb := intern.gp_cfg();
  g public.grossprojekte;
  empfaenger uuid[];
  n_wieder int := 0;
  n_gemeldet int := 0;
begin
  perform set_config('gp.ablauf', 'ja', true);
  for g in select * from public.grossprojekte where stand = 'beobachten' and wiedervorlage_am <= current_date
             and geloescht_am is null loop
    update public.grossprojekte set stand = 'pruefen', wiedervorlage_am = null where id = g.id;
    perform intern.gp_vermerk(g.id, 'Wiedervorlage: wieder zum Prüfen');
    n_wieder := n_wieder + 1;
  end loop;

  empfaenger := intern.gp_personen('bewilligen');
  if cardinality(empfaenger) = 0 then
    select coalesce(array_agg(p.id), '{}') into empfaenger from public.personen p
      left join public.rollen ro on ro.schluessel = p.rolle
     where p.aktiv and p.geloescht_am is null and ('admin' = any (p.rechte) or 'admin' = any (coalesce(ro.rechte, '{}')));
  end if;
  for g in select * from public.grossprojekte where stand = 'pruefen' and gemeldet_am is null and ausschluss is null
             and punkte >= coalesce((c ->> 'melden_ab')::int, 50) and geloescht_am is null order by punkte desc loop
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    select x, 'info', 'Grossprojekt: ' || g.titel, 'Grand projet : ' || g.titel,
           g.punkte || ' Punkte' || coalesce(' · ' || g.gemeinde, ''), g.punkte || ' points' || coalesce(' · ' || g.gemeinde, ''),
           '/contracting?projekt=' || g.id
      from (select distinct y from unnest(empfaenger || g.verantwortlich_id) y where y is not null) d(x);
    update public.grossprojekte set gemeldet_am = now() where id = g.id;
    n_gemeldet := n_gemeldet + 1;
  end loop;
  return jsonb_build_object('wieder', n_wieder, 'gemeldet', n_gemeldet);
end
$$;
revoke execute on function public.grossprojekte_melden() from public, anon, authenticated;
