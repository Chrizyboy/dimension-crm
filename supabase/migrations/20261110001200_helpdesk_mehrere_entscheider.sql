-- Helpdesk: mehrere Personen entscheiden (Chris 2.11.2026: «Chris und Loris als Entscheider»). Alle Bestimmten
-- bekommen Glocke und SMS; wer zuerst «Erledige es» oder «Nicht» drückt, entscheidet für alle. Die Mail an die
-- meldende Person geht aus dem Postfach der Person, die entschieden hat (helpdesk_abschliessen bleibt gleich).
-- Einstellung neu als Liste «entscheider_person_ids»; die alte Einzelwahl «entscheider_person_id» wird übernommen.

update public.einstellungen
   set wert = (wert - 'entscheider_person_id')
              || jsonb_build_object('entscheider_person_ids',
                   case when wert ->> 'entscheider_person_id' is null then '[]'::jsonb
                        else jsonb_build_array(wert ->> 'entscheider_person_id') end)
 where schluessel = 'helpdesk' and not (wert ? 'entscheider_person_ids');

/** Wer über Meldungen entscheidet (aktive Personen mit Recht «admin» aus der Einstellung); leer = niemand bestimmt. */
create or replace function intern.helpdesk_entscheider_alle() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.id order by p.name), '{}')
    from public.personen p left join public.rollen r on r.schluessel = p.rolle
   where p.id in (select (jsonb_array_elements_text(e.wert -> 'entscheider_person_ids'))::uuid
                    from public.einstellungen e where e.schluessel = 'helpdesk'
                     and jsonb_typeof(e.wert -> 'entscheider_person_ids') = 'array')
     and p.aktiv and p.geloescht_am is null
     and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}')))
$$;

drop function public.helpdesk_einstellen(uuid, boolean);

/** Wer entscheidet, festlegen (nur Administration). Alle Gewählten müssen das Recht «admin» haben. */
create or replace function public.helpdesk_einstellen(p_personen uuid[], p_sms boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ids uuid[] := array(select distinct x from unnest(coalesce(p_personen, '{}')) x where x is not null);
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'handbuch.kein_recht';
  end if;
  if exists (
    select 1 from unnest(ids) x
     where not exists (
       select 1 from public.personen p left join public.rollen r on r.schluessel = p.rolle
        where p.id = x and p.aktiv and p.geloescht_am is null
          and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}'))))
  ) then
    raise exception using errcode = 'P0001', message = 'handbuch.entscheider_ungueltig';
  end if;
  insert into public.einstellungen (schluessel, wert)
  values ('helpdesk', jsonb_build_object('entscheider_person_ids', to_jsonb(ids), 'sms', coalesce(p_sms, true)))
  on conflict (schluessel) do update set wert = (public.einstellungen.wert - 'entscheider_person_id') || excluded.wert;
end
$$;

/** Stand für die Oberfläche (nur Administration): wer entscheidet, SMS ein/aus, ob ich entscheide, wer zur Wahl steht. */
create or replace function public.helpdesk_stand() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  ent uuid[] := intern.helpdesk_entscheider_alle();
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'handbuch.kein_recht';
  end if;
  return jsonb_build_object(
    'entscheider_person_ids', to_jsonb(ent),
    'sms', coalesce((select (e.wert ->> 'sms')::boolean from public.einstellungen e where e.schluessel = 'helpdesk'), true),
    'ich_entscheide', cardinality(ent) = 0 or intern.meine_person_id() = any (ent),
    'kandidaten', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name,
                                          'mobil', intern.sms_nummer(p.profil ->> 'mobil') is not null) order by p.name)
        from public.personen p left join public.rollen r on r.schluessel = p.rolle
       where p.aktiv and p.geloescht_am is null
         and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}')))), '[]'));
end
$$;

/** Für Claude (nur über die Edge Function): was zu prüfen und was abzuschliessen ist, ohne Adressen und Nummern. */
create or replace function public.helpdesk_offen() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'entscheider_gesetzt', cardinality(intern.helpdesk_entscheider_alle()) > 0,
    'pruefen', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'nr', intern.meldung_nr(m.nummer), 'titel', m.titel, 'text', m.text, 'erwartet', m.erwartet,
        'bereich', m.bereich, 'prio', m.prio, 'umgebung', m.umgebung, 'gemeldet_am', m.erstellt_am,
        'von', split_part(p.name, ' ', 1), 'sprache', coalesce(p.sprache, 'de'),
        'anhaenge', (select count(*) from public.dokumente d
                      where d.bezug_tabelle = 'rueckmeldungen' and d.bezug_id = m.id and d.geloescht_am is null))
        order by m.erstellt_am)
        from public.rueckmeldungen m left join public.personen p on p.id = m.person_id
       where m.geloescht_am is null and m.status = 'neu' and m.einschaetzung is null), '[]'),
    'abschliessen', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'nr', intern.meldung_nr(m.nummer), 'titel', m.titel, 'text', m.text, 'erwartet', m.erwartet,
        'bereich', m.bereich, 'einschaetzung', m.einschaetzung, 'entscheid', m.entscheid,
        'notiz', m.entscheid_notiz, 'entschieden_am', m.entschieden_am,
        'von', split_part(p.name, ' ', 1), 'sprache', coalesce(p.sprache, 'de'))
        order by m.entschieden_am)
        from public.rueckmeldungen m left join public.personen p on p.id = m.person_id
       where m.geloescht_am is null and m.entscheid is not null and m.abgeschlossen_am is null), '[]'))
$$;

/**
 * Einschätzung von Claude ablegen: Status «wartet», Glocke mit Pop-up und (wenn eingeschaltet) eine SMS mit Link an
 * jede entscheidende Person. Die SMS sind freigegeben, weil sie an die Entscheidenden selbst gehen, nie an Kunden.
 * Wiederholbar: eine zweite Einschätzung ändert nichts mehr.
 */
create or replace function public.helpdesk_einschaetzen(p_id uuid, p jsonb, p_link text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m public.rueckmeldungen;
  ent uuid[] := intern.helpdesk_entscheider_alle();
  sms_an boolean := coalesce((select (s.wert ->> 'sms')::boolean from public.einstellungen s where s.schluessel = 'helpdesk'), true);
  e jsonb;
  von text;
  sms_text text;
  x uuid;
  mobil text;
  sms_id uuid;
  gesendet int := 0;
begin
  select * into m from public.rueckmeldungen r where r.id = p_id and r.geloescht_am is null for update;
  if m.id is null then raise exception using errcode = 'P0001', message = 'handbuch.nicht_gefunden'; end if;
  if m.einschaetzung is not null or m.status <> 'neu' then
    return jsonb_build_object('ergebnis', 'schon_eingeschaetzt');
  end if;
  if coalesce(p ->> 'empfehlung', '') not in ('erledigen', 'nicht') or nullif(trim(p ->> 'kurz'), '') is null
     or nullif(trim(p ->> 'was'), '') is null then
    raise exception using errcode = 'P0001', message = 'handbuch.einschaetzung_unvollstaendig';
  end if;
  -- Nur bekannte Felder übernehmen und kürzen: die Einschätzung ist Anzeige-Text, keine Anweisung.
  select jsonb_object_agg(k, left(trim(p ->> k), case when k = 'kurz' then 120 else 1200 end)) into e
    from unnest(array['kurz', 'was', 'ursache', 'auswirkung', 'loesung', 'aufwand', 'risiko', 'empfehlung']) k
   where nullif(trim(p ->> k), '') is not null;
  update public.rueckmeldungen set einschaetzung = e, eingeschaetzt_am = now(), status = 'wartet' where id = p_id;

  select split_part(y.name, ' ', 1) into von from public.personen y where y.id = m.person_id;
  if cardinality(ent) = 0 then
    -- Noch niemand bestimmt: alle aus der Administration sehen es in der Glocke.
    perform intern.benachrichtige_admins(null, 'warnung',
      intern.meldung_nr(m.nummer) || ' wartet auf Entscheid: ' || m.titel,
      intern.meldung_nr(m.nummer) || ' attend une décision : ' || m.titel,
      e ->> 'kurz', '/knowledge?ansicht=meldungen&meldung=' || m.id);
    return jsonb_build_object('ergebnis', 'ok', 'sms', false, 'sms_anzahl', 0);
  end if;
  -- Höchstens zwei SMS-Teile (306 Zeichen): Text gekürzt, der Link bleibt immer ganz.
  sms_text := left(intern.meldung_nr(m.nummer) || coalesce(' (' || von || ')', '') || ': '
                   || rtrim(e ->> 'kurz', '. ') || '. Empfehlung: '
                   || case when e ->> 'empfehlung' = 'erledigen' then 'erledigen' else 'nicht umsetzen' end || '.',
                   300 - length(coalesce(p_link, '')))
              || coalesce(E'\n' || p_link, '');
  foreach x in array ent loop
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
    values (x, case when m.prio = 'dringend' then 'kritisch' else 'warnung' end,
            intern.meldung_nr(m.nummer) || ' wartet auf dich: ' || m.titel,
            intern.meldung_nr(m.nummer) || ' attend ta décision : ' || m.titel,
            e ->> 'kurz', e ->> 'kurz', '/knowledge?ansicht=meldungen&meldung=' || m.id, true);
    select intern.sms_nummer(y.profil ->> 'mobil') into mobil from public.personen y where y.id = x;
    continue when mobil is null or not sms_an;
    sms_id := null;
    insert into public.ausgangskorb (kanal, art, an, text, absender_person_id, sprache, bezug_tabelle, bezug_id,
                                     schluessel, automatisch, status, freigegeben_am)
    values ('sms', 'helpdesk', mobil, sms_text, x, 'de', 'rueckmeldungen', m.id, 'helpdesk_sms:' || m.id || ':' || x,
            true, 'freigegeben', now())
    on conflict do nothing
    returning id into sms_id;
    if sms_id is not null then gesendet := gesendet + 1; end if;
  end loop;
  return jsonb_build_object('ergebnis', 'ok', 'sms', gesendet > 0, 'sms_anzahl', gesendet);
end
$$;

/**
 * Entscheid «Erledige es» oder «Nicht»: eine der bestimmten Personen (oder, falls niemand bestimmt ist, die
 * Administration). Wer zuerst entscheidet, gilt; ändern geht nur, solange Claude noch nicht abgeschlossen hat.
 */
create or replace function public.rueckmeldung_entscheiden(p_id uuid, p_entscheid text, p_notiz text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  ent uuid[] := intern.helpdesk_entscheider_alle();
  m public.rueckmeldungen;
begin
  if ich is null or not intern.hat_recht('admin') or (cardinality(ent) > 0 and not ich = any (ent)) then
    raise exception using errcode = '42501', message = 'handbuch.nur_entscheider';
  end if;
  if p_entscheid not in ('erledigen', 'nicht') then
    raise exception using errcode = 'P0001', message = 'handbuch.entscheid_ungueltig';
  end if;
  select * into m from public.rueckmeldungen r where r.id = p_id and r.geloescht_am is null for update;
  if m.id is null then raise exception using errcode = 'P0001', message = 'handbuch.nicht_gefunden'; end if;
  if m.abgeschlossen_am is not null or m.status in ('erledigt', 'abgelehnt') then
    raise exception using errcode = 'P0001', message = 'handbuch.schon_abgeschlossen';
  end if;
  update public.rueckmeldungen set
    entscheid = p_entscheid, entscheid_notiz = nullif(trim(p_notiz), ''), entschieden_am = now(), entschieden_von = ich,
    status = 'arbeit'
  where id = p_id;
  -- Die Glocke «wartet auf dich» ist damit für alle Entscheidenden erledigt.
  update public.benachrichtigungen set gelesen_am = now()
   where (person_id = ich or person_id = any (ent)) and gelesen_am is null
     and ziel = '/knowledge?ansicht=meldungen&meldung=' || p_id;
end
$$;

drop function intern.helpdesk_entscheider();

revoke execute on function intern.helpdesk_entscheider_alle() from public, anon, authenticated;
revoke execute on function public.helpdesk_einstellen(uuid[], boolean) from public, anon;
grant execute on function public.helpdesk_einstellen(uuid[], boolean) to authenticated;
