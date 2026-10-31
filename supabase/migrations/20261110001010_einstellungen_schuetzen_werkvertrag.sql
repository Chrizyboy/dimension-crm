-- Korrektur: 20261110000900_ablage und 20261110000910_zustaendigkeiten haben intern.einstellung_schuetzen neu
-- geschrieben, ohne «werkvertrag» aus 20261110000500_werkvertrag_vorlage. Seither konnte jede Person die
-- Werkvertrag-Einstellung (z. B. den Unterzeichner) ändern; der pgTAP-Test werkvertrag schlug fehl.
-- Wer diese Funktion künftig ändert: alle Schlüssel übernehmen (Liste unten).

create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel in ('ausschreibungen', 'grossprojekte', 'werkvertrag', 'ablage', 'zustaendigkeiten') and auth.uid() is not null
     and not intern.hat_recht('admin') then
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
