-- Einsatzplanung (Modul-Prüfung 23A): Wochenplan je Person. Eine Abfrage liefert Montage-Einsätze, Service- und
-- Wartungstermine, Abwesenheiten und abgelaufene Kurse/Ausweise; die Konflikte (abwesend, doppelt, Kurs) rechnet die
-- App daraus, damit Plan und rote Markierung immer zusammenpassen. Verschieben per Ziehen über zwei kleine Abläufe.

/**
 * Wochenplan im Zeitraum (höchstens 6 Wochen): Personen, Subunternehmer, Einträge, Abwesenheiten, abgelaufene Kurse.
 * Für alle mit Recht «basis»; Abwesenheiten nur mit Art, ohne Notiz.
 */
create or replace function public.wochenplan(p_von date, p_bis date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'wochenplan.kein_recht'; end if;
  if p_bis < p_von or p_bis - p_von > 42 then raise exception using errcode = 'P0001', message = 'wochenplan.zeitraum'; end if;
  return jsonb_build_object(
    'personen', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'kuerzel', p.kuerzel, 'rolle', p.rolle)
                                           order by p.name)
                            from public.personen p where p.aktiv and p.geloescht_am is null
                             -- Rollen der Zeilen sind Daten (einstellungen.baustelle.wochenplan_rollen); wer eingeplant ist, steht immer da.
                             and (p.rolle in (select jsonb_array_elements_text(coalesce(
                                    (select wert -> 'wochenplan_rollen' from public.einstellungen where schluessel = 'baustelle'),
                                    '["montage", "monteur", "projektleitung"]')))
                                  or exists (select 1 from public.einsaetze e where p.id = any (e.personen) and e.geloescht_am is null
                                               and e.von <= p_bis and e.bis >= p_von)
                                  or exists (select 1 from public.service_faelle f where f.person_id = p.id and f.geloescht_am is null
                                               and (f.termin_am at time zone 'Europe/Zurich')::date between p_von and p_bis))), '[]'),
    'subunternehmer', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.name)
                                  from public.subunternehmer s
                                 where s.geloescht_am is null
                                   and exists (select 1 from public.einsaetze e where e.subunternehmer_id = s.id and e.geloescht_am is null
                                                 and e.von <= p_bis and e.bis >= p_von)), '[]'),
    'eintraege', coalesce((select jsonb_agg(x order by x ->> 'von') from (
        select jsonb_build_object('typ', 'montage', 'id', e.id, 'art', e.art, 'von', e.von, 'bis', e.bis, 'zeit', null,
                                  'personen', to_jsonb(e.personen), 'subunternehmer_id', e.subunternehmer_id,
                                  'projekt_id', p.id, 'nummer', p.nummer,
                                  'titel', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma, p.titel),
                                  'ort', o.ort, 'elektriker', p.elektriker) as x
          from public.einsaetze e
          join public.projekte p on p.id = e.projekt_id and p.geloescht_am is null
          left join public.kontakte k on k.id = p.kontakt_id
          left join public.objekte o on o.id = p.objekt_id
         where e.geloescht_am is null and e.von <= p_bis and e.bis >= p_von
        union all
        select jsonb_build_object('typ', case when f.kategorie = 'wartung' then 'wartung' else 'service' end, 'id', f.id,
                                  'art', f.kategorie,
                                  'von', (f.termin_am at time zone 'Europe/Zurich')::date,
                                  'bis', (f.termin_am at time zone 'Europe/Zurich')::date,
                                  'zeit', to_char(f.termin_am at time zone 'Europe/Zurich', 'HH24:MI'),
                                  'personen', case when f.person_id is null then '[]'::jsonb else jsonb_build_array(f.person_id) end,
                                  'subunternehmer_id', null, 'projekt_id', f.projekt_id, 'nummer', f.nummer,
                                  'titel', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma, f.titel),
                                  'ort', o.ort, 'elektriker', null)
          from public.service_faelle f
          left join public.anlagen a on a.id = f.anlage_id
          left join public.projekte p on p.id = coalesce(f.projekt_id, a.projekt_id)
          left join public.kontakte k on k.id = coalesce(f.kontakt_id, p.kontakt_id)
          left join public.objekte o on o.id = coalesce(a.objekt_id, p.objekt_id)
         where f.geloescht_am is null and f.status <> 'erledigt' and f.termin_am is not null
           and (f.termin_am at time zone 'Europe/Zurich')::date between p_von and p_bis
      ) y(x)), '[]'),
    'abwesenheiten', coalesce((select jsonb_agg(jsonb_build_object('person_id', a.person_id, 'art', a.art, 'von', a.von,
                                                                   'bis', a.bis, 'halbtag', a.halbtag))
                                 from public.abwesenheiten a
                                where a.geloescht_am is null and a.von <= p_bis and a.bis >= p_von), '[]'),
    -- Neuester Eintrag je Person und Art: abgelaufen, wenn «gültig bis» vor dem Ende des Zeitraums liegt.
    'kurse', coalesce((select jsonb_agg(jsonb_build_object('person_id', q.person_id, 'art', q.art, 'gueltig_bis', q.gueltig_bis))
                         from (select distinct on (x.person_id, x.art) x.person_id, x.art, x.gueltig_bis
                                 from public.qualifikationen x where x.geloescht_am is null
                                order by x.person_id, x.art, x.gueltig_bis desc nulls first) q
                        where q.gueltig_bis is not null and q.gueltig_bis < p_bis), '[]'));
end
$$;

/**
 * Einsatz im Wochenplan verschieben: um Tage verschieben und auf Wunsch eine Person durch eine andere ersetzen
 * (Ziehen auf eine andere Zeile). Rechte wie beim Zeitplan des Projekts (RLS, security invoker).
 */
create or replace function public.einsatz_verschieben(p_id uuid, p_tage int, p_von_person uuid default null,
                                                      p_zu_person uuid default null) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.einsaetze e
     set von = e.von + p_tage, bis = e.bis + p_tage,
         personen = case
           when p_zu_person is null or p_zu_person is not distinct from p_von_person then e.personen
           when p_von_person is null then array(select distinct x from unnest(e.personen || p_zu_person) x)
           else array(select distinct case when x = p_von_person then p_zu_person else x end from unnest(e.personen) x)
         end
   where e.id = p_id and e.geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'wochenplan.nicht_gefunden'; end if;
end
$$;

/** Service-Termin im Wochenplan auf einen anderen Tag (gleiche Uhrzeit) und auf Wunsch eine andere Person legen. */
create or replace function public.service_termin_verschieben(p_id uuid, p_datum date, p_person uuid default null)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.service_faelle f
     set termin_am = (p_datum + (f.termin_am at time zone 'Europe/Zurich')::time) at time zone 'Europe/Zurich',
         person_id = coalesce(p_person, f.person_id)
   where f.id = p_id and f.geloescht_am is null and f.termin_am is not null;
  if not found then raise exception using errcode = 'P0001', message = 'wochenplan.nicht_gefunden'; end if;
end
$$;

revoke execute on function public.wochenplan(date, date) from public, anon;
revoke execute on function public.einsatz_verschieben(uuid, int, uuid, uuid) from public, anon;
revoke execute on function public.service_termin_verschieben(uuid, date, uuid) from public, anon;
grant execute on function public.wochenplan(date, date) to authenticated;
grant execute on function public.einsatz_verschieben(uuid, int, uuid, uuid) to authenticated;
grant execute on function public.service_termin_verschieben(uuid, date, uuid) to authenticated;
