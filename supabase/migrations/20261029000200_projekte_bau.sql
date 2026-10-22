-- Phase 9, Teil 2: Bauplanung. Auftrag in den Bau übernehmen (V126), mit Bautermin oder als schon gebaut
-- (V134), zurücknehmen (V127) und alles rückgängig machen. Einsätze mit Personen und Subunternehmern,
-- Abwesenheiten aus dem CRM und aus Outlook.

alter table public.einsaetze
  add column if not exists personen uuid[] not null default '{}',
  add column if not exists subunternehmer_id uuid references public.subunternehmer (id);
comment on column public.einsaetze.art is 'intern (eigenes Team), extern (Subunternehmer), geplant (voraussichtlicher Zeitraum).';
comment on column public.einsaetze.personen is 'Eingeplante Personen (für Auslastung, Abwesenheiten und die Monteur-Ansicht in Phase 9b).';
create index if not exists einsaetze_projekt_idx on public.einsaetze (projekt_id) where geloescht_am is null;
create index if not exists einsaetze_zeit_idx on public.einsaetze (von, bis) where geloescht_am is null;
create index if not exists abwesenheiten_zeit_idx on public.abwesenheiten (von, bis) where geloescht_am is null;

alter table public.subunternehmer
  add column if not exists email text,
  add column if not exists telefon text,
  add column if not exists sprache text not null default 'de',
  add column if not exists notiz text;
alter table public.subunternehmer_auftraege
  add column if not exists notiz text,
  add column if not exists angefragt_am date,
  add column if not exists bestaetigt_am date;

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe) values
  ('einsatzart', 'intern', 'Team intern', 'Équipe interne', 10, 'ok'),
  ('einsatzart', 'extern', 'Team extern', 'Équipe externe', 20, 'info'),
  ('einsatzart', 'geplant', 'Voraussichtlich', 'Prévisionnel', 30, 'warn'),
  ('abwesenheit', 'ferien', 'Ferien', 'Vacances', 10, 'info'),
  ('abwesenheit', 'krank', 'Krank', 'Maladie', 20, 'warn'),
  ('abwesenheit', 'militaer', 'Militär / Zivildienst', 'Armée / service civil', 30, 'neutral'),
  ('abwesenheit', 'weiterbildung', 'Weiterbildung', 'Formation', 40, 'marke'),
  ('abwesenheit', 'kompensation', 'Kompensation', 'Compensation', 50, 'neutral'),
  ('abwesenheit', 'sonstiges', 'Sonstiges', 'Autre', 60, 'neutral'),
  ('abwesenheit', 'outlook', 'Abwesend (Outlook)', 'Absent (Outlook)', 70, 'neutral'),
  ('subauftragstatus', 'angefragt', 'Angefragt', 'Demandé', 10, 'info'),
  ('subauftragstatus', 'bestaetigt', 'Bestätigt', 'Confirmé', 20, 'ok'),
  ('subauftragstatus', 'erledigt', 'Erledigt', 'Terminé', 30, 'neutral'),
  ('subauftragstatus', 'abgesagt', 'Abgesagt', 'Annulé', 40, 'kritisch'),
  ('materialstatus', 'bestellt', 'Bestellt', 'Commandé', 10, 'warn'),
  ('materialstatus', 'lager', 'An Lager', 'En stock', 20, 'ok')
on conflict (liste, schluessel) do nothing;

update public.auswahlwerte set text_de = 'Bautermin ausstehend', text_fr = 'Date de chantier en attente', farbe = 'kritisch'
 where liste = 'baustatus' and schluessel = 'ausstehend';
update public.auswahlwerte set text_de = 'Bautermin fixiert', text_fr = 'Date de chantier fixée', farbe = 'marke'
 where liste = 'baustatus' and schluessel = 'terminiert';
update public.auswahlwerte set text_de = 'Abgeschlossen, IBN ausstehend', text_fr = 'Terminé, MES en attente', farbe = 'warn'
 where liste = 'baustatus' and schluessel = 'ibn';
update public.auswahlwerte set text_de = 'Abgeschlossen und IBN durchgeführt', text_fr = 'Terminé et MES effectuée', farbe = 'info'
 where liste = 'baustatus' and schluessel = 'fertig';

/** Werktage (Mo–Fr) zwischen zwei Daten, beide mitgezählt. */
create or replace function intern.werktage(p_von date, p_bis date) returns int
language sql immutable as $$
  select count(*)::int from generate_series(p_von, p_bis, interval '1 day') d where extract(isodow from d) < 6
$$;

/** Stand eines Projekts merken, bevor ein Bau-Schritt ihn ändert (für «Rückgängig»). */
create or replace function intern.bau_merken(p_id uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'status', p.status, 'bau_status', p.bau_status, 'baubeginn', p.baubeginn, 'werktage', p.werktage,
    'standort_id', p.standort_id, 'material_status', p.material_status, 'unterzeichnet_am', p.unterzeichnet_am,
    'schritte', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'stand', s.stand, 'eingereicht_am', s.eingereicht_am,
                                                               'erledigt_am', s.erledigt_am, 'geloescht_am', s.geloescht_am))
                            from public.projekt_schritte s where s.projekt_id = p.id), '[]'),
    'einsaetze', coalesce((select jsonb_agg(e.id) from public.einsaetze e where e.projekt_id = p.id and e.geloescht_am is null), '[]'),
    'anlagen', coalesce((select jsonb_agg(a.id) from public.anlagen a where a.projekt_id = p.id and a.geloescht_am is null), '[]'),
    'am', now())
  from public.projekte p where p.id = p_id
$$;

/** Neue Anlage zu einem gebauten Projekt, mit Leistung und Komponenten aus der Offerte. */
create or replace function intern.anlage_zum_projekt(p_id uuid, p_ibn date) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  p public.projekte;
  o public.offerten;
begin
  select a.id into v_id from public.anlagen a where a.projekt_id = p_id and a.geloescht_am is null limit 1;
  if v_id is not null then
    update public.anlagen set ibn_am = coalesce(ibn_am, p_ibn) where id = v_id;
    return v_id;
  end if;
  select * into p from public.projekte where id = p_id;
  if p.objekt_id is null then return null; end if;
  select * into o from public.offerten where id = p.offerte_id;
  insert into public.anlagen (projekt_id, objekt_id, leistung_kwp, komponenten, ibn_am)
  values (p_id, p.objekt_id, o.leistung_kwp,
          jsonb_build_array(jsonb_build_object('art', 'pv', 'anzahl', o.anzahl_module, 'modell', null))
            || case when o.wechselrichter is not null then jsonb_build_array(jsonb_build_object('art', 'wechselrichter', 'modell', o.wechselrichter)) else '[]' end
            || case when nullif(trim(o.batterie), '') is not null then jsonb_build_array(jsonb_build_object('art', 'batterie', 'modell', o.batterie)) else '[]' end,
          p_ibn)
  returning id into v_id;
  return v_id;
end
$$;

/**
 * Auftrag in den Bau übernehmen (p: standort_id, von, bis). Ohne Datum: «Bautermin ausstehend».
 * Termin in der Zukunft: «Bautermin fixiert» mit Einsatz Team intern. Liegt der Bau schon zurück, gilt die
 * Anlage als gebaut: abgeschlossen, offene Schritte erledigt (mit dem Baudatum), Anlage mit IBN-Datum.
 * Zahlungen bleiben unverändert. Gibt «ohne_termin», «geplant» oder «gebaut» zurück.
 */
create or replace function public.projekt_bau_planen(p_id uuid, p jsonb default '{}')
returns text
language plpgsql security invoker set search_path = '' as $$
declare
  v_von date := nullif(p ->> 'von', '')::date;
  v_bis date := coalesce(nullif(p ->> 'bis', '')::date, nullif(p ->> 'von', '')::date);
  v_std uuid := nullif(p ->> 'standort_id', '')::uuid;
  v_vorher jsonb;
  v_modus text;
  pr public.projekte;
begin
  select * into pr from public.projekte where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'projekt.nicht_gefunden'; end if;
  if v_bis < v_von then raise exception using errcode = 'P0001', message = 'einsatz.bis_vor_von'; end if;
  v_vorher := intern.bau_merken(p_id);
  v_modus := case when v_von is null then 'ohne_termin' when v_bis < current_date then 'gebaut' else 'geplant' end;

  if v_von is not null then
    insert into public.einsaetze (projekt_id, art, von, bis) values (p_id, 'intern', v_von, v_bis);
  end if;

  update public.projekte set
    status = case v_modus when 'gebaut' then 'abgeschlossen' else 'im_bau' end,
    bau_status = case v_modus when 'gebaut' then 'fertig' when 'geplant' then 'terminiert'
                              else coalesce(pr.bau_status, 'ausstehend') end,
    standort_id = coalesce(v_std, pr.standort_id),
    baubeginn = coalesce(v_von, pr.baubeginn),
    werktage = case when v_von is not null then intern.werktage(v_von, v_bis) else pr.werktage end,
    material_status = case when v_modus = 'gebaut' then 'lager' else pr.material_status end,
    unterzeichnet_am = coalesce(pr.unterzeichnet_am, case when v_modus = 'gebaut' then v_von else current_date end),
    bau_vorher = v_vorher
  where id = p_id;

  if v_modus = 'gebaut' then
    -- Alle offenen Schritte, die man von Hand setzen kann, gelten mit dem Baudatum als erledigt.
    insert into public.projekt_schritte as ps (projekt_id, ablauf_schritt_id, schluessel, stand, erledigt_am)
    select p_id, f.ablauf_schritt_id, f.schluessel, 'erledigt', v_bis
      from public.projekt_fahrplan f
     where f.projekt_id = p_id and not f.automatisch and f.stand not in ('erledigt', 'nicht_noetig')
    on conflict (projekt_id, schluessel) do update set stand = 'erledigt', erledigt_am = v_bis, geloescht_am = null;
    perform intern.anlage_zum_projekt(p_id, v_bis);
  end if;
  return v_modus;
end
$$;

/** Baustelle zurück zu den Aufträgen (V127). Bau-Status und Einsätze bleiben für eine erneute Übernahme. */
create or replace function public.projekt_bau_zuruecknehmen(p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.projekte set bau_vorher = intern.bau_merken(id), status = 'auftrag'
   where id = p_id and status in ('im_bau', 'abgeschlossen') and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'projekt.nicht_im_bau'; end if;
end
$$;

/** Den letzten Bau-Schritt (Übernehmen, Gebaut, Zurücknehmen) rückgängig machen. */
create or replace function public.projekt_bau_rueckgaengig(p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v jsonb;
  s jsonb;
begin
  select bau_vorher into v from public.projekte where id = p_id and geloescht_am is null for update;
  if v is null then raise exception using errcode = 'P0001', message = 'projekt.nichts_rueckgaengig'; end if;

  update public.projekte set status = v ->> 'status', bau_status = v ->> 'bau_status',
         baubeginn = (v ->> 'baubeginn')::date, werktage = (v ->> 'werktage')::numeric,
         standort_id = (v ->> 'standort_id')::uuid, material_status = v ->> 'material_status',
         unterzeichnet_am = (v ->> 'unterzeichnet_am')::date, bau_vorher = null
   where id = p_id;

  -- Schritte: frühere Werte zurück, neu entstandene in den Papierkorb.
  for s in select * from jsonb_array_elements(v -> 'schritte') loop
    update public.projekt_schritte set stand = s ->> 'stand', eingereicht_am = (s ->> 'eingereicht_am')::date,
           erledigt_am = (s ->> 'erledigt_am')::date, geloescht_am = (s ->> 'geloescht_am')::timestamptz
     where id = (s ->> 'id')::uuid;
  end loop;
  update public.projekt_schritte set geloescht_am = now()
   where projekt_id = p_id and geloescht_am is null
     and id not in (select (x ->> 'id')::uuid from jsonb_array_elements(v -> 'schritte') x);
  update public.einsaetze set geloescht_am = now()
   where projekt_id = p_id and geloescht_am is null
     and id not in (select x::text::uuid from jsonb_array_elements_text(v -> 'einsaetze') x);
  update public.anlagen set geloescht_am = now()
   where projekt_id = p_id and geloescht_am is null
     and id not in (select x::text::uuid from jsonb_array_elements_text(v -> 'anlagen') x);
end
$$;

/**
 * Zeitplan eines Projekts speichern (Planungsdialog): alle Einsätze, Baustellen-Status und Material.
 * p: einsaetze [{id?, art, von, bis, personen, subunternehmer_id, notiz}], bau_status, material_status.
 * Baubeginn = erster fester Einsatz; «Bautermin ausstehend» mit festem Einsatz wird «fixiert»;
 * «IBN durchgeführt» schliesst das Projekt ab und legt die Anlage an.
 */
create or replace function public.projekt_zeitplan_speichern(p_id uuid, p jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  e jsonb;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_von date;
  v_bis date;
  v_bau text := nullif(p ->> 'bau_status', '');
  v_beginn date;
  pr public.projekte;
begin
  select * into pr from public.projekte where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'projekt.nicht_gefunden'; end if;
  for e in select * from jsonb_array_elements(coalesce(p -> 'einsaetze', '[]')) loop
    v_von := nullif(e ->> 'von', '')::date;
    v_bis := nullif(e ->> 'bis', '')::date;
    if v_von is null or v_bis is null then raise exception using errcode = 'P0001', message = 'einsatz.datum_fehlt'; end if;
    if v_bis < v_von then raise exception using errcode = 'P0001', message = 'einsatz.bis_vor_von'; end if;
    if coalesce(e ->> 'art', 'intern') not in ('intern', 'extern', 'geplant') then
      raise exception using errcode = 'P0001', message = 'einsatz.art_ungueltig';
    end if;
    v_id := nullif(e ->> 'id', '')::uuid;
    if v_id is not null then
      update public.einsaetze set art = coalesce(e ->> 'art', 'intern'), von = v_von, bis = v_bis,
             personen = coalesce(array(select jsonb_array_elements_text(e -> 'personen'))::uuid[], '{}'),
             subunternehmer_id = nullif(e ->> 'subunternehmer_id', '')::uuid, notiz = nullif(trim(e ->> 'notiz'), '')
       where id = v_id and projekt_id = p_id;
    else
      insert into public.einsaetze (projekt_id, art, von, bis, personen, subunternehmer_id, notiz)
      values (p_id, coalesce(e ->> 'art', 'intern'), v_von, v_bis,
              coalesce(array(select jsonb_array_elements_text(e -> 'personen'))::uuid[], '{}'),
              nullif(e ->> 'subunternehmer_id', '')::uuid, nullif(trim(e ->> 'notiz'), ''))
      returning id into v_id;
    end if;
    v_ids := v_ids || v_id;
  end loop;
  update public.einsaetze set geloescht_am = now()
   where projekt_id = p_id and geloescht_am is null and not (id = any (v_ids));

  select min(von) into v_beginn from public.einsaetze where projekt_id = p_id and art <> 'geplant' and geloescht_am is null;
  if v_bau = 'ausstehend' and v_beginn is not null then v_bau := 'terminiert'; end if;
  if v_bau is not null and v_bau not in ('ausstehend', 'terminiert', 'ibn', 'fertig') then
    raise exception using errcode = 'P0001', message = 'projekt.baustatus_ungueltig';
  end if;

  update public.projekte set
    baubeginn = v_beginn,
    bau_status = v_bau,
    material_status = case when p ? 'material_status' then nullif(p ->> 'material_status', '') else material_status end,
    status = case when v_bau = 'fertig' then 'abgeschlossen'
                  when v_bau is not null and status in ('auftrag', 'abgeschlossen') then 'im_bau'
                  else status end
  where id = p_id;

  if v_bau = 'fertig' then
    perform intern.anlage_zum_projekt(p_id, coalesce(
      (select max(bis) from public.einsaetze where projekt_id = p_id and art <> 'geplant' and geloescht_am is null), current_date));
  end if;
end
$$;

/**
 * Abwesenheiten im CRM und aus Outlook («Abwesend» im Kalender), für Zeitplan und Auslastung.
 * Von Outlook kommt nur der Zeitraum, nie der Betreff.
 */
create or replace view public.abwesenheiten_alle with (security_invoker = true) as
select a.id, a.person_id, a.art, a.von, a.bis, a.halbtag, 'crm'::text as quelle
  from public.abwesenheiten a
 where a.geloescht_am is null
union all
select k.id, k.person_id, 'outlook', (k.beginn at time zone 'Europe/Zurich')::date,
       ((k.ende at time zone 'Europe/Zurich') - interval '1 second')::date, false, 'outlook'
  from public.kalender_eintraege k
 where k.anzeige_als = 'oof' and k.quelle = 'outlook' and k.geloescht_am is null and k.person_id is not null;

grant select on public.abwesenheiten_alle to authenticated;

revoke execute on function public.projekt_bau_planen(uuid, jsonb) from public, anon;
revoke execute on function public.projekt_bau_zuruecknehmen(uuid) from public, anon;
revoke execute on function public.projekt_bau_rueckgaengig(uuid) from public, anon;
revoke execute on function public.projekt_zeitplan_speichern(uuid, jsonb) from public, anon;
grant execute on function public.projekt_bau_planen(uuid, jsonb) to authenticated;
grant execute on function public.projekt_bau_zuruecknehmen(uuid) to authenticated;
grant execute on function public.projekt_bau_rueckgaengig(uuid) to authenticated;
grant execute on function public.projekt_zeitplan_speichern(uuid, jsonb) to authenticated;
