-- Marketing vollständig (Entscheid 0039), Teil 2: Abläufe. Kampagne am Lead, Zahlen je Kampagne und Quelle,
-- Kosten aus den Lieferantenrechnungen, Messe-Leads, Dankes-Mail, Öffnungen und Klicks, Social Media «von Hand»,
-- Fotos für Werbung, Heizung aus dem Gebäuderegister.

-- Text der Dankes-Mail nach einer Messe (Serien-Mail an die Messe-Leads, Klick = Freigabe).
update public.einstellungen set wert = jsonb_build_object(
  'messe_danke', jsonb_build_object(
    'de', jsonb_build_object('betreff', 'Danke für Ihren Besuch an der {Messe}',
      'text', E'{Anrede}\n\nvielen Dank für das Gespräch an unserem Stand an der {Messe}. Wie besprochen melden wir uns in den nächsten Tagen bei Ihnen, um die nächsten Schritte zu vereinbaren.\n\nHaben Sie in der Zwischenzeit Fragen, antworten Sie einfach auf diese Mail.\n\nFreundliche Grüsse\n{Absender}'),
    'fr', jsonb_build_object('betreff', 'Merci de votre visite au {Messe}',
      'text', E'{Anrede}\n\nmerci pour l’échange à notre stand au {Messe}. Comme convenu, nous vous contacterons ces prochains jours pour fixer la suite.\n\nSi vous avez des questions d’ici là, il suffit de répondre à cet e-mail.\n\nMeilleures salutations\n{Absender}')))
  || wert
 where schluessel = 'marketing';

/** Kennzeichen aus dem Namen, wenn keines gesetzt ist (klein, Bindestriche, eindeutig). */
create or replace function intern.kampagne_kennzeichen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_basis text;
  v_neu text;
  n int := 1;
begin
  if new.kennzeichen is null or new.kennzeichen = '' then
    v_basis := left(trim(both '-' from regexp_replace(
      translate(lower(new.name), 'äöüàâéèêëîïôûùç', 'aouaaeeeeiiouuc'), '[^a-z0-9]+', '-', 'g')), 36);
    if length(v_basis) < 2 then v_basis := 'kampagne'; end if;
    v_neu := v_basis;
    while exists (select 1 from public.marketing_kampagnen where kennzeichen = v_neu and id <> new.id) loop
      n := n + 1;
      v_neu := v_basis || '-' || n;
    end loop;
    new.kennzeichen := v_neu;
  end if;
  -- Quelle der Leads aus der Art, wenn nicht von Hand gesetzt.
  new.quelle := coalesce(nullif(new.quelle, ''),
    case new.art when 'messe' then 'messe' when 'empfehlung' then 'empfehlung' when 'online' then 'webseite' end);
  return new;
end
$$;
create trigger kennzeichen before insert or update of name, kennzeichen, art, quelle on public.marketing_kampagnen
  for each row execute function intern.kampagne_kennzeichen();

/**
 * Kampagne eines neuen Leads bestimmen (nur wenn keine gesetzt ist):
 * 1. Kennzeichen im Formular der Website («Kampagne: xyz» im Kommentar),
 * 2. Messe: die Messe-Kampagne, während der (oder bis 3 Tage danach) der Lead einging,
 * 3. Kontakt wurde in den letzten 60 Tagen von einer Kampagne angeschrieben (Antwort auf Serien-Mail, Newsletter),
 * 4. laufende Kampagne mit derselben Quelle (gekaufte Leads, Empfehlungen).
 */
create or replace function intern.kampagne_zuordnen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tag date := coalesce(new.eingang_am, current_date);
  v_kz text;
begin
  if new.kampagne_id is not null then return new; end if;
  v_kz := lower(substring(coalesce(new.kommentar_kunde, '') || E'\n' || coalesce(new.notiz_intern, '')
                          from '(?:[Kk]ampagne|[Cc]ampagne|utm_campaign)\s*[:=]\s*([A-Za-z0-9-]+)'));
  if v_kz is not null then
    select id into new.kampagne_id from public.marketing_kampagnen where kennzeichen = v_kz and geloescht_am is null;
    if new.kampagne_id is not null then return new; end if;
  end if;
  if new.quelle = 'messe' then
    select id into new.kampagne_id from public.marketing_kampagnen
     where art = 'messe' and geloescht_am is null and start_am is not null
       and v_tag between start_am and coalesce(ende_am, start_am) + 3
     order by start_am desc limit 1;
    if new.kampagne_id is not null then return new; end if;
  end if;
  select k.kampagne_id into new.kampagne_id from public.kampagnen k
   where k.kampagne_id is not null and k.geloescht_am is null and new.kontakt_id = any (k.kontakte)
     and k.versendet_am >= now() - interval '60 days'
   order by k.versendet_am desc limit 1;
  if new.kampagne_id is not null then return new; end if;
  if nullif(new.quelle, '') is not null then
    select id into new.kampagne_id from public.marketing_kampagnen
     where quelle = new.quelle and art <> 'messe' and status = 'laeuft' and geloescht_am is null
       and v_tag between coalesce(start_am, v_tag) and coalesce(ende_am, v_tag)
     order by start_am desc nulls last limit 1;
  end if;
  return new;
end
$$;
create trigger kampagne_zuordnen before insert on public.verkaufschancen
  for each row execute function intern.kampagne_zuordnen();

/** Darf Kosten und Budget sehen: Preise oder Finanzen (Verkauf sieht Leads und Aufträge, aber keine Kosten). */
create or replace function intern.marketing_kosten_sichtbar() returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.hat_recht('finanzen') or intern.hat_recht('preise')
$$;

/** Kosten einer Kampagne: zugeordnete Lieferantenrechnungen (inkl. MWST wie in AbaNinja) plus gekaufte Leads. */
create or replace function intern.kampagne_kosten(k public.marketing_kampagnen) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce((select sum(z.betrag_rappen) from public.kreditor_zahlungen z
                    where z.kampagne_id = k.id and z.geloescht_am is null and z.status <> 'storniert'), 0)
       + case when k.art = 'gekaufte_leads' and k.quelle is not null then coalesce((
           select sum(e.gekauft * coalesce((c.wert -> 'quellen_kosten_rappen' ->> k.quelle)::bigint, 0))
             from public.lead_einkauf e, public.einstellungen c
            where c.schluessel = 'kennzahlen' and e.quelle = k.quelle and e.geloescht_am is null
              and e.monat between date_trunc('month', coalesce(k.start_am, e.monat))::date and coalesce(k.ende_am, e.monat)), 0)
         else 0 end
$$;

/**
 * Zahlen je Kampagne: erreicht (Mails/Briefe), geöffnet, geklickt, Leads, Offerten, Aufträge, Auftragswert
 * (Vertragswert inkl. MWST), Kosten (nur mit Recht preise oder finanzen, sonst leer).
 */
create or replace function public.kampagnen_zahlen()
returns table (kampagne_id uuid, erreicht int, geoeffnet int, geklickt int, leads int, offerten int, auftraege int,
               auftragswert_rappen bigint, kosten_rappen bigint)
language sql stable security definer set search_path = '' as $$
  select k.id,
         coalesce((select sum(l.anzahl) from public.kampagnen l where l.kampagne_id = k.id and l.geloescht_am is null), 0)::int,
         (select count(distinct e.ausgang_id) from public.marketing_ereignisse e
            join public.ausgangskorb a on a.id = e.ausgang_id
            join public.kampagnen l on l.id = a.bezug_id and a.bezug_tabelle = 'kampagnen'
           where l.kampagne_id = k.id and e.art = 'oeffnung')::int,
         (select count(distinct e.ausgang_id) from public.marketing_ereignisse e
            join public.ausgangskorb a on a.id = e.ausgang_id
            join public.kampagnen l on l.id = a.bezug_id and a.bezug_tabelle = 'kampagnen'
           where l.kampagne_id = k.id and e.art = 'klick')::int,
         (select count(*) from public.verkaufschancen v where v.kampagne_id = k.id and v.geloescht_am is null)::int,
         (select count(distinct o.id) from public.offerten o join public.verkaufschancen v on v.id = o.verkaufschance_id
           where v.kampagne_id = k.id and o.geloescht_am is null and v.geloescht_am is null)::int,
         (select count(distinct p.id) from public.projekte p join public.offerten o on o.id = p.offerte_id
            join public.verkaufschancen v on v.id = o.verkaufschance_id
           where v.kampagne_id = k.id and p.geloescht_am is null and p.unterzeichnet_am is not null)::int,
         (select coalesce(sum(x.vertragswert_rappen), 0) from (
            select distinct p.id, p.vertragswert_rappen from public.projekte p join public.offerten o on o.id = p.offerte_id
              join public.verkaufschancen v on v.id = o.verkaufschance_id
             where v.kampagne_id = k.id and p.geloescht_am is null and p.unterzeichnet_am is not null) x)::bigint,
         case when intern.marketing_kosten_sichtbar() then intern.kampagne_kosten(k) end
    from public.marketing_kampagnen k
   where k.geloescht_am is null and intern.hat_recht('basis')
$$;
revoke execute on function public.kampagnen_zahlen() from public, anon;
grant execute on function public.kampagnen_zahlen() to authenticated;

/**
 * «Woher kommen die Aufträge?» je Quelle für ein Jahr (Eingang des Leads): Leads, Aufträge, Auftragswert und Kosten
 * (Kosten der Kampagnen mit dieser Quelle im Jahr, nur mit Recht preise oder finanzen).
 */
create or replace function public.marketing_quellen(p_jahr int)
returns table (quelle text, leads int, auftraege int, auftragswert_rappen bigint, kosten_rappen bigint)
language sql stable security definer set search_path = '' as $$
  with l as (
    select v.id, coalesce(nullif(v.quelle, ''), 'ohne') as quelle
      from public.verkaufschancen v
     where v.geloescht_am is null
       and extract(year from coalesce(v.eingang_am, (v.erstellt_am at time zone 'Europe/Zurich')::date)) = p_jahr),
  a as (
    select distinct l.quelle, p.id, p.vertragswert_rappen
      from l join public.offerten o on o.verkaufschance_id = l.id and o.geloescht_am is null
      join public.projekte p on p.offerte_id = o.id and p.geloescht_am is null and p.unterzeichnet_am is not null)
  select q.quelle,
         (select count(*) from l where l.quelle = q.quelle)::int,
         (select count(*) from a where a.quelle = q.quelle)::int,
         (select coalesce(sum(a.vertragswert_rappen), 0) from a where a.quelle = q.quelle)::bigint,
         case when intern.marketing_kosten_sichtbar() then
           (select coalesce(sum(intern.kampagne_kosten(k)), 0) from public.marketing_kampagnen k
             where k.geloescht_am is null and k.quelle = q.quelle
               and extract(year from coalesce(k.start_am, current_date)) = p_jahr)::bigint end
    from (select distinct l.quelle from l) q
   where intern.hat_recht('basis')
   order by 2 desc
$$;
revoke execute on function public.marketing_quellen(int) from public, anon;
grant execute on function public.marketing_quellen(int) to authenticated;

/** Budget und Kosten je Kanal für ein Jahr (nur Recht preise oder finanzen). */
create or replace function public.marketing_budget(p_jahr int)
returns table (kanal text, budget_rappen bigint, kosten_rappen bigint)
language sql stable security definer set search_path = '' as $$
  with cfg as (select coalesce(wert -> 'budget' -> p_jahr::text, '{}') as b from public.einstellungen where schluessel = 'marketing'),
  kosten as (
    select coalesce(z.marketing_kanal,
             case k.art when 'messe' then 'messe' when 'online' then 'online' when 'gekaufte_leads' then 'gekaufte_leads'
                        when 'social' then 'social' when 'empfehlung' then 'gutschriften' else 'sonstiges' end) as kanal,
           z.betrag_rappen
      from public.kreditor_zahlungen z left join public.marketing_kampagnen k on k.id = z.kampagne_id
     where z.geloescht_am is null and z.status <> 'storniert' and coalesce(z.marketing_kanal, '') <> 'kein'
       and (z.kampagne_id is not null or z.marketing_kanal is not null)
       and extract(year from coalesce(z.rechnung_am, (z.erstellt_am at time zone 'Europe/Zurich')::date)) = p_jahr
    union all
    select 'gekaufte_leads', intern.kampagne_kosten(k) - coalesce((select sum(z.betrag_rappen) from public.kreditor_zahlungen z
             where z.kampagne_id = k.id and z.geloescht_am is null and z.status <> 'storniert'), 0)
      from public.marketing_kampagnen k
     where k.art = 'gekaufte_leads' and k.geloescht_am is null and extract(year from coalesce(k.start_am, current_date)) = p_jahr)
  select n.kanal, coalesce((select (cfg.b ->> n.kanal)::bigint from cfg), 0),
         coalesce((select sum(kosten.betrag_rappen) from kosten where kosten.kanal = n.kanal), 0)::bigint
    from unnest(array['online', 'messe', 'gekaufte_leads', 'druck', 'social', 'gutschriften', 'sonstiges']) n (kanal)
   where intern.marketing_kosten_sichtbar()
$$;
revoke execute on function public.marketing_budget(int) from public, anon;
grant execute on function public.marketing_budget(int) to authenticated;

/**
 * Lieferantenrechnungen, die nach Werbung aussehen und noch keiner Kampagne zugeordnet sind (letzte 12 Monate).
 * Stichworte in einstellungen.marketing.kosten_stichworte. Security invoker: nur mit Recht finanzen sichtbar.
 */
create or replace function public.marketing_kosten_offen()
returns setof public.kreditor_zahlungen
language sql stable security invoker set search_path = '' as $$
  select z.* from public.kreditor_zahlungen z
   where z.geloescht_am is null and z.kampagne_id is null and z.marketing_kanal is null and z.status <> 'storniert'
     and coalesce(z.rechnung_am, (z.erstellt_am at time zone 'Europe/Zurich')::date) >= current_date - 365
     and exists (select 1 from public.einstellungen e, jsonb_array_elements_text(e.wert -> 'kosten_stichworte') w
                  where e.schluessel = 'marketing'
                    and concat_ws(' ', z.firma, z.text, z.kategorie) ilike '%' || w || '%')
   order by z.rechnung_am desc nulls last
$$;
revoke execute on function public.marketing_kosten_offen() from public, anon;
grant execute on function public.marketing_kosten_offen() to authenticated;

/** Lieferantenrechnung einer Kampagne und einem Kanal zuordnen, oder «kein» (keine Werbung). Nur Recht finanzen. */
create or replace function public.marketing_kosten_zuordnen(p_id uuid, p_kampagne uuid, p_kanal text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'finanzen.kein_recht';
  end if;
  if p_kanal is not null and p_kanal not in ('online', 'messe', 'gekaufte_leads', 'druck', 'social', 'gutschriften', 'sonstiges', 'kein') then
    raise exception using errcode = 'P0001', message = 'marketing.kanal';
  end if;
  update public.kreditor_zahlungen
     set kampagne_id = case when p_kanal = 'kein' then null else p_kampagne end, marketing_kanal = p_kanal
   where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
end
$$;
revoke execute on function public.marketing_kosten_zuordnen(uuid, uuid, text) from public, anon;
grant execute on function public.marketing_kosten_zuordnen(uuid, uuid, text) to authenticated;

/**
 * Lead an der Messe erfassen (Handy, auch offline: wiederholbar mit ID vom Gerät). Legt Kontakt, Gebäude und Lead
 * an (Quelle Messe, Kampagne, Zuteilung wie immer), Einwilligung für den Newsletter, Terminwunsch als
 * Wiedervorlage und die Aufgabe «innert 5 Tagen anrufen» für die zuständige Person.
 */
create or replace function public.messe_lead_erfassen(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_alt text := 'messe-crm:' || (p ->> 'id');
  k public.marketing_kampagnen;
  v_lead uuid;
  v_kontakt uuid;
  v_person uuid;
  v_name text;
  v_frist date;
begin
  if nullif(p ->> 'id', '') is null then raise exception using errcode = 'P0001', message = 'marketing.id_fehlt'; end if;
  select id into v_lead from public.verkaufschancen where alt_id = v_alt;
  if found then return v_lead; end if;
  select * into k from public.marketing_kampagnen where id = (p ->> 'kampagne_id')::uuid and geloescht_am is null;
  if not found or k.art <> 'messe' then raise exception using errcode = 'P0001', message = 'marketing.keine_messe'; end if;

  v_lead := public.lead_anlegen(jsonb_build_object(
    'kontakt', jsonb_build_object('vorname', p ->> 'vorname', 'nachname', p ->> 'nachname', 'email', p ->> 'email',
                                  'telefon', p ->> 'telefon', 'sprache', nullif(p ->> 'sprache', '')),
    'objekt', jsonb_build_object('strasse', p ->> 'strasse', 'plz', p ->> 'plz', 'ort', p ->> 'ort'),
    'lead', jsonb_build_object('quelle', 'messe', 'alt_id', v_alt,
              'eingang_am', coalesce(nullif(p ->> 'am', ''), current_date::text),
              'interesse', coalesce(p -> 'interesse', '[]'),
              'kommentar_kunde', nullif(trim(p ->> 'notiz'), ''),
              'notiz_intern', 'Erfasst an der ' || k.name || coalesce(' von ' || intern.mein_vorname(), ''))));
  update public.verkaufschancen
     set kampagne_id = k.id,
         wiedervorlage_am = case when coalesce((p ->> 'termin')::boolean, false)
                                 then greatest(coalesce(k.ende_am, current_date), current_date) + 1 end,
         wiedervorlage_grund = case when coalesce((p ->> 'termin')::boolean, false) then 'Termin gewünscht (Messe)' end
   where id = v_lead
  returning kontakt_id, tour_person_id into v_kontakt, v_person;
  if coalesce((p ->> 'newsletter')::boolean, false) then
    update public.kontakte
       set einwilligung = coalesce(einwilligung, '{}') || jsonb_build_object('datum', current_date, 'quelle', k.name)
     where id = v_kontakt and not werbesperre;
  end if;
  select intern.kontaktname(x) into v_name from public.kontakte x where x.id = v_kontakt;
  v_frist := greatest(coalesce(k.ende_am, current_date), current_date) + 5;
  insert into public.aufgaben (titel, faellig_am, person_id, bezug_tabelle, bezug_id)
  values ('Messe-Lead anrufen: ' || coalesce(v_name, '–') || ' (' || k.name || ')', v_frist,
          coalesce(v_person, intern.meine_person_id()), 'verkaufschancen', v_lead);
  return v_lead;
end
$$;
revoke execute on function public.messe_lead_erfassen(jsonb) from public, anon;
grant execute on function public.messe_lead_erfassen(jsonb) to authenticated;

