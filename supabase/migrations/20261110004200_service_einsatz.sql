-- Service & Garantie, Schritt 2 (Entscheid 0039): Einsatz mit Team und Dauer im Zeitplan, Ablauf am Handy
-- (Angekommen, Checkliste, Anlage mit Seriennummern), Anlage-Akte in einer Abfrage.

alter table public.service_faelle
  add column if not exists team          uuid[] not null default '{}',
  add column if not exists dauer_minuten int check (dauer_minuten is null or dauer_minuten between 15 and 1440);

comment on column public.service_faelle.team is 'Weitere Personen im Einsatz (person_id leitet); Zeitplan, Mein Tag und Handy zeigen den Termin allen.';
comment on column public.service_faelle.dauer_minuten is 'Geplante Dauer des Einsatzes; ohne Angabe zählt der Zeitplan 2 Stunden.';

/**
 * Service-Termine für den Zeitplan: eine Zeile je Fall mit Termin, Ende (Termin + Dauer, sonst 2 Stunden) und
 * allen eingeplanten Personen (Leitung + Team). Liest mit den Rechten der Person (security_invoker).
 */
create or replace view public.service_termine with (security_invoker = true) as
select f.id, f.nummer, f.titel, f.status, f.auswirkung, f.prioritaet, f.garantie,
       f.termin_am,
       f.termin_am + make_interval(mins => coalesce(f.dauer_minuten, 120)) as ende_am,
       (f.termin_am at time zone 'Europe/Zurich')::date as datum,
       coalesce(f.dauer_minuten, 120) as dauer_minuten,
       array_remove(array_prepend(f.person_id, f.team), null) as personen,
       coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma, f.meldung ->> 'name') as kunde,
       o.ort, o.plz
  from public.service_faelle f
  left join public.anlagen a on a.id = f.anlage_id
  left join public.projekte p on p.id = coalesce(f.projekt_id, a.projekt_id)
  left join public.kontakte k on k.id = coalesce(f.kontakt_id, p.kontakt_id)
  left join public.objekte o on o.id = coalesce(f.objekt_id, a.objekt_id, p.objekt_id)
 where f.geloescht_am is null and f.termin_am is not null;

grant select on public.service_termine to authenticated;

/**
 * Einsatz planen oder ändern: Termin, Dauer, Leitung, Team. Stellt den Stand auf «Termin», solange der Fall
 * noch vor dem Termin steht, und hält die Planung im Verlauf fest. Ohne Termin wird der Einsatz entfernt.
 */
create or replace function public.service_einsatz(p_id uuid, p_termin timestamptz, p_dauer int, p_person uuid,
                                                  p_team uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_team uuid[] := coalesce((select array_agg(distinct x) from unnest(p_team) x where x is distinct from p_person), '{}');
  v_namen text;
begin
  select string_agg(coalesce(pe.kuerzel, pe.name), ', ' order by pe.name) into v_namen
    from public.personen pe where pe.id = any (array_prepend(p_person, v_team));
  update public.service_faelle
     set termin_am = p_termin,
         dauer_minuten = case when p_termin is null then null else p_dauer end,
         person_id = p_person,
         team = case when p_termin is null then '{}' else v_team end,
         status = case when p_termin is not null and status in ('neu', 'bearbeitung', 'kunde') then 'termin'
                       when p_termin is null and status = 'termin' then 'bearbeitung'
                       else status end,
         verlauf = verlauf || jsonb_build_array(jsonb_build_object(
           'am', now(), 'person_id', intern.meine_person_id(), 'art', 'system',
           'text', case when p_termin is null then 'Einsatz entfernt'
                        else 'Einsatz ' || to_char(p_termin at time zone 'Europe/Zurich', 'DD.MM.YYYY HH24:MI')
                             || coalesce(' · ' || v_namen, '') end))
   where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'service.nicht_gefunden'; end if;
end
$$;

/**
 * Eintrag vom Handy, wiederholbar mit der ID vom Handy (Warteschlange bei Funkloch): «besuch» = vor Ort
 * angekommen, «notiz», «foto». Kommt dieselbe ID nochmals, passiert nichts.
 */
create or replace function public.service_eintrag_handy(p_id uuid, p_eintrag uuid, p_art text, p_text text,
                                                        p_am timestamptz default null) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_art not in ('besuch', 'notiz', 'foto') then raise exception using errcode = 'P0001', message = 'service.art'; end if;
  update public.service_faelle
     set verlauf = verlauf || jsonb_build_array(jsonb_build_object(
           'id', p_eintrag, 'am', coalesce(p_am, now()), 'person_id', intern.meine_person_id(), 'art', p_art,
           'text', coalesce(nullif(trim(p_text), ''), case p_art when 'besuch' then 'Vor Ort angekommen' else '' end)))
   where id = p_id and geloescht_am is null
     and not exists (select 1 from jsonb_array_elements(verlauf) v where v ->> 'id' = p_eintrag::text);
  if not found and not exists (select 1 from public.service_faelle where id = p_id and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'service.nicht_gefunden';
  end if;
end
$$;

/**
 * Seriennummer einer Komponente vor Ort erfassen (Handy oder Akte), z. B. nach einem Tausch. Die alte Nummer
 * bleibt im Verlauf des Falls stehen.
 */
create or replace function public.service_seriennummer(p_id uuid, p_nr int, p_seriennummer text) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_anlage uuid;
  v_alt text;
  v_art text;
begin
  select f.anlage_id into v_anlage from public.service_faelle f where f.id = p_id and f.geloescht_am is null;
  if v_anlage is null then raise exception using errcode = 'P0001', message = 'service.keine_anlage'; end if;
  select a.komponenten -> p_nr ->> 'seriennummer', a.komponenten -> p_nr ->> 'art' into v_alt, v_art
    from public.anlagen a where a.id = v_anlage and p_nr >= 0 and p_nr < jsonb_array_length(a.komponenten);
  if v_art is null then raise exception using errcode = 'P0001', message = 'service.nicht_gefunden'; end if;
  if coalesce(v_alt, '') = coalesce(trim(p_seriennummer), '') then return; end if;
  update public.anlagen
     set komponenten = jsonb_set(komponenten, array[p_nr::text, 'seriennummer'], to_jsonb(trim(p_seriennummer)))
   where id = v_anlage;
  update public.service_faelle
     set verlauf = verlauf || jsonb_build_array(jsonb_build_object(
           'am', now(), 'person_id', intern.meine_person_id(), 'art', 'system',
           'text', 'Seriennummer ' || v_art || ': ' || coalesce(nullif(v_alt, ''), '–') || ' → ' || trim(p_seriennummer)))
   where id = p_id;
end
$$;

/**
 * Anlage-Akte in einer Abfrage: Anlage mit Komponenten, Kunde, Ort, Projekt, Wartungsverträge, alle Service-Fälle,
 * Rapporte (Service und Wartung) und Dokumente des Projekts.
 */
create or replace function public.anlage_akte(p_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'anlage', to_jsonb(a) - 'alt_daten',
    'kunde', (select jsonb_build_object('id', k.id, 'name', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
                                        'telefon', k.telefon, 'email', k.email, 'sprache', k.sprache)
                from public.kontakte k where k.id = coalesce(o.kontakt_id, p.kontakt_id)),
    'ort', jsonb_build_object('strasse', o.strasse, 'plz', o.plz, 'ort', o.ort, 'kanton', o.kanton,
                              'breite', o.breite, 'laenge', o.laenge, 'netzbetreiber', o.netzbetreiber),
    'projekt', case when p.id is null then null
                    else jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel, 'elektriker', p.elektriker) end,
    'vertraege', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'nummer', w.nummer, 'status', w.status,
                                                               'naechste_wartung', w.naechste_wartung, 'letzte_wartung', w.letzte_wartung,
                                                               'preis_rappen', w.preis_rappen, 'rhythmus_monate', w.rhythmus_monate)
                                            order by w.start_am desc nulls last)
                             from public.wartungsvertraege w where w.anlage_id = a.id and w.geloescht_am is null), '[]'),
    'faelle', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'nummer', f.nummer, 'titel', f.titel, 'status', f.status,
                                                            'kategorie', f.kategorie, 'komponente', f.komponente, 'garantie', f.garantie,
                                                            'erstellt_am', f.erstellt_am, 'erledigt_am', f.erledigt_am)
                                         order by f.erstellt_am desc)
                          from public.service_faelle f where f.anlage_id = a.id and f.geloescht_am is null), '[]'),
    'rapporte', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'art', r.art, 'datum', r.datum,
                                                              'abgeschlossen_am', r.abgeschlossen_am) order by r.datum desc)
                            from public.rapporte r
                           where r.geloescht_am is null and r.art in ('service', 'wartung', 'ibn')
                             and (r.service_fall_id in (select f.id from public.service_faelle f where f.anlage_id = a.id)
                                  or r.wartungsvertrag_id in (select w.id from public.wartungsvertraege w where w.anlage_id = a.id)
                                  or (r.art = 'ibn' and r.projekt_id = a.projekt_id))), '[]'),
    'dokumente', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'mime_typ', d.mime_typ, 'ordner', d.ordner,
                                                               'speicher_pfad', d.speicher_pfad, 'sharepoint_url', d.sharepoint_url,
                                                               'hochgeladen_am', d.hochgeladen_am) order by d.hochgeladen_am desc)
                             from public.dokumente d
                            where d.geloescht_am is null
                              and ((d.bezug_tabelle = 'anlagen' and d.bezug_id = a.id)
                                   or (d.bezug_tabelle = 'projekte' and d.bezug_id = a.projekt_id))), '[]'),
    'rma_offen', (select count(*) from public.garantiefaelle g
                   where g.anlage_id = a.id and g.geloescht_am is null and g.abgeschlossen_am is null))
    from public.anlagen a
    left join public.projekte p on p.id = a.projekt_id
    left join public.objekte o on o.id = coalesce(a.objekt_id, p.objekt_id)
   where a.id = p_id and a.geloescht_am is null
$$;

-- Mein Tag und Handy: Service-Termin für Leitung und Team, mit allem für den Einsatz vor Ort.
create or replace function public.mein_tag(p_von date, p_bis date, p_person uuid default null)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_person uuid := intern.meine_person_id();
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
          'typ', 'service', 'id', f.id, 'von', (f.termin_am at time zone 'Europe/Zurich')::date,
          'bis', (f.termin_am at time zone 'Europe/Zurich')::date,
          'zeit', to_char(f.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), 'notiz', concat_ws(E'\n', f.beschreibung, 'Vor Ort: ' || nullif(concat_ws(', ', f.vor_ort_name, f.vor_ort_telefon), ''), 'Zugang: ' || f.zugang),
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
         where f.geloescht_am is null and f.status <> 'erledigt' and (f.person_id = v_person or v_person = any (f.team))
           and (f.termin_am at time zone 'Europe/Zurich')::date between p_von and p_bis
      ) x(e)), '[]'));
end
$$;
