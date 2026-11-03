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
create policy lesen on public.posteingang for select to authenticated using (
  intern.hat_recht('basis')
  and (postfach_person_id is null
       or postfach_person_id = (select intern.meine_person_id())
       or zustaendig_id = (select intern.meine_person_id()))
);

CREATE OR REPLACE FUNCTION public.posteingang_setzen(p_id uuid, p_aktion text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cfg jsonb := intern.pe_einstellung();
  ich uuid := intern.meine_person_id();
  r public.posteingang;
  v_person uuid;
  v_art text;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht';
  end if;
  select * into r from public.posteingang x
   where x.id = p_id and x.geloescht_am is null
     and (x.postfach_person_id is null or x.postfach_person_id = ich or x.zustaendig_id = ich)
   for update;
  if not found then raise exception using message = 'posteingang.nicht_gefunden'; end if;

  if p_aktion = 'erledigt' then
    update public.posteingang
       set stand = 'erledigt', erledigt_am = now(), erledigt_von = ich, erledigt_grund = 'hand',
           reaktion_minuten = case when r.stand = 'offen' then intern.pe_arbeitsminuten(r.eingang_am, now(), cfg) end
     where id = p_id;
  elsif p_aktion = 'ablegen' then
    update public.posteingang set stand = 'abgelegt', erledigt_von = ich, erledigt_am = now() where id = p_id;
  elsif p_aktion = 'oeffnen' then
    update public.posteingang
       set stand = case when r.frist_am is not null then 'offen' when r.sortiert = 'offen' then 'neu' else 'info' end,
           art = case when r.stand = 'abgelegt' and r.art in ('werbung', 'intern', 'privat') then 'sonstiges' else r.art end,
           erledigt_am = null, erledigt_von = null, erledigt_grund = null, reaktion_minuten = null
     where id = p_id;
  elsif p_aktion = 'zuweisen' then
    v_person := nullif(p ->> 'person_id', '')::uuid;
    if not exists (select 1 from public.personen x where x.id = v_person and x.aktiv and x.geloescht_am is null) then
      raise exception using message = 'posteingang.person_fehlt';
    end if;
    update public.posteingang set zustaendig_id = v_person, vertretung_fuer = null, erinnert = least(erinnert, 1)
     where id = p_id returning * into r;
    if v_person <> ich then
      perform intern.pe_glocke(array[v_person], 'info', 'Mail an dich weitergegeben', 'E-mail qui t’a été transmis', r);
    end if;
  elsif p_aktion = 'art' then
    v_art := p ->> 'art';
    if v_art is null or v_art not in ('anfrage', 'stoerung', 'kunde', 'rechnung', 'lieferant', 'amt', 'monitor',
                                       'sonstiges', 'intern', 'werbung', 'privat') then
      raise exception using message = 'posteingang.art_unbekannt';
    end if;
    update public.posteingang
       set art = v_art, sortiert = 'hand',
           stand = case when r.stand = 'erledigt' then 'erledigt' else 'neu' end
     where id = p_id;
    perform intern.pe_zuordnen(p_id);
    if r.stand <> 'erledigt' then perform intern.pe_einordnen(p_id, true); end if;
  elsif p_aktion = 'verknuepfen' then
    update public.posteingang
       set kontakt_id = coalesce(nullif(p ->> 'kontakt_id', '')::uuid, kontakt_id),
           verkaufschance_id = coalesce(nullif(p ->> 'verkaufschance_id', '')::uuid, verkaufschance_id),
           service_fall_id = coalesce(nullif(p ->> 'service_fall_id', '')::uuid, service_fall_id),
           projekt_id = coalesce(nullif(p ->> 'projekt_id', '')::uuid, projekt_id),
           sichtbar = case when nullif(p ->> 'kontakt_id', '') is not null then 'team' else sichtbar end
     where id = p_id;
    perform intern.pe_zuordnen(p_id);
  else
    raise exception using message = 'posteingang.aktion_unbekannt';
  end if;
end
$function$;
