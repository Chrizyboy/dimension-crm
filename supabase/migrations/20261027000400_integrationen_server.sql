-- Phase 8, Teil 4: Funktionen nur für die Edge Functions (Service-Schlüssel). Das Schema «intern» ist nie
-- über die Schnittstelle erreichbar; die Server-Funktionen lesen und schreiben es nur über diese RPCs.

/** Anmeldung bei Microsoft beginnen: Zustand (state) und PKCE-Prüfwert für 10 Minuten merken. */
create or replace function public.ms_zustand_anlegen(p_zustand text, p_person uuid, p_pruefwert text, p_sprache text)
returns void
language sql security definer set search_path = '' as $$
  delete from intern.oauth_zustaende where erstellt_am < now() - interval '10 minutes';
  insert into intern.oauth_zustaende (zustand, person_id, pruefwert, sprache) values (p_zustand, p_person, p_pruefwert, p_sprache);
$$;

/** Rückruf von Microsoft: Zustand einlösen (nur einmal, nur 10 Minuten gültig). */
create or replace function public.ms_zustand_einloesen(p_zustand text)
returns table (person_id uuid, pruefwert text, sprache text, email text)
language sql security definer set search_path = '' as $$
  with weg as (
    delete from intern.oauth_zustaende z where z.zustand = p_zustand and z.erstellt_am > now() - interval '10 minutes'
    returning z.person_id, z.pruefwert, z.sprache)
  select weg.person_id, weg.pruefwert, weg.sprache, p.email
    from weg join public.personen p on p.id = weg.person_id
$$;

/** Verbindung speichern (Token bereits verschlüsselt) oder trennen (p_token = null). */
create or replace function public.ms_verbindung_speichern(p_person uuid, p_konto text, p_token text, p_bereiche text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null then
    update intern.microsoft_verbindungen set token = null, getrennt_am = now() where person_id = p_person;
    return;
  end if;
  insert into intern.microsoft_verbindungen (person_id, konto, token, bereiche, verbunden_am, getrennt_am, fehler)
  values (p_person, p_konto, p_token, p_bereiche, now(), null, null)
  on conflict (person_id) do update
    set konto = excluded.konto, token = excluded.token, bereiche = excluded.bereiche,
        verbunden_am = now(), getrennt_am = null, fehler = null;
end
$$;

/** Verschlüsseltes Token einer Person (für den Server). */
create or replace function public.ms_verbindung_lesen(p_person uuid)
returns table (konto text, token text)
language sql security definer set search_path = '' as $$
  select v.konto, v.token from intern.microsoft_verbindungen v where v.person_id = p_person and v.token is not null
$$;

/** Nach einer Nutzung: neues (rotiertes) Token speichern oder Fehler vermerken. */
create or replace function public.ms_verbindung_genutzt(p_person uuid, p_token text, p_fehler text)
returns void
language sql security definer set search_path = '' as $$
  update intern.microsoft_verbindungen
     set token = coalesce(p_token, token), genutzt_am = case when p_fehler is null then now() else genutzt_am end,
         fehler = p_fehler
   where person_id = p_person;
$$;

/** Alle verbundenen Personen (für Hintergrund-Jobs wie den Kalender-Abgleich). */
create or replace function public.ms_verbundene()
returns table (person_id uuid, konto text, email text)
language sql security definer set search_path = '' as $$
  select v.person_id, v.konto, p.email
    from intern.microsoft_verbindungen v join public.personen p on p.id = v.person_id
   where v.token is not null and v.fehler is null and p.aktiv and p.geloescht_am is null
$$;

/** Ist ein Hintergrund-Job fällig? Markiert ihn gleich als gestartet, damit er nicht doppelt läuft. */
create or replace function public.zeitplan_faellig(p_job text, p_minuten int)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_ok boolean;
begin
  insert into intern.zeitplan_laeufe (job, zuletzt_am) values (p_job, now())
  on conflict (job) do update set zuletzt_am = now()
   where intern.zeitplan_laeufe.zuletzt_am is null
      or intern.zeitplan_laeufe.zuletzt_am < now() - make_interval(mins => p_minuten)
  returning true into v_ok;
  return coalesce(v_ok, false);
end
$$;

/** Ergebnis eines Hintergrund-Jobs festhalten (für die Seite «Verbindungen»). */
create or replace function public.zeitplan_ergebnis(p_job text, p_ok boolean, p_meldung text)
returns void
language sql security definer set search_path = '' as $$
  update intern.zeitplan_laeufe set ok = p_ok, meldung = left(p_meldung, 300) where job = p_job;
$$;

/** Letzte Läufe der Hintergrund-Jobs (für Admins). */
create or replace function public.zeitplan_laeufe()
returns table (job text, zuletzt_am timestamptz, ok boolean, meldung text)
language sql stable security definer set search_path = '' as $$
  select job, zuletzt_am, ok, meldung from intern.zeitplan_laeufe where intern.hat_recht('admin') order by job
$$;

/** Ergebnis eines Verbindungstests speichern. */
create or replace function public.integration_geprueft(p_dienst text, p_ok boolean, p_meldung text)
returns void
language sql security definer set search_path = '' as $$
  update public.integrationen set zuletzt_geprueft_am = now(), zuletzt_ok = p_ok, meldung = left(p_meldung, 300)
   where dienst = p_dienst;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'ms_zustand_anlegen(text, uuid, text, text)', 'ms_zustand_einloesen(text)',
    'ms_verbindung_speichern(uuid, text, text, text)', 'ms_verbindung_lesen(uuid)',
    'ms_verbindung_genutzt(uuid, text, text)', 'ms_verbundene()', 'zeitplan_faellig(text, int)',
    'zeitplan_ergebnis(text, boolean, text)', 'integration_geprueft(text, boolean, text)']
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end
$$;
revoke execute on function public.zeitplan_laeufe() from public, anon;
grant execute on function public.zeitplan_laeufe() to authenticated;
