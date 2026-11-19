-- Zuteilung wieder nach dem Prinzip der Vorlage (V234), Chris 19.11.2026: «momentan ist alles durcheinander».
--
-- Vorlage: Ein Lead gehört der Region seiner PLZ (Muri = deutsch, Bulle = französisch, Sprachgrenze nach Kanton/PLZ,
-- `computeErst`). Muri → Loris, Bulle → Filipe. Wer eine Offerte nachfasst (`offerPerson`/`fuAuto`): Bulle → Filipe,
-- Muri mit Termin vor Ort → wer vor Ort war, Richtofferte ohne Termin → Andy (Innendienst). Das Projekt übernimmt die
-- Person der Offerte. Seit Entscheid 0032 gingen dagegen alle neuen Offerten (und damit Projekte) an Andy und Leads
-- nach der Sprache des Kontakts statt nach der PLZ.
-- Neu (Chris 19.11.): Jeder neue Service-Fall geht zuerst an Andy; er wählt den Mitarbeiter.
-- Korrigiert wird nur, was eine Regel gesetzt hat (nie von Hand Geändertes); jede Korrektur steht in
-- zuteilung_korrekturen und lässt sich mit zuteilung_korrektur_rueckgaengig() zurücknehmen.

-- 1. Regeln -------------------------------------------------------------------------------------------------------

-- Verkauf nach Standort der PLZ zuerst, Sprache nur noch als Rückfall (z. B. Posteingang ohne Adresse).
-- Nur ersetzen, wenn die Administration die Standard-Regeln nicht schon angepasst hat.
update public.einstellungen
   set wert = jsonb_set(wert, '{verkauf}', $j$[
     {"standort": "bulle", "person": "filipe"},
     {"standort": "muri", "person": "loris"},
     {"sprache": "fr", "person": "filipe"},
     {"sprache": "de", "person": "loris"}
   ]$j$::jsonb)
 where schluessel = 'zustaendigkeiten'
   and wert -> 'verkauf' = '[{"sprache": "fr", "person": "filipe"}, {"sprache": "de", "person": "loris"}]'::jsonb;

-- Ausschreibungen (Chris 19.11.: «AS können nicht bei Loris sein»): «Kontakt suchen» an den Innendienst wie in der
-- Vorlage (Andy), Vertretung beim Senden ebenfalls Andy. Nur ersetzen, was noch auf dem Standard «loris» steht.
update public.einstellungen
   set wert = wert || jsonb_build_object(
     'innendienst', case when wert -> 'innendienst' = '["loris"]'::jsonb then '["andreas"]'::jsonb else wert -> 'innendienst' end,
     'senden_vertretung', case when wert -> 'senden_vertretung' = '["loris"]'::jsonb then '["andreas"]'::jsonb
                               else wert -> 'senden_vertretung' end)
 where schluessel = 'ausschreibungen';

-- Service-Fälle verteilt Andy (Kürzel in den Zuständigkeiten, änderbar in Einstellungen › Zuständigkeiten).
update public.einstellungen
   set wert = wert || '{"service": "andreas"}'::jsonb
 where schluessel = 'zustaendigkeiten' and not wert ? 'service';

/**
 * Wer eine neue Offerte nachfasst, wie in der Vorlage (V134/V225): Bulle → Verkauf des Standorts (Filipe),
 * Richtofferte ohne Termin → Person für Offerten (Andy), sonst wer vor Ort war, sonst Verkauf des Standorts (Loris).
 * Eine im Aufruf mitgegebene Person geht in offerte_anlegen weiterhin vor.
 */
create or replace function intern.offerte_verantwortlich(p_standort uuid, p_termin_person uuid, p_richtofferte boolean)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    case when (select kuerzel from public.standorte where id = p_standort) = 'bulle'
      then intern.verkauf_zustaendig(null, p_standort, null, null) end,
    case when p_richtofferte
      then intern.zustaendige_person((select wert ->> 'offerten' from public.einstellungen where schluessel = 'zustaendigkeiten')) end,
    p_termin_person,
    intern.verkauf_zustaendig(null, p_standort, null, null),
    intern.meine_person_id())
$$;

/** Wer neue Service-Fälle bekommt und verteilt (Andy; bei Abwesenheit die Stellvertretung). */
create or replace function intern.service_verteiler() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    intern.zustaendige_person((select wert ->> 'service' from public.einstellungen where schluessel = 'zustaendigkeiten')),
    (select p.id from public.personen p
      where p.id = nullif((select wert ->> 'verantwortlich_id' from public.einstellungen where schluessel = 'service'), '')::uuid
        and p.aktiv and p.geloescht_am is null))
$$;

-- 2. Service-Fälle: zuerst zu Andy, er teilt zu ----------------------------------------------------------------------

alter table public.service_faelle add column if not exists zugeteilt_am timestamptz;
comment on column public.service_faelle.zugeteilt_am is
  'Wann der Mitarbeiter gewählt wurde; null = liegt bei der Person, die Service-Fälle verteilt (Andy), zum Zuteilen.';

/**
 * Neuer Fall → Verteiler (Andy). Wählt der Verteiler beim Anlegen selbst jemanden, gilt das als zugeteilt.
 * Wechselt die Person später (Zuteilen, Einsatz planen), ist der Fall zugeteilt.
 */
create or replace function intern.service_fall_zuteilen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v uuid := intern.service_verteiler();
  ich uuid := intern.meine_person_id();
begin
  if tg_op = 'INSERT' then
    if v is not null and (new.person_id is null or ich is null or ich is distinct from v) then
      new.person_id := v;
      new.zugeteilt_am := null;
    elsif new.person_id is not null then
      new.zugeteilt_am := coalesce(new.zugeteilt_am, now());
    end if;
  elsif new.person_id is distinct from old.person_id then
    new.zugeteilt_am := case when new.person_id is null then null else now() end;
  end if;
  return new;
end
$$;
create trigger zuteilen before insert or update of person_id on public.service_faelle
  for each row execute function intern.service_fall_zuteilen();

/** Glocke an den Verteiler, wenn jemand anderes einen Fall von Hand anlegt (Website-Meldungen läuten schon selbst). */
create or replace function intern.service_fall_melden() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.zugeteilt_am is null and new.person_id is not null and coalesce(new.quelle, '') <> 'website'
     and new.person_id is distinct from intern.meine_person_id() then
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    values (new.person_id, 'info', 'Service-Fall zuteilen: ' || new.nummer, 'Attribuer le cas SAV : ' || new.nummer,
            coalesce(new.titel, ''), coalesce(new.titel, ''), '/aftersales?fall=' || new.id);
  end if;
  return null;
end
$$;
create trigger zuteilen_melden after insert on public.service_faelle
  for each row execute function intern.service_fall_melden();

/** Glocke an die gewählte Person (Glocken schreibt nur der Server, darum security definer). */
create or replace function intern.service_zuteilung_melden(p_fall uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select f.person_id, 'info', 'Service-Fall für dich: ' || f.nummer, 'Cas SAV pour toi : ' || f.nummer,
         coalesce(f.titel, ''), coalesce(f.titel, ''), '/aftersales?fall=' || f.id
    from public.service_faelle f where f.id = p_fall and f.person_id is not null
$$;

/**
 * Mitarbeiter für einen Fall wählen (auch sich selbst). Vermerk im Verlauf, Glocke an die gewählte Person.
 */
create or replace function public.service_zuteilen(p_fall uuid, p_person uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  wer text := (select name from public.personen where id = p_person and aktiv and geloescht_am is null);
  f public.service_faelle;
begin
  if wer is null then raise exception using errcode = 'P0001', message = 'service.person_unbekannt'; end if;
  update public.service_faelle
     set person_id = p_person, zugeteilt_am = now(),
         verlauf = coalesce(verlauf, '[]') || jsonb_build_array(jsonb_build_object('am', now(), 'person_id', ich,
                     'art', 'system', 'text', 'Zugeteilt an ' || wer))
   where id = p_fall and geloescht_am is null
  returning * into f;
  if not found then raise exception using errcode = 'P0001', message = 'service.nicht_gefunden'; end if;
  if p_person is distinct from ich then perform intern.service_zuteilung_melden(f.id); end if;
end
$$;
revoke execute on function public.service_zuteilen(uuid, uuid) from public, anon;
grant execute on function public.service_zuteilen(uuid, uuid) to authenticated;

-- 3. Bestehende Daten korrigieren (wiederherstellbar) ----------------------------------------------------------------

create table public.zuteilung_korrekturen (
  id          bigint generated always as identity primary key,
  tabelle     text        not null check (tabelle in ('verkaufschancen', 'offerten', 'projekte', 'service_faelle', 'aufgaben')),
  datensatz   uuid        not null,
  spalte      text        not null,
  vorher      uuid,
  nachher     uuid,
  grund       text        not null,
  am          timestamptz not null default now(),
  rueckgaengig_am timestamptz
);
comment on table public.zuteilung_korrekturen is
  'Korrektur der Zuteilung nach dem Prinzip der Vorlage (19.11.2026), je Datensatz vorher/nachher; Rückgängig über zuteilung_korrektur_rueckgaengig().';
alter table public.zuteilung_korrekturen enable row level security;
create policy "angemeldete lesen korrekturen" on public.zuteilung_korrekturen for select to authenticated using (true);

/** Wurde die Spalte je von Hand (oder sonst nach dem Anlegen) geändert? Dann bleibt sie, wie sie ist. */
create or replace function intern.zuteilung_je_geaendert(p_tabelle text, p_id uuid, p_spalte text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.aenderungsprotokoll a
                  where a.tabelle = p_tabelle and a.datensatz = p_id and a.aktion = 'geaendert'
                    and (a.vorher ->> p_spalte) is distinct from (a.nachher ->> p_spalte))
$$;

do $$
declare
  r record;
  soll uuid;
  andy uuid := intern.zustaendige_person((select wert ->> 'offerten' from public.einstellungen where schluessel = 'zustaendigkeiten'));
  verteiler uuid := intern.service_verteiler();
begin
  -- Leads, die die Regel nach Sprache zugeteilt hat → neu nach Standort der PLZ.
  for r in
    select v.id, v.tour_person_id, v.standort_id, v.region_id, v.interesse, k.sprache
      from public.verkaufschancen v left join public.kontakte k on k.id = v.kontakt_id
     where v.geloescht_am is null and v.zugewiesen_von = 'Regel' and v.tour_person_id is not null
  loop
    continue when intern.zuteilung_je_geaendert('verkaufschancen', r.id, 'tour_person_id');
    soll := intern.verkauf_zustaendig(r.sprache, r.standort_id, r.region_id, r.interesse);
    continue when soll is null or soll = r.tour_person_id;
    update public.verkaufschancen set tour_person_id = soll where id = r.id;
    insert into public.zuteilung_korrekturen (tabelle, datensatz, spalte, vorher, nachher, grund)
    values ('verkaufschancen', r.id, 'tour_person_id', r.tour_person_id, soll, 'Lead nach Standort der PLZ');
  end loop;

  -- Neue Offerten (nicht übernommen), die wegen «alle Offerten an Andy» bei ihm liegen → wie in der Vorlage.
  if andy is not null then
    for r in
      select o.id, o.verantwortlich_id, o.standort_id, v.tour_person_id,
             coalesce(v.offerte_hinweis = 'Richtofferte', false) or (v.id is not null and v.termin_am is null) as richt
        from public.offerten o left join public.verkaufschancen v on v.id = o.verkaufschance_id
       where o.geloescht_am is null and o.alt_id is null and o.verantwortlich_id = andy
    loop
      continue when intern.zuteilung_je_geaendert('offerten', r.id, 'verantwortlich_id');
      soll := intern.offerte_verantwortlich(r.standort_id, r.tour_person_id, r.richt);
      continue when soll is null or soll = r.verantwortlich_id;
      update public.offerten set verantwortlich_id = soll where id = r.id;
      insert into public.zuteilung_korrekturen (tabelle, datensatz, spalte, vorher, nachher, grund)
      values ('offerten', r.id, 'verantwortlich_id', r.verantwortlich_id, soll, 'Offerte wie in der Vorlage');
      -- Das Projekt dazu hat die Person von der Offerte übernommen.
      insert into public.zuteilung_korrekturen (tabelle, datensatz, spalte, vorher, nachher, grund)
      select 'projekte', p.id, 'verantwortlich_id', p.verantwortlich_id, soll, 'Projekt folgt der Offerte'
        from public.projekte p
       where p.offerte_id = r.id and p.geloescht_am is null and p.verantwortlich_id = r.verantwortlich_id
         and not intern.zuteilung_je_geaendert('projekte', p.id, 'verantwortlich_id');
      update public.projekte p set verantwortlich_id = soll
       where p.offerte_id = r.id and p.geloescht_am is null and p.verantwortlich_id = r.verantwortlich_id
         and exists (select 1 from public.zuteilung_korrekturen z
                      where z.tabelle = 'projekte' and z.datensatz = p.id and z.rueckgaengig_am is null);
    end loop;
  end if;

  -- Offene Ausschreibungs-Aufgaben, die bei Loris liegen → an den Innendienst der Ausschreibungen (Andy).
  soll := (intern.as_personen('innendienst'))[1];
  if soll is not null then
    for r in
      select a.id, a.person_id from public.aufgaben a join public.personen p on p.id = a.person_id
       where a.geloescht_am is null and a.erledigt_am is null and a.bezug_tabelle = 'ausschreibungen'
         and p.kuerzel = 'loris' and a.person_id <> soll
    loop
      update public.aufgaben set person_id = soll where id = r.id;
      insert into public.zuteilung_korrekturen (tabelle, datensatz, spalte, vorher, nachher, grund)
      values ('aufgaben', r.id, 'person_id', r.person_id, soll, 'Ausschreibung nicht bei Loris');
    end loop;
  end if;

  -- Service: offene Fälle ohne geplanten Einsatz → zu Andy zum Zuteilen (Chris 19.11.); mit Einsatz gelten als zugeteilt.
  update public.service_faelle set zugeteilt_am = coalesce(erstellt_am, now())
   where person_id is not null and (status = 'erledigt' or termin_am is not null or verteiler is null);
  if verteiler is not null then
    for r in
      select f.id, f.person_id from public.service_faelle f
       where f.geloescht_am is null and f.status <> 'erledigt' and f.termin_am is null
    loop
      update public.service_faelle set person_id = verteiler where id = r.id;
      update public.service_faelle set zugeteilt_am = null where id = r.id;
      if r.person_id is distinct from verteiler then
        insert into public.zuteilung_korrekturen (tabelle, datensatz, spalte, vorher, nachher, grund)
        values ('service_faelle', r.id, 'person_id', r.person_id, verteiler, 'Service-Fall zu Andy zum Zuteilen');
      end if;
    end loop;
  end if;
end
$$;

/**
 * Korrektur vom 19.11.2026 zurücknehmen (nur Administration). Setzt jeden korrigierten Wert zurück, solange
 * niemand ihn seither geändert hat. Gibt die Zahl der zurückgesetzten Datensätze zurück.
 */
create or replace function public.zuteilung_korrektur_rueckgaengig() returns int
language plpgsql security definer set search_path = '' as $$
declare
  z record;
  n int := 0;
  k int;
begin
  if auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'zuteilung.kein_recht';
  end if;
  for z in select * from public.zuteilung_korrekturen where rueckgaengig_am is null order by id desc loop
    execute format('update public.%I set %I = $1 where id = $2 and %I is not distinct from $3', z.tabelle, z.spalte, z.spalte)
      using z.vorher, z.datensatz, z.nachher;
    get diagnostics k = row_count;
    update public.zuteilung_korrekturen set rueckgaengig_am = now() where id = z.id;
    n := n + k;
  end loop;
  return n;
end
$$;
revoke execute on function public.zuteilung_korrektur_rueckgaengig() from public, anon;
grant execute on function public.zuteilung_korrektur_rueckgaengig() to authenticated;
