-- Phase 14, Teil 1: «Mein Tag» (V233 renderHeute, Bau-Auftrag «Heute»), siehe Entscheid 0025.
-- Eine Abfrage liefert alles, was heute für die angemeldete Person ansteht. Jede Liste ist kurz (höchstens 20)
-- und trägt ihre Gesamtzahl, damit die Seite schnell lädt und trotzdem ehrlich zählt.
-- Läuft mit den Rechten der Person (security invoker): Zahlungen sieht nur, wer den Zahlungsplan lesen darf.

/** Zeile einer Liste in «Mein Tag»: was, wann, wohin beim Klick. */
create or replace function intern.tag_zeile(
  p_art text, p_datum date, p_zeit text, p_titel text, p_unter text, p_telefon text,
  p_tabelle text, p_id uuid, p_extra jsonb default '{}'
) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object('art', p_art, 'datum', p_datum, 'zeit', p_zeit, 'titel', p_titel,
                                              'unter', nullif(p_unter, ''), 'telefon', nullif(p_telefon, ''),
                                              'tabelle', p_tabelle, 'id', p_id)) || coalesce(p_extra, '{}')
$$;

/** Liste mit Gesamtzahl: {anzahl, zeilen[≤ n]}. */
create or replace function intern.tag_liste(p_zeilen jsonb, p_n int default 20) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('anzahl', coalesce(jsonb_array_length(p_zeilen), 0),
                            'zeilen', coalesce((select jsonb_agg(z) from (select z from jsonb_array_elements(p_zeilen) z
                                                                          limit p_n) x), '[]'))
$$;

/**
 * «Mein Tag» der angemeldeten Person: Termine heute und morgen, Aufgaben für mich und von mir vergeben,
 * Offerten nachfassen, neue Leads und Wiedervorlagen, Fristen im Fahrplan, Zahlungen, Service-Fälle,
 * Kontrollen und Wartungen. Was niemandem zugeteilt ist, sieht zusätzlich die Administration (wie V233).
 */
create or replace function public.heute_fuer_mich() returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  ich_auth uuid := auth.uid();
  admin boolean := intern.hat_recht('admin');
  heute date := (now() at time zone 'Europe/Zurich')::date;
  mein_standort uuid;
  r jsonb;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'tag.kein_recht';
  end if;
  select p.standort_id into mein_standort from public.personen p where p.id = ich;

  r := jsonb_build_object('heute', heute, 'person', (select jsonb_build_object('id', p.id, 'name', p.name)
                                                      from public.personen p where p.id = ich));

  -- Termine heute und morgen: Besichtigungen, Service, Einsätze auf der Baustelle, eigener Kalender (Outlook).
  r := r || jsonb_build_object('termine', intern.tag_liste(coalesce((
    select jsonb_agg(t.z order by t.datum, t.zeit nulls first) from (
      select (v.termin_am at time zone 'Europe/Zurich')::date as datum, to_char(v.termin_am at time zone 'Europe/Zurich', 'HH24:MI') as zeit,
             intern.tag_zeile('besichtigung', (v.termin_am at time zone 'Europe/Zurich')::date,
                              to_char(v.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), intern.kontaktname(k),
                              concat_ws(', ', o.strasse, concat_ws(' ', o.plz, o.ort)), k.telefon, 'verkaufschancen', v.id) as z
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
                              concat_ws(', ', o.strasse, concat_ws(' ', o.plz, o.ort)), null, 'projekte', p.id)
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

  -- Aufgaben: für mich (fällig bis in 7 Tagen oder ohne Datum) und von mir an andere vergeben.
  r := r || jsonb_build_object(
    'aufgaben', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('aufgabe', a.faellig_am, null, a.titel, a.text, null, a.bezug_tabelle, a.bezug_id,
                                        jsonb_build_object('aufgabe_id', a.id, 'ueberfaellig', a.faellig_am < heute))
                       order by a.faellig_am nulls last, a.erstellt_am)
        from public.aufgaben a
       where a.geloescht_am is null and a.erledigt_am is null and a.person_id = ich
         and (a.faellig_am is null or a.faellig_am <= heute + 7)), '[]'), 30),
    'vergeben', intern.tag_liste(coalesce((
      -- Zuletzt Vergebenes zuerst: «Was habe ich eben delegiert?»
      select jsonb_agg(intern.tag_zeile('aufgabe', a.faellig_am, null, a.titel, p.name, null, a.bezug_tabelle, a.bezug_id,
                                        jsonb_build_object('aufgabe_id', a.id, 'ueberfaellig', a.faellig_am < heute))
                       order by a.erstellt_am desc)
        from public.aufgaben a left join public.personen p on p.id = a.person_id
       where a.geloescht_am is null and a.erledigt_am is null and a.erstellt_von = ich_auth
         and a.person_id is distinct from ich), '[]')));

  -- Verkauf: Offerten nachfassen (meine; ohne Zuständige sieht sie die Administration), neue Leads, Wiedervorlagen.
  r := r || jsonb_build_object(
    'nachfassen', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('nachfassen', o.faellig_am, null, o.name, concat_ws(' · ', o.nummer, o.standort),
                                        o.telefon, 'offerten', o.id, jsonb_build_object('betrag_rappen', o.betrag_rappen))
                       order by o.faellig_am nulls last)
        from public.offerten_liste o
       where o.stand = 'nachfassen' and o.faellig_am <= heute
         and (o.verantwortlich_id = ich or (o.verantwortlich_id is null and admin))), '[]')),
    'neue_leads', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('lead', g.eingang_am, null, g.name, concat_ws(' · ', g.lead_nummer, concat_ws(' ', g.plz, g.ort),
                                                  coalesce((select a.text_de from public.auswahlwerte a
                                                             where a.liste = 'quelle' and a.schluessel = g.quelle), g.quelle)),
                                        g.telefon, 'verkaufschancen', g.verkaufschance_id)
                       order by g.eingang_am)
        from public.verkauf_geschaefte g
       where g.stand = 'lead_neu' and g.verkaufschance_id is not null
         and (g.person_id = ich or (g.person_id is null and (admin or exists (
               select 1 from public.standorte s where s.id = mein_standort and s.kuerzel = g.standort))))), '[]')),
    'wiedervorlagen', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('wiedervorlage', g.wiedervorlage_am, null, g.name,
                                        concat_ws(' · ', g.lead_nummer, g.wiedervorlage_grund), g.telefon,
                                        'verkaufschancen', g.verkaufschance_id)
                       order by g.wiedervorlage_am)
        from public.verkauf_geschaefte g
       where g.wiedervorlage_am <= heute and g.gruppe = 'lead' and g.verkaufschance_id is not null
         and (g.person_id = ich or (g.person_id is null and admin))), '[]')));

  -- Abwicklung: Fristen im Fahrplan (überfällig oder in 7 Tagen), Zahlungen (fällig in 7 Tagen), Service, Kontrollen.
  r := r || jsonb_build_object(
    'fristen', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('frist', f.frist, null, concat_ws(' · ', p.nummer, p.titel), f.name_de, null,
                                        'projekte', p.id, jsonb_build_object('name_fr', f.name_fr, 'ueberfaellig', f.ueberfaellig,
                                                                             'bewilligung', f.bewilligung))
                       order by f.frist)
        from public.projekt_fahrplan f join public.projekte p on p.id = f.projekt_id
       where p.geloescht_am is null and (f.ueberfaellig or f.bald)
         and (p.verantwortlich_id = ich or (p.verantwortlich_id is null and admin))), '[]')),
    'zahlungen', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('zahlung', z.faellig_am, null, coalesce(intern.kontaktname(k), p.titel),
                                        concat_ws(' · ', p.nummer, z.bezeichnung), null, 'projekte', p.id,
                                        jsonb_build_object('betrag_rappen', z.betrag_rappen, 'ueberfaellig', z.faellig_am < heute))
                       order by z.faellig_am)
        from public.zahlungsplan z join public.projekte p on p.id = z.projekt_id
        left join public.kontakte k on k.id = p.kontakt_id
       where z.geloescht_am is null and p.geloescht_am is null and z.bezahlt_am is null and z.faellig_am <= heute + 7
         and (p.verantwortlich_id = ich or intern.hat_recht('finanzen'))), '[]')),
    'service', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('fall', (s.termin_am at time zone 'Europe/Zurich')::date, null, intern.kontaktname(k),
                                        concat_ws(' · ', s.nummer, s.titel), k.telefon, 'service_faelle', s.id,
                                        jsonb_build_object('prioritaet', s.prioritaet, 'status', s.status))
                       order by case s.prioritaet when 'hoch' then 0 when 'normal' then 1 else 2 end, s.termin_am nulls last)
        from public.service_faelle s join public.kontakte k on k.id = s.kontakt_id
       where s.geloescht_am is null and s.status <> 'erledigt'
         and (s.person_id = ich or (s.person_id is null and admin))), '[]')),
    'kontrollen', intern.tag_liste(coalesce((
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
      ) x), '[]')));
  return r;
end
$$;
revoke execute on function public.heute_fuer_mich() from public, anon;
grant execute on function public.heute_fuer_mich() to authenticated;
