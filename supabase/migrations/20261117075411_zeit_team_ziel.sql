-- Team stempelt gemeinsam (Chris 4.11.2026: die beiden Diogos sind ein Team): ein Knopf startet bzw. stoppt
-- die Zeit für alle, die heute mit mir im selben Einsatz oder Service-Termin sind, auf dasselbe Ziel.
-- Bisher ging das nur aus dem Rapport (nach dem Sicherheits-Check); jetzt auch über die Stempeluhr,
-- z. B. für die Fahrt ins Lager oder auf die Baustelle. Jede Person kann ihre Zeit danach selbst korrigieren.

/** Wer heute mit der Person zusammen eingeteilt ist (Einsätze ohne «voraussichtlich» und Service-Termine), sie selbst inklusive. */
create or replace function intern.team_heute(p_person uuid, p_tag date default (now() at time zone 'Europe/Zurich')::date)
returns uuid[]
language sql stable security definer set search_path = '' as $$
  select array(select distinct x from (
    select p_person as x
    union all
    select unnest(es.personen) from public.einsaetze es
     where es.geloescht_am is null and es.art <> 'geplant' and p_tag between es.von and es.bis and p_person = any (es.personen)
    union all
    select unnest(array_append(f.team, f.person_id)) from public.service_faelle f
     where f.geloescht_am is null and f.status <> 'erledigt' and (f.termin_am at time zone 'Europe/Zurich')::date = p_tag
       and (f.person_id = p_person or p_person = any (f.team))
  ) t where x is not null)
$$;

/** Mein Team heute für die Stempeluhr: Person, Kurzzeichen und ob ihre Zeit gerade läuft (ohne Zeiten-Details). */
create or replace function public.mein_team_heute()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pe.id, 'name', pe.name, 'kurzzeichen', pe.kurzzeichen,
           'laeuft', exists (select 1 from public.zeiten z where z.person_id = pe.id and z.stopp is null and z.geloescht_am is null))
         order by pe.id <> intern.meine_person_id(), pe.name), '[]')
    from public.personen pe
   where pe.id = any (intern.team_heute(intern.meine_person_id())) and pe.geloescht_am is null
$$;

/**
 * Zeit fürs Team (p: aktion start|stopp, personen [{person_id, id}] bzw. [uuid], Ziel projekt_id|service_fall_id|
 * intern|rapport_id, art, start/stopp, pause_min). Erlaubt für das heutige Team und mit Recht preise.
 * Wiederholbar: Start mit vorhandener ID tut nichts, Stopp trifft nur laufende Zeiten.
 */
create or replace function public.zeit_team(p jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_ich uuid := intern.meine_person_id();
  v_team uuid[];
  v_zeit timestamptz;
  x jsonb;
  v_person uuid;
  v_id uuid;
  n int := 0;
begin
  if v_ich is null then raise exception using errcode = 'P0001', message = 'baustelle.keine_person'; end if;
  v_team := intern.team_heute(v_ich);
  if p ->> 'aktion' = 'start' then
    v_zeit := coalesce(nullif(p ->> 'start', '')::timestamptz, now());
    if v_zeit > now() + interval '10 minutes' then raise exception using errcode = 'P0001', message = 'baustelle.zeit_zukunft'; end if;
    for x in select * from jsonb_array_elements(coalesce(p -> 'personen', '[]')) loop
      v_person := (x ->> 'person_id')::uuid;
      v_id := coalesce(nullif(x ->> 'id', '')::uuid, gen_random_uuid());
      if not (v_person = any (v_team) or intern.hat_recht('preise')) then
        raise exception using errcode = 'P0001', message = 'baustelle.nicht_im_team';
      end if;
      continue when exists (select 1 from public.zeiten where id = v_id);
      update public.zeiten set stopp = greatest(v_zeit, start + interval '1 minute')
       where person_id = v_person and stopp is null and geloescht_am is null;
      -- Ziel prüft der Trigger intern.zeit_ziel (ohne Ziel kein Start).
      insert into public.zeiten (id, person_id, rapport_id, projekt_id, service_fall_id, intern, start, art)
      values (v_id, v_person, nullif(p ->> 'rapport_id', '')::uuid, nullif(p ->> 'projekt_id', '')::uuid,
              nullif(p ->> 'service_fall_id', '')::uuid, nullif(p ->> 'intern', ''), v_zeit,
              coalesce(nullif(p ->> 'art', ''), 'arbeit'));
      n := n + 1;
    end loop;
    return n;
  elsif p ->> 'aktion' = 'stopp' then
    v_zeit := coalesce(nullif(p ->> 'stopp', '')::timestamptz, now());
    for x in select * from jsonb_array_elements(coalesce(p -> 'personen', '[]')) loop
      v_person := (x #>> '{}')::uuid;
      if not (v_person = any (v_team) or intern.hat_recht('preise')) then
        raise exception using errcode = 'P0001', message = 'baustelle.nicht_im_team';
      end if;
      update public.zeiten set stopp = greatest(v_zeit, start + interval '1 minute'),
             pause_min = coalesce(nullif(p ->> 'pause_min', '')::int, pause_min)
       where person_id = v_person and stopp is null and geloescht_am is null and start <= v_zeit;
      if found then n := n + 1; end if;
    end loop;
    return n;
  end if;
  raise exception using errcode = 'P0001', message = 'baustelle.aktion_unbekannt';
end
$$;

grant execute on function public.mein_team_heute(), public.zeit_team(jsonb) to authenticated;
