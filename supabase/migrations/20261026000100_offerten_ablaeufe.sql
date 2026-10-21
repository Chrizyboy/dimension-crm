-- Phase 7, Teil 1: Offerten. Nummernkreise pro Standort, «Neue Offerten» (Innendienst), Versionen,
-- «Zurück zur Offerte» und der Entscheid beim Nachfassen. Die Regeln stammen aus V233
-- (V67, V72, V76, V84, V185, V193, V221) und gelten so für Oberfläche, Import und Automationen gleich.

-- Standort der Offerte (bestimmt Nummernkreis, Firma und Sprache) und die Werte aus Eturnity.
alter table public.offerten
  add column if not exists standort_id uuid references public.standorte (id),
  add column if not exists wirtschaftlichkeit jsonb;
comment on column public.offerten.wirtschaftlichkeit is
  'Werte aus der Eturnity-Offerte: Jahresertrag, Eigenverbrauch, Autarkie, Rendite, Solarstrompreis, EIV, Steuerersparnis.';
comment on column public.offerten.betrag_rappen is 'Offertbetrag exkl. MWST in Rappen.';

-- Bestehende Offerten: Französisch ist Bulle, Deutsch ist Muri (so führt V233 die zwei Listen).
update public.offerten o
   set standort_id = s.id
  from public.standorte s
 where o.standort_id is null and s.kuerzel = case when o.sprache = 'fr' then 'bulle' else 'muri' end;

-- Importierte Versionen: Betrag zusätzlich in Rappen, damit die Oberfläche nur eine Form kennt.
update public.offerten o
   set versionen = (
     select jsonb_agg(case when x ? 'betrag_rappen' or nullif(x ->> 'wert', '') is null then x
                           else x || jsonb_build_object('betrag_rappen', round((x ->> 'wert')::numeric * 100)::bigint) end
                      order by n)
       from jsonb_array_elements(o.versionen) with ordinality as e (x, n))
 where jsonb_array_length(o.versionen) > 0;

insert into public.einstellungen (schluessel, wert) values
  ('mwst_satz', '8.1'),
  -- Nummernkreise wie V233: Bulle 100000–199999, Muri 200000–299999.
  ('offertnummern', '{"bulle": [100000, 199999], "muri": [200000, 299999]}'),
  -- Zuständig für die Offerte (V193): Bulle → Filipe, Muri → wer den Termin hatte, Richtofferte → Andreas.
  ('offerte_verantwortlich', '{"bulle": "filipe", "richtofferte": "andreas"}')
on conflict do nothing;

/** Vorname der angemeldeten Person, so wie V233 «In Bearbeitung von …» speichert. */
create or replace function intern.mein_vorname() returns text
language sql stable security definer set search_path = '' as $$
  select split_part(name, ' ', 1) from public.personen where id = intern.meine_person_id()
$$;

/** MWST-Satz in Prozent aus den Einstellungen (Standard 8.1). */
create or replace function public.mwst_satz() returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce((select (wert #>> '{}')::numeric from public.einstellungen
                    where schluessel = 'mwst_satz' and geloescht_am is null), 8.1)
$$;
grant execute on function public.mwst_satz() to authenticated;

/**
 * Nächste freie Offertnummer im Kreis des Standorts. Läuft mit Sperre, damit zwei Personen
 * gleichzeitig nie dieselbe Nummer bekommen; gelöschte Offerten zählen mit (keine Wiederverwendung).
 */
create or replace function intern.naechste_offertnummer(p_standort uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  kz text := coalesce((select kuerzel from public.standorte where id = p_standort), 'muri');
  kreis jsonb := (select wert -> kz from public.einstellungen where schluessel = 'offertnummern');
  von int := coalesce((kreis ->> 0)::int, case when kz = 'bulle' then 100000 else 200000 end);
  bis int := coalesce((kreis ->> 1)::int, von + 99999);
  neu int;
begin
  perform pg_advisory_xact_lock(hashtext('offertnummer:' || kz));
  select coalesce(max(nummer::int) + 1, von) into neu
    from public.offerten where nummer ~ '^\d{6}$' and nummer::int between von and bis;
  if neu > bis then raise exception using message = 'offerte.nummernkreis_voll'; end if;
  return neu::text;
end
$$;

/** Wer für eine neue Offerte zuständig ist (V193), aus der Einstellung «offerte_verantwortlich». */
create or replace function intern.offerte_verantwortlich(p_standort uuid, p_termin_person uuid, p_richtofferte boolean)
returns uuid language sql stable security definer set search_path = '' as $$
  with regel as (select wert from public.einstellungen where schluessel = 'offerte_verantwortlich')
  select coalesce(
    case when (select kuerzel from public.standorte where id = p_standort) = 'bulle'
      then (select p.id from public.personen p, regel where p.kuerzel = regel.wert ->> 'bulle' and p.aktiv) end,
    case when p_richtofferte
      then (select p.id from public.personen p, regel where p.kuerzel = regel.wert ->> 'richtofferte' and p.aktiv) end,
    p_termin_person,
    intern.meine_person_id())
$$;

/**
 * Neue Offerte anlegen, zu einem Lead (verkaufschance_id) oder direkt zu einem Kontakt (kontakt_id).
 * Die Nummer kommt aus dem Kreis des Standorts, ausser es wird eine bestehende Nummer mitgegeben
 * (z. B. aus dem Eturnity-PDF). Felder: standort_id, nummer, titel, betrag_rappen, leistung_kwp,
 * anzahl_module, wechselrichter, batterie, angebot_am, status, verantwortlich_id, eturnity_id.
 */
create or replace function public.offerte_anlegen(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v public.verkaufschancen;
  k uuid := nullif(p ->> 'kontakt_id', '')::uuid;
  obj uuid := nullif(p ->> 'objekt_id', '')::uuid;
  std uuid := nullif(p ->> 'standort_id', '')::uuid;
  nr text := nullif(trim(coalesce(p ->> 'nummer', '')), '');
  richt boolean;
  neu uuid;
begin
  if nullif(p ->> 'verkaufschance_id', '') is not null then
    select * into v from public.verkaufschancen where id = (p ->> 'verkaufschance_id')::uuid and geloescht_am is null;
    if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
    k := v.kontakt_id;
    obj := coalesce(obj, v.objekt_id);
    std := coalesce(std, v.standort_id);
  end if;
  if k is null then raise exception using message = 'offerte.kontakt_fehlt'; end if;
  if std is null then
    select s.id into std from public.standorte s
     where s.kuerzel = public.standort_fuer_plz((select plz from public.objekte where id = obj));
  end if;
  if nr is not null and exists (select 1 from public.offerten where nummer = nr) then
    raise exception using message = 'offerte.nummer_vergeben';
  end if;
  richt := coalesce(v.offerte_hinweis = 'Richtofferte', false) or (v.id is not null and v.termin_am is null);
  insert into public.offerten (
    nummer, kontakt_id, objekt_id, verkaufschance_id, standort_id, jahr, titel, sprache, status, angebot_am,
    betrag_rappen, leistung_kwp, anzahl_module, wechselrichter, batterie, verantwortlich_id, eturnity_id)
  values (
    coalesce(nr, intern.naechste_offertnummer(std)), k, obj, v.id, std,
    extract(year from coalesce(nullif(p ->> 'angebot_am', '')::date, current_date))::int,
    coalesce(nullif(trim(p ->> 'titel'), ''), 'Photovoltaikanlage'),
    coalesce((select sprache from public.standorte where id = std), 'de'),
    coalesce(nullif(p ->> 'status', ''), 'in_arbeit'),
    nullif(p ->> 'angebot_am', '')::date,
    nullif(p ->> 'betrag_rappen', '')::bigint, nullif(p ->> 'leistung_kwp', '')::numeric,
    nullif(p ->> 'anzahl_module', '')::int, nullif(trim(p ->> 'wechselrichter'), ''), nullif(trim(p ->> 'batterie'), ''),
    coalesce(nullif(p ->> 'verantwortlich_id', '')::uuid, intern.offerte_verantwortlich(std, v.tour_person_id, richt)),
    nullif(p ->> 'eturnity_id', ''))
  returning id into neu;
  perform intern.vermerke(k, v.id, null, 'Offerte angelegt: ' || (select nummer from public.offerten where id = neu),
    jsonb_build_object('offerte_id', neu));
  return neu;
end
$$;
revoke execute on function public.offerte_anlegen(jsonb) from public, anon;
grant execute on function public.offerte_anlegen(jsonb) to authenticated;

/**
 * Status in «Neue Offerten» setzen (V72, V76, V84): neu, bearbeitung, rueckfrage, pruefung, offeriert.
 * Wer etwas ändert, wird «In Bearbeitung von …». Arbeitet schon jemand anderes daran, braucht es
 * angaben.uebernehmen = true (die Oberfläche fragt vorher). Rückfrage braucht eine Notiz («Was fehlt noch?»),
 * Prüfung geht an den Aussendienst des Termins mit einem Hinweis, «offeriert» schliesst den Lead ab.
 * Fehlt die Offerte noch, wird sie hier mit der nächsten Nummer angelegt.
 */
create or replace function public.offerte_status_setzen(p_verkaufschance uuid, p_status text, p_angaben jsonb default '{}')
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v public.verkaufschancen;
  -- Wie in V233 steht hier der Vorname («Loris»), das passt zu den übernommenen Daten.
  ich text := intern.mein_vorname();
  notiz text := nullif(trim(coalesce(p_angaben ->> 'notiz', '')), '');
  d date := coalesce(nullif(p_angaben ->> 'datum', '')::date, current_date);
  o uuid;
  t text;
begin
  select * into v from public.verkaufschancen where id = p_verkaufschance and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if v.stufe <> 'zur_offerte' then raise exception using message = 'offerte.nicht_neu'; end if;
  if p_status not in ('neu', 'bearbeitung', 'rueckfrage', 'pruefung', 'offeriert') then
    raise exception using message = 'stand.unbekannt';
  end if;
  if v.offerte_von is not null and v.offerte_von <> ich and v.offerte_status in ('bearbeitung', 'rueckfrage')
     and not coalesce((p_angaben ->> 'uebernehmen')::boolean, false) then
    raise exception using message = 'offerte.in_bearbeitung';
  end if;

  select id into o from public.offerten
   where verkaufschance_id = v.id and geloescht_am is null order by erstellt_am desc limit 1;
  if o is null and p_status in ('bearbeitung', 'pruefung', 'offeriert') then
    o := public.offerte_anlegen(jsonb_build_object('verkaufschance_id', v.id));
  end if;

  case p_status
    when 'neu' then
      update public.verkaufschancen set offerte_status = 'neu', offerte_von = null, offerte_seit = null where id = v.id;
      t := 'Neue Offerte';
    when 'bearbeitung' then
      update public.verkaufschancen set offerte_status = 'bearbeitung', offerte_von = ich, offerte_seit = now() where id = v.id;
      t := 'Offerte in Bearbeitung';
    when 'rueckfrage' then
      update public.verkaufschancen
         set offerte_status = 'rueckfrage', offerte_rueckfrage = intern.pflicht(notiz, 'offerte.notiz_fehlt'),
             offerte_von = ich, offerte_seit = now()
       where id = v.id;
      t := 'Rückfrage: ' || notiz;
    when 'pruefung' then
      -- Prüfen tut der Aussendienst des Termins; bei einer Richtofferte (ohne Termin) wer sie bearbeitet.
      update public.verkaufschancen
         set offerte_status = 'pruefung', offerte_hinweis = coalesce(notiz, offerte_hinweis), offerte_hinweis_von = ich,
             offerte_von = ich, offerte_seit = now()
       where id = v.id;
      update public.offerten set status = 'in_arbeit' where id = o;
      t := concat_ws(' · ', 'Zur Prüfung an den Aussendienst', notiz);
    when 'offeriert' then
      update public.offerten set status = 'offeriert', angebot_am = d, nachfassen_am = null, entscheid = null where id = o;
      update public.verkaufschancen set stufe = 'abgeschlossen', offerte_status = 'offeriert', offerte_von = ich,
             offerte_seit = now()
       where id = v.id;
      t := 'Offerte versendet';
  end case;
  perform intern.vermerke(v.kontakt_id, v.id, null, t, jsonb_build_object('offerte_status', p_status, 'offerte_id', o));
  return o;
end
$$;
revoke execute on function public.offerte_status_setzen(uuid, text, jsonb) from public, anon;
grant execute on function public.offerte_status_setzen(uuid, text, jsonb) to authenticated;

/**
 * Überarbeitete Version erfassen (V67). V1 entsteht beim ersten Mal aus den aktuellen Werten.
 * Angaben: datum, text («Was wurde geändert?», Pflicht), betrag_rappen, kwp, batterie, dokument {pfad, name},
 * uebernehmen (true = Werte, Datum und Status «offeriert» übernehmen, Nachfassen beginnt neu).
 */
create or replace function public.offerte_version_erfassen(p_offerte uuid, p jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  o public.offerten;
  ich text := intern.mein_vorname();
  d date := coalesce(nullif(p ->> 'datum', '')::date, current_date);
  txt text := intern.pflicht(p ->> 'text', 'offerte.text_fehlt');
  liste jsonb;
  n int;
begin
  select * into o from public.offerten where id = p_offerte and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  liste := o.versionen;
  if jsonb_array_length(liste) = 0 then
    liste := jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'v', 1, 'am', coalesce(o.angebot_am, o.erstellt_am::date), 'by', ich, 'at', now(),
      'betrag_rappen', o.betrag_rappen, 'kwp', o.leistung_kwp, 'batterie', o.batterie, 'text', 'Erste Offerte')));
  end if;
  n := (select max((x ->> 'v')::int) from jsonb_array_elements(liste) x) + 1;
  liste := liste || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'v', n, 'am', d, 'by', ich, 'at', now(), 'text', txt,
    'betrag_rappen', nullif(p ->> 'betrag_rappen', '')::bigint, 'kwp', nullif(p ->> 'kwp', '')::numeric,
    'batterie', nullif(trim(coalesce(p ->> 'batterie', '')), ''), 'dokument', p -> 'dokument')));
  update public.offerten set versionen = liste where id = o.id;
  if coalesce((p ->> 'uebernehmen')::boolean, false) then
    update public.offerten
       set betrag_rappen = coalesce(nullif(p ->> 'betrag_rappen', '')::bigint, betrag_rappen),
           leistung_kwp = coalesce(nullif(p ->> 'kwp', '')::numeric, leistung_kwp),
           batterie = coalesce(nullif(trim(coalesce(p ->> 'batterie', '')), ''), batterie),
           angebot_am = d, status = 'offeriert', nachfassen_am = null, entscheid = null
     where id = o.id;
  end if;
  perform intern.vermerke(o.kontakt_id, o.verkaufschance_id, null, format('Offerte %s · Version %s: %s', o.nummer, n, txt),
    jsonb_build_object('offerte_id', o.id, 'version', n, 'meilenstein', true));
  return n;
end
$$;
revoke execute on function public.offerte_version_erfassen(uuid, jsonb) from public, anon;
grant execute on function public.offerte_version_erfassen(uuid, jsonb) to authenticated;

/** Neueste Version entfernen (nur Admin, V67). V1 bleibt immer; der Eintrag bleibt in der Zeitachse. */
create or replace function public.offerte_version_entfernen(p_offerte uuid) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  o public.offerten;
  letzte jsonb;
begin
  if not intern.hat_recht('admin') then raise exception using message = 'recht.fehlt'; end if;
  select * into o from public.offerten where id = p_offerte and geloescht_am is null for update;
  if not found or jsonb_array_length(o.versionen) < 2 then raise exception using message = 'offerte.keine_version'; end if;
  letzte := o.versionen -> -1;
  update public.offerten set versionen = versionen - (-1) where id = o.id;
  perform intern.vermerke(o.kontakt_id, o.verkaufschance_id, null,
    format('Offerte %s · Version %s entfernt', o.nummer, letzte ->> 'v'), jsonb_build_object('offerte_id', o.id, 'entfernt', letzte));
  return (letzte ->> 'v')::int;
end
$$;
revoke execute on function public.offerte_version_entfernen(uuid) from public, anon;
grant execute on function public.offerte_version_entfernen(uuid) to authenticated;

/**
 * «Zurück zur Offerte» (V221): eine versendete Offerte geht zurück an den Innendienst.
 * Ziel «bearbeitung» (Offerte überarbeiten) oder «rueckfrage» (warten auf Angaben vom Kunden), Begründung Pflicht.
 * Das alte Angebotsdatum wandert nach angebot_am_frueher, der Lead steht wieder in «Neue Offerten».
 */
create or replace function public.offerte_zurueck(p_offerte uuid, p_ziel text, p_grund text) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  o public.offerten;
  g text := intern.pflicht(p_grund, 'stand.grund_fehlt');
begin
  if p_ziel not in ('bearbeitung', 'rueckfrage') then raise exception using message = 'stand.unbekannt'; end if;
  select * into o from public.offerten where id = p_offerte and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if o.status = 'angenommen' then raise exception using message = 'offerte.schon_angenommen'; end if;
  update public.offerten
     set status = 'in_arbeit', entscheid = null, nachfassen_am = null, vertagt_grund = null,
         angebot_am_frueher = case when angebot_am is null then angebot_am_frueher
                                   else array_append(coalesce(angebot_am_frueher, '{}'), angebot_am) end,
         angebot_am = null,
         zurueckgegeben = coalesce(zurueckgegeben, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'am', now(), 'von', intern.meine_person_id(), 'ziel', p_ziel, 'grund', g))
   where id = o.id;
  if o.verkaufschance_id is not null then
    update public.verkaufschancen
       set stufe = 'zur_offerte', offerte_status = p_ziel, offerte_seit = now(),
           offerte_rueckfrage = case when p_ziel = 'rueckfrage' then g else offerte_rueckfrage end,
           offerte_von = intern.mein_vorname()
     where id = o.verkaufschance_id;
  end if;
  perform intern.vermerke(o.kontakt_id, o.verkaufschance_id, null, 'Zurück zur Offerte: ' || g,
    jsonb_build_object('offerte_id', o.id, 'ziel', p_ziel));
end
$$;
revoke execute on function public.offerte_zurueck(uuid, text, text) from public, anon;
grant execute on function public.offerte_zurueck(uuid, text, text) to authenticated;

/**
 * Entscheid beim Nachfassen (V45, V193): nachfassen, vertagt (Datum + Grund), angenommen, verloren (Grund).
 * Nutzt dieselben Regeln wie die Pipeline (setze_stand), damit es nur eine Stelle gibt.
 */
create or replace function public.offerte_entscheiden(p_offerte uuid, p_ziel text, p_angaben jsonb default '{}')
returns text language plpgsql security invoker set search_path = '' as $$
declare
  g uuid;
begin
  if p_ziel not in ('offeriert', 'nachfassen', 'vertagt', 'angenommen', 'verloren') then
    raise exception using message = 'stand.unbekannt';
  end if;
  select x.id into g from public.verkauf_geschaefte x where x.offerte_id = p_offerte and x.projekt_id is null limit 1;
  if g is null then
    -- Schon ein Projekt (Auftrag): der Entscheid gilt dann nur noch für die Offerte selbst.
    if p_ziel <> 'angenommen' then raise exception using message = 'stand.projekt'; end if;
    update public.offerten set status = 'angenommen', entscheid = 'angenommen', entscheid_am = current_date where id = p_offerte;
    return p_ziel;
  end if;
  return public.setze_stand(g, p_ziel, p_angaben);
end
$$;
revoke execute on function public.offerte_entscheiden(uuid, text, jsonb) from public, anon;
grant execute on function public.offerte_entscheiden(uuid, text, jsonb) to authenticated;

/**
 * Werte in die Offerte übernehmen, aus der Kalkulation oder dem Eturnity-PDF (V91, V183).
 * nur_leere = true füllt nur leere Felder. Felder: betrag_rappen, leistung_kwp, anzahl_module,
 * wechselrichter, batterie, angebot_am, eturnity_id, wirtschaftlichkeit.
 */
create or replace function public.offerte_werte_setzen(p_offerte uuid, p jsonb, p_quelle text, p_nur_leere boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  o public.offerten;
  ersetze boolean := not p_nur_leere;
begin
  select * into o from public.offerten where id = p_offerte and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  update public.offerten set
    betrag_rappen = case when (ersetze or betrag_rappen is null) and p ? 'betrag_rappen'
                         then nullif(p ->> 'betrag_rappen', '')::bigint else betrag_rappen end,
    leistung_kwp = case when (ersetze or leistung_kwp is null) and p ? 'leistung_kwp'
                        then nullif(p ->> 'leistung_kwp', '')::numeric else leistung_kwp end,
    anzahl_module = case when (ersetze or anzahl_module is null) and p ? 'anzahl_module'
                         then nullif(p ->> 'anzahl_module', '')::int else anzahl_module end,
    wechselrichter = case when (ersetze or wechselrichter is null) and p ? 'wechselrichter'
                          then nullif(trim(p ->> 'wechselrichter'), '') else wechselrichter end,
    batterie = case when (ersetze or batterie is null) and p ? 'batterie'
                    then nullif(trim(p ->> 'batterie'), '') else batterie end,
    angebot_am = case when (ersetze or angebot_am is null) and p ? 'angebot_am'
                      then nullif(p ->> 'angebot_am', '')::date else angebot_am end,
    eturnity_id = case when (ersetze or eturnity_id is null) and p ? 'eturnity_id'
                       then nullif(p ->> 'eturnity_id', '') else eturnity_id end,
    wirtschaftlichkeit = case when (ersetze or wirtschaftlichkeit is null) and p ? 'wirtschaftlichkeit'
                              then p -> 'wirtschaftlichkeit' else wirtschaftlichkeit end,
    betrag_manuell = case when p ? 'betrag_rappen' and p_quelle = 'manuell' then true
                          when p ? 'betrag_rappen' then false else betrag_manuell end
  where id = o.id;
  perform intern.vermerke(o.kontakt_id, o.verkaufschance_id, null,
    format('Offerte %s: Werte übernommen (%s)', o.nummer, p_quelle), jsonb_build_object('offerte_id', o.id, 'werte', p));
end
$$;
revoke execute on function public.offerte_werte_setzen(uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.offerte_werte_setzen(uuid, jsonb, text, boolean) to authenticated;
