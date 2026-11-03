-- Rechnungsangaben vom Kunden (Entscheid 0055, Kunden-Ausbau Entscheid 0045): Rechnungsadresse, Rechnungs-Mail und
-- eigene Zahlungsfrist am Kontakt gelten für neue Rechnungen. Trigger statt Änderung an rechnung_entwurf und
-- rechnung_stellen, damit jeder Weg (Tranche, Rapport, Wartung, Anzahlung, von Hand) dieselbe Regel bekommt.

/** Neue Rechnung: ohne eigene Angabe kommt die Rechnungsadresse/-Mail des Kunden in rechnung_an. */
create or replace function intern.rechnung_kundenangaben() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k record;
  v_an jsonb;
begin
  if new.rechnung_an is not null then return new; end if;
  select rechnungsadresse, nullif(trim(rechnungs_email), '') as email into k
    from public.kontakte where id = new.kontakt_id;
  -- Nur übernehmen, was wirklich ausgefüllt ist; leere Felder würden die Adresse des Kunden verdecken.
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_an
    from jsonb_each(coalesce(k.rechnungsadresse, '{}'::jsonb)) e
   where e.key in ('name', 'zusatz', 'strasse', 'plz', 'ort')
     and jsonb_typeof(e.value) = 'string' and trim(e.value #>> '{}') <> '';
  if k.email is not null then v_an := v_an || jsonb_build_object('email', k.email); end if;
  if v_an <> '{}'::jsonb then new.rechnung_an := v_an; end if;
  return new;
end
$$;
create trigger kundenangaben before insert on public.rechnungen
  for each row execute function intern.rechnung_kundenangaben();

/** Beim Stellen: hat der Kunde eine eigene Zahlungsfrist, gilt sie statt der Frist der Firma. */
create or replace function intern.rechnung_kundenfrist() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tage int;
begin
  -- Nur wenn beim Stellen keine Fälligkeit von Hand gesetzt war (rechnung_stellen füllt dann die Firmenfrist ein).
  if old.status = 'entwurf' and new.status = 'gestellt' and old.faellig_am is null and new.datum is not null then
    select zahlungsfrist_tage into v_tage from public.kontakte where id = new.kontakt_id;
    if v_tage is not null then new.faellig_am := new.datum + v_tage; end if;
  end if;
  return new;
end
$$;
create trigger kundenfrist before update of status on public.rechnungen
  for each row execute function intern.rechnung_kundenfrist();
