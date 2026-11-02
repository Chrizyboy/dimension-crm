-- Einkauf & Material vollständig (Entscheid 0039), Teil 2: Sichten für Leitstand, Materialplan, Bedarf je Lieferant
-- und Kennzahlen der Lieferanten. Alle Sichten laufen mit den Rechten der aufrufenden Person.

/**
 * Bestellungen wie bisher, dazu: erwarteter Termin (bestätigt, sonst gewünscht, sonst bestellt + Lieferzeit),
 * Schritt im Leitstand, gefährdete Montage, Projekte der Positionen, AB- und Rechnungsangaben.
 * Überfällig richtet sich neu nach dem erwarteten Termin.
 */
create or replace view public.bestellungen_liste with (security_invoker = true) as
with basis as (
  select b.*,
         coalesce(b.ab_termin, b.liefertermin,
                  -- arbeitstage_plus läuft mit null endlos: nur mit Bestelldatum rechnen
                  case when b.bestellt_am is not null then
                    intern.arbeitstage_plus(b.bestellt_am, coalesce(l.lieferzeit_tage, (intern.einkauf_cfg() ->> 'lieferzeit_tage')::int)) end) as erwartet_am,
         (select min(pr2.baubeginn) from public.projekte pr2
           where pr2.geloescht_am is null and pr2.baubeginn >= current_date - 30
             and (pr2.id = b.projekt_id or pr2.id in (
                  select m.projekt_id from public.bestellpositionen p join public.projekt_material m on m.id = p.projekt_material_id
                   where p.bestellung_id = b.id and p.geloescht_am is null))) as baubeginn
    from public.bestellungen b
    join public.lieferanten l on l.id = b.lieferant_id
   where b.geloescht_am is null
)
select b.id, b.nummer, b.status, b.lieferant_id, b.projekt_id, b.lagerort_id, b.liefertermin, b.bestellt_am,
       b.geliefert_am, b.freigegeben_am, b.total_rappen, b.notiz, b.storniert_grund, b.erstellt_am,
       l.name as lieferant, l.email_bestellung, l.sprache as lieferant_sprache, l.kundennummer_bei_lieferant,
       pr.nummer as projekt_nummer, pr.titel as projekt_titel,
       coalesce(nullif(k.firma, ''), concat_ws(' ', k.vorname, k.nachname)) as kunde,
       o.strasse as objekt_strasse, o.plz as objekt_plz, o.ort as objekt_ort,
       lo.name as lagerort, lo.adresse as lagerort_adresse,
       fp.name as freigegeben_von,
       (select count(*) from public.bestellpositionen p where p.bestellung_id = b.id and p.geloescht_am is null) as positionen,
       (select coalesce(sum(p.menge), 0) from public.bestellpositionen p where p.bestellung_id = b.id and p.geloescht_am is null) as menge_total,
       (select coalesce(sum(least(p.geliefert_menge, p.menge)), 0) from public.bestellpositionen p where p.bestellung_id = b.id and p.geloescht_am is null) as menge_geliefert,
       (b.status in ('bestellt', 'teilgeliefert') and b.erwartet_am < current_date) as ueberfaellig,
       (select a.status from public.ausgangskorb a where a.bezug_tabelle = 'bestellungen' and a.bezug_id = b.id
           and a.geloescht_am is null order by a.erstellt_am desc limit 1) as mail_status,
       f.name as firma, f.strasse as firma_strasse, f.plz as firma_plz, f.ort as firma_ort,
       -- neu (Entscheid 0039)
       b.erwartet_am, b.baubeginn, b.ab_nummer, b.ab_am, b.ab_termin, b.ab_total_rappen, b.tracking, b.lieferhinweis,
       b.kontakt_vor_ort, b.nachgefragt_am, b.lieferscheine, b.vorgelegt_am, b.bestellt_von,
       bp.name as bestellt_von_name,
       b.rechnung_kreditor_id, b.rechnung_nummer, b.rechnung_rappen, b.rechnung_geprueft_am, b.rechnung_notiz,
       rp.name as rechnung_geprueft_von,
       case
         when b.status = 'storniert' then 'storniert'
         when b.status in ('entwurf', 'freigegeben') then 'freigabe'
         when b.status = 'bestellt' and b.ab_am is null then 'ab_offen'
         when b.status = 'bestellt' then 'unterwegs'
         when b.status = 'teilgeliefert' then 'eingang'
         when b.rechnung_geprueft_am is null then 'rechnung'
         else 'fertig'
       end as schritt,
       coalesce(b.status in ('entwurf', 'freigegeben', 'bestellt', 'teilgeliefert') and b.baubeginn is not null
         and (coalesce(b.erwartet_am >= b.baubeginn, false)
              or (b.erwartet_am < current_date and b.baubeginn <= current_date + (intern.einkauf_cfg() ->> 'gefahr_tage')::int)
              or (b.status in ('entwurf', 'freigegeben')
                  and intern.arbeitstage_plus(current_date, coalesce(l.lieferzeit_tage, (intern.einkauf_cfg() ->> 'lieferzeit_tage')::int)) >= b.baubeginn)), false)
         as gefaehrdet,
       (select string_agg(distinct pr3.nummer, ', ' order by pr3.nummer) from public.projekte pr3
         where pr3.id = b.projekt_id or pr3.id in (
               select m.projekt_id from public.bestellpositionen p join public.projekt_material m on m.id = p.projekt_material_id
                where p.bestellung_id = b.id and p.geloescht_am is null)) as projekte,
       l.fracht_frei_ab_rappen, l.fracht_rappen, l.mindestbestellwert_rappen, l.bestellweg, l.webshop_url
  from basis b
  join public.lieferanten l on l.id = b.lieferant_id
  left join public.projekte pr on pr.id = b.projekt_id
  left join public.kontakte k on k.id = pr.kontakt_id
  left join public.objekte o on o.id = pr.objekt_id
  left join public.lagerorte lo on lo.id = b.lagerort_id
  left join public.personen fp on fp.id = b.freigegeben_von
  left join public.personen bp on bp.id = b.bestellt_von
  left join public.personen rp on rp.id = b.rechnung_geprueft_von
  left join public.standorte st on st.id = coalesce(lo.standort_id, pr.standort_id,
    (select id from public.standorte where kuerzel = case when l.sprache = 'fr' then 'bulle' else 'muri' end))
  left join public.firmen f on f.id = st.firma_id;

/**
 * Bedarf zum Bestellen: was in den Materiallisten offener Projekte fehlt (abzüglich freiem Lager am Standort)
 * und was im Lager unter die Mindestmenge fällt, je mit dem günstigsten Lieferanten, Preis, VE und Lieferzeit.
 */
create or replace view public.einkauf_bedarf with (security_invoker = true) as
with projekt_bedarf as (
  select 'projekt'::text as quelle, s.projekt_id, s.id as material_id, s.artikel_id, s.bezeichnung, s.einheit,
         s.fehlt, intern.projekt_lagerort(s.projekt_id) as lagerort_id, pr.nummer as projekt_nummer,
         coalesce(nullif(k.firma, ''), concat_ws(' ', k.vorname, k.nachname)) as kunde, pr.baubeginn
    from public.projekt_material_stand s
    join public.projekte pr on pr.id = s.projekt_id and pr.geloescht_am is null and pr.status in ('auftrag', 'im_bau')
    left join public.kontakte k on k.id = pr.kontakt_id
   where s.fehlt > 0
), lager_bedarf as (
  select 'lager'::text, null::uuid, null::uuid, u.artikel_id, u.artikel, u.einheit,
         u.mindestmenge - u.frei - u.unterwegs, u.lagerort_id, null::text, u.lagerort, null::date
    from public.lager_uebersicht u
   where u.mindestmenge is not null and u.frei + u.unterwegs < u.mindestmenge
), alle as (
  select * from projekt_bedarf union all select * from lager_bedarf
)
select a.quelle, a.projekt_id, a.material_id, a.artikel_id, a.bezeichnung, a.einheit, a.fehlt, a.lagerort_id,
       a.projekt_nummer, a.kunde, a.baubeginn,
       case when a.quelle = 'projekt' then least(a.fehlt, greatest(coalesce(lb.menge - lb.reserviert, 0), 0)) else 0 end as aus_lager,
       ar.artikelnummer, lf.lieferant_id, li.name as lieferant, lf.ek_rappen, lf.artikelnummer as artikelnummer_lieferant,
       lp.verpackungseinheit, intern.lieferzeit(lf.lieferant_id, a.artikel_id) as lieferzeit_tage,
       intern.arbeitstage_minus(a.baubeginn, intern.lieferzeit(lf.lieferant_id, a.artikel_id)
                                             + (intern.einkauf_cfg() ->> 'puffer_arbeitstage')::int) as bestellen_bis
  from alle a
  left join public.artikel ar on ar.id = a.artikel_id
  left join public.lagerbestand lb on lb.lagerort_id = a.lagerort_id and lb.artikel_id = a.artikel_id and lb.geloescht_am is null
  left join lateral intern.lieferant_fuer(a.artikel_id) lf on a.artikel_id is not null
  left join public.lieferanten li on li.id = lf.lieferant_id
  left join public.lieferantenpreise lp on lp.artikel_id = a.artikel_id and lp.lieferant_id = lf.lieferant_id and lp.geloescht_am is null;

/**
 * Materialplan: offene Projekte mit Baubeginn, wie weit das Material gedeckt ist, wann es spätestens kommt,
 * bis wann noch bestellt werden muss und ob die Montage gefährdet ist.
 */
create or replace view public.materialplan with (security_invoker = true) as
with m as (
  select s.projekt_id, count(*) as zeilen,
         count(*) filter (where s.vorhanden >= s.menge) as zeilen_da,
         count(*) filter (where s.fehlt > 0) as zeilen_fehlt,
         count(*) filter (where s.unterwegs > 0) as zeilen_unterwegs,
         coalesce(avg(least(s.vorhanden / nullif(s.menge, 0), 1)), 0) as deckung
    from public.projekt_material_stand s where s.menge > 0 group by s.projekt_id
), b as (
  select bl.projekt_id_x as projekt_id, max(bl.erwartet_am) as erwartet_spaetestens, bool_or(bl.ueberfaellig) as ueberfaellig
    from (select coalesce(m2.projekt_id, x.projekt_id) as projekt_id_x, x.erwartet_am, x.ueberfaellig
            from public.bestellungen_liste x
            left join public.bestellpositionen p on p.bestellung_id = x.id and p.geloescht_am is null
            left join public.projekt_material m2 on m2.id = p.projekt_material_id
           where x.status in ('entwurf', 'freigegeben', 'bestellt', 'teilgeliefert')) bl
   where bl.projekt_id_x is not null group by bl.projekt_id_x
)
select pr.id, pr.nummer, pr.titel, pr.status, pr.baubeginn, pr.material_status, pr.standort_id,
       coalesce(nullif(k.firma, ''), concat_ws(' ', k.vorname, k.nachname)) as kunde, o.ort,
       coalesce(m.zeilen, 0) as zeilen, coalesce(m.zeilen_da, 0) as zeilen_da, coalesce(m.zeilen_fehlt, 0) as zeilen_fehlt,
       coalesce(m.zeilen_unterwegs, 0) as zeilen_unterwegs, round(coalesce(m.deckung, 0) * 100)::int as deckung_prozent,
       b.erwartet_spaetestens, coalesce(b.ueberfaellig, false) as ueberfaellig,
       (select min(e.bestellen_bis) from public.einkauf_bedarf e where e.projekt_id = pr.id) as bestellen_bis,
       coalesce(pr.baubeginn is not null and (
          coalesce(b.erwartet_spaetestens >= pr.baubeginn, false)
          or (coalesce(b.ueberfaellig, false) and pr.baubeginn <= current_date + (intern.einkauf_cfg() ->> 'gefahr_tage')::int)
          or (coalesce(m.zeilen_fehlt, 0) > 0
              and (select min(e.bestellen_bis) from public.einkauf_bedarf e where e.projekt_id = pr.id) < current_date)), false) as gefaehrdet
  from public.projekte pr
  left join public.kontakte k on k.id = pr.kontakt_id
  left join public.objekte o on o.id = pr.objekt_id
  left join m on m.projekt_id = pr.id
  left join b on b.projekt_id = pr.id
 where pr.geloescht_am is null and pr.status in ('auftrag', 'im_bau');

/** Kennzahlen je Lieferant: Einkauf im laufenden Jahr, Termintreue, Lieferzeit, offene Bestellungen, Preise. */
create or replace view public.lieferanten_kennzahlen with (security_invoker = true) as
select l.id,
       coalesce(sum(b.total_rappen) filter (where b.bestellt_am >= date_trunc('year', current_date) and b.status <> 'storniert'), 0)::bigint as einkauf_jahr_rappen,
       count(b.id) filter (where b.bestellt_am >= date_trunc('year', current_date) and b.status <> 'storniert') as bestellungen_jahr,
       round(100.0 * count(b.id) filter (where b.geliefert_am is not null and b.geliefert_am <= coalesce(b.ab_termin, b.liefertermin))
             / nullif(count(b.id) filter (where b.geliefert_am is not null and coalesce(b.ab_termin, b.liefertermin) is not null), 0))::int as puenktlich_prozent,
       round(avg(b.geliefert_am - b.bestellt_am) filter (where b.geliefert_am is not null and b.bestellt_am is not null), 1) as lieferzeit_schnitt_tage,
       count(b.id) filter (where b.status in ('entwurf', 'freigegeben', 'bestellt', 'teilgeliefert')) as offen,
       (select count(*) from public.lieferantenpreise lp where lp.lieferant_id = l.id and lp.geloescht_am is null and lp.ek_rappen is not null) as artikel_mit_preis
  from public.lieferanten l
  left join public.bestellungen b on b.lieferant_id = l.id and b.geloescht_am is null
 where l.geloescht_am is null
 group by l.id;

grant select on public.bestellungen_liste, public.einkauf_bedarf, public.materialplan, public.lieferanten_kennzahlen to authenticated;
