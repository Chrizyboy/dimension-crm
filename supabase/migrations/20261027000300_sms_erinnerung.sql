-- Phase 8, Teil 3: SMS-Erinnerung am Vortag des Beratungstermins (V172) über den Ausgangskorb.
-- Text und Regeln an einer Stelle (hier), damit Liste, Knopf «Alle senden» und der automatische Versand
-- ab 16 Uhr dasselbe tun. Nur Handynummern (07x, wie V233). Jeder Termin bekommt höchstens eine SMS
-- (Schlüssel sms_erinnerung:<lead>:<termin>), auch wenn zwei Personen gleichzeitig senden.

/** Ist das eine Schweizer Handynummer (07x)? */
create or replace function intern.ist_handy(p_nummer text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(intern.sms_nummer(p_nummer) ~ '^\+417[5-9]\d{7}$', false)
$$;

/** Termine an einem Tag mit fertigem SMS-Text und Stand des Versands (für die Liste und den Versand). */
create or replace function public.sms_erinnerungen(p_datum date) returns table (
  verkaufschance_id uuid, kontakt_id uuid, name text, telefon text, handy boolean, sprache text,
  termin_am timestamptz, text text, schluessel text, ausgang_id uuid, ausgang_status text, ausgang_fehler text
)
language sql stable security invoker set search_path = '' as $$
  with v as (select wert from public.einstellungen where schluessel = 'sms_erinnerung' and geloescht_am is null)
  select g.verkaufschance_id, g.kontakt_id, g.name, g.telefon, intern.ist_handy(g.telefon), coalesce(g.sprache, 'de'),
         g.termin_am,
         replace(replace(replace(replace(
           coalesce(case when g.sprache = 'fr' then v.wert ->> 'text_fr' else v.wert ->> 'text_de' end, ''),
           '{name}', g.name),
           '{datum}', to_char(p_datum, 'DD.MM.YYYY')),
           '{zeit}', to_char(g.termin_am at time zone 'Europe/Zurich', 'HH24:MI')),
           '{person}', coalesce(split_part(p.name, ' ', 1), '')),
         'sms_erinnerung:' || g.verkaufschance_id || ':' || to_char(g.termin_am at time zone 'Europe/Zurich', 'YYYY-MM-DD"T"HH24:MI'),
         a.id, a.status, a.fehler
    from public.verkauf_geschaefte g
    cross join v
    left join public.personen p on p.id = coalesce(g.termin_person_id, g.person_id)
    left join lateral (
      select x.id, x.status, x.fehler from public.ausgangskorb x
       where x.schluessel = 'sms_erinnerung:' || g.verkaufschance_id || ':' || to_char(g.termin_am at time zone 'Europe/Zurich', 'YYYY-MM-DD"T"HH24:MI')
         and x.status <> 'verworfen' and x.geloescht_am is null
       order by x.erstellt_am desc limit 1) a on true
   where g.stand = 'termin' and g.verkaufschance_id is not null
     and (g.termin_am at time zone 'Europe/Zurich')::date = p_datum
   order by g.termin_am
$$;
revoke execute on function public.sms_erinnerungen(date) from public, anon;
grant execute on function public.sms_erinnerungen(date) to authenticated, service_role;

/**
 * SMS-Erinnerungen für einen Tag in den Ausgangskorb legen. p_leads = null: alle offenen mit Handynummer.
 * p_automatisch: vom Zeitplan (nur wenn in den Einstellungen «automatisch» eingeschaltet ist), sonst
 * hat eine Person «Senden» gedrückt. Gibt die Zahl der neuen Einträge zurück.
 */
create or replace function public.sms_erinnerungen_senden(p_datum date, p_leads uuid[] default null,
  p_automatisch boolean default false) returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_n int := 0;
  v_ich uuid := intern.meine_person_id();
begin
  if not p_automatisch and not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'recht.fehlt';
  end if;
  -- «automatisch» darf nur der Zeitplan (ohne angemeldete Person) sagen.
  if p_automatisch and (v_ich is not null or coalesce(auth.role(), '') = 'authenticated') then
    raise exception using errcode = '42501', message = 'recht.fehlt';
  end if;
  if p_automatisch and not coalesce((select (wert ->> 'automatisch')::boolean from public.einstellungen
                                       where schluessel = 'sms_erinnerung'), false) then
    return 0;
  end if;
  for r in select * from public.sms_erinnerungen(p_datum) s
            where s.handy and s.ausgang_id is null and (p_leads is null or s.verkaufschance_id = any (p_leads))
  loop
    begin
      insert into public.ausgangskorb (kanal, art, an, text, sprache, kontakt_id, verkaufschance_id, schluessel,
        status, automatisch, freigegeben_von, freigegeben_am)
      values ('sms', 'sms_erinnerung', intern.sms_nummer(r.telefon), r.text, r.sprache, r.kontakt_id,
        r.verkaufschance_id, r.schluessel, 'freigegeben', p_automatisch, v_ich, now());
      v_n := v_n + 1;
    exception when unique_violation then
      null; -- jemand anderes war schneller: kein zweiter Eintrag
    end;
  end loop;
  return v_n;
end
$$;
revoke execute on function public.sms_erinnerungen_senden(date, uuid[], boolean) from public, anon;
grant execute on function public.sms_erinnerungen_senden(date, uuid[], boolean) to authenticated, service_role;

-- «automatisch» heisst: der Zeitplan legt die SMS ab «uhrzeit» selbst frei (Regel 6: nur ausdrücklich).
update public.einstellungen
   set wert = wert || jsonb_build_object('automatisch', coalesce((wert ->> 'aktiv')::boolean, false))
 where schluessel = 'sms_erinnerung' and not (wert ? 'automatisch');
