-- Phase 9b, Teil 2: Abläufe der Baustelle in der Datenbank (Entscheid 0020).
-- Alle Aufrufe vom Handy sind wiederholbar: Die App vergibt die IDs selbst und schickt sie nach einem
-- Funkloch noch einmal. Was schon da ist, wird übernommen statt doppelt angelegt.

/**
 * «Mein Tag» für die Monteur-Ansicht: Einsätze und Service-Termine einer Person im Zeitraum, mit Kunde,
 * Adresse, Team, Material und den Rapporten dazu, dazu die laufende Zeit. Andere Personen nur mit Recht preise.
 */
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
          'zeit', to_char(f.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), 'notiz', f.beschreibung,
          'service', jsonb_build_object('id', f.id, 'nummer', f.nummer, 'titel', f.titel, 'garantie', f.garantie,
                                        'prioritaet', f.prioritaet, 'kategorie', f.kategorie),
          'projekt', case when p.id is null then null else jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel) end,
          'kunde', jsonb_build_object('name', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
                                      'telefon', k.telefon, 'email', k.email, 'sprache', k.sprache),
          'adresse', jsonb_build_object('strasse', o.strasse, 'plz', o.plz, 'ort', o.ort, 'breite', o.breite, 'laenge', o.laenge),
          'team', '[]'::jsonb,
          'material', null,
          'rapporte', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'art', r.art, 'datum', r.datum,
                                                                     'abgeschlossen_am', r.abgeschlossen_am) order by r.datum), '[]')
                         from public.rapporte r where r.service_fall_id = f.id and r.geloescht_am is null)) as e
          from public.service_faelle f
          left join public.anlagen a on a.id = f.anlage_id
          left join public.projekte p on p.id = coalesce(f.projekt_id, a.projekt_id)
          left join public.kontakte k on k.id = coalesce(f.kontakt_id, p.kontakt_id)
          left join public.objekte o on o.id = coalesce(a.objekt_id, p.objekt_id)
         where f.geloescht_am is null and f.status <> 'erledigt' and f.person_id = v_person
           and (f.termin_am at time zone 'Europe/Zurich')::date between p_von and p_bis
      ) x(e)), '[]'));
end
$$;

/** Text aus p, wenn das Feld mitgeschickt wurde, sonst der bisherige Wert (leer = null). */
create or replace function intern.feld(p jsonb, p_name text, p_alt text) returns text
language sql immutable as $$
  select case when p ? p_name then nullif(trim(p ->> p_name), '') else p_alt end
$$;

/**
 * Rapport anlegen oder ändern (p: id, art, datum, projekt_id, service_fall_id, wartungsvertrag_id, einsatz_id,
 * arbeiten, material, team, pruefpunkte, montage_fertig, verrechnung, notiz_intern). Gibt die ID zurück.
 */
create or replace function public.rapport_speichern(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  r public.rapporte;
begin
  select * into r from public.rapporte where id = v_id;
  if not found then
    if nullif(p ->> 'projekt_id', '') is null and nullif(p ->> 'service_fall_id', '') is null
       and nullif(p ->> 'wartungsvertrag_id', '') is null then
      raise exception using errcode = 'P0001', message = 'baustelle.rapport_ohne_bezug';
    end if;
    insert into public.rapporte (id, art, datum, projekt_id, service_fall_id, wartungsvertrag_id, einsatz_id, arbeiten,
                                 material, team, pruefpunkte, montage_fertig, verrechnung, notiz_intern)
    values (v_id, coalesce(nullif(p ->> 'art', ''), 'montage'),
            coalesce(nullif(p ->> 'datum', '')::date, (now() at time zone 'Europe/Zurich')::date),
            nullif(p ->> 'projekt_id', '')::uuid, nullif(p ->> 'service_fall_id', '')::uuid,
            nullif(p ->> 'wartungsvertrag_id', '')::uuid, nullif(p ->> 'einsatz_id', '')::uuid,
            nullif(trim(p ->> 'arbeiten'), ''), coalesce(p -> 'material', '[]'),
            coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p -> 'team') x), '{}'),
            coalesce(p -> 'pruefpunkte', '{}'), coalesce((p ->> 'montage_fertig')::boolean, false),
            nullif(p ->> 'verrechnung', ''), nullif(trim(p ->> 'notiz_intern'), ''));
    return v_id;
  end if;
  if r.geloescht_am is not null then raise exception using errcode = 'P0001', message = 'baustelle.rapport_geloescht'; end if;
  update public.rapporte set
    datum = coalesce(nullif(p ->> 'datum', '')::date, datum),
    arbeiten = intern.feld(p, 'arbeiten', arbeiten),
    material = case when p ? 'material' then coalesce(p -> 'material', '[]') else material end,
    team = case when p ? 'team' then coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p -> 'team') x), '{}') else team end,
    pruefpunkte = case when p ? 'pruefpunkte' then coalesce(p -> 'pruefpunkte', '{}') else pruefpunkte end,
    montage_fertig = coalesce((p ->> 'montage_fertig')::boolean, montage_fertig),
    verrechnung = intern.feld(p, 'verrechnung', verrechnung),
    notiz_intern = intern.feld(p, 'notiz_intern', notiz_intern)
  where id = v_id;
  return v_id;
end
$$;

/**
 * Zeit starten (p: id, rapport_id, projekt_id, start, art). Läuft schon eine Zeit, endet sie beim neuen Start:
 * wer auf die nächste Baustelle fährt, muss nicht zuerst stoppen. Die Startzeit kommt vom Handy (offline genau).
 */
create or replace function public.zeit_starten(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_person uuid := intern.meine_person_id();
  v_start timestamptz := coalesce(nullif(p ->> 'start', '')::timestamptz, now());
  v_projekt uuid := nullif(p ->> 'projekt_id', '')::uuid;
begin
  if v_person is null then raise exception using errcode = 'P0001', message = 'baustelle.keine_person'; end if;
  if exists (select 1 from public.zeiten where id = v_id) then return v_id; end if;
  if v_start > now() + interval '10 minutes' then raise exception using errcode = 'P0001', message = 'baustelle.zeit_zukunft'; end if;
  if v_projekt is null and nullif(p ->> 'rapport_id', '') is not null then
    select r.projekt_id into v_projekt from public.rapporte r where r.id = (p ->> 'rapport_id')::uuid;
  end if;
  update public.zeiten set stopp = greatest(v_start, start + interval '1 minute')
   where person_id = v_person and stopp is null and geloescht_am is null;
  insert into public.zeiten (id, person_id, rapport_id, projekt_id, start, art)
  values (v_id, v_person, nullif(p ->> 'rapport_id', '')::uuid, v_projekt, v_start, coalesce(nullif(p ->> 'art', ''), 'arbeit'));
  return v_id;
end
$$;

/** Zeit stoppen (p: id, stopp, pause_min). Schon gestoppt: nichts tun (Wiederholung nach Funkloch). */
create or replace function public.zeit_stoppen(p jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  z public.zeiten;
  v_stopp timestamptz := coalesce(nullif(p ->> 'stopp', '')::timestamptz, now());
begin
  select * into z from public.zeiten where id = (p ->> 'id')::uuid and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.zeit_nicht_gefunden'; end if;
  if z.stopp is not null then return; end if;
  update public.zeiten set stopp = greatest(v_stopp, z.start + interval '1 minute'),
         pause_min = coalesce(nullif(p ->> 'pause_min', '')::int, pause_min)
   where id = z.id;
end
$$;

/**
 * Zeit von Hand erfassen oder korrigieren (p: id, person_id, start, stopp, pause_min, art, projekt_id,
 * rapport_id, notiz). Für andere Personen nur mit Recht preise (Policy prüft).
 */
create or replace function public.zeit_speichern(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_start timestamptz := (p ->> 'start')::timestamptz;
  v_stopp timestamptz := nullif(p ->> 'stopp', '')::timestamptz;
begin
  if v_start is null then raise exception using errcode = 'P0001', message = 'baustelle.zeit_start_fehlt'; end if;
  if v_stopp is not null and v_stopp <= v_start then raise exception using errcode = 'P0001', message = 'baustelle.zeit_stopp_vor_start'; end if;
  if coalesce(nullif(p ->> 'pause_min', '')::int, 0) < 0 then raise exception using errcode = 'P0001', message = 'baustelle.zeit_pause'; end if;
  insert into public.zeiten as z (id, person_id, start, stopp, pause_min, art, projekt_id, rapport_id, notiz)
  values (v_id, coalesce(nullif(p ->> 'person_id', '')::uuid, intern.meine_person_id()), v_start, v_stopp,
          coalesce(nullif(p ->> 'pause_min', '')::int, 0), coalesce(nullif(p ->> 'art', ''), 'arbeit'),
          nullif(p ->> 'projekt_id', '')::uuid, nullif(p ->> 'rapport_id', '')::uuid, nullif(trim(p ->> 'notiz'), ''))
  on conflict (id) do update set start = excluded.start, stopp = excluded.stopp, pause_min = excluded.pause_min,
     art = excluded.art, projekt_id = excluded.projekt_id, rapport_id = coalesce(excluded.rapport_id, z.rapport_id),
     notiz = excluded.notiz;
  return v_id;
end
$$;

/** Nachtrag anlegen oder ändern, solange er offen ist (p: id, projekt_id, rapport_id, beschreibung, stunden, material, betrag_rappen). */
create or replace function public.nachtrag_speichern(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  n public.nachtraege;
  v_projekt uuid := nullif(p ->> 'projekt_id', '')::uuid;
begin
  if nullif(trim(p ->> 'beschreibung'), '') is null then raise exception using errcode = 'P0001', message = 'baustelle.nachtrag_leer'; end if;
  select * into n from public.nachtraege where id = v_id;
  if found then
    if n.status <> 'offen' then raise exception using errcode = 'P0001', message = 'baustelle.nachtrag_nicht_offen'; end if;
    update public.nachtraege set beschreibung = trim(p ->> 'beschreibung'),
           stunden = case when p ? 'stunden' then nullif(p ->> 'stunden', '')::numeric else stunden end,
           material = case when p ? 'material' then coalesce(p -> 'material', '[]') else material end,
           betrag_rappen = case when p ? 'betrag_rappen' then nullif(p ->> 'betrag_rappen', '')::bigint else betrag_rappen end
     where id = v_id;
    return v_id;
  end if;
  if v_projekt is null and nullif(p ->> 'rapport_id', '') is not null then
    select r.projekt_id into v_projekt from public.rapporte r where r.id = (p ->> 'rapport_id')::uuid;
  end if;
  if v_projekt is null then raise exception using errcode = 'P0001', message = 'baustelle.nachtrag_ohne_projekt'; end if;
  insert into public.nachtraege (id, projekt_id, rapport_id, beschreibung, stunden, material, betrag_rappen)
  values (v_id, v_projekt, nullif(p ->> 'rapport_id', '')::uuid, trim(p ->> 'beschreibung'),
          nullif(p ->> 'stunden', '')::numeric, coalesce(p -> 'material', '[]'), nullif(p ->> 'betrag_rappen', '')::bigint);
  return v_id;
end
$$;

/**
 * Rapport abschliessen (p: unterschrift {name, dokument_id, am} oder ohne_unterschrift (Grund), montage_fertig,
 * verrechnung, fall_erledigt, stopp). Laufende Zeiten des Rapports enden. Folgen je Art:
 * Montage fertig → Baustelle «IBN ausstehend»; IBN → Anlage mit IBN-Datum, Projekt abgeschlossen;
 * Service → Eintrag im Verlauf des Falls; Wartung → Wartung erledigt. Unterschriebene offene Nachträge des
 * Rapports gelten als vom Kunden bestätigt.
 */
create or replace function public.rapport_abschliessen(p_id uuid, p jsonb default '{}')
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  r public.rapporte;
  v_unterschrift jsonb;
  v_stopp timestamptz := coalesce(nullif(p ->> 'stopp', '')::timestamptz, now());
  v_text text;
begin
  select * into r from public.rapporte where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.rapport_nicht_gefunden'; end if;
  if r.abgeschlossen_am is not null then return; end if;  -- Wiederholung nach Funkloch
  if nullif(trim(coalesce(p -> 'unterschrift' ->> 'name', '')), '') is not null and nullif(p -> 'unterschrift' ->> 'dokument_id', '') is not null then
    v_unterschrift := jsonb_build_object('name', trim(p -> 'unterschrift' ->> 'name'), 'dokument_id', p -> 'unterschrift' ->> 'dokument_id',
                                         'am', coalesce(p -> 'unterschrift' ->> 'am', now()::text));
  elsif nullif(trim(coalesce(p ->> 'ohne_unterschrift', '')), '') is not null then
    v_unterschrift := jsonb_build_object('ohne', trim(p ->> 'ohne_unterschrift'), 'am', now());
  else
    raise exception using errcode = 'P0001', message = 'baustelle.unterschrift_fehlt';
  end if;
  if nullif(trim(coalesce(r.arbeiten, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'baustelle.arbeiten_fehlen';
  end if;
  if r.art in ('service', 'wartung') and coalesce(nullif(p ->> 'verrechnung', ''), r.verrechnung) is null then
    raise exception using errcode = 'P0001', message = 'baustelle.verrechnung_fehlt';
  end if;

  update public.zeiten set stopp = greatest(v_stopp, start + interval '1 minute')
   where rapport_id = p_id and stopp is null and geloescht_am is null;
  update public.rapporte set unterschrift_kunde = v_unterschrift, abgeschlossen_am = now(),
         montage_fertig = coalesce((p ->> 'montage_fertig')::boolean, montage_fertig),
         verrechnung = coalesce(nullif(p ->> 'verrechnung', ''), verrechnung)
   where id = p_id
  returning * into r;

  if v_unterschrift ? 'dokument_id' then
    update public.nachtraege set status = 'vom_kunden_bestaetigt', bestaetigt_am = now(), unterschrift_kunde = v_unterschrift
     where rapport_id = p_id and status = 'offen' and geloescht_am is null;
  end if;

  v_text := r.nummer || ': ' || left(coalesce(r.arbeiten, ''), 300);
  if r.art = 'montage' and r.montage_fertig and r.projekt_id is not null then
    update public.projekte set bau_vorher = intern.bau_merken(id), bau_status = 'ibn'
     where id = r.projekt_id and coalesce(bau_status, 'ausstehend') in ('ausstehend', 'terminiert');
  elsif r.art = 'ibn' and r.projekt_id is not null then
    update public.projekte set bau_vorher = intern.bau_merken(id), status = 'abgeschlossen', bau_status = 'fertig'
     where id = r.projekt_id and coalesce(bau_status, '') <> 'fertig';
    perform intern.anlage_zum_projekt(r.projekt_id, r.datum);
  elsif r.art = 'service' and r.service_fall_id is not null then
    update public.service_faelle
       set verlauf = verlauf || jsonb_build_array(jsonb_build_object('am', now(), 'person_id', intern.meine_person_id(),
                                                                    'text', v_text, 'rapport_id', r.id)),
           status = case when coalesce((p ->> 'fall_erledigt')::boolean, false) then 'erledigt' else status end
     where id = r.service_fall_id;
  elsif r.art = 'wartung' and r.wartungsvertrag_id is not null then
    perform public.wartung_erledigt(r.wartungsvertrag_id, r.datum, v_text);
  end if;
end
$$;

/** Abschluss zurücknehmen, um einen Fehler zu korrigieren (Recht preise). Die Folgen bleiben bestehen. */
create or replace function public.rapport_oeffnen(p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'baustelle.recht_fehlt'; end if;
  update public.rapporte set abgeschlossen_am = null where id = p_id and abgeschlossen_am is not null and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.rapport_nicht_gefunden'; end if;
end
$$;

/** Nachtrag im Büro bestätigen (z. B. per Mail), ablehnen (mit Grund) oder wieder öffnen (Recht preise). */
create or replace function public.nachtrag_status(p_id uuid, p_status text, p_grund text default null)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'baustelle.recht_fehlt'; end if;
  if p_status not in ('offen', 'vom_kunden_bestaetigt', 'abgelehnt') then
    raise exception using errcode = 'P0001', message = 'baustelle.nachtrag_status';
  end if;
  if p_status = 'abgelehnt' and nullif(trim(coalesce(p_grund, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'baustelle.grund_fehlt';
  end if;
  update public.nachtraege set status = p_status,
         bestaetigt_am = case when p_status = 'vom_kunden_bestaetigt' then coalesce(bestaetigt_am, now()) end,
         abgelehnt_grund = case when p_status = 'abgelehnt' then trim(p_grund) end
   where id = p_id and geloescht_am is null and status <> 'verrechnet';
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.nachtrag_nicht_offen'; end if;
end
$$;

/** Zeiten als geprüft markieren (Projektleitung oder Buchhaltung). Laufende und exportierte bleiben aussen vor. */
create or replace function public.zeiten_pruefen(p_ids uuid[])
returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_n int;
begin
  if not (intern.hat_recht('preise') or intern.hat_recht('finanzen')) then
    raise exception using errcode = 'P0001', message = 'baustelle.recht_fehlt';
  end if;
  update public.zeiten set freigegeben_am = now(), freigegeben_von = intern.meine_person_id()
   where id = any (p_ids) and stopp is not null and exportiert_am is null and freigegeben_am is null and geloescht_am is null;
  get diagnostics v_n = row_count;
  return v_n;
end
$$;

/**
 * Geprüfte Zeiten für den AbaNinja-Lohn: markiert sie als exportiert (alle mit demselben Zeitpunkt, damit sich
 * die Datei wieder herunterladen lässt) und gibt den Zeitpunkt zurück. Nur mit Recht finanzen.
 */
create or replace function public.zeiten_exportieren(p_ids uuid[])
returns timestamptz
language plpgsql security invoker set search_path = '' as $$
declare
  v_am timestamptz := now();
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'baustelle.recht_fehlt'; end if;
  update public.zeiten set exportiert_am = v_am
   where id = any (p_ids) and freigegeben_am is not null and exportiert_am is null and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.nichts_zu_exportieren'; end if;
  return v_am;
end
$$;

grant execute on function public.mein_tag(date, date, uuid), public.rapport_speichern(jsonb), public.zeit_starten(jsonb),
  public.zeit_stoppen(jsonb), public.zeit_speichern(jsonb), public.nachtrag_speichern(jsonb),
  public.rapport_abschliessen(uuid, jsonb), public.rapport_oeffnen(uuid), public.nachtrag_status(uuid, text, text),
  public.zeiten_pruefen(uuid[]), public.zeiten_exportieren(uuid[]) to authenticated;
