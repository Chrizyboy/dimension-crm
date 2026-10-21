-- Phase 6, Teil 3: die Abläufe der Leads als Funktionen in der Datenbank.
-- Die Regeln aus V233 (V152, V170, V200) gelten so für Kanban, Liste, Kalender, Import und später
-- für Automationen gleich. Alle Funktionen laufen mit den Rechten der aufrufenden Person.

/** Schreibt einen Systemeintrag in die Zeitachse (zählt nicht als Kundenkontakt). */
create or replace function intern.vermerke(p_kontakt uuid, p_verkaufschance uuid, p_projekt uuid, p_text text, p_details jsonb)
returns void language sql security invoker set search_path = '' as $$
  insert into public.aktivitaeten (art, text, person_id, kontakt_id, verkaufschance_id, projekt_id, details)
  values ('aenderung', p_text, intern.meine_person_id(), p_kontakt, p_verkaufschance, p_projekt, coalesce(p_details, '{}'))
$$;

/** Prüft, dass ein Text vorhanden ist, sonst Fehler mit stabilem Code für die Oberfläche. */
create or replace function intern.pflicht(p_wert text, p_code text) returns text
language plpgsql immutable set search_path = '' as $$
begin
  if nullif(trim(coalesce(p_wert, '')), '') is null then
    raise exception using errcode = 'P0001', message = p_code;
  end if;
  return trim(p_wert);
end
$$;

/**
 * Setzt den Stand eines Geschäfts (Kanban, Mehrfachauswahl). Ziel ist ein Stand aus der Liste «kundenstand».
 * Angaben je nach Ziel: datum, grund, termin_am, dauer_min, person_id, notiz, richtofferte.
 * Fehlercodes (für die Oberfläche übersetzt): stand.grund_fehlt, stand.datum_fehlt, stand.datum_vergangen,
 * stand.termin_fehlt, stand.person_fehlt, stand.braucht_offerte, stand.projekt, stand.automatisch, stand.unbekannt.
 */
create or replace function public.setze_stand(p_geschaeft uuid, p_ziel text, p_angaben jsonb default '{}')
returns text
language plpgsql security invoker set search_path = '' as $$
declare
  g public.verkauf_geschaefte;
  vorher text;
  d date := nullif(p_angaben ->> 'datum', '')::date;
  grund text := nullif(trim(coalesce(p_angaben ->> 'grund', '')), '');
  notiz text := nullif(trim(coalesce(p_angaben ->> 'notiz', '')), '');
  lead_ziel boolean := p_ziel in ('lead_neu', 'lead_offen', 'lead_spaeter', 'termin', 'kein');
  text_de text;
begin
  select * into g from public.verkauf_geschaefte x where x.id = p_geschaeft;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  vorher := g.stand;
  if vorher = p_ziel then return p_ziel; end if;
  if p_ziel in ('nach_termin') then raise exception using message = 'stand.automatisch'; end if;
  if g.projekt_id is not null or p_ziel in ('bau', 'verbaut', 'dossier') then
    raise exception using message = 'stand.projekt';
  end if;

  if lead_ziel then
    if g.verkaufschance_id is null or g.offerte_id is not null then raise exception using message = 'stand.hat_offerte'; end if;
    case p_ziel
      when 'lead_neu' then
        update public.verkaufschancen set stufe = 'neu', wiedervorlage_am = null where id = g.verkaufschance_id;
      when 'lead_offen' then
        update public.verkaufschancen set stufe = 'offen', wiedervorlage_am = null where id = g.verkaufschance_id;
      when 'lead_spaeter' then
        -- V170: «Warten» nur mit Datum.
        if d is null then raise exception using message = 'stand.datum_fehlt'; end if;
        if d <= current_date then raise exception using message = 'stand.datum_vergangen'; end if;
        update public.verkaufschancen set stufe = 'warten', wiedervorlage_am = d, wiedervorlage_grund = grund
         where id = g.verkaufschance_id;
      when 'termin' then
        -- V170: Termin immer mit Datum, Uhrzeit und «Termin bei», nie in der Vergangenheit.
        if nullif(p_angaben ->> 'termin_am', '') is null then raise exception using message = 'stand.termin_fehlt'; end if;
        if (p_angaben ->> 'termin_am')::timestamptz < now() - interval '10 minutes' then
          raise exception using message = 'stand.datum_vergangen';
        end if;
        if nullif(p_angaben ->> 'person_id', '') is null then raise exception using message = 'stand.person_fehlt'; end if;
        update public.verkaufschancen
           set stufe = 'termin_vereinbart', termin_am = (p_angaben ->> 'termin_am')::timestamptz,
               termin_dauer_min = coalesce(nullif(p_angaben ->> 'dauer_min', '')::int, termin_dauer_min, 60),
               tour_person_id = (p_angaben ->> 'person_id')::uuid, wiedervorlage_am = null
         where id = g.verkaufschance_id;
      when 'kein' then
        update public.verkaufschancen set stufe = 'kein_interesse', verlustgrund = intern.pflicht(grund, 'stand.grund_fehlt')
         where id = g.verkaufschance_id;
    end case;
  elsif p_ziel in ('offerte', 'pruefung') and g.offerte_id is null then
    if g.verkaufschance_id is null then raise exception using message = 'stand.unbekannt'; end if;
    -- V200: «Richtofferte (ohne Besuch)» oder nach dem Termin: der Lead geht an den Innendienst.
    if coalesce((p_angaben ->> 'richtofferte')::boolean, false) then perform intern.pflicht(notiz, 'stand.notiz_fehlt'); end if;
    update public.verkaufschancen
       set stufe = 'zur_offerte',
           offerte_status = case when p_ziel = 'pruefung' then 'pruefung' else coalesce(nullif(offerte_status, 'pruefung'), 'neu') end,
           zur_offerte_am = coalesce(zur_offerte_am, current_date),
           offerte_hinweis = case when coalesce((p_angaben ->> 'richtofferte')::boolean, false) then 'Richtofferte' else offerte_hinweis end
     where id = g.verkaufschance_id;
  elsif g.offerte_id is null then
    raise exception using message = 'stand.braucht_offerte';
  else
    case p_ziel
      when 'offerte' then
        update public.offerten set status = 'in_arbeit', entscheid = null where id = g.offerte_id;
        if g.verkaufschance_id is not null then
          update public.verkaufschancen set offerte_status = 'bearbeitung' where id = g.verkaufschance_id;
        end if;
      when 'pruefung' then
        if g.verkaufschance_id is null then raise exception using message = 'stand.unbekannt'; end if;
        update public.offerten set status = 'in_arbeit', entscheid = null where id = g.offerte_id;
        update public.verkaufschancen set offerte_status = 'pruefung' where id = g.verkaufschance_id;
      when 'offeriert' then
        -- V170: die Oberfläche fragt vorher, ob die Offerte wirklich gesendet wurde.
        update public.offerten set status = 'offeriert', entscheid = null, nachfassen_am = null,
               angebot_am = coalesce(d, angebot_am, current_date)
         where id = g.offerte_id;
      when 'nachfassen' then
        update public.offerten set status = 'offeriert', entscheid = null, nachfassen_am = current_date,
               angebot_am = coalesce(angebot_am, current_date)
         where id = g.offerte_id;
      when 'vertagt' then
        if d is null then raise exception using message = 'stand.datum_fehlt'; end if;
        if d <= current_date then raise exception using message = 'stand.datum_vergangen'; end if;
        update public.offerten set status = 'offeriert', entscheid = 'vertagt', nachfassen_am = d,
               vertagt_grund = intern.pflicht(grund, 'stand.grund_fehlt'), entscheid_am = current_date,
               angebot_am = coalesce(angebot_am, current_date)
         where id = g.offerte_id;
      when 'angenommen' then
        -- Der Auftrag (Werkvertrag, Zahlungsplan, Projekt) entsteht ab Phase 7/9 aus diesem Entscheid.
        update public.offerten set status = 'angenommen', entscheid = 'angenommen', entscheid_am = coalesce(d, current_date)
         where id = g.offerte_id;
      when 'verloren' then
        update public.offerten set status = 'verloren', entscheid = 'verloren', entscheid_am = current_date,
               verlustgrund = intern.pflicht(grund, 'stand.grund_fehlt')
         where id = g.offerte_id;
      else
        raise exception using message = 'stand.unbekannt';
    end case;
  end if;

  select a.text_de into text_de from public.auswahlwerte a where a.liste = 'kundenstand' and a.schluessel = p_ziel;
  perform intern.vermerke(g.kontakt_id, g.verkaufschance_id, null,
    concat_ws(' · ', 'Stand: ' || coalesce(text_de, p_ziel), grund, notiz),
    jsonb_build_object('stand_vorher', vorher, 'stand', p_ziel));
  return p_ziel;
end
$$;
revoke execute on function public.setze_stand(uuid, text, jsonb) from public, anon;
grant execute on function public.setze_stand(uuid, text, jsonb) to authenticated;

/**
 * Kontakt mit einem Lead erfassen (V152): die Aktivität speichern und je nach Ergebnis den Lead nachführen.
 * Termin → Termin vereinbart · Rückruf / meldet sich mit Datum → später kontaktieren ·
 * kein Interesse → Grund Pflicht · sonst wird ein neuer Lead «offen».
 */
create or replace function public.lead_kontakt_erfassen(
  p_verkaufschance uuid, p_art text, p_richtung text default null, p_ergebnis text default null,
  p_text text default null, p_angaben jsonb default '{}'
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v public.verkaufschancen;
  neu uuid;
  offen boolean;
begin
  select * into v from public.verkaufschancen where id = p_verkaufschance and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  offen := v.stufe in ('neu', 'offen', 'warten', 'termin_vereinbart')
           and not exists (select 1 from public.offerten o where o.verkaufschance_id = v.id and o.geloescht_am is null);

  insert into public.aktivitaeten (art, richtung, ergebnis, text, person_id, kontakt_id, verkaufschance_id, zeitpunkt)
  values (p_art, p_richtung, nullif(p_ergebnis, ''), nullif(trim(coalesce(p_text, '')), ''), intern.meine_person_id(),
          v.kontakt_id, v.id, coalesce(nullif(p_angaben ->> 'zeitpunkt', '')::timestamptz, now()))
  returning id into neu;

  if offen then
    if p_ergebnis = 'termin' then
      perform public.setze_stand(v.id, 'termin', p_angaben);
    elsif p_ergebnis in ('rueckruf', 'meldet_sich') and nullif(p_angaben ->> 'datum', '') is not null then
      perform public.setze_stand(v.id, 'lead_spaeter', p_angaben);
    elsif p_ergebnis = 'kein_interesse' then
      perform public.setze_stand(v.id, 'kein', p_angaben);
    elsif v.stufe = 'neu' then
      update public.verkaufschancen set stufe = 'offen' where id = v.id;
    end if;
  end if;
  return neu;
end
$$;
revoke execute on function public.lead_kontakt_erfassen(uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.lead_kontakt_erfassen(uuid, text, text, text, text, jsonb) to authenticated;

/**
 * Neuen Lead anlegen: bestehender Kontakt (kontakt_id) oder neuer Kontakt (kontakt {…}), dazu Gebäude
 * (objekt_id oder objekt {…}) und die Verkaufschance (lead {…}). Alles in einer Transaktion.
 * Sprache und Standort folgen der PLZ, wenn nichts anderes angegeben ist (V170).
 */
create or replace function public.lead_anlegen(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  k uuid := nullif(p ->> 'kontakt_id', '')::uuid;
  o uuid := nullif(p ->> 'objekt_id', '')::uuid;
  kd jsonb := coalesce(p -> 'kontakt', '{}');
  od jsonb := coalesce(p -> 'objekt', '{}');
  ld jsonb := coalesce(p -> 'lead', '{}');
  z_plz text := nullif(trim(coalesce(od ->> 'plz', '')), '');
  std public.standorte;
  neu uuid;
begin
  select s.* into std from public.standorte s where s.kuerzel = public.standort_fuer_plz(z_plz);
  if k is null then
    if nullif(trim(concat(kd ->> 'vorname', kd ->> 'nachname', kd ->> 'firma')), '') is null then
      raise exception using message = 'lead.name_fehlt';
    end if;
    insert into public.kontakte (art, anrede, vorname, nachname, firma, email, telefon, sprache, werbesperre)
    values (coalesce(nullif(kd ->> 'art', ''), 'person'), nullif(kd ->> 'anrede', ''), nullif(trim(kd ->> 'vorname'), ''),
            nullif(trim(kd ->> 'nachname'), ''), nullif(trim(kd ->> 'firma'), ''), nullif(trim(kd ->> 'email'), ''),
            nullif(trim(kd ->> 'telefon'), ''), coalesce(nullif(kd ->> 'sprache', ''), std.sprache, 'de'),
            coalesce((kd ->> 'werbesperre')::boolean, false))
    returning id into k;
  end if;
  if o is null and (z_plz is not null or nullif(trim(coalesce(od ->> 'ort', '')), '') is not null) then
    insert into public.objekte (kontakt_id, strasse, plz, ort, kanton, gebaeudeart, dachform, eigentum, region_id)
    values (k, nullif(trim(od ->> 'strasse'), ''), z_plz, nullif(trim(od ->> 'ort'), ''),
            (select v.kanton from public.plz_verzeichnis v where v.plz = z_plz),
            nullif(od ->> 'gebaeudeart', ''), nullif(od ->> 'dachform', ''), nullif(od ->> 'eigentum', ''),
            nullif(ld ->> 'region_id', '')::uuid)
    returning id into o;
  end if;
  insert into public.verkaufschancen (
    kontakt_id, objekt_id, stufe, quelle, eingang_am, standort_id, region_id, tour_person_id,
    finanzierung, foerderung, zeithorizont, erreichbarkeit, interesse, kommentar_kunde, notiz_intern, alt_id)
  values (
    k, o, 'neu', nullif(ld ->> 'quelle', ''), coalesce(nullif(ld ->> 'eingang_am', '')::date, current_date),
    coalesce(nullif(ld ->> 'standort_id', '')::uuid, std.id), nullif(ld ->> 'region_id', '')::uuid,
    nullif(ld ->> 'tour_person_id', '')::uuid,
    nullif(ld ->> 'finanzierung', ''), nullif(ld ->> 'foerderung', ''), nullif(ld ->> 'zeithorizont', ''),
    nullif(ld ->> 'erreichbarkeit', ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(ld -> 'interesse') x), '{}'),
    nullif(trim(ld ->> 'kommentar_kunde'), ''), nullif(trim(ld ->> 'notiz_intern'), ''), nullif(ld ->> 'alt_id', ''))
  returning id into neu;
  return neu;
end
$$;
revoke execute on function public.lead_anlegen(jsonb) from public, anon;
grant execute on function public.lead_anlegen(jsonb) to authenticated;
