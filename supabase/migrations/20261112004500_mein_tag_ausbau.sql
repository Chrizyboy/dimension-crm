-- «Mein Tag» ausbauen (2.11.2026, Entscheid 0041): Chris fand die Startseite «nur Fassade».
-- Die Karten nach Bereich bleiben (M1 B), dazu kommt:
--  1. Verschieben (M2 A): jede Zeile auf morgen, nächste Woche oder ein Datum. Aufgaben ändern ihr Fälligkeitsdatum,
--     alles andere (Nachfassen, Lead, Frist …) wird nur für mich ausgeblendet; die Stand-Regeln im Verkauf
--     bleiben unberührt (setze_stand).
--  2. Gründe: wie lange eine Offerte schon offen ist, wie alt ein Lead ist, wer eine Aufgabe vergeben hat.
--  3. «Wartet auf deine Freigabe»: eigene Mails und SMS im Ausgangskorb.
--  4. Wochenziele je Person (M3 A), gesetzt von Administration oder Recht «finanzen» (Geschäftsleitung).
--  5. «Team heute» (M4 A): wer ist wo, für alle, ohne Grund einer Abwesenheit.

-- 1. Verschobene Zeilen je Person ----------------------------------------------------------------------------
create table public.tag_verschoben (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.personen (id) default intern.meine_person_id(),
  schluessel text not null check (length(schluessel) between 3 and 120),   -- «art:id», z. B. nachfassen:<uuid>
  bis        date not null                                                  -- ab diesem Tag wieder sichtbar
);
select intern.richte_fachtabelle_ein('tag_verschoben');
create unique index tag_verschoben_eindeutig on public.tag_verschoben (person_id, schluessel) where geloescht_am is null;
-- Persönlich: nur die Person selbst sieht und ändert ihre Einträge.
drop policy lesen on public.tag_verschoben;
drop policy anlegen on public.tag_verschoben;
drop policy aendern on public.tag_verschoben;
create policy lesen on public.tag_verschoben for select to authenticated
  using ((select intern.hat_recht('basis')) and person_id = (select intern.meine_person_id()));
create policy anlegen on public.tag_verschoben for insert to authenticated
  with check ((select intern.hat_recht('basis')) and person_id = (select intern.meine_person_id()));
create policy aendern on public.tag_verschoben for update to authenticated
  using ((select intern.hat_recht('basis')) and person_id = (select intern.meine_person_id()))
  with check (person_id = (select intern.meine_person_id()));

/**
 * Zeile in «Mein Tag» verschieben. Aufgaben: neues Fälligkeitsdatum (nur eigene). Alles andere: bis `p_bis`
 * ausblenden; `p_bis` leer = wieder zeigen. Datum muss in der Zukunft liegen (höchstens ein Jahr).
 */
create or replace function public.tag_verschieben(p_art text, p_id uuid, p_bis date) returns void
language plpgsql set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  heute date := (now() at time zone 'Europe/Zurich')::date;
  s text := p_art || ':' || p_id::text;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'tag.kein_recht';
  end if;
  if p_art is null or p_id is null or p_art !~ '^[a-z_]{2,20}$' then
    raise exception using errcode = 'P0001', message = 'tag.zeile_unbekannt';
  end if;
  if p_bis is not null and (p_bis <= heute or p_bis > heute + 366) then
    raise exception using errcode = 'P0001', message = 'tag.datum_ungueltig';
  end if;

  if p_art = 'aufgabe' then
    if p_bis is null then return; end if;
    update public.aufgaben set faellig_am = p_bis
     where id = p_id and person_id = ich and erledigt_am is null and geloescht_am is null;
    if not found then raise exception using errcode = '42501', message = 'tag.nicht_meine_aufgabe'; end if;
    return;
  end if;

  update public.tag_verschoben set geloescht_am = now()
   where person_id = ich and schluessel = s and geloescht_am is null;
  if p_bis is not null then
    insert into public.tag_verschoben (person_id, schluessel, bis) values (ich, s, p_bis);
  end if;
end
$$;
revoke execute on function public.tag_verschieben(text, uuid, date) from public, anon;
grant execute on function public.tag_verschieben(text, uuid, date) to authenticated;

/** Liste mit Gesamtzahl wie intern.tag_liste, ohne die Zeilen, die ich verschoben habe (`p_weg`: Schlüssel → bis). */
create or replace function intern.tag_liste_ohne(p_zeilen jsonb, p_weg jsonb, p_n int default 20) returns jsonb
language sql immutable set search_path = '' as $$
  select intern.tag_liste(coalesce((
    select jsonb_agg(z order by i) from jsonb_array_elements(p_zeilen) with ordinality x(z, i)
     where not (coalesce(p_weg, '{}') ? ((z ->> 'art') || ':' || coalesce(z ->> 'aufgabe_id', z ->> 'id', '')))), '[]'), p_n)
$$;

-- 4. Wochenziele je Person ----------------------------------------------------------------------------------
update public.einstellungen set wert = wert || '{"ziele_personen": {}}'::jsonb
 where schluessel = 'kennzahlen' and not wert ? 'ziele_personen';

/** Wer Ziele setzen darf: Administration oder Recht «finanzen» (Geschäftsleitung, bis die Rolle GL kommt). */
create or replace function intern.darf_ziele_setzen() returns boolean
language sql stable set search_path = '' as $$
  select intern.hat_recht('admin') or intern.hat_recht('finanzen')
$$;

/** Der Schlüssel «kennzahlen» ist offen (Kosten pro Lead); die Ziele darin nur mit intern.darf_ziele_setzen. */
create or replace function intern.ziele_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'kennzahlen' and auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role'
     and (tg_op = 'INSERT' or new.wert -> 'ziele_personen' is distinct from old.wert -> 'ziele_personen')
     and coalesce(new.wert -> 'ziele_personen', '{}') <> '{}' and not intern.darf_ziele_setzen() then
    raise exception using errcode = '42501', message = 'tag.ziele_kein_recht';
  end if;
  return new;
end
$$;
create trigger ziele_schuetzen before insert or update on public.einstellungen
  for each row execute function intern.ziele_schuetzen();

/**
 * Wochenziele einer Person setzen. Erlaubt: leads_neu, termine, gesendet (pro Woche, Anzahl) und
 * auftrag_monat_rappen (Aufträge pro Monat, Betrag). Leer oder 0 = kein Ziel; alles leer = Person ohne Ziele.
 */
create or replace function public.kennzahlen_ziele_setzen(p_person uuid, p_ziele jsonb) returns void
language plpgsql set search_path = '' as $$
declare
  erlaubt constant text[] := array['leads_neu', 'termine', 'gesendet', 'auftrag_monat_rappen'];
  k text;
  v jsonb;
  sauber jsonb := '{}';
begin
  if not intern.darf_ziele_setzen() then
    raise exception using errcode = '42501', message = 'tag.ziele_kein_recht';
  end if;
  if not exists (select 1 from public.personen p where p.id = p_person and p.geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'tag.person_unbekannt';
  end if;
  for k, v in select * from jsonb_each(coalesce(p_ziele, '{}')) loop
    if k <> all (erlaubt) then raise exception using errcode = 'P0001', message = 'tag.ziel_unbekannt'; end if;
    if jsonb_typeof(v) = 'null' then continue; end if;
    if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric < 0 or (v #>> '{}')::numeric <> trunc((v #>> '{}')::numeric)
       or (k <> 'auftrag_monat_rappen' and (v #>> '{}')::numeric > 1000)
       or (v #>> '{}')::numeric > 100000000000 then
      raise exception using errcode = 'P0001', message = 'tag.ziel_ungueltig';
    end if;
    if (v #>> '{}')::numeric > 0 then sauber := sauber || jsonb_build_object(k, v); end if;
  end loop;
  update public.einstellungen
     set wert = jsonb_set(wert, '{ziele_personen}', case when sauber = '{}' then coalesce(wert -> 'ziele_personen', '{}') - p_person::text
                                                 else coalesce(wert -> 'ziele_personen', '{}') || jsonb_build_object(p_person::text, sauber) end)
   where schluessel = 'kennzahlen';
end
$$;
revoke execute on function public.kennzahlen_ziele_setzen(uuid, jsonb) from public, anon;
grant execute on function public.kennzahlen_ziele_setzen(uuid, jsonb) to authenticated;

/** Meine Ziele mit Stand: Woche (Mo–So) für Anzahlen, Kalendermonat für Aufträge. Null, wenn keine Ziele gesetzt. */
create or replace function intern.meine_ziele(p_ich uuid, p_heute date) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  ziele jsonb := (select e.wert -> 'ziele_personen' -> p_ich::text from public.einstellungen e where e.schluessel = 'kennzahlen');
  wo date := p_heute - (extract(isodow from p_heute)::int - 1);
  mo date := date_trunc('month', p_heute)::date;
  r jsonb := '[]';
  k text;
begin
  if ziele is null or ziele = '{}' then return null; end if;
  foreach k in array array['leads_neu', 'termine', 'gesendet'] loop
    if ziele ? k then
      r := r || jsonb_build_array(jsonb_build_object('schluessel', k, 'ziel', ziele -> k, 'ist',
             (select count(*) from public.kennzahlen_fakten(wo, wo + 6) f where f.schluessel = k and f.person_id = p_ich)));
    end if;
  end loop;
  if ziele ? 'auftrag_monat_rappen' then
    r := r || jsonb_build_array(jsonb_build_object('schluessel', 'auftrag_monat_rappen', 'ziel', ziele -> 'auftrag_monat_rappen',
           'ist', (select coalesce(sum(f.betrag_rappen), 0) from public.kennzahlen_fakten(mo, (mo + interval '1 month - 1 day')::date) f
                    where f.schluessel = 'angenommen' and f.person_id = p_ich)));
  end if;
  return jsonb_build_object('woche_von', wo, 'monat', to_char(mo, 'YYYY-MM'), 'zeilen', r);
end
$$;

-- 5. Team heute ---------------------------------------------------------------------------------------------
/**
 * Wer ist heute wo (für alle, M4 A): abwesend (ohne Grund), auf der Baustelle, beim Kunden (Besichtigung/Service)
 * oder im Büro. Läuft als Besitzer, damit alle den Stand sehen, gibt aber nur Ort, Zeit und Projektnummer heraus,
 * nie Art der Abwesenheit oder Betreff aus dem Kalender.
 */
create or replace function public.team_heute() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  heute date := (now() at time zone 'Europe/Zurich')::date;
begin
  if intern.meine_person_id() is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'tag.kein_recht';
  end if;
  return coalesce((
    select jsonb_agg(x.z order by x.reihe, x.name) from (
      select p.name,
             case s.status when 'abwesend' then 3 when 'da' then 2 else 1 end as reihe,
             jsonb_strip_nulls(jsonb_build_object('id', p.id, 'name', p.name, 'kuerzel', p.kuerzel,
               'status', s.status, 'ort', s.ort, 'zeit', s.zeit, 'nummer', s.nummer, 'halbtag', s.halbtag,
               'standort', st.name)) as z
        from public.personen p
        left join public.standorte st on st.id = p.standort_id
        cross join lateral (
          select * from (
            select 1 as prio, 'abwesend'::text as status, null::text as ort, null::text as zeit, null::text as nummer,
                   bool_or(a.halbtag) as halbtag
              from public.abwesenheiten_alle a
             where a.person_id = p.id and heute between a.von and a.bis
            having count(*) > 0
            union all
            (select 2, 'baustelle', concat_ws(' ', o.plz, o.ort), null, pr.nummer, null
               from public.einsaetze e join public.projekte pr on pr.id = e.projekt_id
               left join public.objekte o on o.id = pr.objekt_id
              where e.geloescht_am is null and p.id = any (e.personen) and heute between e.von and coalesce(e.bis, e.von)
              order by e.von limit 1)
            union all
            (select 3, 'kunde', concat_ws(' ', o.plz, o.ort), to_char(v.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), null, null
               from public.verkaufschancen v left join public.objekte o on o.id = v.objekt_id
              where v.geloescht_am is null and v.tour_person_id = p.id
                and (v.termin_am at time zone 'Europe/Zurich')::date = heute
              order by v.termin_am limit 1)
            union all
            (select 4, 'service', null, to_char(f.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), f.nummer, null
               from public.service_faelle f
              where f.geloescht_am is null and f.person_id = p.id and f.status <> 'erledigt'
                and (f.termin_am at time zone 'Europe/Zurich')::date = heute
              order by f.termin_am limit 1)
            union all
            select 9, 'da', null, null, null, null
          ) alle order by prio limit 1
        ) s
       where p.aktiv and p.geloescht_am is null and p.auth_user_id is not null
         -- Wochenende: nur wer wirklich eingeplant ist.
         and (extract(isodow from heute) < 6 or s.status <> 'da')
    ) x), '[]');
end
$$;
revoke execute on function public.team_heute() from public, anon;
grant execute on function public.team_heute() to authenticated;

-- 1.–4. «Mein Tag» neu: wie 20261105000100, mit Verschieben, Gründen, Freigaben und Zielen -----------------
create or replace function public.heute_fuer_mich() returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  ich_auth uuid := auth.uid();
  admin boolean := intern.hat_recht('admin');
  heute date := (now() at time zone 'Europe/Zurich')::date;
  mein_standort uuid;
  weg jsonb;
  r jsonb;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'tag.kein_recht';
  end if;
  select p.standort_id into mein_standort from public.personen p where p.id = ich;
  select coalesce(jsonb_object_agg(v.schluessel, v.bis), '{}') into weg
    from public.tag_verschoben v where v.person_id = ich and v.geloescht_am is null and v.bis > heute;

  r := jsonb_build_object('heute', heute, 'person', (select jsonb_build_object('id', p.id, 'name', p.name)
                                                      from public.personen p where p.id = ich),
                          'darf_ziele', intern.darf_ziele_setzen());

  -- Termine heute und morgen (unverändert, nicht verschiebbar: das ist der Kalender).
  r := r || jsonb_build_object('termine', intern.tag_liste(coalesce((
    select jsonb_agg(t.z order by t.datum, t.zeit nulls first) from (
      select (v.termin_am at time zone 'Europe/Zurich')::date as datum, to_char(v.termin_am at time zone 'Europe/Zurich', 'HH24:MI') as zeit,
             intern.tag_zeile('besichtigung', (v.termin_am at time zone 'Europe/Zurich')::date,
                              to_char(v.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), intern.kontaktname(k),
                              concat_ws(', ', o.strasse, concat_ws(' ', o.plz, o.ort)), k.telefon, 'verkaufschancen', v.id,
                              jsonb_strip_nulls(jsonb_build_object('plz', o.plz))) as z
        from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
        left join public.objekte o on o.id = v.objekt_id
       where v.geloescht_am is null and v.tour_person_id = ich
         and (v.termin_am at time zone 'Europe/Zurich')::date between heute and heute + 1
      union all
      select (s.termin_am at time zone 'Europe/Zurich')::date, to_char(s.termin_am at time zone 'Europe/Zurich', 'HH24:MI'),
             intern.tag_zeile('service', (s.termin_am at time zone 'Europe/Zurich')::date,
                              to_char(s.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), intern.kontaktname(k),
                              concat_ws(' · ', s.nummer, s.titel), k.telefon, 'service_faelle', s.id)
        from public.service_faelle s join public.kontakte k on k.id = s.kontakt_id
       where s.geloescht_am is null and s.person_id = ich and s.status <> 'erledigt'
         and (s.termin_am at time zone 'Europe/Zurich')::date between heute and heute + 1
      union all
      select greatest(e.von, heute), null,
             intern.tag_zeile('einsatz', greatest(e.von, heute), null, concat_ws(' · ', p.nummer, p.titel),
                              concat_ws(', ', o.strasse, concat_ws(' ', o.plz, o.ort)), null, 'projekte', p.id,
                              jsonb_strip_nulls(jsonb_build_object('plz', o.plz)))
        from public.einsaetze e join public.projekte p on p.id = e.projekt_id
        left join public.objekte o on o.id = p.objekt_id
       where e.geloescht_am is null and ich = any (e.personen)
         and e.von <= heute + 1 and coalesce(e.bis, e.von) >= heute
      union all
      select (c.beginn at time zone 'Europe/Zurich')::date,
             case when c.ganztags then null else to_char(c.beginn at time zone 'Europe/Zurich', 'HH24:MI') end,
             intern.tag_zeile('kalender', (c.beginn at time zone 'Europe/Zurich')::date,
                              case when c.ganztags then null else to_char(c.beginn at time zone 'Europe/Zurich', 'HH24:MI') end,
                              coalesce(nullif(c.betreff, ''), 'Termin'), c.ort, null, null, null)
        from public.kalender_eintraege c
       where c.geloescht_am is null and c.person_id = ich and c.quelle is distinct from 'crm'
         and (c.beginn at time zone 'Europe/Zurich')::date between heute and heute + 1
    ) t), '[]'), 30));

  -- Aufgaben: für mich (fällig bis in 7 Tagen oder ohne Datum, mit «von wem») und von mir an andere vergeben.
  r := r || jsonb_build_object(
    'aufgaben', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('aufgabe', a.faellig_am, null, a.titel, a.text, null, a.bezug_tabelle, a.bezug_id,
                                        jsonb_strip_nulls(jsonb_build_object('aufgabe_id', a.id, 'ueberfaellig', a.faellig_am < heute,
                                          'von', (select v.name from public.personen v
                                                   where v.auth_user_id = a.erstellt_von and v.id <> ich))))
                       order by a.faellig_am nulls last, a.erstellt_am)
        from public.aufgaben a
       where a.geloescht_am is null and a.erledigt_am is null and a.person_id = ich
         and (a.faellig_am is null or a.faellig_am <= heute + 7)), '[]'), 30),
    'vergeben', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('aufgabe', a.faellig_am, null, a.titel, p.name, null, a.bezug_tabelle, a.bezug_id,
                                        jsonb_build_object('aufgabe_id', a.id, 'ueberfaellig', a.faellig_am < heute))
                       order by a.erstellt_am desc)
        from public.aufgaben a left join public.personen p on p.id = a.person_id
       where a.geloescht_am is null and a.erledigt_am is null and a.erstellt_von = ich_auth
         and a.person_id is distinct from ich), '[]')));

  -- Verkauf: Nachfassen (mit Tagen seit Versand), neue Leads (mit Alter), Wiedervorlagen.
  r := r || jsonb_build_object(
    'nachfassen', intern.tag_liste_ohne(coalesce((
      select jsonb_agg(intern.tag_zeile('nachfassen', o.faellig_am, null, o.name, concat_ws(' · ', o.nummer, o.standort),
                                        o.telefon, 'offerten', o.id,
                                        jsonb_strip_nulls(jsonb_build_object('betrag_rappen', o.betrag_rappen,
                                          'tage', heute - o.angebot_am, 'ueberfaellig', o.faellig_am < heute)))
                       order by o.faellig_am nulls last)
        from public.offerten_liste o
       where o.stand = 'nachfassen' and o.faellig_am <= heute
         and (o.verantwortlich_id = ich or (o.verantwortlich_id is null and admin))), '[]'), weg),
    'neue_leads', intern.tag_liste_ohne(coalesce((
      select jsonb_agg(intern.tag_zeile('lead', g.eingang_am, null, g.name, concat_ws(' · ', g.lead_nummer, concat_ws(' ', g.plz, g.ort),
                                                  coalesce((select a.text_de from public.auswahlwerte a
                                                             where a.liste = 'quelle' and a.schluessel = g.quelle), g.quelle)),
                                        g.telefon, 'verkaufschancen', g.verkaufschance_id,
                                        jsonb_strip_nulls(jsonb_build_object('tage', heute - g.eingang_am)))
                       order by g.eingang_am)
        from public.verkauf_geschaefte g
       where g.stand = 'lead_neu' and g.verkaufschance_id is not null
         and (g.person_id = ich or (g.person_id is null and (admin or exists (
               select 1 from public.standorte s where s.id = mein_standort and s.kuerzel = g.standort))))), '[]'), weg),
    'wiedervorlagen', intern.tag_liste_ohne(coalesce((
      select jsonb_agg(intern.tag_zeile('wiedervorlage', g.wiedervorlage_am, null, g.name,
                                        concat_ws(' · ', g.lead_nummer, g.wiedervorlage_grund), g.telefon,
                                        'verkaufschancen', g.verkaufschance_id,
                                        jsonb_build_object('ueberfaellig', g.wiedervorlage_am < heute))
                       order by g.wiedervorlage_am)
        from public.verkauf_geschaefte g
       where g.wiedervorlage_am <= heute and g.gruppe = 'lead' and g.verkaufschance_id is not null
         and (g.person_id = ich or (g.person_id is null and admin))), '[]'), weg));

  -- Abwicklung: Fristen, Zahlungen, Service, Kontrollen (wie bisher, verschiebbar).
  r := r || jsonb_build_object(
    'fristen', intern.tag_liste_ohne(coalesce((
      select jsonb_agg(intern.tag_zeile('frist', f.frist, null, concat_ws(' · ', p.nummer, p.titel), f.name_de, null,
                                        'projekte', p.id, jsonb_build_object('name_fr', f.name_fr, 'ueberfaellig', f.ueberfaellig,
                                                                             'bewilligung', f.bewilligung))
                       order by f.frist)
        from public.projekt_fahrplan f join public.projekte p on p.id = f.projekt_id
       where p.geloescht_am is null and (f.ueberfaellig or f.bald)
         and (p.verantwortlich_id = ich or (p.verantwortlich_id is null and admin))), '[]'), weg),
    'zahlungen', intern.tag_liste_ohne(coalesce((
      select jsonb_agg(intern.tag_zeile('zahlung', z.faellig_am, null, coalesce(intern.kontaktname(k), p.titel),
                                        concat_ws(' · ', p.nummer, z.bezeichnung), null, 'projekte', p.id,
                                        jsonb_build_object('betrag_rappen', z.betrag_rappen, 'ueberfaellig', z.faellig_am < heute))
                       order by z.faellig_am)
        from public.zahlungsplan z join public.projekte p on p.id = z.projekt_id
        left join public.kontakte k on k.id = p.kontakt_id
       where z.geloescht_am is null and p.geloescht_am is null and z.bezahlt_am is null and z.faellig_am <= heute + 7
         and (p.verantwortlich_id = ich or intern.hat_recht('finanzen'))), '[]'), weg),
    'service', intern.tag_liste_ohne(coalesce((
      select jsonb_agg(intern.tag_zeile('fall', (s.termin_am at time zone 'Europe/Zurich')::date, null, intern.kontaktname(k),
                                        concat_ws(' · ', s.nummer, s.titel), k.telefon, 'service_faelle', s.id,
                                        jsonb_build_object('prioritaet', s.prioritaet, 'status', s.status))
                       order by case s.prioritaet when 'hoch' then 0 when 'normal' then 1 else 2 end, s.termin_am nulls last)
        from public.service_faelle s join public.kontakte k on k.id = s.kontakt_id
       where s.geloescht_am is null and s.status <> 'erledigt'
         and (s.person_id = ich or (s.person_id is null and admin))), '[]'), weg),
    'kontrollen', intern.tag_liste_ohne(coalesce((
      select jsonb_agg(x.z order by x.datum) from (
        select a.naechste_kontrolle as datum,
               intern.tag_zeile('kontrolle', a.naechste_kontrolle, null, coalesce(intern.kontaktname(k), p.titel),
                                concat_ws(' · ', p.nummer, o.ort), k.telefon, 'projekte', p.id,
                                jsonb_build_object('ueberfaellig', a.naechste_kontrolle < heute)) as z
          from public.anlagen a join public.projekte p on p.id = a.projekt_id
          left join public.kontakte k on k.id = p.kontakt_id left join public.objekte o on o.id = a.objekt_id
         where a.geloescht_am is null and a.naechste_kontrolle <= heute + 30
           and (p.verantwortlich_id = ich or (p.verantwortlich_id is null and admin))
        union all
        select w.naechste_wartung,
               intern.tag_zeile('wartung', w.naechste_wartung, null, intern.kontaktname(k), w.nummer, k.telefon,
                                'wartungsvertraege', w.id, jsonb_build_object('ueberfaellig', w.naechste_wartung < heute))
          from public.wartungsvertraege w join public.kontakte k on k.id = w.kontakt_id
          left join public.projekte p on p.id = w.projekt_id
         where w.geloescht_am is null and w.status = 'aktiv' and w.naechste_wartung <= heute + 30
           and (p.verantwortlich_id = ich or (p.verantwortlich_id is null and admin))
      ) x), '[]'), weg));

  -- Wartet auf meine Freigabe (wie 20261111001100, Modul-Prüfung 27A): in meinem Namen, ohne Absender die
  -- Administration; dazu der Kanal für den Grund und «Verschieben» bleibt hier aus (Klick = Freigabe, Regel 6).
  r := r || jsonb_build_object(
    'freigaben', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('freigabe', (a.erstellt_am at time zone 'Europe/Zurich')::date, null,
                                        coalesce(nullif(a.betreff, ''), left(a.text, 60), a.an), a.an, null,
                                        'ausgangskorb', a.id,
                                        jsonb_build_object('ueberfaellig', a.erstellt_am < now() - make_interval(days => coalesce(
                                          ((select e.wert from public.einstellungen e where e.schluessel = 'automationen')
                                            ->> 'freigabe_erinnern_tage')::int, 2)),
                                                           'status', a.status, 'kanal', a.kanal))
                       order by a.erstellt_am)
        from public.ausgangskorb a
       where a.geloescht_am is null and a.status in ('wartet', 'fehler')
         and (a.absender_person_id = ich or (a.absender_person_id is null and admin))), '[]'), 30),
    'ziele', intern.meine_ziele(ich, heute));
  return r;
end
$$;
revoke execute on function public.heute_fuer_mich() from public, anon;
grant execute on function public.heute_fuer_mich() to authenticated;
