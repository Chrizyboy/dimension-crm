-- Phase 9a, Teil 2: Abläufe im Einkauf. Die Regeln liegen hier und nicht in der App (wie Verkauf und Projekte).
-- Fehler kommen als Schlüssel «einkauf.*» zurück und werden in der App übersetzt.

/** Lagerort am Standort des Projekts (heute nur Bulle); ohne Lager dort null = Lieferung auf die Baustelle. */
create or replace function intern.projekt_lagerort(p_projekt uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select lo.id
    from public.projekte pr
    left join public.offerten o on o.id = pr.offerte_id
    left join public.kontakte k on k.id = pr.kontakt_id
    join public.standorte s on s.id = coalesce(pr.standort_id, o.standort_id,
      (select id from public.standorte where kuerzel = case when coalesce(pr.vertrag_sprache, k.sprache) = 'fr' then 'bulle' else 'muri' end))
    join public.lagerorte lo on lo.standort_id = s.id and lo.aktiv and lo.geloescht_am is null
   where pr.id = p_projekt
   order by lo.erstellt_am
   limit 1
$$;

/**
 * Material-Stand im Projekt nachführen (Fahrplan-Schritt «Material»): alles da = «lager»,
 * etwas bestellt oder reserviert = «bestellt». Ohne Materialliste bleibt der Stand von Hand.
 */
create or replace function intern.material_stand_setzen(p_projekt uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_zeilen int;
  v_offen int;
  v_bewegt boolean;
begin
  if p_projekt is null then return; end if;
  select count(*), count(*) filter (where vorhanden < menge) into v_zeilen, v_offen
    from public.projekt_material_stand where projekt_id = p_projekt and menge > 0;
  if v_zeilen = 0 then return; end if;
  v_bewegt := exists (select 1 from public.projekt_material where projekt_id = p_projekt and geloescht_am is null
                         and (reserviert > 0 or entnommen > 0))
           or exists (select 1 from public.bestellungen where projekt_id = p_projekt and geloescht_am is null
                         and status in ('bestellt', 'teilgeliefert', 'geliefert'));
  update public.projekte
     set material_status = case when v_offen = 0 then 'lager' when v_bewegt then 'bestellt' else material_status end
   where id = p_projekt
     and material_status is distinct from case when v_offen = 0 then 'lager' when v_bewegt then 'bestellt' else material_status end;
end
$$;

/** Bestandszeile sperren (oder anlegen) für eine Buchung. */
create or replace function intern.lager_zeile(p_lagerort uuid, p_artikel uuid) returns public.lagerbestand
language plpgsql security invoker set search_path = '' as $$
declare
  z public.lagerbestand;
begin
  insert into public.lagerbestand (lagerort_id, artikel_id) values (p_lagerort, p_artikel)
  on conflict (lagerort_id, artikel_id) do nothing;
  select * into z from public.lagerbestand where lagerort_id = p_lagerort and artikel_id = p_artikel for update;
  if z.geloescht_am is not null then
    update public.lagerbestand set geloescht_am = null where id = z.id returning * into z;
  end if;
  return z;
end
$$;

/**
 * Materialliste eines Projekts vorschlagen, wenn noch keine da ist: aus der Kalkulation der Offerte (ohne
 * Dienstleistungen), sonst aus den Offert-Angaben (Module, Wechselrichter, Batterie). Gibt die Zahl der Zeilen zurück.
 */
create or replace function public.projekt_material_vorschlagen(p_projekt uuid) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  pr public.projekte;
  o public.offerten;
  v_kalk jsonb;
  v_n int := 0;
begin
  select * into pr from public.projekte where id = p_projekt and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'projekt.nicht_gefunden'; end if;
  if exists (select 1 from public.projekt_material where projekt_id = p_projekt and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'einkauf.material_schon_da';
  end if;

  select k.positionen into v_kalk from public.kalkulationen k
   where k.offerte_id = pr.offerte_id and pr.offerte_id is not null and k.geloescht_am is null
   order by k.geaendert_am desc limit 1;
  insert into public.projekt_material (projekt_id, artikel_id, bezeichnung, menge, einheit, quelle, reihenfolge)
  select p_projekt, a.id, coalesce(nullif(x ->> 'name', ''), a.name), (x ->> 'menge')::numeric,
         coalesce(nullif(x ->> 'einheit', ''), a.einheit, 'Stk'), 'kalkulation', i::int * 10
    from jsonb_array_elements(coalesce(v_kalk, '[]')) with ordinality as t (x, i)
    left join public.artikel a on a.id = nullif(x ->> 'artikelId', '')::uuid
   where coalesce(x ->> 'kategorie', '') <> 'dienstleistungen' and coalesce((x ->> 'menge')::numeric, 0) > 0
     and (a.id is not null or coalesce(x ->> 'name', '') <> '');
  get diagnostics v_n = row_count;
  if v_n > 0 then return v_n; end if;

  select * into o from public.offerten where id = pr.offerte_id;
  if coalesce(o.anzahl_module, 0) > 0 then
    insert into public.projekt_material (projekt_id, bezeichnung, menge, quelle, reihenfolge, notiz)
    values (p_projekt, 'PV-Module', o.anzahl_module, 'offerte', 10, 'Modultyp wählen');
    v_n := v_n + 1;
  end if;
  -- Wechselrichter und Batterie stehen in der Offerte als Text: den ähnlichsten Artikel vorschlagen, prüfen bleibt nötig.
  -- Steht bei der Batterie nur eine Zahl (Import aus V233), ist es die Kapazität in kWh.
  insert into public.projekt_material (projekt_id, artikel_id, bezeichnung, menge, quelle, reihenfolge)
  select p_projekt, (select a.id from public.artikel a
                      where a.kategorie = w.kategorie and a.geloescht_am is null and a.archiviert_am is null
                        and public.similarity(lower(a.name), lower(w.text)) > 0.3
                      order by public.similarity(lower(a.name), lower(w.text)) desc limit 1),
         case when w.text ~ '^[0-9.,]+$' then w.name || ' ' || w.text || ' kWh' else w.text end, 1, 'offerte', w.r
    from (values (nullif(trim(o.wechselrichter), ''), 'wechselrichter', 20, 'Wechselrichter'),
                 (nullif(trim(o.batterie), ''), 'batteriespeicher', 30, 'Batterie')) as w (text, kategorie, r, name)
   where w.text is not null;
  get diagnostics v_n = row_count;
  v_n := v_n + case when coalesce(o.anzahl_module, 0) > 0 then 1 else 0 end;
  if v_n = 0 then raise exception using errcode = 'P0001', message = 'einkauf.keine_quelle'; end if;
  return v_n;
end
$$;

/** Günstigster Lieferant für einen Artikel (der bevorzugte, wenn er einen Preis hat). */
create or replace function intern.lieferant_fuer(p_artikel uuid)
returns table (lieferant_id uuid, artikelnummer text, ek_rappen bigint)
language sql stable security invoker set search_path = '' as $$
  select lp.lieferant_id, lp.artikelnummer, lp.ek_rappen
    from public.lieferantenpreise lp
    join public.lieferanten l on l.id = lp.lieferant_id and l.aktiv and l.geloescht_am is null
    join public.artikel a on a.id = lp.artikel_id
   where lp.artikel_id = p_artikel and lp.geloescht_am is null
   order by (lp.lieferant_id = a.bevorzugter_lieferant_id) desc nulls last, lp.ek_rappen nulls last
   limit 1
$$;

/** Position in den Entwurf beim Lieferanten legen (Entwurf wird angelegt, wenn keiner offen ist). */
create or replace function intern.in_entwurf_legen(p_lieferant uuid, p_projekt uuid, p_lagerort uuid, p_material uuid,
  p_artikel uuid, p_bezeichnung text, p_menge numeric, p_einheit text, p_artikelnummer text, p_ek bigint)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from public.bestellungen
   where lieferant_id = p_lieferant and projekt_id is not distinct from p_projekt
     and lagerort_id is not distinct from p_lagerort and status = 'entwurf' and geloescht_am is null
   order by erstellt_am limit 1;
  if v_id is null then
    insert into public.bestellungen (lieferant_id, projekt_id, lagerort_id) values (p_lieferant, p_projekt, p_lagerort)
    returning id into v_id;
  end if;
  insert into public.bestellpositionen (bestellung_id, projekt_material_id, artikel_id, bezeichnung, menge, einheit,
    artikelnummer, ek_rappen, reihenfolge)
  values (v_id, p_material, p_artikel, p_bezeichnung, p_menge, coalesce(p_einheit, 'Stk'), p_artikelnummer, p_ek,
    (select coalesce(max(reihenfolge), 0) + 10 from public.bestellpositionen where bestellung_id = v_id));
  return v_id;
end
$$;

/**
 * Bestellvorschlag für ein Projekt: was fehlt, wird zuerst aus dem freien Lager am Standort reserviert,
 * der Rest kommt als Entwurf zum günstigsten Lieferanten. Nichts geht hinaus, bevor jemand freigibt.
 * Gibt {reserviert, bestellungen, ohne_lieferant} zurück.
 */
create or replace function public.bestellvorschlag(p_projekt uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_lager uuid := intern.projekt_lagerort(p_projekt);
  m record;
  z public.lagerbestand;
  l record;
  v_rest numeric;
  v_nimm numeric;
  v_res int := 0;
  v_ohne int := 0;
  v_best uuid[] := '{}';
  v_id uuid;
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'einkauf.kein_recht'; end if;
  if not exists (select 1 from public.projekte where id = p_projekt and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'projekt.nicht_gefunden';
  end if;
  for m in select * from public.projekt_material_stand
            where projekt_id = p_projekt and fehlt > 0 order by reihenfolge loop
    v_rest := m.fehlt;
    if m.artikel_id is null then v_ohne := v_ohne + 1; continue; end if;
    if v_lager is not null then
      select * into z from public.lagerbestand where lagerort_id = v_lager and artikel_id = m.artikel_id
         and geloescht_am is null for update;
      v_nimm := least(v_rest, greatest(coalesce(z.menge - z.reserviert, 0), 0));
      if v_nimm > 0 then
        update public.lagerbestand set reserviert = reserviert + v_nimm where id = z.id;
        update public.projekt_material set reserviert = reserviert + v_nimm where id = m.id;
        insert into public.lagerbewegungen (lagerort_id, artikel_id, art, menge, projekt_id, person_id)
        values (v_lager, m.artikel_id, 'reservierung', v_nimm, p_projekt, intern.meine_person_id());
        v_rest := v_rest - v_nimm;
        v_res := v_res + 1;
      end if;
    end if;
    if v_rest <= 0 then continue; end if;
    select * into l from intern.lieferant_fuer(m.artikel_id);
    if l.lieferant_id is null then
      select bevorzugter_lieferant_id as lieferant_id, null::text as artikelnummer, null::bigint as ek_rappen into l
        from public.artikel where id = m.artikel_id;
    end if;
    if l.lieferant_id is null then v_ohne := v_ohne + 1; continue; end if;
    v_id := intern.in_entwurf_legen(l.lieferant_id, p_projekt, v_lager, m.id, m.artikel_id, m.bezeichnung, v_rest, m.einheit,
      coalesce(l.artikelnummer, m.artikelnummer), l.ek_rappen);
    if not v_id = any (v_best) then v_best := v_best || v_id; end if;
  end loop;
  perform intern.material_stand_setzen(p_projekt);
  return jsonb_build_object('reserviert', v_res, 'bestellungen', to_jsonb(v_best), 'ohne_lieferant', v_ohne);
end
$$;

/** Lager auffüllen: Artikel unter der Mindestmenge (frei + unterwegs) als Entwürfe ohne Projekt bestellen. */
create or replace function public.lager_nachbestellen(p_lagerort uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  u record;
  l record;
  v_best uuid[] := '{}';
  v_ohne int := 0;
  v_id uuid;
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'einkauf.kein_recht'; end if;
  for u in select * from public.lager_uebersicht
            where lagerort_id = p_lagerort and mindestmenge is not null and frei + unterwegs < mindestmenge loop
    select * into l from intern.lieferant_fuer(u.artikel_id);
    if l.lieferant_id is null then v_ohne := v_ohne + 1; continue; end if;
    v_id := intern.in_entwurf_legen(l.lieferant_id, null, p_lagerort, null, u.artikel_id, u.artikel,
      u.mindestmenge - u.frei - u.unterwegs, u.einheit, coalesce(l.artikelnummer, u.artikelnummer), l.ek_rappen);
    if not v_id = any (v_best) then v_best := v_best || v_id; end if;
  end loop;
  return jsonb_build_object('bestellungen', to_jsonb(v_best), 'ohne_lieferant', v_ohne);
end
$$;
