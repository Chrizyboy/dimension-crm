-- Phase 15: Handbuch (V233 Helpdesk: Anleitung, Prozesse, Videos, Meldungen), siehe Entscheid 0026.
-- Prozesse und Videos lesen alle; ablegen, neue Version und entfernen nur die Administration (V233: Chris und Loris).
-- Meldungen («Fehler melden») schreibt jede Person; sie sieht nur die eigenen, die Administration alle und antwortet.
-- Die Glocke meldet neue Meldungen der Administration und Antworten der meldenden Person.

-- ---------- Prozesse und Videos ----------

drop policy "anlegen" on public.handbuch_eintraege;
drop policy "aendern" on public.handbuch_eintraege;
create policy "anlegen" on public.handbuch_eintraege for insert to authenticated
  with check ((select intern.hat_recht('admin')));
create policy "aendern" on public.handbuch_eintraege for update to authenticated
  using ((select intern.hat_recht('admin'))) with check ((select intern.hat_recht('admin')));

alter table public.handbuch_eintraege add column sprache text check (sprache in ('de', 'fr'));
comment on column public.handbuch_eintraege.sprache is 'Nur Videos: in welcher Sprache gesprochen wird.';
comment on column public.handbuch_eintraege.versionen is
  'Frühere Fassungen eines Prozesses: [{version, datum, datei_de_id, datei_fr_id, ersetzt_am}], neueste zuletzt, höchstens 20.';

/**
 * Prozess oder Video ablegen oder ändern. Bei einem Prozess mit neuer Datei wandert die bisherige Fassung
 * nach «Frühere Versionen» (wie V233 przSave). Gleicher Titel wie ein bestehender Prozess ist ein Fehler:
 * dort «Neue Version» verwenden.
 */
create or replace function public.handbuch_speichern(
  p_id uuid, p_art text, p_titel_de text, p_beschreibung_de text, p_titel_fr text, p_beschreibung_fr text,
  p_version text, p_datum date, p_datei_de_id uuid, p_datei_fr_id uuid,
  p_sprache text default null, p_reihenfolge int default null, p_dauer_s int default null, p_vorschaubild_id uuid default null
) returns uuid
language plpgsql set search_path = '' as $$
declare
  alt public.handbuch_eintraege;
  neu_id uuid;
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'handbuch.kein_recht';
  end if;
  if coalesce(trim(p_titel_de), '') = '' then
    raise exception using errcode = 'P0001', message = 'handbuch.titel_fehlt';
  end if;
  if p_art not in ('prozess', 'video') then
    raise exception using errcode = 'P0001', message = 'handbuch.art';
  end if;

  if p_id is null then
    if p_datei_de_id is null then
      raise exception using errcode = 'P0001', message = 'handbuch.datei_fehlt';
    end if;
    if p_art = 'prozess' and exists (
      select 1 from public.handbuch_eintraege h
       where h.art = 'prozess' and h.geloescht_am is null and lower(trim(h.titel_de)) = lower(trim(p_titel_de))
    ) then
      raise exception using errcode = 'P0001', message = 'handbuch.doppelt';
    end if;
    insert into public.handbuch_eintraege (art, titel_de, beschreibung_de, titel_fr, beschreibung_fr, version, datum,
                                          datei_de_id, datei_fr_id, sprache, reihenfolge, dauer_s, vorschaubild_id)
    values (p_art, trim(p_titel_de), nullif(trim(p_beschreibung_de), ''), nullif(trim(p_titel_fr), ''),
            nullif(trim(p_beschreibung_fr), ''), nullif(trim(p_version), ''), p_datum, p_datei_de_id, p_datei_fr_id,
            p_sprache, p_reihenfolge, p_dauer_s, p_vorschaubild_id)
    returning id into neu_id;
    return neu_id;
  end if;

  select * into alt from public.handbuch_eintraege h where h.id = p_id and h.geloescht_am is null for update;
  if alt.id is null then
    raise exception using errcode = 'P0001', message = 'handbuch.nicht_gefunden';
  end if;

  update public.handbuch_eintraege h set
    titel_de = trim(p_titel_de),
    beschreibung_de = nullif(trim(p_beschreibung_de), ''),
    titel_fr = nullif(trim(p_titel_fr), ''),
    beschreibung_fr = nullif(trim(p_beschreibung_fr), ''),
    version = nullif(trim(p_version), ''),
    datum = coalesce(p_datum, h.datum),
    datei_de_id = coalesce(p_datei_de_id, h.datei_de_id),
    datei_fr_id = coalesce(p_datei_fr_id, h.datei_fr_id),
    sprache = p_sprache,
    reihenfolge = p_reihenfolge,
    dauer_s = coalesce(p_dauer_s, h.dauer_s),
    vorschaubild_id = coalesce(p_vorschaubild_id, h.vorschaubild_id),
    -- Neue Datei beim Prozess: die bisherige Fassung bleibt unter «Frühere Versionen» erreichbar.
    versionen = case
      when alt.art = 'prozess' and p_datei_de_id is not null and p_datei_de_id is distinct from alt.datei_de_id then
        (select coalesce(jsonb_agg(y.v order by y.n), '[]') from (
           select x.v, x.n from jsonb_array_elements(h.versionen || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
             'version', alt.version, 'datum', alt.datum, 'datei_de_id', alt.datei_de_id,
             'datei_fr_id', alt.datei_fr_id, 'ersetzt_am', now())))) with ordinality as x(v, n)
           order by x.n desc limit 20) y)
      else h.versionen end
  where h.id = p_id;
  return p_id;
end
$$;

/** Prozess oder Video entfernen: in den Papierkorb, die Datei bleibt im Speicher (wie V233). */
create or replace function public.handbuch_entfernen(p_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'handbuch.kein_recht';
  end if;
  update public.handbuch_eintraege set geloescht_am = now() where id = p_id and geloescht_am is null;
end
$$;

-- ---------- Meldungen («Fehler melden») ----------

alter table public.rueckmeldungen
  add column nummer int,
  add column titel text,
  add column erwartet text,
  add column bereich text,
  add column prio text not null default 'normal' check (prio in ('niedrig', 'normal', 'dringend')),
  add column umgebung text,
  add column person_id uuid references public.personen (id) default intern.meine_person_id(),
  add column beantwortet_am timestamptz;
alter table public.rueckmeldungen add constraint rueckmeldungen_status_check
  check (status in ('neu', 'arbeit', 'info', 'erledigt'));
create sequence public.rueckmeldungen_nummer;
alter table public.rueckmeldungen alter column nummer set default nextval('public.rueckmeldungen_nummer');
create unique index rueckmeldungen_nummer_idx on public.rueckmeldungen (nummer);
comment on column public.rueckmeldungen.status is 'neu, arbeit (in Arbeit), info (Rückfrage an die meldende Person), erledigt';

-- Jede Person sieht ihre eigenen Meldungen, die Administration alle.
drop policy "lesen" on public.rueckmeldungen;
drop policy "anlegen" on public.rueckmeldungen;
drop policy "aendern" on public.rueckmeldungen;
create policy "lesen" on public.rueckmeldungen for select to authenticated
  using ((select intern.hat_recht('admin')) or person_id = (select intern.meine_person_id()));
create policy "aendern" on public.rueckmeldungen for update to authenticated
  using ((select intern.hat_recht('admin'))) with check ((select intern.hat_recht('admin')));

/** Glocke für alle aktiven Personen mit Recht «admin», ausser der auslösenden. */
create or replace function intern.benachrichtige_admins(
  p_ausser uuid, p_art text, p_titel_de text, p_titel_fr text, p_text text, p_ziel text
) returns void
language sql security definer set search_path = '' as $$
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select p.id, p_art, p_titel_de, p_titel_fr, p_text, p_text, p_ziel
    from public.personen p left join public.rollen r on r.schluessel = p.rolle
   where p.aktiv and p.geloescht_am is null and p.id is distinct from p_ausser
     and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}')))
$$;

/**
 * Fehler oder Wunsch melden (V233 saveTicket): Nummer, Bereich, Dringlichkeit und Umgebung (Browser, Fenster,
 * Sprache) werden gespeichert, die Administration bekommt eine Meldung in der Glocke. Statt der Mail an
 * Chris und Loris aus V233 (Rechte-Regel: nichts geht ohne Freigabe nach aussen).
 */
create or replace function public.rueckmeldung_melden(
  p_titel text, p_text text, p_erwartet text, p_bereich text, p_prio text, p_umgebung text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  r public.rueckmeldungen;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'handbuch.kein_recht';
  end if;
  if coalesce(trim(p_titel), '') = '' then
    raise exception using errcode = 'P0001', message = 'handbuch.titel_fehlt';
  end if;
  if coalesce(trim(p_text), '') = '' then
    raise exception using errcode = 'P0001', message = 'handbuch.text_fehlt';
  end if;
  insert into public.rueckmeldungen (titel, text, erwartet, bereich, prio, umgebung, person_id, erstellt_von)
  values (trim(p_titel), trim(p_text), nullif(trim(p_erwartet), ''), nullif(p_bereich, ''),
          coalesce(nullif(p_prio, ''), 'normal'), left(p_umgebung, 300), ich, auth.uid())
  returning * into r;
  perform intern.benachrichtige_admins(
    ich, case when r.prio = 'dringend' then 'kritisch' else 'info' end,
    'Neue Meldung T' || lpad(r.nummer::text, 3, '0') || ': ' || r.titel,
    'Nouveau signalement T' || lpad(r.nummer::text, 3, '0') || ' : ' || r.titel,
    (select p.name from public.personen p where p.id = ich),
    '/knowledge?ansicht=meldungen&meldung=' || r.id);
  return jsonb_build_object('id', r.id, 'nummer', r.nummer);
end
$$;

/** Status setzen und antworten (nur Administration). Die meldende Person sieht die Antwort und bekommt eine Glocke. */
create or replace function public.rueckmeldung_beantworten(p_id uuid, p_status text, p_antwort text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.rueckmeldungen;
  neu_antwort text := nullif(trim(p_antwort), '');
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'handbuch.kein_recht';
  end if;
  select * into r from public.rueckmeldungen m where m.id = p_id and m.geloescht_am is null for update;
  if r.id is null then
    raise exception using errcode = 'P0001', message = 'handbuch.nicht_gefunden';
  end if;
  update public.rueckmeldungen m set
    status = p_status,
    antwort = neu_antwort,
    antwort_von = case when neu_antwort is distinct from r.antwort
                       then (select p.name from public.personen p where p.id = intern.meine_person_id())
                       else m.antwort_von end,
    beantwortet_am = case when neu_antwort is distinct from r.antwort then now() else m.beantwortet_am end
  where m.id = p_id;
  if r.person_id is not null and r.person_id is distinct from intern.meine_person_id()
     and (neu_antwort is distinct from r.antwort or p_status is distinct from r.status) then
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    values (r.person_id, case when p_status = 'erledigt' then 'ok' else 'info' end,
            'Antwort auf deine Meldung T' || lpad(r.nummer::text, 3, '0'),
            'Réponse à ton signalement T' || lpad(r.nummer::text, 3, '0'),
            coalesce(neu_antwort, r.titel), coalesce(neu_antwort, r.titel),
            '/knowledge?ansicht=meldungen&meldung=' || r.id);
  end if;
end
$$;

revoke execute on function public.handbuch_speichern(uuid, text, text, text, text, text, text, date, uuid, uuid, text, int, int, uuid) from public, anon;
revoke execute on function public.handbuch_entfernen(uuid) from public, anon;
revoke execute on function public.rueckmeldung_melden(text, text, text, text, text, text) from public, anon;
revoke execute on function public.rueckmeldung_beantworten(uuid, text, text) from public, anon;
revoke execute on function intern.benachrichtige_admins(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.handbuch_speichern(uuid, text, text, text, text, text, text, date, uuid, uuid, text, int, int, uuid) to authenticated;
grant execute on function public.handbuch_entfernen(uuid) to authenticated;
grant execute on function public.rueckmeldung_melden(text, text, text, text, text, text) to authenticated;
grant execute on function public.rueckmeldung_beantworten(uuid, text, text) to authenticated;

-- Video aus dem Import: gesprochene Sprache Deutsch (V233 «sprache»).
update public.handbuch_eintraege set sprache = coalesce(alt_daten ->> 'sprache', 'de') where art = 'video' and sprache is null;
