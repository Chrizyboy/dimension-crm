-- Kennzahlen vollständig (02.11.2026, Entscheid 0045): Ziele je Firma und Person, Prognose aus fester Wahrscheinlichkeit
-- je Stand, Durchlaufzeiten, kWp und Produkte, Umsatz aus gestellten Rechnungen, Service und Wartung, Monatsbericht.
-- Wie `kennzahlen_fakten` liefert `kennzahlen_zusatz` Einzelzeilen statt Summen: die App zählt sie und zeigt hinter
-- jeder Zahl genau diese Zeilen. Alles mit den Rechten der lesenden Person (Rechnungen sieht nur, wer sie lesen darf).

-- Einstellungen: Ziele (Rappen, je Jahr), Wahrscheinlichkeit je Stand (Prozent), Richtwerte für «Was auffällt».
-- Die Abwicklung (Migration 20261111001100) hatte ihre Richtwerte flach unter `ziele` (dauer_vertrag_ibn,
-- fristen_ueberfaellig, material_spaet, faelle_dauer): sie wandern nach `richtwerte`, `ziele` hält nur noch Jahre.
update public.einstellungen e
   set wert = jsonb_build_object(
         'wahrscheinlichkeit', '{"offeriert": 35, "nachfassen": 20, "vertagt": 10, "alt": 5}'::jsonb,
         'alt_tage', 90,
         'bericht_gemeldet', null) || e.wert
       || jsonb_build_object(
         'ziele', coalesce((select jsonb_object_agg(j.key, j.value) from jsonb_each(coalesce(e.wert -> 'ziele', '{}')) j
                             where j.key ~ '^\d{4}$'), '{}'),
         'richtwerte', '{"unterschrift_ibn_tage": 90, "reaktion_prozent": 90, "marge_prozent": 30,
                         "fristen_ueberfaellig": 0, "material_spaet": 0, "faelle_dauer": 10}'::jsonb
           || jsonb_strip_nulls(jsonb_build_object(
                'unterschrift_ibn_tage', e.wert -> 'ziele' -> 'dauer_vertrag_ibn',
                'fristen_ueberfaellig', e.wert -> 'ziele' -> 'fristen_ueberfaellig',
                'material_spaet', e.wert -> 'ziele' -> 'material_spaet',
                'faelle_dauer', e.wert -> 'ziele' -> 'faelle_dauer'))
           || coalesce(e.wert -> 'richtwerte', '{}'))
 where e.schluessel = 'kennzahlen';

/**
 * Zusätzliche Einzelfakten im Zeitraum [von, bis]. Spalten wie `kennzahlen_fakten`, dazu `kwp` (Leistung), `tage`
 * (Dauer eines Abschnitts) und `zusatz` (Grund, Produkte, Paket, Komponente, Mahnstufe, Rechnungsart).
 * Schlüssel: auftrag (Offerte → Auftrag, Produkte), dauer_termin (Lead → Termin), dauer_offerte (Termin → Offerte),
 * verlust (Grund), baubeginn und ibn (ab Unterschrift), umsatz, bezahlt, rechnung_offen (aktuell),
 * fall_neu (Komponente, Reaktion ok/spaet/offen), fall_geloest, wartung_aktiv (aktuell), wartung_neu,
 * wartung_gekuendigt, projekt_stand (aktuell, offene Projekte).
 */
create or replace function public.kennzahlen_zusatz(p_von date, p_bis date)
returns table (schluessel text, art text, id uuid, datum date, standort text, person_id uuid,
               betrag_rappen bigint, kwp numeric, tage int, zusatz text, name text, nummer text, ort text)
language plpgsql stable set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'kennzahlen.kein_recht';
  end if;
  return query
  with
  heute as (select (now() at time zone 'Europe/Zurich')::date as d),
  lead as (
    select v.id, coalesce(v.eingang_am, (v.erstellt_am at time zone 'Europe/Zurich')::date) as eingang_am,
           (v.termin_am at time zone 'Europe/Zurich')::date as termin, s.kuerzel as standort, v.tour_person_id as person,
           intern.kontaktname(k) as name, v.nummer, concat_ws(' ', o.plz, o.ort) as ort, v.interesse, v.verlustgrund
      from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
      left join public.objekte o on o.id = v.objekt_id left join public.standorte s on s.id = v.standort_id
     where v.geloescht_am is null),
  off as (
    select o.id, o.angebot_am, o.entscheid_am, o.status, o.betrag_rappen, o.standort, o.verantwortlich_id as person,
           o.name, o.nummer, concat_ws(' ', o.plz, o.ort) as ort, p.unterzeichnet_am, p.vertragswert_rappen,
           x.leistung_kwp, x.batterie, x.verlustgrund, x.verkaufschance_id
      from public.offerten_liste o join public.offerten x on x.id = o.id
      left join public.projekte p on p.id = o.projekt_id and p.geloescht_am is null),
  proj as (
    select p.id, p.status, p.baubeginn, p.unterzeichnet_am, p.vertragswert_rappen, s.kuerzel as standort,
           p.verantwortlich_id as person, coalesce(intern.kontaktname(k), p.titel) as name, p.nummer,
           concat_ws(' ', ob.plz, ob.ort) as ort
      from public.projekte p left join public.kontakte k on k.id = p.kontakt_id
      left join public.objekte ob on ob.id = p.objekt_id left join public.standorte s on s.id = p.standort_id
     where p.geloescht_am is null),
  rech as (
    select r.id, r.status, r.art, r.datum, r.faellig_am, r.bezahlt_am, r.netto_rappen, r.total_rappen,
           coalesce(r.bezahlt_rappen, 0) as bezahlt_rappen, r.mahnstufe, r.nummer, intern.kontaktname(k) as name,
           coalesce(p.standort, (select st.kuerzel from public.standorte st where st.firma_id = r.firma_id
                                  order by st.kuerzel limit 1)) as standort, p.person
      from public.rechnungen r join public.kontakte k on k.id = r.kontakt_id
      left join proj p on p.id = r.projekt_id
     where r.geloescht_am is null and r.status in ('gestellt', 'teilbezahlt', 'bezahlt')),
  fall as (
    select f.id, f.status, f.komponente, f.kategorie, (f.erstellt_am at time zone 'Europe/Zurich')::date as eroeffnet,
           f.erledigt_am, f.reaktion_bis, f.termin_am, f.person_id as person, intern.kontaktname(k) as name, f.nummer,
           f.titel, coalesce(s.kuerzel, (select public.standort_fuer_plz(o.plz) from public.objekte o
                                          where o.kontakt_id = f.kontakt_id and o.geloescht_am is null
                                          order by o.erstellt_am limit 1)) as standort
      from public.service_faelle f join public.kontakte k on k.id = f.kontakt_id
      left join public.projekte p on p.id = f.projekt_id left join public.standorte s on s.id = p.standort_id
     where f.geloescht_am is null),
  wart as (
    select w.id, w.status, w.paket, w.start_am, w.gekuendigt_am, w.preis_netto_rappen, w.nummer, w.anlage_kwp,
           intern.kontaktname(k) as name, w.anlage_ort, public.standort_fuer_plz(o.plz) as standort
      from public.wartungsvertraege w join public.kontakte k on k.id = w.kontakt_id
      left join lateral (select ob.plz from public.objekte ob where ob.kontakt_id = w.kontakt_id
                          and ob.geloescht_am is null order by ob.erstellt_am limit 1) o on true
     where w.geloescht_am is null)
  -- Aufträge mit Leistung, Produkten (aus dem Interesse des Leads und der Batterie der Offerte) und Tagen ab Offerte.
  select 'auftrag'::text, 'offerte'::text, f.id, coalesce(f.unterzeichnet_am, f.entscheid_am, f.angebot_am), f.standort,
         f.person, coalesce(f.vertragswert_rappen, round(f.betrag_rappen * (1 + public.mwst_satz() / 100))::bigint),
         f.leistung_kwp, (coalesce(f.unterzeichnet_am, f.entscheid_am) - f.angebot_am)::int,
         array_to_string(array(select distinct x from unnest(
           coalesce(l.interesse, '{}') || case when coalesce(f.leistung_kwp, 0) > 0 then array['pv'] else '{}' end
           || case when nullif(trim(coalesce(f.batterie, '')), '') is not null then array['batterie'] else '{}' end) x
           order by x), ','),
         f.name, f.nummer, f.ort
    from off f left join lead l on l.id = f.verkaufschance_id
   where f.status = 'angenommen' and coalesce(f.unterzeichnet_am, f.entscheid_am, f.angebot_am) between p_von and p_bis
  union all
  select 'dauer_termin', 'lead', l.id, l.termin, l.standort, l.person, null, null, (l.termin - l.eingang_am)::int,
         null, l.name, l.nummer, l.ort
    from lead l where l.termin between p_von and p_bis and l.termin >= l.eingang_am
  union all
  select 'dauer_offerte', 'offerte', f.id, f.angebot_am, f.standort, f.person, f.betrag_rappen, f.leistung_kwp,
         (f.angebot_am - l.termin)::int, null, f.name, f.nummer, f.ort
    from off f join lead l on l.id = f.verkaufschance_id
   where f.angebot_am between p_von and p_bis and l.termin is not null and f.angebot_am >= l.termin
  union all
  select 'verlust', 'offerte', f.id, coalesce(f.entscheid_am, f.angebot_am), f.standort, f.person, f.betrag_rappen,
         f.leistung_kwp, null, coalesce(nullif(trim(coalesce(f.verlustgrund, l.verlustgrund, '')), ''), 'ohne'),
         f.name, f.nummer, f.ort
    from off f left join lead l on l.id = f.verkaufschance_id
   where f.status in ('verloren', 'archiviert') and coalesce(f.entscheid_am, f.angebot_am) between p_von and p_bis
  -- Abwicklung: Baubeginn und Inbetriebnahme mit Tagen ab Unterschrift, IBN mit installierter Leistung.
  union all
  select 'baubeginn', 'projekt', p.id, p.baubeginn, p.standort, p.person, p.vertragswert_rappen, null,
         (p.baubeginn - p.unterzeichnet_am)::int, p.status, p.name, p.nummer, p.ort
    from proj p where p.baubeginn between p_von and p_bis
  union all
  select 'ibn', 'projekt', p.id, a.ibn_am, p.standort, p.person, p.vertragswert_rappen, a.leistung_kwp,
         (a.ibn_am - p.unterzeichnet_am)::int, p.status, p.name, p.nummer, p.ort
    from public.anlagen a join proj p on p.id = a.projekt_id
   where a.geloescht_am is null and a.ibn_am between p_von and p_bis
  union all
  select 'projekt_stand', 'projekt', p.id, p.unterzeichnet_am, p.standort, p.person, p.vertragswert_rappen, null,
         ((select d from heute) - p.unterzeichnet_am)::int, p.status, p.name, p.nummer, p.ort
    from proj p where p.status in ('auftrag', 'im_bau')
  -- Finanzen (gestellte Rechnungen, exkl. MWST; Zahlungen inkl.; offen = Rest des Totals).
  union all
  select 'umsatz', 'rechnung', r.id, r.datum, r.standort, r.person, r.netto_rappen, null, null, r.art, r.name,
         r.nummer, null
    from rech r where r.datum between p_von and p_bis
  union all
  select 'bezahlt', 'rechnung', r.id, r.bezahlt_am, r.standort, r.person, r.bezahlt_rappen, null,
         (r.bezahlt_am - r.datum)::int, r.art, r.name, r.nummer, null
    from rech r where r.status = 'bezahlt' and r.bezahlt_am between p_von and p_bis
  union all
  select 'rechnung_offen', 'rechnung', r.id, r.faellig_am, r.standort, r.person,
         greatest(r.total_rappen - r.bezahlt_rappen, 0), null, ((select d from heute) - r.faellig_am)::int,
         coalesce(r.mahnstufe, 0)::text, r.name, r.nummer, null
    from rech r where r.status in ('gestellt', 'teilbezahlt')
  -- Service: Reaktion eingehalten, wenn Termin oder Erledigung innerhalb der Reaktionszeit liegt.
  union all
  select 'fall_neu', 'fall', f.id, f.eroeffnet, f.standort, f.person, null, null, null,
         concat_ws('|', coalesce(nullif(f.komponente, ''), 'ohne'),
                   case when f.reaktion_bis is null then 'ohne'
                        when least(f.termin_am, f.erledigt_am::timestamptz) <= f.reaktion_bis then 'ok'
                        when f.reaktion_bis < now() then 'spaet' else 'offen' end),
         f.name, f.nummer, f.titel
    from fall f where f.eroeffnet between p_von and p_bis
  union all
  select 'fall_geloest', 'fall', f.id, f.erledigt_am, f.standort, f.person, null, null, (f.erledigt_am - f.eroeffnet)::int,
         coalesce(nullif(f.komponente, ''), 'ohne'), f.name, f.nummer, f.titel
    from fall f where f.status = 'erledigt' and f.erledigt_am between p_von and p_bis
  -- Wartungsverträge: Preis pro Jahr exkl. MWST.
  union all
  select 'wartung_aktiv', 'wartung', w.id, w.start_am, w.standort, null, w.preis_netto_rappen, w.anlage_kwp, null,
         coalesce(w.paket, 'ohne'), w.name, w.nummer, w.anlage_ort
    from wart w where w.status = 'aktiv'
  union all
  select 'wartung_neu', 'wartung', w.id, w.start_am, w.standort, null, w.preis_netto_rappen, w.anlage_kwp, null,
         coalesce(w.paket, 'ohne'), w.name, w.nummer, w.anlage_ort
    from wart w where w.start_am between p_von and p_bis
  union all
  select 'wartung_gekuendigt', 'wartung', w.id, w.gekuendigt_am::date, w.standort, null, w.preis_netto_rappen,
         w.anlage_kwp, null, coalesce(w.paket, 'ohne'), w.name, w.nummer, w.anlage_ort
    from wart w where w.gekuendigt_am::date between p_von and p_bis;
end
$$;
revoke execute on function public.kennzahlen_zusatz(date, date) from public, anon;
grant execute on function public.kennzahlen_zusatz(date, date) to authenticated;

/**
 * Ziele, Wahrscheinlichkeiten und Richtwerte der Kennzahlen ändern (Geschäftsleitung, Recht «finanzen»).
 * Erlaubte Schlüssel: ziele {"2026": {"gesamt", "muri", "bulle", "umsatz", "personen": {id: rappen}}},
 * wahrscheinlichkeit {offeriert, nachfassen, vertagt, alt} in Prozent, alt_tage, richtwerte.
 */
create or replace function public.kennzahlen_einstellungen_setzen(p_wert jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  k text;
  w jsonb;
begin
  if not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'kennzahlen.kein_recht';
  end if;
  for k in select jsonb_object_keys(p_wert) loop
    if k not in ('ziele', 'wahrscheinlichkeit', 'alt_tage', 'richtwerte') then
      raise exception using errcode = 'P0001', message = 'kennzahlen.schluessel_ungueltig';
    end if;
  end loop;
  -- Prozentwerte 0–100, Beträge nicht negativ: sonst rechnet die Prognose Unsinn.
  for k, w in select * from jsonb_each(coalesce(p_wert -> 'wahrscheinlichkeit', '{}')) loop
    if jsonb_typeof(w) <> 'number' or (w #>> '{}')::numeric not between 0 and 100 then
      raise exception using errcode = 'P0001', message = 'kennzahlen.wert_ungueltig';
    end if;
  end loop;
  if exists (select 1 from jsonb_each(coalesce(p_wert -> 'ziele', '{}')) j, jsonb_each(j.value) z
              where z.key <> 'personen' and z.value <> 'null'::jsonb
                and (jsonb_typeof(z.value) <> 'number' or (z.value #>> '{}')::numeric < 0))
     or exists (select 1 from jsonb_each(coalesce(p_wert -> 'ziele', '{}')) j,
                       jsonb_each(coalesce(j.value -> 'personen', '{}')) z
                 where jsonb_typeof(z.value) <> 'number' or (z.value #>> '{}')::numeric < 0) then
    raise exception using errcode = 'P0001', message = 'kennzahlen.wert_ungueltig';
  end if;
  update public.einstellungen e
     set wert = e.wert || p_wert
                       || case when p_wert ? 'ziele'
                               then jsonb_build_object('ziele', coalesce(e.wert -> 'ziele', '{}') || (p_wert -> 'ziele'))
                               else '{}' end
   where e.schluessel = 'kennzahlen'
  returning e.wert into w;
  return w;
end
$$;
revoke execute on function public.kennzahlen_einstellungen_setzen(jsonb) from public, anon;
grant execute on function public.kennzahlen_einstellungen_setzen(jsonb) to authenticated;

/**
 * Monatsbericht (Chris 2.11.2026, K4 A): am 1. eines Monats eine Glocke für alle mit Recht «finanzen» (ohne den
 * reinen Administrations-Zusatz); der Klick öffnet die Kennzahlen des Vormonats und erstellt das PDF.
 * Einmal pro Monat (`bericht_gemeldet`), vom Zeitplan stündlich aufgerufen. Gibt die Anzahl Glocken zurück.
 */
create or replace function public.kennzahlen_monatsbericht_melden() returns int
language plpgsql security definer set search_path = '' as $$
declare
  heute date := (now() at time zone 'Europe/Zurich')::date;
  monat text := to_char(heute - 1, 'YYYY-MM');
  titel_fr text;
  n int;
begin
  if extract(day from heute) <> 1
     or (select wert ->> 'bericht_gemeldet' from public.einstellungen where schluessel = 'kennzahlen') = monat then
    return 0;
  end if;
  titel_fr := 'Rapport mensuel ' || to_char(heute - 1, 'MM.YYYY') || ' prêt';
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select p.id, 'info', 'Monatsbericht ' || to_char(heute - 1, 'MM.YYYY') || ' bereit', titel_fr,
         'Kennzahlen des Vormonats mit Vorjahr und Ziel, als PDF.', 'Indicateurs du mois passé, avec l’an passé et l’objectif, en PDF.',
         '/dashboard?reiter=ueberblick&bericht=' || monat
    from public.personen p left join public.rollen r on r.schluessel = p.rolle and r.aktiv and r.geloescht_am is null
   where p.aktiv and p.geloescht_am is null and 'finanzen' = any (p.rechte || coalesce(r.rechte, '{}'));
  get diagnostics n = row_count;
  update public.einstellungen set wert = wert || jsonb_build_object('bericht_gemeldet', monat) where schluessel = 'kennzahlen';
  return n;
end
$$;
revoke execute on function public.kennzahlen_monatsbericht_melden() from public, anon, authenticated;
grant execute on function public.kennzahlen_monatsbericht_melden() to service_role;
