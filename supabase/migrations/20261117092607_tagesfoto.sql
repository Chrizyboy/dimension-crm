-- Foto des Tages (Chris 4.11.2026): pro Team und Baustelle mindestens ein Update-Foto pro Tag, einer der beiden
-- genügt. Jedes Foto eines Rapports dieser Baustelle von heute zählt; das Foto des Tages selbst hat die
-- Kategorie «tagesfoto» und hängt am Tagesrapport. Fehlt es, verlangt der Stopp am Handy zuerst das Foto,
-- um 18:00 kommt eine Glocke ans Team und am nächsten Morgen eine an die Projektleitung.

/** Hat die Baustelle an diesem Tag schon ein Foto (egal von wem im Team)? */
create or replace function intern.tagesfoto_da(p_projekt uuid, p_tag date)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dokumente d join public.rapporte r on r.id = d.bezug_id and d.bezug_tabelle = 'rapporte'
                  where r.projekt_id = p_projekt and r.datum = p_tag and r.geloescht_am is null
                    and d.ordner = 'fotos' and d.geloescht_am is null)
$$;

/**
 * Meine Baustellen von heute ohne Foto des Tages (für den Stopp am Handy): Einsatz, Projekt, Nummer, Kunde und
 * der heutige Rapport, an den das Foto kommt (sonst legt das Handy ihn an).
 */
create or replace function public.tagesfoto_offen()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'einsatz_id', es.id, 'projekt_id', p.id, 'nummer', p.nummer,
           'kunde', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
           'rapport_id', (select r.id from public.rapporte r where r.projekt_id = p.id and r.datum = t.tag
                            and r.service_fall_id is null and r.geloescht_am is null and r.abgeschlossen_am is null
                          order by r.erstellt_am limit 1)) order by p.nummer), '[]')
    from (select (now() at time zone 'Europe/Zurich')::date as tag) t
    join public.einsaetze es on es.geloescht_am is null and es.art <> 'geplant' and t.tag between es.von and es.bis
                            and intern.meine_person_id() = any (es.personen)
    join public.projekte p on p.id = es.projekt_id and p.geloescht_am is null
    left join public.kontakte k on k.id = p.kontakt_id
   where not intern.tagesfoto_da(p.id, t.tag)
$$;
grant execute on function public.tagesfoto_offen() to authenticated;

/** Schon gemeldete fehlende Tagesfotos (je Tag, Baustelle und Empfänger einmal). */
create table if not exists intern.tagesfoto_gemeldet (
  tag        date not null,
  projekt_id uuid not null,
  person_id  uuid not null,
  primary key (tag, projekt_id, person_id)
);

/**
 * Zeitplan stündlich: ab 18:00 Glocke ans Team für Baustellen von heute ohne Foto; ab 07:00 Glocke an die
 * Projektleitung (verantwortlich) für gestern ohne Foto. Jede Meldung nur einmal.
 */
create or replace function public.tagesfoto_erinnern() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_jetzt timestamp := now() at time zone 'Europe/Zurich';
  v_tag date := v_jetzt::date;
  n int := 0;
  m int;
begin
  if extract(hour from v_jetzt) >= 18 then
    with fehlt as (
      select distinct p.id as projekt_id, p.nummer, unnest(es.personen) as person_id
        from public.einsaetze es join public.projekte p on p.id = es.projekt_id and p.geloescht_am is null
       where es.geloescht_am is null and es.art <> 'geplant' and v_tag between es.von and es.bis
         and not intern.tagesfoto_da(p.id, v_tag)
    ), neu as (
      insert into intern.tagesfoto_gemeldet (tag, projekt_id, person_id)
      select v_tag, f.projekt_id, f.person_id from fehlt f
      on conflict do nothing
      returning projekt_id, person_id
    )
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
    select neu.person_id, 'warnung', 'Foto des Tages fehlt', 'Photo du jour manquante',
           'Für ' || p.nummer || ' fehlt heute noch das Foto. Einer von euch genügt.',
           'Pour ' || p.nummer || ', la photo du jour manque encore. Un de vous suffit.',
           '/fieldwork', true
      from neu join public.projekte p on p.id = neu.projekt_id;
    get diagnostics m = row_count;
    n := n + m;
  end if;
  if extract(hour from v_jetzt) >= 7 then
    with fehlt as (
      select distinct p.id as projekt_id, p.verantwortlich_id as person_id
        from public.einsaetze es join public.projekte p on p.id = es.projekt_id and p.geloescht_am is null
       where es.geloescht_am is null and es.art <> 'geplant' and (v_tag - 1) between es.von and es.bis
         and p.verantwortlich_id is not null and not intern.tagesfoto_da(p.id, v_tag - 1)
    ), neu as (
      insert into intern.tagesfoto_gemeldet (tag, projekt_id, person_id)
      select v_tag - 1, f.projekt_id, f.person_id from fehlt f
      on conflict do nothing
      returning projekt_id, person_id
    )
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
    select neu.person_id, 'warnung', 'Foto des Tages fehlt', 'Photo du jour manquante',
           p.nummer || ': gestern kein Foto von der Baustelle.', p.nummer || ' : pas de photo du chantier hier.',
           '/fieldwork?reiter=heute', false
      from neu join public.projekte p on p.id = neu.projekt_id;
    get diagnostics m = row_count;
    n := n + m;
  end if;
  return n;
end
$$;
revoke execute on function public.tagesfoto_erinnern() from public, anon, authenticated;
grant execute on function public.tagesfoto_erinnern() to service_role;
