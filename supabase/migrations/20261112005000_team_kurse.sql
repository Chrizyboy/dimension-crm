-- Team & Ausweise vollständig (2.11.2026): Team-Übersicht mit «Heute», Kurse und Weiterbildungen mit Antrag,
-- Bewilligung, Kosten und Budget, Ausweis nach dem Kurs automatisch, Anforderungen je Rolle als Daten.
-- Kurstage sperren die Einsatzplanung über eine Abwesenheit «Weiterbildung» (wochenplan() kennt sie schon).

-- ---------- Einstellungen ----------

-- Grenze für die Bewilligung durch die/den Vorgesetzte/n (darüber Recht «personal»), Jahresbudget je Jahr.
insert into public.einstellungen (schluessel, wert)
values ('team', '{"bewilligung_grenze_rappen": 100000, "budget_rappen": {"2026": 1000000}, "vereinbarung_ab_rappen": 100000}')
on conflict (schluessel) do nothing;

-- ---------- Kurse ----------

create table public.kurse (
  id                  uuid primary key default gen_random_uuid(),
  titel               text not null,
  art                 text,                       -- Schlüssel der Auswahlliste «qualifikation»; leer = Weiterbildung ohne Ausweis
  anbieter            text,
  ort                 text,
  von                 date,
  bis                 date,
  kosten_rappen       int check (kosten_rappen is null or kosten_rappen >= 0),
  personen            uuid[] not null default '{}',
  besucht_von         uuid[] not null default '{}',
  stand               text not null default 'beantragt'
                      check (stand in ('beantragt', 'bewilligt', 'angemeldet', 'besucht', 'abgesagt')),
  beantragt_von       uuid references public.personen (id),
  bewilligt_von       uuid references public.personen (id),
  bewilligt_am        timestamptz,
  absage_grund        text,
  -- Weiterbildungsvereinbarung: Rückzahlung bei Kündigung, linear abnehmend bis «vereinbarung_bis».
  vereinbarung_rappen int check (vereinbarung_rappen is null or vereinbarung_rappen >= 0),
  vereinbarung_bis    date,
  notiz               text,
  constraint kurse_daten check (bis is null or von is null or bis >= von),
  constraint kurse_angemeldet check (stand not in ('angemeldet', 'besucht') or von is not null)
);
select intern.richte_fachtabelle_ein('kurse');
update intern.tabellen_leserecht set recht = 'personal' where tabelle = 'kurse';
create index kurse_personen on public.kurse using gin (personen) where geloescht_am is null;
comment on table public.kurse is
  'Kurse und Weiterbildungen (2.11.2026). Ändern nur über kurs_speichern/kurs_entscheiden/kurs_besucht, lesen über team_kurse().';

alter table public.qualifikationen add column kurs_id uuid references public.kurse (id);
alter table public.abwesenheiten add column kurs_id uuid references public.kurse (id);

-- ---------- Wer darf ----------

/** Darf die angemeldete Person den Kurs für diese Personen planen (Recht «personal» oder vorgesetzt für alle)? */
create or replace function intern.kurs_darf_planen(p_personen uuid[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.hat_recht('personal')
      or (cardinality(p_personen) > 0 and not exists (select 1 from unnest(p_personen) x where not intern.ist_vorgesetzt(x)))
$$;

/** Darf die angemeldete Person bewilligen? Recht «personal» immer, Vorgesetzte bis zur Grenze aus einstellungen.team. */
create or replace function intern.kurs_darf_bewilligen(p_personen uuid[], p_kosten int) returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.hat_recht('personal')
      or (intern.kurs_darf_planen(p_personen)
          and coalesce(p_kosten, 0) <= coalesce((select (wert ->> 'bewilligung_grenze_rappen')::int
                                                   from public.einstellungen where schluessel = 'team'), 100000))
$$;

-- Lesen der Tabelle (Kosten inklusive): Recht «personal», Teilnehmende und ihre Vorgesetzten. Alle anderen lesen über
-- team_kurse() ohne Kosten. Ändern nur über die Abläufe unten.
drop policy if exists "lesen" on public.kurse;
drop policy if exists "anlegen" on public.kurse;
drop policy if exists "aendern" on public.kurse;
create policy "lesen" on public.kurse for select to authenticated
  using ((select intern.hat_recht('personal')) or (select intern.meine_person_id()) = any (personen)
         or exists (select 1 from unnest(personen) x where intern.ist_vorgesetzt(x)));

/** Wer einen Antrag bewilligt: Vorgesetzte der Teilnehmenden (bis zur Grenze), sonst alle mit Recht «personal». */
create or replace function intern.kurs_bewilliger(k public.kurse) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select case
    when coalesce(k.kosten_rappen, 0) <= coalesce((select (wert ->> 'bewilligung_grenze_rappen')::int
                                                    from public.einstellungen where schluessel = 'team'), 100000)
         and exists (select 1 from public.personal_akten a
                      where a.person_id = any (k.personen) and a.geloescht_am is null and a.vorgesetzt_id is not null)
    then (select array_agg(distinct a.vorgesetzt_id) from public.personal_akten a
           where a.person_id = any (k.personen) and a.geloescht_am is null and a.vorgesetzt_id is not null)
    else intern.personal_berechtigte()
  end
$$;

/** Glocke an mehrere Personen (ohne die angemeldete Person selbst). */
create or replace function intern.kurs_glocke(p_an uuid[], p_art text, p_de text, p_fr text, p_text_de text,
                                              p_text_fr text, p_kurs uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select distinct x, p_art, p_de, p_fr, p_text_de, p_text_fr, '/staff?reiter=kurse&kurs=' || p_kurs
    from unnest(p_an) x
   where x is not null and x is distinct from intern.meine_person_id()
$$;

-- ---------- Kurstage in der Einsatzplanung ----------

/**
 * Hält die Abwesenheiten «Weiterbildung» eines Kurses mit dem Kurs gleich: angemeldet oder besucht = je Person eine
 * Abwesenheit von–bis; sonst (beantragt, bewilligt, abgesagt, Papierkorb) keine. Nie hart löschen.
 */
create or replace function intern.kurs_abwesenheiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.abwesenheiten a set geloescht_am = now()
   where a.kurs_id = new.id and a.geloescht_am is null
     and (new.geloescht_am is not null or new.stand not in ('angemeldet', 'besucht')
          or not (a.person_id = any (new.personen)) or a.von <> new.von or a.bis <> coalesce(new.bis, new.von));
  if new.geloescht_am is null and new.stand in ('angemeldet', 'besucht') and new.von is not null then
    insert into public.abwesenheiten (person_id, art, von, bis, kurs_id)
    select x, 'weiterbildung', new.von, coalesce(new.bis, new.von), new.id
      from unnest(new.personen) x
     where not exists (select 1 from public.abwesenheiten a
                        where a.kurs_id = new.id and a.person_id = x and a.geloescht_am is null);
  end if;
  return new;
end
$$;
create trigger kurs_abwesenheiten after insert or update on public.kurse
  for each row execute function intern.kurs_abwesenheiten();

-- ---------- Abläufe ----------

/**
 * Kurs anlegen (p_id null) oder ändern. Wer nicht planen darf, beantragt nur für sich selbst (Stand «beantragt»,
 * Glocke an die Bewilligenden). Wer planen darf, setzt Stand bis «angemeldet»; bewilligt oder angemeldet nur, wer
 * auch bewilligen darf (Grenze). «besucht» geht nur über kurs_besucht, «abgesagt» über kurs_entscheiden.
 */
create or replace function public.kurs_speichern(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  alt public.kurse;
  k public.kurse;
  v_personen uuid[] := coalesce((select array_agg(distinct x::uuid) from jsonb_array_elements_text(p -> 'personen') x), '{}');
  v_stand text := coalesce(nullif(p ->> 'stand', ''), 'beantragt');
  planer boolean;
begin
  if ich is null then raise exception using errcode = '42501', message = 'kurs.kein_recht'; end if;
  if coalesce(trim(p ->> 'titel'), '') = '' then raise exception using errcode = 'P0001', message = 'kurs.titel_fehlt'; end if;
  if cardinality(v_personen) = 0 then raise exception using errcode = 'P0001', message = 'kurs.niemand'; end if;
  if v_stand not in ('beantragt', 'bewilligt', 'angemeldet') then
    raise exception using errcode = 'P0001', message = 'kurs.stand';
  end if;
  if p_id is not null then
    select * into alt from public.kurse where id = p_id and geloescht_am is null for update;
    if not found then raise exception using errcode = 'P0002', message = 'kurs.nicht_gefunden'; end if;
    if alt.stand in ('besucht', 'abgesagt') then raise exception using errcode = 'P0001', message = 'kurs.abgeschlossen'; end if;
  end if;

  planer := intern.kurs_darf_planen(v_personen) and (p_id is null or intern.kurs_darf_planen(alt.personen));
  if not planer then
    -- Eigener Antrag: nur für sich, nur beantragt, und nur solange niemand bewilligt hat.
    if v_personen <> array[ich] or (p_id is not null and (alt.beantragt_von is distinct from ich or alt.stand <> 'beantragt')) then
      raise exception using errcode = '42501', message = 'kurs.kein_recht';
    end if;
    v_stand := 'beantragt';
  elsif v_stand <> 'beantragt'
        and not intern.kurs_darf_bewilligen(v_personen, nullif(p ->> 'kosten_rappen', '')::int) then
    raise exception using errcode = '42501', message = 'kurs.grenze';
  end if;
  if v_stand = 'angemeldet' and nullif(p ->> 'von', '') is null then
    raise exception using errcode = 'P0001', message = 'kurs.datum_fehlt';
  end if;

  if p_id is null then
    insert into public.kurse (titel, art, anbieter, ort, von, bis, kosten_rappen, personen, stand, beantragt_von,
                              bewilligt_von, bewilligt_am, vereinbarung_rappen, vereinbarung_bis, notiz)
    values (trim(p ->> 'titel'), nullif(p ->> 'art', ''), nullif(trim(p ->> 'anbieter'), ''), nullif(trim(p ->> 'ort'), ''),
            nullif(p ->> 'von', '')::date, nullif(p ->> 'bis', '')::date, nullif(p ->> 'kosten_rappen', '')::int,
            v_personen, v_stand, ich,
            case when v_stand <> 'beantragt' then ich end, case when v_stand <> 'beantragt' then now() end,
            nullif(p ->> 'vereinbarung_rappen', '')::int, nullif(p ->> 'vereinbarung_bis', '')::date,
            nullif(trim(p ->> 'notiz'), ''))
    returning * into k;
  else
    update public.kurse set
      titel = trim(p ->> 'titel'), art = nullif(p ->> 'art', ''), anbieter = nullif(trim(p ->> 'anbieter'), ''),
      ort = nullif(trim(p ->> 'ort'), ''), von = nullif(p ->> 'von', '')::date, bis = nullif(p ->> 'bis', '')::date,
      kosten_rappen = nullif(p ->> 'kosten_rappen', '')::int, personen = v_personen, stand = v_stand,
      bewilligt_von = case when v_stand <> 'beantragt' then coalesce(alt.bewilligt_von, ich) end,
      bewilligt_am = case when v_stand <> 'beantragt' then coalesce(alt.bewilligt_am, now()) end,
      vereinbarung_rappen = nullif(p ->> 'vereinbarung_rappen', '')::int,
      vereinbarung_bis = nullif(p ->> 'vereinbarung_bis', '')::date, notiz = nullif(trim(p ->> 'notiz'), '')
     where id = p_id
    returning * into k;
  end if;

  if k.stand = 'beantragt' and (p_id is null or alt.stand <> 'beantragt') then
    perform intern.kurs_glocke(intern.kurs_bewilliger(k), 'info',
      'Kurs beantragt: ' || k.titel, 'Formation demandée : ' || k.titel,
      (select string_agg(x.name, ', ') from public.personen x where x.id = any (k.personen)),
      (select string_agg(x.name, ', ') from public.personen x where x.id = any (k.personen)), k.id);
  elsif k.stand = 'angemeldet' and (p_id is null or alt.stand <> 'angemeldet') then
    perform intern.kurs_glocke(k.personen, 'info', 'Du bist angemeldet: ' || k.titel,
      'Tu es inscrit·e : ' || k.titel, to_char(k.von, 'DD.MM.YYYY') || coalesce(', ' || k.ort, ''),
      to_char(k.von, 'DD.MM.YYYY') || coalesce(', ' || k.ort, ''), k.id);
  end if;
  return k.id;
end
$$;
revoke execute on function public.kurs_speichern(uuid, jsonb) from public, anon;
grant execute on function public.kurs_speichern(uuid, jsonb) to authenticated;

/** Antrag bewilligen oder ablehnen (mit Grund). Ablehnen oder Absagen geht in jedem offenen Stand. */
create or replace function public.kurs_entscheiden(p_id uuid, p_bewilligt boolean, p_grund text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  k public.kurse;
begin
  select * into k from public.kurse where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'kurs.nicht_gefunden'; end if;
  if k.stand in ('besucht', 'abgesagt') then raise exception using errcode = 'P0001', message = 'kurs.abgeschlossen'; end if;
  if p_bewilligt then
    if k.stand <> 'beantragt' then raise exception using errcode = 'P0001', message = 'kurs.stand'; end if;
    if not intern.kurs_darf_bewilligen(k.personen, k.kosten_rappen) then
      raise exception using errcode = '42501', message = 'kurs.grenze';
    end if;
    update public.kurse set stand = 'bewilligt', bewilligt_von = intern.meine_person_id(), bewilligt_am = now()
     where id = p_id;
    perform intern.kurs_glocke(k.personen || k.beantragt_von, 'ok', 'Kurs bewilligt: ' || k.titel,
      'Formation approuvée : ' || k.titel, null, null, k.id);
  else
    -- Ablehnen: wer bewilligen dürfte; zurückziehen: wer den eigenen Antrag gestellt hat.
    if not (intern.kurs_darf_planen(k.personen)
            or (k.stand = 'beantragt' and k.beantragt_von = intern.meine_person_id())) then
      raise exception using errcode = '42501', message = 'kurs.kein_recht';
    end if;
    update public.kurse set stand = 'abgesagt', absage_grund = nullif(trim(p_grund), '') where id = p_id;
    perform intern.kurs_glocke(k.personen || k.beantragt_von, 'warnung',
      case when k.stand = 'beantragt' then 'Kurs abgelehnt: ' else 'Kurs abgesagt: ' end || k.titel,
      case when k.stand = 'beantragt' then 'Formation refusée : ' else 'Formation annulée : ' end || k.titel,
      nullif(trim(p_grund), ''), nullif(trim(p_grund), ''), k.id);
  end if;
end
$$;
revoke execute on function public.kurs_entscheiden(uuid, boolean, text) from public, anon;
grant execute on function public.kurs_entscheiden(uuid, boolean, text) to authenticated;

/**
 * Kurs als besucht abschliessen. Für jede Person, die dabei war, entsteht der Ausweis (wenn der Kurs einen ergibt) mit
 * «gültig bis» aus der Gültigkeit der Art; dazu eine Aufgabe «Bestätigung hochladen». Wiederholen ändert nichts.
 */
create or replace function public.kurs_besucht(p_id uuid, p_personen uuid[] default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  k public.kurse;
  dabei uuid[];
  monate int;
  datum date;
  n int := 0;
begin
  select * into k from public.kurse where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'kurs.nicht_gefunden'; end if;
  if k.stand = 'besucht' then return 0; end if;
  if k.stand <> 'angemeldet' then raise exception using errcode = 'P0001', message = 'kurs.stand'; end if;
  if not intern.kurs_darf_planen(k.personen) then raise exception using errcode = '42501', message = 'kurs.kein_recht'; end if;
  dabei := coalesce((select array_agg(x) from unnest(coalesce(p_personen, k.personen)) x where x = any (k.personen)), '{}');
  datum := coalesce(k.bis, k.von);
  update public.kurse set stand = 'besucht', besucht_von = dabei where id = p_id;
  if k.art is not null then
    select (a.eigenschaften ->> 'gueltig_monate')::int into monate
      from public.auswahlwerte a where a.liste = 'qualifikation' and a.schluessel = k.art;
    insert into public.qualifikationen (person_id, art, bezeichnung, erworben_am, gueltig_bis, aussteller, kurs_id)
    select x, k.art, k.titel, datum,
           case when monate is not null then (datum + make_interval(months => monate))::date end, k.anbieter, k.id
      from unnest(dabei) x;
    get diagnostics n = row_count;
    insert into public.aufgaben (titel, faellig_am, person_id, bezug_tabelle, bezug_id)
    select 'Kursbestätigung hochladen: ' || k.titel, datum + 14, x, 'personen', x from unnest(dabei) x;
  end if;
  return n;
end
$$;
revoke execute on function public.kurs_besucht(uuid, uuid[]) from public, anon;
grant execute on function public.kurs_besucht(uuid, uuid[]) to authenticated;

/**
 * Kurse eines Jahres (nach Datum, ohne Datum zuerst). Alle sehen alle Kurse (Planung); Kosten und Vereinbarung nur
 * Recht «personal» oder «finanzen», Teilnehmende und ihre Vorgesetzten. Dazu Budget und was man selbst darf.
 */
create or replace function public.team_kurse(p_jahr int default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  jahr int := coalesce(p_jahr, extract(year from (now() at time zone 'Europe/Zurich'))::int);
  cfg jsonb := coalesce((select wert from public.einstellungen where schluessel = 'team'), '{}');
  ich uuid := intern.meine_person_id();
  alle_kosten boolean := intern.hat_recht('personal') or intern.hat_recht('finanzen');
begin
  if ich is null then raise exception using errcode = '42501', message = 'kurs.kein_recht'; end if;
  return jsonb_build_object(
    'jahr', jahr,
    'grenze_rappen', coalesce((cfg ->> 'bewilligung_grenze_rappen')::int, 100000),
    'vereinbarung_ab_rappen', coalesce((cfg ->> 'vereinbarung_ab_rappen')::int, 100000),
    'budget_rappen', case when alle_kosten then (cfg -> 'budget_rappen' ->> jahr::text)::int end,
    'darf', jsonb_build_object('alle_kosten', alle_kosten, 'personal', intern.hat_recht('personal')),
    'kurse', coalesce((
      select jsonb_agg(z order by (z ->> 'von') nulls first, z ->> 'titel') from (
        select to_jsonb(k) - array['erstellt_am', 'erstellt_von', 'geaendert_am', 'geloescht_am', 'alt_id', 'alt_daten',
                                   'kosten_rappen', 'vereinbarung_rappen', 'vereinbarung_bis']
               || case when alle_kosten or ich = any (k.personen)
                            or exists (select 1 from unnest(k.personen) x where intern.ist_vorgesetzt(x))
                       then jsonb_build_object('kosten_rappen', k.kosten_rappen, 'vereinbarung_rappen',
                                               k.vereinbarung_rappen, 'vereinbarung_bis', k.vereinbarung_bis)
                       else '{}' end
               || jsonb_build_object(
                    'darf_planen', intern.kurs_darf_planen(k.personen),
                    'darf_bewilligen', k.stand = 'beantragt' and intern.kurs_darf_bewilligen(k.personen, k.kosten_rappen),
                    'beantragt_name', (select x.name from public.personen x where x.id = k.beantragt_von),
                    'bewilligt_name', (select x.name from public.personen x where x.id = k.bewilligt_von)) as z
          from public.kurse k
         where k.geloescht_am is null
           and (k.von is null or extract(year from k.von)::int = jahr
                or (k.stand in ('beantragt', 'bewilligt') and extract(year from k.erstellt_am)::int = jahr))) y), '[]'));
end
$$;
revoke execute on function public.team_kurse(int) from public, anon;
grant execute on function public.team_kurse(int) to authenticated;

-- ---------- Team-Übersicht mit «Heute» ----------

/**
 * Alle aktiven Personen mit Kontakt, Funktion, Vorgesetzt und was sie am Tag tun: abwesend (Grund nur für die Person
 * selbst, Vorgesetzte, Recht «personal» oder «finanzen»), Kurs, Montage-Einsatz (Projekt, Ort) oder Service-Termin.
 */
create or replace function public.team_uebersicht(p_tag date default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tag date := coalesce(p_tag, (now() at time zone 'Europe/Zurich')::date);
  ich uuid := intern.meine_person_id();
  alle_gruende boolean := intern.hat_recht('personal') or intern.hat_recht('finanzen');
begin
  if ich is null then raise exception using errcode = '42501', message = 'team.kein_recht'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'kuerzel', p.kuerzel, 'rolle', p.rolle, 'rolle_de', r.name_de, 'rolle_fr', r.name_fr,
      'standort_id', p.standort_id, 'standort', s.name, 'sprache', p.sprache, 'email', p.email,
      'telefon', nullif(p.profil ->> 'mobil', ''), 'funktion', coalesce(a.funktion, nullif(p.profil ->> 'position', '')),
      'eintritt', a.eintritt, 'vorgesetzt_id', a.vorgesetzt_id,
      'vorgesetzt_name', (select v.name from public.personen v where v.id = a.vorgesetzt_id),
      'heute', coalesce(
        (select jsonb_build_object('art', case when ab.kurs_id is not null then 'kurs' else 'abwesend' end, 'bis', ab.bis,
                                   'halbtag', ab.halbtag,
                                   'grund', case when ab.kurs_id is not null or alle_gruende or p.id = ich
                                                      or intern.ist_vorgesetzt(p.id) then ab.art end,
                                   'titel', (select k.titel from public.kurse k where k.id = ab.kurs_id))
           from public.abwesenheiten ab
          where ab.person_id = p.id and ab.geloescht_am is null and tag between ab.von and ab.bis
          order by ab.kurs_id nulls last limit 1),
        (select jsonb_build_object('art', 'einsatz', 'nummer', pr.nummer, 'ort', o.ort, 'projekt_id', pr.id)
           from public.einsaetze e
           join public.projekte pr on pr.id = e.projekt_id and pr.geloescht_am is null
           left join public.objekte o on o.id = pr.objekt_id
          where p.id = any (e.personen) and e.geloescht_am is null and tag between e.von and e.bis
          order by e.von limit 1),
        (select jsonb_build_object('art', 'service', 'nummer', f.nummer, 'zeit',
                                   to_char(f.termin_am at time zone 'Europe/Zurich', 'HH24:MI'))
           from public.service_faelle f
          where f.person_id = p.id and f.geloescht_am is null and f.termin_am is not null
            and (f.termin_am at time zone 'Europe/Zurich')::date = tag
          order by f.termin_am limit 1))
    ) order by s.name nulls last, p.name)
      from public.personen p
      left join public.rollen r on r.schluessel = p.rolle
      left join public.standorte s on s.id = p.standort_id
      left join public.personal_akten a on a.person_id = p.id and a.geloescht_am is null
     where p.aktiv and p.geloescht_am is null), '[]');
end
$$;
revoke execute on function public.team_uebersicht(date) from public, anon;
grant execute on function public.team_uebersicht(date) to authenticated;

-- ---------- Anforderungen je Rolle ----------

/**
 * Pflicht je Rolle und Gültigkeit einer Ausweis-Art ändern (Recht «personal» oder Administration). Eine neue Art
 * entsteht, wenn der Schlüssel noch fehlt (Text DE/FR nötig).
 */
create or replace function public.ausweis_anforderung_speichern(p_schluessel text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  pflicht jsonb := coalesce((select jsonb_agg(distinct x) from jsonb_array_elements_text(p -> 'pflicht_fuer') x), '[]');
  monate int := nullif(p ->> 'gueltig_monate', '')::int;
begin
  if not (intern.hat_recht('personal') or intern.hat_recht('admin')) then
    raise exception using errcode = '42501', message = 'team.kein_recht';
  end if;
  if monate is not null and (monate < 1 or monate > 600) then
    raise exception using errcode = 'P0001', message = 'team.gueltigkeit';
  end if;
  update public.auswahlwerte a
     set eigenschaften = (a.eigenschaften - 'gueltig_monate' - 'pflicht_fuer')
                         || jsonb_build_object('pflicht_fuer', pflicht)
                         || case when monate is not null then jsonb_build_object('gueltig_monate', monate) else '{}' end,
         text_de = coalesce(nullif(trim(p ->> 'text_de'), ''), a.text_de),
         text_fr = coalesce(nullif(trim(p ->> 'text_fr'), ''), a.text_fr)
   where a.liste = 'qualifikation' and a.schluessel = p_schluessel;
  if not found then
    if coalesce(trim(p ->> 'text_de'), '') = '' or coalesce(trim(p ->> 'text_fr'), '') = '' then
      raise exception using errcode = 'P0001', message = 'team.text_fehlt';
    end if;
    insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, eigenschaften)
    values ('qualifikation', p_schluessel, trim(p ->> 'text_de'), trim(p ->> 'text_fr'),
            coalesce((select max(reihenfolge) + 10 from public.auswahlwerte where liste = 'qualifikation'), 10),
            jsonb_build_object('pflicht_fuer', pflicht)
              || case when monate is not null then jsonb_build_object('gueltig_monate', monate) else '{}' end);
  end if;
end
$$;
revoke execute on function public.ausweis_anforderung_speichern(text, jsonb) from public, anon;
grant execute on function public.ausweis_anforderung_speichern(text, jsonb) to authenticated;
