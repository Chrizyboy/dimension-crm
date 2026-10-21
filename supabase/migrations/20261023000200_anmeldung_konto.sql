-- Phase 4, Teil 2: Wer darf sich anmelden, wer darf Benutzer ändern, was darf man im Protokoll sehen.

-- 1. Benutzer und Rollen ändert nur die Administration. In Phase 3 durfte jede Person «personen»
--    ändern, auch die eigene Rolle; das schliessen wir hier. Das eigene Profil geht über aendere_mein_konto().
drop policy anlegen on public.personen;
drop policy aendern on public.personen;
create policy anlegen on public.personen for insert to authenticated with check (intern.hat_recht('admin'));
create policy aendern on public.personen for update to authenticated
  using (intern.hat_recht('admin')) with check (intern.hat_recht('admin'));

drop policy anlegen on public.rollen;
drop policy aendern on public.rollen;
create policy anlegen on public.rollen for insert to authenticated with check (intern.hat_recht('admin'));
create policy aendern on public.rollen for update to authenticated
  using (intern.hat_recht('admin')) with check (intern.hat_recht('admin'));

-- 2. Es bleibt immer mindestens eine aktive Person mit Administrationsrecht,
--    sonst könnte sich das Team aus der Benutzerverwaltung aussperren.
create or replace function intern.ist_admin(p public.personen)
returns boolean
language sql
stable
as $$
  select p.aktiv and p.geloescht_am is null and (
    'admin' = any (p.rechte)
    or exists (select 1 from public.rollen r where r.schluessel = p.rolle and 'admin' = any (r.rechte))
  )
$$;

create or replace function intern.behalte_einen_admin()
returns trigger
language plpgsql
as $$
begin
  if intern.ist_admin(old) and not intern.ist_admin(new) and not exists (
    select 1 from public.personen p where p.id <> old.id and intern.ist_admin(p)
  ) then
    raise exception 'Mindestens eine Person muss Administrationsrechte behalten.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger behalte_einen_admin before update on public.personen
  for each row execute function intern.behalte_einen_admin();
-- Auch Server-Funktionen und der Import (service_role) laufen durch diese Prüfung.
grant usage on schema intern to service_role;

-- 3. Änderungsprotokoll: Jede Zeile ist nur für Personen lesbar, die die Tabelle selbst lesen dürfen.
--    Sonst stünden z. B. Kreditor-Zahlungen im Protokoll für alle offen.
create table intern.tabellen_leserecht (
  tabelle text primary key,
  recht   text not null
);
insert into intern.tabellen_leserecht (tabelle, recht)
select tablename, (regexp_match(qual, 'hat_recht\(''(\w+)''::text\)'))[1]
from pg_policies
where schemaname = 'public' and policyname = 'lesen' and qual like '%hat_recht%';
grant select on intern.tabellen_leserecht to authenticated;

-- Neue Fachtabellen tragen ihr Leserecht künftig selbst ein (gleiche Einrichtung wie in Phase 3, plus Eintrag).
create or replace function intern.richte_fachtabelle_ein(p_tabelle text, p_recht text default 'basis')
returns void
language plpgsql
as $$
begin
  execute format($f$
    alter table public.%1$I
      add column if not exists erstellt_am  timestamptz not null default now(),
      add column if not exists erstellt_von uuid default auth.uid(),
      add column if not exists geaendert_am timestamptz not null default now(),
      add column if not exists geloescht_am timestamptz,
      -- Herkunft aus der Vorlage V233: alte ID und der vollständige alte Datensatz,
      -- damit beim Import nie ein Feld verloren geht.
      add column if not exists alt_id   text unique,
      add column if not exists alt_daten jsonb
  $f$, p_tabelle);
  execute format('create trigger protokoll after insert or update or delete on public.%I
                  for each row execute function intern.protokolliere()', p_tabelle);
  execute format('create trigger geaendert before update on public.%I
                  for each row execute function intern.setze_geaendert_am()', p_tabelle);
  execute format('alter table public.%I enable row level security', p_tabelle);
  execute format('create policy lesen on public.%I for select to authenticated using (intern.hat_recht(%L))', p_tabelle, p_recht);
  execute format('create policy anlegen on public.%I for insert to authenticated with check (intern.hat_recht(%L))', p_tabelle, p_recht);
  -- Seit Phase 4: Leserecht merken, damit das Änderungsprotokoll dieselbe Regel anwendet.
  insert into intern.tabellen_leserecht (tabelle, recht) values (p_tabelle, p_recht)
    on conflict (tabelle) do update set recht = excluded.recht;
  execute format('create policy aendern on public.%I for update to authenticated using (intern.hat_recht(%L)) with check (intern.hat_recht(%L))', p_tabelle, p_recht, p_recht);
end;
$$;

drop policy "angemeldete lesen protokoll" on public.aenderungsprotokoll;
create policy lesen on public.aenderungsprotokoll for select to authenticated using (
  intern.hat_recht(coalesce((select l.recht from intern.tabellen_leserecht l where l.tabelle = aenderungsprotokoll.tabelle), 'admin'))
);

-- 4. Anmeldung nur für erfasste, aktive Mitarbeitende. Supabase ruft diese Funktion auf,
--    bevor ein Konto entsteht (auch beim ersten Microsoft-Login). Fremde Adressen bekommen kein Konto.
create or replace function intern.vor_konto_anlage(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(event -> 'user' ->> 'email'));
begin
  if v_email is not null and exists (
    select 1 from public.personen p where p.email = v_email and p.aktiv and p.geloescht_am is null
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Diese E-Mail-Adresse ist im CRM nicht freigeschaltet. / Cette adresse e-mail n’est pas autorisée.'
  ));
end;
$$;
grant usage on schema intern to supabase_auth_admin;
grant execute on function intern.vor_konto_anlage(jsonb) to supabase_auth_admin;
revoke execute on function intern.vor_konto_anlage(jsonb) from public, anon, authenticated;

-- 5. Neues Login-Konto mit der Person verknüpfen. Die Einladung gilt erst als angenommen,
--    wenn sich die Person wirklich anmeldet (eine Einladung legt das Konto schon vorher an).
create or replace function intern.verknuepfe_person()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.personen set auth_user_id = new.id
    where email = lower(new.email) and auth_user_id is null and geloescht_am is null;
  end if;
  if new.last_sign_in_at is not null then
    update public.einladungen set verwendet_am = new.last_sign_in_at
    where email = lower(new.email) and verwendet_am is null and widerrufen_am is null;
  end if;
  return new;
end;
$$;
create trigger verknuepfe_person after insert or update of last_sign_in_at on auth.users
  for each row execute function intern.verknuepfe_person();

-- 6. Was die App nach der Anmeldung braucht: wer bin ich, welche Rechte und Bereiche habe ich.
--    «bereiche» leer heisst: alle Bereiche. Persönliche Auswahl geht vor der Auswahl der Rolle.
create or replace function public.meine_anmeldung()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    'rechte', (select coalesce(jsonb_agg(distinct r), '[]') from unnest(v_person.rechte || coalesce(v_rolle.rechte, '{}')) r),
    'bereiche', to_jsonb(case when cardinality(v_person.bereiche) > 0 then v_person.bereiche else coalesce(v_rolle.bereiche, '{}') end),
    'sprache', v_person.sprache,
    'darstellung', v_person.darstellung,
    'standort_id', v_person.standort_id,
    'profil', v_person.profil
  );
end;
$$;
revoke execute on function public.meine_anmeldung() from public, anon;
grant execute on function public.meine_anmeldung() to authenticated;

-- 7. «Mein Konto»: Jede Person ändert nur ihr eigenes Profil und nur diese Felder.
--    Rolle, Rechte, E-Mail und Name bleiben bei der Administration.
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
  v_erlaubt constant text[] := array[
    'position', 'funktion', 'pensum', 'tage', 'direkt', 'mobil', 'sprachen',
    'strasse', 'plz', 'ort', 'notfallName', 'notfallTel', 'routeStart'
  ];
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
revoke execute on function public.aendere_mein_konto(jsonb, text, text, uuid) from public, anon;
grant execute on function public.aendere_mein_konto(jsonb, text, text, uuid) to authenticated;

update public.app_info set wert = '3' where schluessel = 'schema_version';
update public.app_info set wert = '4' where schluessel = 'phase';
