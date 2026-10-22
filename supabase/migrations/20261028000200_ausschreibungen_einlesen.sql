-- Phase 8b, Teil 2: Meldungen einlesen, bewerten, einer Spur zuordnen und Doppelte zu einem Dossier
-- zusammenführen. Der Server (Edge Function «ausschreibungen») ruft «ausschreibung_einlesen» für jede
-- Meldung aus simap oder dem Amtsblatt auf; von Hand Erfasstes läuft über «ausschreibung_erfassen».
-- Externe Texte sind Daten (Regel 7): sie werden gespeichert und durchsucht, nie ausgeführt.

alter table public.aufgaben add column if not exists text text;

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe, eigenschaften)
values ('verkaufsstufe', 'angeschrieben', 'Angeschrieben', 'Contacté', 15, 'info', '{"herkunft": "ausschreibung"}');

/** Einstellungen des Monitors (eine Zeile in «einstellungen»). */
create or replace function intern.as_cfg() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select wert from public.einstellungen where schluessel = 'ausschreibungen' and geloescht_am is null), '{}')
$$;

/** Personen (ids) einer Aufgabe laut Einstellung, z. B. «bewilligen» oder «senden_vertretung». */
create or replace function intern.as_personen(p_rolle text) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.id), '{}') from public.personen p
   where p.aktiv and p.geloescht_am is null
     and p.kuerzel in (select jsonb_array_elements_text(coalesce(intern.as_cfg() -> p_rolle, '[]')))
$$;

/**
 * Darf ich das? «bewilligen» (Andy, Vertretung Chris) oder «senden» (Chris, Vertretung Loris). Die
 * Administration darf immer, damit der Ablauf nie an einer Abwesenheit hängen bleibt.
 */
create or replace function intern.as_darf(p_rolle text) returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.meine_person_id() = any (intern.as_personen(p_rolle) || intern.as_personen(p_rolle || '_vertretung'))
      or intern.hat_recht('admin')
$$;

/** Datum plus n Arbeitstage (Montag bis Freitag). */
create or replace function intern.arbeitstage_plus(p_datum date, p_tage int) returns date
language plpgsql immutable set search_path = '' as $$
declare
  d date := p_datum;
  n int := 0;
begin
  while n < p_tage loop
    d := d + 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  return d;
end
$$;

/**
 * Geschätzte Fahrzeit in Minuten zwischen zwei Postleitzahlen: Luftlinie mal Umweg-Faktor bei
 * Durchschnittstempo (Einstellung «fahrzeit»). Reicht für das Einzugsgebiet von 60 Minuten.
 */
create or replace function intern.fahrzeit_min(p_von text, p_nach text) returns int
language sql stable set search_path = '' as $$
  select round(
           2 * 6371 * asin(sqrt(power(sin(radians(b.breite - a.breite) / 2), 2)
             + cos(radians(a.breite)) * cos(radians(b.breite)) * power(sin(radians(b.laenge - a.laenge) / 2), 2)))
           * coalesce((c -> 'fahrzeit' ->> 'umweg')::numeric, 1.3)
           / coalesce((c -> 'fahrzeit' ->> 'kmh')::numeric, 60) * 60
           + coalesce((c -> 'fahrzeit' ->> 'zuschlag_min')::numeric, 5))::int
    from public.plz_verzeichnis a, public.plz_verzeichnis b, intern.as_cfg() c
   where a.plz = p_von and b.plz = p_nach
$$;

/** Bewertung eines Texts mit den Stichworten der Einstellung: Punkte, Begründung und Merkmale. */
create or replace function intern.as_bewerten(p_text text, p_cpv text[] default '{}')
returns table (punkte int, begruendung text, aus boolean, planer boolean, elektro boolean, pv boolean)
language plpgsql stable set search_path = '' as $$
declare
  c jsonb := intern.as_cfg() -> 'stichworte';
  t text := lower(coalesce(p_text, ''));
  w text;
  treffer text[] := '{}';
  stark int := 0;
begin
  punkte := 0;
  for w in select jsonb_array_elements_text(c -> 'stark') loop
    if position(w in t) > 0 then punkte := punkte + 3; stark := stark + 1; treffer := treffer || w; end if;
  end loop;
  for w in select jsonb_array_elements_text(c -> 'mittel') loop
    if position(w in t) > 0 then punkte := punkte + 2; treffer := treffer || w; end if;
  end loop;
  for w in select jsonb_array_elements_text(c -> 'schwach') loop
    if position(w in t) > 0 then punkte := punkte + 1; treffer := treffer || w; end if;
  end loop;
  if p_cpv && array(select jsonb_array_elements_text(intern.as_cfg() -> 'simap_cpv')) then
    punkte := punkte + 3;
    stark := stark + 1;
    treffer := treffer || ('CPV ' || (select string_agg(x, ', ') from unnest(p_cpv) x));
  end if;
  pv := stark > 0;
  aus := not pv and exists (select 1 from jsonb_array_elements_text(c -> 'aus') x where position(x in t) > 0);
  planer := exists (select 1 from jsonb_array_elements_text(c -> 'planer') x where position(x in t) > 0);
  elektro := exists (select 1 from jsonb_array_elements_text(c -> 'elektro') x where position(x in t) > 0);
  begruendung := nullif(array_to_string((select array_agg(distinct x) from unnest(treffer[1:8]) x), ', '), '');
  return next;
end
$$;

/** Priorität A/B/C aus Punkten und Frist: wer hoch bewertet ist oder bald abläuft, kommt zuerst. */
create or replace function intern.as_prioritaet(p_punkte int, p_frist date) returns text
language sql stable set search_path = '' as $$
  select case
    when p_punkte >= 6 or (p_punkte >= 3 and p_frist is not null and p_frist <= current_date + 21) then 'A'
    when p_punkte >= 3 then 'B'
    else 'C' end
$$;

/** Eintrag im Verlauf eines Dossiers. */
create or replace function intern.as_vermerk(p_id uuid, p_text text, p_details jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.aktivitaeten (art, text, person_id, ausschreibung_id, details)
  values ('ausschreibung', p_text, intern.meine_person_id(), p_id, coalesce(p_details, '{}'))
$$;

/** Aufgabe nur anlegen, wenn dieselbe Person zum selben Bezug nicht schon eine offene mit gleichem Titel hat. */
create or replace function intern.aufgabe_einmal(p_person uuid, p_titel text, p_faellig date, p_tabelle text,
  p_bezug uuid, p_text text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v uuid;
begin
  if p_person is null then return null; end if;
  select id into v from public.aufgaben
   where person_id = p_person and bezug_id is not distinct from p_bezug and titel = p_titel
     and erledigt_am is null and geloescht_am is null;
  if v is null then
    insert into public.aufgaben (titel, text, faellig_am, person_id, bezug_tabelle, bezug_id)
    values (p_titel, p_text, p_faellig, p_person, p_tabelle, p_bezug) returning id into v;
  end if;
  return v;
end
$$;

/**
 * Ist eine Adresse oder ein Name gesperrt? Gibt den Grund zurück, sonst null. Gilt für alle Module:
 * Sperrliste, «keine Werbung» und Vergabestellen bis zum Zuschlag.
 */
create or replace function intern.gesperrt(p_email text, p_name text) returns text
language sql stable security definer set search_path = '' as $$
  select s.grund from public.kontaktsperren s
   where s.aufgehoben_am is null and s.geloescht_am is null and (s.bis is null or s.bis >= current_date)
     and ((s.art = 'email' and lower(s.wert) = lower(trim(p_email)))
       or (s.art = 'domain' and lower(s.wert) = split_part(lower(trim(p_email)), '@', 2))
       or (s.art = 'name' and nullif(trim(p_name), '') is not null
           and (lower(s.wert) = lower(trim(p_name)) or public.similarity(lower(s.wert), lower(trim(p_name))) > 0.7)))
   order by s.erstellt_am limit 1
$$;

-- Der Ausgangskorb nimmt nichts an gesperrte Empfänger an, egal aus welchem Modul.
create or replace function intern.ausgang_sperre_pruefen() returns trigger
language plpgsql set search_path = '' as $$
declare
  a text;
  k public.kontakte;
begin
  if new.kanal = 'mail' then
    for a in select trim(x) from regexp_split_to_table(coalesce(new.an, ''), '[,;]') x where trim(x) <> '' loop
      if intern.gesperrt(a, null) is not null then
        raise exception using errcode = 'P0001', message = 'ausgang.gesperrt';
      end if;
    end loop;
  end if;
  if new.kontakt_id is not null then
    select * into k from public.kontakte where id = new.kontakt_id;
    if intern.gesperrt(null, k.firma) is not null then
      raise exception using errcode = 'P0001', message = 'ausgang.gesperrt';
    end if;
  end if;
  return new;
end
$$;
create trigger sperre before insert on public.ausgangskorb for each row execute function intern.ausgang_sperre_pruefen();

/** Bestehenden CRM-Kontakt zu einer Angabe aus der Publikation finden (gleiche Mail oder sehr ähnliche Firma). */
create or replace function intern.as_kontakt_finden(p_email text, p_firma text) returns uuid
language sql stable security definer set search_path = '' as $$
  select k.id from public.kontakte k
   where k.geloescht_am is null
     and ((nullif(trim(p_email), '') is not null and lower(k.email) = lower(trim(p_email)))
       or (nullif(trim(p_firma), '') is not null and k.firma is not null
           and public.similarity(lower(k.firma), lower(trim(p_firma))) > 0.75))
   order by (lower(k.email) = lower(trim(p_email))) desc nulls last, k.erstellt_am
   limit 1
$$;

/** Kontakt einer Publikation am Dossier speichern (ohne Quelle kein Kontakt). */
create or replace function intern.as_kontakt_anlegen(p_id uuid, k jsonb, p_quelle text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v uuid;
  v_name text := nullif(trim(coalesce(k ->> 'name', k ->> 'firma')), '');
begin
  if v_name is null then return null; end if;
  select id into v from public.ausschreibung_kontakte
   where ausschreibung_id = p_id and rolle = coalesce(k ->> 'rolle', 'bauherr') and lower(name) = lower(v_name)
     and geloescht_am is null;
  if v is not null then return v; end if;
  insert into public.ausschreibung_kontakte (ausschreibung_id, rolle, art, name, firma, email, telefon, strasse, plz, ort,
    sprache, kontakt_id, quelle_link)
  values (p_id, coalesce(k ->> 'rolle', 'bauherr'), coalesce(k ->> 'art', 'firma'), v_name, nullif(trim(k ->> 'firma'), ''),
    nullif(trim(k ->> 'email'), ''), nullif(trim(k ->> 'telefon'), ''), nullif(trim(k ->> 'strasse'), ''),
    nullif(trim(k ->> 'plz'), ''), nullif(trim(k ->> 'ort'), ''),
    coalesce(nullif(k ->> 'sprache', ''), (select sprache from public.ausschreibungen where id = p_id)),
    intern.as_kontakt_finden(k ->> 'email', coalesce(k ->> 'firma', k ->> 'name')),
    coalesce(nullif(trim(k ->> 'quelle_link'), ''), p_quelle, 'Publikation'))
  returning id into v;
  return v;
end
$$;

/** Spur und Anfangsstatus je Art der Meldung (Konzept: die Art entscheidet die Spur). */
create or replace function intern.as_spur(p_art text, out spur text, out status text, out ausloeser text)
language sql immutable set search_path = '' as $$
  select case p_art when 'ausschreibung' then 'angebot' when 'zuschlag' then 'akquise' when 'baugesuch' then 'akquise'
                    else 'beobachten' end,
         case p_art when 'ausschreibung' then 'pruefen' when 'zuschlag' then 'kontakt_fehlt'
                    when 'baugesuch' then 'kontakt_fehlt' else 'beobachten' end,
         case p_art when 'elektro_gesamtlos' then 'zuschlag' when 'planermandat' then 'planer'
                    when 'vorankuendigung' then 'zuschlag' end
$$;

/**
 * Zuschlag zu einem bekannten Projekt: Gewinner festhalten, Sperre der Vergabestelle aufheben und die Spur
 * umschalten. Haben wir selbst eingereicht, steht hier, ob wir gewonnen haben.
 */
create or replace function intern.as_zuschlag(a public.ausschreibungen, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k jsonb;
  wir boolean := false;
begin
  for k in select * from jsonb_array_elements(coalesce(p -> 'kontakte', '[]')) loop
    perform intern.as_kontakt_anlegen(a.id, k, p ->> 'quell_url');
    wir := wir or lower(coalesce(k ->> 'name', '') || ' ' || coalesce(k ->> 'firma', '')) like '%dimension solaire%';
  end loop;
  update public.kontaktsperren set aufgehoben_am = now() where ausschreibung_id = a.id and aufgehoben_am is null;
  if a.spur = 'angebot' and a.status in ('teilnahme', 'kalkulation', 'eingereicht') then
    update public.ausschreibungen set status = case when wir then 'zuschlag' else 'absage' end where id = a.id;
    perform intern.as_vermerk(a.id, case when wir then 'Zuschlag erhalten' else 'Zuschlag an eine andere Firma' end);
    if a.offerte_id is not null then
      update public.offerten set status = case when wir then 'angenommen' else 'verloren' end,
             entscheid = case when wir then 'angenommen' else 'verloren' end, entscheid_am = current_date,
             verlustgrund = case when wir then null else 'Zuschlag an andere Firma' end
       where id = a.offerte_id;
    end if;
  elsif not wir and a.status not in ('verworfen', 'archiviert') then
    update public.ausschreibungen set spur = 'akquise', art = 'zuschlag', ausloeser = null, status = 'kontakt_fehlt',
           publiziert_am = coalesce(nullif(p ->> 'publiziert_am', '')::date, publiziert_am)
     where id = a.id;
    perform intern.as_vermerk(a.id, 'Zuschlag publiziert: Spur Akquise (Gewinner anschreiben)');
    perform intern.akquise_vorbereiten(a.id);
  end if;
end
$$;

/**
 * Speichert eine Meldung als Dossier oder ergänzt ein bestehendes. Gibt {aktion, id} zurück; aktion ist
 * «neu», «aktualisiert», «unveraendert» oder «uebersprungen» (nicht relevant oder ausserhalb des Gebiets).
 */
create or replace function intern.as_speichern(p jsonb, p_hand boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb := intern.as_cfg();
  b record;
  a public.ausschreibungen;
  v_art text := coalesce(nullif(p ->> 'art', ''), 'ausschreibung');
  v_plz text := nullif(substring(coalesce(p ->> 'plz', '') from '\d{4}'), '');
  v_kanton text := upper(nullif(trim(p ->> 'kanton'), ''));
  v_std text;
  v_fz int;
  v_spur record;
  v_haupt uuid;
  v_status text;
  v_grund text;
  v_frist date := coalesce(nullif(p ->> 'frist_eingabe', '')::timestamptz::date, nullif(p ->> 'frist', '')::date);
  v_id uuid;
  k jsonb;
begin
  select * into b from intern.as_bewerten(concat_ws(' ', p ->> 'titel', p ->> 'beschreibung'),
    coalesce(array(select jsonb_array_elements_text(p -> 'cpv')), '{}'));

  -- Bekannt? Dann ergänzen (Korrektur, Zuschlag, aus Vorankündigung wird Ausschreibung).
  select * into a from public.ausschreibungen
   where quelle = p ->> 'quelle' and quell_id = p ->> 'quell_id' and geloescht_am is null;
  if found then
    if v_art = 'zuschlag' and a.art <> 'zuschlag' then
      perform intern.as_zuschlag(a, p);
      return jsonb_build_object('aktion', 'aktualisiert', 'id', a.id);
    end if;
    if v_art = 'ausschreibung' and a.art = 'vorankuendigung' and a.spur = 'beobachten' then
      update public.ausschreibungen set art = 'ausschreibung', spur = 'angebot', status = 'pruefen', ausloeser = null
       where id = a.id;
      perform intern.as_vermerk(a.id, 'Ausschreibung publiziert: Spur Angebot');
    end if;
    if (nullif(p ->> 'frist_eingabe', '') is not null and a.frist_eingabe is not null
        and (p ->> 'frist_eingabe')::timestamptz <> a.frist_eingabe)
       or (coalesce((p ->> 'korrigiert')::boolean, false) and a.korrigiert_am is null) then
      update public.ausschreibungen
         set frist_eingabe = coalesce(nullif(p ->> 'frist_eingabe', '')::timestamptz, frist_eingabe),
             frist_fragen = coalesce(nullif(p ->> 'frist_fragen', '')::date, frist_fragen),
             frist_begehung = coalesce(nullif(p ->> 'frist_begehung', '')::timestamptz, frist_begehung),
             frist = coalesce(v_frist, frist), korrigiert_am = now(), rohdaten = coalesce(p -> 'rohdaten', rohdaten)
       where id = a.id;
      perform intern.as_vermerk(a.id, 'Korrektur in der Quelle: Angaben und Fristen nachgeführt',
        jsonb_build_object('frist_eingabe_vorher', a.frist_eingabe, 'frist_eingabe', p ->> 'frist_eingabe'));
      perform intern.aufgabe_einmal(x, 'Korrektur prüfen: ' || a.nummer, current_date, 'ausschreibungen', a.id)
         from unnest(intern.as_personen('bewilligen')) x
        where a.status in ('pruefen', 'teilnahme', 'kalkulation');
      return jsonb_build_object('aktion', 'aktualisiert', 'id', a.id);
    end if;
    return jsonb_build_object('aktion', 'unveraendert', 'id', a.id);
  end if;

  -- Neu: relevant und im Einzugsgebiet?
  -- Von Hand Erfasstes wird nie still verworfen: es landet zum Prüfen in der Liste.
  if not p_hand and (b.punkte = 0 or b.aus) then
    return jsonb_build_object('aktion', 'uebersprungen', 'grund', 'nicht_relevant');
  end if;
  if v_art = 'ausschreibung' and b.planer then v_art := 'planermandat';
  elsif v_art = 'ausschreibung' and b.elektro and not b.pv then v_art := 'elektro_gesamtlos';
  end if;
  if v_kanton is null and v_plz is not null then
    select kanton into v_kanton from public.plz_verzeichnis where plz = v_plz;
  end if;
  if not p_hand and v_kanton is not null and not (c -> 'kantone') ? v_kanton then
    return jsonb_build_object('aktion', 'uebersprungen', 'grund', 'ausserhalb');
  end if;
  v_std := coalesce(public.standort_fuer_plz(v_plz),
                    case when v_kanton in ('FR', 'VD', 'NE', 'JU', 'GE', 'VS') then 'bulle' else 'muri' end);
  select min(intern.fahrzeit_min(s.plz, v_plz)) into v_fz from public.standorte s where s.geloescht_am is null;
  select * into v_spur from intern.as_spur(v_art);
  v_status := v_spur.status;
  if not p_hand and v_fz > coalesce((c ->> 'fahrzeit_max')::int, 60) then
    v_status := 'verworfen';
    v_grund := 'Ausserhalb des Einzugsgebiets (' || v_fz || ' Min.)';
  end if;

  -- Doppelt? Gleiche Gemeinde und Parzelle oder sehr ähnliche Bauherrschaft in den letzten zwei Jahren.
  select coalesce(x.haupt_id, x.id) into v_haupt from public.ausschreibungen x
   where x.geloescht_am is null and lower(x.gemeinde) = lower(trim(p ->> 'gemeinde'))
     and x.erstellt_am > now() - interval '24 months'
     and ((nullif(trim(p ->> 'parzelle'), '') is not null and x.parzelle = trim(p ->> 'parzelle'))
       or (nullif(trim(p ->> 'bauherr'), '') is not null and x.bauherr is not null
           and public.similarity(lower(x.bauherr), lower(trim(p ->> 'bauherr'))) > 0.6))
   order by x.erstellt_am limit 1;

  insert into public.ausschreibungen (quelle, quell_id, quell_url, art, spur, status, prioritaet, punkte, begruendung,
    titel, beschreibung, gemeinde, plz, kanton, standort_id, sprache, fahrzeit_min, vergabestelle, frist, frist_fragen,
    frist_begehung, frist_eingabe, publiziert_am, parzelle, bauherr, bauherr_art, ausloeser, beobachten_seit, grund,
    haupt_id, rohdaten)
  values (p ->> 'quelle', p ->> 'quell_id', p ->> 'quell_url', v_art, v_spur.spur, v_status,
    intern.as_prioritaet(b.punkte, v_frist), b.punkte, b.begruendung, left(coalesce(nullif(trim(p ->> 'titel'), ''), '–'), 500),
    p ->> 'beschreibung', nullif(trim(p ->> 'gemeinde'), ''), v_plz, v_kanton, (select id from public.standorte where kuerzel = v_std),
    coalesce(nullif(p ->> 'sprache', ''), (select sprache from public.standorte where kuerzel = v_std), 'de'), v_fz,
    nullif(trim(p ->> 'vergabestelle'), ''), v_frist, nullif(p ->> 'frist_fragen', '')::date,
    nullif(p ->> 'frist_begehung', '')::timestamptz, nullif(p ->> 'frist_eingabe', '')::timestamptz,
    coalesce(nullif(p ->> 'publiziert_am', '')::date, current_date), nullif(trim(p ->> 'parzelle'), ''),
    nullif(trim(p ->> 'bauherr'), ''), nullif(p ->> 'bauherr_art', ''), v_spur.ausloeser,
    case when v_spur.spur = 'beobachten' then current_date end, v_grund, v_haupt, p -> 'rohdaten')
  returning id into v_id;

  for k in select * from jsonb_array_elements(coalesce(p -> 'kontakte', '[]')) loop
    perform intern.as_kontakt_anlegen(v_id, k, p ->> 'quell_url');
  end loop;
  perform intern.as_vermerk(v_id, concat_ws(' · ', 'Gefunden: ' || (p ->> 'quelle'), b.begruendung, v_grund),
    jsonb_build_object('punkte', b.punkte));

  -- Vergabestelle bis zum Zuschlag nicht anschreiben (für alle Module).
  if v_spur.spur in ('angebot', 'beobachten') and nullif(trim(p ->> 'vergabestelle'), '') is not null
     and v_status <> 'verworfen' then
    insert into public.kontaktsperren (art, wert, grund, ausschreibung_id)
    values ('name', trim(p ->> 'vergabestelle'), 'Vergabestelle bis zum Zuschlag (' ||
      (select nummer from public.ausschreibungen where id = v_id) || ')', v_id);
  end if;
  if v_spur.spur = 'akquise' and v_status <> 'verworfen' then
    if v_haupt is not null then
      update public.ausschreibungen set status = 'beobachten', spur = 'beobachten', grund = 'Gehört zu einem bestehenden Dossier'
       where id = v_id;
    else
      perform intern.akquise_vorbereiten(v_id);
    end if;
  end if;
  return jsonb_build_object('aktion', 'neu', 'id', v_id);
end
$$;

/** Für den Server: eine Meldung aus einer Quelle einlesen. */
create or replace function public.ausschreibung_einlesen(p jsonb) returns jsonb
language sql security definer set search_path = '' as $$
  select intern.as_speichern(p)
$$;

/** Von Hand erfassen (z. B. aus dem Amtsblatt AG oder der Feuille officielle FR, die nur als PDF erscheinen). */
create or replace function public.ausschreibung_erfassen(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  r jsonb;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  if nullif(trim(p ->> 'titel'), '') is null then raise exception using errcode = 'P0001', message = 'ausschreibung.titel_fehlt'; end if;
  if nullif(trim(p ->> 'quell_url'), '') is null then raise exception using errcode = 'P0001', message = 'ausschreibung.quelle_fehlt'; end if;
  r := intern.as_speichern(p || jsonb_build_object('quelle', coalesce(nullif(p ->> 'quelle', ''), 'hand'),
                                                   'quell_id', coalesce(nullif(p ->> 'quell_id', ''), gen_random_uuid()::text)), true);
  return (r ->> 'id')::uuid;
end
$$;

/** Quellen-Kontrolle: Lauf einer Quelle beginnen und abschliessen (nur Server). */
create or replace function public.quellen_lauf(p_quelle text, p_ok boolean, p_gelesen int, p_neu int, p_aktualisiert int,
  p_meldung text, p_beginn timestamptz default now()) returns void
language sql security definer set search_path = '' as $$
  insert into public.quellen_laeufe (quelle, beginn, ende, ok, gelesen, neu, aktualisiert, meldung)
  values (p_quelle, p_beginn, now(), p_ok, p_gelesen, p_neu, p_aktualisiert, left(p_meldung, 500))
$$;

revoke execute on function public.ausschreibung_einlesen(jsonb) from public, anon, authenticated;
revoke execute on function public.quellen_lauf(text, boolean, int, int, int, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.ausschreibung_erfassen(jsonb) from public, anon;
grant execute on function public.ausschreibung_erfassen(jsonb) to authenticated;
