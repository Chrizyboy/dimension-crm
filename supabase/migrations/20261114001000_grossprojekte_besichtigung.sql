-- Grossprojekte Schritt 2 (Chris 03.11.2026, Antworten auf die Fragen zur Pipeline):
-- * Besichtigung vor Ort als Checkliste am Handy (Punkte sind Daten in einstellungen.grossprojekte.pipeline).
-- * Dossier an Youdera über den Ausgangskorb: Adresse von Youdera als Einstellung (leer = beim Senden eintragen).
-- * Potenzialanalyse für den Kunden nennt nur Dimension Solaire (kein Feld nötig, steht im PDF der App).

alter table public.grossprojekte
  add column besichtigung jsonb not null default '{}' check (jsonb_typeof(besichtigung) = 'object');

comment on column public.grossprojekte.besichtigung is
  'Besichtigung vor Ort: {am, von, punkte: {<id>: {stand: ok|problem, notiz}}, notiz}. Punkte aus einstellungen.grossprojekte.pipeline.besichtigung.';

-- Neue Teile der Einstellung «pipeline»; was schon drin steht, bleibt.
update public.einstellungen
   set wert = jsonb_set(wert, '{pipeline}', jsonb_build_object(
     'youdera_mail', '',
     'besichtigung', '[{"id": "dach_zustand", "de": "Dach: Zustand und Alter der Eindeckung", "fr": "Toit : état et âge de la couverture"},
                       {"id": "dach_statik", "de": "Statik: Reserve für Module (Pläne, Tragwerk)", "fr": "Statique : réserve pour les modules (plans, structure)"},
                       {"id": "verschattung", "de": "Verschattung (Bäume, Nachbarbauten, Aufbauten)", "fr": "Ombrage (arbres, bâtiments voisins, superstructures)"},
                       {"id": "zugang", "de": "Zugang Dach und Platz für Kran/Gerüst", "fr": "Accès au toit et place pour grue/échafaudage"},
                       {"id": "absturz", "de": "Absturzsicherung vorhanden oder nötig", "fr": "Protection antichute existante ou nécessaire"},
                       {"id": "hauptverteilung", "de": "Hauptverteilung: Platz und Reserve", "fr": "Tableau principal : place et réserve"},
                       {"id": "zaehler", "de": "Zähler und Netzanschluss (Trafo, Anschlussleistung)", "fr": "Compteur et raccordement réseau (transfo, puissance)"},
                       {"id": "kabelweg", "de": "Kabelweg Dach bis Verteilung", "fr": "Chemin de câbles du toit au tableau"},
                       {"id": "wechselrichter", "de": "Standort Wechselrichter/Speicher", "fr": "Emplacement onduleur/batterie"},
                       {"id": "fotos", "de": "Fotos Dach, Verteilung, Zähler gemacht", "fr": "Photos toit, tableau, compteur prises"}]'::jsonb)
     || coalesce(wert -> 'pipeline', '{}'::jsonb))
 where schluessel = 'grossprojekte';

/**
 * Akte pflegen wie bisher, neu auch die Besichtigung. Ändert nur, was mitkommt; schreibt die wichtigen Schritte in
 * den Verlauf (nächster Schritt, Dossier an Youdera, Angebot, Besichtigung abgeschlossen).
 */
create or replace function public.grossprojekt_akte_setzen(p_id uuid, p jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  g public.grossprojekte;
  v_schritt text := nullif(trim(p ->> 'naechster_schritt'), '');
  v_probleme int;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  select * into g from public.grossprojekte where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'grossprojekt.weg'; end if;
  if p ? 'kontakte' and jsonb_typeof(p -> 'kontakte') <> 'array' then
    raise exception using errcode = 'P0001', message = 'grossprojekt.ungueltig';
  end if;
  if (p ? 'unterlagen' and jsonb_typeof(p -> 'unterlagen') <> 'object') or (p ? 'rechnung' and jsonb_typeof(p -> 'rechnung') <> 'object')
     or (p ? 'youdera' and jsonb_typeof(p -> 'youdera') <> 'object')
     or (p ? 'besichtigung' and jsonb_typeof(p -> 'besichtigung') <> 'object')
     or (p ? 'besichtigung' and p -> 'besichtigung' ? 'punkte' and jsonb_typeof(p -> 'besichtigung' -> 'punkte') <> 'object') then
    raise exception using errcode = 'P0001', message = 'grossprojekt.ungueltig';
  end if;
  update public.grossprojekte x set
    naechster_schritt = case when p ? 'naechster_schritt' then v_schritt else x.naechster_schritt end,
    naechster_schritt_am = case when p ? 'naechster_schritt_am' then nullif(p ->> 'naechster_schritt_am', '')::date
                                else x.naechster_schritt_am end,
    kontakte = case when p ? 'kontakte' then p -> 'kontakte' else x.kontakte end,
    unterlagen = case when p ? 'unterlagen' then jsonb_strip_nulls(p -> 'unterlagen') else x.unterlagen end,
    rechnung = case when p ? 'rechnung' then jsonb_strip_nulls(p -> 'rechnung') else x.rechnung end,
    youdera = case when p ? 'youdera' then jsonb_strip_nulls(p -> 'youdera') else x.youdera end,
    besichtigung = case when p ? 'besichtigung' then jsonb_strip_nulls(p -> 'besichtigung') else x.besichtigung end
  where id = p_id;
  if p ? 'naechster_schritt' and v_schritt is distinct from g.naechster_schritt and v_schritt is not null then
    perform intern.gp_vermerk(p_id, 'Nächster Schritt: ' || v_schritt
      || coalesce(' (bis ' || to_char(nullif(p ->> 'naechster_schritt_am', '')::date, 'DD.MM.YYYY') || ')', ''),
      jsonb_build_object('art', 'schritt'));
  end if;
  if (p -> 'youdera' ->> 'dossier_am') is distinct from (g.youdera ->> 'dossier_am') and nullif(p -> 'youdera' ->> 'dossier_am', '') is not null then
    perform intern.gp_vermerk(p_id, 'Dossier an Youdera', jsonb_build_object('art', 'youdera'));
  end if;
  if (p -> 'youdera' ->> 'angebot_am') is distinct from (g.youdera ->> 'angebot_am') and nullif(p -> 'youdera' ->> 'angebot_am', '') is not null then
    perform intern.gp_vermerk(p_id, 'Angebot von Youdera' || coalesce(': ' || (p -> 'youdera' ->> 'preis_rp') || ' Rp./kWh', ''),
      jsonb_build_object('art', 'youdera'));
  end if;
  -- Abgeschlossen heisst: Datum gesetzt. Probleme nennt der Verlauf, damit man sie ohne Öffnen sieht.
  if (p -> 'besichtigung' ->> 'am') is distinct from (g.besichtigung ->> 'am') and nullif(p -> 'besichtigung' ->> 'am', '') is not null then
    select count(*) into v_probleme from jsonb_each(coalesce(p -> 'besichtigung' -> 'punkte', '{}')) e
     where e.value ->> 'stand' = 'problem';
    perform intern.gp_vermerk(p_id, 'Besichtigung abgeschlossen'
      || case when v_probleme > 0 then ': ' || v_probleme || ' Punkt(e) mit Problem' else ': alles in Ordnung' end,
      jsonb_build_object('art', 'besichtigung', 'probleme', v_probleme));
  end if;
end
$$;
revoke execute on function public.grossprojekt_akte_setzen(uuid, jsonb) from public, anon;
grant execute on function public.grossprojekt_akte_setzen(uuid, jsonb) to authenticated;
