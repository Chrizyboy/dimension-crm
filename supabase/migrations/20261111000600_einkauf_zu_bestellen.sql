-- Einkauf (Modul-Prüfung 24A): Material entsteht selbst aus der Offerte, sobald der Auftrag da ist; die Liste
-- «Zu bestellen» zeigt alle Baustellen mit fehlendem Material und «bestellen bis» (Baubeginn minus Lieferfrist);
-- Entwürfe desselben Lieferanten ans Lager lassen sich zu einer Sammelbestellung zusammenfassen (weniger Fracht).

insert into public.einstellungen (schluessel, wert)
values ('einkauf', '{"lieferfrist_tage": 14}')
on conflict (schluessel) do nothing;

/** Auftrag da (Projekt aus einer Offerte): Materialliste aus Kalkulation bzw. Offerte vorschlagen. */
create or replace function intern.material_bei_auftrag() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.offerte_id is not null and new.geloescht_am is null and new.alt_id is null then
    -- Läuft als Eigentümer, damit auch Verkauf ohne Recht «preise» den Auftrag anlegen kann; Fehler stoppen den Auftrag nicht.
    begin
      perform public.projekt_material_vorschlagen(new.id);
    exception when others then
      -- Ohne Kalkulation und ohne Angaben in der Offerte gibt es nichts vorzuschlagen; das ist kein Fehler.
      if sqlerrm = 'einkauf.keine_quelle' then return new; end if;
      raise warning 'Materialliste für % nicht vorgeschlagen: %', new.nummer, sqlerrm;
    end;
  end if;
  return new;
end
$$;
create trigger material_bei_auftrag after insert on public.projekte
  for each row execute function intern.material_bei_auftrag();

-- Material-Stand: auch Sammelbestellungen ohne Projekt zählen, wenn ihre Positionen zum Projekt gehören.
create or replace function intern.material_stand_setzen(p_projekt uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_zeilen int;
  v_offen int;
  v_bewegt boolean;
begin
  if p_projekt is null then return; end if;
  select count(*), count(*) filter (where vorhanden < menge) into v_zeilen, v_offen
    from public.projekt_material_stand where projekt_id = p_projekt and menge > 0;
  if v_zeilen = 0 then return; end if;
  v_bewegt := exists (select 1 from public.projekt_material where projekt_id = p_projekt and geloescht_am is null
                         and (reserviert > 0 or entnommen > 0))
           or exists (select 1 from public.bestellungen where projekt_id = p_projekt and geloescht_am is null
                         and status in ('bestellt', 'teilgeliefert', 'geliefert'))
           or exists (select 1 from public.bestellpositionen p
                        join public.bestellungen b on b.id = p.bestellung_id
                        join public.projekt_material m on m.id = p.projekt_material_id
                       where m.projekt_id = p_projekt and p.geloescht_am is null and b.geloescht_am is null
                         and b.status in ('bestellt', 'teilgeliefert', 'geliefert'));
  update public.projekte
     set material_status = case when v_offen = 0 then 'lager' when v_bewegt then 'bestellt' else material_status end
   where id = p_projekt
     and material_status is distinct from case when v_offen = 0 then 'lager' when v_bewegt then 'bestellt' else material_status end;
end
$$;

/** Ändert sich der Stand einer Bestellung, den Material-Stand aller Projekte ihrer Positionen nachführen. */
create or replace function intern.bestellung_projekte_nachfuehren() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v uuid;
begin
  for v in select distinct m.projekt_id from public.bestellpositionen p
             join public.projekt_material m on m.id = p.projekt_material_id
            where p.bestellung_id = new.id and p.geloescht_am is null and m.projekt_id is distinct from new.projekt_id loop
    perform intern.material_stand_setzen(v);
  end loop;
  return new;
end
$$;
create trigger projekte_nachfuehren after update of status on public.bestellungen
  for each row execute function intern.bestellung_projekte_nachfuehren();

/**
 * Baustellen mit fehlendem Material (ohne offenen Entwurf zählt als «noch nichts vorbereitet»), sortiert nach
 * «bestellen bis». Lieferfrist in einstellungen.einkauf. Sicht für alle mit Recht «preise» (Einkauf).
 */
create or replace function public.zu_bestellen()
returns table (projekt_id uuid, nummer text, kunde text, ort text, baubeginn date, bestellen_bis date,
               zeilen_fehlen int, zeilen_ohne_artikel int)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.nummer,
         coalesce(nullif(k.firma, ''), concat_ws(' ', k.vorname, k.nachname)), o.ort, p.baubeginn,
         p.baubeginn - coalesce(((select wert from public.einstellungen where schluessel = 'einkauf') ->> 'lieferfrist_tage')::int, 14),
         count(*)::int, count(*) filter (where s.artikel_id is null)::int
    from public.projekt_material_stand s
    join public.projekte p on p.id = s.projekt_id and p.geloescht_am is null
    left join public.kontakte k on k.id = p.kontakt_id
    left join public.objekte o on o.id = p.objekt_id
   where s.fehlt > 0 and p.status not in ('abgeschlossen', 'storniert') and intern.hat_recht('preise')
   group by p.id, p.nummer, k.firma, k.vorname, k.nachname, o.ort, p.baubeginn
   order by 6 nulls last, p.nummer
$$;

/**
 * Sammelbestellung: alle Entwürfe eines Lieferanten an dasselbe Lager werden zu einer Bestellung ohne Projekt
 * (Positionen behalten ihre Materialzeile, die Reservierung beim Eingang stimmt also weiter). Gibt die ID zurück.
 */
create or replace function public.bestellungen_zusammenfassen(p_lieferant uuid, p_lagerort uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_ziel uuid;
  v_n int;
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'einkauf.kein_recht'; end if;
  if p_lagerort is null then raise exception using errcode = 'P0001', message = 'einkauf.sammel_nur_lager'; end if;
  select count(*), (array_agg(id order by erstellt_am))[1] into v_n, v_ziel from public.bestellungen
   where lieferant_id = p_lieferant and lagerort_id = p_lagerort and status = 'entwurf' and geloescht_am is null;
  if v_n < 2 then raise exception using errcode = 'P0001', message = 'einkauf.nichts_zusammenzufassen'; end if;
  update public.bestellpositionen set bestellung_id = v_ziel
   where bestellung_id in (select id from public.bestellungen where lieferant_id = p_lieferant and lagerort_id = p_lagerort
                             and status = 'entwurf' and geloescht_am is null and id <> v_ziel)
     and geloescht_am is null;
  update public.bestellungen set geloescht_am = now(), notiz = coalesce(notiz || E'\n', '') || 'In Sammelbestellung übernommen'
   where lieferant_id = p_lieferant and lagerort_id = p_lagerort and status = 'entwurf' and geloescht_am is null and id <> v_ziel;
  update public.bestellungen set projekt_id = null where id = v_ziel;
  return v_ziel;
end
$$;

revoke execute on function intern.material_bei_auftrag() from public, anon, authenticated;
revoke execute on function intern.bestellung_projekte_nachfuehren() from public, anon, authenticated;
revoke execute on function public.zu_bestellen() from public, anon;
revoke execute on function public.bestellungen_zusammenfassen(uuid, uuid) from public, anon;
grant execute on function public.zu_bestellen() to authenticated;
grant execute on function public.bestellungen_zusammenfassen(uuid, uuid) to authenticated;
