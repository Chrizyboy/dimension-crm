-- Phase 8c, Erweiterung: Der Grossprojekt-Monitor sucht selbst nach grossen Dächern mit viel Stromverbrauch (Chris,
-- 31.10.2026: Contracting mit Youdera, nächstes Jahr mehrere Grossprojekte). Das Gebiet um die Standorte wird in
-- Kacheln von 2 × 2 km aufgeteilt, die nächsten zuerst. Pro Kachel holt der Zeitplan die grossen Gebäude mit viel
-- Verbrauch aus dem Gebäuderegister (Industrie, Gewerbe, Spital, Heim, Schule, Sport …) und deren Dach bei
-- sonnendach.ch. Ins CRM kommt nur, was genug Punkte hat und noch nicht in der Liste steht. Gebiete, Grössen und
-- Gebäudeklassen sind Daten in einstellungen.grossprojekte.suche (nur Administration).

update public.einstellungen set wert = wert || $json${
  "suche": {
    "aktiv": true,
    "zentren": [
      {"name": "Muri", "e": 2668700, "n": 1236200, "radius_km": 30},
      {"name": "Bulle", "e": 2571000, "n": 1163000, "radius_km": 30}
    ],
    "kachel_km": 2,
    "kacheln_pro_lauf": 6,
    "min_grundflaeche_m2": 800,
    "min_dach_m2": 500,
    "ab_punkte": 50,
    "klassen": [1251, 1252, 1230, 1220, 1263, 1264, 1265, 1130],
    "wiederholen_tage": 365
  }
}$json$::jsonb
 where schluessel = 'grossprojekte';

-- Was schon durchsucht ist (je Kachel einmal pro Jahr). Nur der Server schreibt; die App liest den Stand über
-- grossprojekt_suche_stand().
create table intern.gp_suchkacheln (
  kachel       text primary key,         -- linke untere Ecke in km (LV95), z. B. «2668_1236»
  geprueft_am  timestamptz not null default now(),
  gebaeude     int not null default 0,   -- Gebäude im Gebäuderegister
  kandidaten   int not null default 0,   -- davon gross genug und mit viel Verbrauch
  treffer      int not null default 0    -- davon neu als Grossprojekt aufgenommen
);

/** Alle Kacheln der Suchgebiete mit Abstand zum Zentrum (Meter), die nächsten zuerst. */
create or replace function intern.gp_kacheln() returns table (kachel text, e_min int, n_min int, e_max int, n_max int, abstand numeric)
language sql stable security definer set search_path = '' as $$
  with s as (select intern.gp_cfg() -> 'suche' as c),
  z as (
    select (x ->> 'e')::int as e, (x ->> 'n')::int as n, (x ->> 'radius_km')::numeric * 1000 as r,
           coalesce((s.c ->> 'kachel_km')::int, 2) * 1000 as k
      from s, jsonb_array_elements(coalesce(s.c -> 'zentren', '[]')) x
  ),
  k as (
    select z.k, ke, kn, sqrt(power(ke + z.k / 2.0 - z.e, 2) + power(kn + z.k / 2.0 - z.n, 2)) as d, z.r
      from z,
           generate_series(((z.e - z.r) / z.k)::int * z.k, (z.e + z.r)::int, z.k) ke,
           generate_series(((z.n - z.r) / z.k)::int * z.k, (z.n + z.r)::int, z.k) kn
  )
  select distinct on (ke, kn) (ke / 1000) || '_' || (kn / 1000), ke, kn, ke + k.k, kn + k.k, round(d)
    from k where d <= r
   order by ke, kn, d
$$;

/**
 * Bewertet ein Grossprojekt wie beim Speichern: Kanton, Standort, Sprache und Fahrzeit aus der PLZ (wenn sie neu ist),
 * dann Punkte, Ausschluss und Schätzung. Für den Trigger und um Treffer der Dachsuche vor dem Speichern zu prüfen.
 */
create or replace function intern.gp_vorbereitet(g public.grossprojekte, p_lage boolean) returns public.grossprojekte
language plpgsql stable security definer set search_path = '' as $$
declare
  b record;
begin
  g.plz := nullif(substring(coalesce(g.plz, '') from '\d{4}'), '');
  if g.plz is not null and p_lage then
    g.kanton := coalesce((select v.kanton from public.plz_verzeichnis v where v.plz = g.plz limit 1), g.kanton);
    g.standort_id := (select s.id from public.standorte s where s.kuerzel = public.standort_fuer_plz(g.plz));
    g.sprache := coalesce((select s.sprache from public.standorte s where s.id = g.standort_id), g.sprache, 'de');
    select min(intern.fahrzeit_min(s.plz, g.plz)) into g.fahrzeit_min from public.standorte s where s.geloescht_am is null;
  end if;
  select * into b from intern.gp_bewerten(g);
  g.punkte := b.punkte;
  g.punkte_details := b.details;
  g.art := b.art;
  g.ausschluss := b.ausschluss;
  g.schaetzung := b.schaetzung;
  return g;
end
$$;

create or replace function intern.grossprojekt_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.nummer is null then
    new.nummer := 'GP-' || extract(year from now())::int || '-' || lpad(nextval('public.grossprojekt_nummer_seq')::text, 4, '0');
  end if;
  return intern.gp_vorbereitet(new, tg_op = 'INSERT' or nullif(substring(coalesce(new.plz, '') from '\d{4}'), '') is distinct from old.plz);
end
$$;

/** Zeitplan: die nächsten Kacheln, die noch nie oder vor mehr als «wiederholen_tage» durchsucht wurden. */
create or replace function public.grossprojekt_suche_naechste(p_anzahl int default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when coalesce((intern.gp_cfg() #>> '{suche,aktiv}')::boolean, false) then coalesce(jsonb_agg(
           jsonb_build_object('kachel', k.kachel, 'e_min', k.e_min, 'n_min', k.n_min, 'e_max', k.e_max, 'n_max', k.n_max)
           order by k.abstand, k.kachel), '[]') else '[]' end
    from (select k.* from intern.gp_kacheln() k
            left join intern.gp_suchkacheln s on s.kachel = k.kachel
           where s.kachel is null
              or s.geprueft_am < now() - make_interval(days => coalesce((intern.gp_cfg() #>> '{suche,wiederholen_tage}')::int, 365))
           order by k.abstand, k.kachel
           limit coalesce(p_anzahl, (intern.gp_cfg() #>> '{suche,kacheln_pro_lauf}')::int, 6)) k
$$;

/** Zeitplan: eine Kachel ist durchsucht. */
create or replace function public.grossprojekt_suche_kachel_fertig(p_kachel text, p_gebaeude int, p_kandidaten int, p_treffer int)
returns void language sql security definer set search_path = '' as $$
  insert into intern.gp_suchkacheln (kachel, geprueft_am, gebaeude, kandidaten, treffer)
  values (p_kachel, now(), coalesce(p_gebaeude, 0), coalesce(p_kandidaten, 0), coalesce(p_treffer, 0))
  on conflict (kachel) do update set geprueft_am = now(), gebaeude = excluded.gebaeude,
    kandidaten = excluded.kandidaten, treffer = intern.gp_suchkacheln.treffer + excluded.treffer
$$;

/**
 * Ein Gebäude aus der Dachsuche aufnehmen. Gibt die id zurück oder null, wenn es schon in der Liste steht (gleiches
 * Gebäude oder innert 30 m, auch im Papierkorb oder verworfen: was Andy weggelegt hat, kommt nicht wieder), zu wenig
 * Punkte hat oder ausgeschlossen ist. Die Bauherrschaft steht nicht im Gebäuderegister: Andy klärt sie im Grundbuch.
 */
create or replace function public.grossprojekt_aus_suche(p jsonb, p_meldung text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  g public.grossprojekte;
  v_id uuid;
  v_ab int := coalesce((intern.gp_cfg() #>> '{suche,ab_punkte}')::int, (intern.gp_cfg() ->> 'melden_ab')::int, 50);
  v_e numeric := nullif(p ->> 'lage_e', '')::numeric;
  v_n numeric := nullif(p ->> 'lage_n', '')::numeric;
begin
  if nullif(p ->> 'egid', '') is null then return null; end if;
  if exists (select 1 from public.grossprojekte x where x.egid = p ->> 'egid'
                or (x.quelle = 'suche' and x.quell_id = 'egid:' || (p ->> 'egid'))
                or (v_e is not null and abs(x.lage_e - v_e) < 30 and abs(x.lage_n - v_n) < 30)) then
    return null;
  end if;
  g := jsonb_populate_record(null::public.grossprojekte, p - 'id' - 'nummer' - 'stand' - 'punkte');
  g.quelle := 'suche';
  g.quell_id := 'egid:' || (p ->> 'egid');
  g.bauherr_art := coalesce(g.bauherr_art, 'unbekannt');
  g := intern.gp_vorbereitet(g, true);
  if g.ausschluss is not null or g.punkte < v_ab then return null; end if;

  perform set_config('gp.ablauf', 'ja', true);
  insert into public.grossprojekte (titel, beschreibung, quelle, quell_id, quell_url, strasse, plz, gemeinde, parzelle,
    lage_e, lage_n, bauherr_art, nutzung, dachflaeche_m2, dach_klasse, stromertrag_kwh, heizung, heizung_jahr,
    wohnungen, baujahr, egid, angereichert_am, anreicherung)
  values (
    left(concat_ws(', ', case g.sprache when 'fr' then
        case g.nutzung when 'industrie' then 'Bâtiment industriel' when 'gewerbe' then 'Bâtiment commercial'
          when 'verwaltung' then 'Bâtiment administratif' when 'schule' then 'École' when 'spital' then 'Hôpital'
          when 'heim' then 'EMS' when 'sport' then 'Salle de sport' else 'Grand bâtiment' end
      else
        case g.nutzung when 'industrie' then 'Industriegebäude' when 'gewerbe' then 'Gewerbegebäude'
          when 'verwaltung' then 'Bürogebäude' when 'schule' then 'Schulhaus' when 'spital' then 'Spital'
          when 'heim' then 'Heim' when 'sport' then 'Sporthalle' else 'Grosses Gebäude' end
      end, coalesce(g.strasse, g.gemeinde)), 500),
    case g.sprache when 'fr' then 'Trouvé par la recherche de toits. Propriétaire à vérifier au registre foncier.'
      else 'Von der Dachsuche gefunden. Eigentümer im Grundbuch nachschlagen.' end,
    'suche', g.quell_id, coalesce(nullif(p ->> 'quell_url', ''), 'Gebäuderegister EGID ' || g.egid),
    g.strasse, g.plz, g.gemeinde, g.parzelle, g.lage_e, g.lage_n, g.bauherr_art, g.nutzung, g.dachflaeche_m2,
    g.dach_klasse, g.stromertrag_kwh, g.heizung, g.heizung_jahr, g.wohnungen, g.baujahr, g.egid, now(),
    left(coalesce(p_meldung, 'Dachsuche'), 300))
  returning id into v_id;
  perform set_config('gp.ablauf', '', true);
  perform intern.gp_vermerk(v_id, 'Gefunden: Dachsuche', jsonb_build_object('meldung', p_meldung));
  return v_id;
end
$$;

revoke execute on function public.grossprojekt_suche_naechste(int) from public, anon, authenticated;
revoke execute on function public.grossprojekt_suche_kachel_fertig(text, int, int, int) from public, anon, authenticated;
revoke execute on function public.grossprojekt_aus_suche(jsonb, text) from public, anon, authenticated;
grant execute on function public.grossprojekt_suche_naechste(int) to service_role;
grant execute on function public.grossprojekt_suche_kachel_fertig(text, int, int, int) to service_role;
grant execute on function public.grossprojekt_aus_suche(jsonb, text) to service_role;

/** Stand der Dachsuche für die App: Gebiete gesamt, durchsucht, Treffer, zuletzt. */
create or replace function public.grossprojekt_suche_stand() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'aktiv', coalesce((intern.gp_cfg() #>> '{suche,aktiv}')::boolean, false),
    'gebiete', (select count(*) from intern.gp_kacheln()),
    'durchsucht', (select count(*) from intern.gp_kacheln() k join intern.gp_suchkacheln s using (kachel)),
    'gebaeude', (select coalesce(sum(gebaeude), 0) from intern.gp_suchkacheln),
    'treffer', (select count(*) from public.grossprojekte where quelle = 'suche' and geloescht_am is null),
    'zuletzt', (select max(geprueft_am) from intern.gp_suchkacheln))
$$;
revoke execute on function public.grossprojekt_suche_stand() from public, anon;
grant execute on function public.grossprojekt_suche_stand() to authenticated;
