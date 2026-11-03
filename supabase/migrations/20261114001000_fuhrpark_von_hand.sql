-- Fahrzeuge & Geräte: Antworten von Chris auf die Fragen (3.11.2026, Entscheid 0042).
-- Frage 1 B «Immer von Hand»: ein Fahrzeug folgt dem Team im Zeitplan nicht mehr automatisch; die Belegung
-- besteht nur noch aus Reservierungen (von Hand, Werkstatt oder für einen Einsatz).
-- Frage 5 B «Nicht nötig»: kein Privatanteil Geschäftsauto im CRM (Lohnausweis bleibt in AbaNinja).

/** Belegung aller Fahrzeuge und Geräte: nur Reservierungen. `quelle` bleibt für die App (immer «hand»). */
create or replace view public.ressourcen_belegung with (security_invoker = true) as
select 'hand'::text as quelle, r.id as reservierung_id, r.fahrzeug_id, r.geraet_id, r.von, r.bis, r.art,
       r.einsatz_id, r.projekt_id, r.person_id, r.zweck,
       coalesce(nullif(trim(coalesce(k.firma, concat_ws(' ', k.vorname, k.nachname))), '') || coalesce(', ' || o.ort, ''),
                p.titel, p.nummer) as projekt
  from public.ressourcen_reservierungen r
  left join public.projekte p on p.id = r.projekt_id
  left join public.kontakte k on k.id = p.kontakt_id
  left join public.objekte o on o.id = p.objekt_id
 where r.geloescht_am is null;

/**
 * Kosten pro Fahrzeug in einem Jahr (bis heute): Leasing (Rate × Monate), Treibstoff/Strom (Einträge «Tanken»),
 * Unterhalt (Service, MFK, Reparatur, Reifen, Schaden), Versicherung und Steuer (Jahresbeträge anteilig) und übrige
 * Kosten; dazu gefahrene Kilometer und Liter. Nur mit Recht «finanzen».
 */
create or replace function public.fuhrpark_kosten(p_jahr int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  heute date := (now() at time zone 'Europe/Zurich')::date;
  anfang date := make_date(p_jahr, 1, 1);
  ende date := least(make_date(p_jahr, 12, 31), heute);
  fahrzeuge jsonb;
begin
  if not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'ressourcen.kein_recht';
  end if;
  if ende < anfang then
    return jsonb_build_object('jahr', p_jahr, 'fahrzeuge', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(z order by z ->> 'bezeichnung'), '[]') into fahrzeuge from (
    select jsonb_build_object(
      'fahrzeug_id', f.id, 'bezeichnung', f.bezeichnung, 'kennzeichen', f.kennzeichen,
      'km', greatest(coalesce(km.bis - km.von, 0), 0),
      'liter', coalesce(e.liter, 0),
      'leasing_rappen', coalesce(f.leasing_rate_rappen, 0) * lm.monate,
      'treibstoff_rappen', coalesce(e.treibstoff, 0),
      'unterhalt_rappen', coalesce(e.unterhalt, 0),
      'fix_rappen', round((coalesce(f.praemie_rappen, 0) + coalesce(f.verkehrssteuer_rappen, 0)) * jm.monate / 12.0)::bigint,
      'uebrige_rappen', coalesce(e.uebrige, 0)
    ) as z
      from public.fahrzeuge f
      -- Monate im Jahr, in denen das Fahrzeug im Betrieb bzw. im Leasing war (angefangene Monate zählen).
      cross join lateral (select count(*)::int as monate from generate_series(
        date_trunc('month', greatest(anfang, coalesce(f.kaufdatum, f.leasing_beginn, f.erste_inverkehrsetzung, anfang))),
        ende, interval '1 month') m) jm
      cross join lateral (select case when f.leasing_rate_rappen is null then 0 else count(*)::int end as monate
                            from generate_series(date_trunc('month', greatest(anfang, coalesce(f.leasing_beginn, anfang))),
                                                 least(ende, coalesce(f.leasing_bis, ende)), interval '1 month') m) lm
      cross join lateral (
        select coalesce((select max(x.km) from public.ressourcen_eintraege x
                          where x.fahrzeug_id = f.id and x.geloescht_am is null and x.datum < anfang),
                        (select min(x.km) from public.ressourcen_eintraege x
                          where x.fahrzeug_id = f.id and x.geloescht_am is null and x.datum between anfang and ende)) as von,
               (select max(x.km) from public.ressourcen_eintraege x
                 where x.fahrzeug_id = f.id and x.geloescht_am is null and x.datum between anfang and ende) as bis) km
      left join lateral (
        select sum(x.liter) filter (where x.art = 'tanken') as liter,
               sum(x.kosten_rappen) filter (where x.art = 'tanken') as treibstoff,
               sum(x.kosten_rappen) filter (where x.art in ('service', 'mfk', 'reparatur', 'reifen', 'schaden')) as unterhalt,
               sum(x.kosten_rappen) filter (where x.art in ('kosten', 'vignette', 'km_stand', 'notiz')) as uebrige
          from public.ressourcen_eintraege x
         where x.fahrzeug_id = f.id and x.geloescht_am is null and x.datum between anfang and ende) e on true
     where f.geloescht_am is null
       and (not f.ausser_betrieb or exists (select 1 from public.ressourcen_eintraege x
                                              where x.fahrzeug_id = f.id and x.datum between anfang and ende))
  ) t;
  return jsonb_build_object(
    'jahr', p_jahr,
    'fahrzeuge', fahrzeuge,
    'geraete_wert_rappen', (select coalesce(sum(g.kaufpreis_rappen), 0) from public.geraete g
                             where g.geloescht_am is null and g.ausgemustert_am is null),
    'geraete_kosten_rappen', (select coalesce(sum(x.kosten_rappen), 0) from public.ressourcen_eintraege x
                               where x.geraet_id is not null and x.geloescht_am is null
                                 and x.datum between anfang and ende));
end
$$;
revoke execute on function public.fuhrpark_kosten(int) from public, anon;
grant execute on function public.fuhrpark_kosten(int) to authenticated;

-- Privatanteil weg: Einstellung und Spalte (noch nie in der Cloud genutzt).
update public.einstellungen set wert = wert - 'privatanteil_prozent_monat' where schluessel = 'ressourcen';
alter table public.fahrzeuge drop column privat_anteil;
