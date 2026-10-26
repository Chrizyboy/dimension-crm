-- Phase 17, Teil 2: Kurse und Ausweise (wer darf was) und die Personal-Akte. Dazu die Fristen aller Bereiche
-- (MFK, Service, Prüfung, Ausweis) in einer Sicht und die Erinnerung vom Zeitplan (Entscheid 0028).
-- Arten und Gültigkeit sind Daten (Auswahlliste «qualifikation»): «pflicht_fuer» nennt die Rollen, die den
-- Ausweis haben müssen, «gueltig_monate» schlägt das Ablaufdatum vor.

-- ---------- Auswahlliste ----------

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, eigenschaften) values
  ('qualifikation', 'absturzsicherung', 'Absturzsicherung (PSAgA)', 'Protection antichute (EPIaC)', 10,
   '{"gueltig_monate": 24, "pflicht_fuer": ["montage"]}'),
  ('qualifikation', 'erste_hilfe', 'Erste Hilfe', 'Premiers secours', 20, '{"gueltig_monate": 24}'),
  ('qualifikation', 'elektro_niv', 'Elektro-Bewilligung (NIV)', 'Autorisation électrique (OIBT)', 30, '{}'),
  ('qualifikation', 'fuehrerausweis_b', 'Führerausweis B', 'Permis B', 40, '{}'),
  ('qualifikation', 'fuehrerausweis_be', 'Führerausweis BE (Anhänger)', 'Permis BE (remorque)', 50, '{}'),
  ('qualifikation', 'fuehrerausweis_c1', 'Führerausweis C1', 'Permis C1', 60, '{}'),
  ('qualifikation', 'hebebuehne', 'Hebebühne (IPAF)', 'Nacelle (IPAF)', 70, '{"gueltig_monate": 60}'),
  ('qualifikation', 'stapler', 'Stapler', 'Chariot élévateur', 80, '{}'),
  ('qualifikation', 'asbest', 'Asbest erkennen', 'Reconnaître l''amiante', 90, '{}'),
  ('qualifikation', 'kopas', 'KOPAS (Arbeitssicherheit)', 'PERCO (sécurité au travail)', 100, '{}');

-- ---------- Kurse und Ausweise ----------

-- Lesen alle (Matrix «wer darf was» für die Einsatzplanung); ändern die Administration oder die Person selbst.
create table public.qualifikationen (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.personen (id),
  art          text not null,                      -- Auswahlliste «qualifikation»
  bezeichnung  text,                               -- genauer Kursname, falls nötig
  erworben_am  date,
  gueltig_bis  date,                               -- leer = unbefristet
  aussteller   text,
  datei_pfad   text,                               -- Bucket «personal», Ordner = Person
  notiz        text,
  constraint qualifikationen_daten check (gueltig_bis is null or erworben_am is null or gueltig_bis >= erworben_am)
);
select intern.richte_fachtabelle_ein('qualifikationen');
drop policy "anlegen" on public.qualifikationen;
drop policy "aendern" on public.qualifikationen;
create policy "anlegen" on public.qualifikationen for insert to authenticated
  with check ((select intern.hat_recht('admin')) or person_id = (select intern.meine_person_id()));
create policy "aendern" on public.qualifikationen for update to authenticated
  using ((select intern.hat_recht('admin')) or person_id = (select intern.meine_person_id()))
  with check ((select intern.hat_recht('admin')) or person_id = (select intern.meine_person_id()));
create index qualifikationen_person on public.qualifikationen (person_id, art) where geloescht_am is null;
comment on table public.qualifikationen is 'Kurse und Ausweise je Person (Phase 17). Der neuste Eintrag einer Art gilt.';

-- ---------- Personal-Akte ----------

-- Persönliches: sehen und ändern nur die Administration und die Person selbst (auch nicht Projektleitung).
create table public.personal_akten (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references public.personen (id),
  eintritt         date,
  austritt         date,
  pensum           int check (pensum between 1 and 100),
  geburtsdatum     date,
  telefon_privat   text,
  notfall_name     text,
  notfall_telefon  text,
  kleidergroesse   text,
  schuhgroesse     text,
  notiz            text,                           -- nur Administration (die App zeigt es der Person nicht)
  constraint personal_akten_daten check (austritt is null or eintritt is null or austritt >= eintritt)
);
select intern.richte_fachtabelle_ein('personal_akten', 'admin');
create unique index personal_akten_person on public.personal_akten (person_id) where geloescht_am is null;
create policy "selbst lesen" on public.personal_akten for select to authenticated
  using (person_id = (select intern.meine_person_id()));
create policy "selbst anlegen" on public.personal_akten for insert to authenticated
  with check (person_id = (select intern.meine_person_id()));
create policy "selbst aendern" on public.personal_akten for update to authenticated
  using (person_id = (select intern.meine_person_id())) with check (person_id = (select intern.meine_person_id()));
comment on table public.personal_akten is 'Personal-Akte (Phase 17): nur Administration und die Person selbst. Lohn bleibt in AbaNinja.';

-- Die Person selbst darf Notiz, Eintritt, Austritt und Pensum nicht ändern; das bleibt der Administration.
create or replace function intern.personal_akte_selbst() returns trigger
language plpgsql set search_path = '' as $$
begin
  if intern.hat_recht('admin') or coalesce(auth.role(), '') = 'service_role' or auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.notiz := null; new.eintritt := null; new.austritt := null; new.pensum := null;
  else
    new.notiz := old.notiz; new.eintritt := old.eintritt; new.austritt := old.austritt; new.pensum := old.pensum;
    new.geloescht_am := old.geloescht_am;
  end if;
  return new;
end
$$;
create trigger selbst before insert or update on public.personal_akten
  for each row execute function intern.personal_akte_selbst();

-- Die Notiz der Administration sieht nur die Administration: Die App liest die Akte über diese Sicht.
create view public.personal_akten_sicht with (security_invoker = true) as
select a.id, a.person_id, a.eintritt, a.austritt, a.pensum, a.geburtsdatum, a.telefon_privat, a.notfall_name,
       a.notfall_telefon, a.kleidergroesse, a.schuhgroesse,
       case when intern.hat_recht('admin') then a.notiz end as notiz, a.geaendert_am
  from public.personal_akten a
 where a.geloescht_am is null;
grant select on public.personal_akten_sicht to authenticated;

-- ---------- Dateien (Kursbestätigungen, Ausweis-Kopien) ----------

insert into storage.buckets (id, name, public) values ('personal', 'personal', false)
on conflict (id) do nothing;
create policy "personal lesen" on storage.objects for select to authenticated
  using (bucket_id = 'personal' and (intern.hat_recht('admin')
         or (storage.foldername(name))[1] = intern.meine_person_id()::text));
create policy "personal hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'personal' and (intern.hat_recht('admin')
              or (storage.foldername(name))[1] = intern.meine_person_id()::text));

-- ---------- Fristen aller Bereiche ----------

/**
 * Alle Fristen an einem Ort: MFK und Service der Fahrzeuge, Prüfungen der Geräte, ablaufende Ausweise (nur der
 * neuste je Person und Art zählt). Mit den Rechten der lesenden Person (security_invoker).
 */
create view public.fristen with (security_invoker = true) as
select 'mfk'::text as art, 'fahrzeuge'::text as bezug_tabelle, f.id as bezug_id,
       f.bezeichnung || ' ' || f.kennzeichen as titel, f.naechste_mfk as faellig_am, f.person_id, f.standort_id
  from public.fahrzeuge f
 where f.geloescht_am is null and not f.ausser_betrieb and f.naechste_mfk is not null
union all
select 'service', 'fahrzeuge', f.id, f.bezeichnung || ' ' || f.kennzeichen, f.naechster_service, f.person_id, f.standort_id
  from public.fahrzeuge f
 where f.geloescht_am is null and not f.ausser_betrieb and f.naechster_service is not null
union all
select 'pruefung', 'geraete', g.id, g.bezeichnung || coalesce(' (' || g.inventar_nr || ')', ''), g.naechste_pruefung,
       g.person_id, g.standort_id
  from public.geraete g
 where g.geloescht_am is null and g.zustand <> 'ausser_betrieb' and g.naechste_pruefung is not null
union all
select 'ausweis', 'qualifikationen', q.id, q.art, q.gueltig_bis, q.person_id, p.standort_id
  from (select distinct on (x.person_id, x.art) x.*
          from public.qualifikationen x
         where x.geloescht_am is null
         order by x.person_id, x.art, x.gueltig_bis desc nulls first, x.erworben_am desc nulls last) q
  join public.personen p on p.id = q.person_id and p.aktiv and p.geloescht_am is null
 where q.gueltig_bis is not null;
grant select on public.fristen to authenticated;

-- Welche Frist schon gemeldet ist (Art, Bezug und Datum): dieselbe Frist meldet sich nur einmal.
create table intern.fristen_gemeldet (
  schluessel   text primary key,
  gemeldet_am  timestamptz not null default now()
);

/**
 * Fristen durchsehen (Zeitplan, stündlich): Was innerhalb des Vorlaufs fällig wird, gibt eine Aufgabe und eine
 * Meldung in der Glocke, einmal pro Frist. Fahrzeug und Gerät gehen an die zugeteilte Person, sonst an die
 * Administration; ein Ausweis an die Person und die Administration (sie organisiert den Kurs).
 * Gibt die Zahl der neu gemeldeten Fristen zurück.
 */
create or replace function public.fristen_melden(p_heute date default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select wert from public.einstellungen where schluessel = 'ressourcen'), '{}');
  heute date := coalesce(p_heute, (now() at time zone 'Europe/Zurich')::date);
  r record;
  n int := 0;
  k int;
  name_de text;
  name_fr text;
  ziel text;
  empfaenger uuid[];
begin
  for r in
    select f.*, p.name as person_name
      from public.fristen f
      left join public.personen p on p.id = f.person_id and p.aktiv and p.geloescht_am is null
     where f.faellig_am <= heute + case when f.art = 'ausweis'
                                        then coalesce((cfg ->> 'vorlauf_ausweis_tage')::int, 60)
                                        else coalesce((cfg ->> 'vorlauf_tage')::int, 30) end
  loop
    insert into intern.fristen_gemeldet (schluessel) values (r.art || ':' || r.bezug_id || ':' || r.faellig_am)
    on conflict do nothing;
    get diagnostics k = row_count;
    continue when k = 0;
    n := n + 1;

    if r.art = 'ausweis' then
      select a.text_de, a.text_fr into name_de, name_fr from public.auswahlwerte a
       where a.liste = 'qualifikation' and a.schluessel = r.titel;
      name_de := coalesce(name_de, r.titel) || ' – ' || coalesce(r.person_name, '');
      name_fr := coalesce(name_fr, r.titel) || ' – ' || coalesce(r.person_name, '');
      ziel := '/staff?person=' || r.person_id;
    else
      name_de := case r.art when 'mfk' then 'MFK' when 'service' then 'Service' else 'Prüfung' end || ': ' || r.titel;
      name_fr := case r.art when 'mfk' then 'Expertise' when 'service' then 'Service' else 'Contrôle' end || ' : ' || r.titel;
      ziel := case when r.bezug_tabelle = 'fahrzeuge' then '/fleet?fahrzeug=' || r.bezug_id
                   else '/fleet?ansicht=geraete&geraet=' || r.bezug_id end;
    end if;

    -- Empfänger: zugeteilte Person (bei Ausweisen immer) und die Administration, wenn niemand zugeteilt ist
    -- oder es um einen Ausweis geht.
    select array_agg(distinct e.x) into empfaenger from (
      select r.person_id where r.person_name is not null
      union
      select p.id from public.personen p left join public.rollen ro on ro.schluessel = p.rolle
       where (r.art = 'ausweis' or r.person_name is null)
         and p.aktiv and p.geloescht_am is null
         and ('admin' = any (p.rechte) or 'admin' = any (coalesce(ro.rechte, '{}')))
    ) e(x);

    insert into public.aufgaben (titel, faellig_am, person_id, bezug_tabelle, bezug_id)
    select name_de, r.faellig_am, x, r.bezug_tabelle, r.bezug_id from unnest(empfaenger) x;
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    select x, case when r.faellig_am < heute then 'kritisch' else 'warnung' end,
           'Frist: ' || name_de, 'Échéance : ' || name_fr,
           'Fällig am ' || to_char(r.faellig_am, 'DD.MM.YYYY'), 'Échéance le ' || to_char(r.faellig_am, 'DD.MM.YYYY'),
           ziel
      from unnest(empfaenger) x;
  end loop;
  return n;
end
$$;
revoke execute on function public.fristen_melden(date) from public, anon, authenticated;
grant execute on function public.fristen_melden(date) to service_role;
