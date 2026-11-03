-- Chris, 3.11.2026: «die die nicht admin sind sollen keine einstellungen vornehmen können ausser es betrifft sie selbst».
-- Bisher durften auch Nicht-Admins drei Einstellungs-Schlüssel ändern (finanzen mit Recht «finanzen», Texte in
-- marketing, Kosten pro Lead in kennzahlen) und die Firmenangaben (IBAN, Zahlungsfrist) mit Recht «finanzen».
-- Neu gilt ohne Ausnahme: Firmen-Einstellungen ändert nur die Administration. Eigenes (Profil, Sprache, Signatur,
-- Schreibstil, eigene Ansichten, eigene Unterschrift) bleibt bei der Person, das liegt nicht in `einstellungen`.
-- Eigener Trigger statt Neufassung der bestehenden, damit parallele Änderungen daran nicht kollidieren.

create or replace function intern.einstellung_nur_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role'
     or coalesce(current_setting('intern.automation', true), '') = 'an'
     or intern.hat_recht('admin') then
    return new;
  end if;
  raise exception using errcode = '42501', message = 'einstellungen.nur_admin';
end
$$;
revoke execute on function intern.einstellung_nur_admin() from public, anon, authenticated;
-- Name mit «zz_», damit er als letzter läuft (Postgres: alphabetisch) und die genaueren Meldungen der
-- Bereichs-Trigger (posteingang.kein_recht, service.kein_recht …) zuerst kommen.
drop trigger if exists zz_nur_admin on public.einstellungen;
create trigger zz_nur_admin before insert or update on public.einstellungen
  for each row execute function intern.einstellung_nur_admin();

-- Firmenangaben (IBAN, Bank, Zahlungsfrist, MWST-Nummer): lesen weiterhin alle, ändern nur die Administration.
drop policy if exists aendern on public.firmen;
create policy aendern on public.firmen for update to authenticated
  using ((select intern.hat_recht('admin'))) with check ((select intern.hat_recht('admin')));

-- Kosten pro Lead: gleiche Regel, mit klarer Meldung statt des allgemeinen Fehlers aus dem Trigger.
create or replace function public.kennzahlen_quellen_kosten(p_quelle text, p_rappen bigint) returns void
language plpgsql set search_path = '' as $$
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'einstellungen.nur_admin';
  end if;
  if p_rappen is not null and (p_rappen < 0 or p_rappen > 10000000) then
    raise exception using errcode = 'P0001', message = 'kennzahlen.kosten_ungueltig';
  end if;
  update public.einstellungen
     set wert = jsonb_set(wert, '{quellen_kosten_rappen}',
                          case when p_rappen is null then coalesce(wert -> 'quellen_kosten_rappen', '{}') - p_quelle
                               else coalesce(wert -> 'quellen_kosten_rappen', '{}') || jsonb_build_object(p_quelle, p_rappen) end)
   where schluessel = 'kennzahlen';
end
$$;
revoke execute on function public.kennzahlen_quellen_kosten(text, bigint) from public, anon;
grant execute on function public.kennzahlen_quellen_kosten(text, bigint) to authenticated;
