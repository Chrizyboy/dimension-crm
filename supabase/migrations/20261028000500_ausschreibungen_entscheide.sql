-- Phase 8b, Teil 5: Entscheide (Teilnehmen, Nicht teilnehmen, Später, Spur wechseln), Sperrliste,
-- der tägliche Lauf und die Zahlen für Startseite und Trichter.

/** Fristen eines Dossiers in den CRM-Kalender und Erinnerungen 7 und 2 Tage vorher (Einstellung «erinnern_tage»). */
create or replace function intern.as_fristen(a public.ausschreibungen) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb := intern.as_cfg();
  f record;
  p uuid;
  t int;
  wer uuid[];
begin
  for f in select * from (values ('fragen', 'Fragefrist', 'Questions', a.frist_fragen::timestamptz),
                                 ('begehung', 'Begehung', 'Visite', a.frist_begehung),
                                 ('eingabe', 'Eingabe', 'Dépôt', coalesce(a.frist_eingabe, a.frist::timestamptz))) x(art, de, fr, zeit)
            where zeit is not null loop
    wer := intern.as_personen('bewilligen');
    if f.zeit::date - current_date < coalesce((c ->> 'frist_beide_tage')::int, 7) then
      wer := wer || intern.as_personen('bewilligen_vertretung');
    end if;
    foreach p in array wer loop
      update public.kalender_eintraege set geloescht_am = now()
       where person_id = p and quelle = 'crm' and extern_id = 'as:' || a.id || ':' || f.art and geloescht_am is null;
      insert into public.kalender_eintraege (person_id, beginn, ende, ganztags, betreff, ort, plz, anzeige_als, quelle, extern_id)
      values (p, (f.zeit at time zone 'Europe/Zurich')::date::timestamp at time zone 'Europe/Zurich',
              ((f.zeit at time zone 'Europe/Zurich')::date + 1)::timestamp at time zone 'Europe/Zurich', true,
              f.de || ': ' || a.nummer || ' ' || left(a.titel, 80), a.gemeinde, a.plz, 'free', 'crm', 'as:' || a.id || ':' || f.art);
      for t in select jsonb_array_elements_text(coalesce(c -> 'erinnern_tage', '[7, 2]'))::int loop
        continue when f.zeit::date - t < current_date;
        perform intern.aufgabe_einmal(p, f.de || ' in ' || t || ' Tagen: ' || a.nummer, f.zeit::date - t,
          'ausschreibungen', a.id, a.titel);
      end loop;
    end loop;
  end loop;
end
$$;

/** Status, zu dem ein Dossier zurückkehrt (nach «Später» oder «Wieder öffnen»). */
create or replace function intern.as_grundstatus(a public.ausschreibungen) returns text
language sql stable set search_path = '' as $$
  select case a.spur
    when 'angebot' then case when a.offerte_id is not null then 'kalkulation' else 'pruefen' end
    when 'beobachten' then 'beobachten'
    else coalesce((select case s.status when 'entwurf' then 'entwurf' when 'bewilligt' then 'bewilligt' else 'versendet' end
                     from public.anschreiben s where s.ausschreibung_id = a.id and s.status <> 'abgelehnt' and s.geloescht_am is null
                    order by s.erstellt_am desc limit 1), 'kontakt_fehlt') end
$$;

/**
 * Entscheid zu einem Dossier. p_entscheid: teilnehmen, nicht_teilnehmen, spaeter, kalkulation, eingereicht,
 * zuschlag, absage, verwerfen, beobachten, akquise, angebot, wieder_oeffnen. p_angaben: grund, datum, form,
 * ausloeser. Teilnahme, Eingabe und Verwerfen entscheidet Andy (Vertretung Chris).
 */
create or replace function public.ausschreibung_entscheiden(p_id uuid, p_entscheid text, p_angaben jsonb default '{}')
returns text
language plpgsql security definer set search_path = '' as $$
declare
  a public.ausschreibungen;
  v_grund text := nullif(trim(coalesce(p_angaben ->> 'grund', '')), '');
  d date := nullif(p_angaben ->> 'datum', '')::date;
  v_kontakt uuid;
  v_offerte uuid;
  v_status text;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  if p_entscheid in ('teilnehmen', 'nicht_teilnehmen', 'eingereicht', 'verwerfen') and not intern.as_darf('bewilligen') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  select * into a from public.ausschreibungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'ausschreibung.unbekannt'; end if;

  case p_entscheid
    when 'teilnehmen' then
      if a.spur <> 'angebot' then raise exception using errcode = 'P0001', message = 'ausschreibung.falsche_spur'; end if;
      v_kontakt := a.vergabestelle_kontakt_id;
      if v_kontakt is null then
        v_kontakt := intern.as_kontakt_finden(null, a.vergabestelle);
        if v_kontakt is null then
          insert into public.kontakte (art, kontaktart, firma, sprache, notiz)
          values ('firma', 'firma', coalesce(a.vergabestelle, 'Vergabestelle ' || a.nummer), a.sprache,
                  'Vergabestelle aus ' || a.nummer || '. Fragen nur über das simap-Forum.')
          returning id into v_kontakt;
        end if;
      end if;
      v_offerte := coalesce(a.offerte_id, public.offerte_anlegen(jsonb_build_object(
        'kontakt_id', v_kontakt, 'standort_id', a.standort_id, 'titel', 'Submission: ' || left(a.titel, 200))));
      update public.offerten set art = 'submission' where id = v_offerte;
      update public.ausschreibungen set status = 'teilnahme', entscheid_von = intern.meine_person_id(), entscheid_am = now(),
             vergabestelle_kontakt_id = v_kontakt, offerte_id = v_offerte
       where id = p_id returning * into a;
      perform intern.as_fristen(a);
      v_status := 'teilnahme';
    when 'nicht_teilnehmen', 'verwerfen' then
      update public.ausschreibungen set status = case when p_entscheid = 'verwerfen' then 'verworfen' else 'nicht_teilnehmen' end,
             grund = intern.pflicht(v_grund, 'ausschreibung.grund_fehlt'), entscheid_von = intern.meine_person_id(), entscheid_am = now()
       where id = p_id returning status into v_status;
      update public.anschreiben set status = 'abgelehnt', abgelehnt_grund = v_grund
       where ausschreibung_id = p_id and status in ('entwurf', 'bewilligt');
    when 'spaeter' then
      if d is null or d <= current_date then raise exception using errcode = 'P0001', message = 'ausschreibung.datum_fehlt'; end if;
      update public.ausschreibungen set status = 'spaeter', wiedervorlage_am = d, grund = v_grund where id = p_id;
      v_status := 'spaeter';
    when 'kalkulation' then
      if a.status not in ('teilnahme', 'kalkulation') then raise exception using errcode = 'P0001', message = 'ausschreibung.erst_teilnehmen'; end if;
      update public.ausschreibungen set status = 'kalkulation' where id = p_id;
      v_status := 'kalkulation';
    when 'eingereicht' then
      if a.offerte_id is null then raise exception using errcode = 'P0001', message = 'ausschreibung.erst_teilnehmen'; end if;
      update public.ausschreibungen set status = 'eingereicht', eingereicht_am = coalesce(d, current_date),
             eingereicht_form = intern.pflicht(nullif(p_angaben ->> 'form', ''), 'ausschreibung.form_fehlt')
       where id = p_id;
      update public.offerten set status = 'offeriert', angebot_am = coalesce(d, current_date) where id = a.offerte_id;
      v_status := 'eingereicht';
    when 'zuschlag', 'absage' then
      if a.status <> 'eingereicht' then raise exception using errcode = 'P0001', message = 'ausschreibung.erst_eingeben'; end if;
      update public.ausschreibungen set status = p_entscheid where id = p_id;
      update public.offerten set status = case when p_entscheid = 'zuschlag' then 'angenommen' else 'verloren' end,
             entscheid = case when p_entscheid = 'zuschlag' then 'angenommen' else 'verloren' end, entscheid_am = current_date,
             verlustgrund = case when p_entscheid = 'absage' then coalesce(v_grund, 'Zuschlag an andere Firma') end
       where id = a.offerte_id;
      v_status := p_entscheid;
    when 'beobachten' then
      update public.ausschreibungen set spur = 'beobachten', status = 'beobachten', beobachten_seit = current_date,
             ausloeser = coalesce(nullif(p_angaben ->> 'ausloeser', ''), 'datum'), ausloeser_am = d
       where id = p_id;
      if coalesce(nullif(p_angaben ->> 'ausloeser', ''), 'datum') = 'datum' and d is null then
        raise exception using errcode = 'P0001', message = 'ausschreibung.datum_fehlt';
      end if;
      v_status := 'beobachten';
    when 'akquise' then
      update public.ausschreibungen set spur = 'akquise', status = 'kontakt_fehlt', ausloeser = null where id = p_id;
      perform intern.akquise_vorbereiten(p_id);
      select status into v_status from public.ausschreibungen where id = p_id;
    when 'angebot' then
      update public.ausschreibungen set spur = 'angebot', status = 'pruefen', ausloeser = null where id = p_id;
      v_status := 'pruefen';
    when 'wieder_oeffnen' then
      v_status := intern.as_grundstatus(a);
      update public.ausschreibungen set status = v_status, grund = null, wiedervorlage_am = null where id = p_id;
    else
      raise exception using errcode = 'P0001', message = 'ausschreibung.unbekannt';
  end case;
  perform intern.as_vermerk(p_id, concat_ws(' · ', 'Entscheid: ' || p_entscheid, v_grund, d::text, p_angaben ->> 'form'),
    jsonb_build_object('entscheid', p_entscheid));
  return v_status;
end
$$;

/** Prüfen-Liste in einem Schritt: mehrere Dossiers mit demselben Entscheid (z. B. «verwerfen» mit Grund). */
create or replace function public.ausschreibungen_entscheiden(p_ids uuid[], p_entscheid text, p_angaben jsonb default '{}')
returns int
language plpgsql security invoker set search_path = '' as $$
declare
  i uuid;
  n int := 0;
begin
  foreach i in array p_ids loop
    perform public.ausschreibung_entscheiden(i, p_entscheid, p_angaben);
    n := n + 1;
  end loop;
  return n;
end
$$;

/** Auf die Sperrliste setzen (Mail, Domain oder Name), mit Grund. */
create or replace function public.kontaktsperre_anlegen(p_art text, p_wert text, p_grund text, p_bis date default null)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v uuid;
begin
  if nullif(trim(p_wert), '') is null then raise exception using errcode = 'P0001', message = 'ausschreibung.wert_fehlt'; end if;
  insert into public.kontaktsperren (art, wert, grund, bis)
  values (p_art, case when p_art = 'name' then trim(p_wert) else lower(trim(p_wert)) end,
          intern.pflicht(nullif(trim(p_grund), ''), 'ausschreibung.grund_fehlt'), p_bis)
  returning id into v;
  return v;
end
$$;

/** Sperre aufheben (nur Administration oder wer bewilligt); bleibt als aufgehoben in der Liste sichtbar. */
create or replace function public.kontaktsperre_aufheben(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.as_darf('bewilligen') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  update public.kontaktsperren set aufgehoben_am = now(), aufgehoben_von = intern.meine_person_id()
   where id = p_id and aufgehoben_am is null;
end
$$;
