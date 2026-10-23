-- Phase 12, Teil 4: Woher die Signale kommen. «Sofort»-Auslöser hängen als Trigger an den Tabellen, Auslöser nach
-- Datum oder Stand (Termin vorbei, Schritt erledigt, Wartung fällig, Rechnung überfällig, Monatsanfang) findet die
-- Durchsicht alle 10 Minuten. Beim ersten Durchsehen gilt der ganze Bestand als «basis» und löst nichts aus.

/** Signal festhalten; dasselbe Ereignis mit demselben Schlüssel kommt nur einmal. */
create or replace function intern.automation_signal(p_ereignis text, p_tabelle text, p_id uuid, p_schluessel text,
                                                    p_daten jsonb default '{}', p_basis boolean default false)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  insert into intern.automation_signale (ereignis, tabelle, bezug_id, schluessel, daten, basis, verteilt)
  values (p_ereignis, p_tabelle, p_id, p_schluessel, coalesce(p_daten, '{}'), p_basis, p_basis)
  on conflict (ereignis, schluessel) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end
$$;

/** Der Import der Vorlage (Server-Schlüssel, Zeilen mit alt_id) löst nie etwas aus. */
create or replace function intern.automation_import(p_alt_id text) returns boolean
language sql stable set search_path = '' as $$
  select p_alt_id is not null and coalesce(auth.role(), '') = 'service_role'
$$;

create or replace function intern.signal_verkaufschance() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.geloescht_am is not null or intern.automation_import(new.alt_id) then return new; end if;
  if tg_op = 'INSERT' then
    perform intern.automation_signal('lead.neu', 'verkaufschancen', new.id, new.id::text);
  end if;
  if new.stufe = 'termin_vereinbart' and new.termin_am > now()
     and (tg_op = 'INSERT' or old.termin_am is distinct from new.termin_am or old.stufe is distinct from new.stufe) then
    perform intern.automation_signal('lead.termin_vereinbart', 'verkaufschancen', new.id,
                                     new.id || ':' || to_char(new.termin_am at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI'),
                                     jsonb_build_object('termin_am', new.termin_am));
  end if;
  return new;
end
$$;
create trigger automation_signal after insert or update of stufe, termin_am on public.verkaufschancen
  for each row execute function intern.signal_verkaufschance();

create or replace function intern.signal_offerte() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.geloescht_am is not null or intern.automation_import(new.alt_id) then return new; end if;
  if new.status = 'offeriert' and new.angebot_am is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'offeriert' or old.angebot_am is distinct from new.angebot_am) then
    perform intern.automation_signal('offerte.gesendet', 'offerten', new.id, new.id || ':' || new.angebot_am,
                                     jsonb_build_object('angebot_am', new.angebot_am));
  end if;
  if (new.status = 'angenommen' or new.entscheid = 'angenommen')
     and (tg_op = 'INSERT' or not (old.status = 'angenommen' or coalesce(old.entscheid, '') = 'angenommen')) then
    perform intern.automation_signal('offerte.angenommen', 'offerten', new.id, new.id::text);
  end if;
  return new;
end
$$;
create trigger automation_signal after insert or update of status, angebot_am, entscheid on public.offerten
  for each row execute function intern.signal_offerte();

create or replace function intern.signal_projekt() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.offerte_id is not null and new.geloescht_am is null and not intern.automation_import(new.alt_id) then
    perform intern.automation_signal('auftrag.erstellt', 'projekte', new.id, new.id::text);
  end if;
  return new;
end
$$;
create trigger automation_signal after insert on public.projekte
  for each row execute function intern.signal_projekt();

create or replace function intern.signal_projekt_schritt() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  s public.ablauf_schritte;
begin
  if new.eingereicht_am is null or new.geloescht_am is not null or intern.automation_import(new.alt_id)
     or (tg_op = 'UPDATE' and old.eingereicht_am is not distinct from new.eingereicht_am) then
    return new;
  end if;
  select x.* into s from public.ablauf_schritte x
    join public.projekte p on p.ablauf_vorlage_id = x.ablauf_vorlage_id
   where p.id = new.projekt_id and x.schluessel = new.schluessel and x.geloescht_am is null limit 1;
  perform intern.automation_signal('projekt.gesuch_eingereicht', 'projekte', new.projekt_id,
    new.projekt_id || ':' || new.schluessel || ':' || new.eingereicht_am,
    jsonb_build_object('schritt', new.schluessel, 'schritt_de', coalesce(s.name_de, new.schluessel),
                       'schritt_fr', coalesce(s.name_fr, new.schluessel), 'bewilligung', coalesce(s.bewilligung, false),
                       'eingereicht_am', new.eingereicht_am));
  return new;
end
$$;
create trigger automation_signal after insert or update of eingereicht_am on public.projekt_schritte
  for each row execute function intern.signal_projekt_schritt();

/**
 * Durchsicht der Auslöser nach Datum und Stand, höchstens alle 10 Minuten (p_sofort = jetzt, für Tests).
 * Gibt die Zahl der neuen Signale zurück (ohne die Basis beim ersten Mal).
 */
create or replace function intern.automationen_durchsehen(p_sofort boolean default false) returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select wert from public.einstellungen where schluessel = 'automationen'), '{}');
  heute date := (now() at time zone 'Europe/Zurich')::date;
  e text;
  basis boolean;
  n int := 0;
  r record;
begin
  if not p_sofort and exists (select 1 from intern.automation_durchsicht where ereignis = '*'
                                 and zuletzt_am > now() - interval '10 minutes') then
    return 0;
  end if;
  insert into intern.automation_durchsicht (ereignis) values ('*')
  on conflict (ereignis) do update set zuletzt_am = now();

  foreach e in array array['lead.termin_gehabt', 'projekt.schritt_erledigt', 'wartung.faellig', 'rechnung.ueberfaellig',
                           'zeit.monatlich'] loop
    basis := not exists (select 1 from intern.automation_durchsicht where ereignis = e);
    for r in
      select 'verkaufschancen' as tabelle, v.id, v.id || ':' || to_char(v.termin_am at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI') as schluessel,
             jsonb_build_object('termin_am', v.termin_am) as daten
        from public.verkaufschancen v
       where e = 'lead.termin_gehabt' and v.geloescht_am is null and v.stufe = 'termin_vereinbart'
         and v.termin_am < now()
         and v.termin_am > now() - make_interval(days => coalesce((cfg ->> 'termin_gehabt_tage')::int, 30))
      union all
      select 'projekte', f.projekt_id, f.projekt_id || ':' || f.schluessel,
             jsonb_build_object('schritt', f.schluessel, 'schritt_de', f.name_de, 'schritt_fr', f.name_fr,
                                'phase', f.phase, 'bewilligung', f.bewilligung)
        from public.projekt_fahrplan f
       where e = 'projekt.schritt_erledigt' and f.stand = 'erledigt'
      union all
      select 'wartungsvertraege', w.id, w.id || ':' || w.naechste_wartung, jsonb_build_object('naechste_wartung', w.naechste_wartung)
        from public.wartungsvertraege w
       where e = 'wartung.faellig' and w.geloescht_am is null and w.status = 'aktiv' and w.naechste_wartung is not null
         and w.naechste_wartung <= heute + coalesce((cfg ->> 'wartung_vorlauf_tage')::int, 30)
      union all
      select 'rechnungen', x.id, x.id || ':' || x.mahnstufe, jsonb_build_object('mahnstufe', x.mahnstufe)
        from public.rechnungen x
       where e = 'rechnung.ueberfaellig' and x.geloescht_am is null and x.status in ('gestellt', 'teilbezahlt')
         and x.faellig_am < heute - coalesce((cfg ->> 'rechnung_karenz_tage')::int, 5)
         and (x.mahnfrist is null or x.mahnfrist < heute) and x.mahnstufe < 3
         and x.total_rappen - coalesce(x.bezahlt_rappen, 0) > 0
      union all
      select null, null, to_char(heute, 'YYYY-MM'), jsonb_build_object('monat', to_char(heute, 'YYYY-MM'))
       where e = 'zeit.monatlich'
    loop
      if intern.automation_signal(e, r.tabelle, r.id, r.schluessel, r.daten, basis) and not basis then n := n + 1; end if;
    end loop;
    insert into intern.automation_durchsicht (ereignis) values (e)
    on conflict (ereignis) do update set zuletzt_am = now();
  end loop;
  return n;
end
$$;

-- Die internen Funktionen ruft nur die Datenbank selbst auf (Trigger, Zeitplan), nie die App.
do $$
declare
  f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'intern' and (p.proname like 'automation%' or p.proname like 'signal_%'
                                            or p.proname in ('mahnung_gesendet', 'personen_namen'))
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end
$$;
