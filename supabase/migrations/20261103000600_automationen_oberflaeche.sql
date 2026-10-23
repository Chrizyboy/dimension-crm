-- Phase 12, Teil 6: Was die Oberfläche an Läufen ändern darf. Nur die Administration, nur über diese Funktion.

/** Einen offenen Lauf von Hand beenden (z. B. «Nachfassen» nicht mehr nötig). Gibt false zurück, wenn er schon zu Ende ist. */
create or replace function public.automation_lauf_abbrechen(p_lauf uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'recht.fehlt';
  end if;
  update public.automation_laeufe set stand = 'abgebrochen', beendet_am = now()
   where id = p_lauf and stand in ('laeuft', 'wartet', 'server');
  get diagnostics n = row_count;
  if n > 0 then
    perform intern.automation_vermerk(p_lauf, (select schritt from public.automation_laeufe where id = p_lauf), 'ende',
      jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'von_hand',
                         'werte', jsonb_build_object('von', intern.personen_namen(array[intern.meine_person_id()]))));
  end if;
  return n > 0;
end
$$;
revoke execute on function public.automation_lauf_abbrechen(uuid) from public, anon;
grant execute on function public.automation_lauf_abbrechen(uuid) to authenticated;

-- Die Einstellungen der Automationen (Fristen, Bewertungslink) ändert nur die Administration, wie die Automationen selbst.
create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'ausschreibungen' and auth.uid() is not null and not intern.hat_recht('admin') then
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
  return new;
end
$$;
