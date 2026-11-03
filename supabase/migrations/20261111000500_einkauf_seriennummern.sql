-- Einkauf (Modul-Prüfung 24A): Seriennummern beim Wareneingang. Sie stehen an der Bestellposition und an der
-- Materialzeile des Projekts; entsteht mit der IBN die Anlage, kommen sie als Komponenten dorthin (für Garantie
-- und Service), ohne Abtippen. Gibt es die Anlage schon, kommen sie sofort dazu.

alter table public.bestellpositionen add column seriennummern text[] not null default '{}';
alter table public.projekt_material add column seriennummern text[] not null default '{}';

/** Komponenten-Einträge aus den Seriennummern des Materials eines Projekts (nur Zeilen mit Seriennummern). */
create or replace function intern.komponenten_aus_material(p_projekt uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'art', coalesce(a.kategorie, 'material'), 'hersteller', coalesce(a.hersteller_gruppe, ''),
           'modell', m.bezeichnung, 'anzahl', cardinality(m.seriennummern),
           'seriennummer', array_to_string(m.seriennummern, ', '), 'garantie_bis', null,
           'quelle', 'wareneingang', 'material_id', m.id) order by m.reihenfolge, m.bezeichnung), '[]')
    from public.projekt_material m left join public.artikel a on a.id = m.artikel_id
   where m.projekt_id = p_projekt and m.geloescht_am is null and cardinality(m.seriennummern) > 0
$$;

/** Komponenten einer Anlage mit den Seriennummern aus dem Wareneingang ergänzen (ersetzt frühere aus dem Wareneingang). */
create or replace function intern.anlage_seriennummern(p_anlage uuid) returns void
language sql security definer set search_path = '' as $$
  update public.anlagen a
     set komponenten = coalesce((select jsonb_agg(k) from jsonb_array_elements(a.komponenten) k
                                  where k ->> 'quelle' is distinct from 'wareneingang'), '[]')
                       || intern.komponenten_aus_material(a.projekt_id)
   where a.id = p_anlage and a.projekt_id is not null
$$;

create or replace function intern.anlage_neu_seriennummern() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.projekt_id is not null then perform intern.anlage_seriennummern(new.id); end if;
  return new;
end
$$;
create trigger seriennummern after insert on public.anlagen
  for each row execute function intern.anlage_neu_seriennummern();

/**
 * Seriennummern zu gelieferten Positionen (p: [{id, seriennummern: [..]}]); ersetzt die bisherigen der Position.
 * Recht wie die Bestellung selbst (Einkaufspreise), darum security invoker.
 */
create or replace function public.seriennummern_erfassen(p_bestellung uuid, p jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  x jsonb;
  pos public.bestellpositionen;
  sn text[];
  n int := 0;
  v_projekt uuid;
begin
  for x in select * from jsonb_array_elements(coalesce(p, '[]')) loop
    sn := array(select distinct trim(s) from jsonb_array_elements_text(coalesce(x -> 'seriennummern', '[]')) s
                 where trim(s) <> '' order by 1);
    update public.bestellpositionen set seriennummern = sn
     where id = (x ->> 'id')::uuid and bestellung_id = p_bestellung and geloescht_am is null
    returning * into pos;
    if not found then raise exception using errcode = 'P0001', message = 'einkauf.position_fehlt'; end if;
    if pos.projekt_material_id is not null then
      update public.projekt_material m
         set seriennummern = array(select distinct s from unnest(
               coalesce((select array_agg(e) from public.bestellpositionen b2, unnest(b2.seriennummern) e
                          where b2.projekt_material_id = m.id and b2.geloescht_am is null), '{}')) s order by 1)
       where m.id = pos.projekt_material_id
      returning projekt_id into v_projekt;
    end if;
    n := n + 1;
  end loop;
  if v_projekt is not null then
    perform intern.anlage_seriennummern(a.id) from public.anlagen a where a.projekt_id = v_projekt and a.geloescht_am is null;
  end if;
  return n;
end
$$;

revoke execute on function intern.komponenten_aus_material(uuid) from public, anon, authenticated;
revoke execute on function intern.anlage_seriennummern(uuid) from public, anon, authenticated;
revoke execute on function intern.anlage_neu_seriennummern() from public, anon, authenticated;
revoke execute on function public.seriennummern_erfassen(uuid, jsonb) from public, anon;
grant execute on function public.seriennummern_erfassen(uuid, jsonb) to authenticated;

-- «AB erhalten»: Bestätigungsdatum in der Liste, damit die Akte es zeigt und die Nachfrage-Automation stoppt.
create or replace view public.bestellungen_liste with (security_invoker = true) as
 SELECT b.id,
    b.nummer,
    b.status,
    b.lieferant_id,
    b.projekt_id,
    b.lagerort_id,
    b.liefertermin,
    b.bestellt_am,
    b.geliefert_am,
    b.freigegeben_am,
    b.total_rappen,
    b.notiz,
    b.storniert_grund,
    b.erstellt_am,
    l.name AS lieferant,
    l.email_bestellung,
    l.sprache AS lieferant_sprache,
    l.kundennummer_bei_lieferant,
    pr.nummer AS projekt_nummer,
    pr.titel AS projekt_titel,
    COALESCE(NULLIF(k.firma, ''::text), concat_ws(' '::text, k.vorname, k.nachname)) AS kunde,
    o.strasse AS objekt_strasse,
    o.plz AS objekt_plz,
    o.ort AS objekt_ort,
    lo.name AS lagerort,
    lo.adresse AS lagerort_adresse,
    fp.name AS freigegeben_von,
    ( SELECT count(*) AS count
           FROM public.bestellpositionen p
          WHERE ((p.bestellung_id = b.id) AND (p.geloescht_am IS NULL))) AS positionen,
    ( SELECT COALESCE(sum(p.menge), (0)::numeric) AS "coalesce"
           FROM public.bestellpositionen p
          WHERE ((p.bestellung_id = b.id) AND (p.geloescht_am IS NULL))) AS menge_total,
    ( SELECT COALESCE(sum(LEAST(p.geliefert_menge, p.menge)), (0)::numeric) AS "coalesce"
           FROM public.bestellpositionen p
          WHERE ((p.bestellung_id = b.id) AND (p.geloescht_am IS NULL))) AS menge_geliefert,
    ((b.status = ANY (ARRAY['bestellt'::text, 'teilgeliefert'::text])) AND (b.liefertermin < CURRENT_DATE)) AS ueberfaellig,
    ( SELECT a.status
           FROM public.ausgangskorb a
          WHERE ((a.bezug_tabelle = 'bestellungen'::text) AND (a.bezug_id = b.id) AND (a.geloescht_am IS NULL))
          ORDER BY a.erstellt_am DESC
         LIMIT 1) AS mail_status,
    f.name AS firma,
    f.strasse AS firma_strasse,
    f.plz AS firma_plz,
    f.ort AS firma_ort,
    b.bestaetigt_am
   FROM ((((((((public.bestellungen b
     JOIN public.lieferanten l ON ((l.id = b.lieferant_id)))
     LEFT JOIN public.projekte pr ON ((pr.id = b.projekt_id)))
     LEFT JOIN public.kontakte k ON ((k.id = pr.kontakt_id)))
     LEFT JOIN public.objekte o ON ((o.id = pr.objekt_id)))
     LEFT JOIN public.lagerorte lo ON ((lo.id = b.lagerort_id)))
     LEFT JOIN public.personen fp ON ((fp.id = b.freigegeben_von)))
     LEFT JOIN public.standorte st ON ((st.id = COALESCE(lo.standort_id, pr.standort_id, ( SELECT standorte.id
           FROM public.standorte
          WHERE (standorte.kuerzel =
                CASE
                    WHEN (l.sprache = 'fr'::text) THEN 'bulle'::text
                    ELSE 'muri'::text
                END))))))
     LEFT JOIN public.firmen f ON ((f.id = st.firma_id)))
  WHERE (b.geloescht_am IS NULL);
