-- Phase 11, Teil 2: Abläufe im Marketing. Die Regeln (wer nicht angeschrieben wird, doppelte Empfänger,
-- Freigabe von Posts) liegen hier und nicht in der App. Fehler als Schlüssel «marketing.*» / «social.*».

/** Kontakt vom Marketing abmelden oder wieder anmelden (V233 «Keine Werbung»), mit Eintrag im Verlauf. */
create or replace function public.marketing_sperre(p_kontakt uuid, p_sperre boolean, p_grund text default null)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.kontakte
     set werbesperre = p_sperre,
         einwilligung = case when p_sperre
           then coalesce(einwilligung, '{}') || jsonb_build_object('abgemeldet_am', now()::date, 'abmelde_grund', nullif(trim(p_grund), ''))
           else coalesce(einwilligung, '{}') - 'abgemeldet_am' - 'abmelde_grund' end
   where id = p_kontakt and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'marketing.kontakt_fehlt'; end if;
  insert into public.aktivitaeten (art, text, person_id, kontakt_id, details)
  values ('notiz', case when p_sperre then 'Vom Marketing abgemeldet' else 'Wieder für Marketing angemeldet' end
          || coalesce(': ' || nullif(trim(p_grund), ''), ''), intern.meine_person_id(), p_kontakt,
          jsonb_build_object('marketing', case when p_sperre then 'abgemeldet' else 'angemeldet' end));
end
$$;

/** Einwilligung für Newsletter festhalten (revDSG: Datum und Nachweis), z. B. Anmeldung an der Messe. */
create or replace function public.marketing_einwilligung(p_kontakt uuid, p_datum date, p_quelle text)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_datum is null or nullif(trim(p_quelle), '') is null then
    raise exception using errcode = 'P0001', message = 'marketing.einwilligung_unvollstaendig';
  end if;
  update public.kontakte
     set einwilligung = coalesce(einwilligung, '{}') || jsonb_build_object('datum', p_datum, 'quelle', trim(p_quelle), 'kanal', 'email')
   where id = p_kontakt and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'marketing.kontakt_fehlt'; end if;
end
$$;

/**
 * Abmelden über den Link in der Mail (Edge Function «abmelden», ohne Login). Gibt die Sprache zurück, damit die
 * Bestätigung passt; null, wenn der Schlüssel unbekannt ist. Mehrfaches Klicken schadet nicht.
 */
create or replace function public.marketing_abmelden(p_schluessel uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_sprache text;
begin
  update public.kontakte
     set werbesperre = true,
         einwilligung = coalesce(einwilligung, '{}') || jsonb_build_object('abgemeldet_am', now()::date, 'abmelde_grund', 'Link in der Mail')
   where abmelde_schluessel = p_schluessel and geloescht_am is null and not werbesperre
  returning id, sprache into v_id, v_sprache;
  if v_id is not null then
    insert into public.aktivitaeten (art, text, kontakt_id, details)
    values ('notiz', 'Vom Marketing abgemeldet (Link in der Mail)', v_id, '{"marketing": "abgemeldet"}');
    return coalesce(v_sprache, 'de');
  end if;
  select sprache into v_sprache from public.kontakte where abmelde_schluessel = p_schluessel;
  if found then return coalesce(v_sprache, 'de'); end if;
  update public.newsletter_empfaenger set gesperrt = true where abmelde_schluessel = p_schluessel returning 'de' into v_sprache;
  if found then return v_sprache; end if;
  select 'de' into v_sprache from public.newsletter_empfaenger where abmelde_schluessel = p_schluessel;
  return v_sprache;
end
$$;

/**
 * Serien-Mail oder Newsletter in den Ausgangskorb legen. Die App setzt die Platzhalter pro Empfänger ein; hier
 * wird geprüft: abgemeldete Kontakte und gesperrte Empfänger fallen weg, jede Adresse nur einmal, beim
 * Newsletter niemand zweimal (auch nicht bei einem zweiten Versuch). Der Klick auf «Senden» nach der Vorschau
 * ist die Freigabe (Regel 6); gesendet wird über das eigene Outlook (Edge Function «ausgang»).
 * p: {art: serienmail|newsletter, betreff, newsletter_id?, details?, mails: [{kontakt_id?, empfaenger_id?, an, betreff, text, sprache}]}
 */
create or replace function public.marketing_senden(p jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_art text := p ->> 'art';
  v_nl uuid := (p ->> 'newsletter_id')::uuid;
  v_kampagne uuid;
  v_m jsonb;
  v_an text;
  v_kontakt uuid;
  v_schluessel text;
  v_gesehen text[] := '{}';
  v_kontakte uuid[] := '{}';
  v_angelegt int := 0;
  v_weg int := 0;
begin
  if v_art not in ('serienmail', 'newsletter') then raise exception using errcode = 'P0001', message = 'marketing.art'; end if;
  if v_art = 'newsletter' and not exists (select 1 from public.newsletter where id = v_nl and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'marketing.newsletter_fehlt';
  end if;
  if jsonb_array_length(coalesce(p -> 'mails', '[]')) = 0 then
    raise exception using errcode = 'P0001', message = 'marketing.keine_empfaenger';
  end if;
  insert into public.kampagnen (art, betreff, anzahl, versendet_am, versendet_von, details, newsletter_id)
  values (v_art, p ->> 'betreff', 0, now(), intern.mein_vorname(), coalesce(p -> 'details', '{}'), v_nl)
  returning id into v_kampagne;

  for v_m in select * from jsonb_array_elements(p -> 'mails') loop
    v_an := lower(trim(v_m ->> 'an'));
    v_kontakt := (v_m ->> 'kontakt_id')::uuid;
    v_schluessel := v_art || ':' || coalesce(v_nl, v_kampagne)::text || ':' || v_an;
    if v_an is null or v_an = any (v_gesehen)
       or (v_kontakt is not null and exists (select 1 from public.kontakte where id = v_kontakt and (werbesperre or geloescht_am is not null)))
       or (v_m ->> 'empfaenger_id' is not null and exists (select 1 from public.newsletter_empfaenger
             where id = (v_m ->> 'empfaenger_id')::uuid and (gesperrt or geloescht_am is not null)))
       or exists (select 1 from public.ausgangskorb where schluessel = v_schluessel and status <> 'verworfen' and geloescht_am is null)
    then
      v_weg := v_weg + 1;
      continue;
    end if;
    v_gesehen := v_gesehen || v_an;
    perform public.ausgang_anlegen(jsonb_build_object(
      'kanal', 'mail', 'art', v_art, 'an', v_an, 'betreff', v_m ->> 'betreff', 'text', v_m ->> 'text',
      'sprache', coalesce(v_m ->> 'sprache', 'de'), 'kontakt_id', v_kontakt,
      'bezug_tabelle', 'kampagnen', 'bezug_id', v_kampagne, 'schluessel', v_schluessel, 'freigeben', true));
    if v_kontakt is not null then v_kontakte := v_kontakte || v_kontakt; end if;
    v_angelegt := v_angelegt + 1;
  end loop;

  update public.kampagnen set anzahl = v_angelegt, kontakte = v_kontakte where id = v_kampagne;
  if v_art = 'newsletter' and v_angelegt > 0 then
    update public.newsletter
       set status = 'versendet', versendet_am = now(), versendet_von = intern.mein_vorname(),
           anzahl = coalesce(anzahl, 0) + v_angelegt
     where id = v_nl;
  end if;
  return jsonb_build_object('kampagne_id', v_kampagne, 'angelegt', v_angelegt, 'uebersprungen', v_weg);
end
$$;

/** Serienbrief oder Adressliste vermerken (V233 «Letzte Aktionen»); Briefe auch im Verlauf jedes Kontakts. */
create or replace function public.marketing_vermerken(p_art text, p_betreff text, p_kontakte uuid[], p_details jsonb default '{}')
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_art not in ('serienbrief', 'adressliste') then raise exception using errcode = 'P0001', message = 'marketing.art'; end if;
  insert into public.kampagnen (art, betreff, anzahl, kontakte, versendet_am, versendet_von, details)
  values (p_art, p_betreff, coalesce(cardinality(p_kontakte), 0), coalesce(p_kontakte, '{}'), now(), intern.mein_vorname(),
          coalesce(p_details, '{}'))
  returning id into v_id;
  if p_art = 'serienbrief' then
    insert into public.aktivitaeten (art, richtung, text, person_id, kontakt_id, details)
    select 'brief', 'aus', coalesce(nullif(trim(p_betreff), ''), 'Serienbrief'), intern.meine_person_id(), k,
           jsonb_build_object('kampagne_id', v_id)
      from unnest(p_kontakte) k;
  end if;
  return v_id;
end
$$;

/**
 * Empfänger eines Newsletters nach seinem Segment ({gruppen, sprache, standort, kantone, einzelne}).
 * Nur mit Versandgrund (Kunde oder Einwilligung), mit Mail und nicht abgemeldet; jede Adresse einmal.
 * «erhalten» = ist schon im Ausgangskorb (wird beim Senden übersprungen).
 */
create or replace function public.newsletter_empfaenger_fuer(p_newsletter uuid)
returns table (kontakt_id uuid, empfaenger_id uuid, email text, name text, anrede text, vorname text, nachname text,
               firma text, sprache text, versandgrund text, abmelde_schluessel uuid, erhalten boolean)
language sql stable security invoker set search_path = '' as $$
  with n as (select segment from public.newsletter where id = p_newsletter and geloescht_am is null),
  alle as (
    select z.id as kontakt_id, null::uuid as empfaenger_id, lower(trim(z.email)) as email, z.name, z.anrede, z.vorname,
           z.nachname, z.firma, z.sprache, z.versandgrund, k.abmelde_schluessel, 1 as rang
      from public.marketing_zielgruppe z
      join public.kontakte k on k.id = z.id
      cross join n
     where z.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and not z.werbesperre and z.versandgrund is not null
       and (coalesce(jsonb_array_length(n.segment -> 'gruppen'), 0) = 0 or z.gruppe in (select jsonb_array_elements_text(n.segment -> 'gruppen')))
       and (nullif(n.segment ->> 'sprache', '') is null or z.sprache = n.segment ->> 'sprache')
       and (nullif(n.segment ->> 'standort', '') is null or z.standort = n.segment ->> 'standort')
       and (coalesce(jsonb_array_length(n.segment -> 'kantone'), 0) = 0 or z.kanton in (select jsonb_array_elements_text(n.segment -> 'kantone')))
    union all
    select e.kontakt_id, e.id, lower(trim(e.email)), e.name, null, null, null, null,
           coalesce(nullif(e.einwilligung ->> 'sprache', ''), 'de'), 'einwilligung', e.abmelde_schluessel, 2
      from public.newsletter_empfaenger e cross join n
     where e.geloescht_am is null and not e.gesperrt and e.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
       and coalesce((n.segment ->> 'einzelne')::boolean, true)
       and (nullif(n.segment ->> 'sprache', '') is null or coalesce(nullif(e.einwilligung ->> 'sprache', ''), 'de') = n.segment ->> 'sprache')
       and (e.kontakt_id is null or not exists (select 1 from public.kontakte x where x.id = e.kontakt_id and x.werbesperre))
  )
  select distinct on (a.email) a.kontakt_id, a.empfaenger_id, a.email, a.name, a.anrede, a.vorname, a.nachname, a.firma,
         a.sprache, a.versandgrund, a.abmelde_schluessel,
         exists (select 1 from public.ausgangskorb g
                  where g.schluessel = 'newsletter:' || p_newsletter::text || ':' || a.email
                    and g.status <> 'verworfen' and g.geloescht_am is null) as erhalten
    from alle a
   order by a.email, a.rang
$$;

-- Social Media ---------------------------------------------------------------------------------------------------

/** Ist der Dienst für ein Netzwerk verbunden? (instagram/facebook → meta). */
create or replace function intern.social_verbunden(p_netzwerk text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from intern.social_konten
                  where dienst = case when p_netzwerk in ('instagram', 'facebook') then 'meta' else p_netzwerk end
                    and token is not null and fehler is null)
$$;

/** Text eines Posts für ein Netzwerk: je nach Sprache deutsch, französisch oder beide untereinander. */
create or replace function intern.social_text(p_post public.social_posts, p_netzwerk text) returns text
language sql immutable set search_path = '' as $$
  select case coalesce(p_post.sprache, 'de')
    when 'fr' then nullif(trim(p_post.texte -> p_netzwerk ->> 'fr'), '')
    when 'de_fr' then case when nullif(trim(p_post.texte -> p_netzwerk ->> 'de'), '') is not null
                            and nullif(trim(p_post.texte -> p_netzwerk ->> 'fr'), '') is not null
                       then trim(p_post.texte -> p_netzwerk ->> 'de') || E'\n\n' || trim(p_post.texte -> p_netzwerk ->> 'fr') end
    else nullif(trim(p_post.texte -> p_netzwerk ->> 'de'), '')
  end
$$;

/**
 * Post freigeben und planen (Regel 6: nichts geht ohne Freigabe nach aussen). Prüft Netzwerke, Texte, Längen
 * (Instagram 2200, LinkedIn 3000, Facebook 5000 Zeichen), Bild für Instagram und die Verbindung.
 * Ohne Zeitpunkt: so bald wie möglich (nächster Lauf des Zeitplans oder «Jetzt veröffentlichen»).
 */
create or replace function public.social_freigeben(p_id uuid, p_zeitpunkt timestamptz default null)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v public.social_posts;
  n text;
  t text;
  v_max int;
begin
  select * into v from public.social_posts where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'social.fehlt'; end if;
  if v.status not in ('entwurf', 'fehler') then raise exception using errcode = 'P0001', message = 'social.nicht_entwurf'; end if;
  if cardinality(v.netzwerke) = 0 then raise exception using errcode = 'P0001', message = 'social.netzwerk_fehlt'; end if;
  foreach n in array v.netzwerke loop
    -- Bei einem zweiten Versuch nach Fehler nur die Netzwerke prüfen, die noch nicht gepostet sind
    continue when coalesce((v.ergebnis -> n ->> 'ok')::boolean, false);
    t := intern.social_text(v, n);
    if t is null then raise exception using errcode = 'P0001', message = 'social.text_fehlt', detail = n; end if;
    v_max := case n when 'instagram' then 2200 when 'linkedin' then 3000 else 5000 end;
    if char_length(t) > v_max then
      raise exception using errcode = 'P0001', message = 'social.zu_lang', detail = n;
    end if;
    if n = 'instagram' and jsonb_array_length(v.bilder) = 0 then
      raise exception using errcode = 'P0001', message = 'social.bild_fehlt';
    end if;
    if not intern.social_verbunden(n) then raise exception using errcode = 'P0001', message = 'social.nicht_verbunden', detail = n; end if;
  end loop;
  update public.social_posts
     set status = 'geplant', geplant_am = coalesce(p_zeitpunkt, now()), freigegeben_von = intern.meine_person_id(),
         freigegeben_am = now(),
         datum = (coalesce(p_zeitpunkt, now()) at time zone 'Europe/Zurich')::date,
         zeit = (coalesce(p_zeitpunkt, now()) at time zone 'Europe/Zurich')::time
   where id = p_id;
end
$$;

/** Geplanten Post zurückholen (wieder Entwurf), solange er nicht veröffentlicht wird. */
create or replace function public.social_zurueckziehen(p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.social_posts set status = 'entwurf', freigegeben_von = null, freigegeben_am = null
   where id = p_id and status in ('geplant', 'fehler') and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'social.nicht_geplant'; end if;
end
$$;

/** Von Hand gepostet oder nicht mehr nötig: Post als erledigt ablegen (V233 «Vergangene»). */
create or replace function public.social_erledigt(p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.social_posts set status = 'erledigt'
   where id = p_id and status in ('entwurf', 'fehler') and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'social.nicht_entwurf'; end if;
end
$$;

/** Verbindungen (ohne Token) für die App: wer, seit wann, bis wann gültig, Fehler. */
create or replace function public.social_verbindungen()
returns table (dienst text, name text, verbunden boolean, verbunden_am timestamptz, ablauf timestamptz, fehler text, von text)
language sql stable security definer set search_path = '' as $$
  select d.dienst, k.name, k.token is not null, k.verbunden_am, k.ablauf, k.fehler,
         (select p.kuerzel from public.personen p where p.id = k.verbunden_von)
    from (values ('meta'), ('linkedin'), ('canva')) d (dienst)
    left join intern.social_konten k on k.dienst = d.dienst
   where intern.hat_recht('basis')
$$;
revoke execute on function public.social_verbindungen() from public, anon;
grant execute on function public.social_verbindungen() to authenticated;

-- Nur für die Edge Functions (Service-Schlüssel) ---------------------------------------------------------------

/** Anmeldung bei Meta, LinkedIn oder Canva beginnen: state und PKCE-Prüfwert 10 Minuten merken. */
create or replace function public.social_zustand_anlegen(p_zustand text, p_dienst text, p_person uuid, p_pruefwert text, p_sprache text)
returns void
language sql security definer set search_path = '' as $$
  delete from intern.social_zustaende where erstellt_am < now() - interval '10 minutes';
  insert into intern.social_zustaende (zustand, dienst, person_id, pruefwert, sprache)
  values (p_zustand, p_dienst, p_person, p_pruefwert, p_sprache);
$$;

/** Rückruf: Zustand einlösen (einmalig, 10 Minuten). */
create or replace function public.social_zustand_einloesen(p_zustand text)
returns table (dienst text, person_id uuid, pruefwert text, sprache text)
language sql security definer set search_path = '' as $$
  delete from intern.social_zustaende z where z.zustand = p_zustand and z.erstellt_am > now() - interval '10 minutes'
  returning z.dienst, z.person_id, z.pruefwert, z.sprache
$$;

/** Verbindung speichern (Token verschlüsselt) oder trennen (p_token null). */
create or replace function public.social_konto_speichern(p_dienst text, p_name text, p_konto jsonb, p_token text,
  p_refresh text, p_ablauf timestamptz, p_person uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null then
    update intern.social_konten set token = null, refresh = null, fehler = null where dienst = p_dienst;
    return;
  end if;
  insert into intern.social_konten (dienst, name, konto, token, refresh, ablauf, verbunden_von, verbunden_am, fehler)
  values (p_dienst, p_name, coalesce(p_konto, '{}'), p_token, p_refresh, p_ablauf, p_person, now(), null)
  on conflict (dienst) do update
    set name = excluded.name, konto = excluded.konto, token = excluded.token, refresh = excluded.refresh,
        ablauf = excluded.ablauf, verbunden_von = excluded.verbunden_von, verbunden_am = now(), fehler = null;
end
$$;

/** Verbindung lesen (Token verschlüsselt). */
create or replace function public.social_konto_lesen(p_dienst text)
returns table (name text, konto jsonb, token text, refresh text, ablauf timestamptz)
language sql security definer set search_path = '' as $$
  select k.name, k.konto, k.token, k.refresh, k.ablauf from intern.social_konten k where k.dienst = p_dienst and k.token is not null
$$;

/** Nach einer Nutzung: erneuerte Tokens speichern oder Fehler vermerken (z. B. «neu_verbinden»). */
create or replace function public.social_konto_genutzt(p_dienst text, p_token text, p_refresh text, p_ablauf timestamptz, p_fehler text)
returns void
language sql security definer set search_path = '' as $$
  update intern.social_konten
     set token = coalesce(p_token, token), refresh = coalesce(p_refresh, refresh), ablauf = coalesce(p_ablauf, ablauf),
         genutzt_am = case when p_fehler is null then now() else genutzt_am end, fehler = p_fehler
   where dienst = p_dienst;
$$;

/**
 * Posts zum Veröffentlichen holen: fällige geplante (Zeitplan) oder ein bestimmter (p_id, «Jetzt veröffentlichen»).
 * Markiert sie als «wird_veroeffentlicht», damit kein zweiter Lauf sie doppelt postet.
 */
create or replace function public.social_beanspruchen(p_id uuid default null, p_limit int default 5)
returns setof public.social_posts
language sql security definer set search_path = '' as $$
  update public.social_posts s set status = 'wird_veroeffentlicht'
   where s.id in (select x.id from public.social_posts x
                   where x.status = 'geplant' and x.geloescht_am is null
                     and (case when p_id is null then x.geplant_am <= now() else x.id = p_id end)
                   order by x.geplant_am limit p_limit for update skip locked)
  returning s.*
$$;

/** Ergebnis je Netzwerk eintragen; alle ok → veröffentlicht, sonst Fehler (nochmals freigeben postet nur den Rest). */
create or replace function public.social_ergebnis(p_id uuid, p_ergebnis jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.social_posts;
  v_alle boolean;
begin
  update public.social_posts set ergebnis = ergebnis || coalesce(p_ergebnis, '{}') where id = p_id returning * into v;
  select bool_and(coalesce((v.ergebnis -> n ->> 'ok')::boolean, false)) into v_alle from unnest(v.netzwerke) n;
  update public.social_posts
     set status = case when v_alle then 'veroeffentlicht' else 'fehler' end,
         veroeffentlicht_am = case when v_alle then now() else veroeffentlicht_am end
   where id = p_id;
end
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'marketing_abmelden(uuid)', 'social_zustand_anlegen(text, text, uuid, text, text)', 'social_zustand_einloesen(text)',
    'social_konto_speichern(text, text, jsonb, text, text, timestamptz, uuid)', 'social_konto_lesen(text)',
    'social_konto_genutzt(text, text, text, timestamptz, text)', 'social_beanspruchen(uuid, int)',
    'social_ergebnis(uuid, jsonb)']
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end
$$;
