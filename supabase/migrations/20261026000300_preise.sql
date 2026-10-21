-- Phase 7, Teil 3: Preise (V59, V61, V80, V87, V89, V96, V97, V121, V226).
-- Einkaufspreise und Marge sieht nur, wer das Recht «preise» hat (aus Marge und Verkaufspreis liesse sich
-- der Einkauf zurückrechnen). Alle anderen lesen die Sicht «preisliste» mit Verkaufspreis und Datenblättern.

/** Setzt das Lese-/Schreibrecht einer Fachtabelle neu (gleiche Regeln wie richte_fachtabelle_ein). */
create or replace function intern.setze_tabellenrecht(p_tabelle text, p_recht text) returns void
language plpgsql as $$
begin
  execute format('drop policy if exists lesen on public.%I', p_tabelle);
  execute format('drop policy if exists anlegen on public.%I', p_tabelle);
  execute format('drop policy if exists aendern on public.%I', p_tabelle);
  execute format('create policy lesen on public.%I for select to authenticated using ((select intern.hat_recht(%L)))', p_tabelle, p_recht);
  execute format('create policy anlegen on public.%I for insert to authenticated with check ((select intern.hat_recht(%L)))', p_tabelle, p_recht);
  execute format('create policy aendern on public.%I for update to authenticated using ((select intern.hat_recht(%L))) with check ((select intern.hat_recht(%L)))',
                 p_tabelle, p_recht, p_recht);
  insert into intern.tabellen_leserecht (tabelle, recht) values (p_tabelle, p_recht)
    on conflict (tabelle) do update set recht = excluded.recht;
end
$$;

select intern.setze_tabellenrecht('artikel', 'preise');
select intern.setze_tabellenrecht('kalkulationen', 'preise');

alter table public.kalkulationen
  add column if not exists verkauf_rappen bigint,
  add column if not exists einkauf_rappen bigint;
comment on column public.kalkulationen.netto_rappen is 'Total exkl. MWST nach Rabatt.';
comment on column public.kalkulationen.total_rappen is 'Total inkl. MWST.';

/** Verkaufspreis aus Einkauf, Marge und Skonto-Reserve (V59): VK = EK × (1 + Marge) × (1 + Skonto). */
create or replace function public.vk_aus_ek(p_ek bigint, p_marge numeric, p_skonto numeric) returns bigint
language sql immutable set search_path = '' as $$
  select case when p_ek is null then null
              else round(p_ek * (1 + coalesce(p_marge, 0)) * (1 + coalesce(p_skonto, 0)))::bigint end
$$;
grant execute on function public.vk_aus_ek(bigint, numeric, numeric) to authenticated;

/**
 * Preisliste für alle angemeldeten Personen. Läuft als Besitzer (sieht alle Artikel) und filtert selbst:
 * Einkauf, Marge, Skonto und Lieferant nur mit dem Recht «preise».
 */
create or replace view public.preisliste as
with ek as (
  select distinct on (lp.artikel_id) lp.artikel_id, lp.ek_rappen, lp.stand, l.name as lieferant
    from public.lieferantenpreise lp
    left join public.lieferanten l on l.id = lp.lieferant_id
   where lp.geloescht_am is null and lp.ek_rappen is not null
   order by lp.artikel_id, lp.ek_rappen, lp.stand desc nulls last
), recht as (select intern.hat_recht('preise') as preise)
select
  a.id, a.artikelnummer, a.name, a.kategorie, a.hersteller_gruppe, a.einheit, a.leistung_w,
  a.masse, a.masse_art, a.gewicht_kg, a.datenblaetter, a.nachfolger_id,
  a.archiviert_am, a.archiviert_von, a.archiv_grund, a.geaendert_am,
  coalesce(public.vk_aus_ek(ek.ek_rappen, a.marge, a.skonto), a.verkauf_rappen) as vk_rappen,
  case when recht.preise then ek.ek_rappen end as ek_rappen,
  case when recht.preise then a.marge end as marge,
  case when recht.preise then a.skonto end as skonto,
  case when recht.preise then a.rabatt end as rabatt,
  case when recht.preise then ek.lieferant end as lieferant,
  case when recht.preise then ek.stand end as ek_stand,
  lower(concat_ws(' ', a.name, a.artikelnummer, a.hersteller_gruppe, a.kategorie)) as suchtext
from public.artikel a
cross join recht
left join ek on ek.artikel_id = a.id
where a.geloescht_am is null and intern.hat_recht('basis');
grant select on public.preisliste to authenticated;

/**
 * Preis eines Artikels ändern (Inline-Bearbeitung V87): leistung_w, ek_rappen, marge, skonto, verkauf_rappen.
 * Der Einkauf gehört zum günstigsten Lieferantenpreis; fehlt einer, wird er ohne Lieferant angelegt.
 */
create or replace function public.artikel_preis_setzen(p_artikel uuid, p jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  lp uuid;
begin
  if not intern.hat_recht('preise') then raise exception using message = 'recht.fehlt'; end if;
  update public.artikel set
    leistung_w = case when p ? 'leistung_w' then nullif(p ->> 'leistung_w', '')::int else leistung_w end,
    marge = case when p ? 'marge' then nullif(p ->> 'marge', '')::numeric else marge end,
    skonto = case when p ? 'skonto' then nullif(p ->> 'skonto', '')::numeric else skonto end,
    verkauf_rappen = case when p ? 'verkauf_rappen' then nullif(p ->> 'verkauf_rappen', '')::bigint else verkauf_rappen end
  where id = p_artikel;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if p ? 'ek_rappen' then
    select id into lp from public.lieferantenpreise
     where artikel_id = p_artikel and geloescht_am is null
     order by ek_rappen nulls last, stand desc nulls last limit 1;
    if lp is null then
      insert into public.lieferantenpreise (artikel_id, artikelnummer, ek_rappen, stand)
      select p_artikel, a.artikelnummer, nullif(p ->> 'ek_rappen', '')::bigint, current_date from public.artikel a where a.id = p_artikel;
    else
      update public.lieferantenpreise set ek_rappen = nullif(p ->> 'ek_rappen', '')::bigint, stand = current_date where id = lp;
    end if;
  end if;
end
$$;
revoke execute on function public.artikel_preis_setzen(uuid, jsonb) from public, anon;
grant execute on function public.artikel_preis_setzen(uuid, jsonb) to authenticated;

/**
 * Artikel archivieren (V97) mit Grund und optionalem Nachfolger, oder wiederherstellen (p_grund = null).
 * Archivierte Artikel bleiben für alte Offerten und Kalkulationen erhalten.
 */
create or replace function public.artikel_archivieren(p_artikel uuid, p_grund text, p_nachfolger uuid default null)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('preise') then raise exception using message = 'recht.fehlt'; end if;
  if p_nachfolger = p_artikel then raise exception using message = 'preise.nachfolger_selbst'; end if;
  if p_grund is null then
    update public.artikel set archiviert_am = null, archiviert_von = null, archiv_grund = null where id = p_artikel;
  else
    update public.artikel
       set archiviert_am = now(), archiviert_von = intern.mein_vorname(),
           archiv_grund = intern.pflicht(p_grund, 'stand.grund_fehlt'), nachfolger_id = coalesce(p_nachfolger, nachfolger_id)
     where id = p_artikel;
  end if;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
end
$$;
revoke execute on function public.artikel_archivieren(uuid, text, uuid) from public, anon;
grant execute on function public.artikel_archivieren(uuid, text, uuid) to authenticated;

/**
 * Excel «VK Berechnung …» übernehmen (V89, V226). Zeilen: artikelnummer, name, kategorie, hersteller_gruppe,
 * leistung_w, ek_rappen, marge, skonto, rabatt, lieferant. Gleiche Artikelnummer → ändern, sonst neu.
 * Mit p_pruefen = true wird nur gezählt, nichts gespeichert (für «N gelesen: X ändern, Y neu»).
 */
create or replace function public.preise_importieren(p_zeilen jsonb, p_pruefen boolean default false) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  z jsonb;
  a uuid;
  lief uuid;
  geaendert int := 0;
  neu int := 0;
  gleich int := 0;
  alt public.preisliste;
begin
  if not intern.hat_recht('preise') then raise exception using message = 'recht.fehlt'; end if;
  for z in select * from jsonb_array_elements(p_zeilen) loop
    continue when nullif(trim(coalesce(z ->> 'name', '')), '') is null;
    select x.* into alt from public.preisliste x
     where nullif(z ->> 'artikelnummer', '') is not null and x.artikelnummer = trim(z ->> 'artikelnummer')
     order by x.archiviert_am nulls first limit 1;
    if alt.id is null then
      neu := neu + 1;
    elsif alt.ek_rappen is not distinct from nullif(z ->> 'ek_rappen', '')::bigint
          and alt.marge is not distinct from nullif(z ->> 'marge', '')::numeric
          and alt.skonto is not distinct from coalesce(nullif(z ->> 'skonto', '')::numeric, alt.skonto)
          and alt.name = trim(z ->> 'name') then
      gleich := gleich + 1;
      continue;
    else
      geaendert := geaendert + 1;
    end if;
    continue when p_pruefen;
    select id into lief from public.lieferanten where lower(name) = lower(trim(coalesce(z ->> 'lieferant', ''))) limit 1;
    if alt.id is null then
      insert into public.artikel (artikelnummer, name, kategorie, hersteller_gruppe, leistung_w, marge, skonto, rabatt,
                                  bevorzugter_lieferant_id, quelle)
      values (nullif(trim(z ->> 'artikelnummer'), ''), trim(z ->> 'name'), coalesce(nullif(z ->> 'kategorie', ''), 'kabel_montagezubehör'),
              nullif(z ->> 'hersteller_gruppe', ''), nullif(z ->> 'leistung_w', '')::int,
              coalesce(nullif(z ->> 'marge', '')::numeric, 0.25), coalesce(nullif(z ->> 'skonto', '')::numeric, 0.015),
              nullif(z ->> 'rabatt', '')::numeric, lief, 'Excel')
      returning id into a;
      insert into public.lieferantenpreise (artikel_id, lieferant_id, artikelnummer, ek_rappen, stand)
      values (a, lief, nullif(trim(z ->> 'artikelnummer'), ''), nullif(z ->> 'ek_rappen', '')::bigint, current_date);
    else
      update public.artikel set name = trim(z ->> 'name'),
             hersteller_gruppe = coalesce(nullif(z ->> 'hersteller_gruppe', ''), hersteller_gruppe),
             leistung_w = coalesce(nullif(z ->> 'leistung_w', '')::int, leistung_w),
             rabatt = coalesce(nullif(z ->> 'rabatt', '')::numeric, rabatt)
       where id = alt.id;
      perform public.artikel_preis_setzen(alt.id, jsonb_strip_nulls(jsonb_build_object(
        'ek_rappen', nullif(z ->> 'ek_rappen', '')::bigint, 'marge', nullif(z ->> 'marge', '')::numeric,
        'skonto', nullif(z ->> 'skonto', '')::numeric)));
    end if;
  end loop;
  return jsonb_build_object('gelesen', jsonb_array_length(p_zeilen), 'geaendert', geaendert, 'neu', neu, 'gleich', gleich);
end
$$;
revoke execute on function public.preise_importieren(jsonb, boolean) from public, anon;
grant execute on function public.preise_importieren(jsonb, boolean) to authenticated;
