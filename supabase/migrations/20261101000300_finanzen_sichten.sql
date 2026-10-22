-- Phase 10, Teil 3: Listen für «Zu verrechnen» und Spesen, Firmenangaben nur durch die Buchhaltung.

-- IBAN und Zahlungsfrist landen auf jeder Rechnung: ändern darf sie nur, wer Recht «finanzen» hat.
drop policy if exists aendern on public.firmen;
create policy aendern on public.firmen for update to authenticated
  using ((select intern.hat_recht('finanzen'))) with check ((select intern.hat_recht('finanzen')));

/** Abgeschlossene, kostenpflichtige Service- und Wartungsrapporte ohne Rechnung. */
create or replace view public.offene_service_rapporte with (security_invoker = true) as
select r.id, r.nummer, r.art, r.datum, r.abgeschlossen_am, r.verrechnung,
       coalesce(f.kontakt_id, p.kontakt_id, w.kontakt_id) as kontakt_id,
       (select intern.kontaktname(k) from public.kontakte k where k.id = coalesce(f.kontakt_id, p.kontakt_id, w.kontakt_id)) as kunde,
       f.nummer as service_nummer, f.titel as service_titel, p.nummer as projekt_nummer
  from public.rapporte r
  left join public.service_faelle f on f.id = r.service_fall_id
  left join public.projekte p on p.id = coalesce(r.projekt_id, f.projekt_id)
  left join public.wartungsvertraege w on w.id = r.wartungsvertrag_id
 where r.geloescht_am is null and r.abgeschlossen_am is not null and r.verrechnung = 'kostenpflichtig'
   and not exists (select 1 from public.rechnungen x where x.rapport_id = r.id and x.geloescht_am is null
                     and x.status <> 'storniert');

/** Spesen mit Name der Person (RLS der Spesen gilt: eigene, mit «finanzen» alle). */
create or replace view public.spesen_liste with (security_invoker = true) as
select s.id, s.person_id, pe.name as person, pe.kuerzel, s.datum, s.betrag_rappen, s.kategorie, s.zweck, s.notiz,
       s.beleg_id, d.name as beleg_name, s.status, s.ausbezahlt_am, s.ausbezahlt_von, s.storniert_am, s.storniert_von,
       s.storniert_grund, s.erstellt_am
  from public.spesen s
  left join public.personen pe on pe.id = s.person_id
  left join public.dokumente d on d.id = s.beleg_id
 where s.geloescht_am is null;

grant select on public.offene_service_rapporte, public.spesen_liste to authenticated;

/** Einstellungen schützen: Ausschreibungen nur Admin, Finanzen (Stundensätze, Buchhaltung) nur mit «finanzen». */
create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'ausschreibungen' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  if new.schluessel = 'finanzen' and auth.uid() is not null and not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'finanzen.kein_recht';
  end if;
  return new;
end
$$;
