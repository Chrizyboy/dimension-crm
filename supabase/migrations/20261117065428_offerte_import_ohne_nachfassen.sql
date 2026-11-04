-- Der Import (V233) ist kein Senden: Setzt er eine Offerte auf «offeriert» (z. B. gewonnen ohne Ordner in
-- SharePoint → zurück auf offeriert, Entscheid 16B), beginnt kein Nachfass-Plan und keine neue Gültigkeit.
-- Beim zweiten Import am Stichtag (4.11.2026) bekamen so 17 übernommene Offerten ein «Nachfassen am», das es
-- im alten CRM nicht gab. Import erkennbar: keine Person angemeldet und er schreibt alt_daten neu (nur er tut das).

/**
 * Beim Senden (Status → offeriert): Freigabe prüfen, Gültigkeit setzen und den Nachfass-Plan neu beginnen.
 * Ändert sich der Rabatt, gilt eine frühere Freigabe nicht mehr. Nicht beim Import aus der Vorlage.
 */
create or replace function intern.offerte_vor_senden() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.offerten_cfg();
  import boolean := auth.uid() is null and new.alt_id is not null and new.alt_daten is distinct from old.alt_daten;
begin
  if new.rabatt_prozent is distinct from old.rabatt_prozent and old.freigabe is not null then
    new.freigabe := null;
  end if;
  if import then
    return new;
  end if;
  if new.status = 'offeriert' and old.status is distinct from 'offeriert' then
    if auth.uid() is not null and new.freigabe is null and intern.offerte_freigabe_grund(new) is not null then
      raise exception using message = 'offerte.freigabe_fehlt';
    end if;
  end if;
  if new.status = 'offeriert' and new.angebot_am is not null
     and (old.status is distinct from 'offeriert' or new.angebot_am is distinct from old.angebot_am) then
    -- «gesendet» markiert Offerten mit Nachfass-Plan; ein Datum in der Zukunft heisst dann nicht «vertagt».
    new.nachfass_schritt := 0;
    new.nachfass_ergebnis := 'gesendet';
    if new.nachfassen_am is null then
      new.nachfassen_am := new.angebot_am + coalesce(intern.nachfass_tag(0), intern.nachfassen_tage());
    end if;
    if new.gueltig_bis is null or new.angebot_am is distinct from old.angebot_am then
      new.gueltig_bis := new.angebot_am + coalesce((cfg ->> 'gueltig_tage')::int, 30);
    end if;
  end if;
  return new;
end
$$;

-- Was der Trigger beim Import so gesetzt hat, auf den Stand der Vorlage zurück. «gesendet» bei einer übernommenen
-- Offerte ohne Änderung durch eine Person kann nur daher kommen (Senden in der App läuft mit Anmeldung).
update public.offerten o
   set nachfassen_am = case when coalesce(o.alt_daten ->> 'nachfolgeTermin', '') ~ '^\d{4}-\d{2}-\d{2}'
                            then left(o.alt_daten ->> 'nachfolgeTermin', 10)::date end,
       nachfass_schritt = 0,
       nachfass_ergebnis = null,
       gueltig_bis = null
 where o.alt_id is not null
   and o.nachfass_ergebnis = 'gesendet'
   and not exists (select 1 from public.aenderungsprotokoll a
                    where a.tabelle = 'offerten' and a.datensatz = o.id and a.benutzer is not null);
