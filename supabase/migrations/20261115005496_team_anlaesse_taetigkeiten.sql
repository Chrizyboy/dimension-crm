-- Team & Ausweise, Fragen 5 und 6 (Entscheid 0041, Empfehlung A):
-- 1. Pflicht-Ausweise je Tätigkeit: Einsätze tragen Tätigkeiten (Hebebühne, Anhänger, Dach vor 1990 …); die
--    Einsatzplanung warnt, wenn im Team ein gültiger Ausweis fehlt (gerechnet in der App wie der Abwesenheits-
--    Konflikt, src/modules/projects/lib/ausweise.ts). Warnung, keine Sperre.
-- 2. Geburtstage und Dienstjubiläen auf «Mein Tag»: nur Tag und Monat (nie der Jahrgang), jede Person kann sich
--    selbst ausblenden.

-- ---------- Einstellungen ----------

-- Vorlauf in Tagen für die Karte auf «Mein Tag»; bestehende Werte bleiben.
update public.einstellungen
   set wert = jsonb_build_object('anlaesse', '{"vorlauf_tage": 7, "geburtstage": true, "jubilaeen": true}'::jsonb) || wert
 where schluessel = 'team';

-- ---------- Tätigkeiten ----------

-- «ausweise»: welche Ausweis-Arten (Liste «qualifikation») die Tätigkeit braucht. «wer»: «alle» = jede Person im
-- Einsatz, «einer» = mindestens eine Person. «immer»: gilt für jeden Einsatz, ohne Häkchen (z. B. Ersthelfer).
insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, eigenschaften) values
  ('taetigkeit', 'ersthelfer', 'Ersthelfer auf der Baustelle', 'Secouriste sur le chantier', 10,
   '{"ausweise": ["erste_hilfe"], "wer": "einer", "immer": true}'),
  ('taetigkeit', 'hebebuehne', 'Arbeit mit Hebebühne', 'Travail avec nacelle', 20,
   '{"ausweise": ["hebebuehne"], "wer": "alle"}'),
  ('taetigkeit', 'anhaenger', 'Fahrt mit Anhänger', 'Trajet avec remorque', 30,
   '{"ausweise": ["fuehrerausweis_be"], "wer": "einer"}'),
  ('taetigkeit', 'dach_alt', 'Dach vor 1990 (Asbest möglich)', 'Toit avant 1990 (amiante possible)', 40,
   '{"ausweise": ["asbest"], "wer": "einer"}')
on conflict do nothing;

alter table public.einsaetze add column taetigkeiten text[] not null default '{}';
comment on column public.einsaetze.taetigkeiten is
  'Schlüssel der Liste «taetigkeit»; daraus folgen die Pflicht-Ausweise (Warnung in der Einsatzplanung).';

-- ---------- Zeitplan speichern mit Tätigkeiten ----------

/** Tätigkeiten aus dem Zeitplan-Dialog: nur bekannte Schlüssel, sortiert, ohne Doppelte. */
create or replace function intern.taetigkeiten_aus(p jsonb) returns text[]
language plpgsql stable set search_path = '' as $$
declare
  unbekannt text;
begin
  select x into unbekannt from jsonb_array_elements_text(coalesce(p, '[]')) x
   where not exists (select 1 from public.auswahlwerte t where t.liste = 'taetigkeit' and t.schluessel = x) limit 1;
  if unbekannt is not null then raise exception using errcode = 'P0001', message = 'team.taetigkeit_unbekannt'; end if;
  return (select coalesce(array_agg(distinct x order by x), '{}') from jsonb_array_elements_text(coalesce(p, '[]')) x);
end
$$;

/**
 * Wie bisher (20261029000200), dazu «taetigkeiten» je Einsatz. Fehlt der Schlüssel, bleiben die Tätigkeiten
 * eines bestehenden Einsatzes unverändert (ältere App-Stände).
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
             subunternehmer_id = nullif(e ->> 'subunternehmer_id', '')::uuid, notiz = nullif(trim(e ->> 'notiz'), ''),
             taetigkeiten = case when e ? 'taetigkeiten' then intern.taetigkeiten_aus(e -> 'taetigkeiten') else taetigkeiten end
       where id = v_id and projekt_id = p_id;
    else
      insert into public.einsaetze (projekt_id, art, von, bis, personen, subunternehmer_id, notiz, taetigkeiten)
      values (p_id, coalesce(e ->> 'art', 'intern'), v_von, v_bis,
              coalesce(array(select jsonb_array_elements_text(e -> 'personen'))::uuid[], '{}'),
              nullif(e ->> 'subunternehmer_id', '')::uuid, nullif(trim(e ->> 'notiz'), ''),
              intern.taetigkeiten_aus(e -> 'taetigkeiten'))
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
 * Pflicht-Ausweise einer Tätigkeit ändern oder eine neue Tätigkeit anlegen (Recht «personal» oder Administration).
 */
create or replace function public.taetigkeit_anforderung_speichern(p_schluessel text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ausweise jsonb := coalesce((select jsonb_agg(distinct x) from jsonb_array_elements_text(p -> 'ausweise') x), '[]');
  wer text := coalesce(nullif(p ->> 'wer', ''), 'alle');
  immer boolean := coalesce((p ->> 'immer')::boolean, false);
begin
  if not (intern.hat_recht('personal') or intern.hat_recht('admin')) then
    raise exception using errcode = '42501', message = 'team.kein_recht';
  end if;
  if wer not in ('alle', 'einer') then raise exception using errcode = 'P0001', message = 'team.wer_ungueltig'; end if;
  if exists (select 1 from jsonb_array_elements_text(ausweise) a
              where not exists (select 1 from public.auswahlwerte q where q.liste = 'qualifikation' and q.schluessel = a)) then
    raise exception using errcode = 'P0001', message = 'team.ausweis_unbekannt';
  end if;
  update public.auswahlwerte
     set eigenschaften = eigenschaften || jsonb_build_object('ausweise', ausweise, 'wer', wer, 'immer', immer)
   where liste = 'taetigkeit' and schluessel = p_schluessel;
  if not found then
    if nullif(trim(p ->> 'text_de'), '') is null or nullif(trim(p ->> 'text_fr'), '') is null then
      raise exception using errcode = 'P0001', message = 'team.text_fehlt';
    end if;
    insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, eigenschaften)
    values ('taetigkeit', p_schluessel, trim(p ->> 'text_de'), trim(p ->> 'text_fr'),
            coalesce((select max(reihenfolge) + 10 from public.auswahlwerte where liste = 'taetigkeit'), 10),
            jsonb_build_object('ausweise', ausweise, 'wer', wer, 'immer', immer));
  end if;
end
$$;
revoke execute on function public.taetigkeit_anforderung_speichern(text, jsonb) from public, anon;
grant execute on function public.taetigkeit_anforderung_speichern(text, jsonb) to authenticated;

-- ---------- Geburtstage und Dienstjubiläen ----------

/** Tag und Monat von «d» im Jahr «j». */
create or replace function intern.jahrestag_in(d date, j int) returns date
language sql immutable set search_path = '' as $$
  select case when extract(month from d) = 2 and extract(day from d) = 29
                   and not (j % 4 = 0 and (j % 100 <> 0 or j % 400 = 0))
              then make_date(j, 2, 28)
              else make_date(j, extract(month from d)::int, extract(day from d)::int) end;
$$;

/** Nächstes Datum mit Tag und Monat von «d» ab «tag»; 29. Februar fällt in anderen Jahren auf den 28. */
create or replace function intern.naechster_jahrestag(d date, tag date) returns date
language sql immutable set search_path = '' as $$
  select case when x >= tag then x else intern.jahrestag_in(d, extract(year from tag)::int + 1) end
    from (select intern.jahrestag_in(d, extract(year from tag)::int) as x) s;
$$;

/**
 * Geburtstage und Dienstjubiläen der nächsten Tage (Einstellung team.anlaesse.vorlauf_tage) für «Mein Tag».
 * Liefert nie das Geburtsjahr; beim Jubiläum die vollen Jahre. Wer sich ausgeblendet hat
 * (personen.profil.anlaesse_verbergen), erscheint nicht.
 */
create or replace function public.team_anlaesse(p_tag date default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tag date := coalesce(p_tag, (now() at time zone 'Europe/Zurich')::date);
  ich uuid := intern.meine_person_id();
  cfg jsonb := coalesce((select wert -> 'anlaesse' from public.einstellungen where schluessel = 'team'), '{}');
  bis date := tag + coalesce((cfg ->> 'vorlauf_tage')::int, 7);
begin
  if ich is null then raise exception using errcode = '42501', message = 'team.kein_recht'; end if;
  return jsonb_build_object(
    'ich_verborgen', coalesce((select (p.profil ->> 'anlaesse_verbergen')::boolean from public.personen p where p.id = ich), false),
    'anlaesse', coalesce((
      select jsonb_agg(x order by x ->> 'datum', x ->> 'name')
        from (
          select jsonb_build_object('person_id', p.id, 'name', p.name, 'kurzzeichen', p.kurzzeichen, 'art', 'geburtstag',
                                    'datum', intern.naechster_jahrestag(a.geburtsdatum, tag)) as x
            from public.personen p join public.personal_akten a on a.person_id = p.id and a.geloescht_am is null
           where coalesce((cfg ->> 'geburtstage')::boolean, true) and a.geburtsdatum is not null
             and intern.naechster_jahrestag(a.geburtsdatum, tag) <= bis
             and p.aktiv and p.geloescht_am is null and not coalesce((p.profil ->> 'anlaesse_verbergen')::boolean, false)
          union all
          select jsonb_build_object('person_id', p.id, 'name', p.name, 'kurzzeichen', p.kurzzeichen, 'art', 'jubilaeum',
                                    'datum', j.datum,
                                    'jahre', extract(year from j.datum)::int - extract(year from a.eintritt)::int)
            from public.personen p join public.personal_akten a on a.person_id = p.id and a.geloescht_am is null
           cross join lateral (select intern.naechster_jahrestag(a.eintritt, tag) as datum) j
           where coalesce((cfg ->> 'jubilaeen')::boolean, true) and a.eintritt is not null
             and j.datum <= bis and extract(year from j.datum) > extract(year from a.eintritt)
             and (a.austritt is null or a.austritt >= j.datum)
             and p.aktiv and p.geloescht_am is null and not coalesce((p.profil ->> 'anlaesse_verbergen')::boolean, false)
        ) s), '[]'));
end
$$;
revoke execute on function public.team_anlaesse(date) from public, anon;
grant execute on function public.team_anlaesse(date) to authenticated;

/** Eigenen Geburtstag und eigenes Jubiläum auf «Mein Tag» zeigen oder ausblenden (nur für sich selbst). */
create or replace function public.team_anlass_zeigen(p_zeigen boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
begin
  if ich is null then raise exception using errcode = '42501', message = 'team.kein_recht'; end if;
  update public.personen set profil = profil || jsonb_build_object('anlaesse_verbergen', not coalesce(p_zeigen, true))
   where id = ich;
end
$$;
revoke execute on function public.team_anlass_zeigen(boolean) from public, anon;
grant execute on function public.team_anlass_zeigen(boolean) to authenticated;
