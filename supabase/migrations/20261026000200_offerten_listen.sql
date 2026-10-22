-- Phase 7, Teil 2: Lese-Sichten für die Offerten-Listen. Sie rechnen Stand und Nachfass-Datum
-- an einer Stelle aus, damit Liste, Nachfassen, Mein Tag (Phase 14) und Berichte dasselbe zeigen.
-- security_invoker: es gelten die Rechte der angemeldeten Person.

/** Offerten Muri / Bulle und Nachfassen (V45, V185, V193). */
create or replace view public.offerten_liste with (security_invoker = true) as
select
  o.id, o.nummer, o.titel, o.status, o.sprache, o.angebot_am, o.angebot_am_frueher, o.betrag_rappen,
  o.leistung_kwp, o.anzahl_module, o.wechselrichter, o.batterie, o.entscheid, o.entscheid_am, o.vertagt_grund,
  o.verlustgrund, o.nachfassen_am, o.verantwortlich_id, o.eturnity_id, o.versionen, o.wirtschaftlichkeit,
  o.zurueckgegeben, o.verkaufschance_id, o.objekt_id, o.erstellt_am, o.geaendert_am,
  jsonb_array_length(o.versionen) as anzahl_versionen,
  st.kuerzel as standort, o.standort_id,
  k.id as kontakt_id, k.kundennummer, intern.kontaktname(k) as name, k.telefon, k.email,
  coalesce(ob.plz, pv.plz) as plz,
  coalesce(ob.ort, regexp_replace(pv.ort, '\s+\d+$', '')) as ort,
  ob.strasse,
  pe.name as verantwortlich_name,
  intern.stand_offerte(o, coalesce(v.offerte_status = 'pruefung', false)) as stand,
  -- Fällig zum Nachfassen: 14 Tage nach dem Angebot oder am vertagten Datum.
  case when o.status = 'offeriert' then coalesce(o.nachfassen_am, o.angebot_am + intern.nachfassen_tage()) end as faellig_am,
  -- V185: Was noch in «Neue Offerten» liegt, erscheint nicht in den Listen Muri/Bulle.
  coalesce(v.stufe = 'zur_offerte', false) as im_eingang,
  pr.id as projekt_id, pr.nummer as projekt_nummer,
  wv.id as werkvertrag_id, wv.status as werkvertrag_status,
  lower(concat_ws(' ', o.nummer, intern.kontaktname(k), k.email, ob.strasse, ob.plz, ob.ort, pv.ort, o.titel,
                  'k' || lpad(k.kundennummer::text, 4, '0'))) as suchtext
from public.offerten o
join public.kontakte k on k.id = o.kontakt_id and k.geloescht_am is null
left join public.objekte ob on ob.id = o.objekt_id
left join lateral intern.ort_aus_verzeichnis(ob.plz, ob.ort) pv on true
left join public.standorte st on st.id = o.standort_id
left join public.verkaufschancen v on v.id = o.verkaufschance_id and v.geloescht_am is null
left join public.personen pe on pe.id = o.verantwortlich_id
left join lateral (select x.id, x.nummer from public.projekte x
                    where x.offerte_id = o.id and x.geloescht_am is null order by x.erstellt_am desc limit 1) pr on true
left join lateral (select x.id, x.status from public.werkvertraege x
                    where x.offerte_id = o.id and x.geloescht_am is null and x.status <> 'storniert'
                    order by x.erstellt_am desc limit 1) wv on true
where o.geloescht_am is null;
grant select on public.offerten_liste to authenticated;

/** «Neue Offerten» für den Innendienst (V72, V76, V84): Leads, die zur Offerte gegeben wurden. */
create or replace view public.offerten_eingang with (security_invoker = true) as
select
  v.id, v.nummer as lead_nummer, v.kontakt_id, intern.kontaktname(k) as name, k.kundennummer, k.telefon,
  coalesce(ob.plz, pv.plz) as plz,
  coalesce(ob.ort, regexp_replace(pv.ort, '\s+\d+$', '')) as ort,
  ob.strasse,
  coalesce(st.kuerzel, (select x.kuerzel from public.standorte x where x.kuerzel = public.standort_fuer_plz(coalesce(ob.plz, pv.plz)))) as standort,
  coalesce(st.sprache, k.sprache) as sprache,
  v.termin_am, v.tour_person_id, tp.name as termin_person_name,
  -- Richtofferte: ohne Vor-Ort-Termin (V200).
  (v.termin_am is null or v.offerte_hinweis = 'Richtofferte') as richtofferte,
  v.zur_offerte_am, coalesce(v.offerte_status, 'neu') as offerte_status,
  v.offerte_von, v.offerte_seit,
  v.offerte_hinweis, v.offerte_hinweis_von, v.offerte_rueckfrage,
  v.interesse, v.kommentar_kunde, v.notiz_intern,
  o.id as offerte_id, o.nummer as offerte_nummer, o.betrag_rappen, o.leistung_kwp,
  lower(concat_ws(' ', v.nummer, intern.kontaktname(k), ob.strasse, ob.plz, ob.ort, pv.ort, o.nummer)) as suchtext
from public.verkaufschancen v
join public.kontakte k on k.id = v.kontakt_id and k.geloescht_am is null
left join public.objekte ob on ob.id = v.objekt_id
left join lateral intern.ort_aus_verzeichnis(ob.plz, ob.ort) pv on true
left join public.standorte st on st.id = v.standort_id
left join public.personen tp on tp.id = v.tour_person_id
left join lateral (select x.id, x.nummer, x.betrag_rappen, x.leistung_kwp from public.offerten x
                    where x.verkaufschance_id = v.id and x.geloescht_am is null order by x.erstellt_am desc limit 1) o on true
where v.geloescht_am is null and v.stufe = 'zur_offerte';
grant select on public.offerten_eingang to authenticated;
