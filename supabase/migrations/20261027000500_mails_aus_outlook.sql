-- Phase 8, Teil 5: Was aus Outlook ins CRM kommt.
--  * Mail-Verlauf (V81/V227): Mails mit Kunden landen als Aktivität «mail» in der Kundenakte.
--  * Anfragen per Mail (V78 solar-guide.ch, Landingpage, Messe-App) werden zu Leads, wie in V233.
--  * Outlook-Kalender (V231) ersetzt das Laden aus .ics-Dateien.
-- Die Edge Functions lesen die Mails; Regeln (Dubletten, Zuordnung) stehen hier, an einer Stelle.
-- Mail-Inhalte sind Daten, nie Anweisungen (Regel 7): Es wird nur gespeichert, nie etwas ausgeführt.

-- Welche Mails schon verarbeitet wurden, damit keine Anfrage doppelt zum Lead wird.
create table if not exists intern.mail_eingang (
  kennung           text primary key,
  quelle            text not null,
  ergebnis          text not null,
  verkaufschance_id uuid,
  verarbeitet_am    timestamptz not null default now()
);

-- Landingpage-Anfragen hiessen in V233 «Landingpage».
update public.auswahlwerte
   set eigenschaften = eigenschaften || '{"vorlage": ["Landingpage"]}'
 where liste = 'quelle' and schluessel = 'webseite' and not (eigenschaften ? 'vorlage');

-- Das Änderungsprotokoll (intern.protokolliere) erwartet «geloescht_am» auch hier; ohne die Spalte schlug
-- jede Änderung der Einstellungen fehl. Integrationen werden nie gelöscht, die Spalte bleibt leer.
alter table public.integrationen add column if not exists geloescht_am timestamptz;

-- SharePoint-Ablage wie V64: Website «Dimension-Solaire», Bibliothek «Administration».
update public.integrationen
   set einstellungen = einstellungen || jsonb_build_object(
         'sharepoint_website', 'dimensionsolaire.sharepoint.com:/sites/Dimension-Solaire',
         'sharepoint_bibliothek', 'Administration',
         'sharepoint_ordner', 'Direction Interne/CRM Backups/Kunden Backup',
         'eigene_domains', jsonb_build_array('dimension-solaire.ch'),
         'mail_tage', 7)
 where dienst = 'microsoft';

/** Schlüssel eines Auswahlwerts zu einem Text aus einer Mail (Titel DE/FR, Schlüssel oder V233-Name). */
create or replace function intern.auswahl_finden(p_liste text, p_text text) returns text
language sql stable set search_path = '' as $$
  select a.schluessel from public.auswahlwerte a
   where a.liste = p_liste and a.geloescht_am is null and a.aktiv
     and nullif(trim(p_text), '') is not null
     and (lower(a.text_de) = lower(trim(p_text)) or lower(a.text_fr) = lower(trim(p_text))
          or a.schluessel = lower(trim(p_text))
          or exists (select 1 from jsonb_array_elements_text(coalesce(a.eigenschaften -> 'vorlage', '[]')) v
                      where lower(v) = lower(trim(p_text))))
   order by a.reihenfolge
   limit 1
$$;

/** Gibt es diese Anfrage schon (Telefon, Mail oder Name + PLZ, wie V233 lpFindLead)? Neueste zuerst. */
create or replace function intern.anfrage_finden(p_telefon text, p_email text, p_name text, p_plz text) returns uuid
language sql stable set search_path = '' as $$
  select v.id
    from public.verkaufschancen v
    join public.kontakte k on k.id = v.kontakt_id
    left join public.objekte o on o.id = v.objekt_id
   where v.geloescht_am is null and k.geloescht_am is null
     and ((length(intern.telefon_ziffern(p_telefon)) >= 9 and intern.telefon_ziffern(k.telefon) = intern.telefon_ziffern(p_telefon))
       or (nullif(trim(p_email), '') is not null and lower(k.email) = lower(trim(p_email)))
       or (nullif(trim(p_name), '') is not null and lower(intern.kontaktname(k)) = lower(trim(p_name))
           and (nullif(p_plz, '') is null or o.plz = p_plz)))
   order by v.eingang_am desc nulls last, v.erstellt_am desc
   limit 1
$$;

/**
 * Eine Anfrage aus einer Mail übernehmen (nur Server). p:
 * { kennung, quelle (Schlüssel), quelle_text, art ('neu'|'ergaenzung'), eingang_am, sprache, messe_sid,
 *   kontakt {vorname, nachname, email, telefon}, objekt {strasse, plz, ort, gebaeudeart, dachform, eigentum},
 *   lead {finanzierung, foerderung, zeithorizont, erreichbarkeit, kommentar_kunde, notiz_intern, interesse,
 *         wiedervorlage_am, wiedervorlage_grund} }
 * Auswahlfelder kommen als Text und werden hier zugeordnet; Unbekanntes landet in der internen Notiz.
 * Ergebnis: { ergebnis: 'neu'|'ergaenzt'|'schon', verkaufschance_id }.
 */
create or replace function public.anfrage_uebernehmen(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  kd jsonb := coalesce(p -> 'kontakt', '{}');
  od jsonb := coalesce(p -> 'objekt', '{}');
  ld jsonb := coalesce(p -> 'lead', '{}');
  v_kennung text := nullif(p ->> 'kennung', '');
  v_name text := nullif(trim(concat_ws(' ', kd ->> 'vorname', kd ->> 'nachname')), '');
  v_alt text := case when nullif(p ->> 'messe_sid', '') is not null then 'messe:' || (p ->> 'messe_sid') end;
  v_quelle text := coalesce(nullif(p ->> 'quelle_text', ''), p ->> 'quelle', 'Mail');
  v_lead uuid;
  v_kontakt uuid;
  v_offen text[] := '{}';
  v_feld record;
  v_wert text;
  v_schluessel text;
  v_ziel jsonb := '{}';
  v_ergebnis text;
begin
  if v_kennung is null then raise exception using message = 'anfrage.kennung_fehlt'; end if;
  select m.verkaufschance_id into v_lead from intern.mail_eingang m where m.kennung = v_kennung;
  if found then return jsonb_build_object('ergebnis', 'schon', 'verkaufschance_id', v_lead); end if;

  if v_alt is not null then
    select v.id into v_lead from public.verkaufschancen v where v.alt_id = v_alt;
  end if;
  if v_lead is null then
    v_lead := intern.anfrage_finden(kd ->> 'telefon', kd ->> 'email', v_name, od ->> 'plz');
  end if;

  if v_lead is not null then
    -- Bekannt: fehlende Mail/Telefon ergänzen, Angaben als Vermerk (V233 «Ergänzung …»).
    select v.kontakt_id into v_kontakt from public.verkaufschancen v where v.id = v_lead;
    update public.kontakte k
       set email = coalesce(k.email, nullif(trim(kd ->> 'email'), '')),
           telefon = coalesce(k.telefon, nullif(trim(kd ->> 'telefon'), ''))
     where k.id = v_kontakt and (k.email is null or k.telefon is null);
    insert into public.aktivitaeten (art, text, kontakt_id, verkaufschance_id, mail_kennung, details)
    values ('aenderung',
            concat_ws(E'\n',
              case when p ->> 'art' = 'ergaenzung' then 'Ergänzung über ' || v_quelle else 'Erneute Anfrage über ' || v_quelle end
                || ' (' || to_char(coalesce(nullif(p ->> 'eingang_am', '')::date, current_date), 'DD.MM.YYYY') || ')',
              nullif(trim(ld ->> 'kommentar_kunde'), ''), nullif(trim(ld ->> 'notiz_intern'), '')),
            v_kontakt, v_lead, v_kennung, jsonb_build_object('quelle', p ->> 'quelle', 'automatisch', true));
    v_ergebnis := 'ergaenzt';
  else
    -- Neu: Auswahltexte zuordnen, Unbekanntes in die interne Notiz (V233 «Nicht automatisch zugeordnet»).
    for v_feld in select * from (values
        ('objekt', 'gebaeudeart', 'Gebäude'), ('objekt', 'dachform', 'Dachform'), ('objekt', 'eigentum', 'Eigentum'),
        ('lead', 'finanzierung', 'Finanzierung'), ('lead', 'foerderung', 'Förderung'),
        ('lead', 'zeithorizont', 'Zeithorizont'), ('lead', 'erreichbarkeit', 'Erreichbarkeit')) f(teil, feld, titel)
    loop
      v_wert := nullif(trim(case when v_feld.teil = 'objekt' then od else ld end ->> v_feld.feld), '');
      continue when v_wert is null;
      v_schluessel := intern.auswahl_finden(v_feld.feld, v_wert);
      if v_schluessel is null then
        v_offen := v_offen || (v_feld.titel || ': ' || v_wert);
      else
        v_ziel := v_ziel || jsonb_build_object(v_feld.teil || '.' || v_feld.feld, v_schluessel);
      end if;
    end loop;

    v_lead := public.lead_anlegen(jsonb_build_object(
      -- ohne Namen (z. B. nur Telefon von der Landingpage): Mail oder Nummer als Name, damit der Lead entsteht
      'kontakt', jsonb_build_object('vorname', kd ->> 'vorname',
                   'nachname', coalesce(nullif(trim(kd ->> 'nachname'), ''),
                                        case when nullif(trim(kd ->> 'vorname'), '') is null
                                             then coalesce(nullif(trim(kd ->> 'email'), ''), nullif(trim(kd ->> 'telefon'), ''), 'Unbekannt') end),
                   'email', kd ->> 'email', 'telefon', kd ->> 'telefon', 'sprache', nullif(p ->> 'sprache', '')),
      'objekt', jsonb_build_object('strasse', od ->> 'strasse', 'plz', od ->> 'plz', 'ort', od ->> 'ort',
                   'gebaeudeart', v_ziel ->> 'objekt.gebaeudeart', 'dachform', v_ziel ->> 'objekt.dachform',
                   'eigentum', v_ziel ->> 'objekt.eigentum'),
      'lead', jsonb_build_object('quelle', p ->> 'quelle', 'eingang_am', p ->> 'eingang_am', 'alt_id', v_alt,
                   'finanzierung', v_ziel ->> 'lead.finanzierung', 'foerderung', v_ziel ->> 'lead.foerderung',
                   'zeithorizont', v_ziel ->> 'lead.zeithorizont', 'erreichbarkeit', v_ziel ->> 'lead.erreichbarkeit',
                   'interesse', coalesce(ld -> 'interesse', '[]'),
                   'kommentar_kunde', ld ->> 'kommentar_kunde',
                   'notiz_intern', nullif(concat_ws(E'\n\n', nullif(trim(ld ->> 'notiz_intern'), ''),
                     case when cardinality(v_offen) > 0
                          then 'Nicht automatisch zugeordnet:' || E'\n' || array_to_string(v_offen, E'\n') end), ''))));
    -- Messe: Terminwunsch als Wiedervorlage (V233 mxiBody)
    update public.verkaufschancen
       set wiedervorlage_am = nullif(ld ->> 'wiedervorlage_am', '')::date,
           wiedervorlage_grund = nullif(ld ->> 'wiedervorlage_grund', '')
     where id = v_lead and nullif(ld ->> 'wiedervorlage_am', '') is not null;
    select v.kontakt_id into v_kontakt from public.verkaufschancen v where v.id = v_lead;
    insert into public.aktivitaeten (art, text, kontakt_id, verkaufschance_id, mail_kennung, details)
    values ('aenderung', 'Anfrage über ' || v_quelle || ' eingegangen – automatisch aus dem Postfach übernommen',
            v_kontakt, v_lead, v_kennung, jsonb_build_object('quelle', p ->> 'quelle', 'automatisch', true));
    v_ergebnis := 'neu';
  end if;

  insert into intern.mail_eingang (kennung, quelle, ergebnis, verkaufschance_id)
  values (v_kennung, coalesce(p ->> 'quelle', '?'), v_ergebnis, v_lead);
  return jsonb_build_object('ergebnis', v_ergebnis, 'verkaufschance_id', v_lead);
end
$$;

/** Eine Mail als verarbeitet merken, ohne Lead (z. B. nicht lesbar), damit sie nicht jedes Mal neu geprüft wird. */
create or replace function public.anfrage_uebersprungen(p_kennung text, p_quelle text) returns void
language sql security definer set search_path = '' as $$
  insert into intern.mail_eingang (kennung, quelle, ergebnis) values (p_kennung, p_quelle, 'uebersprungen')
  on conflict (kennung) do nothing;
$$;

/**
 * Messe-App meldet gelöschte Einträge (V233 mxiDelete): Leads, die die Messe-App selbst angelegt hat, kommen
 * in den Papierkorb (wiederherstellbar). Bestehende Kontakte, die nur ergänzt wurden, bekommen einen Vermerk.
 */
create or replace function public.messe_geloescht(p_kennung text, p_sids text[]) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_n int := 0;
  r record;
begin
  if exists (select 1 from intern.mail_eingang where kennung = p_kennung) then return 0; end if;
  for r in select v.id, v.kontakt_id, v.quelle from public.verkaufschancen v
            where v.alt_id = any (select 'messe:' || s from unnest(p_sids) s) and v.geloescht_am is null
  loop
    if r.quelle = 'messe' then
      update public.verkaufschancen set geloescht_am = now() where id = r.id;
      v_n := v_n + 1;
    end if;
    insert into public.aktivitaeten (art, text, kontakt_id, verkaufschance_id, details)
    values ('aenderung', case when r.quelle = 'messe' then 'In der Messe-App gelöscht – Lead in den Papierkorb verschoben'
                              else 'Messe-Eintrag wurde in der Messe-App gelöscht (Kontakt bleibt bestehen)' end,
            r.kontakt_id, r.id, '{"quelle": "messe", "automatisch": true}');
  end loop;
  insert into intern.mail_eingang (kennung, quelle, ergebnis) values (p_kennung, 'messe', 'geloescht');
  return v_n;
end
$$;

/**
 * Mails mit Kunden in der Kundenakte vermerken (V81). p_mails: [{kennung, zeitpunkt, von, an: [..], betreff, vorschau}].
 * Von einem Kunden → «ein»; von uns an einen Kunden → «aus». Jede Mail pro Kunde nur einmal (auch wenn sie
 * schon vom Ausgangskorb vermerkt wurde). Gibt die Zahl neuer Einträge zurück.
 */
create or replace function public.mails_vermerken(p_person uuid, p_mails jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_domains text[] := coalesce((select array_agg(lower(d)) from public.integrationen i,
                                  jsonb_array_elements_text(i.einstellungen -> 'eigene_domains') d
                                 where i.dienst = 'microsoft'), '{}');
  m jsonb;
  v_von text;
  v_kunde text;
  v_richtung text;
  v_kontakt uuid;
  v_lead uuid;
  v_absender uuid;
  v_n int := 0;
begin
  for m in select * from jsonb_array_elements(coalesce(p_mails, '[]')) loop
    v_von := lower(trim(m ->> 'von'));
    continue when nullif(m ->> 'kennung', '') is null or v_von is null;
    if split_part(v_von, '@', 2) = any (v_domains) then
      v_richtung := 'aus';
      select lower(trim(a)) into v_kunde from jsonb_array_elements_text(coalesce(m -> 'an', '[]')) a
       where not (split_part(lower(trim(a)), '@', 2) = any (v_domains))
         and exists (select 1 from public.kontakte k where lower(k.email) = lower(trim(a)) and k.geloescht_am is null)
       limit 1;
    else
      v_richtung := 'ein';
      v_kunde := v_von;
    end if;
    continue when v_kunde is null;
    select k.id into v_kontakt from public.kontakte k
     where lower(k.email) = v_kunde and k.geloescht_am is null order by k.erstellt_am limit 1;
    continue when v_kontakt is null;
    continue when exists (select 1 from public.aktivitaeten a
                           where a.mail_kennung = m ->> 'kennung' and a.kontakt_id = v_kontakt);
    select v.id into v_lead from public.verkaufschancen v
     where v.kontakt_id = v_kontakt and v.geloescht_am is null order by v.eingang_am desc nulls last limit 1;
    select p.id into v_absender from public.personen p
     where lower(p.email) = case when v_richtung = 'aus' then v_von else '' end and p.geloescht_am is null;
    insert into public.aktivitaeten (art, richtung, zeitpunkt, text, person_id, kontakt_id, verkaufschance_id,
                                     mail_kennung, details)
    values ('mail', v_richtung, coalesce(nullif(m ->> 'zeitpunkt', '')::timestamptz, now()),
            concat_ws(E'\n', coalesce(nullif(m ->> 'betreff', ''), '(ohne Betreff)'), nullif(left(m ->> 'vorschau', 300), '')),
            v_absender, v_kontakt, v_lead, m ->> 'kennung',
            jsonb_build_object('von', v_von, 'an', m -> 'an', 'betreff', m ->> 'betreff', 'automatisch', true,
                               'postfach_person', p_person));
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$$;

/**
 * Outlook-Kalender einer Person für einen Zeitraum ersetzen (alte Einträge in den Papierkorb). Termine, die das
 * CRM selbst in Outlook eingetragen hat (Lead-Termine), werden ausgelassen, sonst stünden sie doppelt da.
 */
create or replace function public.kalender_abgleichen(p_person uuid, p_von timestamptz, p_bis timestamptz,
  p_eintraege jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  update public.kalender_eintraege set geloescht_am = now()
   where person_id = p_person and quelle = 'outlook' and geloescht_am is null and beginn < p_bis and ende > p_von;
  insert into public.kalender_eintraege (person_id, beginn, ende, ganztags, betreff, ort, plz, anzeige_als, quelle, extern_id, link)
  select p_person, (e ->> 'beginn')::timestamptz, (e ->> 'ende')::timestamptz, coalesce((e ->> 'ganztags')::boolean, false),
         nullif(e ->> 'betreff', ''), nullif(e ->> 'ort', ''), nullif(e ->> 'plz', ''),
         coalesce(nullif(e ->> 'anzeige_als', ''), 'busy'), 'outlook', nullif(e ->> 'extern_id', ''), nullif(e ->> 'link', '')
    from jsonb_array_elements(coalesce(p_eintraege, '[]')) e
   where not exists (select 1 from public.verkaufschancen v
                      where v.outlook ->> 'olEventId' = e ->> 'extern_id' and v.geloescht_am is null)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end
$$;

/**
 * Dateien, die nur im CRM liegen und noch nicht in SharePoint gesichert sind (V64), mit Kunde für den Ordner.
 * Fehlgeschlagene kommen frühestens nach einem Tag wieder dran (ausser sie werden mit p_ids ausdrücklich verlangt).
 */
create or replace function public.sicherung_offen(p_limit int default 10, p_ids uuid[] default null) returns table (
  id uuid, name text, ordner text, speicher_pfad text, kundennummer int, kunde text, kontakt_id uuid
)
language sql stable security definer set search_path = '' as $$
  select d.id, d.name, d.ordner, d.speicher_pfad, k.kundennummer, intern.kontaktname(k), k.id
    from public.dokumente d
    join lateral (
      select case d.bezug_tabelle
               when 'kontakte' then d.bezug_id
               when 'verkaufschancen' then (select v.kontakt_id from public.verkaufschancen v where v.id = d.bezug_id)
               when 'offerten' then (select o.kontakt_id from public.offerten o where o.id = d.bezug_id)
               when 'werkvertraege' then (select w.kontakt_id from public.werkvertraege w where w.id = d.bezug_id)
               when 'projekte' then (select p.kontakt_id from public.projekte p where p.id = d.bezug_id)
             end as kontakt_id) b on true
    join public.kontakte k on k.id = b.kontakt_id
   where d.geloescht_am is null and d.speicher = 'intern' and d.speicher_pfad is not null
     and coalesce((d.sharepoint_status ->> 'ok')::boolean, false) = false
     and (p_ids is null or d.id = any (p_ids))
     and (p_ids is not null or coalesce((d.sharepoint_status ->> 'versucht_am')::timestamptz, '-infinity') < now() - interval '1 day')
   order by d.erstellt_am
   limit p_limit
$$;

/** Vermerk am Lead, wenn ein Termin in Outlook eingetragen, geändert oder abgesagt wurde. */
create or replace function public.termin_vermerken(p_verkaufschance uuid, p_person uuid, p_text text) returns void
language sql security definer set search_path = '' as $$
  insert into public.aktivitaeten (art, text, person_id, kontakt_id, verkaufschance_id, details)
  select 'aenderung', p_text, p_person, v.kontakt_id, v.id, '{"outlook": true}'
    from public.verkaufschancen v where v.id = p_verkaufschance
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'termin_vermerken(uuid, uuid, text)', 'sicherung_offen(int, uuid[])', 'anfrage_uebernehmen(jsonb)', 'anfrage_uebersprungen(text, text)', 'messe_geloescht(text, text[])',
    'mails_vermerken(uuid, jsonb)', 'kalender_abgleichen(uuid, timestamptz, timestamptz, jsonb)']
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end
$$;
