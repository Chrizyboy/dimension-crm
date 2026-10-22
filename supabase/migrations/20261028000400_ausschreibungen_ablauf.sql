-- Phase 8b, Teil 4: Senden (Lead entsteht erst jetzt), Antworten erkennen, Entscheide der Spur Angebot,
-- Sperrliste und der tägliche Lauf (Auslöser, Nachfassen, Erinnerungen, Quellen-Kontrolle).

/** Lead zum Anschreiben anlegen: Stufe «Angeschrieben», Wiedervorlage nach n Arbeitstagen. */
create or replace function intern.as_lead(s public.anschreiben) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  k public.ausschreibung_kontakte;
  a public.ausschreibungen;
  v_kontakt uuid;
  v_lead uuid;
begin
  select * into k from public.ausschreibung_kontakte where id = s.dossier_kontakt_id;
  select * into a from public.ausschreibungen where id = s.ausschreibung_id;
  v_kontakt := k.kontakt_id;
  if v_kontakt is null then
    insert into public.kontakte (art, kontaktart, vorname, nachname, firma, email, telefon, sprache, notiz)
    values (case when k.art = 'privat' then 'person' else 'firma' end,
      case when k.art = 'privat' then 'privat' else 'firma' end,
      null, case when k.art = 'privat' then k.name end, case when k.art = 'privat' then k.firma else coalesce(k.firma, k.name) end,
      k.email, k.telefon, k.sprache, 'Aus Ausschreibung ' || a.nummer || ', Quelle: ' || k.quelle_link)
    returning id into v_kontakt;
    update public.ausschreibung_kontakte set kontakt_id = v_kontakt where id = k.id;
  end if;
  v_lead := public.lead_anlegen(jsonb_build_object(
    'kontakt_id', v_kontakt,
    'objekt', jsonb_build_object('plz', coalesce(a.plz, k.plz), 'ort', coalesce(a.gemeinde, k.ort)),
    'lead', jsonb_build_object('quelle', 'ausschreibung', 'standort_id', a.standort_id,
      'notiz_intern', a.nummer || ': ' || a.titel || coalesce(E'\n' || a.quell_url, ''))));
  update public.verkaufschancen
     set stufe = 'angeschrieben',
         wiedervorlage_am = intern.arbeitstage_plus(current_date, coalesce((intern.as_cfg() ->> 'nachfassen_arbeitstage')::int, 5)),
         wiedervorlage_grund = 'Nachfassen ' || a.nummer
   where id = v_lead;
  update public.ausschreibungen set verkaufschance_id = coalesce(verkaufschance_id, v_lead) where id = a.id;
  return v_lead;
end
$$;

/**
 * Senden (Chris, Vertretung Loris): Mail über den Ausgangskorb aus dem eigenen Postfach, Brief als
 * gedruckt vermerkt, Anruf als Aufgabe mit Gesprächsleitfaden. Prüft die Sperren noch einmal.
 */
create or replace function public.anschreiben_senden(p_ids uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare
  s public.anschreiben;
  k public.ausschreibung_kontakte;
  v_lead uuid;
  v_ausgang uuid;
  v_aufgabe uuid;
  n int := 0;
begin
  if not intern.as_darf('senden') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  for s in select * from public.anschreiben where id = any (p_ids) and status = 'bewilligt' and geloescht_am is null
            order by bewilligt_am for update loop
    select * into k from public.ausschreibung_kontakte where id = s.dossier_kontakt_id;
    if intern.gesperrt(k.email, coalesce(k.firma, k.name)) is not null then
      raise exception using errcode = 'P0001', message = 'ausschreibung.gesperrt';
    end if;
    v_lead := coalesce((select verkaufschance_id from public.anschreiben
                         where dossier_kontakt_id = s.dossier_kontakt_id and verkaufschance_id is not null limit 1),
                       intern.as_lead(s));
    v_ausgang := null;
    v_aufgabe := null;
    if s.kanal = 'mail' then
      v_ausgang := public.ausgang_anlegen(jsonb_build_object(
        'kanal', 'mail', 'art', 'ausschreibung', 'an', s.an, 'betreff', s.betreff, 'text', public.anschreiben_volltext(s.id),
        'sprache', s.sprache, 'kontakt_id', (select kontakt_id from public.ausschreibung_kontakte where id = k.id),
        'verkaufschance_id', v_lead, 'bezug_tabelle', 'anschreiben', 'bezug_id', s.id,
        'schluessel', 'anschreiben:' || s.id, 'freigeben', true));
    elsif s.kanal = 'anruf' then
      v_aufgabe := intern.aufgabe_einmal(intern.meine_person_id(), 'Anrufen: ' || coalesce(k.firma, k.name)
        || ' ' || coalesce(k.telefon, '') || ' (' || (select nummer from public.ausschreibungen where id = s.ausschreibung_id) || ')',
        current_date, 'anschreiben', s.id, s.text);
    end if;
    update public.anschreiben set status = 'versendet', versendet_von = intern.meine_person_id(), versendet_am = now(),
           verkaufschance_id = v_lead, ausgang_id = v_ausgang, aufgabe_id = v_aufgabe
     where id = s.id;
    update public.ausschreibungen set status = case when s.art = 'nachfassen' then 'nachfassen' else 'versendet' end
     where id = s.ausschreibung_id and status in ('bewilligt', 'entwurf', 'nachfassen');
    perform intern.as_vermerk(s.ausschreibung_id,
      case s.kanal when 'mail' then 'Mail gesendet an ' when 'brief' then 'Brief gedruckt für ' else 'Anruf geplant: ' end
      || coalesce(k.firma, k.name) || case when s.art = 'nachfassen' then ' (Nachfassen)' else '' end,
      jsonb_build_object('anschreiben_id', s.id, 'verkaufschance_id', v_lead));
    perform intern.vermerke((select kontakt_id from public.ausschreibung_kontakte where id = k.id), v_lead, null,
      'Angeschrieben (' || s.kanal || '): ' || s.betreff, jsonb_build_object('anschreiben_id', s.id));
    n := n + 1;
  end loop;
  return n;
end
$$;

/**
 * Antwort festhalten: Interesse (der Lead geht an den Verkauf), kein Interesse, oder «keine Werbung»
 * (Adresse kommt sofort auf die Sperrliste, Kontakt bekommt die Werbesperre).
 */
create or replace function intern.as_antwort(p_id uuid, p_art text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.anschreiben;
  k public.ausschreibung_kontakte;
begin
  if p_art not in ('interesse', 'kein_interesse', 'keine_werbung') then
    raise exception using errcode = 'P0001', message = 'ausschreibung.unbekannt';
  end if;
  update public.anschreiben set antwort_am = coalesce(antwort_am, now()), antwort_art = p_art
   where id = p_id and status = 'versendet' returning * into s;
  if not found then raise exception using errcode = 'P0001', message = 'ausschreibung.nicht_aenderbar'; end if;
  select * into k from public.ausschreibung_kontakte where id = s.dossier_kontakt_id;
  update public.ausschreibungen set status = case when p_art = 'interesse' then 'lead' else 'kein_interesse' end
   where id = s.ausschreibung_id;
  if p_art = 'interesse' then
    update public.verkaufschancen set stufe = 'neu', wiedervorlage_am = null, wiedervorlage_grund = null
     where id = s.verkaufschance_id and stufe = 'angeschrieben';
  else
    update public.verkaufschancen set stufe = 'kein_interesse',
           verlustgrund = case when p_art = 'keine_werbung' then 'Keine Werbung erwünscht' else 'Kein Interesse (Ausschreibung)' end,
           wiedervorlage_am = null
     where id = s.verkaufschance_id and stufe in ('angeschrieben', 'neu', 'offen', 'warten');
  end if;
  if p_art = 'keine_werbung' then
    if k.email is not null and intern.gesperrt(k.email, null) is null then
      insert into public.kontaktsperren (art, wert, grund) values ('email', lower(k.email), 'Keine Werbung erwünscht');
    elsif k.email is null and intern.gesperrt(null, coalesce(k.firma, k.name)) is null then
      insert into public.kontaktsperren (art, wert, grund) values ('name', coalesce(k.firma, k.name), 'Keine Werbung erwünscht');
    end if;
    update public.kontakte set werbesperre = true where id = k.kontakt_id;
  end if;
  -- Ein offener Nachfass-Entwurf ist nach einer Antwort überflüssig.
  update public.anschreiben set status = 'abgelehnt', abgelehnt_grund = 'Antwort erhalten'
   where dossier_kontakt_id = k.id and art = 'nachfassen' and status in ('entwurf', 'bewilligt');
  perform intern.as_vermerk(s.ausschreibung_id, 'Antwort: ' || case p_art when 'interesse' then 'Interesse, Lead an den Verkauf'
    when 'kein_interesse' then 'kein Interesse' else 'keine Werbung (gesperrt)' end);
end
$$;

/** Antwort von Hand festhalten (aus der Akte). */
create or replace function public.anschreiben_antwort(p_id uuid, p_art text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  perform intern.as_antwort(p_id, p_art);
end
$$;

-- Antwort-Mail erkennen: Eingehende Mail eines angeschriebenen Kontakts mit der Dossiernummer im Betreff.
create or replace function intern.as_antwort_erkennen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_nr text := substring(new.text from 'AS-\d{4}-\d{4,}');
  s public.anschreiben;
begin
  if v_nr is null then return new; end if;
  select x.* into s from public.anschreiben x
    join public.ausschreibungen a on a.id = x.ausschreibung_id
    join public.ausschreibung_kontakte k on k.id = x.dossier_kontakt_id
   where a.nummer = v_nr and x.status = 'versendet' and x.antwort_am is null
     and (k.kontakt_id = new.kontakt_id or lower(k.email) = lower(new.details ->> 'von'))
   order by x.versendet_am desc limit 1;
  if not found then return new; end if;
  update public.aktivitaeten set ausschreibung_id = s.ausschreibung_id where id = new.id;
  if lower(new.text) ~ '(keine werbung|pas de publicit|abmelden|désinscri|desinscri)' then
    perform intern.as_antwort(s.id, 'keine_werbung');
  else
    update public.anschreiben set antwort_am = new.zeitpunkt where id = s.id;
    update public.ausschreibungen set status = 'antwort' where id = s.ausschreibung_id;
    update public.anschreiben set status = 'abgelehnt', abgelehnt_grund = 'Antwort erhalten'
     where dossier_kontakt_id = s.dossier_kontakt_id and art = 'nachfassen' and status in ('entwurf', 'bewilligt');
    perform intern.as_vermerk(s.ausschreibung_id, 'Antwort per Mail erhalten: bitte lesen und festhalten (Interesse oder nicht)');
  end if;
  return new;
end
$$;
create trigger ausschreibung_antwort after insert on public.aktivitaeten
  for each row when (new.art = 'mail' and new.richtung = 'ein') execute function intern.as_antwort_erkennen();
