-- Mein Tag: Ein offener Service-Fall mit Termin in der Vergangenheit bleibt im Tagesplan des Monteurs,
-- und zwar auf heute mit «überfällig», bis er erledigt ist. Vorher verschwand er am Tag nach dem Termin,
-- obwohl niemand vor Ort war oder der Fall noch offen ist (Rundgang Handy/Montage 3.11.2026).
-- Blick in eine vergangene Woche zeigt den Fall weiter am Termin-Tag (ohne «überfällig»).

create or replace function public.mein_tag(p_von date, p_bis date, p_person uuid default null)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_person uuid := intern.meine_person_id();
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
begin
  if p_person is not null and p_person is distinct from v_person then
    if not intern.hat_recht('preise') then
      raise exception using errcode = 'P0001', message = 'baustelle.fremde_person';
    end if;
    v_person := p_person;
  end if;
  return jsonb_build_object(
    'person_id', v_person,
    'laufend', (select jsonb_build_object('id', z.id, 'start', z.start, 'rapport_id', z.rapport_id, 'projekt_id', z.projekt_id, 'art', z.art)
                  from public.zeiten z where z.person_id = v_person and z.stopp is null and z.geloescht_am is null limit 1),
    'eintraege', coalesce((
      select jsonb_agg(e order by e ->> 'von', e ->> 'zeit') from (
        select jsonb_build_object(
          'typ', 'einsatz', 'id', es.id, 'von', es.von, 'bis', es.bis, 'zeit', null, 'notiz', es.notiz,
          'projekt', jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel, 'bau_status', p.bau_status,
                                        'elektriker', p.elektriker),
          'kunde', jsonb_build_object('name', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
                                      'telefon', k.telefon, 'email', k.email, 'sprache', k.sprache),
          'adresse', jsonb_build_object('strasse', o.strasse, 'plz', o.plz, 'ort', o.ort, 'breite', o.breite, 'laenge', o.laenge),
          'team', (select coalesce(jsonb_agg(t.name order by t.name), '[]') from public.personen t where t.id = any (es.personen)),
          'material', (select jsonb_build_object('zeilen', count(*), 'fehlt', count(*) filter (where m.fehlt > 0))
                         from public.projekt_material_stand m where m.projekt_id = p.id),
          'rapporte', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'art', r.art, 'datum', r.datum,
                                                                     'abgeschlossen_am', r.abgeschlossen_am) order by r.datum), '[]')
                         from public.rapporte r where r.projekt_id = p.id and r.geloescht_am is null
                          and r.service_fall_id is null and r.datum between es.von and es.bis)) as e
          from public.einsaetze es
          join public.projekte p on p.id = es.projekt_id and p.geloescht_am is null
          left join public.kontakte k on k.id = p.kontakt_id
          left join public.objekte o on o.id = p.objekt_id
         where es.geloescht_am is null and es.art <> 'geplant'
           and es.von <= p_bis and es.bis >= p_von and v_person = any (es.personen)
        union all
        select jsonb_build_object(
          'typ', 'service', 'id', f.id, 'von', case when u.ueberfaellig then v_heute else u.termin_tag end,
          'bis', case when u.ueberfaellig then v_heute else u.termin_tag end,
          'ueberfaellig', u.ueberfaellig, 'termin_tag', u.termin_tag,
          'zeit', to_char(f.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), 'notiz', f.beschreibung,
          'service', jsonb_build_object('id', f.id, 'nummer', f.nummer, 'titel', f.titel, 'garantie', f.garantie,
                                        'prioritaet', f.prioritaet, 'kategorie', f.kategorie, 'auswirkung', f.auswirkung,
                                        'komponente', f.komponente, 'fehlercode', f.fehlercode, 'dauer_minuten', f.dauer_minuten,
                                        'vor_ort_name', f.vor_ort_name, 'vor_ort_telefon', f.vor_ort_telefon, 'zugang', f.zugang,
                                        'checkliste', f.checkliste,
                                        'angekommen', exists (select 1 from jsonb_array_elements(f.verlauf) v
                                                               where v ->> 'art' = 'besuch'
                                                                 and (v ->> 'am')::timestamptz >= f.termin_am - interval '12 hours'),
                                        'anlage', case when a.id is null then null else jsonb_build_object(
                                          'id', a.id, 'leistung_kwp', a.leistung_kwp, 'komponenten', a.komponenten,
                                          'monitoring', a.monitoring) end),
          'projekt', case when p.id is null then null else jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel) end,
          'kunde', jsonb_build_object('name', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
                                      'telefon', k.telefon, 'email', k.email, 'sprache', k.sprache),
          'adresse', jsonb_build_object('strasse', o.strasse, 'plz', o.plz, 'ort', o.ort, 'breite', o.breite, 'laenge', o.laenge),
          'team', (select coalesce(jsonb_agg(t.name order by t.name), '[]') from public.personen t
                    where t.id = any (array_append(f.team, f.person_id))),
          'material', null,
          'rapporte', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'art', r.art, 'datum', r.datum,
                                                                     'abgeschlossen_am', r.abgeschlossen_am) order by r.datum), '[]')
                         from public.rapporte r where r.service_fall_id = f.id and r.geloescht_am is null)) as e
          from public.service_faelle f
          left join public.anlagen a on a.id = f.anlage_id
          left join public.projekte p on p.id = coalesce(f.projekt_id, a.projekt_id)
          left join public.kontakte k on k.id = coalesce(f.kontakt_id, p.kontakt_id)
          left join public.objekte o on o.id = coalesce(f.objekt_id, a.objekt_id, p.objekt_id)
          cross join lateral (select (f.termin_am at time zone 'Europe/Zurich')::date as termin_tag) d
          -- Überfällig nur, wenn heute im gefragten Zeitraum liegt: dann gehört der Fall auf heute.
          cross join lateral (select d.termin_tag < v_heute and v_heute between p_von and p_bis as ueberfaellig, d.termin_tag) u
         where f.geloescht_am is null and f.status <> 'erledigt' and (f.person_id = v_person or v_person = any (f.team))
           and (u.ueberfaellig or u.termin_tag between p_von and p_bis)
      ) x(e)), '[]'));
end
$$;
