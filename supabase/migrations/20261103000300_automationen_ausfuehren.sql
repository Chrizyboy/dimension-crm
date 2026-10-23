-- Phase 12, Teil 3: Ausführung. Der Zeitplan ruft jede Minute automationen_abarbeiten auf: Signale werden zu
-- Läufen, fällige Läufe gehen Schritt für Schritt weiter. Jeder Schritt läuft für sich (Fehler halten die anderen
-- nicht auf) und kommt ins Protokoll. Was nach aussen geht, landet im Ausgangskorb: wartend (Freigabe) oder,
-- nur wenn die Automation auf «automatisch» steht, freigegeben (Regel 6).

/**
 * Die Automation handelt mit den Rechten einer Person: wer sie zuletzt eingeschaltet oder geändert hat, sonst die
 * erste aktive Admin-Person. So gelten dieselben Regeln wie in der App (z. B. Rechnungen nur mit Recht «finanzen»).
 */
create or replace function intern.automation_als(p_person uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_person uuid;
  v_auth uuid;
begin
  select p.id, p.auth_user_id into v_person, v_auth from public.personen p
   where p.id = p_person and p.aktiv and p.geloescht_am is null and p.auth_user_id is not null;
  if v_auth is null then
    select p.id, p.auth_user_id into v_person, v_auth from public.personen p
      left join public.rollen r on r.schluessel = p.rolle
     where p.aktiv and p.geloescht_am is null and p.auth_user_id is not null
       and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}')))
     order by p.erstellt_am limit 1;
  end if;
  if v_auth is null then raise exception using errcode = 'P0001', message = 'automation.keine_person'; end if;
  perform set_config('request.jwt.claim.sub', v_auth::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_auth, 'role', 'authenticated')::text, true);
  return v_person;
end
$$;

/** Benachrichtigung an Personen; Titel und Text mit Platzhaltern. Gibt die Anzahl zurück. */
create or replace function intern.automation_melden(p_personen uuid[], p_art text, p_titel jsonb, p_text jsonb,
                                                    p_kontext jsonb, p_ziel text, p_lauf uuid) returns int
language sql security definer set search_path = '' as $$
  with neu as (
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, lauf_id)
    select pid, coalesce(p_art, 'info'),
           intern.automation_text(intern.zweisprachig(p_titel, 'de'), p_kontext),
           intern.automation_text(intern.zweisprachig(p_titel, 'fr'), p_kontext),
           nullif(intern.automation_text(intern.zweisprachig(p_text, 'de'), p_kontext), ''),
           nullif(intern.automation_text(intern.zweisprachig(p_text, 'fr'), p_kontext), ''),
           p_ziel, p_lauf
      from unnest(p_personen) pid
    returning 1)
  select count(*)::int from neu
$$;

/** Namen von Personen für das Protokoll («Anna, Beat»). */
create or replace function intern.personen_namen(p_ids uuid[]) returns text
language sql stable security definer set search_path = '' as $$
  select string_agg(p.name, ', ' order by p.name) from public.personen p where p.id = any (p_ids)
$$;

/**
 * Mail oder SMS an den Kunden über den Ausgangskorb. Gibt das Ergebnis für das Protokoll zurück.
 * Bei «freigabe» bekommt die absendende Person eine Benachrichtigung mit Link zum Entwurf.
 */
create or replace function intern.automation_nach_aussen(a public.automationen, l public.automation_laeufe, nr int,
                                                         x jsonb, ctx jsonb, p_als uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  kanal text := case when x ->> 'art' = 'sms' then 'sms' else 'mail' end;
  spr text := ctx ->> 'sprache';
  an text := case when kanal = 'sms' then ctx #>> '{kontakt,telefon}' else ctx #>> '{kontakt,email}' end;
  absender uuid := coalesce((intern.automation_empfaenger(coalesce(x -> 'absender', '["zustaendig"]'), ctx))[1], p_als);
  frei boolean := a.modus = 'automatisch';
  schluessel text := 'automation:' || l.id || ':' || nr;
  sende_ab timestamptz;
  termin timestamptz;
  art text := coalesce(x ->> 'ausgang_art', case when x ->> 'art' = 'zahlungserinnerung' then 'mahnung' else 'automation' end);
  betreff text;
  id uuid;
begin
  if an is null then
    return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', case when kanal = 'sms' then 'kein_telefon' else 'keine_mail' end);
  end if;
  if coalesce((x ->> 'werbung')::boolean, false) and coalesce((ctx #>> '{kontakt,werbesperre}')::boolean, false) then
    return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'werbesperre');
  end if;
  if x ->> 'art' = 'zahlungserinnerung' and coalesce((ctx #>> '{rechnung,offen_chf}')::numeric, 0) <= 0 then
    return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'schon_bezahlt');
  end if;
  if kanal = 'sms' and x ->> 'sende' = 'vortag_termin' and l.tabelle = 'verkaufschancen' then
    select v.termin_am into termin from public.verkaufschancen v where v.id = l.bezug_id;
    if termin is null or termin < now() then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'kein_termin');
    end if;
    -- Gleicher Schlüssel wie die SMS-Erinnerung aus Phase 8: so geht nie eine zweite SMS für denselben Termin.
    schluessel := 'sms_erinnerung:' || l.bezug_id || ':' || to_char(termin at time zone 'Europe/Zurich', 'YYYY-MM-DD"T"HH24:MI');
    art := 'sms_erinnerung';
    sende_ab := (((termin at time zone 'Europe/Zurich')::date - 1)
                 + coalesce((select (wert ->> 'uhrzeit')::time from public.einstellungen where schluessel = 'sms_erinnerung'),
                            '16:00'::time)) at time zone 'Europe/Zurich';
    if sende_ab < now() then sende_ab := null; end if;
  end if;
  betreff := intern.automation_text(intern.zweisprachig(x -> 'betreff', spr), ctx);
  begin
    id := public.ausgang_anlegen(jsonb_build_object(
      'kanal', kanal, 'art', art, 'an', an, 'betreff', betreff,
      'text', intern.automation_text(intern.zweisprachig(x -> 'text', spr), ctx), 'sprache', spr,
      'absender_person_id', absender, 'kontakt_id', ctx #>> '{kontakt,id}',
      'verkaufschance_id', case when l.tabelle = 'verkaufschancen' then l.bezug_id end,
      'offerte_id', case when l.tabelle = 'offerten' then l.bezug_id end,
      'projekt_id', case when l.tabelle = 'projekte' then l.bezug_id end,
      'bezug_tabelle', l.tabelle, 'bezug_id', l.bezug_id, 'schluessel', schluessel, 'sende_ab', sende_ab,
      'freigeben', frei));
  exception when others then
    if sqlerrm = 'ausgang.doppelt' then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'schon_im_ausgang');
    end if;
    raise;
  end;
  if not frei then
    perform intern.automation_melden(array[absender], 'info',
      jsonb_build_object('de', 'Entwurf wartet auf Freigabe: ' || coalesce(betreff, 'SMS'),
                         'fr', 'Brouillon à valider : ' || coalesce(betreff, 'SMS')),
      jsonb_build_object('de', '{Name} · ' || a.name_de, 'fr', '{Name} · ' || a.name_fr),
      ctx, intern.automation_ziel('ausgangskorb', id), l.id);
  end if;
  return jsonb_build_object('ergebnis', 'ok', 'meldung', case when frei then kanal || '_freigegeben' else kanal || '_wartet' end,
                            'werte', jsonb_build_object('an', an, 'absender', intern.personen_namen(array[absender])),
                            'ziel', intern.automation_ziel('ausgangskorb', id));
end
$$;

/** Führt eine Aktion aus (ohne Warten, Prüfen und Server-Aktionen) und gibt den Protokolleintrag zurück. */
create or replace function intern.automation_aktion(a public.automationen, l public.automation_laeufe, nr int,
                                                    x jsonb, ctx jsonb, p_als uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  art text := x ->> 'art';
  ids uuid[];
  n int;
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  v_id uuid;
  v_plz text;
  v_std uuid;
begin
  if art in ('aufgabe', 'benachrichtigung', 'dubletten', 'zielgruppe') then
    ids := intern.automation_empfaenger(coalesce(x -> 'an', '["zustaendig"]'), ctx);
    if coalesce(cardinality(ids), 0) = 0 then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'kein_empfaenger');
    end if;
  end if;

  if art = 'aufgabe' then
    insert into public.aufgaben (titel, text, faellig_am, person_id, bezug_tabelle, bezug_id, lauf_id)
    select intern.automation_text(intern.zweisprachig(x -> 'titel', coalesce(p.sprache, 'de')), ctx),
           nullif(intern.automation_text(intern.zweisprachig(x -> 'text', coalesce(p.sprache, 'de')), ctx), ''),
           v_heute + coalesce((x ->> 'faellig_tage')::int, 0), p.id, l.tabelle, l.bezug_id, l.id
      from public.personen p where p.id = any (ids);
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'aufgabe',
                              'werte', jsonb_build_object('an', intern.personen_namen(ids)), 'ziel', '/tasks');

  elsif art = 'benachrichtigung' then
    n := intern.automation_melden(ids, x ->> 'stufe', x -> 'titel', x -> 'text', ctx, ctx ->> 'ziel', l.id);
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'benachrichtigt',
                              'werte', jsonb_build_object('an', intern.personen_namen(ids)));

  elsif art in ('mail', 'sms', 'zahlungserinnerung') then
    return intern.automation_nach_aussen(a, l, nr, x, ctx, p_als);

  elsif art = 'dubletten' then
    select count(*) into n from public.moegliche_dubletten(ctx #>> '{kontakt,name}', ctx #>> '{kontakt,email}',
                                                          ctx #>> '{kontakt,telefon}', (ctx #>> '{kontakt,id}')::uuid);
    if n = 0 then return jsonb_build_object('ergebnis', 'ok', 'meldung', 'keine_dublette'); end if;
    perform intern.automation_melden(ids, 'warnung',
      jsonb_build_object('de', 'Mögliche Dublette: {Name}', 'fr', 'Doublon possible : {Name}'),
      jsonb_build_object('de', n || ' ähnliche Kontakte gefunden. Bitte prüfen und zusammenführen.',
                         'fr', n || ' contacts similaires trouvés. Merci de vérifier et fusionner.'),
      ctx, intern.automation_ziel('kontakte', (ctx #>> '{kontakt,id}')::uuid), l.id);
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'dublette', 'werte', jsonb_build_object('anzahl', n),
                              'ziel', intern.automation_ziel('kontakte', (ctx #>> '{kontakt,id}')::uuid));

  elsif art = 'zuteilen' then
    if l.tabelle <> 'verkaufschancen' then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'nur_leads');
    end if;
    if nullif(ctx #>> '{standort,id}', '') is not null then
      return jsonb_build_object('ergebnis', 'ok', 'meldung', 'schon_zugeteilt', 'werte', jsonb_build_object('standort', ctx #>> '{standort,name}'));
    end if;
    v_plz := ctx #>> '{lead,plz}';
    select s.id into v_std from public.standorte s where s.kuerzel = public.standort_fuer_plz(v_plz) and s.geloescht_am is null;
    if v_std is null then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'keine_plz');
    end if;
    update public.verkaufschancen set standort_id = v_std where id = l.bezug_id;
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'zugeteilt',
                              'werte', jsonb_build_object('standort', (select name from public.standorte where id = v_std)));

  elsif art = 'rechnung_entwurf' then
    select z.id into v_id from public.zahlungsplan z
     where z.projekt_id = coalesce(case when l.tabelle = 'projekte' then l.bezug_id end,
                                   (select r.projekt_id from public.rechnungen r where r.id = l.bezug_id))
       and z.geloescht_am is null
       and not exists (select 1 from public.rechnungen r where r.zahlungsplan_id = z.id and r.geloescht_am is null
                                                         and r.status <> 'storniert')
     order by case when x ->> 'tranche' = 'letzte' then 0 end,
              case when x ->> 'tranche' = 'letzte' then z.faellig_am end desc nulls first,
              case when x ->> 'tranche' = 'letzte' then z.betrag_rappen end,
              z.faellig_am nulls last, z.betrag_rappen desc
     limit 1;
    if v_id is null then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'keine_tranche');
    end if;
    v_id := public.rechnung_entwurf(jsonb_build_object('zahlungsplan_id', v_id));
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'rechnung_entwurf',
                              'ziel', intern.automation_ziel('rechnungen', v_id));

  elsif art = 'zielgruppe' then
    select count(*) into n from public.marketing_zielgruppe z
     where z.gruppe = 'kunde' and not z.werbesperre
       and case x ->> 'merkmal'
             when 'ohne_batterie' then not coalesce(z.batterie, false)
             when 'ohne_wallbox' then not coalesce(z.wallbox, false)
             when 'ohne_waermepumpe' then not coalesce(z.waermepumpe, false)
             when 'alt' then z.anlage_seit <= v_heute - interval '3 years'
             else false end;
    if n = 0 then return jsonb_build_object('ergebnis', 'ok', 'meldung', 'zielgruppe_leer'); end if;
    perform intern.automation_melden(ids, 'info', x -> 'titel',
      jsonb_build_object('de', n || ' Kunden passen. Zielgruppe öffnen und anschreiben.',
                         'fr', n || ' clients correspondent. Ouvrir le groupe cible et écrire.'),
      ctx, '/marketing?ansicht=anschreiben&anlage=' || (x ->> 'merkmal'), l.id);
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'zielgruppe',
                              'werte', jsonb_build_object('anzahl', n, 'an', intern.personen_namen(ids)),
                              'ziel', '/marketing?ansicht=anschreiben&anlage=' || (x ->> 'merkmal'));
  end if;
  raise exception using errcode = 'P0001', message = 'automation.aktion_unbekannt';
end
$$;

/** Protokolleintrag anhängen. */
create or replace function intern.automation_vermerk(p_lauf uuid, p_nr int, p_art text, p_eintrag jsonb) returns void
language sql security definer set search_path = '' as $$
  update public.automation_laeufe
     set protokoll = protokoll || jsonb_build_array(jsonb_build_object('nr', p_nr, 'art', p_art, 'zeit', now()) || p_eintrag),
         fehler = fehler + case when p_eintrag ->> 'ergebnis' = 'fehler' then 1 else 0 end,
         geaendert_am = now()
   where id = p_lauf
$$;

/**
 * Bringt einen Lauf so weit wie möglich: bis zum Ende, zu einem Warten oder zu einer Server-Aktion.
 * Schritt 0 prüft die Bedingungen. Ist der Bezug inzwischen im Papierkorb oder die Automation aus, endet der Lauf.
 */
create or replace function intern.automation_lauf_weiter(p_lauf uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  l public.automation_laeufe;
  a public.automationen;
  s intern.automation_signale;
  ctx jsonb;
  x jsonb;
  r jsonb;
  als uuid;
  anzahl int;
  runde int := 0;
  nicht jsonb;
begin
  select * into l from public.automation_laeufe where id = p_lauf for update skip locked;
  if not found or l.stand not in ('laeuft', 'wartet') or l.weiter_am > now() then return null; end if;
  select * into a from public.automationen where id = l.automation_id;
  select * into s from intern.automation_signale where id = l.signal_id;
  anzahl := jsonb_array_length(a.aktionen);

  if not a.aktiv or a.geloescht_am is not null then
    perform intern.automation_vermerk(l.id, l.schritt, 'ende', '{"ergebnis": "uebersprungen", "meldung": "ausgeschaltet"}');
    update public.automation_laeufe set stand = 'abgebrochen', beendet_am = now() where id = l.id;
    return 'abgebrochen';
  end if;

  begin
    als := intern.automation_als(a.ausfuehren_als);
  exception when others then
    perform intern.automation_vermerk(l.id, l.schritt, 'ende', jsonb_build_object('ergebnis', 'fehler', 'meldung', sqlerrm));
    update public.automation_laeufe set stand = 'fehler', beendet_am = now() where id = l.id;
    return 'fehler';
  end;

  loop
    runde := runde + 1;
    exit when runde > 50;
    ctx := intern.automation_kontext(l.tabelle, l.bezug_id, s.daten);

    if l.tabelle is not null and coalesce((ctx #>> array[case l.tabelle when 'verkaufschancen' then 'lead'
        when 'offerten' then 'offerte' when 'projekte' then 'projekt' when 'rechnungen' then 'rechnung'
        when 'wartungsvertraege' then 'wartung' else 'x' end, 'geloescht'])::boolean, false) then
      perform intern.automation_vermerk(l.id, l.schritt, 'ende', '{"ergebnis": "uebersprungen", "meldung": "bezug_geloescht"}');
      update public.automation_laeufe set stand = 'abgebrochen', beendet_am = now() where id = l.id;
      return 'abgebrochen';
    end if;

    if l.schritt = 0 then
      update public.automation_laeufe
         set titel = ctx ->> 'titel', kontakt_id = nullif(ctx #>> '{kontakt,id}', '')::uuid
       where id = l.id;
      nicht := intern.automation_nicht_erfuellt(ctx, a.bedingungen);
      if nicht is not null then
        perform intern.automation_vermerk(l.id, 0, 'bedingungen', jsonb_build_object('ergebnis', 'uebersprungen',
          'meldung', 'bedingung', 'werte', nicht || jsonb_build_object('ist', intern.automation_wert(ctx, nicht ->> 'feld'))));
        update public.automation_laeufe set stand = 'uebersprungen', beendet_am = now() where id = l.id;
        return 'uebersprungen';
      end if;
      perform intern.automation_vermerk(l.id, 0, 'bedingungen', '{"ergebnis": "ok"}');
      update public.automation_laeufe set schritt = 1 where id = l.id returning * into l;
      continue;
    end if;

    if l.schritt > anzahl then
      update public.automation_laeufe set stand = case when fehler > 0 then 'fehler' else 'fertig' end, beendet_am = now()
       where id = l.id returning * into l;
      return l.stand;
    end if;

    x := a.aktionen -> (l.schritt - 1);

    if x ->> 'art' = 'warten' then
      if l.stand = 'wartet' then
        update public.automation_laeufe set stand = 'laeuft', schritt = schritt + 1 where id = l.id returning * into l;
        continue;
      end if;
      update public.automation_laeufe
         set stand = 'wartet', weiter_am = now() + make_interval(days => coalesce((x ->> 'tage')::int, 1))
       where id = l.id returning * into l;
      perform intern.automation_vermerk(l.id, l.schritt, 'warten',
        jsonb_build_object('ergebnis', 'wartet', 'werte', jsonb_build_object('bis', l.weiter_am)));
      return 'wartet';
    end if;

    if x ->> 'art' = 'pruefen' then
      nicht := intern.automation_nicht_erfuellt(ctx, x -> 'bedingungen');
      if nicht is not null then
        perform intern.automation_vermerk(l.id, l.schritt, 'pruefen', jsonb_build_object('ergebnis', 'uebersprungen',
          'meldung', 'erledigt_vorher', 'werte', nicht || jsonb_build_object('ist', intern.automation_wert(ctx, nicht ->> 'feld'))));
        update public.automation_laeufe set stand = 'fertig', beendet_am = now() where id = l.id;
        return 'fertig';
      end if;
      perform intern.automation_vermerk(l.id, l.schritt, 'pruefen', '{"ergebnis": "ok"}');
      update public.automation_laeufe set schritt = schritt + 1 where id = l.id returning * into l;
      continue;
    end if;

    if x ->> 'art' in ('outlook_termin', 'sharepoint_ordner', 'abaninja_kunde') then
      update public.automation_laeufe set stand = 'server' where id = l.id;
      perform intern.automation_vermerk(l.id, l.schritt, x ->> 'art', '{"ergebnis": "server"}');
      return 'server';
    end if;

    begin
      r := intern.automation_aktion(a, l, l.schritt, x, ctx, als);
    exception when others then
      r := jsonb_build_object('ergebnis', 'fehler', 'meldung', sqlerrm);
    end;
    perform intern.automation_vermerk(l.id, l.schritt, x ->> 'art', r);
    update public.automation_laeufe set schritt = schritt + 1 where id = l.id returning * into l;
  end loop;
  return l.stand;
end
$$;

/** Signale zu Läufen machen: je eingeschaltete Automation mit diesem Auslöser, die vor dem Signal aktiv war. */
create or replace function intern.automationen_verteilen(p_limit int default 200) returns int
language plpgsql security definer set search_path = '' as $$
declare
  s intern.automation_signale;
  n int := 0;
  m int;
begin
  for s in select * from intern.automation_signale where not verteilt order by id limit p_limit for update skip locked loop
    if not s.basis then
      insert into public.automation_laeufe (automation_id, signal_id, ereignis, tabelle, bezug_id)
      select a.id, s.id, s.ereignis, s.tabelle, s.bezug_id
        from public.automationen a
       where a.aktiv and a.geloescht_am is null and a.ausloeser = s.ereignis and a.aktiv_seit <= s.erstellt_am
      on conflict (automation_id, signal_id) do nothing;
      get diagnostics m = row_count;
      n := n + m;
    end if;
    update intern.automation_signale set verteilt = true where id = s.id;
  end loop;
  return n;
end
$$;

/**
 * Einstieg für den Zeitplan (nur Server): Durchsicht (wenn fällig), verteilen, fällige Läufe weiterbringen.
 * Gibt Zahlen für das Zeitplan-Protokoll zurück.
 */
create or replace function public.automationen_abarbeiten(p_limit int default 50) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_neu int;
  v_signale int := 0;
  v_laeufe int := 0;
  v_lauf uuid;
begin
  v_signale := intern.automationen_durchsehen();
  v_neu := intern.automationen_verteilen();
  for v_lauf in select id from public.automation_laeufe
                 where stand in ('laeuft', 'wartet') and weiter_am <= now() order by weiter_am limit p_limit loop
    perform intern.automation_lauf_weiter(v_lauf);
    v_laeufe := v_laeufe + 1;
  end loop;
  return jsonb_build_object('signale', v_signale, 'neue_laeufe', v_neu, 'schritte', v_laeufe,
                            'server', (select count(*) from public.automation_laeufe where stand = 'server'));
end
$$;

/** Server-Aktionen, die auf die Edge Function warten (Outlook, SharePoint, AbaNinja), mit Kontext. */
create or replace function public.automation_server_offen(p_limit int default 10) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'lauf_id', l.id, 'schritt', l.schritt, 'art', a.aktionen -> (l.schritt - 1) ->> 'art',
           'aktion', a.aktionen -> (l.schritt - 1), 'tabelle', l.tabelle, 'bezug_id', l.bezug_id,
           'person_id', coalesce(nullif(intern.automation_kontext(l.tabelle, l.bezug_id) #>> '{zustaendig,id}', '')::uuid,
                                 a.ausfuehren_als),
           'kontakt_id', l.kontakt_id) order by l.geaendert_am), '[]')
    from (select * from public.automation_laeufe where stand = 'server' order by geaendert_am limit p_limit) l
    join public.automationen a on a.id = l.automation_id
$$;

/** Ergebnis einer Server-Aktion eintragen; der Lauf geht danach mit dem nächsten Schritt weiter. */
create or replace function public.automation_server_ergebnis(p_lauf uuid, p_schritt int, p_ergebnis text,
                                                             p_meldung text, p_werte jsonb default '{}',
                                                             p_ziel text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  l public.automation_laeufe;
begin
  select * into l from public.automation_laeufe where id = p_lauf for update;
  if not found or l.stand <> 'server' or l.schritt <> p_schritt then return; end if;
  if p_ergebnis not in ('ok', 'fehler', 'uebersprungen') then
    raise exception using errcode = 'P0001', message = 'automation.ergebnis';
  end if;
  perform intern.automation_vermerk(l.id, l.schritt,
    (select a.aktionen -> (l.schritt - 1) ->> 'art' from public.automationen a where a.id = l.automation_id),
    jsonb_build_object('ergebnis', p_ergebnis, 'meldung', p_meldung, 'werte', coalesce(p_werte, '{}'), 'ziel', p_ziel));
  update public.automation_laeufe set stand = 'laeuft', schritt = schritt + 1, weiter_am = now() where id = l.id;
end
$$;

revoke execute on function public.automationen_abarbeiten(int) from public, anon, authenticated;
revoke execute on function public.automation_server_offen(int) from public, anon, authenticated;
revoke execute on function public.automation_server_ergebnis(uuid, int, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.automationen_abarbeiten(int) to service_role;
grant execute on function public.automation_server_offen(int) to service_role;
grant execute on function public.automation_server_ergebnis(uuid, int, text, text, jsonb, text) to service_role;

-- Eine Zahlungserinnerung zählt als Mahnung erst, wenn sie wirklich gesendet ist: dann steigt die Mahnstufe
-- (gleiche Regel wie «Mahnen» in Phase 10) und die nächste Stufe wird erst nach der neuen Mahnfrist fällig.
create or replace function intern.mahnung_gesendet() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r public.rechnungen;
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  v_frist date;
begin
  if new.status = 'gesendet' and old.status is distinct from 'gesendet' and new.art = 'mahnung'
     and new.bezug_tabelle = 'rechnungen' then
    select * into r from public.rechnungen where id = new.bezug_id and geloescht_am is null for update;
    if found and r.status in ('gestellt', 'teilbezahlt') and r.mahnstufe < 3 then
      v_frist := v_heute + coalesce((intern.fin_cfg() ->> 'mahnfrist_tage')::int, 10);
      update public.rechnungen set mahnstufe = r.mahnstufe + 1, gemahnt_am = v_heute, mahnfrist = v_frist where id = r.id;
      if r.zahlungsplan_id is not null then
        update public.zahlungsplan set mahnstufe = r.mahnstufe + 1, mahnfrist = v_frist where id = r.zahlungsplan_id;
      end if;
    end if;
  end if;
  return new;
end
$$;
create trigger mahnung_gesendet after update of status on public.ausgangskorb
  for each row execute function intern.mahnung_gesendet();

-- Eingeschaltet wird «ab jetzt»: aktiv_seit merken. Wer einschaltet oder ändert, unter dessen Rechten läuft sie.
create or replace function intern.automation_vor_speichern() returns trigger
language plpgsql set search_path = '' as $$
declare
  x jsonb;
begin
  if new.ausloeser not in (select e ->> 'schluessel' from jsonb_array_elements(public.automation_katalog() -> 'ereignisse') e) then
    raise exception using errcode = 'P0001', message = 'automation.ausloeser_unbekannt';
  end if;
  if jsonb_typeof(new.aktionen) <> 'array' or jsonb_array_length(new.aktionen) = 0 then
    raise exception using errcode = 'P0001', message = 'automation.keine_aktion';
  end if;
  if jsonb_typeof(new.bedingungen) <> 'array' then
    raise exception using errcode = 'P0001', message = 'automation.bedingungen';
  end if;
  for x in select * from jsonb_array_elements(new.aktionen) loop
    if x ->> 'art' not in (select k ->> 'art' from jsonb_array_elements(public.automation_katalog() -> 'aktionen') k) then
      raise exception using errcode = 'P0001', message = 'automation.aktion_unbekannt';
    end if;
    if x ->> 'art' = 'warten' and coalesce((x ->> 'tage')::int, 0) < 1 then
      raise exception using errcode = 'P0001', message = 'automation.warten_tage';
    end if;
  end loop;
  if new.aktiv and (tg_op = 'INSERT' or not old.aktiv) then new.aktiv_seit := now(); end if;
  if not new.aktiv then new.aktiv_seit := null; end if;
  new.ausfuehren_als := coalesce(intern.meine_person_id(), new.ausfuehren_als);
  return new;
end
$$;
create trigger vor_speichern before insert or update on public.automationen
  for each row execute function intern.automation_vor_speichern();

-- Benachrichtigungen: gelesen und ausgeblendet nur für die eigenen.
create or replace function public.benachrichtigungen_gelesen(p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  update public.benachrichtigungen set gelesen_am = now()
   where person_id = intern.meine_person_id() and gelesen_am is null and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end
$$;

create or replace function public.benachrichtigung_ausblenden(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.benachrichtigungen set ausgeblendet_am = now(), gelesen_am = coalesce(gelesen_am, now())
   where id = p_id and person_id = intern.meine_person_id()
$$;
revoke execute on function public.benachrichtigungen_gelesen(uuid[]) from public, anon;
revoke execute on function public.benachrichtigung_ausblenden(uuid) from public, anon;
grant execute on function public.benachrichtigungen_gelesen(uuid[]) to authenticated;
grant execute on function public.benachrichtigung_ausblenden(uuid) to authenticated;
