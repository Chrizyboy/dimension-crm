-- Phase 9a, Teil 3: Bestellung freigeben, als bestellt melden, stornieren, Wareneingang und Lagerbuchungen.
-- Die Bestell-Mail geht über den Ausgangskorb (Regel 6) und nur für freigegebene Bestellungen hinaus;
-- ist sie gesendet, gilt die Bestellung als bestellt.

/** Bestellung freigeben (Recht «preise»): braucht mindestens eine Position mit Menge. */
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
  update public.bestellungen set status = 'freigegeben', freigegeben_von = intern.meine_person_id(), freigegeben_am = now()
   where id = p_id;
end
$$;

/** Freigabe zurücknehmen, solange keine Bestell-Mail wartet oder gesendet ist. */
create or replace function public.bestellung_zuruecknehmen(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if exists (select 1 from public.ausgangskorb where bezug_tabelle = 'bestellungen' and bezug_id = p_id
                and status <> 'verworfen' and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'einkauf.mail_unterwegs';
  end if;
  update public.bestellungen set status = 'entwurf', freigegeben_von = null, freigegeben_am = null
   where id = p_id and status = 'freigegeben' and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'einkauf.nicht_freigegeben'; end if;
end
$$;

/** Freigegebene Bestellung ohne Mail als bestellt melden (Telefon, Webshop des Lieferanten). */
create or replace function public.bestellung_bestellt(p_id uuid, p_datum date default current_date) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_projekt uuid;
begin
  update public.bestellungen set status = 'bestellt', bestellt_am = coalesce(p_datum, current_date)
   where id = p_id and status = 'freigegeben' and geloescht_am is null
  returning projekt_id into v_projekt;
  if not found then raise exception using errcode = 'P0001', message = 'einkauf.nicht_freigegeben'; end if;
  perform intern.material_stand_setzen(v_projekt);
end
$$;

/** Bestellung stornieren, solange nichts geliefert ist; eine noch wartende Bestell-Mail wird verworfen. */
create or replace function public.bestellung_stornieren(p_id uuid, p_grund text) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  b public.bestellungen;
begin
  select * into b from public.bestellungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'einkauf.nicht_gefunden'; end if;
  if b.status not in ('entwurf', 'freigegeben', 'bestellt')
     or exists (select 1 from public.bestellpositionen where bestellung_id = p_id and geliefert_menge > 0 and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'einkauf.nicht_stornierbar';
  end if;
  if b.status = 'bestellt' and nullif(trim(p_grund), '') is null then
    raise exception using errcode = 'P0001', message = 'einkauf.grund_fehlt';
  end if;
  update public.ausgangskorb set status = 'verworfen', verworfen_grund = 'Bestellung storniert'
   where bezug_tabelle = 'bestellungen' and bezug_id = p_id and status in ('wartet', 'freigegeben', 'fehler');
  update public.bestellungen set status = 'storniert', storniert_grund = nullif(trim(p_grund), '') where id = p_id;
  perform intern.material_stand_setzen(b.projekt_id);
end
$$;

/** Eine Bestell-Mail darf nur für eine freigegebene Bestellung entstehen. */
create or replace function intern.bestell_mail_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.bestellungen where id = new.bezug_id and status = 'freigegeben' and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'einkauf.nicht_freigegeben';
  end if;
  return new;
end
$$;
create trigger bestell_mail before insert on public.ausgangskorb
  for each row when (new.bezug_tabelle = 'bestellungen') execute function intern.bestell_mail_pruefen();

/** Ist die Bestell-Mail gesendet, gilt die Bestellung als bestellt (mit dem Sendedatum). */
create or replace function intern.bestell_mail_gesendet() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_projekt uuid;
begin
  update public.bestellungen set status = 'bestellt', bestellt_am = coalesce(new.gesendet_am::date, current_date)
   where id = new.bezug_id and status = 'freigegeben'
  returning projekt_id into v_projekt;
  if found then perform intern.material_stand_setzen(v_projekt); end if;
  return null;
end
$$;
create trigger bestell_mail_gesendet after update of status on public.ausgangskorb
  for each row when (new.bezug_tabelle = 'bestellungen' and new.status = 'gesendet' and old.status is distinct from 'gesendet')
  execute function intern.bestell_mail_gesendet();

/**
 * Wareneingang (p: positionen [{id, menge}], datum). Geht die Bestellung ans Lager, steigt der Bestand,
 * und Ware für ein Projekt wird dort gleich reserviert. Sonst ist sie direkt auf der Baustelle.
 * Gibt den neuen Stand der Bestellung zurück (teilgeliefert oder geliefert).
 */
create or replace function public.wareneingang_buchen(p_id uuid, p jsonb) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  b public.bestellungen;
  x jsonb;
  pos public.bestellpositionen;
  z public.lagerbestand;
  v_menge numeric;
  v_datum date := coalesce(nullif(p ->> 'datum', '')::date, current_date);
  v_ich uuid := intern.meine_person_id();
  v_n int := 0;
  v_status text;
begin
  select * into b from public.bestellungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'einkauf.nicht_gefunden'; end if;
  if b.status not in ('bestellt', 'teilgeliefert') then raise exception using errcode = 'P0001', message = 'einkauf.nicht_bestellt'; end if;
  for x in select * from jsonb_array_elements(coalesce(p -> 'positionen', '[]')) loop
    v_menge := coalesce(nullif(x ->> 'menge', '')::numeric, 0);
    if v_menge = 0 then continue; end if;
    if v_menge < 0 then raise exception using errcode = 'P0001', message = 'einkauf.menge_ungueltig'; end if;
    update public.bestellpositionen set geliefert_menge = geliefert_menge + v_menge
     where id = (x ->> 'id')::uuid and bestellung_id = p_id and geloescht_am is null
    returning * into pos;
    if not found then raise exception using errcode = 'P0001', message = 'einkauf.position_fehlt'; end if;
    v_n := v_n + 1;
    if b.lagerort_id is null or pos.artikel_id is null then continue; end if;
    z := intern.lager_zeile(b.lagerort_id, pos.artikel_id);
    update public.lagerbestand set menge = menge + v_menge,
      reserviert = reserviert + case when pos.projekt_material_id is not null then v_menge else 0 end
     where id = z.id;
    insert into public.lagerbewegungen (lagerort_id, artikel_id, art, menge, projekt_id, bestellung_id, zeitpunkt, person_id)
    values (b.lagerort_id, pos.artikel_id, 'eingang', v_menge, b.projekt_id, p_id, v_datum, v_ich);
    if pos.projekt_material_id is not null then
      update public.projekt_material set reserviert = reserviert + v_menge where id = pos.projekt_material_id;
      insert into public.lagerbewegungen (lagerort_id, artikel_id, art, menge, projekt_id, bestellung_id, zeitpunkt, person_id)
      values (b.lagerort_id, pos.artikel_id, 'reservierung', v_menge, b.projekt_id, p_id, v_datum, v_ich);
    end if;
  end loop;
  if v_n = 0 then raise exception using errcode = 'P0001', message = 'einkauf.nichts_geliefert'; end if;

  v_status := case when exists (select 1 from public.bestellpositionen where bestellung_id = p_id and geloescht_am is null
                                   and geliefert_menge < menge) then 'teilgeliefert' else 'geliefert' end;
  update public.bestellungen set status = v_status, geliefert_am = case when v_status = 'geliefert' then v_datum end
   where id = p_id;
  perform intern.material_stand_setzen(b.projekt_id);
  return v_status;
end
$$;

/**
 * Lager buchen (p: art, lagerort_id, artikel_id, menge, projekt_material_id, notiz). Arten:
 * eingang (ohne Bestellung), korrektur (+/-), inventur (gezählter Bestand), reservierung und freigabe
 * (für eine Zeile der Materialliste), entnahme (an die Baustelle, zuerst aus der Reservierung des Projekts).
 */
create or replace function public.lager_buchen(p jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_art text := p ->> 'art';
  v_menge numeric := coalesce(nullif(p ->> 'menge', '')::numeric, 0);
  v_artikel uuid := nullif(p ->> 'artikel_id', '')::uuid;
  v_lager uuid := coalesce(nullif(p ->> 'lagerort_id', '')::uuid, (select id from public.lagerorte where aktiv and geloescht_am is null order by erstellt_am limit 1));
  m public.projekt_material;
  z public.lagerbestand;
  v_aus_res numeric := 0;
  v_buchung numeric;
begin
  if v_art not in ('eingang', 'korrektur', 'inventur', 'reservierung', 'freigabe', 'entnahme') then
    raise exception using errcode = 'P0001', message = 'einkauf.art_ungueltig';
  end if;
  if p ? 'projekt_material_id' and nullif(p ->> 'projekt_material_id', '') is not null then
    select * into m from public.projekt_material where id = (p ->> 'projekt_material_id')::uuid and geloescht_am is null for update;
    if not found then raise exception using errcode = 'P0001', message = 'einkauf.material_fehlt'; end if;
    v_artikel := coalesce(v_artikel, m.artikel_id);
    if m.artikel_id is distinct from v_artikel then raise exception using errcode = 'P0001', message = 'einkauf.material_fehlt'; end if;
  elsif v_art in ('reservierung', 'freigabe') then
    raise exception using errcode = 'P0001', message = 'einkauf.material_fehlt';
  end if;
  if v_artikel is null or v_lager is null then raise exception using errcode = 'P0001', message = 'einkauf.artikel_fehlt'; end if;
  if (v_art = 'korrektur' and v_menge = 0) or (v_art = 'inventur' and v_menge < 0)
     or (v_art not in ('korrektur', 'inventur') and v_menge <= 0) then
    raise exception using errcode = 'P0001', message = 'einkauf.menge_ungueltig';
  end if;

  z := intern.lager_zeile(v_lager, v_artikel);
  v_buchung := case v_art when 'inventur' then v_menge - z.menge when 'entnahme' then -v_menge else v_menge end;
  if v_art = 'reservierung' and v_menge > z.menge - z.reserviert then
    raise exception using errcode = 'P0001', message = 'einkauf.lager_zu_wenig';
  end if;
  if v_art = 'freigabe' and v_menge > least(m.reserviert, z.reserviert) then
    raise exception using errcode = 'P0001', message = 'einkauf.mehr_als_reserviert';
  end if;
  if v_art = 'entnahme' then
    v_aus_res := least(v_menge, coalesce(m.reserviert, 0), z.reserviert);
    if v_menge - v_aus_res > z.menge - z.reserviert then raise exception using errcode = 'P0001', message = 'einkauf.lager_zu_wenig'; end if;
  end if;
  if v_art in ('korrektur', 'inventur') and z.menge + v_buchung < z.reserviert then
    raise exception using errcode = 'P0001', message = 'einkauf.unter_reserviert';
  end if;

  update public.lagerbestand set
    menge = menge + case when v_art in ('eingang', 'korrektur', 'inventur', 'entnahme') then v_buchung else 0 end,
    reserviert = reserviert + case v_art when 'reservierung' then v_menge when 'freigabe' then -v_menge
                                         when 'entnahme' then -v_aus_res else 0 end
   where id = z.id;
  if m.id is not null then
    update public.projekt_material set
      reserviert = reserviert + case v_art when 'reservierung' then v_menge when 'freigabe' then -v_menge
                                           when 'entnahme' then -v_aus_res else 0 end,
      entnommen = entnommen + case when v_art = 'entnahme' then v_menge else 0 end
     where id = m.id;
  end if;
  if v_buchung <> 0 or v_art in ('reservierung', 'freigabe') then
    insert into public.lagerbewegungen (lagerort_id, artikel_id, art, menge, projekt_id, person_id, notiz)
    values (v_lager, v_artikel, case when v_art = 'inventur' then 'korrektur' else v_art end, v_buchung, m.projekt_id,
            intern.meine_person_id(),
            nullif(trim(concat_ws(' · ', case when v_art = 'inventur' then 'Inventur' end, nullif(trim(p ->> 'notiz'), ''))), ''));
  end if;
  perform intern.material_stand_setzen(m.projekt_id);
end
$$;

revoke execute on function public.projekt_material_vorschlagen(uuid) from public, anon;
revoke execute on function public.bestellvorschlag(uuid) from public, anon;
revoke execute on function public.lager_nachbestellen(uuid) from public, anon;
revoke execute on function public.bestellung_freigeben(uuid) from public, anon;
revoke execute on function public.bestellung_zuruecknehmen(uuid) from public, anon;
revoke execute on function public.bestellung_bestellt(uuid, date) from public, anon;
revoke execute on function public.bestellung_stornieren(uuid, text) from public, anon;
revoke execute on function public.wareneingang_buchen(uuid, jsonb) from public, anon;
revoke execute on function public.lager_buchen(jsonb) from public, anon;
grant execute on function public.projekt_material_vorschlagen(uuid) to authenticated;
grant execute on function public.bestellvorschlag(uuid) to authenticated;
grant execute on function public.lager_nachbestellen(uuid) to authenticated;
grant execute on function public.bestellung_freigeben(uuid) to authenticated;
grant execute on function public.bestellung_zuruecknehmen(uuid) to authenticated;
grant execute on function public.bestellung_bestellt(uuid, date) to authenticated;
grant execute on function public.bestellung_stornieren(uuid, text) to authenticated;
grant execute on function public.wareneingang_buchen(uuid, jsonb) to authenticated;
grant execute on function public.lager_buchen(jsonb) to authenticated;
