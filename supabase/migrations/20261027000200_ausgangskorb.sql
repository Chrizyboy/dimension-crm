-- Phase 8, Teil 2: Ausgangskorb mit Freigabe (CLAUDE.md Regel 6, V233 «outbox»).
-- Alles, was als Mail oder SMS hinausgeht, steht hier: von Hand freigegeben («Senden» im Dialog ist die
-- Freigabe) oder von einer Automation vorbereitet und wartend. Die Edge Function «ausgang» sendet nur
-- freigegebene Einträge. Ein Eintrag wird nie zweimal gesendet: «schluessel» verhindert doppelte
-- Vorbereitung, «wird_gesendet» sperrt den Eintrag während des Versands, und ein abgebrochener Versand
-- wird nicht wiederholt, sondern als Fehler gezeigt (unklar, ob er angekommen ist).

alter table public.ausgangskorb
  add column if not exists art                text not null default 'frei',
  add column if not exists cc                 text,
  add column if not exists anhaenge           jsonb not null default '[]',
  add column if not exists absender_person_id uuid references public.personen (id),
  add column if not exists sprache            text not null default 'de' check (sprache in ('de', 'fr')),
  add column if not exists kontakt_id         uuid references public.kontakte (id),
  add column if not exists verkaufschance_id  uuid references public.verkaufschancen (id),
  add column if not exists offerte_id         uuid references public.offerten (id),
  add column if not exists projekt_id         uuid references public.projekte (id),
  add column if not exists schluessel         text,
  add column if not exists sende_ab           timestamptz,
  add column if not exists automatisch        boolean not null default false,
  add column if not exists versuche           int not null default 0,
  add column if not exists fehler             text,
  add column if not exists extern_id          text,
  add column if not exists freigegeben_am     timestamptz,
  add column if not exists verworfen_grund    text;

alter table public.ausgangskorb
  add constraint ausgangskorb_status_check
  check (status in ('wartet', 'freigegeben', 'wird_gesendet', 'gesendet', 'fehler', 'verworfen'));
create unique index ausgangskorb_schluessel_idx on public.ausgangskorb (schluessel)
  where schluessel is not null and status <> 'verworfen' and geloescht_am is null;
create index ausgangskorb_offen_idx on public.ausgangskorb (status, sende_ab) where geloescht_am is null;

comment on column public.ausgangskorb.art is 'Wozu: frei, sms_erinnerung, termin_bestaetigung, nachfassen, offerte, werkvertrag, monatsbericht …';
comment on column public.ausgangskorb.anhaenge is 'Liste [{dokument_id, name}] aus «dokumente»; gesendet wird der Inhalt aus dem Speicher.';
comment on column public.ausgangskorb.absender_person_id is 'Aus wessen Postfach die Mail geht (Microsoft-Verbindung dieser Person).';

/** Telefonnummer in die Form +41… für SMS bringen; null, wenn sie keine Handynummer sein kann. */
create or replace function intern.sms_nummer(p_nummer text) returns text
language sql immutable set search_path = '' as $$
  select case
    when z ~ '^0041\d{9}$' then '+' || substr(z, 3)
    when z ~ '^41\d{9}$' then '+' || z
    when z ~ '^0\d{9}$' then '+41' || substr(z, 2)
    when z ~ '^00\d{8,14}$' then '+' || substr(z, 3)
    else null end
  from (select regexp_replace(replace(coalesce(p_nummer, ''), '(0)', ''), '[^0-9]', '', 'g') as z) x
$$;

/**
 * Neuer Eintrag im Ausgangskorb. «freigeben: true» heisst: eine Person hat im Dialog «Senden» gedrückt,
 * das ist die Freigabe. Sonst wartet der Eintrag auf Freigabe. Fehler als Schlüssel «ausgang.*».
 */
create or replace function public.ausgang_anlegen(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_kanal text := coalesce(p ->> 'kanal', 'mail');
  v_an text := nullif(trim(p ->> 'an'), '');
  v_ich uuid := intern.meine_person_id();
  v_frei boolean := coalesce((p ->> 'freigeben')::boolean, false);
  v_id uuid;
begin
  if v_kanal not in ('mail', 'sms') then raise exception using errcode = 'P0001', message = 'ausgang.kanal'; end if;
  if v_an is null then raise exception using errcode = 'P0001', message = 'ausgang.empfaenger_fehlt'; end if;
  if v_kanal = 'sms' then
    v_an := intern.sms_nummer(v_an);
    if v_an is null then raise exception using errcode = 'P0001', message = 'ausgang.nummer_ungueltig'; end if;
    if nullif(trim(p ->> 'text'), '') is null then raise exception using errcode = 'P0001', message = 'ausgang.text_fehlt'; end if;
  else
    if v_an !~ '^[^@\s]+@[^@\s]+\.[^@\s]+(\s*[,;]\s*[^@\s]+@[^@\s]+\.[^@\s]+)*$' then
      raise exception using errcode = 'P0001', message = 'ausgang.adresse_ungueltig';
    end if;
    if nullif(trim(p ->> 'betreff'), '') is null then raise exception using errcode = 'P0001', message = 'ausgang.betreff_fehlt'; end if;
    if nullif(trim(coalesce(p ->> 'text', p ->> 'html')), '') is null then
      raise exception using errcode = 'P0001', message = 'ausgang.text_fehlt';
    end if;
  end if;
  if p ->> 'schluessel' is not null and exists (
    select 1 from public.ausgangskorb where schluessel = p ->> 'schluessel' and status <> 'verworfen' and geloescht_am is null
  ) then
    raise exception using errcode = 'P0001', message = 'ausgang.doppelt';
  end if;

  insert into public.ausgangskorb (kanal, art, an, cc, betreff, text, html, anhaenge, absender_person_id, sprache,
    kontakt_id, verkaufschance_id, offerte_id, projekt_id, bezug_tabelle, bezug_id, schluessel, sende_ab,
    status, freigegeben_von, freigegeben_am)
  values (v_kanal, coalesce(p ->> 'art', 'frei'), v_an, nullif(trim(p ->> 'cc'), ''), p ->> 'betreff', p ->> 'text',
    p ->> 'html', coalesce(p -> 'anhaenge', '[]'),
    coalesce((p ->> 'absender_person_id')::uuid, v_ich), coalesce(p ->> 'sprache', 'de'),
    (p ->> 'kontakt_id')::uuid, (p ->> 'verkaufschance_id')::uuid, (p ->> 'offerte_id')::uuid, (p ->> 'projekt_id')::uuid,
    p ->> 'bezug_tabelle', (p ->> 'bezug_id')::uuid, p ->> 'schluessel', (p ->> 'sende_ab')::timestamptz,
    case when v_frei then 'freigegeben' else 'wartet' end,
    case when v_frei then v_ich end, case when v_frei then now() end)
  returning id into v_id;
  return v_id;
end
$$;

/** Wartende (oder fehlgeschlagene) Einträge freigeben; gibt die Zahl zurück. */
create or replace function public.ausgang_freigeben(p_ids uuid[]) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_n int;
begin
  update public.ausgangskorb
     set status = 'freigegeben', freigegeben_von = intern.meine_person_id(), freigegeben_am = now(), fehler = null
   where id = any (p_ids) and status in ('wartet', 'fehler') and geloescht_am is null;
  get diagnostics v_n = row_count;
  return v_n;
end
$$;

/** Eintrag nicht senden (mit Grund). Gesendete bleiben, wie sie sind. */
create or replace function public.ausgang_verwerfen(p_id uuid, p_grund text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.ausgangskorb set status = 'verworfen', verworfen_grund = nullif(trim(p_grund), '')
   where id = p_id and status in ('wartet', 'freigegeben', 'fehler') and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'ausgang.nicht_aenderbar'; end if;
end
$$;

/** Text eines wartenden Eintrags ändern (Empfänger, Betreff, Text), bevor er freigegeben wird. */
create or replace function public.ausgang_aendern(p_id uuid, p jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  a public.ausgangskorb;
begin
  select * into a from public.ausgangskorb where id = p_id and geloescht_am is null for update;
  if not found or a.status not in ('wartet', 'fehler') then
    raise exception using errcode = 'P0001', message = 'ausgang.nicht_aenderbar';
  end if;
  update public.ausgangskorb set
    an = case when a.kanal = 'sms' then coalesce(intern.sms_nummer(p ->> 'an'), a.an) else coalesce(nullif(trim(p ->> 'an'), ''), a.an) end,
    cc = case when p ? 'cc' then nullif(trim(p ->> 'cc'), '') else a.cc end,
    betreff = coalesce(p ->> 'betreff', a.betreff),
    text = coalesce(p ->> 'text', a.text),
    html = case when p ? 'text' then null else a.html end
  where id = p_id;
end
$$;

/**
 * Für den Versand (nur Server): bis zu p_limit freigegebene, fällige Einträge sperren und zurückgeben.
 * Hängt ein Versand länger als 10 Minuten, wird er nicht wiederholt, sondern als Fehler gezeigt.
 */
create or replace function public.ausgang_holen(p_limit int default 20) returns setof public.ausgangskorb
language plpgsql security definer set search_path = '' as $$
begin
  update public.ausgangskorb
     set status = 'fehler', fehler = 'ausgang.unklar'
   where status = 'wird_gesendet' and geaendert_am < now() - interval '10 minutes';
  return query
  update public.ausgangskorb a set status = 'wird_gesendet', versuche = a.versuche + 1
   where a.id in (
     select id from public.ausgangskorb
      where status = 'freigegeben' and geloescht_am is null and (sende_ab is null or sende_ab <= now())
      order by freigegeben_am nulls last
      limit p_limit
      for update skip locked)
  returning a.*;
end
$$;

/** Ergebnis eines Versands festhalten; gesendete Mails/SMS erscheinen im Kontaktverlauf. */
create or replace function public.ausgang_ergebnis(p_id uuid, p_ok boolean, p_meldung text, p_extern_id text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.ausgangskorb;
begin
  update public.ausgangskorb
     set status = case when p_ok then 'gesendet' else 'fehler' end,
         gesendet_am = case when p_ok then now() end,
         fehler = case when p_ok then null else left(p_meldung, 500) end,
         extern_id = p_extern_id
   where id = p_id and status = 'wird_gesendet'
  returning * into a;
  if not found or not p_ok then return; end if;
  insert into public.aktivitaeten (art, richtung, text, person_id, kontakt_id, verkaufschance_id, offerte_id, projekt_id,
    mail_kennung, details)
  values (a.kanal, 'aus',
    case when a.kanal = 'sms' then 'SMS an ' || a.an || E'\n' || coalesce(a.text, '')
         else coalesce(a.betreff, '') || E'\n' || left(coalesce(a.text, ''), 500) end,
    coalesce(a.absender_person_id, a.freigegeben_von), a.kontakt_id, a.verkaufschance_id, a.offerte_id, a.projekt_id,
    case when a.kanal = 'mail' then p_extern_id end,
    jsonb_build_object('ausgang_id', a.id, 'art', a.art, 'an', a.an, 'automatisch', a.automatisch));
end
$$;

revoke execute on function public.ausgang_anlegen(jsonb) from public, anon;
revoke execute on function public.ausgang_freigeben(uuid[]) from public, anon;
revoke execute on function public.ausgang_verwerfen(uuid, text) from public, anon;
revoke execute on function public.ausgang_aendern(uuid, jsonb) from public, anon;
grant execute on function public.ausgang_anlegen(jsonb) to authenticated;
grant execute on function public.ausgang_freigeben(uuid[]) to authenticated;
grant execute on function public.ausgang_verwerfen(uuid, text) to authenticated;
grant execute on function public.ausgang_aendern(uuid, jsonb) to authenticated;
revoke execute on function public.ausgang_holen(int) from public, anon, authenticated;
revoke execute on function public.ausgang_ergebnis(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.ausgang_holen(int) to service_role;
grant execute on function public.ausgang_ergebnis(uuid, boolean, text, text) to service_role;
