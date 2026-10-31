-- Ablage und Zuständigkeiten ändert nur die Administration. Eigener Trigger (wie beim Helpdesk) statt nur der
-- Liste in intern.einstellung_schuetzen: Parallele Fassungen dieser Funktion haben schon einmal einen Schlüssel
-- verloren (werkvertrag, repariert in 20261110001010); so bleibt der Schutz bestehen, egal welche Fassung zuletzt läuft.

create or replace function intern.ablage_zust_einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel in ('ablage', 'zustaendigkeiten') and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  return new;
end
$$;
create trigger ablage_zust_schuetzen before insert or update on public.einstellungen
  for each row execute function intern.ablage_zust_einstellung_schuetzen();
