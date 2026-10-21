-- Phase 6: Lead-Nummer nie doppelt vergeben.
-- Der Zähler wurde beim Einrichten der Datenbank gesetzt; der Import der Vorlage bringt danach seine
-- eigenen Nummern L001 … mit. Ohne diese Prüfung bekäme der erste neue Lead eine schon vergebene Nummer.

/** Nächste freie Lead-Nummer: liegt der Zähler hinter den vorhandenen Nummern, springt er nach vorne. */
create or replace function intern.naechste_lead_nummer() returns text
language plpgsql set search_path = '' as $$
declare
  kandidat text := 'L' || lpad(nextval('public.lead_nummer_seq')::text, 3, '0');
begin
  if exists (select 1 from public.verkaufschancen v where v.nummer = kandidat) then
    perform setval('public.lead_nummer_seq', (
      select max(nullif(regexp_replace(v.nummer, '\D', '', 'g'), '')::int)
        from public.verkaufschancen v where v.nummer ~ '^L\d+$'));
    kandidat := 'L' || lpad(nextval('public.lead_nummer_seq')::text, 3, '0');
  end if;
  return kandidat;
end
$$;

create or replace function intern.verkaufschance_ergaenzen() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.nummer is null or new.nummer = '' then
    new.nummer := intern.naechste_lead_nummer();
  end if;
  if new.standort_id is null then
    select s.id into new.standort_id from public.standorte s
     where lower(s.name) = lower(coalesce(nullif(new.zustaendig, 'Andy'), new.erstkontakt_standort));
  end if;
  if new.standort_id is null and new.objekt_id is not null then
    select s.id into new.standort_id from public.objekte o
      join public.standorte s on s.kuerzel = public.standort_fuer_plz(o.plz)
     where o.id = new.objekt_id;
  end if;
  if new.region_id is null and new.objekt_id is not null then
    select o.region_id into new.region_id from public.objekte o where o.id = new.objekt_id;
  end if;
  return new;
end
$$;
