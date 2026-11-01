-- Rechte-Prüfung vor dem Go-live (1.11.2026): drei Lücken, die jede angemeldete Person (auch Montage) betrafen.
--
-- 1. Einstellungen: geschützt waren nur einzelne Schlüssel. MWST-Satz, Datensicherung, SMS-Automatik,
--    Offertnummern, Standort-Regeln, Tourplanung, IBN-Prüfpunkte, Wartungs-Leistungen usw. konnte jede
--    Person ändern. Neu gilt: jeder Schlüssel nur Administration, ausser denen, die bewusst offen sind
--    oder einen eigenen Schutz haben. Auch Umbenennen eines Schlüssels ist kein Schlupfloch mehr.
-- 2. Ausgangskorb: wer eine Mail anlegte, konnte eine andere Person als Absender eintragen. Versendet
--    wird über deren Microsoft-Konto, also «im Namen von Chris». Neu nur sich selbst, ausser Administration
--    und Automationen (die laufen auf dem Server und setzen die zuständige Person).
-- 3. Stammdaten (Auswahllisten, Regionen, Standorte, Ablauf-Vorlagen, Lagerorte) konnte jede Person
--    ändern. Die App ändert sie nie; neu nur Administration (Regel 8: Konfiguration ist Sache der Verwaltung).
--
-- Eigene Trigger statt Neufassung von intern.einstellung_schuetzen, damit parallele Änderungen daran nicht kollidieren.

/** Einstellungen: Standard ist «nur Administration». Offen bzw. anderswo geschützt sind nur die Schlüssel unten. */
create or replace function intern.einstellung_standard_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  -- finanzen: Recht «finanzen» (einstellung_schuetzen); marketing: Vorlagen für alle, CI nur Admin (dito);
  -- kennzahlen: Kosten pro Lead über kennzahlen_quellen_kosten; posteingang, helpdesk: eigene Trigger.
  offen constant text[] := array['finanzen', 'marketing', 'kennzahlen', 'posteingang', 'helpdesk'];
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' or intern.hat_recht('admin') then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.schluessel is distinct from old.schluessel then
    raise exception using errcode = '42501', message = 'einstellungen.kein_recht';
  end if;
  if new.schluessel <> all (offen) then
    raise exception using errcode = '42501', message = 'einstellungen.kein_recht';
  end if;
  return new;
end
$$;
create trigger standard_schuetzen before insert or update on public.einstellungen
  for each row execute function intern.einstellung_standard_schuetzen();

/**
 * Ausgangskorb: Absender ist man selbst. Eine andere Person eintragen darf nur die Administration
 * oder eine Automation (intern.automation_als setzt dafür «intern.automation»).
 */
create or replace function intern.ausgang_absender_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.absender_person_id is null
     or (tg_op = 'UPDATE' and new.absender_person_id is not distinct from old.absender_person_id)
     or auth.uid() is null or coalesce(auth.role(), '') = 'service_role'
     or coalesce(current_setting('intern.automation', true), '') = 'an'
     or new.absender_person_id = intern.meine_person_id()
     or intern.hat_recht('admin') then
    return new;
  end if;
  raise exception using errcode = '42501', message = 'ausgang.fremder_absender';
end
$$;
create trigger absender_pruefen before insert or update of absender_person_id on public.ausgangskorb
  for each row execute function intern.ausgang_absender_pruefen();

-- Automationen handeln im Namen einer Person und setzen als Absender die zuständige Person.
-- Gleiche Fassung wie in 20261103000300, dazu nur die Markierung für den Absender-Trigger (gilt bis Transaktionsende).
create or replace function intern.automation_als(p_person uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_person uuid;
  v_auth uuid;
begin
  select p.id, p.auth_user_id into v_person, v_auth from public.personen p
   where p.id = p_person and p.aktiv and p.geloescht_am is null and p.auth_user_id is not null;
  if v_auth is null then
    select p.id, p.auth_user_id into v_person, v_auth from public.personen p
      left join public.rollen r on r.schluessel = p.rolle
     where p.aktiv and p.geloescht_am is null and p.auth_user_id is not null
       and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}')))
     order by p.erstellt_am limit 1;
  end if;
  if v_auth is null then raise exception using errcode = 'P0001', message = 'automation.keine_person'; end if;
  perform set_config('request.jwt.claim.sub', v_auth::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_auth, 'role', 'authenticated')::text, true);
  perform set_config('intern.automation', 'an', true);
  return v_person;
end
$$;

-- Stammdaten: lesen alle, anlegen und ändern nur die Administration.
do $$
declare
  t text;
begin
  foreach t in array array['auswahlwerte', 'regionen', 'standorte', 'ablauf_vorlagen', 'ablauf_schritte', 'lagerorte'] loop
    execute format('drop policy if exists anlegen on public.%I', t);
    execute format('drop policy if exists aendern on public.%I', t);
    execute format('create policy anlegen on public.%I for insert to authenticated with check ((select intern.hat_recht(%L)))', t, 'admin');
    execute format('create policy aendern on public.%I for update to authenticated using ((select intern.hat_recht(%L))) with check ((select intern.hat_recht(%L)))', t, 'admin', 'admin');
  end loop;
end
$$;

revoke execute on function intern.einstellung_standard_schuetzen() from public, anon, authenticated;
revoke execute on function intern.ausgang_absender_pruefen() from public, anon, authenticated;
revoke execute on function intern.automation_als(uuid) from public, anon, authenticated;
