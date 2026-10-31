-- Posteingang (Phase 18), Teil 2: der Ablauf. Aufnehmen (Server), einordnen lassen (Server mit KI), zuordnen,
-- «beantwortet» aus gesendeten Mails erkennen (auch direkt aus Outlook), erinnern und ändern (App).

/** Seit wann Mails geholt werden: ab dem ersten Lauf (nur Neues, wie Automationen), höchstens 3 Tage zurück. */
create or replace function public.posteingang_seit() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  seit timestamptz;
begin
  if not coalesce((cfg ->> 'aktiv')::boolean, true) then return null; end if;
  seit := nullif(cfg ->> 'aktiv_seit', '')::timestamptz;
  if seit is null then
    seit := now();
    update public.einstellungen set wert = jsonb_set(wert, '{aktiv_seit}', to_jsonb(seit))
     where schluessel = 'posteingang';
  end if;
  return greatest(seit, now() - interval '3 days');
end
$$;

/**
 * Mails aus einem Postfach aufnehmen (nur Server). p_postfach: 'me' (persönlich) oder die Adresse eines
 * Team-Postfachs. p_mails: [{kennung, outlook_id, konversation, eingang_am, von, von_name, an, betreff, vorschau,
 * web_link, anhang}]. Feste Regeln ohne KI: eigene Domain = intern, Absender wie «newsletter@» oder «noreply@» =
 * Werbung (ausser bekannte Kunden), Formular-Anfragen (solar-guide, Landingpage, Messe) macht schon der Job
 * «anfragen» zu Leads. Gibt die Zahl neuer Mails zurück.
 */
create or replace function public.posteingang_aufnehmen(p_person uuid, p_postfach text, p_mails jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_domains text[] := coalesce((select array_agg(lower(d)) from public.integrationen i,
                                  jsonb_array_elements_text(i.einstellungen -> 'eigene_domains') d
                                 where i.dienst = 'microsoft'), '{}');
  v_eigen uuid := case when p_postfach = 'me' then p_person end;
  m jsonb;
  v_von text;
  v_kontakt uuid;
  v_lead uuid;
  v_art text;
  n int := 0;
  k int;
begin
  for m in select * from jsonb_array_elements(coalesce(p_mails, '[]')) loop
    continue when nullif(m ->> 'kennung', '') is null or nullif(m ->> 'outlook_id', '') is null;
    v_von := lower(trim(m ->> 'von'));
    v_kontakt := null;
    v_lead := null;
    if nullif(v_von, '') is not null then
      select c.id into v_kontakt from public.kontakte c
       where lower(c.email) = v_von and c.geloescht_am is null order by c.erstellt_am limit 1;
    end if;
    v_art := case
      when split_part(v_von, '@', 2) = any (v_domains) then 'intern'
      when coalesce(m ->> 'betreff', '') ~* '(solar-?guide\.ch:\s*Anfrage von|Leads Landingpage|Leads Messe)' then 'anfrage'
      when v_kontakt is null
       and (v_von ~ '(^|[._+-])(no-?reply|do-?not-?reply|newsletter|news|marketing|mailer|mailing|notifications?|bounces?)[^@]*@'
            or v_von ~ '@(e|em|email|mail|mailing|news|newsletter|info)\.[^.]+\.[a-z]+$') then 'werbung'
    end;
    if v_art = 'anfrage' then
      select e.verkaufschance_id into v_lead from intern.mail_eingang e where e.kennung = m ->> 'kennung';
    end if;
    insert into public.posteingang (kennung, outlook_id, konversation_id, postfach, postfach_person_id, abgeholt_von,
                                    sichtbar, eingang_am, von_email, von_name, an, betreff, vorschau, web_link,
                                    hat_anhang, kontakt_id, verkaufschance_id, art, sortiert, stand, erledigt_am,
                                    erledigt_grund)
    values (m ->> 'kennung', m ->> 'outlook_id', nullif(m ->> 'konversation', ''), coalesce(p_postfach, 'me'), v_eigen,
            p_person,
            case when v_eigen is null or v_kontakt is not null or v_art = 'anfrage' then 'team' else 'person' end,
            coalesce(nullif(m ->> 'eingang_am', '')::timestamptz, now()), nullif(v_von, ''),
            nullif(left(trim(m ->> 'von_name'), 200), ''), coalesce(m -> 'an', '[]'),
            left(m ->> 'betreff', 500), left(m ->> 'vorschau', 500), nullif(m ->> 'web_link', ''),
            coalesce((m ->> 'anhang')::boolean, false), v_kontakt, v_lead, v_art,
            case when v_art is null then 'offen' else 'regel' end,
            case when v_art = 'anfrage' then 'erledigt' when v_art is not null then 'abgelegt' else 'neu' end,
            case when v_art = 'anfrage' then now() end,
            case when v_art = 'anfrage' then 'automatisch' end)
    on conflict (kennung) do nothing;
    get diagnostics k = row_count;
    n := n + k;
  end loop;
  return n;
end
$$;

/** Mails, die noch eingeordnet werden müssen (für die KI im Zeitplan), älteste zuerst. */
create or replace function public.posteingang_unsortiert(p_limit int)
returns table (id uuid, abgeholt_von uuid, postfach text, outlook_id text, von_email text, von_name text,
               betreff text, vorschau text, eingang_am timestamptz, kunde text)
language sql security definer set search_path = '' as $$
  select p.id, p.abgeholt_von, p.postfach, p.outlook_id, p.von_email, p.von_name, p.betreff, p.vorschau, p.eingang_am,
         case when k.id is not null then intern.kontaktname(k) end
    from public.posteingang p left join public.kontakte k on k.id = p.kontakt_id
   where p.sortiert = 'offen' and p.geloescht_am is null
   order by p.eingang_am
   limit greatest(1, least(coalesce(p_limit, 10), 50))
$$;

/**
 * Akte finden: Nummern aus der Mail (Lead, Offerte, Projekt, Rechnung, Bestellung, Service-Fall), daraus der Kunde;
 * bei bekannten Kunden das neueste Projekt, den offenen Service-Fall oder den neuesten Lead.
 */
create or replace function intern.pe_zuordnen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.posteingang;
  x text;
  nr text;
begin
  select * into r from public.posteingang where id = p_id for update;
  foreach nr in array r.nummern loop
    x := upper(regexp_replace(trim(nr), '\s+', '', 'g'));
    continue when length(x) < 3;
    if r.verkaufschance_id is null then
      select v.id into r.verkaufschance_id from public.verkaufschancen v where upper(v.nummer) = x and v.geloescht_am is null;
    end if;
    if r.offerte_id is null then
      select o.id into r.offerte_id from public.offerten o where upper(o.nummer) = x and o.geloescht_am is null;
    end if;
    if r.projekt_id is null then
      select p.id into r.projekt_id from public.projekte p where upper(p.nummer) = x and p.geloescht_am is null;
    end if;
    if r.rechnung_id is null then
      select z.id into r.rechnung_id from public.rechnungen z
       where upper(z.nummer) = x and z.geloescht_am is null;
    end if;
    if r.bestellung_id is null then
      select b.id into r.bestellung_id from public.bestellungen b where upper(b.nummer) = x and b.geloescht_am is null;
    end if;
    if r.service_fall_id is null then
      select f.id into r.service_fall_id from public.service_faelle f where upper(f.nummer) = x and f.geloescht_am is null;
    end if;
  end loop;

  r.projekt_id := coalesce(r.projekt_id,
    (select f.projekt_id from public.service_faelle f where f.id = r.service_fall_id),
    (select z.projekt_id from public.rechnungen z where z.id = r.rechnung_id),
    (select b.projekt_id from public.bestellungen b where b.id = r.bestellung_id),
    (select p.id from public.projekte p where p.offerte_id = r.offerte_id and p.geloescht_am is null limit 1));
  r.kontakt_id := coalesce(r.kontakt_id,
    (select f.kontakt_id from public.service_faelle f where f.id = r.service_fall_id),
    (select p.kontakt_id from public.projekte p where p.id = r.projekt_id),
    (select z.kontakt_id from public.rechnungen z where z.id = r.rechnung_id),
    (select o.kontakt_id from public.offerten o where o.id = r.offerte_id),
    (select v.kontakt_id from public.verkaufschancen v where v.id = r.verkaufschance_id));
  r.verkaufschance_id := coalesce(r.verkaufschance_id,
    (select o.verkaufschance_id from public.offerten o where o.id = r.offerte_id),
    (select p.verkaufschance_id from public.projekte p where p.id = r.projekt_id));

  if r.kontakt_id is not null and r.art in ('kunde', 'stoerung', 'anfrage', 'rechnung') then
    if r.service_fall_id is null and r.art = 'stoerung' then
      select f.id into r.service_fall_id from public.service_faelle f
       where f.kontakt_id = r.kontakt_id and f.geloescht_am is null and f.status <> 'erledigt'
       order by f.erstellt_am desc limit 1;
    end if;
    if r.projekt_id is null then
      select p.id into r.projekt_id from public.projekte p
       where p.kontakt_id = r.kontakt_id and p.geloescht_am is null order by p.erstellt_am desc limit 1;
    end if;
    if r.verkaufschance_id is null and r.projekt_id is null then
      select v.id into r.verkaufschance_id from public.verkaufschancen v
       where v.kontakt_id = r.kontakt_id and v.geloescht_am is null order by v.eingang_am desc nulls last limit 1;
    end if;
  end if;

  update public.posteingang
     set kontakt_id = r.kontakt_id, verkaufschance_id = r.verkaufschance_id, offerte_id = r.offerte_id,
         projekt_id = r.projekt_id, rechnung_id = r.rechnung_id, bestellung_id = r.bestellung_id,
         service_fall_id = r.service_fall_id
   where id = p_id;
end
$$;

/**
 * Ergebnis der Einordnung übernehmen (nur Server). p: {art, sprache, dringend, antwort_noetig, zusammenfassung,
 * nummern, ohne_ki}. Unbekannte Art wird «sonstiges». Danach zuordnen und mit Frist einordnen.
 */
create or replace function public.posteingang_sortieren(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_art text := coalesce(p ->> 'art', 'sonstiges');
  v_stand text;
begin
  if v_art not in ('anfrage', 'stoerung', 'kunde', 'rechnung', 'lieferant', 'amt', 'monitor', 'sonstiges', 'intern',
                   'werbung', 'privat') then
    v_art := 'sonstiges';
  end if;
  update public.posteingang
     set art = v_art,
         sprache = case when p ->> 'sprache' in ('de', 'fr', 'en', 'it') then p ->> 'sprache' end,
         dringend = coalesce((p ->> 'dringend')::boolean, false),
         zusammenfassung = nullif(left(trim(p ->> 'zusammenfassung'), 600), ''),
         nummern = coalesce((select array_agg(distinct left(trim(x), 40))
                               from (select x from jsonb_array_elements_text(coalesce(p -> 'nummern', '[]')) x limit 10) n
                              where trim(x) <> ''), '{}'),
         sortiert = case when coalesce((p ->> 'ohne_ki')::boolean, false) then 'ohne_ki' else 'ki' end
   where id = p_id and sortiert = 'offen'
  returning stand into v_stand;
  if not found then return; end if;
  perform intern.pe_zuordnen(p_id);
  if v_stand = 'neu' then
    perform intern.pe_einordnen(p_id, coalesce((p ->> 'antwort_noetig')::boolean, true));
  end if;
end
$$;

/**
 * Gesendete Mails (aus Outlook, egal ob aus dem CRM oder direkt geschrieben) beantworten offene Mails im gleichen
 * Verlauf oder an denselben Absender. p_mails: [{konversation, von, an: [..], zeitpunkt}]. Gibt die Zahl zurück.
 */
create or replace function public.posteingang_antworten(p_mails jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  m jsonb;
  v_zeit timestamptz;
  v_an text[];
  v_person uuid;
  n int := 0;
  k int;
begin
  for m in select * from jsonb_array_elements(coalesce(p_mails, '[]')) loop
    v_zeit := nullif(m ->> 'zeitpunkt', '')::timestamptz;
    continue when v_zeit is null;
    v_an := coalesce((select array_agg(lower(trim(a))) from jsonb_array_elements_text(coalesce(m -> 'an', '[]')) a), '{}');
    select p.id into v_person from public.personen p
     where lower(p.email) = lower(trim(m ->> 'von')) and p.geloescht_am is null limit 1;
    update public.posteingang
       set stand = 'erledigt', erledigt_am = v_zeit, erledigt_von = v_person, erledigt_grund = 'beantwortet',
           reaktion_minuten = case when frist_am is not null then intern.pe_arbeitsminuten(eingang_am, v_zeit, cfg) end
     where geloescht_am is null and stand in ('neu', 'offen', 'info') and eingang_am < v_zeit
       and ((nullif(m ->> 'konversation', '') is not null and konversation_id = m ->> 'konversation')
            or lower(von_email) = any (v_an));
    get diagnostics k = row_count;
    n := n + k;
  end loop;
  return n;
end
$$;

/**
 * Erinnern (Zeitplan alle 5 Minuten, nur intern): kurz vor der Frist die zuständige Person, bei Ablauf nochmals
 * dringend, bei doppelter Frist die Leitung. Jede Stufe nur einmal. Gibt die Zahl der Glocken-Runden zurück.
 */
create or replace function public.posteingang_erinnern() returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  vor int := coalesce(nullif(cfg ->> 'vorwarnung_min', '')::int, 30);
  r public.posteingang;
  wer uuid[];
  n int := 0;
begin
  for r in select * from public.posteingang
            where stand = 'offen' and geloescht_am is null and frist_am is not null and erinnert < 3
              and frist_am - make_interval(mins => vor) <= now()
            order by frist_am
  loop
    wer := case when r.zustaendig_id is null then intern.pe_leitung(cfg) else array[r.zustaendig_id] end;
    if r.eskalation_am is not null and now() >= r.eskalation_am then
      perform intern.pe_glocke(intern.pe_leitung(cfg), 'kritisch', 'Kunde wartet doppelt so lange wie vorgesehen',
                               'Un client attend deux fois plus longtemps que prévu', r);
      update public.posteingang set erinnert = 3 where id = r.id;
    elsif now() >= r.frist_am and r.erinnert < 2 then
      perform intern.pe_glocke(wer, 'kritisch', 'Antwortfrist überschritten', 'Délai de réponse dépassé', r);
      update public.posteingang set erinnert = 2 where id = r.id;
    elsif r.erinnert < 1 and now() < r.frist_am then
      perform intern.pe_glocke(wer, 'warnung', 'Antwortfrist läuft bald ab', 'Le délai de réponse expire bientôt', r);
      update public.posteingang set erinnert = 1 where id = r.id;
    else
      continue;
    end if;
    n := n + 1;
  end loop;
  return n;
end
$$;

/**
 * Änderungen aus der App: erledigt (ohne Antwort), oeffnen, zuweisen {person_id}, art {art}, verknuepfen
 * {kontakt_id, verkaufschance_id, service_fall_id, projekt_id}, ablegen. Nur wer die Mail sehen darf.
 */
create or replace function public.posteingang_setzen(p_id uuid, p_aktion text, p jsonb default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  ich uuid := intern.meine_person_id();
  r public.posteingang;
  v_person uuid;
  v_art text;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht';
  end if;
  select * into r from public.posteingang x
   where x.id = p_id and x.geloescht_am is null
     and (x.sichtbar = 'team' or x.postfach_person_id = ich or x.zustaendig_id = ich)
   for update;
  if not found then raise exception using message = 'posteingang.nicht_gefunden'; end if;

  if p_aktion = 'erledigt' then
    update public.posteingang
       set stand = 'erledigt', erledigt_am = now(), erledigt_von = ich, erledigt_grund = 'hand',
           reaktion_minuten = case when r.stand = 'offen' then intern.pe_arbeitsminuten(r.eingang_am, now(), cfg) end
     where id = p_id;
  elsif p_aktion = 'ablegen' then
    update public.posteingang set stand = 'abgelegt', erledigt_von = ich, erledigt_am = now() where id = p_id;
  elsif p_aktion = 'oeffnen' then
    update public.posteingang
       set stand = case when r.frist_am is not null then 'offen' when r.sortiert = 'offen' then 'neu' else 'info' end,
           art = case when r.stand = 'abgelegt' and r.art in ('werbung', 'intern', 'privat') then 'sonstiges' else r.art end,
           erledigt_am = null, erledigt_von = null, erledigt_grund = null, reaktion_minuten = null
     where id = p_id;
  elsif p_aktion = 'zuweisen' then
    v_person := nullif(p ->> 'person_id', '')::uuid;
    if not exists (select 1 from public.personen x where x.id = v_person and x.aktiv and x.geloescht_am is null) then
      raise exception using message = 'posteingang.person_fehlt';
    end if;
    update public.posteingang set zustaendig_id = v_person, vertretung_fuer = null, erinnert = least(erinnert, 1)
     where id = p_id returning * into r;
    if v_person <> ich then
      perform intern.pe_glocke(array[v_person], 'info', 'Mail an dich weitergegeben', 'E-mail qui t’a été transmis', r);
    end if;
  elsif p_aktion = 'art' then
    v_art := p ->> 'art';
    if v_art is null or v_art not in ('anfrage', 'stoerung', 'kunde', 'rechnung', 'lieferant', 'amt', 'monitor',
                                       'sonstiges', 'intern', 'werbung', 'privat') then
      raise exception using message = 'posteingang.art_unbekannt';
    end if;
    update public.posteingang
       set art = v_art, sortiert = 'hand',
           stand = case when r.stand = 'erledigt' then 'erledigt' else 'neu' end
     where id = p_id;
    perform intern.pe_zuordnen(p_id);
    if r.stand <> 'erledigt' then perform intern.pe_einordnen(p_id, true); end if;
  elsif p_aktion = 'verknuepfen' then
    update public.posteingang
       set kontakt_id = coalesce(nullif(p ->> 'kontakt_id', '')::uuid, kontakt_id),
           verkaufschance_id = coalesce(nullif(p ->> 'verkaufschance_id', '')::uuid, verkaufschance_id),
           service_fall_id = coalesce(nullif(p ->> 'service_fall_id', '')::uuid, service_fall_id),
           projekt_id = coalesce(nullif(p ->> 'projekt_id', '')::uuid, projekt_id),
           sichtbar = case when nullif(p ->> 'kontakt_id', '') is not null then 'team' else sichtbar end
     where id = p_id;
    perform intern.pe_zuordnen(p_id);
  else
    raise exception using message = 'posteingang.aktion_unbekannt';
  end if;
end
$$;

/**
 * Auswertung der Reaktionszeit (nur Mails, die eine Antwort brauchten, nur Team-Mails): pro Woche Anzahl, Mitte
 * (Median, Arbeitsminuten) und Anteil in der Frist; pro Person dasselbe für die letzten 7 Tage.
 * In der Frist = beantwortet oder erledigt bis zur Frist. Noch offene Mails zählen, sobald die Frist um ist.
 */
create or replace function public.posteingang_auswertung(p_wochen int default 8) returns jsonb
language sql stable security definer set search_path = '' as $$
  with basis as (
    select p.*, coalesce(p.erledigt_von, p.zustaendig_id) as person,
           (p.erledigt_am is not null and p.erledigt_am <= p.frist_am) as in_frist
      from public.posteingang p
     where intern.hat_recht('basis') and p.geloescht_am is null and p.sichtbar = 'team' and p.frist_am is not null
       and p.eingang_am >= date_trunc('week', now()) - make_interval(weeks => greatest(1, least(p_wochen, 26)) - 1)
       and (p.stand = 'erledigt' or p.frist_am < now())
  )
  select jsonb_build_object(
    'wochen', coalesce((
      select jsonb_agg(w order by w ->> 'woche') from (
        select jsonb_build_object(
                 'woche', to_char(date_trunc('week', b.eingang_am at time zone 'Europe/Zurich'), 'IYYY-"W"IW'),
                 'beginn', date_trunc('week', b.eingang_am at time zone 'Europe/Zurich')::date,
                 'anzahl', count(*),
                 'mitte_min', percentile_cont(0.5) within group (order by b.reaktion_minuten)
                              filter (where b.reaktion_minuten is not null),
                 'in_frist', round(100.0 * count(*) filter (where b.in_frist) / count(*))) as w
          from basis b group by date_trunc('week', b.eingang_am at time zone 'Europe/Zurich')
      ) x), '[]'),
    'personen', coalesce((
      select jsonb_agg(z order by z ->> 'name') from (
        select jsonb_build_object(
                 'person_id', b.person, 'name', coalesce(pe.name, '–'),
                 'anzahl', count(*),
                 'mitte_min', percentile_cont(0.5) within group (order by b.reaktion_minuten)
                              filter (where b.reaktion_minuten is not null),
                 'in_frist', round(100.0 * count(*) filter (where b.in_frist) / count(*))) as z
          from basis b left join public.personen pe on pe.id = b.person
         where b.eingang_am >= now() - interval '7 days'
         group by b.person, pe.name
      ) y), '[]'))
$$;

/** Antwort aus dem CRM (Ausgangskorb mit Bezug auf die Mail): gleich als beantwortet zählen, nicht erst beim Abholen. */
create or replace function intern.pe_aus_ausgang() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.posteingang p
     set stand = 'erledigt', erledigt_am = coalesce(new.gesendet_am, now()), erledigt_von = new.freigegeben_von,
         erledigt_grund = 'beantwortet',
         reaktion_minuten = case when p.frist_am is not null
                                 then intern.pe_arbeitsminuten(p.eingang_am, coalesce(new.gesendet_am, now()),
                                                               intern.pe_einstellung()) end
   where p.id = new.bezug_id and p.stand in ('neu', 'offen', 'info');
  return new;
end
$$;
create trigger posteingang_beantwortet after update of status on public.ausgangskorb
  for each row when (new.status = 'gesendet' and old.status is distinct from 'gesendet'
                     and new.bezug_tabelle = 'posteingang' and new.bezug_id is not null)
  execute function intern.pe_aus_ausgang();

revoke execute on function public.posteingang_seit() from public, anon, authenticated;
revoke execute on function public.posteingang_aufnehmen(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.posteingang_unsortiert(int) from public, anon, authenticated;
revoke execute on function public.posteingang_sortieren(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.posteingang_antworten(jsonb) from public, anon, authenticated;
revoke execute on function public.posteingang_erinnern() from public, anon, authenticated;
grant execute on function public.posteingang_seit() to service_role;
grant execute on function public.posteingang_aufnehmen(uuid, text, jsonb) to service_role;
grant execute on function public.posteingang_unsortiert(int) to service_role;
grant execute on function public.posteingang_sortieren(uuid, jsonb) to service_role;
grant execute on function public.posteingang_antworten(jsonb) to service_role;
grant execute on function public.posteingang_erinnern() to service_role;
revoke execute on function public.posteingang_setzen(uuid, text, jsonb) from public, anon;
grant execute on function public.posteingang_setzen(uuid, text, jsonb) to authenticated;
revoke execute on function public.posteingang_auswertung(int) from public, anon;
grant execute on function public.posteingang_auswertung(int) to authenticated;
revoke execute on function intern.pe_einordnen(uuid, boolean) from public;
revoke execute on function intern.pe_zuordnen(uuid) from public;
