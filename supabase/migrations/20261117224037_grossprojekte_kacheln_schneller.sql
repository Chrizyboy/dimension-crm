-- Tempo: Die Suchgebiete (Zentren) werden einmal berechnet statt für jede Kachel neu.
-- Ohne «materialized» rechnete Postgres die Umrechnung der PLZ in LV95 für jede der tausenden Zeilen,
-- grossprojekt_suche_stand brauchte so rund 4 Sekunden (jetzt unter 0,1 s). Ergebnis unverändert.

/** Alle Kacheln der Suchgebiete mit Abstand zum nächsten Zentrum (Meter). Zentrum per PLZ oder mit e/n (LV95). */
create or replace function intern.gp_kacheln() returns table (kachel text, e_min int, n_min int, e_max int, n_max int, abstand numeric)
language sql stable security definer set search_path = '' as $$
  with s as (select intern.gp_cfg() -> 'suche' as c),
  z as materialized (
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
