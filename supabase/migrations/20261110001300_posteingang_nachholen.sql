-- Posteingang: ältere Mails nachholen (Chris 2.11.2026: «die alten Mails müssen auch rein, bei allen»).
-- Der normale Lauf holt nur Neues ab dem ersten Lauf. Dieser Teil holt rückwärts, Seite um Seite im Zeitplan, die
-- Mails der letzten «nachholen_monate» Monate aus jedem persönlichen Postfach (sobald die Person Microsoft verbunden
-- hat) und aus den Team-Postfächern wie info@. Gesendete Mails gehen nur in den Kundenverlauf (mails_vermerken).
--
-- Ältere Mails kommen als Archiv: erledigt (Grund «archiv») oder abgelegt, ohne Frist, ohne Zuständigkeitsglocke
-- und ohne KI. Sie tauchen darum nie in «Wartet auf uns», in der Reaktionszeit oder bei den Kopfzahlen auf.
-- Zugeordnet wird über die Absender-Adresse (Kunde) und Nummern im Betreff (Offerte, Projekt, Rechnung …).
-- Sichtbar wie entschieden: Mails aus dem eigenen Postfach nur die Person selbst, Team-Postfächer alle.

alter table public.posteingang drop constraint posteingang_erledigt_grund_check;
alter table public.posteingang add constraint posteingang_erledigt_grund_check
  check (erledigt_grund in ('beantwortet', 'hand', 'automatisch', 'archiv'));

-- Wie weit zurück (Monate). Ändern unter Posteingang › Einstellungen; grösser = holt einfach weiter zurück.
update public.einstellungen set wert = wert || '{"nachholen_monate": 12}'::jsonb
 where schluessel = 'posteingang' and not (wert ? 'nachholen_monate');

-- Wie weit jedes Postfach schon zurückgeholt ist. schluessel: Personen-ID (eigenes Postfach) oder Adresse.
create table intern.posteingang_nachholen (
  schluessel   text not null,
  ordner       text not null check (ordner in ('inbox', 'sentitems')),
  bis          timestamptz not null,           -- alles ab hier bis heute ist geholt
  anzahl       int not null default 0,
  geaendert_am timestamptz not null default now(),
  primary key (schluessel, ordner)
);

/**
 * Nächstes Stück zum Nachholen eines Postfach-Ordners (nur Server): {bis, grenze} oder null, wenn fertig oder aus.
 * Beim ersten Mal beginnt es beim Start des normalen Abholens (davor ist nichts geholt).
 */
create or replace function public.posteingang_nachholen_stand(p_schluessel text, p_ordner text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  v_monate int := coalesce(nullif(cfg ->> 'nachholen_monate', '')::int, 12);
  v_grenze timestamptz;
  v_bis timestamptz;
begin
  if not coalesce((cfg ->> 'aktiv')::boolean, true) or v_monate <= 0 then return null; end if;
  v_grenze := now() - make_interval(months => least(v_monate, 60));
  insert into intern.posteingang_nachholen (schluessel, ordner, bis)
  values (p_schluessel, p_ordner, coalesce(nullif(cfg ->> 'aktiv_seit', '')::timestamptz, now()))
  on conflict do nothing;
  select n.bis into v_bis from intern.posteingang_nachholen n where n.schluessel = p_schluessel and n.ordner = p_ordner;
  if v_bis <= v_grenze then return null; end if;
  return jsonb_build_object('bis', v_bis, 'grenze', v_grenze);
end
$$;

/** Nummern aus einem Betreff, die eine Akte sein könnten (exakter Vergleich in intern.pe_zuordnen). */
create or replace function intern.pe_nummern(p_text text) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select (regexp_matches(upper(coalesce(p_text, '')), '\m([A-Z]{0,3}[0-9]{3,}(?:[-/][0-9]+)?)', 'g'))[1] as x
     limit 20
  ) t
  where length(x) >= 4 and (x ~ '[A-Z]' or length(x) >= 5)
$$;

/**
 * Ältere Mails eines Postfachs als Archiv aufnehmen und den Stand weiterschieben (nur Server).
 * p_mails wie bei posteingang_aufnehmen (leer für «sentitems»). p_bis: älteste Mail dieser Seite; p_ende: Seite war
 * die letzte bis zur Grenze. Gibt die Zahl neuer Mails zurück.
 */
create or replace function public.posteingang_nachholen(p_schluessel text, p_ordner text, p_person uuid,
                                                        p_postfach text, p_mails jsonb, p_bis timestamptz,
                                                        p_ende boolean) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_domains text[] := coalesce((select array_agg(lower(d)) from public.integrationen i,
                                  jsonb_array_elements_text(i.einstellungen -> 'eigene_domains') d
                                 where i.dienst = 'microsoft'), '{}');
  v_eigen uuid := case when p_postfach = 'me' then p_person end;
  v_grenze timestamptz := now() - make_interval(months =>
    least(coalesce(nullif(intern.pe_einstellung() ->> 'nachholen_monate', '')::int, 12), 60));
  m jsonb;
  v_von text;
  v_kontakt uuid;
  v_lead uuid;
  v_art text;
  v_id uuid;
  v_eingang timestamptz;
  n int := 0;
begin
  for m in select * from jsonb_array_elements(coalesce(p_mails, '[]')) loop
    continue when nullif(m ->> 'kennung', '') is null or nullif(m ->> 'outlook_id', '') is null;
    v_von := lower(trim(m ->> 'von'));
    v_eingang := coalesce(nullif(m ->> 'eingang_am', '')::timestamptz, now());
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
      when v_kontakt is not null then 'kunde'
      else 'sonstiges'
    end;
    if v_art = 'anfrage' then
      select e.verkaufschance_id into v_lead from intern.mail_eingang e where e.kennung = m ->> 'kennung';
    end if;
    v_id := null;
    insert into public.posteingang (kennung, outlook_id, konversation_id, postfach, postfach_person_id, abgeholt_von,
                                    sichtbar, eingang_am, von_email, von_name, an, betreff, vorschau, web_link,
                                    hat_anhang, kontakt_id, verkaufschance_id, art, nummern, sortiert, zustaendig_id,
                                    stand, erledigt_am, erledigt_grund)
    values (m ->> 'kennung', m ->> 'outlook_id', nullif(m ->> 'konversation', ''), coalesce(p_postfach, 'me'), v_eigen,
            p_person, case when v_eigen is null then 'team' else 'person' end,
            v_eingang, nullif(v_von, ''), nullif(left(trim(m ->> 'von_name'), 200), ''), coalesce(m -> 'an', '[]'),
            left(m ->> 'betreff', 500), left(m ->> 'vorschau', 500), nullif(m ->> 'web_link', ''),
            coalesce((m ->> 'anhang')::boolean, false), v_kontakt, v_lead, v_art, intern.pe_nummern(m ->> 'betreff'),
            'regel', v_eigen,
            case when v_art in ('intern', 'werbung') then 'abgelegt' else 'erledigt' end,
            case when v_art not in ('intern', 'werbung') then v_eingang end,
            case when v_art not in ('intern', 'werbung') then 'archiv' end)
    on conflict (kennung) do nothing
    returning id into v_id;
    if v_id is not null then
      n := n + 1;
      if v_art not in ('intern', 'werbung') then perform intern.pe_zuordnen(v_id); end if;
    end if;
  end loop;

  update intern.posteingang_nachholen
     set bis = case when p_ende then least(bis, v_grenze) else least(bis, coalesce(p_bis, bis)) end,
         anzahl = anzahl + n, geaendert_am = now()
   where schluessel = p_schluessel and ordner = p_ordner;
  return n;
end
$$;

/** Wie weit das Nachholen ist (für die Einstellungen im Posteingang). */
create or replace function public.posteingang_nachholen_uebersicht() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'postfach', coalesce(p.name, n.schluessel), 'ordner', n.ordner, 'bis', n.bis, 'anzahl', n.anzahl,
           'fertig', n.bis <= now() - make_interval(months =>
             least(coalesce(nullif(intern.pe_einstellung() ->> 'nachholen_monate', '')::int, 12), 60)))
           order by coalesce(p.name, n.schluessel), n.ordner), '[]')
    from intern.posteingang_nachholen n
    left join public.personen p on p.id::text = n.schluessel
   where intern.hat_recht('admin')
$$;

revoke execute on function public.posteingang_nachholen_stand(text, text) from public, anon, authenticated;
revoke execute on function public.posteingang_nachholen(text, text, uuid, text, jsonb, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.posteingang_nachholen_stand(text, text) to service_role;
grant execute on function public.posteingang_nachholen(text, text, uuid, text, jsonb, timestamptz, boolean)
  to service_role;
revoke execute on function public.posteingang_nachholen_uebersicht() from public, anon;
grant execute on function public.posteingang_nachholen_uebersicht() to authenticated;
revoke execute on function intern.pe_nummern(text) from public;
