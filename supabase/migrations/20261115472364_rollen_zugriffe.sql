-- Zugriffe nach der Abhak-Liste (Chris 2.11.2026), Teil 2:
--   * Arbeitszeiten aller sehen und prüfen nur mit «personal» (GL, Buchhaltung) oder «finanzen»; die direkte
--     Vorgesetzte bzw. der direkte Vorgesetzte (personal_akten.vorgesetzt_id) sieht die eigenen Mitarbeitenden.
--   * Abwesenheiten aller erfassen mit «planung» (GL, Buchhaltung); Vorgesetzte für die eigenen Mitarbeitenden.
--   * Posteingang: eigenes Postfach und Team-Postfächer, nie das persönliche Postfach anderer.
--   * Anmeldung liefert die wirksamen Rechte; mit «gl» sind alle Bereiche sichtbar.

CREATE OR REPLACE FUNCTION public.meine_anmeldung()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_person public.personen;
  v_rolle public.rollen;
begin
  select * into v_person from public.personen
  where auth_user_id = auth.uid() and aktiv and geloescht_am is null;
  if not found then
    return null;
  end if;
  select * into v_rolle from public.rollen where schluessel = v_person.rolle;

  -- Höchstens alle 15 Minuten, damit das Protokoll nicht mit Anmeldungen vollläuft.
  if v_person.zuletzt_aktiv is null or v_person.zuletzt_aktiv < now() - interval '15 minutes' then
    update public.personen set zuletzt_aktiv = now() where id = v_person.id;
  end if;

  return jsonb_build_object(
    'id', v_person.id,
    'kuerzel', v_person.kuerzel,
    'name', v_person.name,
    'email', v_person.email,
    'rolle', v_person.rolle,
    'rolle_name', jsonb_build_object('de', v_rolle.name_de, 'fr', v_rolle.name_fr),
    'rechte', to_jsonb(intern.wirksame_rechte(v_person.id)),
    'bereiche', to_jsonb(case when 'gl' = any (intern.wirksame_rechte(v_person.id)) then '{}'::text[]
                              when cardinality(v_person.bereiche) > 0 then v_person.bereiche
                              else coalesce(v_rolle.bereiche, '{}') end),
    'ansicht', coalesce(v_rolle.ansicht, 'voll'),
    'sprache', v_person.sprache,
    'darstellung', v_person.darstellung,
    'standort_id', v_person.standort_id,
    'profil', v_person.profil
  );
end;
$function$;

-- ---------- Arbeitszeiten ----------
drop policy "lesen" on public.zeiten;
drop policy "anlegen" on public.zeiten;
drop policy "aendern" on public.zeiten;
create policy "lesen" on public.zeiten for select to authenticated using (
  person_id = (select intern.meine_person_id()) or (select intern.hat_recht('personal'))
  or (select intern.hat_recht('finanzen')) or intern.ist_vorgesetzt(person_id));
create policy "anlegen" on public.zeiten for insert to authenticated with check (
  (select intern.hat_recht('basis'))
  and (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('personal'))));
create policy "aendern" on public.zeiten for update to authenticated
  using (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('personal'))
         or (select intern.hat_recht('finanzen')))
  with check (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('personal'))
              or (select intern.hat_recht('finanzen')));

/** Zeiten als geprüft markieren: GL und Buchhaltung («personal» oder «finanzen»). */
create or replace function public.zeiten_pruefen(p_ids uuid[])
returns integer
language plpgsql set search_path = '' as $$
declare
  v_n int;
begin
  if not (intern.hat_recht('personal') or intern.hat_recht('finanzen')) then
    raise exception using errcode = 'P0001', message = 'baustelle.recht_fehlt';
  end if;
  update public.zeiten set freigegeben_am = now(), freigegeben_von = intern.meine_person_id()
   where id = any (p_ids) and stopp is not null and exportiert_am is null and freigegeben_am is null and geloescht_am is null;
  get diagnostics v_n = row_count;
  return v_n;
end
$$;

/** Geprüfte Zeiten ändern nur «personal» oder «finanzen»; danach ist die Prüfung wieder offen. */
create or replace function intern.zeit_pruefen()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.exportiert_am is not null and new.exportiert_am is not null then
    raise exception using errcode = 'P0001', message = 'baustelle.zeit_exportiert';
  end if;
  if old.freigegeben_am is not null and new.freigegeben_am is not null
     and (new.start, new.stopp, new.pause_min, new.person_id, new.geloescht_am)
         is distinct from (old.start, old.stopp, old.pause_min, old.person_id, old.geloescht_am) then
    if not (intern.hat_recht('personal') or intern.hat_recht('finanzen')) then
      raise exception using errcode = 'P0001', message = 'baustelle.zeit_geprueft';
    end if;
    new.freigegeben_am := null;
    new.freigegeben_von := null;
  end if;
  return new;
end
$$;

-- ---------- Abwesenheiten ----------
drop policy "anlegen" on public.abwesenheiten;
drop policy "aendern" on public.abwesenheiten;
create policy "anlegen" on public.abwesenheiten for insert to authenticated with check (
  person_id = (select intern.meine_person_id()) or (select intern.hat_recht('planung')) or intern.ist_vorgesetzt(person_id));
create policy "aendern" on public.abwesenheiten for update to authenticated
  using (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('planung')) or intern.ist_vorgesetzt(person_id))
  with check (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('planung')) or intern.ist_vorgesetzt(person_id));

/** Darf die angemeldete Person für diese Person Abwesenheiten erfassen? Für die Anzeige in der App. */
create or replace function public.darf_abwesenheit_erfassen(p_person uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select p_person = intern.meine_person_id() or intern.hat_recht('planung') or intern.ist_vorgesetzt(p_person)
$$;
revoke execute on function public.darf_abwesenheit_erfassen(uuid) from public, anon;
grant execute on function public.darf_abwesenheit_erfassen(uuid) to authenticated;

/** Personen, für die die angemeldete Person Vorgesetzte bzw. Vorgesetzter ist. */
create or replace function public.meine_mitarbeitenden()
returns setof uuid
language sql stable security definer set search_path = '' as $$
  select a.person_id from public.personal_akten a
   where a.vorgesetzt_id = intern.meine_person_id() and a.geloescht_am is null
$$;
revoke execute on function public.meine_mitarbeitenden() from public, anon;
grant execute on function public.meine_mitarbeitenden() to authenticated;

-- ---------- Posteingang ----------
drop policy lesen on public.posteingang;
-- Wer in einer Notiz erwähnt ist, darf genau diese Mail lesen (die Besitzerin teilt sie bewusst).
-- security definer, damit sich die Regeln von posteingang und posteingang_notizen nicht gegenseitig aufrufen.
create or replace function intern.pe_erwaehnt(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.posteingang_notizen n
                  where n.posteingang_id = p_id and n.geloescht_am is null
                    and intern.meine_person_id() = any (n.erwaehnt))
$$;

create policy lesen on public.posteingang for select to authenticated using (
  intern.hat_recht('basis')
  and (postfach_person_id is null
       or postfach_person_id = (select intern.meine_person_id())
       or zustaendig_id = (select intern.meine_person_id())
       or intern.pe_erwaehnt(id))
);

-- Mails aus einem persönlichen Postfach bleiben persönlich (Chris 2.11.: nie das Postfach anderer), auch wenn
-- sie einem Kunden zugeordnet sind. Die Funktionen des Posteingangs prüfen «sichtbar = 'team'»; darum hält ein
-- Trigger «sichtbar» für persönliche Postfächer auf 'person', statt die Funktionen hier neu zu fassen.
create or replace function intern.pe_nur_eigenes_postfach() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.postfach_person_id is not null then new.sichtbar := 'person'; end if;
  return new;
end
$$;
create trigger pe_nur_eigenes_postfach before insert or update of sichtbar, postfach_person_id on public.posteingang
  for each row execute function intern.pe_nur_eigenes_postfach();
update public.posteingang set sichtbar = 'person' where postfach_person_id is not null and sichtbar <> 'person';
