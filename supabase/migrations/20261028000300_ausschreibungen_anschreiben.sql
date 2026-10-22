-- Phase 8b, Teil 3: Anschreiben (Spur Akquise) mit festen Regeln. Ablauf: Entwurf (automatisch) →
-- Andy bewilligt → Chris sendet (Vertretung Loris). Erst beim Senden entsteht der Lead («Angeschrieben»,
-- Wiedervorlage nach 5 Arbeitstagen). Mail nur an Firmen, Gemeinden und Behörden; Privatpersonen nur
-- Brief oder Anruf. Signatur und Abmelde-Satz hängt die Datenbank an, sie sind im Entwurf nicht änderbar.

/** Platzhalter {name} in einer Vorlage ersetzen. */
create or replace function intern.as_text(p_vorlage text, p_werte jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare
  t text := coalesce(p_vorlage, '');
  k text;
begin
  for k in select jsonb_object_keys(p_werte) loop
    t := replace(t, '{' || k || '}', coalesce(p_werte ->> k, ''));
  end loop;
  return t;
end
$$;

/** Text, wie er hinausgeht: Entwurf + feste Signatur + Abmelde-Satz (PS) in der Sprache des Empfängers. */
create or replace function public.anschreiben_volltext(p_id uuid) returns text
language sql stable set search_path = '' as $$
  select case when s.kanal = 'anruf' then s.text
         else concat_ws(E'\n\n', s.text, intern.as_cfg() -> 'signatur' ->> s.sprache, intern.as_cfg() -> 'ps' ->> s.sprache) end
    from public.anschreiben s where s.id = p_id
$$;

/** Kanal nach den Regeln: Privat nur Brief oder Anruf, sonst Mail, wenn eine Adresse da ist. */
create or replace function intern.as_kanal(k public.ausschreibung_kontakte) returns text
language plpgsql stable set search_path = '' as $$
begin
  if k.art = 'privat' then
    if coalesce((intern.as_cfg() ->> 'privat_briefe')::boolean, true) and k.strasse is not null and k.plz is not null then
      return 'brief';
    end if;
    if k.telefon is not null then return 'anruf'; end if;
    if not coalesce((intern.as_cfg() ->> 'privat_briefe')::boolean, true) then
      raise exception using errcode = 'P0001', message = 'ausschreibung.privat_aus';
    end if;
    raise exception using errcode = 'P0001', message = 'ausschreibung.kontakt_unvollstaendig';
  end if;
  if k.email is not null then return 'mail'; end if;
  if k.strasse is not null and k.plz is not null then return 'brief'; end if;
  if k.telefon is not null then return 'anruf'; end if;
  raise exception using errcode = 'P0001', message = 'ausschreibung.kontakt_unvollstaendig';
end
$$;

/**
 * Entwurf für einen Kontakt des Dossiers anlegen (Erst-Anschreiben oder das eine Nachfassen). Prüft
 * Sperrliste, Vergabestellen-Sperre, Quelle und Kanal. Gibt die id des Entwurfs zurück.
 */
create or replace function intern.anschreiben_vorbereiten(p_kontakt uuid, p_art text default 'erst') returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  k public.ausschreibung_kontakte;
  a public.ausschreibungen;
  c jsonb := intern.as_cfg();
  v jsonb;
  w jsonb;
  v_kanal text;
  v_id uuid;
begin
  select * into k from public.ausschreibung_kontakte where id = p_kontakt and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'ausschreibung.unbekannt'; end if;
  select * into a from public.ausschreibungen where id = k.ausschreibung_id;
  if nullif(trim(k.quelle_link), '') is null then raise exception using errcode = 'P0001', message = 'ausschreibung.quelle_fehlt'; end if;
  if intern.gesperrt(k.email, coalesce(k.firma, k.name)) is not null then
    raise exception using errcode = 'P0001', message = 'ausschreibung.gesperrt';
  end if;
  if exists (select 1 from public.anschreiben where dossier_kontakt_id = k.id and art = p_art
              and status <> 'abgelehnt' and geloescht_am is null) then
    raise exception using errcode = 'P0001',
      message = case when p_art = 'nachfassen' then 'ausschreibung.nur_einmal_nachfassen' else 'ausschreibung.schon_entwurf' end;
  end if;
  if p_art = 'nachfassen' and not exists (select 1 from public.anschreiben where dossier_kontakt_id = k.id and art = 'erst'
                                           and status = 'versendet' and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'ausschreibung.erst_senden';
  end if;
  v_kanal := intern.as_kanal(k);
  v := c -> 'vorlagen' -> k.sprache;
  w := jsonb_build_object('projekt', a.titel, 'gemeinde', coalesce(a.gemeinde, ''), 'nummer', a.nummer,
         'firma', coalesce(k.firma, k.name),
         'anrede', case when k.art = 'privat' then case when k.sprache = 'fr' then 'Bonjour ' else 'Guten Tag ' end || k.name
                        else v ->> 'anrede_firma' end);
  insert into public.anschreiben (ausschreibung_id, dossier_kontakt_id, kanal, art, sprache, an, betreff, text)
  values (a.id, k.id, v_kanal, p_art, k.sprache,
    case v_kanal when 'mail' then k.email when 'anruf' then k.telefon
                 else concat_ws(', ', coalesce(k.firma, k.name), k.strasse, concat_ws(' ', k.plz, k.ort)) end,
    intern.as_text(v ->> case when p_art = 'nachfassen' then 'nachfassen_betreff' else 'betreff' end, w),
    intern.as_text(v ->> case when v_kanal = 'anruf' then 'anruf' when p_art = 'nachfassen' then 'nachfassen'
                              when a.art = 'zuschlag' then 'zuschlag' else 'baugesuch' end, w))
  returning id into v_id;
  update public.ausschreibungen set status = case when p_art = 'nachfassen' then 'nachfassen' else 'entwurf' end
   where id = a.id and status in ('kontakt_fehlt', 'entwurf', 'versendet', 'pruefen', 'beobachten', 'spaeter');
  perform intern.as_vermerk(a.id, case when p_art = 'nachfassen' then 'Nachfassen vorbereitet' else 'Entwurf bereit' end
    || ' (' || v_kanal || ', ' || coalesce(k.firma, k.name) || ')', jsonb_build_object('anschreiben_id', v_id));
  return v_id;
end
$$;

/**
 * Akquise vorbereiten: Entwurf für den wichtigsten Kontakt (Gewinner, GU, Architekt, Planer, Gemeinde,
 * Bauherrschaft). Fehlt ein brauchbarer Kontakt: Status «Kontakt fehlt» und eine Aufgabe für den Innendienst.
 */
create or replace function intern.akquise_vorbereiten(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  k public.ausschreibung_kontakte;
  a public.ausschreibungen;
begin
  select * into a from public.ausschreibungen where id = p_id;
  for k in select * from public.ausschreibung_kontakte x
            where x.ausschreibung_id = p_id and x.geloescht_am is null and x.rolle <> 'vergabestelle'
            order by array_position(array['gewinner', 'gu', 'architekt', 'planer', 'gemeinde', 'bauherr'], x.rolle), x.erstellt_am
  loop
    begin
      return intern.anschreiben_vorbereiten(k.id, 'erst');
    exception when sqlstate 'P0001' then
      continue; -- gesperrt oder unvollständig: nächsten Kontakt versuchen
    end;
  end loop;
  update public.ausschreibungen set status = 'kontakt_fehlt' where id = p_id and status not in ('verworfen', 'archiviert');
  perform intern.aufgabe_einmal(x, 'Kontakt suchen: ' || a.nummer || ' ' || left(a.titel, 80), current_date + 1,
    'ausschreibungen', p_id, 'Firma, Architekt oder Bauherrschaft mit Quelle erfassen, dann ist der Entwurf bereit.')
    from unnest(intern.as_personen('innendienst')) x;
  return null;
end
$$;

/** Kontakt am Dossier erfassen oder ändern (Quelle Pflicht). Fehlte der Kontakt, ist danach der Entwurf bereit. */
create or replace function public.dossier_kontakt_speichern(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_dossier uuid := (p ->> 'ausschreibung_id')::uuid;
begin
  if nullif(trim(p ->> 'name'), '') is null then raise exception using errcode = 'P0001', message = 'ausschreibung.name_fehlt'; end if;
  if nullif(trim(p ->> 'quelle_link'), '') is null then raise exception using errcode = 'P0001', message = 'ausschreibung.quelle_fehlt'; end if;
  if v_id is null then
    insert into public.ausschreibung_kontakte (ausschreibung_id, rolle, art, name, firma, email, telefon, strasse, plz, ort,
      sprache, quelle_link, notiz, kontakt_id)
    values (v_dossier, p ->> 'rolle', p ->> 'art', trim(p ->> 'name'), nullif(trim(p ->> 'firma'), ''),
      nullif(trim(p ->> 'email'), ''), nullif(trim(p ->> 'telefon'), ''), nullif(trim(p ->> 'strasse'), ''),
      nullif(trim(p ->> 'plz'), ''), nullif(trim(p ->> 'ort'), ''), coalesce(nullif(p ->> 'sprache', ''), 'de'),
      trim(p ->> 'quelle_link'), nullif(trim(p ->> 'notiz'), ''),
      intern.as_kontakt_finden(p ->> 'email', coalesce(nullif(p ->> 'firma', ''), p ->> 'name')))
    returning id into v_id;
  else
    update public.ausschreibung_kontakte set rolle = p ->> 'rolle', art = p ->> 'art', name = trim(p ->> 'name'),
      firma = nullif(trim(p ->> 'firma'), ''), email = nullif(trim(p ->> 'email'), ''), telefon = nullif(trim(p ->> 'telefon'), ''),
      strasse = nullif(trim(p ->> 'strasse'), ''), plz = nullif(trim(p ->> 'plz'), ''), ort = nullif(trim(p ->> 'ort'), ''),
      sprache = coalesce(nullif(p ->> 'sprache', ''), sprache), quelle_link = trim(p ->> 'quelle_link'),
      notiz = nullif(trim(p ->> 'notiz'), '')
    where id = v_id returning ausschreibung_id into v_dossier;
  end if;
  if (select status from public.ausschreibungen where id = v_dossier) = 'kontakt_fehlt' then
    perform intern.akquise_vorbereiten(v_dossier);
    update public.aufgaben set erledigt_am = now(), erledigt_von = intern.meine_person_id()
     where bezug_id = v_dossier and titel like 'Kontakt suchen:%' and erledigt_am is null
       and (select status from public.ausschreibungen where id = v_dossier) <> 'kontakt_fehlt';
  end if;
  return v_id;
end
$$;

/** Entwurf von Hand anlegen (z. B. zweiter Kontakt, Nachfassen). */
create or replace function public.anschreiben_entwerfen(p_kontakt uuid, p_art text default 'erst') returns uuid
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  return intern.anschreiben_vorbereiten(p_kontakt, p_art);
end
$$;

/** Betreff und Text ändern. Ein schon bewilligtes Anschreiben muss danach neu bewilligt werden. */
create or replace function public.anschreiben_aendern(p_id uuid, p_betreff text, p_text text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if nullif(trim(p_betreff), '') is null or nullif(trim(p_text), '') is null then
    raise exception using errcode = 'P0001', message = 'ausschreibung.text_fehlt';
  end if;
  update public.anschreiben set betreff = trim(p_betreff), text = p_text, status = 'entwurf', bewilligt_von = null, bewilligt_am = null
   where id = p_id and status in ('entwurf', 'bewilligt') and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'ausschreibung.nicht_aenderbar'; end if;
end
$$;

/** Bewilligen (Andy, Vertretung Chris), auch mehrere auf einmal. Gibt die Zahl zurück. */
create or replace function public.anschreiben_bewilligen(p_ids uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if not intern.as_darf('bewilligen') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  update public.anschreiben set status = 'bewilligt', bewilligt_von = intern.meine_person_id(), bewilligt_am = now()
   where id = any (p_ids) and status = 'entwurf' and geloescht_am is null;
  get diagnostics n = row_count;
  -- now() ist die Zeit dieser Transaktion: so findet man genau die eben bewilligten.
  update public.ausschreibungen a set status = 'bewilligt'
   where a.status = 'entwurf' and a.id in (select s.ausschreibung_id from public.anschreiben s
                                            where s.id = any (p_ids) and s.art = 'erst' and s.bewilligt_am = now());
  perform intern.as_vermerk(s.ausschreibung_id, 'Anschreiben bewilligt') from public.anschreiben s
   where s.id = any (p_ids) and s.bewilligt_am = now();
  return n;
end
$$;

/** Ablehnen mit Grund: dieses Dossier wird nicht angeschrieben. */
create or replace function public.anschreiben_ablehnen(p_id uuid, p_grund text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.anschreiben;
begin
  if not intern.as_darf('bewilligen') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  update public.anschreiben set status = 'abgelehnt', abgelehnt_grund = intern.pflicht(nullif(trim(p_grund), ''), 'ausschreibung.grund_fehlt')
   where id = p_id and status in ('entwurf', 'bewilligt') and geloescht_am is null returning * into s;
  if not found then raise exception using errcode = 'P0001', message = 'ausschreibung.nicht_aenderbar'; end if;
  if not exists (select 1 from public.anschreiben where ausschreibung_id = s.ausschreibung_id and status in ('entwurf', 'bewilligt', 'versendet')
                   and geloescht_am is null) then
    update public.ausschreibungen set status = 'verworfen', grund = trim(p_grund) where id = s.ausschreibung_id;
  end if;
  perform intern.as_vermerk(s.ausschreibung_id, 'Anschreiben abgelehnt: ' || trim(p_grund));
end
$$;
