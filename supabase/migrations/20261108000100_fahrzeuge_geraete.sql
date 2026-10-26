-- Phase 17, Teil 1: Fahrzeuge und Geräte (ERP-Lückenanalyse «Fahrzeuge mit MFK und Service, Prüftermine
-- Messgeräte und Absturzsicherung», Entscheid 0028). Fristen stehen auf dem Fahrzeug oder Gerät; jede MFK,
-- jeder Service, jede Prüfung und jeder Schaden wird als Eintrag erfasst und setzt die nächste Frist selbst.
-- Geräte-Arten und Prüfintervalle sind Daten (Auswahlliste «geraeteart»), nie Code.

-- ---------- Auswahllisten ----------

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, eigenschaften) values
  ('geraeteart', 'messgeraet', 'Messgerät', 'Appareil de mesure', 10, '{"pruef_monate": 12}'),
  ('geraeteart', 'absturzsicherung', 'Absturzsicherung (PSAgA)', 'Protection antichute (EPIaC)', 20, '{"pruef_monate": 12}'),
  ('geraeteart', 'leiter', 'Leiter', 'Échelle', 30, '{"pruef_monate": 12}'),
  ('geraeteart', 'hebegeraet', 'Hebegerät, Aufzug', 'Appareil de levage', 40, '{"pruef_monate": 12}'),
  ('geraeteart', 'werkzeug', 'Elektrowerkzeug', 'Outil électrique', 50, '{}'),
  ('geraeteart', 'sonstiges', 'Sonstiges', 'Autre', 90, '{}'),
  ('ressourcen_eintrag', 'km_stand', 'Kilometerstand', 'Kilométrage', 10, '{"fuer": ["fahrzeug"]}'),
  ('ressourcen_eintrag', 'mfk', 'MFK', 'Expertise (MFK)', 20, '{"fuer": ["fahrzeug"]}'),
  ('ressourcen_eintrag', 'service', 'Service', 'Service', 30, '{"fuer": ["fahrzeug"]}'),
  ('ressourcen_eintrag', 'pruefung', 'Prüfung', 'Contrôle', 40, '{"fuer": ["geraet"]}'),
  ('ressourcen_eintrag', 'kalibrierung', 'Kalibrierung', 'Étalonnage', 50, '{"fuer": ["geraet"]}'),
  ('ressourcen_eintrag', 'reparatur', 'Reparatur', 'Réparation', 60, '{"fuer": ["fahrzeug", "geraet"]}'),
  ('ressourcen_eintrag', 'schaden', 'Schaden', 'Dommage', 70, '{"fuer": ["fahrzeug", "geraet"]}'),
  ('ressourcen_eintrag', 'uebergabe', 'Übergabe', 'Remise', 80, '{"fuer": ["fahrzeug", "geraet"], "automatisch": true}'),
  ('ressourcen_eintrag', 'notiz', 'Notiz', 'Note', 90, '{"fuer": ["fahrzeug", "geraet"]}');

-- Service-Intervall und Vorlauf der Erinnerungen als Einstellung (ändern nur Administration, wie alle Einstellungen).
insert into public.einstellungen (schluessel, wert) values ('ressourcen', jsonb_build_object(
  'service_monate', 12,
  'service_km', 20000,
  'vorlauf_tage', 30,
  'vorlauf_ausweis_tage', 60
)) on conflict (schluessel) do nothing;

-- ---------- Fahrzeuge ----------

create table public.fahrzeuge (
  id                uuid primary key default gen_random_uuid(),
  kennzeichen       text not null,
  bezeichnung       text not null,                 -- «Lieferwagen Bulle», «Crafter weiss»
  marke_modell      text,
  jahrgang          int check (jahrgang between 1950 and 2100),
  standort_id       uuid references public.standorte (id),
  person_id         uuid references public.personen (id),  -- fest zugeteilt (fährt meistens)
  km_stand          int check (km_stand >= 0),
  km_stand_am       date,
  naechste_mfk      date,
  naechster_service date,
  service_km        int check (service_km >= 0),   -- nächster Service bei diesem Kilometerstand
  leasing_bis       date,
  versicherung      text,
  ausser_betrieb    boolean not null default false,
  notiz             text
);
select intern.richte_fachtabelle_ein('fahrzeuge');
create unique index fahrzeuge_kennzeichen on public.fahrzeuge (upper(replace(kennzeichen, ' ', '')))
  where geloescht_am is null;
comment on table public.fahrzeuge is 'Firmenfahrzeuge mit MFK, Service und Kilometerstand (Phase 17).';

-- ---------- Geräte ----------

create table public.geraete (
  id                uuid primary key default gen_random_uuid(),
  art               text not null,                 -- Auswahlliste «geraeteart»
  bezeichnung       text not null,
  inventar_nr       text,
  serien_nr         text,
  hersteller        text,
  standort_id       uuid references public.standorte (id),
  person_id         uuid references public.personen (id),  -- wer es gerade hat
  fahrzeug_id       uuid references public.fahrzeuge (id),  -- oder in welchem Fahrzeug es liegt
  pruef_monate      int check (pruef_monate between 1 and 120),
  naechste_pruefung date,
  zustand           text not null default 'ok' check (zustand in ('ok', 'maengel', 'defekt', 'ausser_betrieb')),
  notiz             text
);
select intern.richte_fachtabelle_ein('geraete');
create unique index geraete_inventar_nr on public.geraete (upper(inventar_nr))
  where geloescht_am is null and inventar_nr is not null;
create index geraete_person on public.geraete (person_id) where geloescht_am is null;

-- ---------- Einträge (MFK, Service, Prüfung, Schaden …) ----------

create table public.ressourcen_eintraege (
  id            uuid primary key default gen_random_uuid(),
  fahrzeug_id   uuid references public.fahrzeuge (id),
  geraet_id     uuid references public.geraete (id),
  art           text not null,                     -- Auswahlliste «ressourcen_eintrag»
  datum         date not null default (now() at time zone 'Europe/Zurich')::date,
  km            int check (km >= 0),
  kosten_rappen bigint check (kosten_rappen >= 0),
  ergebnis      text check (ergebnis in ('ok', 'maengel')),
  naechste_am   date,                              -- neue Frist, die dieser Eintrag gesetzt hat
  text          text,
  person_id     uuid references public.personen (id) default intern.meine_person_id(),
  dokument_id   uuid references public.dokumente (id),
  constraint ressourcen_eintraege_ein_bezug check ((fahrzeug_id is null) <> (geraet_id is null))
);
select intern.richte_fachtabelle_ein('ressourcen_eintraege');
create index ressourcen_eintraege_fahrzeug on public.ressourcen_eintraege (fahrzeug_id, datum desc);
create index ressourcen_eintraege_geraet on public.ressourcen_eintraege (geraet_id, datum desc);

-- Einträge schreibt nur die Funktion: sie hält Frist, Kilometer und Zustand stimmig.
drop policy "anlegen" on public.ressourcen_eintraege;
drop policy "aendern" on public.ressourcen_eintraege;

/**
 * MFK, Service, Prüfung, Schaden oder Kilometerstand erfassen und die nächste Frist setzen. Wiederholbar:
 * dieselbe p_id vom Handy legt nichts doppelt an. MFK braucht die nächste MFK vom Ausweis (Intervall wechselt
 * mit dem Alter), Service und Prüfung rechnen sie aus dem Intervall, wenn keine angegeben ist.
 */
create or replace function public.ressource_eintrag_erfassen(
  p_id uuid, p_fahrzeug uuid, p_geraet uuid, p_art text, p_datum date, p_km int default null,
  p_kosten_rappen bigint default null, p_ergebnis text default null, p_naechste date default null,
  p_text text default null, p_dokument uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select wert from public.einstellungen where schluessel = 'ressourcen'), '{}');
  f public.fahrzeuge;
  g public.geraete;
  art public.auswahlwerte;
  naechste date := p_naechste;
  neu_id uuid := coalesce(p_id, gen_random_uuid());
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'ressourcen.kein_recht';
  end if;
  if exists (select 1 from public.ressourcen_eintraege e where e.id = neu_id) then
    return neu_id;
  end if;
  if (p_fahrzeug is null) = (p_geraet is null) then
    raise exception using errcode = 'P0001', message = 'ressourcen.bezug';
  end if;
  select * into art from public.auswahlwerte a
   where a.liste = 'ressourcen_eintrag' and a.schluessel = p_art and a.geloescht_am is null;
  if art.id is null or coalesce((art.eigenschaften ->> 'automatisch')::boolean, false)
     or not (art.eigenschaften -> 'fuer') ? (case when p_fahrzeug is null then 'geraet' else 'fahrzeug' end) then
    raise exception using errcode = 'P0001', message = 'ressourcen.art';
  end if;
  if p_datum is null or p_datum > (now() at time zone 'Europe/Zurich')::date + 1 then
    raise exception using errcode = 'P0001', message = 'ressourcen.datum';
  end if;

  if p_fahrzeug is not null then
    select * into f from public.fahrzeuge x where x.id = p_fahrzeug and x.geloescht_am is null for update;
    if f.id is null then raise exception using errcode = 'P0001', message = 'ressourcen.nicht_gefunden'; end if;
    if p_art = 'km_stand' and p_km is null then
      raise exception using errcode = 'P0001', message = 'ressourcen.km_fehlt';
    end if;
    if p_km is not null and f.km_stand is not null and p_km < f.km_stand and p_datum >= coalesce(f.km_stand_am, p_datum) then
      raise exception using errcode = 'P0001', message = 'ressourcen.km_kleiner';
    end if;
    if p_art = 'mfk' and naechste is null then
      raise exception using errcode = 'P0001', message = 'ressourcen.mfk_naechste';
    end if;
    if p_art = 'service' and naechste is null then
      naechste := p_datum + make_interval(months => coalesce((cfg ->> 'service_monate')::int, 12));
    end if;
    update public.fahrzeuge x set
      km_stand = case when p_km is not null and p_datum >= coalesce(x.km_stand_am, p_datum) then p_km else x.km_stand end,
      km_stand_am = case when p_km is not null and p_datum >= coalesce(x.km_stand_am, p_datum) then p_datum else x.km_stand_am end,
      naechste_mfk = case when p_art = 'mfk' then naechste else x.naechste_mfk end,
      naechster_service = case when p_art = 'service' then naechste else x.naechster_service end,
      service_km = case when p_art = 'service' and p_km is not null
                        then p_km + coalesce((cfg ->> 'service_km')::int, 20000) else x.service_km end
     where x.id = f.id;
  else
    select * into g from public.geraete x where x.id = p_geraet and x.geloescht_am is null for update;
    if g.id is null then raise exception using errcode = 'P0001', message = 'ressourcen.nicht_gefunden'; end if;
    if p_art in ('pruefung', 'kalibrierung') then
      if p_ergebnis is null then
        raise exception using errcode = 'P0001', message = 'ressourcen.ergebnis_fehlt';
      end if;
      if naechste is null and g.pruef_monate is not null then
        naechste := p_datum + make_interval(months => g.pruef_monate);
      end if;
    end if;
    update public.geraete x set
      naechste_pruefung = case when p_art in ('pruefung', 'kalibrierung') then naechste else x.naechste_pruefung end,
      zustand = case
        when p_art = 'schaden' then 'defekt'
        when p_art in ('pruefung', 'kalibrierung', 'reparatur') and p_ergebnis = 'maengel' then 'maengel'
        when p_art in ('pruefung', 'kalibrierung', 'reparatur') and p_ergebnis = 'ok' then 'ok'
        else x.zustand end
     where x.id = g.id;
  end if;

  insert into public.ressourcen_eintraege (id, fahrzeug_id, geraet_id, art, datum, km, kosten_rappen, ergebnis,
                                           naechste_am, text, dokument_id)
  values (neu_id, p_fahrzeug, p_geraet, p_art, p_datum, p_km, p_kosten_rappen, p_ergebnis,
          case when p_art in ('mfk', 'service', 'pruefung', 'kalibrierung') then naechste end,
          nullif(trim(p_text), ''), p_dokument);

  -- Ein Schaden geht an die Administration, damit niemand mit einem defekten Gerät aufs Dach steigt.
  if p_art = 'schaden' then
    perform intern.benachrichtige_admins(intern.meine_person_id(), 'warnung',
      'Schaden: ' || coalesce(f.bezeichnung || ' ' || f.kennzeichen, g.bezeichnung),
      'Dommage : ' || coalesce(f.bezeichnung || ' ' || f.kennzeichen, g.bezeichnung),
      nullif(trim(p_text), ''),
      case when f.id is not null then '/fleet?fahrzeug=' || f.id else '/fleet?ansicht=geraete&geraet=' || g.id end);
  end if;
  return neu_id;
end
$$;
revoke execute on function public.ressource_eintrag_erfassen(uuid, uuid, uuid, text, date, int, bigint, text, date, text, uuid)
  from public, anon;
grant execute on function public.ressource_eintrag_erfassen(uuid, uuid, uuid, text, date, int, bigint, text, date, text, uuid)
  to authenticated;

/**
 * Gerät oder Fahrzeug weitergeben: an eine Person, in ein Fahrzeug (nur Geräte) oder zurück ins Lager
 * (beides leer). Hält die Übergabe im Verlauf fest, damit man sieht, wer es zuletzt hatte.
 */
create or replace function public.ressource_uebergeben(
  p_fahrzeug uuid, p_geraet uuid, p_person uuid, p_in_fahrzeug uuid default null, p_text text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  vorher text;
  nachher text;
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'ressourcen.kein_recht';
  end if;
  if (p_fahrzeug is null) = (p_geraet is null) or (p_fahrzeug is not null and p_in_fahrzeug is not null) then
    raise exception using errcode = 'P0001', message = 'ressourcen.bezug';
  end if;
  if p_person is not null and p_in_fahrzeug is not null then
    raise exception using errcode = 'P0001', message = 'ressourcen.uebergabe_doppelt';
  end if;
  if p_person is not null and not exists (select 1 from public.personen p where p.id = p_person and p.aktiv
                                                                         and p.geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'ressourcen.person';
  end if;
  nachher := coalesce((select p.name from public.personen p where p.id = p_person),
                      (select x.bezeichnung || ' ' || x.kennzeichen from public.fahrzeuge x where x.id = p_in_fahrzeug),
                      'Lager');
  if p_fahrzeug is not null then
    select coalesce(p.name, 'Lager') into vorher from public.fahrzeuge x
      left join public.personen p on p.id = x.person_id where x.id = p_fahrzeug and x.geloescht_am is null;
    if vorher is null then raise exception using errcode = 'P0001', message = 'ressourcen.nicht_gefunden'; end if;
    update public.fahrzeuge set person_id = p_person where id = p_fahrzeug;
  else
    select coalesce(p.name, z.bezeichnung || ' ' || z.kennzeichen, 'Lager') into vorher from public.geraete x
      left join public.personen p on p.id = x.person_id
      left join public.fahrzeuge z on z.id = x.fahrzeug_id
     where x.id = p_geraet and x.geloescht_am is null;
    if vorher is null then raise exception using errcode = 'P0001', message = 'ressourcen.nicht_gefunden'; end if;
    update public.geraete set person_id = p_person, fahrzeug_id = p_in_fahrzeug where id = p_geraet;
  end if;
  insert into public.ressourcen_eintraege (fahrzeug_id, geraet_id, art, text)
  values (p_fahrzeug, p_geraet, 'uebergabe', vorher || ' → ' || nachher || coalesce(' · ' || nullif(trim(p_text), ''), ''));
end
$$;
revoke execute on function public.ressource_uebergeben(uuid, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.ressource_uebergeben(uuid, uuid, uuid, uuid, text) to authenticated;

-- Neuer Bereich für die Rollen auf der Baustelle und in der Planung; Administration sieht ohnehin alles.
update public.rollen set bereiche = array_append(bereiche, 'fleet')
 where schluessel in ('montage', 'projektleitung', 'innendienst') and not ('fleet' = any(bereiche));
