-- Phase 8c, Teil 2: Abläufe des Grossprojekt-Monitors. Treffer kommen aus den Meldungen des Ausschreibungs-Monitors
-- (simap, Amtsblatt) oder von Hand; der Server ergänzt Dach und Heizung aus sonnendach.ch und dem Gebäuderegister.
-- Andy bewilligt im CRM, erst dann entsteht der Lead. Neue starke Treffer meldet die Glocke einmal.

/** Verlaufseintrag eines Grossprojekts. */
create or replace function intern.gp_vermerk(p_id uuid, p_text text, p_details jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.aktivitaeten (art, text, person_id, grossprojekt_id, details)
  values ('grossprojekt', p_text, intern.meine_person_id(), p_id, coalesce(p_details, '{}'))
$$;

/** Darf ich bewilligen? Andy, Vertretung Chris, die Administration immer. */
create or replace function intern.gp_darf_bewilligen() returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.meine_person_id() = any (intern.gp_personen('bewilligen') || intern.gp_personen('bewilligen_vertretung'))
      or intern.hat_recht('admin')
$$;

/**
 * Schlüssel einer Stichwort-Liste {"schule": ["schul", …], …}, der im Text vorkommt. Bei mehreren Treffern gewinnt
 * das längste Stichwort (das genauere: «immobilien» vor « ag»).
 */
create or replace function intern.gp_stichwort(p_listen jsonb, p_text text) returns text
language sql stable set search_path = '' as $$
  select l.key from jsonb_each(coalesce(p_listen, '{}')) l, jsonb_array_elements_text(l.value) w
   where position(w in p_text) > 0
   order by length(w) desc, l.key
   limit 1
$$;

/**
 * Prüft eine Meldung des Ausschreibungs-Monitors auf Contracting: grosses Gebäude oder Heizung im Text und kein
 * Ausschluss (Einfamilienhaus, Reinigung …). Legt dann ein Grossprojekt an (einmal pro Quelle und Meldung).
 * Gibt die id zurück oder null. Läuft auch für Meldungen, die der Ausschreibungs-Monitor überspringt (kein PV-Wort).
 */
create or replace function intern.gp_aus_meldung(p jsonb, p_ausschreibung uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  st jsonb := intern.gp_cfg() -> 'stichworte';
  t text := lower(concat_ws(' ', p ->> 'titel', p ->> 'beschreibung'));
  gross boolean;
  waerme boolean;
  v_bauherr_art text;
  v_bauherr text := coalesce(nullif(trim(p ->> 'bauherr'), ''), nullif(trim(p ->> 'vergabestelle'), ''));
  v_wohnungen int := nullif(substring(t from '(\d{1,3})\s*(?:wohnungen|whg|logements|appartements)'), '')::int;
  v_id uuid;
begin
  if nullif(p ->> 'quell_id', '') is null then return null; end if;
  if exists (select 1 from public.grossprojekte where quelle = p ->> 'quelle' and quell_id = p ->> 'quell_id' and geloescht_am is null) then
    return null;
  end if;
  gross := exists (select 1 from jsonb_array_elements_text(st -> 'gross') w where position(w in t) > 0);
  waerme := exists (select 1 from jsonb_array_elements_text(st -> 'waerme') w where position(w in t) > 0);
  if not (gross or waerme) then return null; end if;
  if not waerme and exists (select 1 from jsonb_array_elements_text(st -> 'aus') w where position(w in t) > 0) then
    return null;
  end if;
  -- Art der Bauherrschaft zuerst aus dem Namen (Genossenschaft, Pensionskasse …, Leerzeichen davor, damit « ag»
  -- auch am Ende passt), sonst aus der groben Art des Ausschreibungs-Monitors; eine Vergabestelle ist öffentlich.
  v_bauherr_art := coalesce(intern.gp_stichwort(st -> 'bauherr', ' ' || lower(coalesce(v_bauherr, '')) || ' '),
    case p ->> 'bauherr_art' when 'gemeinde' then 'gemeinde' when 'landwirtschaft' then 'landwirtschaft'
      when 'privat' then 'privat' when 'firma' then 'gewerbe' end,
    case when nullif(p ->> 'vergabestelle', '') is not null then 'gemeinde' end);
  perform set_config('gp.ablauf', 'ja', true);
  insert into public.grossprojekte (titel, beschreibung, quelle, quell_id, quell_url, ausschreibung_id, strasse, plz, gemeinde,
    kanton, parzelle, bauherr, bauherr_art, nutzung, heizungsersatz, wohnungen)
  values (left(coalesce(nullif(trim(p ->> 'titel'), ''), '–'), 500), p ->> 'beschreibung', coalesce(p ->> 'quelle', 'hand'),
    p ->> 'quell_id', coalesce(nullif(p ->> 'quell_url', ''), p ->> 'quelle'), p_ausschreibung, nullif(trim(p ->> 'strasse'), ''),
    nullif(p ->> 'plz', ''), nullif(trim(p ->> 'gemeinde'), ''), upper(nullif(trim(p ->> 'kanton'), '')),
    nullif(trim(p ->> 'parzelle'), ''), v_bauherr, v_bauherr_art, intern.gp_stichwort(st -> 'nutzung', t),
    waerme and position('ersatz' in t) + position('sanierung' in t) + position('remplacement' in t) > 0, v_wohnungen)
  returning id into v_id;
  perform set_config('gp.ablauf', '', true);
  perform intern.gp_vermerk(v_id, 'Gefunden: ' || coalesce(p ->> 'quelle', 'hand'));
  return v_id;
end
$$;

-- Meldungen des Ausschreibungs-Monitors laufen zusätzlich durch den Grossprojekt-Monitor. Ein Fehler hier darf das
-- Einlesen der Ausschreibung nie aufhalten.
create or replace function public.ausschreibung_einlesen(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := intern.as_speichern(p);
  g uuid;
begin
  begin
    g := intern.gp_aus_meldung(p, case when r ->> 'aktion' = 'neu' then (r ->> 'id')::uuid end);
  exception when others then
    raise warning 'grossprojekt: %', sqlerrm;
  end;
  return r || case when g is not null then jsonb_build_object('grossprojekt', g) else '{}' end;
end
$$;
revoke execute on function public.ausschreibung_einlesen(jsonb) from public, anon, authenticated;

/** Von Hand erfassen oder ändern. Ohne Titel und Fundort wird nichts gespeichert. Gibt die id zurück. */
create or replace function public.grossprojekt_speichern(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  num int;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  if nullif(trim(p ->> 'titel'), '') is null then raise exception using errcode = 'P0001', message = 'grossprojekt.titel_fehlt'; end if;
  if nullif(trim(p ->> 'quell_url'), '') is null then raise exception using errcode = 'P0001', message = 'grossprojekt.quelle_fehlt'; end if;
  if v_id is null then
    insert into public.grossprojekte (titel, quell_url, quelle) values (trim(p ->> 'titel'), trim(p ->> 'quell_url'), 'hand')
    returning id into v_id;
    perform intern.gp_vermerk(v_id, 'Von Hand erfasst');
  end if;
  -- Nur Felder, die mitgeschickt werden, ändern («null» leert ein Feld).
  update public.grossprojekte g set
    titel = trim(p ->> 'titel'),
    quell_url = trim(p ->> 'quell_url'),
    beschreibung = case when p ? 'beschreibung' then nullif(trim(p ->> 'beschreibung'), '') else g.beschreibung end,
    strasse = case when p ? 'strasse' then nullif(trim(p ->> 'strasse'), '') else g.strasse end,
    plz = case when p ? 'plz' then nullif(trim(p ->> 'plz'), '') else g.plz end,
    gemeinde = case when p ? 'gemeinde' then nullif(trim(p ->> 'gemeinde'), '') else g.gemeinde end,
    parzelle = case when p ? 'parzelle' then nullif(trim(p ->> 'parzelle'), '') else g.parzelle end,
    bauherr = case when p ? 'bauherr' then nullif(trim(p ->> 'bauherr'), '') else g.bauherr end,
    bauherr_art = case when p ? 'bauherr_art' then nullif(p ->> 'bauherr_art', '') else g.bauherr_art end,
    nutzung = case when p ? 'nutzung' then nullif(p ->> 'nutzung', '') else g.nutzung end,
    geschuetzt = case when p ? 'geschuetzt' then coalesce((p ->> 'geschuetzt')::boolean, false) else g.geschuetzt end,
    heizungsersatz = case when p ? 'heizungsersatz' then coalesce((p ->> 'heizungsersatz')::boolean, false) else g.heizungsersatz end,
    dachflaeche_m2 = case when p ? 'dachflaeche_m2' then nullif(p ->> 'dachflaeche_m2', '')::int else g.dachflaeche_m2 end,
    heizung = case when p ? 'heizung' then nullif(p ->> 'heizung', '') else g.heizung end,
    heizung_jahr = case when p ? 'heizung_jahr' then nullif(p ->> 'heizung_jahr', '')::int else g.heizung_jahr end,
    waermeleistung_kw = case when p ? 'waermeleistung_kw' then nullif(p ->> 'waermeleistung_kw', '')::int else g.waermeleistung_kw end,
    wohnungen = case when p ? 'wohnungen' then nullif(p ->> 'wohnungen', '')::int else g.wohnungen end,
    notiz = case when p ? 'notiz' then nullif(trim(p ->> 'notiz'), '') else g.notiz end,
    -- Neue Adresse: Gebäudedaten neu holen.
    angereichert_am = case when (p ? 'strasse' and nullif(trim(p ->> 'strasse'), '') is distinct from g.strasse)
                             or (p ? 'plz' and nullif(trim(p ->> 'plz'), '') is distinct from g.plz)
                             or (p ? 'parzelle' and nullif(trim(p ->> 'parzelle'), '') is distinct from g.parzelle)
                           then null else g.angereichert_am end
   where g.id = v_id and g.geloescht_am is null;
  get diagnostics num = row_count;
  if num = 0 then raise exception using errcode = 'P0001', message = 'grossprojekt.weg'; end if;
  return v_id;
end
$$;

/**
 * Für den Server: Gebäudedaten aus sonnendach.ch und dem Gebäuderegister eintragen. Von Hand Eingetragenes bleibt
 * stehen (nur leere Felder werden gefüllt). «p_meldung» hält fest, was die Abfrage ergab.
 */
create or replace function public.grossprojekt_anreichern(p_id uuid, p jsonb, p_meldung text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.grossprojekte g set
    lage_e = coalesce(nullif(p ->> 'lage_e', '')::numeric, g.lage_e),
    lage_n = coalesce(nullif(p ->> 'lage_n', '')::numeric, g.lage_n),
    strasse = coalesce(g.strasse, nullif(p ->> 'strasse', '')),
    plz = coalesce(g.plz, nullif(p ->> 'plz', '')),
    gemeinde = coalesce(g.gemeinde, nullif(p ->> 'gemeinde', '')),
    dachflaeche_m2 = coalesce(g.dachflaeche_m2, nullif(p ->> 'dachflaeche_m2', '')::int),
    dach_klasse = coalesce(nullif(p ->> 'dach_klasse', '')::int, g.dach_klasse),
    stromertrag_kwh = coalesce(nullif(p ->> 'stromertrag_kwh', '')::int, g.stromertrag_kwh),
    heizung = coalesce(g.heizung, nullif(p ->> 'heizung', '')),
    heizung_jahr = coalesce(g.heizung_jahr, nullif(p ->> 'heizung_jahr', '')::int),
    wohnungen = coalesce(g.wohnungen, nullif(p ->> 'wohnungen', '')::int),
    baujahr = coalesce(g.baujahr, nullif(p ->> 'baujahr', '')::int),
    egid = coalesce(nullif(p ->> 'egid', ''), g.egid),
    nutzung = coalesce(g.nutzung, nullif(p ->> 'nutzung', '')),
    angereichert_am = now(),
    anreicherung = left(p_meldung, 300)
   where g.id = p_id;
  perform intern.gp_vermerk(p_id, 'Gebäudedaten: ' || left(p_meldung, 300), coalesce(p, '{}'));
end
$$;
revoke execute on function public.grossprojekt_anreichern(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.grossprojekt_anreichern(uuid, jsonb, text) to service_role;

/**
 * Entscheiden: «bewilligen» (Andy, Vertretung Chris; legt den Lead an), «beobachten» (Wiedervorlage, Standard
 * 3 Monate), «verwerfen» (mit Grund) oder «zurueck» (wieder zum Prüfen). Gibt bei «bewilligen» den Lead zurück.
 */
create or replace function public.grossprojekt_entscheiden(p_id uuid, p_entscheid text, p_angaben jsonb default '{}')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  g public.grossprojekte;
  v_lead uuid;
  v_grund text := nullif(trim(p_angaben ->> 'grund'), '');
  v_datum date := coalesce(nullif(p_angaben ->> 'wiedervorlage_am', '')::date, (current_date + interval '3 months')::date);
  s jsonb;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  select * into g from public.grossprojekte where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'grossprojekt.weg'; end if;
  perform set_config('gp.ablauf', 'ja', true);

  if p_entscheid = 'bewilligen' then
    if not intern.gp_darf_bewilligen() then
      raise exception using errcode = '42501', message = 'grossprojekt.nicht_bewilligen';
    end if;
    if g.stand = 'bewilligt' then return g.verkaufschance_id; end if;
    if nullif(trim(g.bauherr), '') is null then
      raise exception using errcode = 'P0001', message = 'grossprojekt.bauherr_fehlt';
    end if;
    -- Hat der Ausschreibungs-Monitor schon einen Lead, diesen nehmen statt einen zweiten anzulegen.
    select a.verkaufschance_id into v_lead from public.ausschreibungen a where a.id = g.ausschreibung_id;
    if v_lead is null then
      s := g.schaetzung;
      v_lead := public.lead_anlegen(jsonb_build_object(
        'kontakt', jsonb_build_object('art', case when g.bauherr_art = 'privat' then 'person' else 'firma' end,
                                      'firma', case when g.bauherr_art = 'privat' then null else g.bauherr end,
                                      'nachname', case when g.bauherr_art = 'privat' then g.bauherr end,
                                      'sprache', g.sprache),
        'objekt', jsonb_build_object('strasse', g.strasse, 'plz', g.plz, 'ort', g.gemeinde),
        'lead', jsonb_build_object('quelle', 'grossprojekt', 'standort_id', g.standort_id,
          'interesse', case g.art when 'pv' then '["pv"]' when 'waerme' then '["waermepumpe"]' else '["pv", "waermepumpe"]' end::jsonb,
          'notiz_intern', concat_ws(E'\n', g.nummer || ': ' || g.titel || ' (Contracting, ' || g.punkte || ' Punkte)',
            case when s ? 'kwp' then 'PV ca. ' || (s ->> 'kwp') || ' kWp, ' || (s ->> 'ertrag_kwh') || ' kWh/Jahr' end,
            case when s ? 'waerme_kw' then 'Wärme ca. ' || (s ->> 'waerme_kw') || ' kW' end,
            'Quelle: ' || g.quell_url))));
    end if;
    update public.grossprojekte set stand = 'bewilligt', verkaufschance_id = v_lead, entschieden_von = intern.meine_person_id(),
           entschieden_am = now(), grund = null, wiedervorlage_am = null where id = g.id;
    perform intern.gp_vermerk(g.id, 'Bewilligt: Lead angelegt', jsonb_build_object('lead', v_lead));
    return v_lead;
  elsif p_entscheid = 'beobachten' then
    update public.grossprojekte set stand = 'beobachten', wiedervorlage_am = v_datum, grund = v_grund,
           entschieden_von = intern.meine_person_id(), entschieden_am = now() where id = g.id;
    perform intern.gp_vermerk(g.id, 'Beobachten bis ' || to_char(v_datum, 'DD.MM.YYYY') || coalesce(': ' || v_grund, ''));
  elsif p_entscheid = 'verwerfen' then
    if v_grund is null then raise exception using errcode = 'P0001', message = 'grossprojekt.grund_fehlt'; end if;
    if g.stand = 'bewilligt' then raise exception using errcode = 'P0001', message = 'grossprojekt.schon_lead'; end if;
    update public.grossprojekte set stand = 'verworfen', grund = v_grund, wiedervorlage_am = null,
           entschieden_von = intern.meine_person_id(), entschieden_am = now() where id = g.id;
    perform intern.gp_vermerk(g.id, 'Verworfen: ' || v_grund);
  elsif p_entscheid = 'zurueck' then
    if g.stand = 'bewilligt' then raise exception using errcode = 'P0001', message = 'grossprojekt.schon_lead'; end if;
    update public.grossprojekte set stand = 'pruefen', grund = null, wiedervorlage_am = null,
           entschieden_von = null, entschieden_am = null where id = g.id;
    perform intern.gp_vermerk(g.id, 'Wieder zum Prüfen');
  else
    raise exception using errcode = 'P0001', message = 'grossprojekt.entscheid_unbekannt';
  end if;
  return null;
end
$$;
revoke execute on function public.grossprojekt_entscheiden(uuid, text, jsonb) from public, anon;
grant execute on function public.grossprojekt_entscheiden(uuid, text, jsonb) to authenticated;

/**
 * Zeitplan (stündlich): fällige «Beobachten» wieder zum Prüfen legen und neue starke Treffer (ab «melden_ab»
 * Punkten) einmal in der Glocke melden: an Andy, sonst an die Administration. Gibt die Zahlen zurück.
 */
create or replace function public.grossprojekte_melden() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb := intern.gp_cfg();
  g public.grossprojekte;
  empfaenger uuid[];
  n_wieder int := 0;
  n_gemeldet int := 0;
begin
  perform set_config('gp.ablauf', 'ja', true);
  for g in select * from public.grossprojekte where stand = 'beobachten' and wiedervorlage_am <= current_date
             and geloescht_am is null loop
    update public.grossprojekte set stand = 'pruefen', wiedervorlage_am = null where id = g.id;
    perform intern.gp_vermerk(g.id, 'Wiedervorlage: wieder zum Prüfen');
    n_wieder := n_wieder + 1;
  end loop;

  empfaenger := intern.gp_personen('bewilligen');
  if cardinality(empfaenger) = 0 then
    select coalesce(array_agg(p.id), '{}') into empfaenger from public.personen p
      left join public.rollen ro on ro.schluessel = p.rolle
     where p.aktiv and p.geloescht_am is null and ('admin' = any (p.rechte) or 'admin' = any (coalesce(ro.rechte, '{}')));
  end if;
  for g in select * from public.grossprojekte where stand = 'pruefen' and gemeldet_am is null and ausschluss is null
             and punkte >= coalesce((c ->> 'melden_ab')::int, 50) and geloescht_am is null order by punkte desc loop
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    select x, 'info', 'Grossprojekt: ' || g.titel, 'Grand projet : ' || g.titel,
           g.punkte || ' Punkte' || coalesce(' · ' || g.gemeinde, ''), g.punkte || ' points' || coalesce(' · ' || g.gemeinde, ''),
           '/contracting?projekt=' || g.id
      from unnest(empfaenger) x;
    update public.grossprojekte set gemeldet_am = now() where id = g.id;
    n_gemeldet := n_gemeldet + 1;
  end loop;
  return jsonb_build_object('wieder', n_wieder, 'gemeldet', n_gemeldet);
end
$$;
revoke execute on function public.grossprojekte_melden() from public, anon, authenticated;
grant execute on function public.grossprojekte_melden() to service_role;

-- Papierkorb: gelöschte Grossprojekte nehmen ihren Verlauf mit (wie bei den Ausschreibungen).
create or replace function intern.grossprojekt_papierkorb() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.geloescht_am is not null and old.geloescht_am is null then
    update public.aktivitaeten set geloescht_am = new.geloescht_am where grossprojekt_id = new.id and geloescht_am is null;
  elsif new.geloescht_am is null and old.geloescht_am is not null then
    update public.aktivitaeten set geloescht_am = null where grossprojekt_id = new.id and geloescht_am = old.geloescht_am;
  end if;
  return new;
end
$$;
create trigger papierkorb after update of geloescht_am on public.grossprojekte
  for each row execute function intern.grossprojekt_papierkorb();

-- Neue Annahmen oder Punkte: alle offenen Grossprojekte gleich neu bewerten (der Trigger «vorbereiten» rechnet).
create or replace function intern.grossprojekte_neu_bewerten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'grossprojekte' and new.wert is distinct from old.wert then
    update public.grossprojekte set titel = titel where stand in ('pruefen', 'beobachten') and geloescht_am is null;
  end if;
  return new;
end
$$;
create trigger grossprojekte_neu_bewerten after update on public.einstellungen
  for each row execute function intern.grossprojekte_neu_bewerten();
