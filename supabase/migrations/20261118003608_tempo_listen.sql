-- tempo_listen
-- Tempo mit echten Datenmengen (Probe-Import, 19.11.2026). Ergebnisse unverändert, nur schneller.

-- 1) Tempo: kundenstand() ohne eigenes «set search_path», damit Postgres die Funktion in die Sicht einbauen kann
-- (Inlining). Mit der Einstellung lief sie für jeden Kunden als eigener Aufruf: kunden_uebersicht und
-- marketing_zielgruppe brauchten bei 766 Kunden rund 0,9 s, jetzt unter 0,1 s. Alle Namen sind voll
-- qualifiziert und die Funktion läuft mit den Rechten der Person (security invoker), darum ist das sicher.

create or replace function public.kundenstand(p_kontakt uuid)
returns table (stand text, stand_datum date, bezug_tabelle text, bezug_id uuid)
language sql stable security invoker as $$
  with kandidaten as (
    select intern.stand_projekt(p, coalesce(o.entscheid = 'angenommen', false)) as stand,
           coalesce(p.baubeginn, p.unterzeichnet_am, o.angebot_am, p.erstellt_am::date) as datum,
           'projekte' as tabelle, p.id
      from public.projekte p
      left join public.offerten o on o.id = p.offerte_id
     where p.kontakt_id = p_kontakt and p.geloescht_am is null
    union all
    select intern.stand_offerte(o, coalesce(v.offerte_status = 'pruefung', false)),
           coalesce(o.angebot_am, o.erstellt_am::date), 'offerten', o.id
      from public.offerten o
      left join public.verkaufschancen v on v.id = o.verkaufschance_id
     where o.kontakt_id = p_kontakt and o.geloescht_am is null
       and not exists (select 1 from public.projekte p where p.offerte_id = o.id and p.geloescht_am is null)
    union all
    select intern.stand_verkaufschance(v), coalesce(v.eingang_am, v.erstellt_am::date), 'verkaufschancen', v.id
      from public.verkaufschancen v
     where v.kontakt_id = p_kontakt and v.geloescht_am is null
       and not exists (select 1 from public.offerten o where o.verkaufschance_id = v.id and o.geloescht_am is null)
       and not exists (select 1 from public.projekte p where p.verkaufschance_id = v.id and p.geloescht_am is null)
  )
  select k.stand, k.datum, k.tabelle, k.id
    from kandidaten k
    left join public.auswahlwerte a on a.liste = 'kundenstand' and a.schluessel = k.stand
   order by k.datum desc nulls last, a.reihenfolge desc nulls last
   limit 1
$$;


-- 2) Rechte je Transaktion merken (Zeilenregeln und Funktionen pro Zeile).
/**
 * Hat die angemeldete Person das Recht? Siehe intern.wirksame_rechte: «gl» umfasst die Fachrechte, «admin» nur das System.
 * Tempo: Die Rechte werden je Transaktion und Person einmal gerechnet und in «dw.rechte» gemerkt. Warum: Jede
 * Zeilenregel (RLS) und jede Funktion pro Zeile fragte sonst Personen und Rollen neu ab (rund 0,3 ms je Aufruf);
 * Listen mit hunderten Zeilen brauchten dadurch eine halbe Sekunde. Ändern sich Personen oder Rollen, löscht der
 * Trigger «rechte_vergessen» den Merker, damit nie alte Rechte gelten.
 */
create or replace function intern.hat_recht(p_recht text)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  wer text := coalesce(auth.uid()::text, '');
  merker text := current_setting('dw.rechte', true);
  rechte text[];
begin
  if merker is not null and merker <> '' and split_part(merker, '|', 1) = wer then
    rechte := string_to_array(split_part(merker, '|', 2), ',');
  else
    rechte := coalesce(intern.wirksame_rechte(intern.meine_person_id()), '{}');
    perform set_config('dw.rechte', wer || '|' || array_to_string(rechte, ','), true);
  end if;
  return coalesce(p_recht = any (rechte), false);
end
$$;
comment on function intern.hat_recht(text) is
  'Hat die angemeldete Person das Recht? Siehe intern.wirksame_rechte; je Transaktion gemerkt (dw.rechte).';

/** Merker der Rechte leeren, sobald sich Personen oder Rollen ändern (siehe intern.hat_recht). */
create or replace function intern.rechte_vergessen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('dw.rechte', '', true);
  return null;
end
$$;
create trigger rechte_vergessen after insert or update or delete on public.personen
  for each statement execute function intern.rechte_vergessen();
create trigger rechte_vergessen after insert or update or delete on public.rollen
  for each statement execute function intern.rechte_vergessen();


-- 3) Preisliste: Recht «preise» einmal prüfen statt in jeder Zeile und Spalte (0,6 s → 0,01 s).
create or replace view public.preisliste as
with ek as (
  select distinct on (lp.artikel_id) lp.artikel_id, lp.ek_rappen, lp.stand, l.name as lieferant
    from public.lieferantenpreise lp
    left join public.lieferanten l on l.id = lp.lieferant_id
   where lp.geloescht_am is null and lp.ek_rappen is not null
   order by lp.artikel_id, lp.ek_rappen, lp.stand desc nulls last
), lager as (
  select lb.artikel_id, sum(lb.menge - lb.reserviert) as frei, sum(lb.reserviert) as reserviert
    from public.lagerbestand lb where lb.geloescht_am is null group by lb.artikel_id
), unterwegs as (
  select p.artikel_id, sum(greatest(p.menge - p.geliefert_menge, 0)) as menge
    from public.bestellpositionen p join public.bestellungen b on b.id = p.bestellung_id
   where p.geloescht_am is null and b.geloescht_am is null and p.artikel_id is not null
     and b.status in ('entwurf', 'freigegeben', 'bestellt', 'teilgeliefert')
   group by p.artikel_id
), lief as (
  select lp.artikel_id, count(*)::int as anzahl from public.lieferantenpreise lp
   where lp.geloescht_am is null and lp.ek_rappen is not null group by lp.artikel_id
), recht as materialized (select intern.hat_recht('preise') as preise)
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
  lower(concat_ws(' ', a.name, a.artikelnummer, a.hersteller_gruppe, a.kategorie)) as suchtext,
  coalesce(lager.frei, 0) as lager_frei,
  coalesce(lager.reserviert, 0) as lager_reserviert,
  coalesce(unterwegs.menge, 0) as lager_unterwegs,
  case when recht.preise then coalesce(lief.anzahl, 0) end as lieferanten_anzahl,
  a.garantie_jahre
from public.artikel a
cross join recht
left join ek on ek.artikel_id = a.id
left join lager on lager.artikel_id = a.id
left join unterwegs on unterwegs.artikel_id = a.id
left join lief on lief.artikel_id = a.id
where a.geloescht_am is null and intern.hat_recht('basis');
grant select on public.preisliste to authenticated;


-- 4) Zeiterfassung: Feiertage einmal je Zeitraum (Jahreskonto 0,6 s → 0,06 s).
create or replace function intern.zeit_tage(p_person uuid, p_von date, p_bis date)
returns table (tag date, soll_h numeric, ist_h numeric, feiertag text, art text, gutschrift_h numeric, ferientag numeric)
language sql stable security definer set search_path = '' as $$
  with pe as (
    select pr.id, s.kuerzel as standort, a.eintritt, a.austritt,
           coalesce(a.wochenstunden,
                    coalesce((intern.zeit_cfg() ->> 'wochenstunden')::numeric, 42.5) * coalesce(a.pensum, 100) / 100.0) as woche_h,
           greatest(coalesce((intern.zeit_cfg() ->> 'aktiv_seit')::date, '2026-01-01'), coalesce(a.eintritt, '2000-01-01')) as ab
      from public.personen pr
      left join public.standorte s on s.id = pr.standort_id
      left join public.personal_akten a on a.person_id = pr.id and a.geloescht_am is null
     where pr.id = p_person
  ), tage as (
    select d::date as tag from generate_series(p_von, p_bis, interval '1 day') d
  ), fei as materialized (
    -- Feiertage einmal für den ganzen Zeitraum statt für jeden Tag einzeln (Tempo: ein Jahr = 365 Aufrufe).
    select distinct on (x.tag) x.tag, x.name_de
      from pe, intern.feiertage(pe.standort, p_von, p_bis) x
     order by x.tag
  ), ist as (
    select (z.start at time zone 'Europe/Zurich')::date as tag,
           sum(extract(epoch from (coalesce(z.stopp, least(now(), z.start + interval '14 hours')) - z.start)) / 3600.0
               - z.pause_min / 60.0) as h
      from public.zeiten z
     where z.person_id = p_person and z.geloescht_am is null
       and z.start >= p_von::timestamp at time zone 'Europe/Zurich'
       and z.start < (p_bis + 1)::timestamp at time zone 'Europe/Zurich'
     group by 1
  )
  select t.tag,
         round(case when soll_tag then pe.woche_h / 5 else 0 end, 4),
         round(coalesce(ist.h, 0)::numeric, 4),
         f.name_de,
         ab.art,
         round(case when soll_tag and ab.art is not null and intern.abwesenheit_eigenschaft(ab.art, 'soll')
                    then pe.woche_h / 5 * case when ab.halbtag then 0.5 else 1 end else 0 end, 4),
         -- Ferientage zählen auch vor dem Start der Zeiterfassung (Ferienkonto gilt fürs ganze Jahr).
         case when arbeitstag and ab.art is not null and intern.abwesenheit_eigenschaft(ab.art, 'ferien')
              then case when ab.halbtag then 0.5 else 1 end else 0 end
    from tage t
    cross join pe
    left join fei f on f.tag = t.tag
    left join lateral (select a.art, a.halbtag from public.abwesenheiten a
                        where a.person_id = p_person and a.geloescht_am is null and a.status = 'bewilligt'
                          and t.tag between a.von and a.bis
                        order by a.halbtag, a.von limit 1) ab on true
    left join ist on ist.tag = t.tag
    cross join lateral (select extract(isodow from t.tag) < 6 and f.tag is null
                               and t.tag >= coalesce(pe.eintritt, '2000-01-01')
                               and (pe.austritt is null or t.tag <= pe.austritt) as arbeitstag) w
    cross join lateral (select w.arbeitstag and t.tag >= pe.ab as soll_tag) s
$$;
