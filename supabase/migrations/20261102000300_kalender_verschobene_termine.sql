-- Outlook-Abgleich: Ein Termin, der aus der Vergangenheit (vor dem Abgleich-Fenster) in die Zukunft verschoben wurde,
-- behielt seine alte Zeile; der eindeutige Index (Person, Quelle, extern_id) liess den neuen Stand dann nicht zu, und
-- der Termin fehlte im CRM. Jetzt werden auch alte Zeilen mit derselben Outlook-ID abgelöst.

create or replace function public.kalender_abgleichen(p_person uuid, p_von timestamptz, p_bis timestamptz,
  p_eintraege jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  update public.kalender_eintraege set geloescht_am = now()
   where person_id = p_person and quelle = 'outlook' and geloescht_am is null
     and ((beginn < p_bis and ende > p_von)
          or extern_id in (select e ->> 'extern_id' from jsonb_array_elements(coalesce(p_eintraege, '[]')) e));
  insert into public.kalender_eintraege (person_id, beginn, ende, ganztags, betreff, ort, plz, anzeige_als, quelle, extern_id, link)
  select p_person, (e ->> 'beginn')::timestamptz, (e ->> 'ende')::timestamptz, coalesce((e ->> 'ganztags')::boolean, false),
         nullif(e ->> 'betreff', ''), nullif(e ->> 'ort', ''), nullif(e ->> 'plz', ''),
         coalesce(nullif(e ->> 'anzeige_als', ''), 'busy'), 'outlook', nullif(e ->> 'extern_id', ''), nullif(e ->> 'link', '')
    from jsonb_array_elements(coalesce(p_eintraege, '[]')) e
   where not exists (select 1 from public.verkaufschancen v
                      where v.outlook ->> 'olEventId' = e ->> 'extern_id' and v.geloescht_am is null)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end
$$;
