-- Zeiterfassung und Abwesenheiten (Chris 11.11.2026, Entscheid 0059): ein Bereich für alle Mitarbeitenden.
-- * Jede Person stempelt ihre Zeit (Montage auf Baustelle/Service wie bisher, Büro auf den internen Posten «Büro»)
--   und sieht Soll, Ist, Saldo und Ferienkonto. Die Stempeluhr ist dieselbe Tabelle `zeiten` wie in «Baustelle».
-- * Abwesenheiten (Ferien, Krank, Militär …) beantragt die Person selbst; bewilligt wird von der Zeit-Leitung.
-- * Die Zeit-Leitung (Kürzel in einstellungen.zeiterfassung.leitung, Standard Chris und Loris) sieht alle
--   Mitarbeitenden. Alle anderen sehen nur sich selbst; GL/Buchhaltung (Recht «personal») und Vorgesetzte wie bisher.
-- * Welche Abwesenheit eine Bewilligung braucht, als Soll zählt oder Ferien verbraucht, steht als Eigenschaft in
--   der Auswahlliste «abwesenheit»; Feiertage je Standort und Sollzeit in einstellungen.zeiterfassung. Kein Code.

-- ---------- Einstellungen (nur Administration ändert sie, Trigger zz_nur_admin) ----------
insert into public.einstellungen (schluessel, wert) values ('zeiterfassung', $j${
  "leitung": ["chris", "loris"],
  "wochenstunden": 42.5,
  "ferientage": 25,
  "aktiv_seit": "2026-11-01",
  "feiertage": {
    "muri": ["neujahr", "berchtoldstag", "karfreitag", "ostermontag", "auffahrt", "pfingstmontag", "fronleichnam",
             "bundesfeier", "maria_himmelfahrt", "allerheiligen", "maria_empfaengnis", "weihnachten", "stephanstag"],
    "bulle": ["neujahr", "berchtoldstag", "karfreitag", "ostermontag", "auffahrt", "pfingstmontag", "fronleichnam",
              "bundesfeier", "maria_himmelfahrt", "allerheiligen", "maria_empfaengnis", "weihnachten", "stephanstag"]
  }
}$j$::jsonb)
on conflict (schluessel) do update set wert = excluded.wert || public.einstellungen.wert;

-- Büro-Zeit hat ein eigenes Ziel ohne Kunde, damit auch das Büro mit einem Klick stempelt.
update public.einstellungen
   set wert = jsonb_set(wert, '{interne_posten}', coalesce(wert -> 'interne_posten', '[]')
                || '[{"schluessel": "buero", "de": "Büro", "fr": "Bureau"}]'::jsonb)
 where schluessel = 'baustelle'
   and not coalesce(wert -> 'interne_posten', '[]') @> '[{"schluessel": "buero"}]'::jsonb;

-- Eigenschaften der Abwesenheits-Arten: bewilligung (braucht Antrag), soll (zählt als gearbeitet), ferien (vom
-- Ferienkonto). Kompensation und unbezahlter Urlaub zählen nicht als Soll, damit der Saldo stimmt.
insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe) values
  ('abwesenheit', 'unfall', 'Unfall', 'Accident', 25, 'warn'),
  ('abwesenheit', 'frei', 'Bezahlt frei (Umzug, Hochzeit …)', 'Congé payé (déménagement, mariage …)', 55, 'neutral'),
  ('abwesenheit', 'unbezahlt', 'Unbezahlter Urlaub', 'Congé non payé', 58, 'neutral')
on conflict (liste, schluessel) do nothing;
update public.auswahlwerte set eigenschaften = eigenschaften || x.e
  from (values
    ('ferien', '{"bewilligung": true, "soll": true, "ferien": true}'::jsonb),
    ('krank', '{"bewilligung": false, "soll": true, "ferien": false}'),
    ('unfall', '{"bewilligung": false, "soll": true, "ferien": false}'),
    ('militaer', '{"bewilligung": true, "soll": true, "ferien": false}'),
    ('weiterbildung', '{"bewilligung": true, "soll": true, "ferien": false}'),
    ('kompensation', '{"bewilligung": true, "soll": false, "ferien": false}'),
    ('frei', '{"bewilligung": true, "soll": true, "ferien": false}'),
    ('unbezahlt', '{"bewilligung": true, "soll": false, "ferien": false}'),
    ('sonstiges', '{"bewilligung": true, "soll": true, "ferien": false}'),
    ('outlook', '{"bewilligung": false, "soll": false, "ferien": false}')
  ) as x(k, e)
 where liste = 'abwesenheit' and schluessel = x.k;

create or replace function intern.zeit_cfg() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select wert from public.einstellungen where schluessel = 'zeiterfassung'), '{}')
$$;

/** Eigenschaft einer Abwesenheits-Art aus der Auswahlliste (bewilligung, soll, ferien). Unbekannt: Bewilligung ja. */
create or replace function intern.abwesenheit_eigenschaft(p_art text, p_eigenschaft text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (w.eigenschaften ->> p_eigenschaft)::boolean from public.auswahlwerte w
                    where w.liste = 'abwesenheit' and w.schluessel = p_art and w.geloescht_am is null),
                  p_eigenschaft in ('bewilligung', 'soll'))
$$;

/** Personen der Zeit-Leitung (Kürzel aus einstellungen.zeiterfassung.leitung). */
create or replace function intern.zeit_leitung_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.id), '{}') from public.personen p
   where p.aktiv and p.geloescht_am is null
     and p.kuerzel in (select jsonb_array_elements_text(coalesce(intern.zeit_cfg() -> 'leitung', '[]')))
$$;

/** Gehört die angemeldete Person zur Zeit-Leitung? Sie sieht alle Zeiten und Abwesenheiten und bewilligt. */
create or replace function intern.zeit_leitung() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(intern.meine_person_id() = any (intern.zeit_leitung_ids()), false)
$$;

/** Darf die angemeldete Person die Zeiten und Abwesenheiten dieser Person sehen? */
create or replace function intern.zeit_sichtbar(p_person uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_person = intern.meine_person_id() or intern.zeit_leitung() or intern.hat_recht('personal')
      or intern.ist_vorgesetzt(p_person)
$$;

-- ---------- Feiertage ----------

/** Ostersonntag (gregorianisch, Gauss/Meeus). */
create or replace function intern.ostern(p_jahr int) returns date
language plpgsql immutable set search_path = '' as $$
declare
  a int := p_jahr % 19; b int := p_jahr / 100; c int := p_jahr % 100;
  d int := b / 4; e int := b % 4; f int := (b + 8) / 25; g int := (b - f + 1) / 3;
  h int := (19 * a + b - d - g + 15) % 30; i int := c / 4; k int := c % 4;
  l int := (32 + 2 * e + 2 * i - h - k) % 7; m int := (a + 11 * h + 22 * l) / 451;
begin
  return make_date(p_jahr, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
end
$$;

/** Alle bekannten Feiertage eines Jahres (Schlüssel, Datum, Name DE/FR). Welche gelten, sagt der Standort. */
create or replace function intern.feiertage_alle(p_jahr int)
returns table (schluessel text, tag date, name_de text, name_fr text)
language sql immutable set search_path = '' as $$
  select * from (values
    ('neujahr', make_date(p_jahr, 1, 1), 'Neujahr', 'Nouvel An'),
    ('berchtoldstag', make_date(p_jahr, 1, 2), 'Berchtoldstag', 'Saint-Berchtold'),
    ('karfreitag', intern.ostern(p_jahr) - 2, 'Karfreitag', 'Vendredi saint'),
    ('ostermontag', intern.ostern(p_jahr) + 1, 'Ostermontag', 'Lundi de Pâques'),
    ('tag_der_arbeit', make_date(p_jahr, 5, 1), 'Tag der Arbeit', 'Fête du travail'),
    ('auffahrt', intern.ostern(p_jahr) + 39, 'Auffahrt', 'Ascension'),
    ('pfingstmontag', intern.ostern(p_jahr) + 50, 'Pfingstmontag', 'Lundi de Pentecôte'),
    ('fronleichnam', intern.ostern(p_jahr) + 60, 'Fronleichnam', 'Fête-Dieu'),
    ('bundesfeier', make_date(p_jahr, 8, 1), 'Bundesfeier', 'Fête nationale'),
    ('maria_himmelfahrt', make_date(p_jahr, 8, 15), 'Mariä Himmelfahrt', 'Assomption'),
    ('allerheiligen', make_date(p_jahr, 11, 1), 'Allerheiligen', 'Toussaint'),
    ('maria_empfaengnis', make_date(p_jahr, 12, 8), 'Mariä Empfängnis', 'Immaculée Conception'),
    ('weihnachten', make_date(p_jahr, 12, 25), 'Weihnachten', 'Noël'),
    ('stephanstag', make_date(p_jahr, 12, 26), 'Stephanstag', 'Saint-Étienne')
  ) as f (schluessel, tag, name_de, name_fr)
$$;

/** Feiertage eines Standorts (Kürzel muri/bulle) im Zeitraum, nach einstellungen.zeiterfassung.feiertage. */
create or replace function intern.feiertage(p_standort text, p_von date, p_bis date)
returns table (tag date, name_de text, name_fr text)
language sql stable security definer set search_path = '' as $$
  select f.tag, f.name_de, f.name_fr
    from generate_series(extract(year from p_von)::int, extract(year from p_bis)::int) j,
         lateral intern.feiertage_alle(j) f
   where f.tag between p_von and p_bis
     and f.schluessel in (select jsonb_array_elements_text(
           coalesce(intern.zeit_cfg() -> 'feiertage' -> coalesce(p_standort, 'muri'), intern.zeit_cfg() -> 'feiertage' -> 'muri', '[]')))
$$;

-- ---------- Abwesenheiten: Antrag und Bewilligung ----------
alter table public.abwesenheiten
  add column if not exists status text not null default 'bewilligt' check (status in ('beantragt', 'bewilligt', 'abgelehnt')),
  add column if not exists bemerkung text,
  add column if not exists entscheid_von uuid references public.personen (id),
  add column if not exists entscheid_am timestamptz,
  add column if not exists entscheid_grund text;
comment on column public.abwesenheiten.status is
  'beantragt → bewilligt/abgelehnt, nur über abwesenheit_entscheiden. Bisherige und Krank sind gleich bewilligt.';
create index if not exists abwesenheiten_person_idx on public.abwesenheiten (person_id, von) where geloescht_am is null;

/**
 * Stand einer Abwesenheit schützen: wer nicht bewilligen darf, legt Arten mit Bewilligung nur als «beantragt» an;
 * ändert die Person Daten oder Art einer bewilligten, wird sie wieder «beantragt». Den Stand selbst setzt nur
 * abwesenheit_entscheiden. Kurstage (kurs_id) sind mit dem Kurs bewilligt.
 */
create or replace function intern.abwesenheit_stand() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_darf boolean := intern.zeit_leitung() or intern.hat_recht('personal') or auth.uid() is null
                    or coalesce(current_setting('intern.abwesenheit_entscheid', true), '') = 'ja';
begin
  if tg_op = 'INSERT' then
    if new.kurs_id is not null or new.quelle <> 'crm' or not intern.abwesenheit_eigenschaft(new.art, 'bewilligung') then
      new.status := 'bewilligt';
    elsif not v_darf then
      new.status := 'beantragt';
    end if;
    return new;
  end if;
  if new.status is distinct from old.status and not v_darf then
    raise exception using errcode = '42501', message = 'zeit.kein_recht';
  end if;
  if not v_darf and new.status = 'bewilligt' and new.kurs_id is null
     and (new.von, new.bis, new.art, new.halbtag) is distinct from (old.von, old.bis, old.art, old.halbtag)
     and intern.abwesenheit_eigenschaft(new.art, 'bewilligung') then
    new.status := 'beantragt';
    new.entscheid_von := null;
    new.entscheid_am := null;
  end if;
  return new;
end
$$;
drop trigger if exists stand on public.abwesenheiten;
create trigger stand before insert or update on public.abwesenheiten
  for each row execute function intern.abwesenheit_stand();

-- Lesen: eigene, Zeit-Leitung, «personal», Planung (Einsätze planen) und direkte Vorgesetzte. Alle anderen sehen
-- nur sich selbst; «wer ist heute weg» kommt ohne Grund über team_heute().
drop policy if exists lesen on public.abwesenheiten;
create policy lesen on public.abwesenheiten for select to authenticated using (
  person_id = (select intern.meine_person_id()) or (select intern.zeit_leitung()) or (select intern.hat_recht('personal'))
  or (select intern.hat_recht('planung')) or intern.ist_vorgesetzt(person_id));
drop policy if exists anlegen on public.abwesenheiten;
drop policy if exists aendern on public.abwesenheiten;
create policy anlegen on public.abwesenheiten for insert to authenticated with check (
  person_id = (select intern.meine_person_id()) or (select intern.zeit_leitung()) or (select intern.hat_recht('planung'))
  or intern.ist_vorgesetzt(person_id));
create policy aendern on public.abwesenheiten for update to authenticated
  using (person_id = (select intern.meine_person_id()) or (select intern.zeit_leitung()) or (select intern.hat_recht('planung'))
         or intern.ist_vorgesetzt(person_id))
  with check (person_id = (select intern.meine_person_id()) or (select intern.zeit_leitung())
              or (select intern.hat_recht('planung')) or intern.ist_vorgesetzt(person_id));

create or replace function public.darf_abwesenheit_erfassen(p_person uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select p_person = intern.meine_person_id() or intern.zeit_leitung() or intern.hat_recht('planung')
      or intern.ist_vorgesetzt(p_person)
$$;

-- Abgelehnte zählen nirgends; beantragte erscheinen in der Planung als Hinweis (Spalte status).
create or replace view public.abwesenheiten_alle with (security_invoker = true) as
select a.id, a.person_id, a.art, a.von, a.bis, a.halbtag, 'crm'::text as quelle, a.status
  from public.abwesenheiten a
 where a.geloescht_am is null and a.status <> 'abgelehnt'
union all
select k.id, k.person_id, 'outlook', (k.beginn at time zone 'Europe/Zurich')::date,
       ((k.ende at time zone 'Europe/Zurich') - interval '1 second')::date, false, 'outlook', 'bewilligt'
  from public.kalender_eintraege k
 where k.anzeige_als = 'oof' and k.quelle = 'outlook' and k.geloescht_am is null and k.person_id is not null;

/** Glocke an Personen (ohne die angemeldete Person selbst). */
create or replace function intern.zeit_glocke(p_an uuid[], p_art text, p_titel_de text, p_titel_fr text,
                                              p_text_de text, p_text_fr text, p_ziel text) returns void
language sql security definer set search_path = '' as $$
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select x, p_art, p_titel_de, p_titel_fr, p_text_de, p_text_fr, p_ziel
    from unnest(p_an) x where x is distinct from intern.meine_person_id()
$$;

/** «12.11.2026» bzw. «12.11.–15.11.2026» für Glocken-Texte. */
create or replace function intern.zeitraum_text(p_von date, p_bis date) returns text
language sql immutable set search_path = '' as $$
  select case when p_von = p_bis then to_char(p_von, 'DD.MM.YYYY')
              else to_char(p_von, 'DD.MM.') || '–' || to_char(p_bis, 'DD.MM.YYYY') end
$$;

/**
 * Abwesenheit erfassen oder ändern (p: id, person_id, art, von, bis, halbtag, bemerkung). Für sich selbst immer;
 * für andere mit Zeit-Leitung, Planung oder als Vorgesetzte (RLS). Braucht die Art eine Bewilligung, bleibt sie
 * «beantragt» und die Zeit-Leitung bekommt eine Glocke; Krank/Unfall melden die Leitung nur.
 */
create or replace function public.abwesenheit_speichern(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_ich uuid := intern.meine_person_id();
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_person uuid := coalesce(nullif(p ->> 'person_id', '')::uuid, v_ich);
  v_art text := coalesce(nullif(p ->> 'art', ''), 'ferien');
  v_von date := (p ->> 'von')::date;
  v_bis date := coalesce(nullif(p ->> 'bis', '')::date, (p ->> 'von')::date);
  a public.abwesenheiten;
  v_name text;
begin
  if v_ich is null then raise exception using errcode = '42501', message = 'zeit.kein_recht'; end if;
  if v_von is null or v_bis < v_von then raise exception using errcode = 'P0001', message = 'zeit.zeitraum'; end if;
  if not exists (select 1 from public.auswahlwerte w where w.liste = 'abwesenheit' and w.schluessel = v_art
                  and w.aktiv and w.geloescht_am is null and v_art <> 'outlook') then
    raise exception using errcode = 'P0001', message = 'zeit.art_unbekannt';
  end if;
  if exists (select 1 from public.abwesenheiten x where x.person_id = v_person and x.geloescht_am is null
              and x.status <> 'abgelehnt' and x.id is distinct from v_id and x.von <= v_bis and x.bis >= v_von) then
    raise exception using errcode = 'P0001', message = 'zeit.ueberschneidung';
  end if;
  if v_id is null then
    insert into public.abwesenheiten (person_id, art, von, bis, halbtag, bemerkung)
    values (v_person, v_art, v_von, v_bis, coalesce((p ->> 'halbtag')::boolean, false), nullif(trim(p ->> 'bemerkung'), ''))
    returning * into a;
  else
    update public.abwesenheiten set art = v_art, von = v_von, bis = v_bis,
           halbtag = coalesce((p ->> 'halbtag')::boolean, false), bemerkung = nullif(trim(p ->> 'bemerkung'), '')
     where id = v_id and geloescht_am is null and kurs_id is null
    returning * into a;
    if not found then raise exception using errcode = 'P0002', message = 'zeit.nicht_gefunden'; end if;
  end if;

  select name into v_name from public.personen where id = a.person_id;
  if a.status = 'beantragt' then
    perform intern.zeit_glocke(intern.zeit_leitung_ids(), 'info', 'Abwesenheit zu bewilligen', 'Absence à valider',
      v_name || ': ' || intern.zeitraum_text(a.von, a.bis), v_name || ' : ' || intern.zeitraum_text(a.von, a.bis),
      '/time?reiter=abwesenheiten');
  elsif v_id is null and a.person_id = v_ich and not intern.abwesenheit_eigenschaft(a.art, 'bewilligung') then
    perform intern.zeit_glocke(intern.zeit_leitung_ids(), 'warnung', 'Abwesenheit gemeldet', 'Absence annoncée',
      v_name || ': ' || intern.zeitraum_text(a.von, a.bis), v_name || ' : ' || intern.zeitraum_text(a.von, a.bis),
      '/time?reiter=abwesenheiten');
  end if;
  return a.id;
end
$$;

/** Antrag bewilligen oder ablehnen (Ablehnen mit Grund). Nur Zeit-Leitung oder Recht «personal». */
create or replace function public.abwesenheit_entscheiden(p_id uuid, p_bewilligt boolean, p_grund text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.abwesenheiten;
begin
  if not (intern.zeit_leitung() or intern.hat_recht('personal')) then
    raise exception using errcode = '42501', message = 'zeit.kein_recht';
  end if;
  if not p_bewilligt and coalesce(trim(p_grund), '') = '' then
    raise exception using errcode = 'P0001', message = 'zeit.grund_fehlt';
  end if;
  perform set_config('intern.abwesenheit_entscheid', 'ja', true);
  update public.abwesenheiten
     set status = case when p_bewilligt then 'bewilligt' else 'abgelehnt' end,
         entscheid_von = intern.meine_person_id(), entscheid_am = now(), entscheid_grund = nullif(trim(p_grund), '')
   where id = p_id and geloescht_am is null
  returning * into a;
  perform set_config('intern.abwesenheit_entscheid', '', true);
  if not found then raise exception using errcode = 'P0002', message = 'zeit.nicht_gefunden'; end if;
  perform intern.zeit_glocke(array[a.person_id], case when p_bewilligt then 'ok' else 'warnung' end,
    case when p_bewilligt then 'Abwesenheit bewilligt' else 'Abwesenheit abgelehnt' end,
    case when p_bewilligt then 'Absence validée' else 'Absence refusée' end,
    intern.zeitraum_text(a.von, a.bis) || coalesce(': ' || a.entscheid_grund, ''),
    intern.zeitraum_text(a.von, a.bis) || coalesce(' : ' || a.entscheid_grund, ''),
    '/time?reiter=abwesenheiten');
end
$$;

/**
 * Abwesenheit zurückziehen (in den Papierkorb). Die Person selbst, solange sie noch nicht begonnen hat oder nur
 * beantragt ist; Zeit-Leitung, «personal», Planung und Vorgesetzte immer. Kurstage gehen nur über den Kurs.
 */
create or replace function public.abwesenheit_zurueckziehen(p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  a public.abwesenheiten;
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
begin
  select * into a from public.abwesenheiten where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'zeit.nicht_gefunden'; end if;
  if a.kurs_id is not null then raise exception using errcode = 'P0001', message = 'zeit.kurs'; end if;
  if a.person_id = intern.meine_person_id() and a.status = 'bewilligt' and a.von <= v_heute
     and not (intern.zeit_leitung() or intern.hat_recht('personal') or intern.hat_recht('planung')) then
    raise exception using errcode = 'P0001', message = 'zeit.schon_begonnen';
  end if;
  update public.abwesenheiten set geloescht_am = now() where id = p_id;
end
$$;

-- ---------- Arbeitszeiten: Zeit-Leitung sieht und korrigiert alle ----------
drop policy if exists "lesen" on public.zeiten;
drop policy if exists "anlegen" on public.zeiten;
drop policy if exists "aendern" on public.zeiten;
create policy "lesen" on public.zeiten for select to authenticated using (
  person_id = (select intern.meine_person_id()) or (select intern.hat_recht('personal'))
  or (select intern.hat_recht('finanzen')) or (select intern.zeit_leitung()) or intern.ist_vorgesetzt(person_id));
create policy "anlegen" on public.zeiten for insert to authenticated with check (
  (select intern.hat_recht('basis'))
  and (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('personal')) or (select intern.zeit_leitung())));
create policy "aendern" on public.zeiten for update to authenticated
  using (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('personal'))
         or (select intern.hat_recht('finanzen')) or (select intern.zeit_leitung()))
  with check (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('personal'))
              or (select intern.hat_recht('finanzen')) or (select intern.zeit_leitung()));

-- ---------- Zeitkonto: Übertrag aus dem Vorjahr bzw. vor dem Start ----------
create table public.zeitkonten (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null references public.personen (id),
  jahr            int not null check (jahr between 2020 and 2100),
  ferien_uebertrag numeric(4, 1) not null default 0 check (ferien_uebertrag between -60 and 60),
  saldo_uebertrag_min int not null default 0 check (saldo_uebertrag_min between -60000 and 60000),
  notiz           text,
  unique (person_id, jahr)
);
select intern.richte_fachtabelle_ein('zeitkonten');
comment on table public.zeitkonten is
  'Übertrag je Person und Jahr (Restferien, Überstunden-Saldo). Ändern nur über zeitkonto_setzen (Zeit-Leitung, personal).';
drop policy lesen on public.zeitkonten;
drop policy anlegen on public.zeitkonten;
drop policy aendern on public.zeitkonten;
create policy lesen on public.zeitkonten for select to authenticated using (intern.zeit_sichtbar(person_id));

/** Übertrag setzen (Ferientage, Saldo in Minuten). Nur Zeit-Leitung oder Recht «personal». */
create or replace function public.zeitkonto_setzen(p_person uuid, p_jahr int, p_ferien numeric, p_saldo_min int,
                                                   p_notiz text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (intern.zeit_leitung() or intern.hat_recht('personal')) then
    raise exception using errcode = '42501', message = 'zeit.kein_recht';
  end if;
  insert into public.zeitkonten (person_id, jahr, ferien_uebertrag, saldo_uebertrag_min, notiz)
  values (p_person, p_jahr, coalesce(p_ferien, 0), coalesce(p_saldo_min, 0), nullif(trim(p_notiz), ''))
  on conflict (person_id, jahr) do update
    set ferien_uebertrag = excluded.ferien_uebertrag, saldo_uebertrag_min = excluded.saldo_uebertrag_min,
        notiz = excluded.notiz, geloescht_am = null;
end
$$;

-- ---------- Rechnen ----------

/**
 * Tage einer Person im Zeitraum: Soll (Std.), Ist (Std.), Feiertag, Abwesenheit (bewilligt) und deren Gutschrift.
 * Soll = Wochenstunden der Personal-Akte (sonst Standard × Pensum) / 5, Mo–Fr ohne Feiertage des Standorts,
 * erst ab Start der Zeiterfassung und Eintritt, bis Austritt. Abwesenheiten mit Eigenschaft «soll» zählen als
 * gearbeitet (halber Tag zur Hälfte), Ferien zählen zusätzlich als Ferientag.
 */
create or replace function intern.zeit_tage(p_person uuid, p_von date, p_bis date)
returns table (tag date, soll_h numeric, ist_h numeric, feiertag text, art text, gutschrift_h numeric, ferientag numeric)
language sql stable security definer set search_path = '' as $$
  with pe as (
    select pr.id, s.kuerzel as standort, a.eintritt, a.austritt,
           coalesce(a.wochenstunden,
                    coalesce((intern.zeit_cfg() ->> 'wochenstunden')::numeric, 42.5) * coalesce(a.pensum, 100) / 100.0) as woche_h,
           greatest(coalesce((intern.zeit_cfg() ->> 'aktiv_seit')::date, '2026-01-01'), coalesce(a.eintritt, '2000-01-01')) as ab
      from public.personen pr
      left join public.standorte s on s.id = pr.standort_id
      left join public.personal_akten a on a.person_id = pr.id and a.geloescht_am is null
     where pr.id = p_person
  ), tage as (
    select d::date as tag from generate_series(p_von, p_bis, interval '1 day') d
  ), ist as (
    select (z.start at time zone 'Europe/Zurich')::date as tag,
           sum(extract(epoch from (coalesce(z.stopp, least(now(), z.start + interval '14 hours')) - z.start)) / 3600.0
               - z.pause_min / 60.0) as h
      from public.zeiten z
     where z.person_id = p_person and z.geloescht_am is null
       and z.start >= p_von::timestamp at time zone 'Europe/Zurich'
       and z.start < (p_bis + 1)::timestamp at time zone 'Europe/Zurich'
     group by 1
  )
  select t.tag,
         round(case when soll_tag then pe.woche_h / 5 else 0 end, 4),
         round(coalesce(ist.h, 0)::numeric, 4),
         f.name_de,
         ab.art,
         round(case when soll_tag and ab.art is not null and intern.abwesenheit_eigenschaft(ab.art, 'soll')
                    then pe.woche_h / 5 * case when ab.halbtag then 0.5 else 1 end else 0 end, 4),
         -- Ferientage zählen auch vor dem Start der Zeiterfassung (Ferienkonto gilt fürs ganze Jahr).
         case when arbeitstag and ab.art is not null and intern.abwesenheit_eigenschaft(ab.art, 'ferien')
              then case when ab.halbtag then 0.5 else 1 end else 0 end
    from tage t
    cross join pe
    left join lateral (select x.tag, x.name_de from intern.feiertage(pe.standort, t.tag, t.tag) x limit 1) f on true
    left join lateral (select a.art, a.halbtag from public.abwesenheiten a
                        where a.person_id = p_person and a.geloescht_am is null and a.status = 'bewilligt'
                          and t.tag between a.von and a.bis
                        order by a.halbtag, a.von limit 1) ab on true
    left join ist on ist.tag = t.tag
    cross join lateral (select extract(isodow from t.tag) < 6 and f.tag is null
                               and t.tag >= coalesce(pe.eintritt, '2000-01-01')
                               and (pe.austritt is null or t.tag <= pe.austritt) as arbeitstag) w
    cross join lateral (select w.arbeitstag and t.tag >= pe.ab as soll_tag) s
$$;

/**
 * Zeitkonto einer Person für ein Jahr bis zu einem Stichtag: Soll, Ist, Gutschrift, Saldo (mit Übertrag), Woche,
 * Ferien (Anspruch anteilig ab Eintritt, Übertrag, bezogen bis heute, geplant, beantragt, Rest).
 */
create or replace function intern.zeit_konto(p_person uuid, p_jahr int, p_montag date)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with h as (select (now() at time zone 'Europe/Zurich')::date as heute),
  jahr as (select * from intern.zeit_tage(p_person, make_date(p_jahr, 1, 1), make_date(p_jahr, 12, 31))),
  pe as (
    select a.eintritt, a.austritt,
           coalesce(a.ferientage, (intern.zeit_cfg() ->> 'ferientage')::numeric, 25) as ferien_jahr,
           coalesce(k.ferien_uebertrag, 0) as ferien_uebertrag, coalesce(k.saldo_uebertrag_min, 0) as saldo_uebertrag_min
      from public.personen pr
      left join public.personal_akten a on a.person_id = pr.id and a.geloescht_am is null
      left join public.zeitkonten k on k.person_id = pr.id and k.jahr = p_jahr and k.geloescht_am is null
     where pr.id = p_person
  ), anspruch as (
    -- Anteilig nach Monaten im Jahr (Eintritt/Austritt), auf halbe Tage gerundet.
    select round(pe.ferien_jahr * (
             (extract(month from least(coalesce(pe.austritt, make_date(p_jahr, 12, 31)), make_date(p_jahr, 12, 31)))
              - extract(month from greatest(coalesce(pe.eintritt, make_date(p_jahr, 1, 1)), make_date(p_jahr, 1, 1))) + 1)
             / 12.0) * 2) / 2 as tage
      from pe
  )
  select jsonb_build_object(
    'soll_h', round(sum(j.soll_h) filter (where j.tag <= h.heute), 2),
    'ist_h', round(sum(j.ist_h) filter (where j.tag <= h.heute), 2),
    'gutschrift_h', round(sum(j.gutschrift_h) filter (where j.tag <= h.heute), 2),
    'saldo_h', round(coalesce(sum(j.ist_h + j.gutschrift_h - j.soll_h) filter (where j.tag <= h.heute), 0)
                     + max(pe.saldo_uebertrag_min) / 60.0, 2),
    'saldo_uebertrag_h', round(max(pe.saldo_uebertrag_min) / 60.0, 2),
    'woche', jsonb_build_object(
      'soll_h', round(coalesce(sum(j.soll_h) filter (where j.tag between p_montag and p_montag + 6), 0), 2),
      'ist_h', round(coalesce(sum(j.ist_h) filter (where j.tag between p_montag and p_montag + 6), 0), 2),
      'gutschrift_h', round(coalesce(sum(j.gutschrift_h) filter (where j.tag between p_montag and p_montag + 6), 0), 2)),
    'ferien', jsonb_build_object(
      'anspruch', max(anspruch.tage),
      'uebertrag', max(pe.ferien_uebertrag),
      'bezogen', coalesce(sum(j.ferientag) filter (where j.tag <= h.heute), 0),
      'geplant', coalesce(sum(j.ferientag) filter (where j.tag > h.heute), 0),
      'beantragt', (select coalesce(sum(case when a.halbtag then 0.5 else 1 end), 0)
                      from public.abwesenheiten a
                      join lateral generate_series(greatest(a.von, make_date(p_jahr, 1, 1)), least(a.bis, make_date(p_jahr, 12, 31)), interval '1 day') d on true
                     where a.person_id = p_person and a.geloescht_am is null and a.status = 'beantragt'
                       and intern.abwesenheit_eigenschaft(a.art, 'ferien') and extract(isodow from d) < 6
                       and not exists (select 1 from intern.feiertage(
                         (select s.kuerzel from public.personen pp join public.standorte s on s.id = pp.standort_id where pp.id = p_person),
                         d::date, d::date))),
      'rest', max(anspruch.tage) + max(pe.ferien_uebertrag) - coalesce(sum(j.ferientag), 0))
  )
  from jahr j, h, pe, anspruch
$$;

/**
 * Alles für den Bereich «Zeiterfassung» in einer Abfrage (p_jahr, p_montag): darf ich alle sehen/bewilligen,
 * Personen (eigene, mit Leitung alle aktiven) mit Zeitkonto und laufender Zeit, Abwesenheiten des Jahres
 * (sichtbare), offene Anträge aller Jahre, Feiertage meines Standorts und die internen Posten fürs Stempeln.
 */
create or replace function public.zeiterfassung(p_jahr int, p_montag date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ich uuid := intern.meine_person_id();
  v_alle boolean := intern.zeit_leitung() or intern.hat_recht('personal');
  v_standort text := (select s.kuerzel from public.personen p join public.standorte s on s.id = p.standort_id where p.id = v_ich);
begin
  if v_ich is null then raise exception using errcode = '42501', message = 'zeit.kein_recht'; end if;
  if extract(isodow from p_montag) <> 1 then raise exception using errcode = 'P0001', message = 'zeit.woche_montag'; end if;
  return jsonb_build_object(
    'ich', v_ich,
    'leitung', v_alle,
    'jahr', p_jahr,
    'montag', p_montag,
    'personen', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', pe.id, 'name', pe.name, 'kurzzeichen', pe.kurzzeichen, 'rolle', pe.rolle,
               'standort', (select s.kuerzel from public.standorte s where s.id = pe.standort_id),
               'konto', intern.zeit_konto(pe.id, p_jahr, p_montag),
               'laeuft', (select jsonb_build_object('id', z.id, 'start', z.start, 'art', z.art, 'intern', z.intern,
                                                    'projekt_id', z.projekt_id, 'service_fall_id', z.service_fall_id)
                            from public.zeiten z where z.person_id = pe.id and z.stopp is null and z.geloescht_am is null limit 1),
               'heute_weg', (select a.art from public.abwesenheiten a where a.person_id = pe.id and a.geloescht_am is null
                               and a.status = 'bewilligt' and (now() at time zone 'Europe/Zurich')::date between a.von and a.bis limit 1))
             order by pe.id <> v_ich, pe.name)
        from public.personen pe
       where pe.aktiv and pe.geloescht_am is null
         and (v_alle or pe.id = v_ich or intern.ist_vorgesetzt(pe.id))), '[]'),
    'abwesenheiten', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'person_id', a.person_id, 'art', a.art, 'von', a.von, 'bis', a.bis, 'halbtag', a.halbtag,
               'status', a.status, 'bemerkung', a.bemerkung, 'entscheid_grund', a.entscheid_grund,
               'entscheid_am', a.entscheid_am, 'entscheid_von', (select p.kurzzeichen from public.personen p where p.id = a.entscheid_von),
               'kurs', a.kurs_id is not null, 'erstellt_am', a.erstellt_am)
             order by a.von)
        from public.abwesenheiten a
       where a.geloescht_am is null and a.von <= make_date(p_jahr, 12, 31) and a.bis >= make_date(p_jahr, 1, 1)
         and intern.zeit_sichtbar(a.person_id)), '[]'),
    'offen', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'person_id', a.person_id, 'art', a.art, 'von', a.von, 'bis', a.bis, 'halbtag', a.halbtag,
               'status', a.status, 'bemerkung', a.bemerkung, 'entscheid_grund', null, 'entscheid_am', null,
               'entscheid_von', null, 'kurs', false, 'erstellt_am', a.erstellt_am)
             order by a.von)
        from public.abwesenheiten a
       where a.geloescht_am is null and a.status = 'beantragt' and v_alle), '[]'),
    'feiertage', coalesce((
      select jsonb_agg(jsonb_build_object('tag', f.tag, 'de', f.name_de, 'fr', f.name_fr) order by f.tag)
        from intern.feiertage(v_standort, make_date(p_jahr, 1, 1), make_date(p_jahr, 12, 31)) f), '[]'),
    'posten', coalesce(intern.baustelle_cfg() -> 'interne_posten', '[]')
  );
end
$$;

/** Tage einer Person für eine Woche bzw. einen Monat (Soll, Ist, Feiertag, Abwesenheit), nur wenn sichtbar. */
create or replace function public.zeit_tage(p_person uuid, p_von date, p_bis date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not intern.zeit_sichtbar(p_person) then raise exception using errcode = '42501', message = 'zeit.kein_recht'; end if;
  if p_bis - p_von > 62 then raise exception using errcode = 'P0001', message = 'zeit.zeitraum'; end if;
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.tag) from intern.zeit_tage(p_person, p_von, p_bis) t), '[]');
end
$$;

revoke execute on function public.abwesenheit_speichern(jsonb), public.abwesenheit_entscheiden(uuid, boolean, text),
  public.abwesenheit_zurueckziehen(uuid), public.zeitkonto_setzen(uuid, int, numeric, int, text),
  public.zeiterfassung(int, date), public.zeit_tage(uuid, date, date) from public, anon;
grant execute on function public.abwesenheit_speichern(jsonb), public.abwesenheit_entscheiden(uuid, boolean, text),
  public.abwesenheit_zurueckziehen(uuid), public.zeitkonto_setzen(uuid, int, numeric, int, text),
  public.zeiterfassung(int, date), public.zeit_tage(uuid, date, date) to authenticated;

-- Wochenblatt in «Baustelle»: derselbe Saldo wie in der Zeiterfassung (mit Feiertagen, Abwesenheiten nach Art und
-- Übertrag), und die Zeit-Leitung sieht alle.
create or replace function public.zeiten_wochenblatt(p_montag date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ich uuid := intern.meine_person_id();
  v_alle boolean := intern.hat_recht('preise') or intern.hat_recht('finanzen') or intern.zeit_leitung();
  v_soll numeric := coalesce((intern.baustelle_cfg() -> 'zeiten' ->> 'woche_soll_h')::numeric, 42.5);
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  v_bis date := least(p_montag + 6, v_heute);
begin
  if v_ich is null and not v_alle then raise exception using errcode = 'P0001', message = 'baustelle.keine_person'; end if;
  if extract(isodow from p_montag) <> 1 then raise exception using errcode = 'P0001', message = 'baustelle.woche_montag'; end if;
  return jsonb_build_object('woche', p_montag, 'woche_soll_h', v_soll, 'personen', coalesce((
    select jsonb_agg(x order by x ->> 'name') from (
      select jsonb_build_object(
        'person_id', pe.id, 'name', pe.name, 'kuerzel', pe.kuerzel, 'standort_id', pe.standort_id,
        'pensum', coalesce(pa.pensum, 100),
        'tage', (select jsonb_agg(jsonb_build_object(
                   'tag', d::date,
                   'stunden', (select round(coalesce(sum(extract(epoch from (z.stopp - z.start)) / 3600.0 - z.pause_min / 60.0), 0)::numeric, 2)
                                 from public.zeiten z where z.person_id = pe.id and z.geloescht_am is null and z.stopp is not null
                                  and (z.start at time zone 'Europe/Zurich')::date = d::date),
                   'pause_min', (select coalesce(sum(z.pause_min), 0) from public.zeiten z where z.person_id = pe.id and z.geloescht_am is null
                                  and (z.start at time zone 'Europe/Zurich')::date = d::date),
                   'laeuft', exists (select 1 from public.zeiten z where z.person_id = pe.id and z.stopp is null and z.geloescht_am is null
                                      and (z.start at time zone 'Europe/Zurich')::date = d::date),
                   'ungeprueft', (select count(*) from public.zeiten z where z.person_id = pe.id and z.geloescht_am is null and z.stopp is not null
                                   and z.freigegeben_am is null and (z.start at time zone 'Europe/Zurich')::date = d::date),
                   'abwesenheit', (select jsonb_build_object('art', a.art, 'halbtag', a.halbtag) from public.abwesenheiten_alle a
                                    where a.person_id = pe.id and d::date between a.von and a.bis limit 1),
                   'einsatz', exists (select 1 from public.einsaetze es where pe.id = any (es.personen) and es.geloescht_am is null
                                       and es.art <> 'geplant' and d::date between es.von and es.bis)
                 ) order by d) from generate_series(p_montag, p_montag + 6, interval '1 day') d),
        'saldo_jahr', (intern.zeit_konto(pe.id, extract(year from p_montag)::int, p_montag) ->> 'saldo_h')::numeric,
        'bestaetigt_am', (select w.bestaetigt_am from public.zeiten_wochen w where w.person_id = pe.id and w.woche = p_montag and w.geloescht_am is null)
      ) as x
        from public.personen pe
        left join public.personal_akten pa on pa.person_id = pe.id and pa.geloescht_am is null
       where pe.aktiv and pe.geloescht_am is null
         and (v_alle or pe.id = v_ich)
         and (pe.id = v_ich
              or exists (select 1 from public.zeiten z where z.person_id = pe.id and z.geloescht_am is null and z.start > p_montag - 90)
              or exists (select 1 from public.einsaetze es where pe.id = any (es.personen) and es.geloescht_am is null
                          and es.von <= p_montag + 6 and es.bis >= p_montag))
    ) y), '[]'));
end
$$;
