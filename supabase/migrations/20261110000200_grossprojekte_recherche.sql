-- Grossprojekte (Phase 8c, Nachtrag 31.10.2026): Chris will höchstens 10 neue Grossprojekte pro Woche, dafür zu jedem
-- Eigentümer, Ansprechperson und nächste Schritte.
-- 1. Die Dachsuche legt Treffer zuerst in einen Vorrat; der Zeitplan gibt pro Woche die besten frei, bis
--    «pro_woche» erreicht ist (alle neuen Grossprojekte der Woche zählen mit, Ausschreibungen werden nie gebremst).
-- 2. Jedes neue Grossprojekt wartet auf die Recherche: Die KI sucht im Web (Handelsregister, Firmenwebsite) nach
--    Eigentümer und Ansprechperson, mit Quellen, und schlägt nächste Schritte vor. Übernommen wird erst per Klick
--    (Regel 6/7); das Grundbuch bestätigt ein Mensch. Siehe Entscheid 0029.

update public.einstellungen
   set wert = jsonb_set(wert, '{suche,pro_woche}', '10')
 where schluessel = 'grossprojekte' and not (wert -> 'suche' ? 'pro_woche');

-- KI: eigene Stufe für die Recherche und Preis der Websuche (USD je 1000 Suchen), Regel 9.
update public.einstellungen
   set wert = jsonb_set(jsonb_set(wert, '{funktionen,grossprojekt_recherche}', '"standard"'),
                        '{websuche_usd_je_1000}', coalesce(wert -> 'websuche_usd_je_1000', '10'))
 where schluessel = 'ki';

-- Recherche-Ergebnis (Vorschlag der KI) und Ansprechperson (übernommen von einem Menschen).
alter table public.grossprojekte
  add column recherche jsonb,
  add column recherche_stand text check (recherche_stand in ('wartet', 'laeuft', 'fertig', 'fehler')),
  add column recherche_am timestamptz,
  add column ansprechperson jsonb;
-- Alles Neue wartet auf die Recherche (auch von Hand Erfasstes und Treffer aus Ausschreibungen).
alter table public.grossprojekte alter column recherche_stand set default 'wartet';
comment on column public.grossprojekte.recherche is
  'Vorschlag der KI: eigentuemer, ansprechpersonen, naechste_schritte, quellen, zusammenfassung (nie ungeprüft übernommen)';
comment on column public.grossprojekte.ansprechperson is
  'Übernommene Ansprechperson {name, funktion, telefon, email, quelle}';

-- Vorrat der Dachsuche: gefunden und bewertet, aber noch nicht in der Liste.
create table intern.gp_suchvorrat (
  egid            text primary key,
  daten           jsonb not null,
  meldung         text,
  punkte          int not null,
  lage_e          numeric,
  lage_n          numeric,
  gefunden_am     timestamptz not null default now(),
  freigegeben_am  timestamptz,
  grossprojekt_id uuid
);
create index gp_suchvorrat_offen on intern.gp_suchvorrat (punkte desc, gefunden_am) where freigegeben_am is null;

/**
 * Für den Zeitplan: Treffer der Dachsuche in den Vorrat legen. Nichts doppelt (gleiches Gebäude oder gleicher Ort,
 * in der Liste, im Papierkorb oder schon im Vorrat), nur mit genug Punkten. Gibt true zurück, wenn neu im Vorrat.
 */
create or replace function public.grossprojekt_in_vorrat(p jsonb, p_meldung text default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  g public.grossprojekte;
  v_ab int := coalesce((intern.gp_cfg() #>> '{suche,ab_punkte}')::int, (intern.gp_cfg() ->> 'melden_ab')::int, 50);
  v_e numeric := nullif(p ->> 'lage_e', '')::numeric;
  v_n numeric := nullif(p ->> 'lage_n', '')::numeric;
begin
  if nullif(p ->> 'egid', '') is null then return false; end if;
  if exists (select 1 from public.grossprojekte x where x.egid = p ->> 'egid'
                or (x.quelle = 'suche' and x.quell_id = 'egid:' || (p ->> 'egid'))
                or (v_e is not null and abs(x.lage_e - v_e) < 30 and abs(x.lage_n - v_n) < 30))
     or exists (select 1 from intern.gp_suchvorrat v where v.egid = p ->> 'egid'
                or (v_e is not null and abs(v.lage_e - v_e) < 30 and abs(v.lage_n - v_n) < 30)) then
    return false;
  end if;
  g := jsonb_populate_record(null::public.grossprojekte, p - 'id' - 'nummer' - 'stand' - 'punkte');
  g.bauherr_art := coalesce(g.bauherr_art, 'unbekannt');
  g := intern.gp_vorbereitet(g, true);
  if g.ausschluss is not null or g.punkte < v_ab then return false; end if;
  insert into intern.gp_suchvorrat (egid, daten, meldung, punkte, lage_e, lage_n)
  values (p ->> 'egid', p, p_meldung, g.punkte, v_e, v_n);
  return true;
end
$$;

/**
 * Für den Zeitplan: so viele Treffer aus dem Vorrat in die Liste geben, wie diese Woche noch Platz haben
 * («pro_woche», Montag bis Sonntag, Schweizer Zeit). Die mit den meisten Punkten zuerst; gezählt werden alle neuen
 * Grossprojekte der Woche ausser den von Hand erfassten. Gibt die Zahl der freigegebenen zurück.
 */
create or replace function public.grossprojekt_vorrat_freigeben() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_woche timestamptz := date_trunc('week', now() at time zone 'Europe/Zurich') at time zone 'Europe/Zurich';
  v_platz int;
  v_id uuid;
  v_n int := 0;
  v record;
begin
  v_platz := coalesce((intern.gp_cfg() #>> '{suche,pro_woche}')::int, 10)
           - (select count(*) from public.grossprojekte where erstellt_am >= v_woche and quelle <> 'hand');
  for v in select * from intern.gp_suchvorrat where freigegeben_am is null
            order by punkte desc, gefunden_am limit greatest(v_platz, 0) * 3 loop
    exit when v_n >= v_platz;
    -- Neu bewerten (Annahmen können sich geändert haben); fällt einer heraus, ist er trotzdem erledigt.
    v_id := public.grossprojekt_aus_suche(v.daten, v.meldung);
    update intern.gp_suchvorrat set freigegeben_am = now(), grossprojekt_id = v_id where egid = v.egid;
    if v_id is not null then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end
$$;

/** Für den Zeitplan: nächste Grossprojekte, die auf die Recherche warten (offene zuerst, beste zuerst). */
create or replace function public.grossprojekt_recherche_offen(p_limit int default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[];
begin
  -- Hängengebliebene (Abbruch des Zeitplans) nach einer Stunde wieder freigeben.
  update public.grossprojekte set recherche_stand = 'wartet'
   where recherche_stand = 'laeuft' and coalesce(recherche_am, erstellt_am) < now() - interval '1 hour';
  select coalesce(array_agg(id), '{}') into v_ids from (
    select id from public.grossprojekte
     where recherche_stand = 'wartet' and geloescht_am is null and stand in ('pruefen', 'beobachten')
     order by punkte desc, erstellt_am limit greatest(p_limit, 0)) x;
  update public.grossprojekte set recherche_stand = 'laeuft', recherche_am = now() where id = any (v_ids);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id, 'titel', g.titel, 'sprache', g.sprache, 'strasse', g.strasse, 'plz', g.plz,
      'gemeinde', g.gemeinde, 'kanton', g.kanton, 'parzelle', g.parzelle, 'egid', g.egid, 'nutzung', g.nutzung,
      'bauherr', g.bauherr, 'bauherr_art', g.bauherr_art, 'beschreibung', g.beschreibung, 'quelle', g.quelle,
      'quell_url', g.quell_url, 'dachflaeche_m2', g.dachflaeche_m2, 'heizung', g.heizung,
      'heizung_jahr', g.heizung_jahr, 'baujahr', g.baujahr, 'wohnungen', g.wohnungen, 'art', g.art,
      'schaetzung', g.schaetzung, 'standort', s.name))
      from public.grossprojekte g left join public.standorte s on s.id = g.standort_id
     where g.id = any (v_ids)), '[]');
end
$$;

/** Für den Zeitplan: Ergebnis der Recherche ablegen (oder den Fehler); im Verlauf vermerkt. */
create or replace function public.grossprojekt_recherche_speichern(p_id uuid, p_ergebnis jsonb, p_fehler text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.grossprojekte
     set recherche = case when p_fehler is null then p_ergebnis else recherche end,
         recherche_stand = case when p_fehler is null then 'fertig' else 'fehler' end,
         recherche_am = now()
   where id = p_id;
  perform intern.gp_vermerk(p_id,
    case when p_fehler is null then 'Recherche: Eigentümer und Ansprechperson vorgeschlagen'
         else 'Recherche nicht möglich (' || left(p_fehler, 80) || ')' end);
end
$$;

/** Recherche (neu) anstossen, z. B. nach einer Korrektur der Adresse. Der Zeitplan macht sie innert einer Stunde. */
create or replace function public.grossprojekt_recherche_anfordern(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  update public.grossprojekte set recherche_stand = 'wartet' where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'grossprojekt.weg'; end if;
end
$$;

/**
 * Vorschlag der Recherche übernehmen, was ein Mensch angeklickt hat: Eigentümer (Bauherrschaft und Art) und/oder
 * Ansprechperson. Die Punkte rechnet der Trigger neu (Bauherrschaft zählt).
 */
create or replace function public.grossprojekt_recherche_uebernehmen(p_id uuid, p_bauherr text, p_bauherr_art text,
  p_ansprechperson jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  update public.grossprojekte g set
    bauherr = coalesce(nullif(trim(p_bauherr), ''), g.bauherr),
    bauherr_art = coalesce(nullif(p_bauherr_art, ''), g.bauherr_art),
    ansprechperson = coalesce(p_ansprechperson, g.ansprechperson)
   where g.id = p_id and g.geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'grossprojekt.weg'; end if;
  perform intern.gp_vermerk(p_id, 'Recherche übernommen: ' || concat_ws(', ', nullif(trim(p_bauherr), ''),
    p_ansprechperson ->> 'name'));
end
$$;

/** Vorgeschlagene nächste Schritte als Aufgaben anlegen (für mich, bezogen auf das Grossprojekt). */
create or replace function public.grossprojekt_schritte_als_aufgaben(p_id uuid, p_schritte jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_ich uuid := intern.meine_person_id();
  v_n int := 0;
  s jsonb;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  if not exists (select 1 from public.grossprojekte where id = p_id and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'grossprojekt.weg';
  end if;
  for s in select * from jsonb_array_elements(coalesce(p_schritte, '[]')) loop
    continue when nullif(trim(s ->> 'titel'), '') is null;
    insert into public.aufgaben (titel, text, faellig_am, person_id, bezug_tabelle, bezug_id)
    values (left(trim(s ->> 'titel'), 200), nullif(trim(s ->> 'text'), ''),
            current_date + coalesce(nullif(s ->> 'in_tagen', '')::int, 7), v_ich, 'grossprojekte', p_id);
    v_n := v_n + 1;
  end loop;
  perform intern.gp_vermerk(p_id, v_n || ' Schritte als Aufgaben angelegt');
  return v_n;
end
$$;

/** Stand der Suche für die App, jetzt mit Vorrat und Platz in dieser Woche. */
create or replace function public.grossprojekt_suche_stand() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'aktiv', coalesce((intern.gp_cfg() #>> '{suche,aktiv}')::boolean, false),
    'gebiete', (select count(*) from intern.gp_kacheln()),
    'durchsucht', (select count(*) from intern.gp_kacheln() k join intern.gp_suchkacheln s using (kachel)),
    'gebaeude', (select coalesce(sum(gebaeude), 0) from intern.gp_suchkacheln),
    'treffer', (select count(*) from public.grossprojekte where quelle = 'suche' and geloescht_am is null),
    'vorrat', (select count(*) from intern.gp_suchvorrat where freigegeben_am is null),
    'pro_woche', coalesce((intern.gp_cfg() #>> '{suche,pro_woche}')::int, 10),
    'diese_woche', (select count(*) from public.grossprojekte
                     where quelle <> 'hand'
                       and erstellt_am >= date_trunc('week', now() at time zone 'Europe/Zurich') at time zone 'Europe/Zurich'),
    'zuletzt', (select max(geprueft_am) from intern.gp_suchkacheln))
$$;

revoke execute on function public.grossprojekt_in_vorrat(jsonb, text) from public, anon, authenticated;
revoke execute on function public.grossprojekt_vorrat_freigeben() from public, anon, authenticated;
revoke execute on function public.grossprojekt_recherche_offen(int) from public, anon, authenticated;
revoke execute on function public.grossprojekt_recherche_speichern(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.grossprojekt_in_vorrat(jsonb, text) to service_role;
grant execute on function public.grossprojekt_vorrat_freigeben() to service_role;
grant execute on function public.grossprojekt_recherche_offen(int) to service_role;
grant execute on function public.grossprojekt_recherche_speichern(uuid, jsonb, text) to service_role;
revoke execute on function public.grossprojekt_recherche_anfordern(uuid) from public, anon;
revoke execute on function public.grossprojekt_recherche_uebernehmen(uuid, text, text, jsonb) from public, anon;
revoke execute on function public.grossprojekt_schritte_als_aufgaben(uuid, jsonb) from public, anon;
grant execute on function public.grossprojekt_recherche_anfordern(uuid) to authenticated;
grant execute on function public.grossprojekt_recherche_uebernehmen(uuid, text, text, jsonb) to authenticated;
grant execute on function public.grossprojekt_schritte_als_aufgaben(uuid, jsonb) to authenticated;

-- Offene Grossprojekte von vorher bekommen die Recherche auch.
update public.grossprojekte set recherche_stand = 'wartet'
 where recherche_stand is null and geloescht_am is null and stand in ('pruefen', 'beobachten');

/** Für den Zeitplan: Recherche zurück in die Warteschlange (KI-Limit erreicht oder ausgeschaltet). */
create or replace function public.grossprojekt_recherche_zurueck(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.grossprojekte set recherche_stand = 'wartet' where id = p_id and recherche_stand = 'laeuft'
$$;
revoke execute on function public.grossprojekt_recherche_zurueck(uuid) from public, anon, authenticated;
grant execute on function public.grossprojekt_recherche_zurueck(uuid) to service_role;
