-- Phase 10, Teil 2: Abläufe der Rechnungen in der Datenbank (Entscheid 0021).
-- Entwurf aus Zahlungsplan, Projekt (Prozent oder Schluss), Service-Rapport, Wartungsvertrag oder frei;
-- Stellen (Nummer R2026-17 wie V233), Stornieren, Mahnen, Abgleich mit AbaNinja und Nachkalkulation.

/** Einstellungen der Finanzen (Stundensätze, Mahnfrist, Kategorien). */
create or replace function intern.fin_cfg() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select wert from public.einstellungen where schluessel = 'finanzen' and geloescht_am is null), '{}')
$$;

/** Rechnende Firma: Werkvertrag, sonst Standort des Projekts, sonst nach Sprache (fr = Sàrl Bulle). */
create or replace function intern.firma_fuer(p_projekt uuid, p_sprache text) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select w.firma_id from public.werkvertraege w where w.projekt_id = p_projekt and w.geloescht_am is null
        and w.status <> 'storniert' and w.firma_id is not null order by w.erstellt_am desc limit 1),
    (select s.firma_id from public.projekte p join public.standorte s on s.id = p.standort_id where p.id = p_projekt),
    (select id from public.firmen where kuerzel = case when p_sprache = 'fr' then 'sarl' else 'gmbh' end),
    (select id from public.firmen order by kuerzel limit 1))
$$;

/** Bestätigte, noch nicht verrechnete Nachträge als Positionen (Nachträge sind exkl. MWST). */
create or replace function intern.nachtrag_positionen(p_projekt uuid, p_rapport uuid, p_inkl boolean, p_satz numeric)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'text', 'Nachtrag ' || n.nummer || ': ' || coalesce(n.beschreibung, ''), 'menge', 1, 'einheit', 'pauschal',
           'preis_rappen', case when p_inkl then round(n.betrag_rappen * (1 + p_satz / 100)) else n.betrag_rappen end,
           'bezug', 'nachtrag', 'bezug_id', n.id) order by n.nummer), '[]')
    from public.nachtraege n
   where n.geloescht_am is null and n.status = 'vom_kunden_bestaetigt' and coalesce(n.betrag_rappen, 0) <> 0
     and ((p_projekt is not null and n.projekt_id = p_projekt) or (p_rapport is not null and n.rapport_id = p_rapport))
$$;

/**
 * Rechnungsentwurf anlegen. p: zahlungsplan_id | rapport_id | wartungsvertrag_id | projekt_id mit art
 * (anzahlung, teilzahlung, schluss) und prozent | kontakt_id mit art frei. Gibt die ID zurück; gibt es zur
 * Tranche schon einen Entwurf, kommt dieser zurück.
 */
create or replace function public.rechnung_entwurf(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_zp public.zahlungsplan;
  v_pr public.projekte;
  v_ra public.rapporte;
  v_wv public.wartungsvertraege;
  v_art text := nullif(p ->> 'art', '');
  v_kontakt uuid := nullif(p ->> 'kontakt_id', '')::uuid;
  v_projekt uuid := nullif(p ->> 'projekt_id', '')::uuid;
  v_satz numeric := public.mwst_satz();
  v_inkl boolean := false;
  v_pos jsonb := '[]';
  v_titel text;
  v_sprache text;
  v_cfg jsonb := intern.fin_cfg();
  v_id uuid;
  v_rest int;
  v_prozent numeric := nullif(p ->> 'prozent', '')::numeric;
  v_stunden numeric;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;

  if nullif(p ->> 'zahlungsplan_id', '') is not null then
    select * into v_zp from public.zahlungsplan where id = (p ->> 'zahlungsplan_id')::uuid and geloescht_am is null;
    if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
    select id into v_id from public.rechnungen
     where zahlungsplan_id = v_zp.id and geloescht_am is null and status <> 'storniert' order by erstellt_am desc limit 1;
    if v_id is not null then
      if (select status from public.rechnungen where id = v_id) = 'entwurf' then return v_id; end if;
      raise exception using errcode = 'P0001', message = 'finanzen.schon_verrechnet';
    end if;
    v_projekt := v_zp.projekt_id;
    -- Erste Tranche = Anzahlung, letzte noch offene = Schluss (mit den bestätigten Nachträgen).
    select count(*) into v_rest from public.zahlungsplan z
     where z.projekt_id = v_projekt and z.geloescht_am is null and z.id <> v_zp.id
       and not exists (select 1 from public.rechnungen r where r.zahlungsplan_id = z.id and r.geloescht_am is null
                                                       and r.status <> 'storniert');
    v_art := case
      when v_rest = 0 and (select count(*) from public.zahlungsplan where projekt_id = v_projekt and geloescht_am is null) > 1 then 'schluss'
      when not exists (select 1 from public.rechnungen r where r.projekt_id = v_projekt and r.geloescht_am is null
                         and r.status <> 'storniert') then 'anzahlung'
      else 'teilzahlung' end;
    v_inkl := true;
    v_pos := jsonb_build_array(jsonb_build_object('text', v_zp.bezeichnung, 'menge', 1, 'einheit', 'pauschal',
                                                  'preis_rappen', v_zp.betrag_rappen, 'bezug', 'tranche', 'bezug_id', v_zp.id));
    if v_art = 'schluss' then v_pos := v_pos || intern.nachtrag_positionen(v_projekt, null, true, v_satz); end if;

  elsif nullif(p ->> 'rapport_id', '') is not null then
    select * into v_ra from public.rapporte where id = (p ->> 'rapport_id')::uuid and geloescht_am is null;
    if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
    if v_ra.verrechnung in ('garantie', 'kulanz', 'vertrag') then
      raise exception using errcode = 'P0001', message = 'finanzen.rapport_nicht_verrechenbar';
    end if;
    select id into v_id from public.rechnungen where rapport_id = v_ra.id and geloescht_am is null and status <> 'storniert' limit 1;
    if v_id is not null then
      if (select status from public.rechnungen where id = v_id) = 'entwurf' then return v_id; end if;
      raise exception using errcode = 'P0001', message = 'finanzen.schon_verrechnet';
    end if;
    v_art := case when v_ra.art = 'wartung' then 'wartung' else 'service' end;
    v_projekt := v_ra.projekt_id;
    select coalesce(v_kontakt, f.kontakt_id, pp.kontakt_id) into v_kontakt
      from (select 1) x left join public.service_faelle f on f.id = v_ra.service_fall_id
      left join public.projekte pp on pp.id = coalesce(v_ra.projekt_id, f.projekt_id);
    if v_kontakt is null then
      select w.kontakt_id into v_kontakt from public.wartungsvertraege w where w.id = v_ra.wartungsvertrag_id;
    end if;
    -- Arbeit: erfasste Zeiten des Rapports (Stunden auf Viertelstunden gerundet) zum Service-Stundensatz.
    select (round(coalesce(sum(extract(epoch from (z.stopp - z.start)) / 3600 - coalesce(z.pause_min, 0) / 60.0), 0) * 4) / 4)::numeric(8, 2)
      into v_stunden from public.zeiten z where z.rapport_id = v_ra.id and z.stopp is not null and z.geloescht_am is null;
    if v_stunden > 0 then
      v_pos := v_pos || jsonb_build_array(jsonb_build_object(
        'text', 'Arbeit Rapport ' || v_ra.nummer || ' vom ' || to_char(v_ra.datum, 'DD.MM.YYYY'), 'menge', v_stunden,
        'einheit', 'h', 'preis_rappen', coalesce((v_cfg ->> 'service_stundensatz_rappen')::bigint, 12000),
        'bezug', 'zeit', 'bezug_id', v_ra.id));
    end if;
    v_pos := v_pos || coalesce((
      select jsonb_agg(jsonb_build_object('text', coalesce(a.name, m ->> 'bezeichnung', ''),
                                          'menge', coalesce((m ->> 'menge')::numeric, 1),
                                          'einheit', coalesce(m ->> 'einheit', a.einheit, 'Stk'),
                                          'preis_rappen', coalesce(a.verkauf_rappen, 0),
                                          'bezug', 'material', 'bezug_id', a.id))
        from jsonb_array_elements(v_ra.material) m
        left join public.artikel a on a.id = nullif(m ->> 'artikel_id', '')::uuid), '[]');
    v_pos := v_pos || intern.nachtrag_positionen(null, v_ra.id, false, v_satz);

  elsif nullif(p ->> 'wartungsvertrag_id', '') is not null then
    select * into v_wv from public.wartungsvertraege where id = (p ->> 'wartungsvertrag_id')::uuid and geloescht_am is null;
    if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
    v_art := 'wartung';
    v_kontakt := coalesce(v_kontakt, v_wv.kontakt_id);
    v_projekt := v_wv.projekt_id;
    v_inkl := true;  -- Preis des Vertrags ist inkl. MWST
    v_pos := jsonb_build_array(jsonb_build_object(
      'text', 'Wartungsvertrag ' || coalesce(v_wv.nummer, '') || ', ' || extract(year from current_date)::text,
      'menge', 1, 'einheit', 'Jahr', 'preis_rappen', coalesce(v_wv.preis_rappen, 0), 'bezug', 'wartung', 'bezug_id', v_wv.id));

  elsif v_projekt is not null then
    select * into v_pr from public.projekte where id = v_projekt and geloescht_am is null;
    if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
    v_art := coalesce(v_art, 'teilzahlung');
    v_inkl := true;
    if v_art = 'schluss' and v_prozent is null then
      -- Schlussrechnung: Vertragswert abzüglich gestellter Rechnungen, dazu bestätigte Nachträge.
      v_pos := jsonb_build_array(jsonb_build_object('text', 'Vertragswert', 'menge', 1, 'einheit', 'pauschal',
                                                    'preis_rappen', coalesce(v_pr.vertragswert_rappen, 0)))
        || coalesce((select jsonb_agg(jsonb_build_object('text', 'Abzüglich Rechnung ' || r.nummer || ' vom ' || to_char(r.datum, 'DD.MM.YYYY'),
                                                        'menge', 1, 'einheit', 'pauschal', 'preis_rappen', -r.total_rappen,
                                                        'bezug', 'rechnung', 'bezug_id', r.id) order by r.datum)
                       from public.rechnungen r where r.projekt_id = v_projekt and r.geloescht_am is null
                        and r.status not in ('entwurf', 'storniert') and r.art in ('anzahlung', 'teilzahlung')), '[]')
        || intern.nachtrag_positionen(v_projekt, null, true, v_satz);
    else
      if v_prozent is null or v_prozent <= 0 or v_prozent > 100 then
        raise exception using errcode = 'P0001', message = 'finanzen.prozent_fehlt';
      end if;
      v_pos := jsonb_build_array(jsonb_build_object(
        'text', trim(to_char(v_prozent, 'FM990.##')) || ' % des Vertragswerts', 'menge', 1, 'einheit', 'pauschal',
        'preis_rappen', public.runde_5_rappen(coalesce(v_pr.vertragswert_rappen, 0) * v_prozent / 100)));
    end if;

  else
    v_art := 'frei';
    if v_kontakt is null then raise exception using errcode = 'P0001', message = 'finanzen.kontakt_fehlt'; end if;
    v_inkl := coalesce((p ->> 'inkl_mwst')::boolean, false);
  end if;

  if v_projekt is not null then
    select * into v_pr from public.projekte where id = v_projekt;
    v_kontakt := coalesce(v_kontakt, v_pr.kontakt_id);
  end if;
  if v_kontakt is null then raise exception using errcode = 'P0001', message = 'finanzen.kontakt_fehlt'; end if;
  select coalesce(nullif(p ->> 'sprache', ''), v_pr.vertrag_sprache, k.sprache, 'de') into v_sprache
    from public.kontakte k where k.id = v_kontakt;
  v_titel := coalesce(nullif(trim(p ->> 'titel'), ''),
    case v_art when 'anzahlung' then case v_sprache when 'fr' then 'Facture d''acompte' else 'Anzahlungsrechnung' end
               when 'teilzahlung' then case v_sprache when 'fr' then 'Facture partielle' else 'Teilrechnung' end
               when 'schluss' then case v_sprache when 'fr' then 'Facture finale' else 'Schlussrechnung' end
               when 'service' then case v_sprache when 'fr' then 'Facture de service' else 'Service-Rechnung' end
               when 'wartung' then case v_sprache when 'fr' then 'Facture d''entretien' else 'Wartungsrechnung' end
               else case v_sprache when 'fr' then 'Facture' else 'Rechnung' end end
    || coalesce(' ' || v_pr.nummer, ''));

  insert into public.rechnungen (art, kontakt_id, projekt_id, zahlungsplan_id, rapport_id, service_fall_id,
                                 wartungsvertrag_id, firma_id, sprache, titel, inkl_mwst, mwst_satz, positionen, notiz)
  values (v_art, v_kontakt, v_projekt, v_zp.id, v_ra.id, v_ra.service_fall_id, coalesce(v_wv.id, v_ra.wartungsvertrag_id),
          coalesce(nullif(p ->> 'firma_id', '')::uuid, intern.firma_fuer(v_projekt, v_sprache)), v_sprache, v_titel,
          v_inkl, v_satz, v_pos, nullif(trim(p ->> 'notiz'), ''))
  returning id into v_id;
  return v_id;
end
$$;

/** Entwurf ändern (p: titel, positionen, inkl_mwst, sprache, firma_id, notiz, faellig_am). */
create or replace function public.rechnung_speichern(p_id uuid, p jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  r public.rechnungen;
begin
  select * into r from public.rechnungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if r.status <> 'entwurf' then raise exception using errcode = 'P0001', message = 'finanzen.rechnung_gestellt'; end if;
  if p ? 'positionen' and jsonb_typeof(p -> 'positionen') <> 'array' then
    raise exception using errcode = 'P0001', message = 'finanzen.positionen_ungueltig';
  end if;
  update public.rechnungen set
    titel = coalesce(nullif(trim(p ->> 'titel'), ''), titel),
    positionen = coalesce(p -> 'positionen', positionen),
    inkl_mwst = coalesce((p ->> 'inkl_mwst')::boolean, inkl_mwst),
    sprache = coalesce(nullif(p ->> 'sprache', ''), sprache),
    firma_id = coalesce(nullif(p ->> 'firma_id', '')::uuid, firma_id),
    faellig_am = case when p ? 'faellig_am' then nullif(p ->> 'faellig_am', '')::date else faellig_am end,
    notiz = intern.feld(p, 'notiz', notiz)
  where id = p_id;
end
$$;

/** Nächste Rechnungsnummer im Format von V233 (R2026-17), über Rechnungen und Zahlungsplan hinweg. */
create or replace function intern.naechste_rechnungsnummer(p_jahr int) returns text
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  perform pg_advisory_xact_lock(hashtext('rechnungsnummer'));
  select coalesce(max((regexp_match(x, '^R' || p_jahr || '-(\d+)$'))[1]::int), 0) + 1 into n
    from (select nummer as x from public.rechnungen union all select rechnung_nr from public.zahlungsplan) s
   where x ~ ('^R' || p_jahr || '-\d+$');
  return 'R' || p_jahr || '-' || n;
end
$$;

/**
 * Rechnung stellen: Nummer, Datum, Fälligkeit (Zahlungsfrist der Firma), Tranche als verrechnet, Nachträge als
 * verrechnet. Versand und QR-Rechnung laufen danach über AbaNinja oder den Ausgangskorb (Freigabe).
 */
create or replace function public.rechnung_stellen(p_id uuid, p_datum date default null) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  r public.rechnungen;
  v_datum date := coalesce(p_datum, (now() at time zone 'Europe/Zurich')::date);
  v_nr text;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  select * into r from public.rechnungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if r.status <> 'entwurf' then raise exception using errcode = 'P0001', message = 'finanzen.rechnung_gestellt'; end if;
  if jsonb_array_length(r.positionen) = 0 or r.total_rappen = 0 then
    raise exception using errcode = 'P0001', message = 'finanzen.rechnung_leer';
  end if;
  v_nr := intern.naechste_rechnungsnummer(extract(year from v_datum)::int);
  update public.rechnungen set
    nummer = v_nr, status = 'gestellt', datum = v_datum,
    faellig_am = coalesce(faellig_am, v_datum + coalesce((select zahlungsfrist_tage from public.firmen where id = r.firma_id), 30))
  where id = p_id;
  if r.zahlungsplan_id is not null then
    update public.zahlungsplan set rechnung_nr = v_nr, rechnung_am = v_datum where id = r.zahlungsplan_id;
  end if;
  update public.nachtraege set status = 'verrechnet'
   where id in (select (x ->> 'bezug_id')::uuid from jsonb_array_elements(r.positionen) x where x ->> 'bezug' = 'nachtrag');
  return v_nr;
end
$$;

/** Stornieren (gestellt, ohne Zahlung) oder Entwurf in den Papierkorb; Tranche und Nachträge werden wieder frei. */
create or replace function public.rechnung_stornieren(p_id uuid, p_grund text) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  r public.rechnungen;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  select * into r from public.rechnungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if r.status = 'entwurf' then
    update public.rechnungen set geloescht_am = now(), storniert_grund = nullif(trim(p_grund), '') where id = p_id;
    return;
  end if;
  if r.status = 'storniert' then return; end if;
  if r.bezahlt_rappen <> 0 then raise exception using errcode = 'P0001', message = 'finanzen.schon_bezahlt'; end if;
  if nullif(trim(p_grund), '') is null then raise exception using errcode = 'P0001', message = 'finanzen.grund_fehlt'; end if;
  update public.rechnungen set status = 'storniert', storniert_grund = trim(p_grund) where id = p_id;
  if r.zahlungsplan_id is not null then
    update public.zahlungsplan set rechnung_nr = null, rechnung_am = null, mahnstufe = 0, mahnfrist = null
     where id = r.zahlungsplan_id and rechnung_nr = r.nummer;
  end if;
  update public.nachtraege set status = 'vom_kunden_bestaetigt'
   where status = 'verrechnet'
     and id in (select (x ->> 'bezug_id')::uuid from jsonb_array_elements(r.positionen) x where x ->> 'bezug' = 'nachtrag');
end
$$;

/** Mahnen (V233): Stufe +1 bis 3, eigene Mahnfrist (Einstellung, 10 Tage), die Fälligkeit bleibt. */
create or replace function public.rechnung_mahnen(p_id uuid) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  r public.rechnungen;
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  v_frist date;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  select * into r from public.rechnungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if r.status not in ('gestellt', 'teilbezahlt') or r.faellig_am >= v_heute then
    raise exception using errcode = 'P0001', message = 'finanzen.nicht_ueberfaellig';
  end if;
  if r.mahnstufe >= 3 then raise exception using errcode = 'P0001', message = 'finanzen.mahnstufe_max'; end if;
  v_frist := v_heute + coalesce((intern.fin_cfg() ->> 'mahnfrist_tage')::int, 10);
  update public.rechnungen set mahnstufe = r.mahnstufe + 1, gemahnt_am = v_heute, mahnfrist = v_frist where id = p_id;
  if r.zahlungsplan_id is not null then
    update public.zahlungsplan set mahnstufe = r.mahnstufe + 1, mahnfrist = v_frist where id = r.zahlungsplan_id;
  end if;
  return r.mahnstufe + 1;
end
$$;

/**
 * Abgleich mit AbaNinja (aus der Edge Function). p.rechnungen: [{uuid, reference, nummer, status, total_rappen,
 * offen_rappen, datum}], p.belege: [{uuid, nummer, reference, titel, lieferant, datum, faellig_am, total_rappen,
 * offen_rappen, storniert}]. Zahlungen entstehen aus dem Rückgang des offenen Betrags. Gibt Zähler zurück.
 */
create or replace function public.abaninja_abgleich_anwenden(p jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  x jsonb;
  r public.rechnungen;
  v_diff bigint;
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  n_re int := 0; n_za int := 0; n_be int := 0; n_zu int := 0;
  v_projekt uuid;
  v_id uuid;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  for x in select * from jsonb_array_elements(coalesce(p -> 'rechnungen', '[]')) loop
    select * into r from public.rechnungen
     where geloescht_am is null and (abaninja_uuid = x ->> 'uuid' or (abaninja_uuid is null and nummer = x ->> 'reference'))
     limit 1;
    continue when not found;
    n_re := n_re + 1;
    update public.rechnungen set abaninja_uuid = x ->> 'uuid', abaninja_nummer = coalesce(x ->> 'nummer', abaninja_nummer),
           abaninja_status = x ->> 'status', abaninja_offen_rappen = (x ->> 'offen_rappen')::bigint, abaninja_abgeglichen_am = now()
     where id = r.id;
    if r.status in ('gestellt', 'teilbezahlt') and x ? 'offen_rappen' then
      v_diff := (r.total_rappen - (x ->> 'offen_rappen')::bigint) - r.bezahlt_rappen;
      if v_diff > 0 then
        insert into public.rechnung_zahlungen (rechnung_id, datum, betrag_rappen, quelle, notiz)
        values (r.id, v_heute, v_diff, 'abaninja', 'Abgleich AbaNinja');
        n_za := n_za + 1;
      end if;
    end if;
  end loop;

  for x in select * from jsonb_array_elements(coalesce(p -> 'belege', '[]')) loop
    -- Projekt aus Referenz oder Titel: Projektnummer (6 Ziffern) oder Bestellnummer (B0026).
    select coalesce(
      (select pr.id from public.projekte pr where pr.geloescht_am is null and pr.nummer <> ''
          and (coalesce(x ->> 'reference', '') || ' ' || coalesce(x ->> 'titel', '')) ~ ('\m' || pr.nummer || '\M') limit 1),
      (select b.projekt_id from public.bestellungen b where b.geloescht_am is null and b.projekt_id is not null
          and (coalesce(x ->> 'reference', '') || ' ' || coalesce(x ->> 'titel', '')) ~* ('\m' || b.nummer || '\M') limit 1))
      into v_projekt;
    select id into v_id from public.kreditor_zahlungen where abaninja_uuid = x ->> 'uuid';
    if v_id is null then
      insert into public.kreditor_zahlungen (abaninja_uuid, firma, text, kategorie, rechnung_nr, rechnung_am, betrag_rappen,
                                             faellig_am, prioritaet, status, quelle, projekt_id, offen_rappen, bezahlt_am,
                                             lieferant_id)
      values (x ->> 'uuid', x ->> 'lieferant', coalesce(nullif(x ->> 'titel', ''), x ->> 'reference'),
              case when v_projekt is not null then 'Lieferant' end, coalesce(x ->> 'nummer', x ->> 'reference'),
              nullif(x ->> 'datum', '')::date, (x ->> 'total_rappen')::bigint, nullif(x ->> 'faellig_am', '')::date,
              'normal', case when (x ->> 'storniert')::boolean then 'storniert'
                             when (x ->> 'offen_rappen')::bigint = 0 then 'bezahlt' else 'offen' end,
              'abaninja', v_projekt, (x ->> 'offen_rappen')::bigint,
              case when (x ->> 'offen_rappen')::bigint = 0 then v_heute end,
              (select l.id from public.lieferanten l where l.geloescht_am is null and lower(l.name) = lower(x ->> 'lieferant') limit 1));
      n_be := n_be + 1;
      if v_projekt is not null then n_zu := n_zu + 1; end if;
    else
      update public.kreditor_zahlungen set
        betrag_rappen = (x ->> 'total_rappen')::bigint, offen_rappen = (x ->> 'offen_rappen')::bigint,
        faellig_am = coalesce(nullif(x ->> 'faellig_am', '')::date, faellig_am),
        status = case when (x ->> 'storniert')::boolean then 'storniert'
                      when (x ->> 'offen_rappen')::bigint = 0 then 'bezahlt' else status end,
        bezahlt_am = case when (x ->> 'offen_rappen')::bigint = 0 then coalesce(bezahlt_am, v_heute) end,
        projekt_id = coalesce(projekt_id, v_projekt)
      where id = v_id;
    end if;
  end loop;
  return jsonb_build_object('rechnungen', n_re, 'zahlungen', n_za, 'belege_neu', n_be, 'belege_zugeordnet', n_zu);
end
$$;

/**
 * Nachkalkulation eines Projekts (Recht preise oder finanzen), alle Beträge exkl. MWST in Rappen.
 * Soll aus der Kalkulation der Offerte, Ist aus Lieferantenrechnungen (sonst Bestellungen, sonst Material-Zahlungen
 * aus V233), Zeiten zum internen Stundensatz und verrechneten Rechnungen.
 */
create or replace function public.nachkalkulation(p_projekt uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  pr public.projekte;
  v_satz numeric := public.mwst_satz();
  v_kal public.kalkulationen;
  v_lief bigint; v_best bigint; v_mat bigint; v_material bigint; v_quelle text;
  v_stunden numeric; v_arbeit bigint;
  v_nachtraege bigint; v_erloes bigint; v_vertrag bigint;
begin
  if not (intern.hat_recht('preise') or intern.hat_recht('finanzen')) then
    raise exception using errcode = 'P0001', message = 'finanzen.kein_recht';
  end if;
  select * into pr from public.projekte where id = p_projekt and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  select * into v_kal from public.kalkulationen where offerte_id = pr.offerte_id and geloescht_am is null
   order by geaendert_am desc nulls last limit 1;

  select sum(round(betrag_rappen / (1 + v_satz / 100))) into v_lief from public.kreditor_zahlungen
   where projekt_id = p_projekt and geloescht_am is null and status <> 'storniert';
  select sum(total_rappen) into v_best from public.bestellungen
   where projekt_id = p_projekt and geloescht_am is null and status <> 'storniert';
  select sum(round(coalesce(nullif(x ->> 'ek', '')::numeric, 0) * 100
                   / case when (x ->> 'exkl')::boolean then 1 else 1 + v_satz / 100 end))
    into v_mat from public.material_zahlungen m, jsonb_array_elements(m.positionen) x
   where m.projekt_id = p_projekt and m.geloescht_am is null;
  v_material := coalesce(v_lief, v_best, v_mat, 0);
  v_quelle := case when v_lief is not null then 'lieferantenrechnungen' when v_best is not null then 'bestellungen'
                   when v_mat is not null then 'material_zahlungen' else 'keine' end;

  select coalesce(sum(extract(epoch from (stopp - start)) / 3600 - coalesce(pause_min, 0) / 60.0), 0) into v_stunden
    from public.zeiten where projekt_id = p_projekt and stopp is not null and geloescht_am is null;
  v_arbeit := round(v_stunden * coalesce((intern.fin_cfg() ->> 'intern_stundensatz_rappen')::bigint, 6500));

  select coalesce(sum(betrag_rappen), 0) into v_nachtraege from public.nachtraege
   where projekt_id = p_projekt and geloescht_am is null and status in ('vom_kunden_bestaetigt', 'verrechnet');
  select coalesce(sum(netto_rappen), 0) into v_erloes from public.rechnungen
   where projekt_id = p_projekt and geloescht_am is null and status not in ('entwurf', 'storniert');
  v_vertrag := round(coalesce(pr.vertragswert_rappen, 0) / (1 + v_satz / 100));

  return jsonb_build_object(
    'projekt_id', pr.id, 'nummer', pr.nummer,
    'soll', jsonb_build_object('verkauf_rappen', coalesce(v_kal.verkauf_rappen, v_vertrag), 'einkauf_rappen', v_kal.einkauf_rappen,
                               'werktage', pr.werktage, 'stunden', pr.werktage * 8 * 2),
    'ist', jsonb_build_object('vertrag_rappen', v_vertrag, 'nachtraege_rappen', v_nachtraege,
                              'umsatz_rappen', v_vertrag + v_nachtraege, 'verrechnet_rappen', v_erloes,
                              'material_rappen', v_material, 'material_quelle', v_quelle,
                              'stunden', round(v_stunden, 2), 'arbeit_rappen', v_arbeit,
                              'marge_rappen', v_vertrag + v_nachtraege - v_material - v_arbeit));
end
$$;

-- Listen ------------------------------------------------------------------------------------------------------
create or replace view public.rechnungen_liste with (security_invoker = true) as
select r.id, r.nummer, r.art, r.status, r.titel, r.datum, r.faellig_am, r.sprache, r.inkl_mwst,
       r.netto_rappen, r.mwst_rappen, r.total_rappen, r.bezahlt_rappen, r.total_rappen - r.bezahlt_rappen as offen_rappen,
       r.bezahlt_am, r.mahnstufe, r.gemahnt_am, r.mahnfrist, r.abaninja_uuid, r.abaninja_status, r.abaninja_abgeglichen_am,
       r.status in ('gestellt', 'teilbezahlt') and r.faellig_am < (now() at time zone 'Europe/Zurich')::date as ueberfaellig,
       r.kontakt_id, intern.kontaktname(k) as kunde, k.kundennummer,
       r.projekt_id, p.nummer as projekt_nummer, r.zahlungsplan_id, r.rapport_id, r.wartungsvertrag_id,
       r.firma_id, f.kuerzel as firma, r.erstellt_am
  from public.rechnungen r
  join public.kontakte k on k.id = r.kontakt_id
  join public.firmen f on f.id = r.firma_id
  left join public.projekte p on p.id = r.projekt_id
 where r.geloescht_am is null;

/** Tranchen aus dem Zahlungsplan, die noch keine Rechnung haben (V233 «geplant»). */
create or replace view public.offene_tranchen with (security_invoker = true) as
select z.id, z.projekt_id, p.nummer as projekt_nummer, p.titel as projekt_titel, p.kontakt_id, intern.kontaktname(k) as kunde,
       z.bezeichnung, z.betrag_rappen, z.faellig_am, p.bau_status
  from public.zahlungsplan z
  join public.projekte p on p.id = z.projekt_id and p.geloescht_am is null
  left join public.kontakte k on k.id = p.kontakt_id
 where z.geloescht_am is null and z.bezahlt_am is null and z.rechnung_nr is null
   and not exists (select 1 from public.rechnungen r where r.zahlungsplan_id = z.id and r.geloescht_am is null
                     and r.status <> 'storniert');

/** Spesen stornieren statt löschen (V233), mit Grund; ausbezahlte bleiben fest. */
create or replace function public.spesen_stornieren(p_id uuid, p_grund text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if nullif(trim(p_grund), '') is null then raise exception using errcode = 'P0001', message = 'finanzen.grund_fehlt'; end if;
  update public.spesen set status = 'storniert', storniert_am = (now() at time zone 'Europe/Zurich')::date,
         storniert_von = intern.mein_vorname(), storniert_grund = trim(p_grund)
   where id = p_id and geloescht_am is null and status = 'eingereicht';
  if not found then raise exception using errcode = 'P0001', message = 'finanzen.spesen_fest'; end if;
end
$$;

/** Ausbezahlt (nur Buchhaltung): mehrere Spesen auf einmal, gibt die Anzahl zurück. */
create or replace function public.spesen_auszahlen(p_ids uuid[], p_datum date default null) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  n int;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  update public.spesen set status = 'ausbezahlt', ausbezahlt_am = coalesce(p_datum, (now() at time zone 'Europe/Zurich')::date),
         ausbezahlt_von = intern.mein_vorname()
   where id = any (p_ids) and geloescht_am is null and status = 'eingereicht';
  get diagnostics n = row_count;
  return n;
end
$$;

grant select on public.rechnungen_liste, public.offene_tranchen to authenticated;
grant execute on function public.rechnung_entwurf(jsonb), public.rechnung_speichern(uuid, jsonb),
  public.rechnung_stellen(uuid, date), public.rechnung_stornieren(uuid, text), public.rechnung_mahnen(uuid),
  public.abaninja_abgleich_anwenden(jsonb), public.nachkalkulation(uuid), public.spesen_stornieren(uuid, text),
  public.spesen_auszahlen(uuid[], date) to authenticated;

/** Nachtrag (Phase 9b) mit Ausnahme für das Storno einer Rechnung: verrechnet → bestätigt nur mit Recht finanzen. */
create or replace function intern.nachtrag_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.nummer, '') = '' then
      new.nummer := 'N' || lpad(nextval('intern.nachtrag_nummer')::text, 3, '0');
    end if;
    new.person_id := coalesce(new.person_id, intern.meine_person_id());
  elsif old.status = 'verrechnet' and new.geloescht_am is not distinct from old.geloescht_am
        and not (new.status = 'vom_kunden_bestaetigt' and new.betrag_rappen is not distinct from old.betrag_rappen
                 and intern.hat_recht('finanzen')) then
    raise exception using errcode = 'P0001', message = 'baustelle.nachtrag_verrechnet';
  end if;
  if new.betrag_rappen is distinct from (case when tg_op = 'INSERT' then null else old.betrag_rappen end)
     and not intern.hat_recht('preise') then
    raise exception using errcode = 'P0001', message = 'baustelle.nachtrag_preis';
  end if;
  return new;
end
$$;
