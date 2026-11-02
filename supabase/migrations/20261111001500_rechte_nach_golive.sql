-- Rechte nach dem Go-live (Modul-Prüfung 33A):
--   1. Privatadresse, Notfallkontakt und Pensum gehören in die Personal-Akte (nur die Person und die Administration),
--      nicht mehr ins Profil, das alle lesen.
--   2. Freigabe im Ausgangskorb je Art: Newsletter nur Administration, Mahnungen und Zahlungserinnerungen nur
--      Finanzen, alles andere die Absenderin oder der Absender selbst (oder die Stellvertretung bei Abwesenheit).
--   3. Abwesenheiten erfassen und ändern nur die Person selbst, die Planung oder die Administration.
-- Bewusst keine Trennung der Daten nach Bereich: alle sehen weiterhin dieselben Kunden und Projekte.

-- ---------- 1. Privates aus dem Profil in die Personal-Akte ----------

alter table public.personal_akten
  add column strasse text,
  add column plz text check (plz ~ '^\d{4}$'),
  add column ort text;
comment on column public.personal_akten.strasse is 'Privatadresse (Start der Tagesroute im Aussendienst, siehe aussendienst_heim).';

/**
 * Verschiebt private Angaben aus personen.profil in die Personal-Akte: beim Umzug einmal für alle, danach bei jedem
 * Import oder alten Aufruf, der sie noch ins Profil schreibt. Was in der Akte schon steht, bleibt.
 */
create or replace function intern.profil_privat_verschieben() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p jsonb := new.profil;
  t text := nullif(trim(p ->> 'pensum'), '');
  v_pensum int := case when t ~ '\d' then substring(t from '(\d{1,3})')::int end;
begin
  if v_pensum not between 1 and 100 then v_pensum := null; end if;
  insert into public.personal_akten as a (person_id, strasse, plz, ort, notfall_name, notfall_telefon, pensum)
  values (new.id, nullif(trim(p ->> 'strasse'), ''),
          case when trim(p ->> 'plz') ~ '^\d{4}$' then trim(p ->> 'plz') end,
          nullif(trim(p ->> 'ort'), ''), nullif(trim(p ->> 'notfallName'), ''), nullif(trim(p ->> 'notfallTel'), ''),
          v_pensum)
  on conflict (person_id) where geloescht_am is null do update set
    strasse = coalesce(a.strasse, excluded.strasse),
    plz = coalesce(a.plz, excluded.plz),
    ort = coalesce(a.ort, excluded.ort),
    notfall_name = coalesce(a.notfall_name, excluded.notfall_name),
    notfall_telefon = coalesce(a.notfall_telefon, excluded.notfall_telefon),
    pensum = coalesce(a.pensum, excluded.pensum);
  update public.personen
     set profil = profil - array['strasse', 'plz', 'ort', 'notfallName', 'notfallTel', 'pensum']
   where id = new.id;
  return null;
end
$$;
create trigger profil_privat after insert or update of profil on public.personen
  for each row when (new.profil ?| array['strasse', 'plz', 'ort', 'notfallName', 'notfallTel', 'pensum'])
  execute function intern.profil_privat_verschieben();

-- Einmal für alle, die schon Angaben im Profil haben (die Migration läuft ohne Anmeldung, der Schutz der
-- Akte lässt Pensum darum zu).
update public.personen set profil = profil
 where profil ?| array['strasse', 'plz', 'ort', 'notfallName', 'notfallTel', 'pensum'];

-- «Mein Konto» nimmt nur noch die öffentlichen Angaben an; Privates füllt man in der Personal-Akte.
create or replace function public.aendere_mein_konto(
  p_profil jsonb,
  p_sprache text default null,
  p_darstellung text default null,
  p_standort_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_erlaubt constant text[] := array['position', 'funktion', 'tage', 'direkt', 'mobil', 'sprachen', 'routeStart'];
  v_unbekannt text;
begin
  select k into v_unbekannt from jsonb_object_keys(coalesce(p_profil, '{}')) k where k <> all (v_erlaubt) limit 1;
  if v_unbekannt is not null then
    raise exception 'Feld «%» kann in «Mein Konto» nicht geändert werden.', v_unbekannt using errcode = '22023';
  end if;

  update public.personen set
    profil = profil || coalesce(p_profil, '{}') || jsonb_build_object('updatedAt', now(), 'updatedBy', kuerzel),
    sprache = coalesce(p_sprache, sprache),
    darstellung = coalesce(p_darstellung, darstellung),
    standort_id = coalesce(p_standort_id, standort_id)
  where auth_user_id = auth.uid() and aktiv and geloescht_am is null;
  if not found then
    raise exception 'Kein aktives Benutzerkonto gefunden.' using errcode = '42501';
  end if;
end;
$$;

drop view public.personal_akten_sicht;
create view public.personal_akten_sicht with (security_invoker = true) as
select a.id, a.person_id, a.eintritt, a.austritt, a.pensum, a.geburtsdatum, a.telefon_privat, a.notfall_name,
       a.notfall_telefon, a.kleidergroesse, a.schuhgroesse,
       case when intern.hat_recht('admin') then a.notiz end as notiz, a.geaendert_am, a.strasse, a.plz, a.ort
  from public.personal_akten a
 where a.geloescht_am is null;
grant select on public.personal_akten_sicht to authenticated;

/**
 * Heimadresse der Personen im Aussendienst, für Tagesroute und «Termin bei». Nur diese drei Felder und nur für
 * den Aussendienst; der Rest der Akte bleibt privat.
 */
create or replace function public.aussendienst_heim()
returns table (person_id uuid, strasse text, plz text, ort text)
language sql stable security definer set search_path = '' as $$
  select a.person_id, a.strasse, a.plz, a.ort
    from public.personal_akten a join public.personen p on p.id = a.person_id
   where intern.hat_recht('basis') and a.geloescht_am is null and a.plz is not null
     and p.aussendienst and p.aktiv and p.geloescht_am is null
$$;
revoke execute on function public.aussendienst_heim() from public, anon;
grant execute on function public.aussendienst_heim() to authenticated;

-- ---------- 2. Freigabe im Ausgangskorb je Art ----------

-- Neues Recht «Planung» (Abwesenheiten aller, Einsatzplanung). Rechte kommen nur mit einer Migration dazu.
alter table public.rollen drop constraint rollen_rechte_gueltig;
alter table public.rollen add constraint rollen_rechte_gueltig
  check (rechte <@ array['basis', 'preise', 'finanzen', 'planung', 'admin']);
alter table public.personen drop constraint personen_rechte_gueltig;
alter table public.personen add constraint personen_rechte_gueltig
  check (rechte <@ array['basis', 'preise', 'finanzen', 'planung', 'admin']);
update public.rollen set rechte = array_append(rechte, 'planung')
 where schluessel in ('projektleitung', 'innendienst') and not 'planung' = any (rechte);

-- Wer welche Art im Ausgangskorb freigeben darf (Recht je Art). Alle anderen Arten: die Absenderin oder der
-- Absender selbst, bei Abwesenheit die Stellvertretung, und die Administration.
insert into public.einstellungen (schluessel, wert)
values ('ausgang_freigabe', '{"newsletter": "admin", "mahnung": "finanzen", "zahlungserinnerung": "finanzen"}')
on conflict (schluessel) do nothing;

/**
 * Darf die angemeldete Person diesen Eintrag freigeben? Administration, Zeitplan und Automationen immer. Sonst das
 * Recht, das `einstellungen.ausgang_freigabe` für die Art nennt; ohne Eintrag beim Freigeben eines wartenden Eintrags
 * nur die Absenderin oder der Absender selbst bzw. die Stellvertretung (Einträge ohne Absender alle).
 */
create or replace function intern.ausgang_freigabe_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_recht text;
  v_ich uuid;
begin
  if new.status <> 'freigegeben' or (tg_op = 'UPDATE' and old.status = 'freigegeben')
     or auth.uid() is null or coalesce(auth.role(), '') = 'service_role'
     or coalesce(current_setting('intern.automation', true), '') = 'an'
     or intern.hat_recht('admin') then
    return new;
  end if;
  select e.wert ->> new.art into v_recht from public.einstellungen e where e.schluessel = 'ausgang_freigabe';
  if v_recht is not null then
    if intern.hat_recht(v_recht) then return new; end if;
  elsif tg_op = 'INSERT' then
    -- Beim Anlegen prüft schon «absender_pruefen», dass niemand im Namen anderer sendet.
    return new;
  else
    v_ich := intern.meine_person_id();
    if new.absender_person_id is null or new.absender_person_id = v_ich
       or intern.pe_vertretung(new.absender_person_id,
                               (select e.wert from public.einstellungen e where e.schluessel = 'posteingang')) = v_ich then
      return new;
    end if;
  end if;
  raise exception using errcode = '42501', message = 'ausgang.freigabe_kein_recht';
end
$$;
create trigger freigabe_pruefen before insert or update of status on public.ausgangskorb
  for each row execute function intern.ausgang_freigabe_pruefen();

-- ---------- 3. Abwesenheiten: die Person selbst, Planung oder Administration ----------

drop policy "anlegen" on public.abwesenheiten;
drop policy "aendern" on public.abwesenheiten;
create policy "anlegen" on public.abwesenheiten for insert to authenticated
  with check (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('planung')));
create policy "aendern" on public.abwesenheiten for update to authenticated
  using (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('planung')))
  with check (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('planung')));
