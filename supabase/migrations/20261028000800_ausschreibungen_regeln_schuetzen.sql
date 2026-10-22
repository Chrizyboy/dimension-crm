-- Phase 8b: Die Regeln des Monitors (wer bewilligt, wer sendet) darf nur die Administration ändern. Sonst könnte sich
-- jede Person mit Grundrecht selbst als «bewilligt» eintragen und die vier Augen umgehen. Server und Migrationen
-- (ohne angemeldete Person) sind nicht betroffen.

create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'ausschreibungen' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  return new;
end
$$;

create trigger einstellung_schuetzen before insert or update on public.einstellungen
  for each row execute function intern.einstellung_schuetzen();
