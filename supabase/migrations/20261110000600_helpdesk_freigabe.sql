-- Helpdesk mit Freigabe per Nachricht (Chris 31.10.2026): Jede Meldung aus «Fehler melden» prüft Claude und
-- schreibt eine Einschätzung. Die entscheidende Person (Einstellung «helpdesk») bekommt eine SMS mit Link und
-- antwortet im CRM mit «Erledige es» oder «Nicht». Erst danach setzt Claude um, schliesst die Meldung und die
-- meldende Person bekommt eine Mail. Claude ändert nie etwas ohne diesen Entscheid (CLAUDE.md Regel 6: der
-- Entscheid ist die menschliche Freigabe für die Mail an die meldende Person).
-- Claude erreicht die Datenbank nur über die Edge Function «helpdesk» (eigener Schlüssel), nie direkt.

alter table public.rueckmeldungen
  add column einschaetzung    jsonb,
  add column eingeschaetzt_am timestamptz,
  add column entscheid        text check (entscheid in ('erledigen', 'nicht')),
  add column entscheid_notiz  text,
  add column entschieden_am   timestamptz,
  add column entschieden_von  uuid references public.personen (id),
  add column umgesetzt_in     text,
  add column abgeschlossen_am timestamptz;

alter table public.rueckmeldungen drop constraint rueckmeldungen_status_check;
alter table public.rueckmeldungen add constraint rueckmeldungen_status_check
  check (status in ('neu', 'wartet', 'arbeit', 'info', 'erledigt', 'abgelehnt'));
comment on column public.rueckmeldungen.status is
  'neu, wartet (Einschätzung da, wartet auf Entscheid), arbeit (in Arbeit), info (Rückfrage), erledigt, abgelehnt (nicht umgesetzt)';
comment on column public.rueckmeldungen.einschaetzung is
  'Von Claude: {kurz, was, ursache, auswirkung, loesung, aufwand, risiko, empfehlung (erledigen|nicht)}';

-- Glocke mit Pop-up: die Windows-App zeigt solche Meldungen zusätzlich als Systemmeldung.
alter table public.benachrichtigungen add column popup boolean not null default false;

insert into public.einstellungen (schluessel, wert)
values ('helpdesk', '{"entscheider_person_id": null, "sms": true}')
on conflict (schluessel) do nothing;

/**
 * Wer über Meldungen entscheidet, ändert nur die Administration. Eigener Trigger statt einer weiteren Fassung von
 * intern.einstellung_schuetzen, damit parallele Änderungen daran sich nicht gegenseitig überschreiben.
 */
create or replace function intern.helpdesk_einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'helpdesk' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'handbuch.kein_recht';
  end if;
  return new;
end
$$;
create trigger helpdesk_schuetzen before insert or update on public.einstellungen
  for each row execute function intern.helpdesk_einstellung_schuetzen();

/** Wer entscheidet über Meldungen (Einstellung «helpdesk»); null, wenn nicht gesetzt oder nicht mehr aktiv. */
create or replace function intern.helpdesk_entscheider() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.personen p
   where p.id = (select (e.wert ->> 'entscheider_person_id')::uuid from public.einstellungen e where e.schluessel = 'helpdesk')
     and p.aktiv and p.geloescht_am is null
$$;

/** «T014» aus der Nummer. */
create or replace function intern.meldung_nr(p_nummer int) returns text
language sql immutable set search_path = '' as $$
  select 'T' || lpad(p_nummer::text, 3, '0')
$$;

/** Wer entscheidet, festlegen (nur Administration). Die Person muss das Recht «admin» haben. */
create or replace function public.helpdesk_einstellen(p_person_id uuid, p_sms boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'handbuch.kein_recht';
  end if;
  if p_person_id is not null and not exists (
    select 1 from public.personen p left join public.rollen r on r.schluessel = p.rolle
     where p.id = p_person_id and p.aktiv and p.geloescht_am is null
       and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}')))
  ) then
    raise exception using errcode = 'P0001', message = 'handbuch.entscheider_ungueltig';
  end if;
  insert into public.einstellungen (schluessel, wert)
  values ('helpdesk', jsonb_build_object('entscheider_person_id', p_person_id, 'sms', coalesce(p_sms, true)))
  on conflict (schluessel) do update set wert = public.einstellungen.wert || excluded.wert;
end
$$;

/**
 * Stand für die Oberfläche (nur Administration): wer entscheidet, ob SMS eingeschaltet sind, ob die angemeldete
 * Person selbst entscheidet und wer zur Wahl steht (aktive Personen mit Recht «admin», mit oder ohne Handynummer).
 */
create or replace function public.helpdesk_stand() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  ent uuid := intern.helpdesk_entscheider();
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'handbuch.kein_recht';
  end if;
  return jsonb_build_object(
    'entscheider_person_id', ent,
    'sms', coalesce((select (e.wert ->> 'sms')::boolean from public.einstellungen e where e.schluessel = 'helpdesk'), true),
    'ich_entscheide', ent is null or ent = intern.meine_person_id(),
    'kandidaten', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name,
                                          'mobil', intern.sms_nummer(p.profil ->> 'mobil') is not null) order by p.name)
        from public.personen p left join public.rollen r on r.schluessel = p.rolle
       where p.aktiv and p.geloescht_am is null
         and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}')))), '[]'));
end
$$;

/**
 * Für Claude (nur über die Edge Function): was zu prüfen ist (neu, ohne Einschätzung) und was entschieden ist und
 * abgeschlossen werden muss. Ohne Mail-Adressen und Telefonnummern; Bildschirmfotos bleiben im CRM.
 */
create or replace function public.helpdesk_offen() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'entscheider_gesetzt', intern.helpdesk_entscheider() is not null,
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
 * Einschätzung von Claude ablegen: Status «wartet», Glocke mit Pop-up für die entscheidende Person und, wenn
 * eingeschaltet, eine SMS mit Link. Die SMS ist freigegeben, weil die entscheidende Person sie selbst so
 * eingerichtet hat (an sie selbst, nie an Kunden). Wiederholbar: eine zweite Einschätzung ändert nichts mehr.
 */
create or replace function public.helpdesk_einschaetzen(p_id uuid, p jsonb, p_link text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m public.rueckmeldungen;
  ent uuid := intern.helpdesk_entscheider();
  e jsonb;
  von text;
  mobil text;
  sms_id uuid;
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

  select split_part(x.name, ' ', 1) into von from public.personen x where x.id = m.person_id;
  if ent is null then
    -- Noch niemand bestimmt: alle aus der Administration sehen es in der Glocke.
    perform intern.benachrichtige_admins(null, 'warnung',
      intern.meldung_nr(m.nummer) || ' wartet auf Entscheid: ' || m.titel,
      intern.meldung_nr(m.nummer) || ' attend une décision : ' || m.titel,
      e ->> 'kurz', '/knowledge?ansicht=meldungen&meldung=' || m.id);
    return jsonb_build_object('ergebnis', 'ok', 'sms', false);
  end if;
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
  values (ent, case when m.prio = 'dringend' then 'kritisch' else 'warnung' end,
          intern.meldung_nr(m.nummer) || ' wartet auf dich: ' || m.titel,
          intern.meldung_nr(m.nummer) || ' attend ta décision : ' || m.titel,
          e ->> 'kurz', e ->> 'kurz', '/knowledge?ansicht=meldungen&meldung=' || m.id, true);

  select intern.sms_nummer(x.profil ->> 'mobil') into mobil from public.personen x where x.id = ent;
  if mobil is null or not coalesce((select (s.wert ->> 'sms')::boolean from public.einstellungen s where s.schluessel = 'helpdesk'), true) then
    return jsonb_build_object('ergebnis', 'ok', 'sms', false);
  end if;
  insert into public.ausgangskorb (kanal, art, an, text, absender_person_id, sprache, bezug_tabelle, bezug_id, schluessel,
                                   automatisch, status, freigegeben_am)
  values ('sms', 'helpdesk', mobil,
          -- Höchstens zwei SMS-Teile (306 Zeichen): Text gekürzt, der Link bleibt immer ganz.
          left(intern.meldung_nr(m.nummer) || coalesce(' (' || von || ')', '') || ': '
               || rtrim(e ->> 'kurz', '. ') || '. Empfehlung: '
               || case when e ->> 'empfehlung' = 'erledigen' then 'erledigen' else 'nicht umsetzen' end || '.',
               300 - length(coalesce(p_link, '')))
          || coalesce(E'\n' || p_link, ''),
          ent, 'de', 'rueckmeldungen', m.id, 'helpdesk_sms:' || m.id, true, 'freigegeben', now())
  on conflict do nothing
  returning id into sms_id;
  return jsonb_build_object('ergebnis', 'ok', 'sms', sms_id is not null);
end
$$;

/**
 * Entscheid «Erledige es» oder «Nicht» (die entscheidende Person oder, falls niemand bestimmt ist, die
 * Administration). Erst danach darf Claude etwas ändern. Ein Entscheid gilt; ändern geht nur, solange Claude
 * die Meldung noch nicht abgeschlossen hat.
 */
create or replace function public.rueckmeldung_entscheiden(p_id uuid, p_entscheid text, p_notiz text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  ent uuid := intern.helpdesk_entscheider();
  m public.rueckmeldungen;
begin
  if ich is null or not intern.hat_recht('admin') or (ent is not null and ich <> ent) then
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
  -- Die Glocke «wartet auf dich» ist damit erledigt.
  update public.benachrichtigungen set gelesen_am = now()
   where person_id = ich and gelesen_am is null and ziel = '/knowledge?ansicht=meldungen&meldung=' || p_id;
end
$$;

/**
 * Für Claude (nur über die Edge Function): Meldung nach dem Entscheid abschliessen. «erledigt» nur nach «Erledige
 * es», «abgelehnt» nach «Nicht» (oder wenn sich die Umsetzung als unmöglich herausstellt). Die Antwort sieht die
 * meldende Person im CRM und in der Glocke und bekommt sie per Mail aus dem Postfach der entscheidenden Person
 * (der Entscheid ist die Freigabe dafür).
 */
create or replace function public.helpdesk_abschliessen(p_id uuid, p_ergebnis text, p_antwort text, p_version text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m public.rueckmeldungen;
  p public.personen;
  absender public.personen;
  v_antwort text := nullif(trim(p_antwort), '');
  fr boolean;
  mail_id uuid;
begin
  select * into m from public.rueckmeldungen r where r.id = p_id and r.geloescht_am is null for update;
  if m.id is null then raise exception using errcode = 'P0001', message = 'handbuch.nicht_gefunden'; end if;
  if m.abgeschlossen_am is not null then return jsonb_build_object('ergebnis', 'schon_abgeschlossen'); end if;
  if m.entscheid is null then raise exception using errcode = 'P0001', message = 'handbuch.kein_entscheid'; end if;
  if p_ergebnis not in ('erledigt', 'abgelehnt') or (p_ergebnis = 'erledigt' and m.entscheid <> 'erledigen') then
    raise exception using errcode = 'P0001', message = 'handbuch.ergebnis_ungueltig';
  end if;
  if v_antwort is null then raise exception using errcode = 'P0001', message = 'handbuch.antwort_fehlt'; end if;
  select * into absender from public.personen x where x.id = m.entschieden_von;
  update public.rueckmeldungen set
    status = p_ergebnis, antwort = left(v_antwort, 2000), antwort_von = absender.name, beantwortet_am = now(),
    umgesetzt_in = nullif(trim(p_version), ''), abgeschlossen_am = now()
  where id = p_id;

  select * into p from public.personen x where x.id = m.person_id;
  if p.id is null then return jsonb_build_object('ergebnis', 'ok', 'mail', false); end if;
  fr := p.sprache = 'fr';
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  values (p.id, case when p_ergebnis = 'erledigt' then 'ok' else 'info' end,
          'Antwort auf deine Meldung ' || intern.meldung_nr(m.nummer), 'Réponse à ton signalement ' || intern.meldung_nr(m.nummer),
          v_antwort, v_antwort, '/knowledge?ansicht=meldungen&meldung=' || m.id);
  if p.email is null or p.id = absender.id then return jsonb_build_object('ergebnis', 'ok', 'mail', false); end if;
  insert into public.ausgangskorb (kanal, art, an, betreff, text, absender_person_id, sprache, bezug_tabelle, bezug_id,
                                   schluessel, automatisch, status, freigegeben_von, freigegeben_am)
  values ('mail', 'helpdesk', p.email,
    case when fr then 'Ton signalement ' || intern.meldung_nr(m.nummer) || case when p_ergebnis = 'erledigt' then ' est réglé' else ' : réponse' end
         else 'Deine Meldung ' || intern.meldung_nr(m.nummer) || case when p_ergebnis = 'erledigt' then ' ist erledigt' else ': Antwort' end end,
    case when fr then 'Bonjour ' || split_part(p.name, ' ', 1) || E'\n\nMerci pour ton signalement «' || m.titel || E'».\n\n'
                      || v_antwort || E'\n\nMeilleures salutations\n' || split_part(absender.name, ' ', 1)
         else 'Hallo ' || split_part(p.name, ' ', 1) || E'\n\nDanke für deine Meldung «' || m.titel || E'».\n\n'
                      || v_antwort || E'\n\nFreundliche Grüsse\n' || split_part(absender.name, ' ', 1) end,
    absender.id, case when fr then 'fr' else 'de' end, 'rueckmeldungen', m.id, 'helpdesk_mail:' || m.id,
    true, 'freigegeben', absender.id, now())
  on conflict do nothing
  returning id into mail_id;
  return jsonb_build_object('ergebnis', 'ok', 'mail', mail_id is not null);
end
$$;

revoke execute on function intern.helpdesk_entscheider() from public, anon, authenticated;
revoke execute on function public.helpdesk_einstellen(uuid, boolean) from public, anon;
revoke execute on function public.helpdesk_stand() from public, anon;
revoke execute on function public.rueckmeldung_entscheiden(uuid, text, text) from public, anon;
revoke execute on function public.helpdesk_offen() from public, anon, authenticated;
revoke execute on function public.helpdesk_einschaetzen(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.helpdesk_abschliessen(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.helpdesk_einstellen(uuid, boolean) to authenticated;
grant execute on function public.helpdesk_stand() to authenticated;
grant execute on function public.rueckmeldung_entscheiden(uuid, text, text) to authenticated;
grant execute on function public.helpdesk_offen() to service_role;
grant execute on function public.helpdesk_einschaetzen(uuid, jsonb, text) to service_role;
grant execute on function public.helpdesk_abschliessen(uuid, text, text, text) to service_role;
