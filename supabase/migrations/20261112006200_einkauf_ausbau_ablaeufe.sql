-- Einkauf & Material vollständig (Entscheid 0041), Teil 3: Abläufe. Sammelbestellung über Projekte und Lager,
-- Runden auf Verpackungseinheiten, Freigabe mit Grenze, Auftragsbestätigung, Rechnungsabgleich, Meldungen.

/**
 * Position in den Entwurf beim Lieferanten legen. Geht die Ware ans Lager, sammelt EIN Entwurf je Lieferant und
 * Lager alle Projekte (Sammelbestellung, Projekt dann leer); auf die Baustelle bleibt es ein Entwurf je Projekt.
 */
create or replace function intern.in_entwurf_legen(p_lieferant uuid, p_projekt uuid, p_lagerort uuid, p_material uuid,
  p_artikel uuid, p_bezeichnung text, p_menge numeric, p_einheit text, p_artikelnummer text, p_ek bigint)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_projekt uuid;
begin
  select id, projekt_id into v_id, v_projekt from public.bestellungen
   where lieferant_id = p_lieferant and status = 'entwurf' and geloescht_am is null
     and (case when p_lagerort is not null then lagerort_id = p_lagerort
               else lagerort_id is null and projekt_id is not distinct from p_projekt end)
   order by erstellt_am limit 1;
  if v_id is null then
    insert into public.bestellungen (lieferant_id, projekt_id, lagerort_id) values (p_lieferant, p_projekt, p_lagerort)
    returning id into v_id;
  elsif v_projekt is distinct from p_projekt then
    update public.bestellungen set projekt_id = null where id = v_id and projekt_id is not null;
  end if;
  insert into public.bestellpositionen (bestellung_id, projekt_material_id, artikel_id, bezeichnung, menge, einheit,
    artikelnummer, ek_rappen, reihenfolge)
  values (v_id, p_material, p_artikel, p_bezeichnung, p_menge, coalesce(p_einheit, 'Stk'), p_artikelnummer, p_ek,
    (select coalesce(max(reihenfolge), 0) + 10 from public.bestellpositionen where bestellung_id = v_id));
  return v_id;
end
$$;

/**
 * Lager-Entwurf auf Verpackungseinheiten runden: was über den Bedarf hinaus bestellt wird, kommt als eigene
 * Position ohne Projekt dazu und füllt nach dem Eingang das freie Lager. Baustellen-Bestellungen bleiben genau.
 */
create or replace function intern.auf_ve_runden(p_bestellung uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  r record;
  v_rest numeric;
begin
  for r in
    select p.artikel_id, min(p.bezeichnung) as bezeichnung, min(p.einheit) as einheit, min(p.artikelnummer) as artikelnummer,
           min(p.ek_rappen) as ek_rappen, sum(p.menge) as menge, lp.verpackungseinheit as ve
      from public.bestellpositionen p
      join public.bestellungen b on b.id = p.bestellung_id and b.lagerort_id is not null and b.status = 'entwurf'
      join public.lieferantenpreise lp on lp.artikel_id = p.artikel_id and lp.lieferant_id = b.lieferant_id and lp.geloescht_am is null
     where p.bestellung_id = p_bestellung and p.geloescht_am is null and lp.verpackungseinheit > 1
     group by p.artikel_id, lp.verpackungseinheit
  loop
    v_rest := ceil(r.menge / r.ve) * r.ve - r.menge;
    if v_rest > 0 then
      insert into public.bestellpositionen (bestellung_id, artikel_id, bezeichnung, menge, einheit, artikelnummer, ek_rappen, reihenfolge)
      values (p_bestellung, r.artikel_id, r.bezeichnung, v_rest, r.einheit, r.artikelnummer, r.ek_rappen,
              (select coalesce(max(reihenfolge), 0) + 10 from public.bestellpositionen where bestellung_id = p_bestellung));
    end if;
  end loop;
end
$$;

/**
 * Sammelbestellung: den ganzen Bedarf (alle offenen Projekte und das Lager) in Entwürfe legen, auf Wunsch nur für
 * einen Lieferanten. Zuerst wird aus dem freien Lager reserviert, der Rest geht zum günstigsten Lieferanten.
 * Gibt {reserviert, bestellungen, ohne_lieferant} zurück. Nichts geht hinaus, bevor jemand freigibt.
 */
create or replace function public.sammelbestellung(p_lieferant uuid default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  e record;
  z public.lagerbestand;
  v_rest numeric;
  v_nimm numeric;
  v_res int := 0;
  v_ohne int := 0;
  v_best uuid[] := '{}';
  v_id uuid;
  v_projekte uuid[] := '{}';
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'einkauf.kein_recht'; end if;
  for e in select * from public.einkauf_bedarf
            where p_lieferant is null or lieferant_id = p_lieferant or (quelle = 'projekt' and aus_lager > 0)
            order by baubeginn nulls last, projekt_nummer, bezeichnung loop
    v_rest := e.fehlt;
    if e.quelle = 'projekt' and e.aus_lager > 0 then
      select * into z from public.lagerbestand where lagerort_id = e.lagerort_id and artikel_id = e.artikel_id
         and geloescht_am is null for update;
      v_nimm := least(v_rest, greatest(coalesce(z.menge - z.reserviert, 0), 0));
      if v_nimm > 0 then
        update public.lagerbestand set reserviert = reserviert + v_nimm where id = z.id;
        update public.projekt_material set reserviert = reserviert + v_nimm where id = e.material_id;
        insert into public.lagerbewegungen (lagerort_id, artikel_id, art, menge, projekt_id, person_id)
        values (e.lagerort_id, e.artikel_id, 'reservierung', v_nimm, e.projekt_id, intern.meine_person_id());
        v_rest := v_rest - v_nimm;
        v_res := v_res + 1;
      end if;
    end if;
    if e.projekt_id is not null and not e.projekt_id = any (v_projekte) then v_projekte := v_projekte || e.projekt_id; end if;
    continue when v_rest <= 0 or (p_lieferant is not null and e.lieferant_id is distinct from p_lieferant);
    if e.lieferant_id is null then v_ohne := v_ohne + 1; continue; end if;
    v_id := intern.in_entwurf_legen(e.lieferant_id, e.projekt_id, e.lagerort_id, e.material_id, e.artikel_id, e.bezeichnung,
      v_rest, e.einheit, coalesce(e.artikelnummer_lieferant, e.artikelnummer), e.ek_rappen);
    if not v_id = any (v_best) then v_best := v_best || v_id; end if;
  end loop;
  foreach v_id in array v_best loop perform intern.auf_ve_runden(v_id); end loop;
  foreach v_id in array v_projekte loop perform intern.material_stand_setzen(v_id); end loop;
  return jsonb_build_object('reserviert', v_res, 'bestellungen', to_jsonb(v_best), 'ohne_lieferant', v_ohne);
end
$$;

/**
 * Bestellung freigeben (Recht «preise»). Über der Freigabegrenze nur die Personen aus «einkauf.freigabe_durch»
 * (sonst die Administration); wer nicht darf, legt sie mit «bestellung_vorlegen» vor.
 */
create or replace function public.bestellung_freigeben(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  b public.bestellungen;
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'einkauf.kein_recht'; end if;
  select * into b from public.bestellungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'einkauf.nicht_gefunden'; end if;
  if b.status <> 'entwurf' then raise exception using errcode = 'P0001', message = 'einkauf.nicht_entwurf'; end if;
  if not exists (select 1 from public.bestellpositionen where bestellung_id = p_id and geloescht_am is null and menge > 0) then
    raise exception using errcode = 'P0001', message = 'einkauf.keine_positionen';
  end if;
  if not public.einkauf_darf_freigeben(b.total_rappen) then
    raise exception using errcode = 'P0001', message = 'einkauf.freigabe_grenze';
  end if;
  update public.bestellungen set status = 'freigegeben', freigegeben_von = intern.meine_person_id(), freigegeben_am = now()
   where id = p_id;
end
$$;

/** Entwurf über der Grenze zur Freigabe vorlegen: Glocke an die Freigebenden. */
create or replace function public.bestellung_vorlegen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  b public.bestellungen_liste;
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'einkauf.kein_recht'; end if;
  select * into b from public.bestellungen_liste where id = p_id;
  if not found or b.status <> 'entwurf' then raise exception using errcode = 'P0001', message = 'einkauf.nicht_entwurf'; end if;
  update public.bestellungen set vorgelegt_am = now() where id = p_id;
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select x, 'info', 'Bestellung freigeben: ' || b.nummer, 'Valider la commande : ' || b.nummer,
         b.lieferant || ' · CHF ' || to_char(coalesce(b.total_rappen, 0) / 100.0, 'FM999G999G990D00'),
         b.lieferant || ' · CHF ' || to_char(coalesce(b.total_rappen, 0) / 100.0, 'FM999G999G990D00'),
         '/purchasing?bestellung=' || b.id
    from unnest(intern.einkauf_freigeber()) x;
end
$$;

/**
 * Auftragsbestätigung erfassen (p: nummer, datum, termin, total_rappen, positionen [{id, menge, ek_rappen}]).
 * Gibt die Zahl der Abweichungen bei Menge oder Preis zurück; sie bleiben in der Akte markiert.
 */
create or replace function public.bestellung_ab_erfassen(p_id uuid, p jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  b public.bestellungen;
  x jsonb;
  v_ab int := 0;
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'einkauf.kein_recht'; end if;
  select * into b from public.bestellungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'einkauf.nicht_gefunden'; end if;
  if b.status not in ('freigegeben', 'bestellt', 'teilgeliefert', 'geliefert') then
    raise exception using errcode = 'P0001', message = 'einkauf.nicht_bestellt';
  end if;
  for x in select * from jsonb_array_elements(coalesce(p -> 'positionen', '[]')) loop
    update public.bestellpositionen
       set ab_menge = coalesce(nullif(x ->> 'menge', '')::numeric, ab_menge),
           ab_ek_rappen = coalesce(nullif(x ->> 'ek_rappen', '')::bigint, ab_ek_rappen)
     where id = (x ->> 'id')::uuid and bestellung_id = p_id and geloescht_am is null;
  end loop;
  update public.bestellungen
     set ab_nummer = coalesce(nullif(trim(p ->> 'nummer'), ''), ab_nummer),
         ab_am = coalesce(nullif(p ->> 'datum', '')::date, ab_am, current_date),
         ab_termin = coalesce(nullif(p ->> 'termin', '')::date, ab_termin),
         ab_total_rappen = coalesce(nullif(p ->> 'total_rappen', '')::bigint, ab_total_rappen),
         status = case when status = 'freigegeben' then 'bestellt' else status end,
         bestellt_am = coalesce(bestellt_am, current_date)
   where id = p_id;
  select count(*) into v_ab from public.bestellpositionen
   where bestellung_id = p_id and geloescht_am is null
     and ((ab_menge is not null and ab_menge <> menge) or (ab_ek_rappen is not null and ab_ek_rappen is distinct from ek_rappen));
  return v_ab;
end
$$;
