-- Phase 13, Teil 2: Was die KI über einen Kunden, Lead, eine Offerte, ein Projekt oder einen Service-Fall wissen darf
-- (Kontext), was im Tagesbriefing steht und welche Kunden zu einer eingegangenen Mail passen könnten.
-- Die Auswahl der Daten liegt hier und nicht im Code, damit klar ist, was die KI sieht: keine Einkaufspreise,
-- keine Margen und keine Kalkulation; Rechnungen nur mit Recht «finanzen».

/** Text kürzen, damit lange Mails den Kontext nicht sprengen. */
create or replace function intern.ki_kurz(p text, n int) returns text
language sql immutable set search_path = '' as $$
  select case when p is null then null when length(p) > n then left(p, n) || ' …' else p end
$$;

/**
 * Kontext für die KI zu einem Bezug: der Kunde, seine Leads, Offerten, Projekte, Service-Fälle, die Anlage und die
 * letzten Kontakte. Interne Notizen stehen unter «intern», damit die KI sie nur als Hintergrund nutzt.
 */
create or replace function intern.ki_kontext(p_tabelle text, p_id uuid, p_mit_finanzen boolean) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  kontakt uuid;
  lead uuid;
  offerte uuid;
  projekt uuid;
  fall uuid;
  k jsonb;
  r jsonb := '{}';
begin
  if p_tabelle = 'kontakte' then
    kontakt := p_id;
  elsif p_tabelle = 'verkaufschancen' then
    select v.kontakt_id, v.id into kontakt, lead from public.verkaufschancen v where v.id = p_id;
  elsif p_tabelle = 'offerten' then
    select o.kontakt_id, o.verkaufschance_id, o.id into kontakt, lead, offerte from public.offerten o where o.id = p_id;
  elsif p_tabelle = 'projekte' then
    select p.kontakt_id, p.verkaufschance_id, p.offerte_id, p.id into kontakt, lead, offerte, projekt
      from public.projekte p where p.id = p_id;
  elsif p_tabelle = 'service_faelle' then
    select s.kontakt_id, s.projekt_id, s.id into kontakt, projekt, fall from public.service_faelle s where s.id = p_id;
  else
    raise exception using errcode = '22023', message = 'ki.bezug_unbekannt';
  end if;
  if kontakt is null then
    raise exception using errcode = 'P0002', message = 'ki.nicht_gefunden';
  end if;

  k := intern.automation_kontakt(kontakt);
  r := jsonb_build_object(
    'bezug', jsonb_build_object('tabelle', p_tabelle, 'id', p_id),
    'heute', (now() at time zone 'Europe/Zurich')::date,
    'kunde', jsonb_strip_nulls(jsonb_build_object(
      'anrede', k ->> 'anrede', 'vorname', k ->> 'vorname', 'nachname', k ->> 'nachname', 'firma', k ->> 'firma',
      'email', k ->> 'email', 'telefon', k ->> 'telefon', 'sprache', coalesce(k ->> 'sprache', 'de'),
      'kundennummer', k ->> 'kundennummer', 'stand', (select s.stand from public.kundenstand(kontakt) s limit 1),
      'hat_wartungsvertrag', k -> 'hat_wartungsvertrag')),
    'objekte', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'strasse', o.strasse, 'plz', o.plz, 'ort', o.ort, 'kanton', o.kanton, 'gebaeudeart', o.gebaeudeart,
               'dachform', o.dachform, 'eigentum', o.eigentum, 'dach', nullif(o.dach, '{}'::jsonb),
               'verbrauch_kwh', o.verbrauch_kwh, 'netzbetreiber', o.netzbetreiber)) order by o.erstellt_am)
        from public.objekte o where o.kontakt_id = kontakt and o.geloescht_am is null), '[]'),
    'leads', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'id', v.id, 'nummer', v.nummer, 'hauptsache', v.id = lead, 'stand', intern.stand_verkaufschance(v),
               'eingang_am', v.eingang_am, 'quelle', v.quelle, 'interesse', to_jsonb(v.interesse),
               'termin_am', (v.termin_am at time zone 'Europe/Zurich')::timestamp(0),
               'wiedervorlage_am', v.wiedervorlage_am, 'wiedervorlage_grund', v.wiedervorlage_grund,
               'finanzierung', v.finanzierung, 'zeithorizont', v.zeithorizont, 'foerderung', v.foerderung,
               'erreichbarkeit', v.erreichbarkeit, 'verlustgrund', v.verlustgrund,
               'besichtigung', nullif(v.besichtigung, '{}'::jsonb),
               'kommentar_kunde', intern.ki_kurz(v.kommentar_kunde, 1500),
               'intern', intern.ki_kurz(v.notiz_intern, 800))) order by v.id = lead desc, v.eingang_am desc nulls last)
        from (select * from public.verkaufschancen x where x.kontakt_id = kontakt and x.geloescht_am is null
               order by x.id = lead desc, x.eingang_am desc nulls last limit 4) v), '[]'),
    'offerten', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'id', o.id, 'nummer', o.nummer, 'hauptsache', o.id = offerte, 'titel', o.titel,
               'stand', intern.stand_offerte(o, false), 'angebot_am', o.angebot_am,
               'betrag_exkl_mwst', intern.chf_text(o.betrag_rappen), 'leistung_kwp', o.leistung_kwp,
               'anzahl_module', o.anzahl_module, 'wechselrichter', o.wechselrichter, 'batterie', o.batterie,
               'wirtschaftlichkeit', nullif(o.wirtschaftlichkeit, '{}'::jsonb), 'entscheid', o.entscheid,
               'entscheid_am', o.entscheid_am, 'nachfassen_am', o.nachfassen_am, 'nachfassen', o.nachfassen,
               'vertagt_grund', o.vertagt_grund, 'verlustgrund', o.verlustgrund))
             order by o.id = offerte desc, o.angebot_am desc nulls last)
        from (select * from public.offerten x where x.kontakt_id = kontakt and x.geloescht_am is null
               order by x.id = offerte desc, x.angebot_am desc nulls last limit 5) o), '[]'),
    'projekte', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'id', p.id, 'nummer', p.nummer, 'hauptsache', p.id = projekt, 'titel', p.titel, 'status', p.status,
               'bau_status', p.bau_status, 'baubeginn', p.baubeginn, 'unterzeichnet_am', p.unterzeichnet_am,
               'vertragswert_inkl_mwst', intern.chf_text(p.vertragswert_rappen),
               'zahlungskonditionen', p.zahlungskonditionen,
               'fahrplan', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                                      'schritt', f.name_de, 'stand', f.stand, 'frist', f.frist,
                                      'erledigt_am', f.erledigt_am, 'ueberfaellig', nullif(f.ueberfaellig, false)))
                                    order by f.reihenfolge)
                              from public.projekt_fahrplan f where f.projekt_id = p.id),
               'anlage', (select jsonb_strip_nulls(jsonb_build_object(
                                   'leistung_kwp', a.leistung_kwp, 'komponenten', a.komponenten, 'ibn_am', a.ibn_am,
                                   'garantie_bis', a.garantie_bis, 'naechste_kontrolle', a.naechste_kontrolle))
                            from public.anlagen a where a.projekt_id = p.id and a.geloescht_am is null limit 1)))
             order by p.id = projekt desc, p.erstellt_am desc)
        from (select * from public.projekte x where x.kontakt_id = kontakt and x.geloescht_am is null
               order by x.id = projekt desc, x.erstellt_am desc limit 3) p), '[]'),
    'service', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'id', s.id, 'nummer', s.nummer, 'hauptsache', s.id = fall, 'titel', s.titel, 'kategorie', s.kategorie,
               'status', s.status, 'prioritaet', s.prioritaet, 'garantie', s.garantie,
               'termin_am', (s.termin_am at time zone 'Europe/Zurich')::timestamp(0),
               'beschreibung', intern.ki_kurz(s.beschreibung, 1200), 'erledigt_am', s.erledigt_am))
             order by s.id = fall desc, s.erstellt_am desc)
        from (select * from public.service_faelle x where x.kontakt_id = kontakt and x.geloescht_am is null
               and (x.id = fall or x.status <> 'erledigt' or x.erstellt_am > now() - interval '1 year')
               order by x.id = fall desc, x.erstellt_am desc limit 4) s), '[]'),
    'verlauf', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'am', (z.zeitpunkt at time zone 'Europe/Zurich')::timestamp(0), 'art', z.art, 'richtung', z.richtung,
               'ergebnis', z.ergebnis, 'von', (select p.name from public.personen p where p.id = z.person_id),
               'text', intern.ki_kurz(z.text, 700))) order by z.zeitpunkt desc)
        from (select * from public.aktivitaeten x where x.kontakt_id = kontakt and x.geloescht_am is null
               and x.art <> 'aenderung' order by x.zeitpunkt desc limit 12) z), '[]'),
    'offene_aufgaben', coalesce((
      select jsonb_agg(jsonb_build_object('titel', a.titel, 'faellig_am', a.faellig_am) order by a.faellig_am nulls last)
        from public.aufgaben a
       where a.erledigt_am is null and a.geloescht_am is null
         and a.bezug_id in (select x from unnest(array[kontakt, lead, offerte, projekt, fall]) x where x is not null)), '[]'));

  if p_mit_finanzen then
    r := r || jsonb_build_object('rechnungen', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'nummer', x.nummer, 'titel', x.titel, 'status', x.status, 'datum', x.datum, 'faellig_am', x.faellig_am,
               'total', intern.chf_text(x.total_rappen),
               'offen', intern.chf_text(x.total_rappen - coalesce(x.bezahlt_rappen, 0)), 'mahnstufe', x.mahnstufe))
             order by x.datum desc)
        from (select * from public.rechnungen y where y.kontakt_id = kontakt and y.geloescht_am is null
               and y.status <> 'entwurf' order by y.datum desc nulls last limit 5) x), '[]'));
  end if;
  return r;
end
$$;

/** Kontext für die App (Recht «basis») und für den Server (Automationen im Zeitplan). */
create or replace function public.ki_kontext(p_tabelle text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  dienst boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if not dienst and not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'ki.kein_recht';
  end if;
  return intern.ki_kontext(p_tabelle, p_id, dienst or intern.hat_recht('finanzen'));
end
$$;
revoke execute on function public.ki_kontext(text, uuid) from public, anon;
grant execute on function public.ki_kontext(text, uuid) to authenticated, service_role;

/**
 * Daten für das Tagesbriefing der angemeldeten Person: Termine, fällige Aufgaben, neue Leads, Offerten zum Nachfassen,
 * Entwürfe im Ausgangskorb, ungelesene Meldungen; mit Recht «finanzen» auch überfällige Rechnungen.
 * Jeder Eintrag hat «ref» (z. B. «lead:<id>»), damit die App einen Link zeigen kann.
 */
create or replace function public.ki_briefing_daten() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  heute date := (now() at time zone 'Europe/Zurich')::date;
  r jsonb;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'ki.kein_recht';
  end if;
  r := jsonb_build_object(
    'heute', heute,
    'wochentag', to_char(heute, 'ID'),
    'person', (select jsonb_build_object('name', p.name, 'rolle', p.rolle) from public.personen p where p.id = ich),
    'termine', coalesce((
      select jsonb_agg(t order by t ->> 'zeit') from (
        select jsonb_build_object('zeit', to_char(v.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), 'art', 'besichtigung',
                                  'text', concat_ws(', ', intern.kontaktname(k), o.ort), 'ref', 'lead:' || v.id) as t
          from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
          left join public.objekte o on o.id = v.objekt_id
         where v.tour_person_id = ich and v.geloescht_am is null
           and (v.termin_am at time zone 'Europe/Zurich')::date = heute
        union all
        select jsonb_build_object('zeit', to_char(s.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), 'art', 'service',
                                  'text', concat_ws(', ', s.titel, intern.kontaktname(k)), 'ref', 'service:' || s.id)
          from public.service_faelle s join public.kontakte k on k.id = s.kontakt_id
         where s.person_id = ich and s.geloescht_am is null and (s.termin_am at time zone 'Europe/Zurich')::date = heute
        union all
        select jsonb_build_object('zeit', '07:00', 'art', 'einsatz',
                                  'text', concat_ws(', ', e.art, p.nummer, p.titel), 'ref', 'projekt:' || p.id)
          from public.einsaetze e join public.projekte p on p.id = e.projekt_id
         where e.geloescht_am is null and heute between e.von and coalesce(e.bis, e.von) and ich = any (e.personen)
        union all
        select jsonb_build_object('zeit', case when c.ganztags then 'ganztags'
                                                else to_char(c.beginn at time zone 'Europe/Zurich', 'HH24:MI') end,
                                  'art', 'kalender', 'text', concat_ws(', ', c.betreff, c.ort), 'ref', null)
          from public.kalender_eintraege c
         where c.person_id = ich and c.geloescht_am is null and (c.beginn at time zone 'Europe/Zurich')::date = heute
           and c.quelle is distinct from 'crm'
        limit 15) x), '[]'),
    'aufgaben', coalesce((
      select jsonb_agg(jsonb_build_object('titel', a.titel, 'faellig_am', a.faellig_am,
                                          'ueberfaellig', a.faellig_am < heute, 'ref', 'aufgabe:' || a.id)
                       order by a.faellig_am nulls last)
        from (select * from public.aufgaben x where x.person_id = ich and x.erledigt_am is null and x.geloescht_am is null
               and (x.faellig_am is null or x.faellig_am <= heute + 1) order by x.faellig_am nulls last limit 12) a), '[]'),
    'aufgaben_anzahl', (select count(*) from public.aufgaben x where x.person_id = ich and x.erledigt_am is null
                          and x.geloescht_am is null and x.faellig_am <= heute),
    'neue_leads', coalesce((
      select jsonb_agg(jsonb_build_object('text', concat_ws(', ', intern.kontaktname(k), o.ort), 'eingang_am', v.eingang_am,
                                          'quelle', v.quelle, 'ref', 'lead:' || v.id) order by v.eingang_am)
        from (select * from public.verkaufschancen x where x.geloescht_am is null
               and intern.stand_verkaufschance(x) = 'neu'
               and (x.tour_person_id = ich or (x.tour_person_id is null and x.standort_id is not distinct from
                    (select p.standort_id from public.personen p where p.id = ich)))
               order by x.eingang_am limit 8) v
        join public.kontakte k on k.id = v.kontakt_id left join public.objekte o on o.id = v.objekt_id), '[]'),
    'nachfassen', coalesce((
      select jsonb_agg(jsonb_build_object('text', concat_ws(', ', o.nummer, intern.kontaktname(k)),
                                          'betrag', intern.chf_text(o.betrag_rappen), 'angebot_am', o.angebot_am,
                                          'ref', 'offerte:' || o.id) order by o.angebot_am)
        from (select * from public.offerten x where x.geloescht_am is null and x.verantwortlich_id = ich
               and intern.stand_offerte(x, false) = 'nachfassen' order by x.angebot_am limit 8) o
        join public.kontakte k on k.id = o.kontakt_id), '[]'),
    'ausgangskorb_wartet', (select count(*) from public.ausgangskorb a where a.status = 'wartet' and a.geloescht_am is null
                              and (a.absender_person_id = ich or (a.absender_person_id is null and a.erstellt_von =
                                   (select p.auth_user_id from public.personen p where p.id = ich)))),
    'meldungen_ungelesen', (select count(*) from public.benachrichtigungen b where b.person_id = ich
                              and b.gelesen_am is null and b.ausgeblendet_am is null));
  if intern.hat_recht('finanzen') then
    r := r || jsonb_build_object('rechnungen_ueberfaellig', (
      select jsonb_build_object('anzahl', count(*), 'offen', intern.chf_text(sum(x.total_rappen - coalesce(x.bezahlt_rappen, 0))::bigint))
        from public.rechnungen x where x.geloescht_am is null and x.status in ('gestellt', 'teilbezahlt')
         and x.faellig_am < heute));
  end if;
  return r;
end
$$;
revoke execute on function public.ki_briefing_daten() from public, anon;
grant execute on function public.ki_briefing_daten() to authenticated;

/**
 * Wer passt zu einer eingegangenen Mail? Treffer nach Mail-Adresse, Telefon (letzte 9 Ziffern) und Name mit PLZ,
 * mit dem Grund und den offenen Leads, Offerten, Projekten und Service-Fällen des Kontakts. Die KI liest nur die Felder
 * aus der Mail; die Zuordnung selbst ist nachvollziehbar und kostet nichts.
 */
create or replace function public.ki_zuordnung(p_email text, p_telefon text, p_vorname text, p_nachname text, p_plz text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tel text := right(regexp_replace(coalesce(p_telefon, ''), '\D', '', 'g'), 9);
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'ki.kein_recht';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'kontakt_id', k.id, 'name', intern.kontaktname(k), 'kundennummer', k.kundennummer, 'grund', t.grund,
             'leads', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'nummer', v.nummer,
                                                                    'stand', intern.stand_verkaufschance(v)))
                                  from public.verkaufschancen v where v.kontakt_id = k.id and v.geloescht_am is null), '[]'),
             'offerten', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'nummer', o.nummer,
                                                                       'stand', intern.stand_offerte(o, false)))
                                     from public.offerten o where o.kontakt_id = k.id and o.geloescht_am is null), '[]'),
             'projekte', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel))
                                     from public.projekte p where p.kontakt_id = k.id and p.geloescht_am is null), '[]'),
             'service', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'nummer', s.nummer, 'titel', s.titel))
                                    from public.service_faelle s where s.kontakt_id = k.id and s.geloescht_am is null
                                     and s.status <> 'erledigt'), '[]'))
           order by t.rang)
      from (select distinct on (x.id) x.id, x.grund, x.rang from (
              select k.id, 'email' as grund, 1 as rang from public.kontakte k
               where nullif(trim(p_email), '') is not null and lower(k.email) = lower(trim(p_email)) and k.geloescht_am is null
              union all
              select k.id, 'telefon', 2 from public.kontakte k
               where length(tel) = 9 and right(regexp_replace(coalesce(k.telefon, ''), '\D', '', 'g'), 9) = tel
                 and k.geloescht_am is null
              union all
              select k.id, 'name_plz', 3 from public.kontakte k
               where nullif(trim(p_nachname), '') is not null and lower(k.nachname) = lower(trim(p_nachname))
                 and (nullif(trim(p_vorname), '') is null or lower(k.vorname) = lower(trim(p_vorname)))
                 and k.geloescht_am is null
                 and (nullif(trim(p_plz), '') is null
                      or exists (select 1 from public.objekte o where o.kontakt_id = k.id and o.plz = trim(p_plz)))
            ) x order by x.id, x.rang limit 20) t
      join public.kontakte k on k.id = t.id), '[]');
end
$$;
revoke execute on function public.ki_zuordnung(text, text, text, text, text) from public, anon;
grant execute on function public.ki_zuordnung(text, text, text, text, text) to authenticated;

/**
 * Erfahrungswerte für die Lead-Bewertung: wie viele Leads derselben Quelle und desselben Standorts in den letzten
 * zwei Jahren zum Auftrag wurden. Gibt der KI eine Grundlage statt einer Schätzung aus dem Nichts.
 */
create or replace function intern.ki_lead_statistik(p_lead uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with v as (select * from public.verkaufschancen where id = p_lead),
       basis as (
         select x.quelle, x.standort_id,
                -- Importierte Projekte kennen ihren Lead oft nicht: dann zählt ein späteres Projekt desselben Kunden.
                exists (select 1 from public.projekte p where p.geloescht_am is null
                         and (p.verkaufschance_id = x.id or (p.verkaufschance_id is null and p.kontakt_id = x.kontakt_id
                              and p.erstellt_am >= x.eingang_am))) as auftrag,
                exists (select 1 from public.offerten o where o.geloescht_am is null
                         and (o.verkaufschance_id = x.id or (o.verkaufschance_id is null and o.kontakt_id = x.kontakt_id
                              and o.erstellt_am >= x.eingang_am))) as offerte
           from public.verkaufschancen x
          where x.geloescht_am is null and x.eingang_am >= (now() - interval '2 years')::date and x.id <> p_lead)
  select jsonb_build_object(
    'alle', (select jsonb_build_object('leads', count(*), 'mit_offerte', count(*) filter (where offerte),
                                       'auftraege', count(*) filter (where auftrag)) from basis),
    'gleiche_quelle', (select jsonb_build_object('quelle', v.quelle, 'leads', count(*),
                                                 'mit_offerte', count(*) filter (where b.offerte),
                                                 'auftraege', count(*) filter (where b.auftrag))
                         from basis b, v where b.quelle is not distinct from v.quelle group by v.quelle),
    'gleicher_standort', (select jsonb_build_object('leads', count(*), 'auftraege', count(*) filter (where b.auftrag))
                            from basis b, v where b.standort_id is not distinct from v.standort_id))
$$;

/** Statistik für die Lead-Bewertung (App mit Recht «basis»). */
create or replace function public.ki_lead_statistik(p_lead uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'ki.kein_recht';
  end if;
  return intern.ki_lead_statistik(p_lead);
end
$$;
revoke execute on function public.ki_lead_statistik(uuid) from public, anon;
grant execute on function public.ki_lead_statistik(uuid) to authenticated;
