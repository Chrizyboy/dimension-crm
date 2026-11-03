-- Automationen vollständig (Entscheid 0044): Übersicht (läuft der Motor, was wurde erledigt, was braucht
-- Aufmerksamkeit), Kennzahlen je Automation, Änderungsverlauf und der Probelauf mit einem echten Datensatz
-- (rechnet alles aus, legt aber nichts an und sendet nichts). Nur Administration und Geschäftsleitung.

create or replace function intern.automation_sehen() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (intern.hat_recht('admin') or intern.hat_recht('gl')) then
    raise exception using errcode = '42501', message = 'recht.fehlt';
  end if;
end
$$;

/** Übersicht: Zustand, Wirkung der letzten 7 Tage (mit geschätzter Zeit), Probleme und die nächsten 24 Stunden. */
create or replace function public.automation_uebersicht() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  cfg jsonb := intern.automation_cfg();
  min jsonb := coalesce(cfg -> 'minuten', '{}');
  schritte jsonb;
  vorwoche int;
begin
  perform intern.automation_sehen();
  -- Ergebnisse der Schritte: Meldungen wie «aufgabe», «mail_wartet», «rechnung_entwurf» auf eine Art abbilden.
  with e as (
    select l.id, l.automation_id, l.titel, l.tabelle, l.bezug_id, s
      from public.automation_laeufe l, jsonb_array_elements(l.protokoll) s
     where l.geaendert_am > now() - interval '14 days')
  select jsonb_build_object(
    'wirkung', coalesce((select jsonb_object_agg(art, n) from (
        select case when s ->> 'meldung' like 'mail%' then 'mail' when s ->> 'meldung' like 'sms%' then 'sms'
                    when s ->> 'art' in ('outlook_termin', 'sharepoint_ordner', 'abaninja_kunde') then 'server'
                    else s ->> 'meldung' end as art, count(*) as n
          from e where s ->> 'ergebnis' = 'ok' and (s ->> 'zeit')::timestamptz > now() - interval '7 days'
         group by 1) w), '{}'),
    'mails_wartend', (select count(*) from public.ausgangskorb k where k.geloescht_am is null and k.status = 'wartet'
                        and k.schluessel like 'automation:%'),
    'mails_freigegeben', (select count(*) from e where s ->> 'meldung' in ('mail_wartet', 'sms_wartet')
                            and (s ->> 'zeit')::timestamptz > now() - interval '7 days'
                            and exists (select 1 from public.ausgangskorb k where k.schluessel = 'automation:' || e.id || ':' || (s ->> 'nr')
                                          and k.status in ('freigegeben', 'wird_gesendet', 'gesendet'))),
    'rechnungen_rappen', (select coalesce(sum(r.total_rappen), 0) from public.rechnungen r
                            where r.geloescht_am is null and r.status = 'entwurf'
                              and exists (select 1 from e where s ->> 'meldung' = 'rechnung_entwurf'
                                            and s ->> 'ziel' like '%' || r.id || '%')),
    'probleme', (select count(*) from e where s ->> 'ergebnis' = 'fehler' and (s ->> 'zeit')::timestamptz > now() - interval '7 days'),
    'probleme_vorwoche', (select count(*) from e where s ->> 'ergebnis' = 'fehler'
                            and (s ->> 'zeit')::timestamptz between now() - interval '14 days' and now() - interval '7 days'),
    'aufmerksamkeit', coalesce((select jsonb_agg(p order by p ->> 'zeit' desc) from (
        select jsonb_build_object('lauf_id', e.id, 'automation_id', e.automation_id, 'titel', e.titel,
                 'ziel', intern.automation_ziel(e.tabelle, e.bezug_id), 'nr', s ->> 'nr', 'art', s ->> 'art',
                 'ergebnis', s ->> 'ergebnis', 'meldung', s ->> 'meldung', 'werte', s -> 'werte', 'zeit', s ->> 'zeit') p
          from e
         where (s ->> 'zeit')::timestamptz > now() - interval '7 days'
           and (s ->> 'ergebnis' = 'fehler' or s ->> 'meldung' in ('keine_mail', 'kein_telefon', 'kein_empfaenger',
                                                                    'nicht_verbunden', 'keine_verbindung'))
           and not exists (select 1 from public.automation_laeufe x where x.id = e.id and x.nur_schritt is not null)
         order by s ->> 'zeit' desc limit 20) q), '[]'))
  into schritte;

  return schritte || jsonb_build_object(
    'motor', (select jsonb_build_object('zuletzt_am', z.zuletzt_am, 'ok', z.ok, 'meldung', z.meldung)
                from intern.zeitplan_laeufe z where z.job = 'automationen'),
    'aktiv', (select count(*) from public.automationen a where a.geloescht_am is null and a.aktiv),
    'alle', (select count(*) from public.automationen a where a.geloescht_am is null),
    'wartend', (select count(*) from public.automation_laeufe l where l.stand in ('wartet', 'server')),
    'minuten', min,
    'ausgeschaltet', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name_de', a.name_de, 'name_fr', a.name_fr,
        'seit', a.geaendert_am, 'von', (select p.name from public.aenderungsprotokoll x
                                          join public.personen p on p.auth_user_id = x.benutzer
                                         where x.tabelle = 'automationen' and x.datensatz = a.id
                                         order by x.zeitpunkt desc limit 1)))
        from public.automationen a where a.geloescht_am is null and not a.aktiv), '[]'),
    'mails_alt', (select count(*) from public.ausgangskorb k where k.geloescht_am is null and k.status = 'wartet'
                    and k.schluessel like 'automation:%' and k.erstellt_am < now() - interval '2 days'),
    'naechste', coalesce((select jsonb_agg(to_jsonb(g) order by g.weiter_am) from (
        select * from public.automation_geplant() x where x.weiter_am < now() + interval '24 hours' and x.stand = 'wartet'
         limit 8) g), '[]'));
end
$$;

/** Kennzahlen je Automation (30 Tage): Läufe, mit Fehler, zuletzt, wartend. */
create or replace function public.automation_kennzahlen()
returns table (automation_id uuid, laeufe int, mit_fehler int, zuletzt_am timestamptz, wartend int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform intern.automation_sehen();
  return query
  select a.id,
         count(l.id) filter (where l.erstellt_am > now() - interval '30 days')::int,
         count(l.id) filter (where l.erstellt_am > now() - interval '30 days' and l.fehler > 0)::int,
         max(l.geaendert_am),
         count(l.id) filter (where l.stand in ('wartet', 'server', 'laeuft'))::int
    from public.automationen a
    left join public.automation_laeufe l on l.automation_id = a.id
   where a.geloescht_am is null
   group by a.id;
end
$$;

/** Wer hat eine Automation wann wie geändert (aus dem Änderungsprotokoll, die letzten 20). */
create or replace function public.automation_aenderungen(p_id uuid)
returns table (zeitpunkt timestamptz, person text, aktion text, felder text[])
language plpgsql stable security definer set search_path = '' as $$
begin
  perform intern.automation_sehen();
  return query
  select x.zeitpunkt, coalesce(p.name, 'System'), x.aktion,
         array(select k from jsonb_object_keys(coalesce(x.nachher, '{}')) k
                where k not in ('geaendert_am', 'erstellt_am', 'ausfuehren_als', 'aktiv_seit')
                  and (x.vorher is null or x.vorher -> k is distinct from x.nachher -> k)
                  and x.aktion <> 'erstellt')
    from public.aenderungsprotokoll x
    left join public.personen p on p.auth_user_id = x.benutzer
   where x.tabelle = 'automationen' and x.datensatz = p_id
   order by x.zeitpunkt desc limit 20;
end
$$;

/** Datensätze für den Probelauf: die neuesten zur Tabelle des Auslösers, mit Titel. */
create or replace function public.automation_probe_datensaetze(p_tabelle text)
returns table (id uuid, titel text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform intern.automation_sehen();
  if p_tabelle not in ('verkaufschancen', 'offerten', 'projekte', 'rechnungen', 'wartungsvertraege', 'service_faelle',
                       'rapporte', 'bestellungen') then
    return;
  end if;
  return query execute format(
    'select t.id, coalesce(intern.automation_kontext(%L, t.id) ->> ''titel'', t.id::text)
       from public.%I t where t.geloescht_am is null order by t.erstellt_am desc limit 25', p_tabelle, p_tabelle);
end
$$;

/**
 * Probelauf: rechnet eine Automation (auch ungespeichert) für einen Datensatz durch, ohne etwas anzulegen oder zu
 * senden. Je Schritt: wann, an wen, was (Texte mit eingesetzten Platzhaltern in der Sprache des Kunden), Hinweise
 * (Abwesenheit, keine Adresse, Werbesperre, Versandfenster, «wird erst dann geprüft»).
 */
create or replace function public.automation_probelauf(p jsonb, p_tabelle text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  ctx jsonb;
  spr text;
  t timestamptz := now();
  x jsonb;
  nr int := 0;
  aus jsonb := '[]';
  nicht jsonb;
  ids uuid[];
  an text;
  hinweis text;
  fenster jsonb := p -> 'versandfenster';
begin
  perform intern.automation_sehen();
  ctx := intern.automation_kontext(p_tabelle, p_id, '{}');
  spr := coalesce(ctx ->> 'sprache', 'de');
  nicht := intern.automation_nicht_erfuellt(ctx, p -> 'bedingungen');
  aus := aus || jsonb_build_array(jsonb_build_object('nr', 0, 'art', 'bedingungen', 'wann', t,
    'ergebnis', case when nicht is null then 'ok' else 'uebersprungen' end,
    'werte', case when nicht is null then null else nicht || jsonb_build_object('ist', intern.automation_wert(ctx, nicht ->> 'feld')) end));
  if nicht is not null then return jsonb_build_object('titel', ctx ->> 'titel', 'sprache', spr, 'schritte', aus); end if;

  for x in select * from jsonb_array_elements(coalesce(p -> 'aktionen', '[]')) loop
    nr := nr + 1;
    hinweis := null;
    an := null;
    if x ->> 'art' = 'warten' then
      t := intern.automation_warte_bis(x, t);
      aus := aus || jsonb_build_array(jsonb_build_object('nr', nr, 'art', 'warten', 'wann', t, 'ergebnis', 'wartet'));
      continue;
    end if;
    if x ->> 'art' = 'pruefen' then
      nicht := intern.automation_nicht_erfuellt(ctx, x -> 'bedingungen');
      aus := aus || jsonb_build_array(jsonb_build_object('nr', nr, 'art', 'pruefen', 'wann', t,
        'ergebnis', case when nicht is null then 'ok' else 'uebersprungen' end,
        'meldung', case when t > now() + interval '1 minute' then 'erst_dann' end,
        'werte', case when nicht is null then null else nicht || jsonb_build_object('ist', intern.automation_wert(ctx, nicht ->> 'feld')) end));
      continue;
    end if;
    if x ->> 'art' in ('mail', 'sms', 'zahlungserinnerung') then
      an := case when x ->> 'art' = 'sms' then ctx #>> '{kontakt,telefon}' else ctx #>> '{kontakt,email}' end;
      if coalesce(x ->> 'sende', '') <> 'vortag_termin' then
        if intern.automation_im_fenster(fenster, t) > t then hinweis := 'versandfenster'; end if;
        t := intern.automation_im_fenster(fenster, t);
      end if;
      ids := intern.automation_empfaenger(coalesce(x -> 'absender', '["zustaendig"]'), ctx);
      if an is null then hinweis := case when x ->> 'art' = 'sms' then 'kein_telefon' else 'keine_mail' end;
      elsif coalesce((x ->> 'werbung')::boolean, false) and coalesce((ctx #>> '{kontakt,werbesperre}')::boolean, false) then
        hinweis := 'werbesperre';
      end if;
    elsif x ->> 'art' in ('aufgabe', 'benachrichtigung', 'dubletten', 'zielgruppe') then
      ids := intern.automation_empfaenger(coalesce(x -> 'an', '["zustaendig"]'), ctx);
      if coalesce(cardinality(ids), 0) = 0 then hinweis := 'kein_empfaenger'; end if;
    else
      ids := null;
    end if;
    if hinweis is null and ids is not null and exists (
        select 1 from public.abwesenheiten w where w.person_id = ids[1] and w.geloescht_am is null
           and (t at time zone 'Europe/Zurich')::date between w.von and w.bis) then
      hinweis := 'abwesend';
    end if;
    aus := aus || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('nr', nr, 'art', x ->> 'art', 'wann', t,
      'ergebnis', case when hinweis in ('keine_mail', 'kein_telefon', 'werbesperre', 'kein_empfaenger') then 'uebersprungen' else 'ok' end,
      'meldung', hinweis, 'an', an, 'personen', intern.personen_namen(ids),
      'betreff', intern.automation_text(intern.zweisprachig(coalesce(x -> 'betreff', x -> 'titel'), spr), ctx),
      'text', intern.automation_text(intern.zweisprachig(x -> 'text', spr), ctx),
      'faellig', case when x ? 'faellig_tage' then ((t at time zone 'Europe/Zurich')::date + (x ->> 'faellig_tage')::int) end)));
  end loop;
  return jsonb_build_object('titel', ctx ->> 'titel', 'sprache', spr, 'schritte', aus);
end
$$;

revoke execute on function public.automation_uebersicht(), public.automation_kennzahlen(), public.automation_aenderungen(uuid),
  public.automation_probe_datensaetze(text), public.automation_probelauf(jsonb, text, uuid) from public, anon;
grant execute on function public.automation_uebersicht(), public.automation_kennzahlen(), public.automation_aenderungen(uuid),
  public.automation_probe_datensaetze(text), public.automation_probelauf(jsonb, text, uuid) to authenticated;
