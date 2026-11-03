-- Marketing vollständig (Entscheid 0045), Teil 3: Versand mit Kampagne, Öffnungen und Klicks, Ergebnis je Versand,
-- Social Media «von Hand» bis Meta und LinkedIn verbunden sind, Fotos für Werbung, Heizung aus dem Gebäuderegister.

/**
 * Serien-Mail oder Newsletter in den Ausgangskorb (Klick = Freigabe, Regel 6). Wie bisher (Phase 11), dazu die
 * Kampagne: aus dem Aufruf oder vom Newsletter. Antworten der Empfänger werden so als Lead der Kampagne erkannt.
 */
create or replace function public.marketing_senden(p jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_art text := p ->> 'art';
  v_nl uuid := (p ->> 'newsletter_id')::uuid;
  v_ziel uuid := nullif(p ->> 'kampagne_id', '')::uuid;
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
  if v_ziel is null and v_nl is not null then
    select n.kampagne_id into v_ziel from public.newsletter n where n.id = v_nl;
  end if;
  insert into public.kampagnen (art, betreff, anzahl, versendet_am, versendet_von, details, newsletter_id, kampagne_id)
  values (v_art, p ->> 'betreff', 0, now(), intern.mein_vorname(), coalesce(p -> 'details', '{}'), v_nl, v_ziel)
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

/**
 * Öffnung oder Klick zählen (nur Edge Function «zaehler», Service-Schlüssel). Nur für gesendete Serien-Mails und
 * Newsletter; ein Klick nur auf einen Link, der in der Mail steht (kein offener Umleitungsdienst). Eine Öffnung
 * je Mail und Stunde. Gibt zurück, ob gezählt (bzw. ob der Link gültig) ist.
 */
create or replace function public.marketing_zaehlen(p_ausgang uuid, p_art text, p_url text default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  a public.ausgangskorb;
begin
  select * into a from public.ausgangskorb where id = p_ausgang and geloescht_am is null;
  if not found or a.art not in ('serienmail', 'newsletter') or a.kanal <> 'mail' then return false; end if;
  if p_art = 'klick' then
    if p_url is null or p_url !~ '^https?://' or position(p_url in coalesce(a.text, '') || coalesce(a.html, '')) = 0 then
      return false;
    end if;
    insert into public.marketing_ereignisse (ausgang_id, art, url) values (p_ausgang, 'klick', left(p_url, 500));
    return true;
  elsif p_art = 'oeffnung' then
    if not exists (select 1 from public.marketing_ereignisse
                    where ausgang_id = p_ausgang and art = 'oeffnung' and am > now() - interval '1 hour') then
      insert into public.marketing_ereignisse (ausgang_id, art) values (p_ausgang, 'oeffnung');
    end if;
    return true;
  end if;
  return false;
end
$$;
revoke execute on function public.marketing_zaehlen(uuid, text, text) from public, anon, authenticated;
grant execute on function public.marketing_zaehlen(uuid, text, text) to service_role;

/**
 * Ergebnis je Versand (Zeile in «kampagnen»): gesendet, geöffnet, geklickt, abgemeldet und Leads innert 30 Tagen
 * von angeschriebenen Kontakten. Für Newsletter und die Akte einer Kampagne.
 */
create or replace function public.versand_ergebnisse(p_ids uuid[])
returns table (versand_id uuid, gesendet int, geoeffnet int, geklickt int, abgemeldet int, leads int)
language sql stable security definer set search_path = '' as $$
  select l.id,
         (select count(*) from public.ausgangskorb a where a.bezug_tabelle = 'kampagnen' and a.bezug_id = l.id
            and a.status = 'gesendet' and a.geloescht_am is null)::int,
         (select count(distinct e.ausgang_id) from public.marketing_ereignisse e join public.ausgangskorb a on a.id = e.ausgang_id
           where a.bezug_tabelle = 'kampagnen' and a.bezug_id = l.id and e.art = 'oeffnung')::int,
         (select count(distinct e.ausgang_id) from public.marketing_ereignisse e join public.ausgangskorb a on a.id = e.ausgang_id
           where a.bezug_tabelle = 'kampagnen' and a.bezug_id = l.id and e.art = 'klick')::int,
         (select count(*) from public.kontakte c where c.id = any (l.kontakte) and c.werbesperre
            and (c.einwilligung ->> 'abgemeldet_am')::date >= (l.versendet_am at time zone 'Europe/Zurich')::date)::int,
         (select count(*) from public.verkaufschancen v where v.kontakt_id = any (l.kontakte) and v.geloescht_am is null
            and v.erstellt_am between l.versendet_am and l.versendet_am + interval '30 days')::int
    from public.kampagnen l
   where l.id = any (p_ids) and l.geloescht_am is null and intern.hat_recht('basis')
$$;
revoke execute on function public.versand_ergebnisse(uuid[]) from public, anon;
grant execute on function public.versand_ergebnisse(uuid[]) to authenticated;

-- Social Media «von Hand» -----------------------------------------------------------------------------------

/**
 * Post freigeben und planen (Regel 6). Wie bisher, aber ohne Verbindung zum Netzwerk nicht mehr ein Fehler:
 * der Post wird «von Hand» geplant, zur Zeit kommt die Glocke «Jetzt posten» (social_von_hand_melden).
 * Freigeben auch aus «Idee» und «zur Freigabe».
 */
create or replace function public.social_freigeben(p_id uuid, p_zeitpunkt timestamptz default null)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v public.social_posts;
  n text;
  t text;
  v_max int;
  v_hand boolean := false;
begin
  select * into v from public.social_posts where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'social.fehlt'; end if;
  if v.status not in ('idee', 'entwurf', 'zur_freigabe', 'fehler') then
    raise exception using errcode = 'P0001', message = 'social.nicht_entwurf';
  end if;
  if cardinality(v.netzwerke) = 0 then raise exception using errcode = 'P0001', message = 'social.netzwerk_fehlt'; end if;
  foreach n in array v.netzwerke loop
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
    if not intern.social_verbunden(n) then v_hand := true; end if;
  end loop;
  update public.social_posts
     set status = 'geplant', geplant_am = coalesce(p_zeitpunkt, now()), freigegeben_von = intern.meine_person_id(),
         freigegeben_am = now(),
         datum = (coalesce(p_zeitpunkt, now()) at time zone 'Europe/Zurich')::date,
         zeit = (coalesce(p_zeitpunkt, now()) at time zone 'Europe/Zurich')::time,
         details = (details - 'gemeldet_am') || jsonb_build_object('von_hand', v_hand)
   where id = p_id;
end
$$;

/** Post zur Freigabe vorlegen (Idee oder Entwurf); die Administration bekommt eine Glocke. */
create or replace function public.social_zur_freigabe(p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_thema text;
begin
  update public.social_posts set status = 'zur_freigabe'
   where id = p_id and status in ('idee', 'entwurf', 'fehler') and geloescht_am is null
  returning thema into v_thema;
  if not found then raise exception using errcode = 'P0001', message = 'social.nicht_entwurf'; end if;
  perform intern.benachrichtige_admins(intern.meine_person_id(), 'info', 'Post zur Freigabe', 'Publication à valider',
    coalesce(v_thema, '–'), '/marketing?ansicht=social&post=' || p_id);
end
$$;
revoke execute on function public.social_zur_freigabe(uuid) from public, anon;
grant execute on function public.social_zur_freigabe(uuid) to authenticated;

/** Geplanten Post zurückholen (wieder Entwurf), auch aus «zur Freigabe». */
create or replace function public.social_zurueckziehen(p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.social_posts set status = 'entwurf', freigegeben_von = null, freigegeben_am = null
   where id = p_id and status in ('geplant', 'fehler', 'zur_freigabe') and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'social.nicht_geplant'; end if;
end
$$;

/** Von Hand gepostet: veröffentlicht mit den Links je Netzwerk ({"instagram": "https://…"}). */
create or replace function public.social_gepostet(p_id uuid, p_links jsonb default '{}')
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v public.social_posts;
  v_erg jsonb := '{}';
  n text;
begin
  select * into v from public.social_posts where id = p_id and geloescht_am is null for update;
  if not found or v.status not in ('geplant', 'fehler') then
    raise exception using errcode = 'P0001', message = 'social.nicht_geplant';
  end if;
  foreach n in array v.netzwerke loop
    v_erg := v_erg || jsonb_build_object(n, jsonb_strip_nulls(jsonb_build_object('ok', true, 'von_hand', true,
               'url', nullif(trim(coalesce(p_links ->> n, '')), ''))));
  end loop;
  update public.social_posts
     set status = 'veroeffentlicht', veroeffentlicht_am = now(), ergebnis = ergebnis || v_erg
   where id = p_id;
end
$$;
revoke execute on function public.social_gepostet(uuid, jsonb) from public, anon;
grant execute on function public.social_gepostet(uuid, jsonb) to authenticated;

/** Automatisch posten nur, was nicht «von Hand» ist. */
create or replace function public.social_beanspruchen(p_id uuid default null, p_limit int default 5)
returns setof public.social_posts
language sql security definer set search_path = '' as $$
  update public.social_posts s set status = 'wird_veroeffentlicht'
   where s.id in (select x.id from public.social_posts x
                   where x.status = 'geplant' and x.geloescht_am is null
                     and not coalesce((x.details ->> 'von_hand')::boolean, false)
                     and (case when p_id is null then x.geplant_am <= now() else x.id = p_id end)
                   order by x.geplant_am limit p_limit for update skip locked)
  returning s.*
$$;

/**
 * Zeitplan: fällige Posts «von Hand» melden (Glocke «Jetzt posten» an die freigebende Person, sonst Administration),
 * einmal je Post. Gibt die Zahl zurück.
 */
create or replace function public.social_von_hand_melden()
returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select s.id, s.thema, s.freigegeben_von from public.social_posts s
     where s.status = 'geplant' and s.geloescht_am is null and coalesce((s.details ->> 'von_hand')::boolean, false)
       and s.geplant_am <= now() and s.details ->> 'gemeldet_am' is null
     for update skip locked
  loop
    if r.freigegeben_von is not null then
      insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
      values (r.freigegeben_von, 'warnung', 'Jetzt posten', 'Publier maintenant', coalesce(r.thema, '–'),
              coalesce(r.thema, '–'), '/marketing?ansicht=social&post=' || r.id);
    else
      perform intern.benachrichtige_admins(null, 'warnung', 'Jetzt posten', 'Publier maintenant', coalesce(r.thema, '–'),
        '/marketing?ansicht=social&post=' || r.id);
    end if;
    update public.social_posts set details = details || jsonb_build_object('gemeldet_am', now()) where id = r.id;
    n := n + 1;
  end loop;
  return n;
end
$$;
revoke execute on function public.social_von_hand_melden() from public, anon, authenticated;
grant execute on function public.social_von_hand_melden() to service_role;

-- Fotos für Werbung (Mediathek) -----------------------------------------------------------------------------

/**
 * Fotos aus Rapporten mit Ort und Anlage, nie Name oder Adresse. «erlaubt» = Kunde hat Fotos für Werbung erlaubt.
 * Nur Rapporte der letzten 3 Jahre, neueste zuerst.
 */
create or replace function public.mediathek_fotos()
returns table (id uuid, name text, speicher_pfad text, sharepoint_url text, rapport_id uuid, projekt_nummer text,
               ort text, leistung_kwp numeric, batterie boolean, datum date, erlaubt boolean, titel boolean)
language sql stable security definer set search_path = '' as $$
  select d.id, d.name, d.speicher_pfad, d.sharepoint_url, r.id, p.nummer, coalesce(o.gemeinde, o.ort),
         a.leistung_kwp, exists (select 1 from jsonb_array_elements(coalesce(a.komponenten, '[]')) c where c ->> 'art' = 'batterie'),
         coalesce(r.datum, (d.hochgeladen_am at time zone 'Europe/Zurich')::date), r.fotos_werbung, d.werbung_titel
    from public.dokumente d
    join public.rapporte r on r.id = d.bezug_id and r.geloescht_am is null
    left join public.projekte p on p.id = r.projekt_id
    left join public.objekte o on o.id = p.objekt_id
    left join lateral (select x.leistung_kwp, x.komponenten from public.anlagen x
                        where x.projekt_id = p.id and x.geloescht_am is null order by x.ibn_am desc nulls last limit 1) a on true
   where d.bezug_tabelle = 'rapporte' and d.ordner = 'fotos' and d.geloescht_am is null
     and coalesce(d.mime_typ, 'image/') like 'image/%'
     and coalesce(r.datum, current_date) >= current_date - 3 * 365
     and intern.hat_recht('basis')
   order by coalesce(r.datum, (d.hochgeladen_am at time zone 'Europe/Zurich')::date) desc, d.name
   limit 600
$$;
revoke execute on function public.mediathek_fotos() from public, anon;
grant execute on function public.mediathek_fotos() to authenticated;

/** Erlaubnis für Werbung an einem Rapport nachtragen oder entziehen (mit Vermerk im Verlauf des Kunden). */
create or replace function public.foto_werbung_setzen(p_rapport uuid, p_erlaubt boolean, p_grund text default null)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_kontakt uuid;
begin
  update public.rapporte set fotos_werbung = p_erlaubt where id = p_rapport and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  select p.kontakt_id into v_kontakt from public.rapporte r join public.projekte p on p.id = r.projekt_id where r.id = p_rapport;
  if v_kontakt is not null then
    insert into public.aktivitaeten (art, text, person_id, kontakt_id, details)
    values ('notiz', case when p_erlaubt then 'Fotos für Werbung erlaubt' else 'Fotos für Werbung nicht mehr erlaubt' end
                     || coalesce(' (' || nullif(trim(p_grund), '') || ')', ''),
            intern.meine_person_id(), v_kontakt, jsonb_build_object('marketing', 'fotos', 'rapport_id', p_rapport));
  end if;
end
$$;
revoke execute on function public.foto_werbung_setzen(uuid, boolean, text) from public, anon;
grant execute on function public.foto_werbung_setzen(uuid, boolean, text) to authenticated;

/** Foto als Titelbild markieren (Vorschlag für den Referenz-Post). */
create or replace function public.foto_titel_setzen(p_dokument uuid, p_titel boolean)
returns void
language sql security invoker set search_path = '' as $$
  update public.dokumente set werbung_titel = p_titel where id = p_dokument and geloescht_am is null
$$;
revoke execute on function public.foto_titel_setzen(uuid, boolean) from public, anon;
grant execute on function public.foto_titel_setzen(uuid, boolean) to authenticated;

-- Heizung aus dem Gebäuderegister ---------------------------------------------------------------------------

/** Zeitplan: Gebäude von Kunden, deren Heizung noch nicht geprüft ist (älteste zuerst). */
create or replace function public.objekte_heizung_offen(p_limit int default 20)
returns table (id uuid, strasse text, plz text, gemeinde text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.strasse, o.plz, coalesce(o.gemeinde, o.ort)
    from public.objekte o
   where o.geloescht_am is null and o.heizung_geprueft_am is null and o.strasse is not null and o.plz is not null
     and exists (select 1 from public.projekte p where p.kontakt_id = o.kontakt_id and p.geloescht_am is null)
   order by o.erstellt_am
   limit p_limit
$$;
revoke execute on function public.objekte_heizung_offen(int) from public, anon, authenticated;
grant execute on function public.objekte_heizung_offen(int) to service_role;

/** Zeitplan: Heizung eines Gebäudes speichern (leer = nicht gefunden, wird nicht mehr gesucht). */
create or replace function public.objekt_heizung_setzen(p_id uuid, p_heizung text)
returns void
language sql security definer set search_path = '' as $$
  update public.objekte set heizung = coalesce(nullif(p_heizung, ''), heizung), heizung_geprueft_am = now() where id = p_id
$$;
revoke execute on function public.objekt_heizung_setzen(uuid, text) from public, anon, authenticated;
grant execute on function public.objekt_heizung_setzen(uuid, text) to service_role;

-- Zielgruppe: Heizung dazu (letzte Spalte, damit die Sicht ersetzt werden kann).
create or replace view public.marketing_zielgruppe with (security_invoker = true) as
select k.id,
       k.kundennummer,
       intern.kontaktname(k) as name,
       k.anrede, k.vorname, k.nachname, k.firma,
       k.email, k.telefon,
       case when k.sprache = 'fr' then 'fr' else 'de' end as sprache,
       o.strasse, coalesce(o.plz, pv.plz) as plz, o.ort, coalesce(o.kanton, pv.kanton) as kanton,
       st.kuerzel as standort,
       s.stand,
       case
         when a.eigenschaften ->> 'gruppe' in ('auftrag', 'verbaut') then 'kunde'
         when a.eigenschaften ->> 'gruppe' in ('offerte', 'offeriert') then 'offerte'
         when a.eigenschaften ->> 'gruppe' = 'lead' then 'interessent'
         when s.stand = 'kein' then 'kein_interesse'
         when s.stand = 'verloren' then 'verloren'
         else 'ohne'
       end as gruppe,
       an.batterie, an.wallbox, an.waermepumpe, an.anlage_seit,
       k.werbesperre,
       k.einwilligung,
       case
         when a.eigenschaften ->> 'gruppe' in ('auftrag', 'verbaut') then 'kunde'
         when k.einwilligung ->> 'datum' is not null then 'einwilligung'
       end as versandgrund,
       (select max(z.zeitpunkt) from public.aktivitaeten z
         where z.kontakt_id = k.id and z.geloescht_am is null and z.art in ('mail', 'brief')) as zuletzt_angeschrieben,
       k.abmelde_schluessel,
       o.heizung
  from public.kontakte k
  left join lateral (
    select x.strasse, x.plz, x.ort, x.kanton, x.heizung from public.objekte x
     where x.kontakt_id = k.id and x.geloescht_am is null order by x.erstellt_am limit 1) o on true
  left join lateral (
    select v.plz, v.kanton from public.plz_verzeichnis v
     where (o.plz is not null and v.plz = o.plz) or (o.plz is null and lower(v.ort_name) = lower(trim(o.ort)))
     order by v.plz limit 1) pv on true
  left join lateral public.kundenstand(k.id) s on true
  left join public.auswahlwerte a on a.liste = 'kundenstand' and a.schluessel = s.stand
  left join lateral (
    select coalesce(p.standort_id, f.standort_id, v.standort_id) as standort_id
      from (select 1) x
      left join lateral (select standort_id from public.projekte
                          where kontakt_id = k.id and geloescht_am is null and standort_id is not null
                          order by erstellt_am desc limit 1) p on true
      left join lateral (select standort_id from public.offerten
                          where kontakt_id = k.id and geloescht_am is null and standort_id is not null
                          order by erstellt_am desc limit 1) f on true
      left join lateral (select standort_id from public.verkaufschancen
                          where kontakt_id = k.id and geloescht_am is null and standort_id is not null
                          order by eingang_am desc nulls last limit 1) v on true) so on true
  left join public.standorte st on st.id = so.standort_id
  left join lateral (
    select bool_or(c ->> 'art' = 'batterie' or nullif(p.alt_daten ->> 'batterie', '') is not null) as batterie,
           bool_or(c ->> 'art' = 'wallbox') as wallbox,
           bool_or(c ->> 'art' = 'waermepumpe') as waermepumpe,
           min(coalesce(l.ibn_am, p.unterzeichnet_am)) as anlage_seit
      from public.projekte p
      left join public.anlagen l on l.projekt_id = p.id and l.geloescht_am is null
      left join lateral jsonb_array_elements(coalesce(l.komponenten, '[]')) c on true
     where p.kontakt_id = k.id and p.geloescht_am is null
       and (l.id is not null or a.eigenschaften ->> 'gruppe' in ('auftrag', 'verbaut'))) an on true
 where k.geloescht_am is null;
