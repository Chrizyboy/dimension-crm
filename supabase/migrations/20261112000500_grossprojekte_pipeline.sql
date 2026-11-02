-- Grossprojekte vom Fund bis zum Vertrag (Neuentwurf 2.11.2026, Entscheid 0029, Nachtrag «Pipeline»).
-- Bisher endete das Modul beim Bewilligen und gab einen normalen Lead weiter. Contracting mit Youdera dauert aber
-- Monate und braucht eigene Schritte: Eigentümer klären, Erstkontakt, Besichtigung, Daten (Lastgang, Statik, Netz),
-- Angebot von Youdera, Vertrag. Darum bleibt ein bewilligtes Grossprojekt hier, bis der Vertrag unterschrieben ist;
-- der Lead bleibt verknüpft. Stufen, Wahrscheinlichkeiten, Unterlagen und Ziel sind Daten (Regel 8).

alter table public.grossprojekte
  add column stufe text check (stufe in ('qualifizieren', 'erstkontakt', 'besichtigung', 'daten', 'angebot', 'vertrag', 'verloren')),
  add column stufe_seit timestamptz,
  add column naechster_schritt text,
  add column naechster_schritt_am date,
  -- Wer beim Kunden entscheidet: [{name, funktion, rolle (entscheider|technik|einfluss|andere), telefon, email}]
  add column kontakte jsonb not null default '[]' check (jsonb_typeof(kontakte) = 'array'),
  -- Unterlagen für Youdera: {schluessel: 'JJJJ-MM-TT'} = vorhanden seit
  add column unterlagen jsonb not null default '{}' check (jsonb_typeof(unterlagen) = 'object'),
  -- Eigene Werte für den Rechner (überschreiben Schätzung und Annahmen): kwp, kwh_pro_kwp, verbrauch_kwh,
  -- eigenverbrauch_prozent, strompreis_rp, preis_rp, chf_pro_kwp
  add column rechnung jsonb not null default '{}' check (jsonb_typeof(rechnung) = 'object'),
  -- Stand bei Youdera: dossier_am, angebot_am, preis_rp, laufzeit_jahre, notiz
  add column youdera jsonb not null default '{}' check (jsonb_typeof(youdera) = 'object'),
  add column vertrag_am date,
  add column vertrag_kwp numeric check (vertrag_kwp >= 0);
create index grossprojekte_pipeline_idx on public.grossprojekte (stufe, naechster_schritt_am) where geloescht_am is null and stand = 'bewilligt';

comment on column public.grossprojekte.stufe is
  'Contracting-Stufe nach dem Bewilligen (nur über grossprojekt_stufe_setzen): qualifizieren … vertrag, verloren.';

-- Bestehende bewilligte Grossprojekte beginnen bei «Qualifizieren».
update public.grossprojekte set stufe = 'qualifizieren', stufe_seit = coalesce(entschieden_am, now())
 where stand = 'bewilligt' and stufe is null;

-- Einstellung: Stufen mit Wahrscheinlichkeit, Unterlagen für Youdera, Ziel. Bestehende Werte bleiben.
update public.einstellungen set wert = jsonb_build_object('pipeline', jsonb_build_object(
    'stufen', '[{"id": "qualifizieren", "prozent": 10}, {"id": "erstkontakt", "prozent": 20},
                {"id": "besichtigung", "prozent": 35}, {"id": "daten", "prozent": 50},
                {"id": "angebot", "prozent": 65}, {"id": "vertrag", "prozent": 100}]'::jsonb,
    'unterlagen', '[{"id": "grundbuch", "de": "Grundbuchauszug", "fr": "Extrait du registre foncier"},
                    {"id": "fotos_dach", "de": "Fotos Dach", "fr": "Photos du toit"},
                    {"id": "stromrechnungen", "de": "Stromrechnungen 12 Monate", "fr": "Factures d''électricité 12 mois"},
                    {"id": "lastgang", "de": "Lastgang 15 Min. (12 Monate)", "fr": "Courbe de charge 15 min (12 mois)"},
                    {"id": "plaene_statik", "de": "Dachpläne und Statik", "fr": "Plans du toit et statique"},
                    {"id": "hauptverteilung", "de": "Fotos Hauptverteilung", "fr": "Photos du tableau principal"},
                    {"id": "einverstaendnis", "de": "Einverständnis Kunde Datenweitergabe", "fr": "Accord du client pour transmettre les données"}]'::jsonb,
    'ziel', '{"jahr": 2027, "kwp": 2000}'::jsonb)) || wert
 where schluessel = 'grossprojekte';

/**
 * Stufe und Vertrag ändern nur die Abläufe (grossprojekt_stufe_setzen). Beim Bewilligen beginnt die Stufe
 * «Qualifizieren» von selbst, damit grossprojekt_entscheiden unverändert bleibt.
 */
create or replace function intern.grossprojekt_stufe() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.stand = 'bewilligt' and old.stand is distinct from 'bewilligt' and new.stufe is null then
    new.stufe := 'qualifizieren';
    new.stufe_seit := now();
    return new;
  end if;
  if auth.uid() is not null and coalesce(current_setting('gp.ablauf', true), '') <> 'ja'
     and (new.stufe, new.stufe_seit, new.vertrag_am, new.vertrag_kwp)
         is distinct from
         (case when tg_op = 'INSERT' then null else old.stufe end,
          case when tg_op = 'INSERT' then null else old.stufe_seit end,
          case when tg_op = 'INSERT' then null else old.vertrag_am end,
          case when tg_op = 'INSERT' then null else old.vertrag_kwp end) then
    raise exception using errcode = '42501', message = 'grossprojekt.nur_ablauf';
  end if;
  return new;
end
$$;
create trigger stufe before insert or update on public.grossprojekte
  for each row execute function intern.grossprojekt_stufe();

/**
 * Stufe setzen. Nur bewilligte Grossprojekte; «verloren» nur mit Grund; «vertrag» merkt Datum und Leistung
 * (aus p_angaben, sonst aus dem Rechner oder der Schätzung). Zurück aus «verloren» geht in jede Stufe.
 */
create or replace function public.grossprojekt_stufe_setzen(p_id uuid, p_stufe text, p_angaben jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare
  g public.grossprojekte;
  v_grund text := nullif(trim(p_angaben ->> 'grund'), '');
  v_kwp numeric;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  select * into g from public.grossprojekte where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'grossprojekt.weg'; end if;
  if g.stand <> 'bewilligt' then raise exception using errcode = 'P0001', message = 'grossprojekt.nicht_bewilligt'; end if;
  if p_stufe is null or p_stufe not in ('qualifizieren', 'erstkontakt', 'besichtigung', 'daten', 'angebot', 'vertrag', 'verloren') then
    raise exception using errcode = 'P0001', message = 'grossprojekt.stufe_unbekannt';
  end if;
  if p_stufe = g.stufe then return; end if;
  if p_stufe = 'verloren' and v_grund is null then raise exception using errcode = 'P0001', message = 'grossprojekt.grund_fehlt'; end if;
  v_kwp := coalesce(nullif(p_angaben ->> 'kwp', '')::numeric, nullif(g.rechnung ->> 'kwp', '')::numeric,
                    nullif(g.schaetzung ->> 'kwp', '')::numeric);
  perform set_config('gp.ablauf', 'ja', true);
  update public.grossprojekte set
    stufe = p_stufe,
    stufe_seit = now(),
    grund = case when p_stufe = 'verloren' then v_grund else null end,
    vertrag_am = case when p_stufe = 'vertrag' then coalesce(nullif(p_angaben ->> 'datum', '')::date, current_date) else null end,
    vertrag_kwp = case when p_stufe = 'vertrag' then v_kwp else null end
  where id = g.id;
  perform set_config('gp.ablauf', '', true);
  perform intern.gp_vermerk(g.id, 'Stufe: ' || p_stufe || coalesce(': ' || v_grund, ''),
    jsonb_build_object('art', 'stufe', 'von', g.stufe, 'nach', p_stufe));
end
$$;
revoke execute on function public.grossprojekt_stufe_setzen(uuid, text, jsonb) from public, anon;
grant execute on function public.grossprojekt_stufe_setzen(uuid, text, jsonb) to authenticated;

/**
 * Akte pflegen: nächster Schritt, wer entscheidet, Unterlagen, Rechner und Stand bei Youdera. Nur mitgeschickte
 * Felder ändern sich. Läuft mit den Rechten der Person (RLS).
 */
create or replace function public.grossprojekt_akte_setzen(p_id uuid, p jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  g public.grossprojekte;
  v_schritt text := nullif(trim(p ->> 'naechster_schritt'), '');
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  select * into g from public.grossprojekte where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'grossprojekt.weg'; end if;
  if p ? 'kontakte' and jsonb_typeof(p -> 'kontakte') <> 'array' then
    raise exception using errcode = 'P0001', message = 'grossprojekt.ungueltig';
  end if;
  if (p ? 'unterlagen' and jsonb_typeof(p -> 'unterlagen') <> 'object') or (p ? 'rechnung' and jsonb_typeof(p -> 'rechnung') <> 'object')
     or (p ? 'youdera' and jsonb_typeof(p -> 'youdera') <> 'object') then
    raise exception using errcode = 'P0001', message = 'grossprojekt.ungueltig';
  end if;
  update public.grossprojekte x set
    naechster_schritt = case when p ? 'naechster_schritt' then v_schritt else x.naechster_schritt end,
    naechster_schritt_am = case when p ? 'naechster_schritt_am' then nullif(p ->> 'naechster_schritt_am', '')::date
                                else x.naechster_schritt_am end,
    kontakte = case when p ? 'kontakte' then p -> 'kontakte' else x.kontakte end,
    unterlagen = case when p ? 'unterlagen' then jsonb_strip_nulls(p -> 'unterlagen') else x.unterlagen end,
    rechnung = case when p ? 'rechnung' then jsonb_strip_nulls(p -> 'rechnung') else x.rechnung end,
    youdera = case when p ? 'youdera' then jsonb_strip_nulls(p -> 'youdera') else x.youdera end
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
end
$$;
revoke execute on function public.grossprojekt_akte_setzen(uuid, jsonb) from public, anon;
grant execute on function public.grossprojekt_akte_setzen(uuid, jsonb) to authenticated;

/** Eintrag im Verlauf von Hand: Notiz, Anruf, Mail oder Termin. */
create or replace function public.grossprojekt_vermerken(p_id uuid, p_art text, p_text text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'grossprojekt.kein_recht'; end if;
  if not exists (select 1 from public.grossprojekte where id = p_id and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'grossprojekt.weg';
  end if;
  if p_art is null or p_art not in ('notiz', 'anruf', 'mail', 'termin') then
    raise exception using errcode = 'P0001', message = 'grossprojekt.ungueltig';
  end if;
  if nullif(trim(p_text), '') is null then raise exception using errcode = 'P0001', message = 'grossprojekt.text_fehlt'; end if;
  perform intern.gp_vermerk(p_id, trim(p_text), jsonb_build_object('art', p_art));
end
$$;
revoke execute on function public.grossprojekt_vermerken(uuid, text, text) from public, anon;
grant execute on function public.grossprojekt_vermerken(uuid, text, text) to authenticated;
