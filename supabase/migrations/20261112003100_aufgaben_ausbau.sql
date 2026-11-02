-- Aufgaben vollständig (02.11.2026, Entscheid 0042): Wichtig, Teilschritte, Wiederholung, Notiz beim Erledigen,
-- Kommentare mit @Kurzzeichen, Sichtbarkeit (eigene + vergebene, Geschäftsleitung alle), Vertretung bei Abwesenheit,
-- Glocke beim Zuteilen, Weitergeben, Erledigen und morgens für Fälliges. Regeln in einstellungen.aufgaben.

alter table public.aufgaben
  add column if not exists wichtig        boolean not null default false,
  add column if not exists teilschritte   jsonb not null default '[]',   -- [{id, text, erledigt}]
  add column if not exists wiederholung   text check (wiederholung in ('woche', 'monat', 'quartal', 'jahr')),
  add column if not exists erledigt_notiz text,
  add column if not exists quelle         text,                           -- ki, posteingang … (sonst hergeleitet)
  add column if not exists vorgaenger_id  uuid references public.aufgaben (id);
alter table public.aufgaben add constraint aufgaben_teilschritte_liste check (jsonb_typeof(teilschritte) = 'array');
create index if not exists aufgaben_erstellt_von_idx on public.aufgaben (erstellt_von) where geloescht_am is null;
create unique index if not exists aufgaben_vorgaenger_einmal on public.aufgaben (vorgaenger_id) where geloescht_am is null;

-- Regeln: «eigene» = jede Person sieht eigene, vergebene und nicht zugeteilte; «alle» = alle sehen alle.
insert into public.einstellungen (schluessel, wert) values ('aufgaben', '{
  "sichtbarkeit": "eigene",
  "vertretung": true,
  "notiz_in_verlauf": true,
  "erinnern_ab": "07:00"
}'::jsonb) on conflict (schluessel) do nothing;

create or replace function intern.aufgaben_einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'aufgaben.kein_recht';
  end if;
  return new;
end
$$;
create trigger aufgaben_schuetzen before insert or update on public.einstellungen
  for each row when (new.schluessel = 'aufgaben') execute function intern.aufgaben_einstellung_schuetzen();

/** Heute in Zürich (Aufgaben werden nach Schweizer Datum fällig). */
create or replace function intern.heute_zuerich() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'Europe/Zurich')::date $$;

/** Sieht die angemeldete Person alle Aufgaben? Einstellung «alle» oder Geschäftsleitung (heute: Administration). */
create or replace function intern.aufgaben_sieht_alle() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select e.wert ->> 'sichtbarkeit' from public.einstellungen e where e.schluessel = 'aufgaben'), 'eigene') = 'alle'
      or intern.hat_recht('gl')
$$;

/**
 * Personen, die ich heute vertrete: abwesend, und ich bin ihre Stellvertretung in einstellungen.zustaendigkeiten.
 * Nur wenn einstellungen.aufgaben.vertretung eingeschaltet ist.
 */
create or replace function intern.aufgaben_vertrete() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.id), '{}')
    from public.personen p
    join public.einstellungen z on z.schluessel = 'zustaendigkeiten'
    join public.personen ich on ich.id = intern.meine_person_id()
   where p.aktiv and p.geloescht_am is null
     and coalesce((select (e.wert ->> 'vertretung')::boolean from public.einstellungen e where e.schluessel = 'aufgaben'), true)
     and z.wert -> 'stellvertretung' ->> p.kuerzel = ich.kuerzel
     and intern.abwesend(p.id, intern.heute_zuerich())
$$;
grant execute on function intern.heute_zuerich() to authenticated;
grant execute on function intern.aufgaben_sieht_alle() to authenticated;
grant execute on function intern.aufgaben_vertrete() to authenticated;

-- Sichtbarkeit: eigene, von mir vergebene, nicht zugeteilte, vertretene; alle bei «alle» oder Geschäftsleitung.
drop policy lesen on public.aufgaben;
drop policy aendern on public.aufgaben;
create policy lesen on public.aufgaben for select to authenticated using (
  (select intern.hat_recht('basis')) and (
    (select intern.aufgaben_sieht_alle())
    or person_id is null
    or person_id = (select intern.meine_person_id())
    or erstellt_von = (select auth.uid())
    or (select intern.aufgaben_vertrete()) @> array[person_id]));
create policy aendern on public.aufgaben for update to authenticated using (
  (select intern.hat_recht('basis')) and (
    (select intern.aufgaben_sieht_alle())
    or person_id is null
    or person_id = (select intern.meine_person_id())
    or erstellt_von = (select auth.uid())
    or (select intern.aufgaben_vertrete()) @> array[person_id]))
  with check ((select intern.hat_recht('basis')));

-- Kommentare (Verlauf der Aufgabe); sichtbar, wenn die Aufgabe sichtbar ist.
create table public.aufgaben_kommentare (
  id         uuid primary key default gen_random_uuid(),
  aufgabe_id uuid not null references public.aufgaben (id),
  person_id  uuid references public.personen (id) default intern.meine_person_id(),
  text       text not null check (length(trim(text)) between 1 and 4000)
);
select intern.richte_fachtabelle_ein('aufgaben_kommentare');
create index aufgaben_kommentare_aufgabe_idx on public.aufgaben_kommentare (aufgabe_id, erstellt_am);
drop policy lesen on public.aufgaben_kommentare;
create policy lesen on public.aufgaben_kommentare for select to authenticated
  using (exists (select 1 from public.aufgaben a where a.id = aufgabe_id));
drop policy anlegen on public.aufgaben_kommentare;
create policy anlegen on public.aufgaben_kommentare for insert to authenticated
  with check (person_id = (select intern.meine_person_id()) and exists (select 1 from public.aufgaben a where a.id = aufgabe_id));
drop policy aendern on public.aufgaben_kommentare;
create policy aendern on public.aufgaben_kommentare for update to authenticated
  using (person_id = (select intern.meine_person_id())) with check (person_id = (select intern.meine_person_id()));

/** Lesbarer Name des Datensatzes, an dem eine Aufgabe hängt (mit den Rechten der lesenden Person). */
create or replace function intern.aufgabe_bezug_name(p_tabelle text, p_id uuid) returns text
language plpgsql stable security invoker set search_path = '' as $$
declare
  r text;
begin
  if p_tabelle is null or p_id is null then return null; end if;
  case p_tabelle
    when 'verkaufschancen' then
      select intern.kontaktname(k) into r from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id where v.id = p_id;
    when 'offerten' then
      select concat_ws(' · ', o.nummer, intern.kontaktname(k)) into r from public.offerten o join public.kontakte k on k.id = o.kontakt_id where o.id = p_id;
    when 'projekte' then
      select concat_ws(' · ', x.nummer, intern.kontaktname(k)) into r from public.projekte x join public.kontakte k on k.id = x.kontakt_id where x.id = p_id;
    when 'service_faelle' then
      select concat_ws(' · ', s.nummer, s.titel) into r from public.service_faelle s where s.id = p_id;
    when 'kontakte' then
      select intern.kontaktname(k) into r from public.kontakte k where k.id = p_id;
    when 'rechnungen' then
      select concat_ws(' · ', x.nummer, intern.kontaktname(k)) into r from public.rechnungen x join public.kontakte k on k.id = x.kontakt_id where x.id = p_id;
    when 'wartungsvertraege' then
      select intern.kontaktname(k) into r from public.wartungsvertraege w join public.kontakte k on k.id = w.kontakt_id where w.id = p_id;
    when 'ausschreibungen' then
      select a.titel into r from public.ausschreibungen a where a.id = p_id;
    when 'grossprojekte' then
      select concat_ws(' · ', g.nummer, g.titel) into r from public.grossprojekte g where g.id = p_id;
    when 'fahrzeuge' then
      select concat_ws(' · ', f.bezeichnung, f.kennzeichen) into r from public.fahrzeuge f where f.id = p_id;
    when 'geraete' then
      select g.bezeichnung into r from public.geraete g where g.id = p_id;
    else r := null;
  end case;
  return nullif(r, '');
end
$$;
grant execute on function intern.aufgabe_bezug_name(text, uuid) to authenticated;

-- Liste für die App: ein Abruf mit Bezug-Name, Herkunft, Ersteller, Kommentaren und Vertretung.
create or replace view public.aufgaben_liste with (security_invoker = true) as
select
  a.id, a.titel, a.text, a.faellig_am, a.person_id, a.bezug_tabelle, a.bezug_id, a.lauf_id,
  a.erledigt_am, a.erledigt_von, a.erledigt_notiz, a.erstellt_am, a.wichtig, a.teilschritte, a.wiederholung,
  ep.id as ersteller_id,
  case
    when a.quelle is not null then a.quelle
    when a.lauf_id is not null then 'automation'
    when a.erstellt_von is null then
      case when a.bezug_tabelle in ('ausschreibungen', 'grossprojekte') then 'monitor'
           when a.bezug_tabelle in ('fahrzeuge', 'geraete', 'qualifikationen') then 'frist'
           else 'system' end
    when ep.id = a.person_id then 'selbst'
    else 'person'
  end as herkunft,
  intern.aufgabe_bezug_name(a.bezug_tabelle, a.bezug_id) as bezug_name,
  (select count(*) from public.aufgaben_kommentare k where k.aufgabe_id = a.id and k.geloescht_am is null)::int as kommentare,
  coalesce(a.person_id = any (intern.aufgaben_vertrete()), false) as vertretung
from public.aufgaben a
left join public.personen ep on ep.auth_user_id = a.erstellt_von and ep.geloescht_am is null
where a.geloescht_am is null;
grant select on public.aufgaben_liste to authenticated;

/** Glocke an eine Person (nie an mich selbst). */
create or replace function intern.aufgabe_glocke(p_person uuid, p_titel_de text, p_titel_fr text, p_text text, p_aufgabe uuid)
returns void
language sql security definer set search_path = '' as $$
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select p_person, 'info', p_titel_de, p_titel_fr, p_text, p_text, '/tasks?aufgabe=' || p_aufgabe
   where p_person is not null and p_person is distinct from intern.meine_person_id()
$$;

/** Nächstes Fälligkeitsdatum einer wiederkehrenden Aufgabe. */
create or replace function intern.aufgabe_naechstes(p_ab date, p_rhythmus text) returns date
language sql immutable set search_path = '' as $$
  select (p_ab + case p_rhythmus when 'woche' then interval '7 days' when 'monat' then interval '1 month'
                                 when 'quartal' then interval '3 months' else interval '1 year' end)::date
$$;

/**
 * Nach dem Speichern: Glocke bei Zuteilung/Weitergabe durch jemand anderen, Glocke an die Person, die die Aufgabe
 * vergeben hat, wenn sie erledigt ist, und bei Wiederholung die nächste Aufgabe (einmal, über vorgaenger_id).
 */
create or replace function intern.aufgabe_nach_speichern() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  ich_name text := (select p.name from public.personen p where p.id = intern.meine_person_id());
  ersteller uuid := (select p.id from public.personen p where p.auth_user_id = new.erstellt_von and p.geloescht_am is null);
begin
  if auth.uid() is not null and new.person_id is not null and new.erledigt_am is null
     and ((tg_op = 'INSERT' and new.vorgaenger_id is null) or (tg_op = 'UPDATE' and new.person_id is distinct from old.person_id)) then
    perform intern.aufgabe_glocke(new.person_id,
      'Neue Aufgabe' || coalesce(' von ' || ich_name, ''), 'Nouvelle tâche' || coalesce(' de ' || ich_name, ''),
      new.titel, new.id);
  end if;

  if tg_op = 'UPDATE' and old.erledigt_am is null and new.erledigt_am is not null then
    if ersteller is distinct from new.person_id then
      perform intern.aufgabe_glocke(ersteller,
        'Erledigt' || coalesce(' von ' || ich_name, ''), 'Terminée' || coalesce(' par ' || ich_name, ''),
        concat_ws(' – ', new.titel, new.erledigt_notiz), new.id);
    end if;
    if new.wiederholung is not null and new.geloescht_am is null then
      insert into public.aufgaben (titel, text, faellig_am, person_id, bezug_tabelle, bezug_id, wichtig, teilschritte,
                                   wiederholung, quelle, vorgaenger_id, erstellt_von)
      values (new.titel, new.text,
              intern.aufgabe_naechstes(greatest(coalesce(new.faellig_am, intern.heute_zuerich()),
                                                intern.heute_zuerich() - 1), new.wiederholung),
              new.person_id, new.bezug_tabelle, new.bezug_id, new.wichtig,
              coalesce((select jsonb_agg(t || '{"erledigt": false}') from jsonb_array_elements(new.teilschritte) t), '[]'),
              new.wiederholung, new.quelle, new.id, new.erstellt_von)
      on conflict do nothing;
    end if;
  end if;
  return null;
end
$$;
create trigger nach_speichern after insert or update on public.aufgaben
  for each row execute function intern.aufgabe_nach_speichern();

/** Kommentar: Glocke an die zuständige Person, an wer die Aufgabe vergeben hat und an alle @Kurzzeichen. */
create or replace function intern.aufgabe_kommentar_melden() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  a public.aufgaben;
  von text := (select p.name from public.personen p where p.id = new.person_id);
  wer uuid;
begin
  select * into a from public.aufgaben where id = new.aufgabe_id;
  for wer in
    select a.person_id
    union select p.id from public.personen p where p.auth_user_id = a.erstellt_von
    union select p.id from public.personen p
           where p.aktiv and p.geloescht_am is null
             and exists (select 1 from regexp_matches(new.text, '@([[:alnum:]_.-]+)', 'g') as m(treffer)
                          where lower(m.treffer[1]) in (lower(p.kurzzeichen), lower(p.kuerzel)))
  loop
    perform intern.aufgabe_glocke(wer, coalesce(von, 'Kommentar') || ': ' || a.titel,
                                  coalesce(von, 'Commentaire') || ' : ' || a.titel, left(new.text, 200), a.id);
  end loop;
  return null;
end
$$;
create trigger melden after insert on public.aufgaben_kommentare
  for each row execute function intern.aufgabe_kommentar_melden();

/**
 * Erledigen mit optionaler Notiz. Ist «notiz_in_verlauf» eingeschaltet, steht die Notiz auch im Verlauf des Leads,
 * der Offerte, des Projekts, Kunden, Grossprojekts, der Ausschreibung oder des Service-Falls.
 */
create or replace function public.aufgabe_erledigen(p_id uuid, p_notiz text default null) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  a public.aufgaben;
  notiz text := nullif(trim(coalesce(p_notiz, '')), '');
  in_verlauf boolean := coalesce((select (e.wert ->> 'notiz_in_verlauf')::boolean
                                    from public.einstellungen e where e.schluessel = 'aufgaben'), true);
  kontakt uuid;
  zeile text;
begin
  update public.aufgaben
     set erledigt_am = now(), erledigt_von = intern.meine_person_id(), erledigt_notiz = notiz
   where id = p_id and geloescht_am is null and erledigt_am is null
  returning * into a;
  if a.id is null then raise exception using errcode = 'P0001', message = 'aufgaben.nicht_gefunden'; end if;
  if notiz is null or not in_verlauf or a.bezug_id is null then return; end if;

  zeile := 'Aufgabe erledigt: ' || a.titel || E'\n' || notiz;
  if a.bezug_tabelle = 'service_faelle' then
    perform public.service_notiz(a.bezug_id, zeile);
    return;
  end if;
  kontakt := case a.bezug_tabelle
    when 'kontakte' then a.bezug_id
    when 'verkaufschancen' then (select v.kontakt_id from public.verkaufschancen v where v.id = a.bezug_id)
    when 'offerten' then (select o.kontakt_id from public.offerten o where o.id = a.bezug_id)
    when 'projekte' then (select x.kontakt_id from public.projekte x where x.id = a.bezug_id)
  end;
  if kontakt is null and a.bezug_tabelle not in ('grossprojekte', 'ausschreibungen') then return; end if;
  insert into public.aktivitaeten (art, text, person_id, kontakt_id, verkaufschance_id, offerte_id, projekt_id,
                                   grossprojekt_id, ausschreibung_id, details)
  values ('notiz', zeile, intern.meine_person_id(), kontakt,
          case when a.bezug_tabelle = 'verkaufschancen' then a.bezug_id end,
          case when a.bezug_tabelle = 'offerten' then a.bezug_id end,
          case when a.bezug_tabelle = 'projekte' then a.bezug_id end,
          case when a.bezug_tabelle = 'grossprojekte' then a.bezug_id end,
          case when a.bezug_tabelle = 'ausschreibungen' then a.bezug_id end,
          jsonb_build_object('aufgabe_id', a.id));
end
$$;
revoke execute on function public.aufgabe_erledigen(uuid, text) from public, anon;
grant execute on function public.aufgabe_erledigen(uuid, text) to authenticated;

/** Team-Sicht (Geschäftsleitung): je Person offen, überfällig, heute, erledigt in 7 Tagen, abwesend. */
create or replace function public.aufgaben_team() returns table (
  person_id uuid, name text, kurzzeichen text, offen int, ueberfaellig int, heute int, erledigt_7 int, abwesend boolean)
language sql stable security definer set search_path = '' as $$
  with t as (select intern.heute_zuerich() as h)
  select p.id, p.name, p.kurzzeichen,
         count(a.id) filter (where a.erledigt_am is null)::int,
         count(a.id) filter (where a.erledigt_am is null and a.faellig_am < t.h)::int,
         count(a.id) filter (where a.erledigt_am is null and a.faellig_am = t.h)::int,
         count(a.id) filter (where a.erledigt_am >= now() - interval '7 days')::int,
         intern.abwesend(p.id, t.h)
    from public.personen p
    cross join t
    left join public.aufgaben a on a.person_id = p.id and a.geloescht_am is null
   where intern.aufgaben_sieht_alle() and p.aktiv and p.geloescht_am is null
   group by p.id, p.name, p.kurzzeichen, t.h
  union all
  select null, null, null,
         count(*)::int, count(*) filter (where a.faellig_am < t.h)::int, count(*) filter (where a.faellig_am = t.h)::int,
         0, false
    from public.aufgaben a cross join t
   where intern.aufgaben_sieht_alle() and a.person_id is null and a.geloescht_am is null and a.erledigt_am is null
   group by t.h
$$;
revoke execute on function public.aufgaben_team() from public, anon;
grant execute on function public.aufgaben_team() to authenticated;

-- Morgen-Glocke: einmal pro Person und Arbeitstag, ab «erinnern_ab», nur wenn heute oder Überfälliges offen ist.
create table intern.aufgaben_gemeldet (person_id uuid not null, tag date not null, primary key (person_id, tag));

/** Vom Zeitplan stündlich: «3 Aufgaben heute fällig, 1 überfällig» (inkl. Vertretung). Gibt die Anzahl Glocken zurück. */
create or replace function public.aufgaben_melden(p_jetzt timestamptz default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  jetzt timestamp := coalesce(p_jetzt, now()) at time zone 'Europe/Zurich';
  heute date := jetzt::date;
  ab time := coalesce((select (e.wert ->> 'erinnern_ab')::time from public.einstellungen e where e.schluessel = 'aufgaben'), '07:00');
  vertretung boolean := coalesce((select (e.wert ->> 'vertretung')::boolean from public.einstellungen e where e.schluessel = 'aufgaben'), true);
  z public.einstellungen;
  r record;
  n int := 0;
  k int;
  text_de text;
  text_fr text;
begin
  if extract(isodow from heute) > 5 or jetzt::time < ab then return 0; end if;
  select * into z from public.einstellungen where schluessel = 'zustaendigkeiten';
  for r in
    select p.id,
           count(*) filter (where a.faellig_am = heute) as heute_n,
           count(*) filter (where a.faellig_am < heute) as ueber_n
      from public.personen p
      join public.aufgaben a on a.geloescht_am is null and a.erledigt_am is null and a.faellig_am <= heute
       and (a.person_id = p.id
            or (vertretung and intern.abwesend(a.person_id, heute)
                and z.wert -> 'stellvertretung' ->> (select q.kuerzel from public.personen q where q.id = a.person_id) = p.kuerzel))
     where p.aktiv and p.geloescht_am is null and p.auth_user_id is not null and not intern.abwesend(p.id, heute)
     group by p.id
  loop
    insert into intern.aufgaben_gemeldet values (r.id, heute) on conflict do nothing;
    get diagnostics k = row_count;
    continue when k = 0;
    n := n + 1;
    text_de := concat_ws(', ', case when r.heute_n > 0 then r.heute_n || ' heute fällig' end,
                               case when r.ueber_n > 0 then r.ueber_n || ' überfällig' end);
    text_fr := concat_ws(', ', case when r.heute_n > 0 then r.heute_n || ' pour aujourd''hui' end,
                               case when r.ueber_n > 0 then r.ueber_n || ' en retard' end);
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    values (r.id, case when r.ueber_n > 0 then 'warnung' else 'info' end, 'Deine Aufgaben heute', 'Tes tâches du jour',
            text_de, text_fr, '/tasks');
  end loop;
  delete from intern.aufgaben_gemeldet where tag < heute - 30;
  return n;
end
$$;
revoke execute on function public.aufgaben_melden(timestamptz) from public, anon, authenticated;
grant execute on function public.aufgaben_melden(timestamptz) to service_role;
