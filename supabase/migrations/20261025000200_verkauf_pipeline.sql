-- Phase 6, Teil 2: die Verkaufs-Pipeline. Ein «Geschäft» ist eine Verkaufschance mit ihrer jüngsten
-- Offerte und ihrem Projekt; Offerten und Projekte ohne Lead (aus V233) stehen als eigenes Geschäft da.
-- Der Stand kommt aus denselben Regeln wie in der Kundenakte (Phase 5), damit überall dasselbe steht.

create index if not exists offerten_verkaufschance_idx on public.offerten (verkaufschance_id) where geloescht_am is null;
create index if not exists projekte_offerte_idx on public.projekte (offerte_id) where geloescht_am is null;
create index if not exists projekte_verkaufschance_idx on public.projekte (verkaufschance_id) where geloescht_am is null;
create index if not exists aktivitaeten_verkaufschance_idx on public.aktivitaeten (verkaufschance_id, zeitpunkt desc);

create or replace view public.verkauf_geschaefte with (security_invoker = true) as
with g as (
  select v.id as verkaufschance_id, o.id as offerte_id, p.id as projekt_id
    from public.verkaufschancen v
    left join lateral (
      select x.id from public.offerten x
       where x.verkaufschance_id = v.id and x.geloescht_am is null
       order by coalesce(x.angebot_am, x.erstellt_am::date) desc, x.erstellt_am desc limit 1
    ) o on true
    left join lateral (
      select x.id from public.projekte x
       where x.geloescht_am is null and (x.verkaufschance_id = v.id or x.offerte_id = o.id)
       order by x.erstellt_am desc limit 1
    ) p on true
   where v.geloescht_am is null
  union all
  select null, o.id, p.id
    from public.offerten o
    left join lateral (
      select x.id from public.projekte x where x.offerte_id = o.id and x.geloescht_am is null
       order by x.erstellt_am desc limit 1
    ) p on true
   where o.geloescht_am is null
     and not exists (select 1 from public.verkaufschancen v where v.id = o.verkaufschance_id and v.geloescht_am is null)
  union all
  select null, null, p.id
    from public.projekte p
   where p.geloescht_am is null
     and not exists (select 1 from public.offerten o where o.id = p.offerte_id and o.geloescht_am is null)
     and not exists (select 1 from public.verkaufschancen v where v.id = p.verkaufschance_id and v.geloescht_am is null)
)
select
  coalesce(g.verkaufschance_id, g.offerte_id, g.projekt_id) as id,
  case when g.verkaufschance_id is not null then 'verkaufschancen'
       when g.offerte_id is not null then 'offerten' else 'projekte' end as art,
  g.verkaufschance_id, g.offerte_id, g.projekt_id,
  v.nummer as lead_nummer, o.nummer as offerte_nummer, p.nummer as projekt_nummer,
  k.id as kontakt_id, k.kundennummer, intern.kontaktname(k) as name, k.telefon, k.email, k.sprache, k.werbesperre,
  ob.id as objekt_id, ob.strasse, coalesce(ob.plz, pv.plz) as plz, coalesce(ob.ort, regexp_replace(pv.ort, '\s+\d+$', '')) as ort,
  coalesce(ob.breite, pv.breite) as breite, coalesce(ob.laenge, pv.laenge) as laenge, ob.breite is not null as lage_genau,
  pv.hoehe, pv.kanton,
  st.kuerzel as standort,
  coalesce(v.region_id, ob.region_id) as region_id,
  coalesce(case when g.projekt_id is not null then p.verantwortlich_id end,
           case when g.offerte_id is not null then o.verantwortlich_id end, v.tour_person_id) as person_id,
  v.tour_person_id as termin_person_id,
  v.stufe, v.offerte_status, v.quelle, v.eingang_am, v.termin_am, v.termin_dauer_min,
  v.wiedervorlage_am, v.wiedervorlage_grund, coalesce(o.verlustgrund, v.verlustgrund) as verlustgrund,
  v.erreichbarkeit, v.interesse, v.kommentar_kunde,
  o.status as offerte_stand, o.angebot_am, o.nachfassen_am, o.entscheid, o.vertagt_grund,
  p.status as projekt_status, p.baubeginn,
  coalesce(p.vertragswert_rappen, o.betrag_rappen) as wert_rappen,
  o.leistung_kwp as kwp,
  s.stand, a.reihenfolge as stand_rang, a.eigenschaften ->> 'gruppe' as gruppe,
  coalesce(case when g.projekt_id is not null then coalesce(p.baubeginn, p.unterzeichnet_am, o.angebot_am, p.erstellt_am::date) end,
           case when g.offerte_id is not null then coalesce(o.angebot_am, o.erstellt_am::date) end,
           v.eingang_am, v.erstellt_am::date) as stand_datum,
  (select max(z.zeitpunkt) from public.aktivitaeten z
    where z.geloescht_am is null and z.art <> 'aenderung'
      and (z.verkaufschance_id = g.verkaufschance_id or z.kontakt_id = k.id)) as letzter_kontakt,
  greatest(v.geaendert_am, o.geaendert_am, p.geaendert_am) as geaendert_am,
  lower(concat_ws(' ', intern.kontaktname(k), k.email, ob.strasse, ob.plz, ob.ort, pv.ort, v.nummer, o.nummer, p.nummer,
    'k' || lpad(k.kundennummer::text, 4, '0'))) as suchtext,
  intern.telefon_ziffern(k.telefon) as telefon_ziffern
from g
left join public.verkaufschancen v on v.id = g.verkaufschance_id
left join public.offerten o on o.id = g.offerte_id
left join public.projekte p on p.id = g.projekt_id
join public.kontakte k on k.id = coalesce(v.kontakt_id, o.kontakt_id, p.kontakt_id) and k.geloescht_am is null
left join public.objekte ob on ob.id = coalesce(p.objekt_id, o.objekt_id, v.objekt_id)
left join lateral intern.ort_aus_verzeichnis(ob.plz, ob.ort) pv on true
left join public.standorte st on st.id = coalesce(p.standort_id, v.standort_id,
  (select x.id from public.standorte x where x.kuerzel = public.standort_fuer_plz(coalesce(ob.plz, pv.plz))))
cross join lateral (select case
  when g.projekt_id is not null then intern.stand_projekt(p, coalesce(o.entscheid = 'angenommen', false))
  when g.offerte_id is not null then intern.stand_offerte(o, coalesce(v.offerte_status = 'pruefung', false))
  else intern.stand_verkaufschance(v) end as stand) s
left join public.auswahlwerte a on a.liste = 'kundenstand' and a.schluessel = s.stand;

grant select on public.verkauf_geschaefte to authenticated;
revoke all on public.verkauf_geschaefte from anon;

-- «Zuletzt» in der Kundenliste zählt nur echte Kundenkontakte, keine Systemeinträge (V170).
create or replace view public.kunden_uebersicht with (security_invoker = true) as
select
  k.id, k.kundennummer, k.art, k.kontaktart, k.anrede, k.vorname, k.nachname, k.firma,
  intern.kontaktname(k) as name,
  k.email, k.telefon, k.sprache, k.werbesperre, k.einwilligung, k.notiz,
  k.erstellt_am, k.geaendert_am, k.geloescht_am,
  o.id as objekt_id, o.strasse, o.plz, o.ort,
  (select count(*) from public.objekte x where x.kontakt_id = k.id and x.geloescht_am is null)::int as anzahl_objekte,
  s.stand, s.stand_datum, s.bezug_tabelle as stand_tabelle, s.bezug_id as stand_bezug,
  a.reihenfolge as stand_rang, a.eigenschaften ->> 'gruppe' as stand_gruppe,
  (select max(z.zeitpunkt) from public.aktivitaeten z
    where z.kontakt_id = k.id and z.geloescht_am is null and z.art <> 'aenderung') as letzter_kontakt,
  (select count(*) from public.offerten x where x.kontakt_id = k.id and x.geloescht_am is null)::int as anzahl_offerten,
  (select count(*) from public.projekte x where x.kontakt_id = k.id and x.geloescht_am is null)::int as anzahl_projekte,
  (de.email is not null or dt.ziffern is not null) as moegliche_dublette,
  lower(concat_ws(' ', intern.kontaktname(k), k.firma, k.email, o.strasse, o.plz, o.ort,
    'k' || lpad(k.kundennummer::text, 4, '0'), k.kundennummer::text,
    (select string_agg(x.nummer, ' ') from public.offerten x where x.kontakt_id = k.id and x.geloescht_am is null))) as suchtext,
  intern.telefon_ziffern(k.telefon) as telefon_ziffern
from public.kontakte k
left join lateral (
  select x.id, x.strasse, x.plz, x.ort from public.objekte x
   where x.kontakt_id = k.id and x.geloescht_am is null
   order by x.erstellt_am limit 1
) o on true
left join lateral public.kundenstand(k.id) s on true
left join public.auswahlwerte a on a.liste = 'kundenstand' and a.schluessel = s.stand
left join (
  select lower(x.email) as email from public.kontakte x
   where x.geloescht_am is null and x.email is not null group by 1 having count(*) > 1
) de on de.email = lower(k.email)
left join (
  select intern.telefon_ziffern(x.telefon) as ziffern from public.kontakte x
   where x.geloescht_am is null and length(intern.telefon_ziffern(x.telefon)) >= 9 group by 1 having count(*) > 1
) dt on dt.ziffern = intern.telefon_ziffern(k.telefon);
