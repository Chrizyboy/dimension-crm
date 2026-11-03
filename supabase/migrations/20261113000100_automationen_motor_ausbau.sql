-- Automationen vollständig (Chris 2.11.2026, Entscheid 0044): der Motor kennt Versandfenster, Kontakt-Pause,
-- Wartezeiten in Arbeitstagen, einen «sonst»-Zweig beim Prüfen, Ersatz-Aufgabe ohne Mail-Adresse, die neuen Aktionen
-- «Wiedervorlage» und «Notiz», von Hand gestoppte Läufe (mit Grund) und das Wiederholen eines einzelnen Schritts.
-- Nur intern.automation_lauf_weiter wird neu gefasst; automation_aktion, _kontext, _katalog bleiben unberührt,
-- damit parallele Ausbauten (Modul-Prüfung) sich nicht gegenseitig überschreiben.

-- Läufe: «gestoppt» = von einer Person für diesen Datensatz angehalten (mit Grund, fortsetzbar).
alter table public.automation_laeufe drop constraint if exists automation_laeufe_stand_check;
alter table public.automation_laeufe add constraint automation_laeufe_stand_check
  check (stand in ('laeuft', 'wartet', 'server', 'fertig', 'uebersprungen', 'fehler', 'abgebrochen', 'gestoppt'));
alter table public.automation_laeufe
  add column if not exists gestoppt_grund text,
  add column if not exists gestoppt_von   uuid references public.personen (id),
  add column if not exists nur_schritt    int;
comment on column public.automation_laeufe.nur_schritt is
  'Wiederholen: nur dieser eine Schritt läuft noch einmal, danach ist der Lauf wieder zu Ende.';

-- Je Automation abweichend vom Standard (null = Standard aus einstellungen.automationen).
alter table public.automationen
  add column if not exists versandfenster     jsonb,
  add column if not exists kontakt_pause_tage int check (kontakt_pause_tage between 0 and 60);
comment on column public.automationen.versandfenster is
  '{"tage": [1..7 ISO], "von": "08:00", "bis": "18:00"} oder {"immer": true}; null = Standard der Einstellungen.';

-- Standardwerte (Chris 2.11.2026: Mo–Fr 08:00–18:00). Vorhandene Werte bleiben.
update public.einstellungen set wert = jsonb_build_object(
    'versandfenster', jsonb_build_object('tage', jsonb_build_array(1, 2, 3, 4, 5), 'von', '08:00', 'bis', '18:00'),
    'kontakt_pause_tage', 3,
    'lead_ohne_kontakt_tage', 5,
    'garantie_vorlauf_tage', 60,
    'minuten', jsonb_build_object('aufgabe', 5, 'benachrichtigt', 1, 'mail', 6, 'sms', 2, 'rechnung_entwurf', 15,
                                  'dublette', 3, 'zugeteilt', 2, 'wiedervorlage', 2, 'notiz', 2, 'server', 4),
    'feiertage', jsonb_build_array(
      '2026-01-01', '2026-01-02', '2026-04-03', '2026-04-06', '2026-05-14', '2026-05-25', '2026-08-01',
      '2026-12-25', '2026-12-26', '2027-01-01', '2027-01-02', '2027-03-26', '2027-03-29', '2027-05-06',
      '2027-05-17', '2027-08-01', '2027-12-25', '2027-12-26')) || wert
 where schluessel = 'automationen';

/** Einstellungen der Automationen (ein Ort, damit Motor, Probelauf und Übersicht dasselbe lesen). */
create or replace function intern.automation_cfg() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select wert from public.einstellungen where schluessel = 'automationen'), '{}')
$$;

/** Datum plus n Arbeitstage: ohne Wochenende und ohne die Feiertage aus den Einstellungen. */
create or replace function intern.automation_arbeitstage_plus(p_datum date, p_tage int) returns date
language plpgsql stable set search_path = '' as $$
declare
  frei jsonb := coalesce(intern.automation_cfg() -> 'feiertage', '[]');
  d date := p_datum;
  n int := 0;
begin
  while n < greatest(p_tage, 0) loop
    d := d + 1;
    if extract(isodow from d) < 6 and not frei ? to_char(d, 'YYYY-MM-DD') then n := n + 1; end if;
  end loop;
  return d;
end
$$;

/** Ende einer Wartezeit: Tage oder Arbeitstage ab jetzt, gleiche Uhrzeit (Zürich). */
create or replace function intern.automation_warte_bis(p_x jsonb, p_ab timestamptz default now()) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare
  tage int := coalesce((p_x ->> 'tage')::int, 1);
  lokal timestamp := p_ab at time zone 'Europe/Zurich';
begin
  if coalesce((p_x ->> 'arbeitstage')::boolean, false) then
    return (intern.automation_arbeitstage_plus(lokal::date, tage) + lokal::time) at time zone 'Europe/Zurich';
  end if;
  return p_ab + make_interval(days => tage);
end
$$;

/**
 * Nächster erlaubter Zeitpunkt für eine Nachricht an Kunden ab p_ab (Versandfenster der Automation oder Standard).
 * Feiertage gelten auch hier. Gibt p_ab zurück, wenn es schon im Fenster liegt.
 */
create or replace function intern.automation_im_fenster(p_fenster jsonb, p_ab timestamptz default now()) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare
  f jsonb := coalesce(p_fenster, intern.automation_cfg() -> 'versandfenster');
  frei jsonb := coalesce(intern.automation_cfg() -> 'feiertage', '[]');
  lokal timestamp := p_ab at time zone 'Europe/Zurich';
  von time;
  bis time;
  d date;
  i int := 0;
begin
  if f is null or coalesce((f ->> 'immer')::boolean, false) then return p_ab; end if;
  von := coalesce(f ->> 'von', '08:00')::time;
  bis := coalesce(f ->> 'bis', '18:00')::time;
  d := lokal::date;
  loop
    if (f -> 'tage') @> to_jsonb(extract(isodow from d)::int) and not frei ? to_char(d, 'YYYY-MM-DD') then
      if d > lokal::date then return (d + von) at time zone 'Europe/Zurich'; end if;
      if lokal::time < von then return (d + von) at time zone 'Europe/Zurich'; end if;
      if lokal::time < bis then return p_ab; end if;
    end if;
    d := d + 1;
    i := i + 1;
    exit when i > 30;
  end loop;
  return p_ab;
end
$$;

/**
 * Kontakt-Pause: frühester Zeitpunkt, an dem dieser Kontakt wieder eine automatische Nachricht bekommen darf
 * (höchstens eine in N Tagen). Zahlungserinnerungen und die SMS am Vortag eines Termins zählen nicht (Pflicht).
 */
create or replace function intern.automation_kontakt_frei_ab(p_kontakt uuid, p_tage int, p_lauf uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select max(k.erstellt_am) + make_interval(days => p_tage)
    from public.ausgangskorb k
   where p_kontakt is not null and coalesce(p_tage, 0) > 0
     and k.kontakt_id = p_kontakt and k.geloescht_am is null and k.art = 'automation'
     and k.schluessel like 'automation:%' and k.schluessel not like 'automation:' || p_lauf || ':%'
     and coalesce(k.status, '') not in ('verworfen')
     and k.erstellt_am > now() - make_interval(days => p_tage)
$$;

/** Wiedervorlage oder Notiz (neue Aktionen); die übrigen Aktionen bleiben in intern.automation_aktion. */
create or replace function intern.automation_aktion_ausbau(l public.automation_laeufe, x jsonb, ctx jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_lead uuid;
  v_datum date;
  v_text text := intern.automation_text(intern.zweisprachig(x -> 'text', coalesce(ctx ->> 'sprache', 'de')), ctx);
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
begin
  v_lead := case l.tabelle
    when 'verkaufschancen' then l.bezug_id
    when 'offerten' then (select o.verkaufschance_id from public.offerten o where o.id = l.bezug_id) end;
  if x ->> 'art' = 'wiedervorlage' then
    if v_lead is null then return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'kein_lead'); end if;
    v_datum := case when coalesce((x ->> 'arbeitstage')::boolean, false)
                    then intern.automation_arbeitstage_plus(v_heute, coalesce((x ->> 'tage')::int, 90))
                    else v_heute + coalesce((x ->> 'tage')::int, 90) end;
    update public.verkaufschancen set wiedervorlage_am = v_datum, wiedervorlage_grund = nullif(v_text, '')
     where id = v_lead and geloescht_am is null;
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'wiedervorlage',
                              'werte', jsonb_build_object('am', intern.datum_text(v_datum)),
                              'ziel', intern.automation_ziel('verkaufschancen', v_lead));
  end if;
  -- Notiz in die Zeitachse des Kunden (und des Leads/Projekts), damit alle sehen, was automatisch passiert ist.
  insert into public.aktivitaeten (art, text, kontakt_id, verkaufschance_id, projekt_id, details)
  values ('notiz', coalesce(nullif(v_text, ''), '–'), nullif(ctx #>> '{kontakt,id}', '')::uuid, v_lead,
          case when l.tabelle = 'projekte' then l.bezug_id end, jsonb_build_object('lauf_id', l.id));
  return jsonb_build_object('ergebnis', 'ok', 'meldung', 'notiz');
end
$$;

/** Lauf zu Ende bringen: fertig oder Fehler, je nach Fehlerzahl. */
create or replace function intern.automation_lauf_ende(p_lauf uuid) returns text
language sql security definer set search_path = '' as $$
  update public.automation_laeufe
     set stand = case when fehler > 0 then 'fehler' else 'fertig' end, beendet_am = now(), nur_schritt = null
   where id = p_lauf
  returning stand
$$;

/**
 * Bringt einen Lauf so weit wie möglich: bis zum Ende, zu einem Warten oder zu einer Server-Aktion.
 * Schritt 0 prüft die Bedingungen. Ist der Bezug inzwischen im Papierkorb oder die Automation aus, endet der Lauf.
 * Neu: Nachrichten an Kunden nur im Versandfenster und mit Kontakt-Pause, Warten in Arbeitstagen, «sonst» beim
 * Prüfen, Ersatz-Aufgabe ohne Adresse, Wiedervorlage/Notiz, Wiederholen eines einzelnen Schritts.
 */
create or replace function intern.automation_lauf_weiter(p_lauf uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  l public.automation_laeufe;
  a public.automationen;
  s intern.automation_signale;
  cfg jsonb := intern.automation_cfg();
  ctx jsonb;
  x jsonb;
  r jsonb;
  als uuid;
  anzahl int;
  runde int := 0;
  nicht jsonb;
  ab timestamptz;
  frei_ab timestamptz;
  ersatz jsonb;
begin
  select * into l from public.automation_laeufe where id = p_lauf for update skip locked;
  if not found or l.stand not in ('laeuft', 'wartet') or l.weiter_am > now() then return null; end if;
  select * into a from public.automationen where id = l.automation_id;
  select * into s from intern.automation_signale where id = l.signal_id;
  anzahl := jsonb_array_length(a.aktionen);

  if (not a.aktiv or a.geloescht_am is not null) and l.nur_schritt is null then
    perform intern.automation_vermerk(l.id, l.schritt, 'ende', '{"ergebnis": "uebersprungen", "meldung": "ausgeschaltet"}');
    update public.automation_laeufe set stand = 'abgebrochen', beendet_am = now() where id = l.id;
    return 'abgebrochen';
  end if;

  begin
    als := intern.automation_als(a.ausfuehren_als);
  exception when others then
    perform intern.automation_vermerk(l.id, l.schritt, 'ende', jsonb_build_object('ergebnis', 'fehler', 'meldung', sqlerrm));
    update public.automation_laeufe set stand = 'fehler', beendet_am = now(), nur_schritt = null where id = l.id;
    return 'fehler';
  end;

  loop
    runde := runde + 1;
    exit when runde > 50;
    ctx := intern.automation_kontext(l.tabelle, l.bezug_id, s.daten);

    if l.nur_schritt is not null and l.schritt > l.nur_schritt then
      return intern.automation_lauf_ende(l.id);
    end if;

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
      return intern.automation_lauf_ende(l.id);
    end if;

    x := a.aktionen -> (l.schritt - 1);

    if x ->> 'art' = 'warten' then
      if l.stand = 'wartet' then
        update public.automation_laeufe set stand = 'laeuft', schritt = schritt + 1 where id = l.id returning * into l;
        continue;
      end if;
      update public.automation_laeufe set stand = 'wartet', weiter_am = intern.automation_warte_bis(x)
       where id = l.id returning * into l;
      perform intern.automation_vermerk(l.id, l.schritt, 'warten',
        jsonb_build_object('ergebnis', 'wartet', 'werte', jsonb_build_object('bis', l.weiter_am)));
      return 'wartet';
    end if;

    -- Ein Lauf, der vor einer Nachricht gewartet hat (Fenster, Pause), geht hier weiter.
    if l.stand = 'wartet' then
      update public.automation_laeufe set stand = 'laeuft' where id = l.id returning * into l;
    end if;

    if x ->> 'art' = 'pruefen' then
      nicht := intern.automation_nicht_erfuellt(ctx, x -> 'bedingungen');
      if nicht is not null then
        if x ->> 'sonst' = 'ueberspringen' then
          perform intern.automation_vermerk(l.id, l.schritt, 'pruefen', jsonb_build_object('ergebnis', 'uebersprungen',
            'meldung', 'naechster_uebersprungen', 'werte', nicht || jsonb_build_object('ist', intern.automation_wert(ctx, nicht ->> 'feld'))));
          update public.automation_laeufe set schritt = schritt + 2 where id = l.id returning * into l;
          continue;
        end if;
        perform intern.automation_vermerk(l.id, l.schritt, 'pruefen', jsonb_build_object('ergebnis', 'uebersprungen',
          'meldung', 'erledigt_vorher', 'werte', nicht || jsonb_build_object('ist', intern.automation_wert(ctx, nicht ->> 'feld'))));
        update public.automation_laeufe set stand = 'fertig', beendet_am = now(), nur_schritt = null where id = l.id;
        return 'fertig';
      end if;
      perform intern.automation_vermerk(l.id, l.schritt, 'pruefen', '{"ergebnis": "ok"}');
      update public.automation_laeufe set schritt = schritt + 1 where id = l.id returning * into l;
      continue;
    end if;

    -- Nachrichten an Kunden: Versandfenster und Kontakt-Pause (Mahnung und SMS am Vortag sind Pflicht, ohne Pause).
    if x ->> 'art' in ('mail', 'sms', 'zahlungserinnerung') and coalesce(x ->> 'sende', '') <> 'vortag_termin' then
      ab := now();
      if x ->> 'art' <> 'zahlungserinnerung' then
        frei_ab := intern.automation_kontakt_frei_ab(nullif(ctx #>> '{kontakt,id}', '')::uuid,
                     coalesce(a.kontakt_pause_tage, (cfg ->> 'kontakt_pause_tage')::int, 0), l.id);
        if frei_ab > ab then ab := frei_ab; end if;
      end if;
      ab := intern.automation_im_fenster(a.versandfenster, ab);
      if ab > now() + interval '1 minute' then
        update public.automation_laeufe set stand = 'wartet', weiter_am = ab where id = l.id;
        perform intern.automation_vermerk(l.id, l.schritt, x ->> 'art', jsonb_build_object('ergebnis', 'wartet',
          'meldung', case when frei_ab > now() then 'kontakt_pause' else 'versandfenster' end,
          'werte', jsonb_build_object('bis', ab)));
        return 'wartet';
      end if;
    end if;

    if x ->> 'art' in ('outlook_termin', 'sharepoint_ordner', 'abaninja_kunde') then
      update public.automation_laeufe set stand = 'server' where id = l.id;
      perform intern.automation_vermerk(l.id, l.schritt, x ->> 'art', '{"ergebnis": "server"}');
      return 'server';
    end if;

    begin
      if x ->> 'art' in ('wiedervorlage', 'notiz') then
        r := intern.automation_aktion_ausbau(l, x, ctx);
      else
        r := intern.automation_aktion(a, l, l.schritt, x, ctx, als);
      end if;
    exception when others then
      r := jsonb_build_object('ergebnis', 'fehler', 'meldung', sqlerrm);
    end;

    -- Ohne Mail-Adresse oder Telefon: auf Wunsch eine Anruf-Aufgabe an die zuständige Person statt der Nachricht.
    if coalesce((x ->> 'ersatz_aufgabe')::boolean, false) and r ->> 'meldung' in ('keine_mail', 'kein_telefon') then
      begin
        ersatz := intern.automation_aktion(a, l, l.schritt, jsonb_build_object('art', 'aufgabe',
          'an', coalesce(x -> 'absender', '["zustaendig", "rolle:admin"]'), 'faellig_tage', 0,
          'titel', jsonb_build_object('de', 'Anrufen statt ' || case when x ->> 'art' = 'sms' then 'SMS' else 'Mail' end || ': {Name}',
                                      'fr', 'Appeler au lieu ' || case when x ->> 'art' = 'sms' then 'du SMS' else 'de l’e-mail' end || ' : {Name}'),
          'text', jsonb_build_object('de', 'Keine Adresse hinterlegt. Thema: ' || coalesce(x #>> '{betreff,de}', x #>> '{text,de}', ''),
                                     'fr', 'Aucune adresse enregistrée. Sujet : ' || coalesce(x #>> '{betreff,fr}', x #>> '{text,fr}', ''))),
          ctx, als);
        r := r || jsonb_build_object('werte', coalesce(r -> 'werte', '{}') || jsonb_build_object('ersatz', ersatz #>> '{werte,an}'));
      exception when others then null;
      end;
    end if;

    perform intern.automation_vermerk(l.id, l.schritt, x ->> 'art', r);
    update public.automation_laeufe set schritt = schritt + 1 where id = l.id returning * into l;
  end loop;
  return l.stand;
end
$$;
