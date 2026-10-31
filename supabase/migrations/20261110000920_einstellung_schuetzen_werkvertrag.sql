-- Reparatur: Die Fassungen von intern.einstellung_schuetzen in 20261110000900 (Ablage) und 20261110000910
-- (Zuständigkeiten) sind parallel zu 20261110000500 (Werkvertrag) entstanden und haben «werkvertrag» aus der
-- Liste «nur Administration» verloren. Hier kommt die Liste vollständig zurück. Ablage und Zuständigkeiten
-- bekommen zusätzlich einen eigenen Trigger (wie Helpdesk), damit eine spätere Fassung sie nicht wieder verliert.

create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel in ('ausschreibungen', 'grossprojekte', 'werkvertrag', 'ablage', 'zustaendigkeiten')
     and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  if new.schluessel = 'finanzen' and auth.uid() is not null and not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'finanzen.kein_recht';
  end if;
  if new.schluessel = 'marketing' and auth.uid() is not null and not intern.hat_recht('admin')
     and (tg_op = 'INSERT' or (new.wert -> 'social' ->> 'ci') is distinct from (old.wert -> 'social' ->> 'ci')) then
    raise exception using errcode = '42501', message = 'marketing.ci_nur_admin';
  end if;
  if new.schluessel = 'automationen' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'automation.kein_recht';
  end if;
  if new.schluessel = 'ki' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ki.kein_recht';
  end if;
  return new;
end
$$;

/** Ablage und Zuständigkeiten ändert nur die Administration; eigener Trigger, unabhängig von einstellung_schuetzen. */
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
