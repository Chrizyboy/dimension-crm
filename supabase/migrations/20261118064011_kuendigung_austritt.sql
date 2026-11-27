-- Kündigung mit Austrittsdatum (Chris 27.11.2026): «sobald jemand kündet muss man das erfassen können und nach der
-- Kündigungszeit erlischt sein Zugang, die Daten sollen aber im CRM bleiben». Erfassen nur die Administration
-- (Einstellungen › Personen). Optional übernimmt eine Nachfolge die offenen Zuständigkeiten (José → Milaim).
--   * Bis und mit Austrittstag arbeitet die Person normal. Ab dem Tag danach hat sie keine Rechte mehr
--     (intern.wirksame_rechte), auch bevor der Zeitplan gelaufen ist.
--   * Der Zeitplan (stündlich) schaltet die Person dann aus, beendet ihre Anmeldungen und gibt Offenes an die
--     Nachfolge. Nichts wird gelöscht; Erledigtes (Verlauf, abgeschlossene Projekte) bleibt bei der Person.
--   * Das Austrittsdatum ist dasselbe wie in der Personal-Akte (beide Richtungen abgeglichen).

alter table public.personen
  add column austritt_am date,
  add column nachfolge_id uuid references public.personen (id);
comment on column public.personen.austritt_am is
  'Letzter Arbeitstag nach Kündigung. Danach erlischt der Zugang (intern.austritte_vollziehen), Daten bleiben.';
comment on column public.personen.nachfolge_id is 'Übernimmt beim Austritt die offenen Zuständigkeiten.';

/** Heutiges Datum in der Schweiz (der Zeitplan läuft in UTC). */
create or replace function intern.heute_ch() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Zurich')::date
$$;

-- Wie bisher (20261115471827_rollen_zusaetze), neu ohne Rechte nach dem Austrittstag.
create or replace function intern.wirksame_rechte(p_person uuid)
returns text[]
language sql stable security definer set search_path = '' as $$
  with r as (
    select p.rechte || coalesce(ro.rechte, '{}') as roh
      from public.personen p
      left join public.rollen ro on ro.schluessel = p.rolle and ro.aktiv and ro.geloescht_am is null
     where p.id = p_person and p.aktiv and p.geloescht_am is null
       and (p.austritt_am is null or p.austritt_am >= intern.heute_ch())
  )
  select array(select distinct x from r, unnest(
           array['basis'] || r.roh
           || case when 'gl' = any (r.roh) then array['preise', 'finanzen', 'planung', 'personal', 'marge', 'visum']
                   else '{}'::text[] end) x order by 1)
    from r
$$;

/**
 * Gibt die offenen Zuständigkeiten einer Person an eine andere: offene Offerten, laufende Projekte, offene
 * Service-Fälle, Aufgaben, Posteingang, Grossprojekte, Kundenbetreuung, Vorgesetzt, künftige Einsätze und die
 * Regeln in den Einstellungen (Kürzel und IDs). Abgeschlossenes bleibt bei der Person, damit der Verlauf stimmt.
 */
create or replace function intern.zustaendigkeiten_uebertragen(p_von uuid, p_an uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  alt public.personen;
  neu public.personen;
begin
  select * into alt from public.personen where id = p_von;
  select * into neu from public.personen where id = p_an;
  if alt.id is null or neu.id is null or alt.id = neu.id then return; end if;

  update public.offerten set verantwortlich_id = neu.id
   where verantwortlich_id = alt.id and geloescht_am is null and status in ('in_arbeit', 'offeriert');
  update public.projekte set verantwortlich_id = neu.id
   where verantwortlich_id = alt.id and geloescht_am is null and status <> 'abgeschlossen';
  update public.service_faelle set person_id = neu.id
   where person_id = alt.id and geloescht_am is null and status <> 'erledigt';
  update public.aufgaben set person_id = neu.id
   where person_id = alt.id and geloescht_am is null and erledigt_am is null;
  update public.posteingang set zustaendig_id = neu.id
   where zustaendig_id = alt.id and geloescht_am is null and stand in ('neu', 'offen');
  update public.grossprojekte set verantwortlich_id = neu.id
   where verantwortlich_id = alt.id and geloescht_am is null;
  update public.kontakte set betreuer_id = neu.id where betreuer_id = alt.id and geloescht_am is null;
  update public.personal_akten set vorgesetzt_id = neu.id where vorgesetzt_id = alt.id and geloescht_am is null;
  update public.einsaetze set team = array_replace(team, alt.kuerzel, neu.kuerzel)
   where alt.kuerzel = any (team) and geloescht_am is null and bis >= intern.heute_ch();

  -- Regeln (Zuständigkeiten, Stellvertretung, Freigaben …) nennen Personen per Kürzel oder ID, immer in Anführungszeichen.
  update public.einstellungen
     set wert = replace(replace(wert::text, '"' || alt.kuerzel || '"', '"' || neu.kuerzel || '"'),
                        '"' || alt.id::text || '"', '"' || neu.id::text || '"')::jsonb
   where wert::text like '%"' || alt.kuerzel || '"%' or wert::text like '%"' || alt.id::text || '"%';
end
$$;
revoke execute on function intern.zustaendigkeiten_uebertragen(uuid, uuid) from public, anon, authenticated;

/**
 * Vollzieht fällige Austritte: Zuständigkeiten an die Nachfolge, Person ausschalten, Anmeldungen beenden.
 * Läuft stündlich (pg_cron) und darf beliebig oft laufen.
 */
create or replace function intern.austritte_vollziehen() returns int
language plpgsql security definer set search_path = '' as $$
declare
  p public.personen;
  n int := 0;
begin
  for p in select * from public.personen
            where aktiv and geloescht_am is null and austritt_am is not null and austritt_am < intern.heute_ch()
  loop
    if p.nachfolge_id is not null then
      perform intern.zustaendigkeiten_uebertragen(p.id, p.nachfolge_id);
    end if;
    update public.personen set aktiv = false where id = p.id;
    -- Offene Anmeldungen beenden. Fehlt das Recht dazu, schützt trotzdem RLS (keine Rechte mehr).
    if p.auth_user_id is not null then
      begin
        delete from auth.sessions where user_id = p.auth_user_id;
      exception when insufficient_privilege then null;
      end;
    end if;
    n := n + 1;
  end loop;
  return n;
end
$$;
revoke execute on function intern.austritte_vollziehen() from public, anon, authenticated;
select cron.schedule('personen-austritt', '7 * * * *', 'select intern.austritte_vollziehen()');

/**
 * Kündigung erfassen, ändern oder zurücknehmen (p_austritt leer). Nur Administration.
 * Schreibt das Datum auch in die Personal-Akte. Liegt der Austritt schon zurück, gilt er sofort.
 */
create or replace function public.person_austritt_setzen(p_person uuid, p_austritt date, p_nachfolge uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'personen.nur_admin';
  end if;
  if p_nachfolge = p_person then
    raise exception using errcode = '22023', message = 'personen.nachfolge_selbst';
  end if;
  update public.personen
     set austritt_am = p_austritt, nachfolge_id = case when p_austritt is null then null else p_nachfolge end
   where id = p_person and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'personen.unbekannt'; end if;

  -- Personal-Akte nachführen (die Akte schützt Anstellungsfelder; das Merkzeichen erlaubt es dieser Funktion).
  perform set_config('intern.personal_funktion', 'ja', true);
  update public.personal_akten set austritt = p_austritt
   where person_id = p_person and geloescht_am is null and austritt is distinct from p_austritt;
  if not found and p_austritt is not null then
    insert into public.personal_akten (person_id, austritt)
    select p_person, p_austritt
     where not exists (select 1 from public.personal_akten where person_id = p_person and geloescht_am is null);
  end if;
  perform set_config('intern.personal_funktion', '', true);

  if p_austritt is not null and p_austritt < intern.heute_ch() then
    perform intern.austritte_vollziehen();
  end if;
end
$$;
revoke execute on function public.person_austritt_setzen(uuid, date, uuid) from public, anon;
grant execute on function public.person_austritt_setzen(uuid, date, uuid) to authenticated;

-- Wer in der Personal-Akte den Austritt ändert (Recht «personal»), ändert ihn auch für den Zugang.
create or replace function intern.austritt_aus_akte() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.personen set austritt_am = new.austritt
   where id = new.person_id and austritt_am is distinct from new.austritt;
  return null;
end
$$;
create trigger austritt_zum_zugang after insert or update of austritt on public.personal_akten
  for each row when (new.geloescht_am is null) execute function intern.austritt_aus_akte();

-- Bereits in der Akte eingetragene Austritte übernehmen.
update public.personen p set austritt_am = a.austritt
  from public.personal_akten a
 where a.person_id = p.id and a.geloescht_am is null and a.austritt is not null and p.austritt_am is null;
