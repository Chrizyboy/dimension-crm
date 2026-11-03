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

-- Ziele, Wahrscheinlichkeiten und Richtwerte der Kennzahlen (20261112004500): ebenfalls nur Administration.
-- Gleiche Fassung wie dort, dazu nur die Prüfung auf «admin» (die Buchhaltung sieht die Werte weiterhin).
create or replace function public.kennzahlen_einstellungen_setzen(p_wert jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  k text;
  w jsonb;
begin
  if not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'kennzahlen.kein_recht';
  end if;
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'einstellungen.nur_admin';
  end if;
  for k in select jsonb_object_keys(p_wert) loop
    if k not in ('ziele', 'wahrscheinlichkeit', 'alt_tage', 'richtwerte') then
      raise exception using errcode = 'P0001', message = 'kennzahlen.schluessel_ungueltig';
    end if;
  end loop;
  -- Prozentwerte 0–100, Beträge nicht negativ: sonst rechnet die Prognose Unsinn.
  for k, w in select * from jsonb_each(coalesce(p_wert -> 'wahrscheinlichkeit', '{}')) loop
    if jsonb_typeof(w) <> 'number' or (w #>> '{}')::numeric not between 0 and 100 then
      raise exception using errcode = 'P0001', message = 'kennzahlen.wert_ungueltig';
    end if;
  end loop;
  if exists (select 1 from jsonb_each(coalesce(p_wert -> 'ziele', '{}')) j, jsonb_each(j.value) z
              where z.key <> 'personen' and z.value <> 'null'::jsonb
                and (jsonb_typeof(z.value) <> 'number' or (z.value #>> '{}')::numeric < 0))
     or exists (select 1 from jsonb_each(coalesce(p_wert -> 'ziele', '{}')) j,
                       jsonb_each(coalesce(j.value -> 'personen', '{}')) z
                 where jsonb_typeof(z.value) <> 'number' or (z.value #>> '{}')::numeric < 0) then
    raise exception using errcode = 'P0001', message = 'kennzahlen.wert_ungueltig';
  end if;
  update public.einstellungen e
     set wert = e.wert || p_wert
                       || case when p_wert ? 'ziele'
                               then jsonb_build_object('ziele', coalesce(e.wert -> 'ziele', '{}') || (p_wert -> 'ziele'))
                               else '{}' end
   where e.schluessel = 'kennzahlen'
  returning e.wert into w;
  return w;
end
$$;
revoke execute on function public.kennzahlen_einstellungen_setzen(jsonb) from public, anon;
grant execute on function public.kennzahlen_einstellungen_setzen(jsonb) to authenticated;

-- Wochenziele je Person sind Firmen-Einstellungen: nur noch die Administration (vorher auch Recht «finanzen»).
-- darf_ziele in «Mein Tag» folgt daraus, der Knopf verschwindet für alle anderen.
create or replace function intern.darf_ziele_setzen() returns boolean
language sql stable set search_path = '' as $$
  select intern.hat_recht('admin')
$$;

/**
 * Person einer Firmenkarten-Buchung setzen (Buchhaltung, Recht «finanzen»). Die Zuordnung Karte → Person ist
 * Arbeit am Abgleich, keine Firmen-Einstellung; darum darf die Funktion sie trotz `zz_nur_admin` merken.
 */
create or replace function public.firmenkarte_person_setzen(p_buchung uuid, p_person uuid) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_karte text;
  v_vorher text;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  update public.firmenkarte_buchungen set person_id = p_person where id = p_buchung returning karte into v_karte;
  if coalesce(v_karte, '') <> '' and p_person is not null then
    v_vorher := current_setting('intern.automation', true);
    perform set_config('intern.automation', 'an', true);
    update public.einstellungen
       set wert = jsonb_set(wert, '{spesen,karten}',
                            coalesce(wert -> 'spesen' -> 'karten', '{}') || jsonb_build_object(right(v_karte, 4), p_person))
     where schluessel = 'finanzen';
    perform set_config('intern.automation', coalesce(v_vorher, ''), true);
    update public.firmenkarte_buchungen set person_id = p_person
     where karte = v_karte and person_id is null and spese_id is null and geloescht_am is null;
  end if;
  return intern.firmenkarte_zuordnen();
end
$$;
