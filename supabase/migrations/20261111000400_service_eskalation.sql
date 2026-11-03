-- Service (Modul-Prüfung 22A): Dringende Fälle bleiben nicht liegen. Reagiert bei einem Fall mit Priorität «hoch»
-- nach einer eingestellten Zeit (Standard 2 Stunden) niemand, bekommen die zuständige Person und ihre
-- Stellvertretung eine Glocke; nach der doppelten Zeit die Administration. Nur intern, keine Mail nach aussen.
-- «Reagiert» heisst: Stand geändert, Notiz im Verlauf, Termin gesetzt oder jemand zugeteilt, nachdem der Fall da war.

alter table public.service_faelle
  add column reaktion_am timestamptz,
  add column eskalation smallint not null default 0 check (eskalation between 0 and 2);

-- Übernommene und schon bestehende Fälle gelten als bearbeitet, damit am ersten Tag keine Glocken-Flut kommt.
update public.service_faelle set reaktion_am = coalesce(geaendert_am, erstellt_am) where reaktion_am is null;

insert into public.einstellungen (schluessel, wert)
values ('service', '{"eskalation_stunden": 2}')
on conflict (schluessel) do nothing;

/** Erste Reaktion festhalten (einmal). */
create or replace function intern.service_reaktion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reaktion_am is null and (
       new.status is distinct from old.status
       or jsonb_array_length(coalesce(new.verlauf, '[]')) > jsonb_array_length(coalesce(old.verlauf, '[]'))
       or (new.termin_am is not null and old.termin_am is null)
       or (new.person_id is not null and old.person_id is distinct from new.person_id)
     ) then
    new.reaktion_am := now();
  end if;
  return new;
end
$$;
create trigger reaktion before update on public.service_faelle
  for each row execute function intern.service_reaktion();

/**
 * Durchsicht für den Zeitplan (alle 15 Minuten): meldet unbeantwortete dringende Fälle.
 * Gibt die Zahl der Meldungen zurück. Nur der Server ruft sie auf (kein Recht für die App).
 */
create or replace function public.service_eskalieren() returns int
language plpgsql security definer set search_path = '' as $$
declare
  stunden numeric := coalesce(((select wert from public.einstellungen where schluessel = 'service') ->> 'eskalation_stunden')::numeric, 2);
  zust jsonb := coalesce((select wert from public.einstellungen where schluessel = 'zustaendigkeiten'), '{}');
  f record;
  wer uuid[];
  n int := 0;
  titel_de text;
  titel_fr text;
begin
  for f in
    select s.id, s.nummer, s.titel, s.person_id, s.eskalation, p.kuerzel
      from public.service_faelle s left join public.personen p on p.id = s.person_id
     where s.geloescht_am is null and s.prioritaet = 'hoch' and s.status <> 'erledigt' and s.reaktion_am is null
       and s.eskalation < 2
       and s.erstellt_am < now() - make_interval(secs => (stunden * 3600 * (s.eskalation + 1))::int)
     order by s.erstellt_am
     for update of s skip locked
  loop
    if f.eskalation = 0 and f.person_id is not null then
      -- Zuständige Person und Stellvertretung (wenn eingetragen und aktiv)
      select array_agg(distinct x) into wer from (
        select f.person_id as x
        union all
        select p.id from public.personen p
         where p.kuerzel = zust -> 'stellvertretung' ->> f.kuerzel and p.aktiv and p.geloescht_am is null
      ) y;
    else
      -- Niemand zuständig oder zweite Stufe: Administration
      select array_agg(p.id) into wer from public.personen p left join public.rollen r on r.schluessel = p.rolle
       where p.aktiv and p.geloescht_am is null and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}')));
    end if;
    titel_de := case when f.eskalation = 0 then 'Dringender Service-Fall ohne Reaktion' else 'Dringender Service-Fall weiter offen' end;
    titel_fr := case when f.eskalation = 0 then 'Cas de service urgent sans réaction' else 'Cas de service urgent toujours ouvert' end;
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
    select x, case when f.eskalation = 0 then 'warnung' else 'kritisch' end, titel_de, titel_fr,
           f.nummer || ' · ' || f.titel, f.nummer || ' · ' || f.titel, '/aftersales?fall=' || f.id, true
      from unnest(coalesce(wer, '{}')) x;
    update public.service_faelle set eskalation = eskalation + 1 where id = f.id;
    n := n + 1;
  end loop;
  return n;
end
$$;

revoke execute on function public.service_eskalieren() from public, anon, authenticated;
grant execute on function public.service_eskalieren() to service_role;
revoke execute on function intern.service_reaktion() from public, anon, authenticated;
