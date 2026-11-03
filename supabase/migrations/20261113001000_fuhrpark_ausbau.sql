-- Fahrzeuge & Geräte vollständig (Chris 2.11.2026: «jedes Modul muss seinen Zweck ganz erfüllen», Entscheid 0039).
-- Die Akte eines Fahrzeugs enthält jetzt alles, was Büro, Montage und Geschäftsleitung brauchen (Leasing mit
-- Kilometer-Limite, Versicherung, Tankkarte, Schlüssel, Reifen, Vignette, Gewichte, nötiger Führerausweis), Geräte
-- haben Kauf, Garantie, Prüfstelle und Ausleihe. Schäden haben einen Stand, Fahrzeuge und Geräte lassen sich
-- reservieren (Belegung), die Kosten pro Fahrzeug rechnet die Datenbank, und der Kilometerstand wird monatlich
-- am Handy nachgefragt. Nur vorwärts: nichts Bestehendes fällt weg.

-- ---------- Auswahllisten und Einstellungen ----------

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, eigenschaften) values
  ('fahrzeugart', 'lieferwagen', 'Lieferwagen', 'Fourgon', 10, '{}'),
  ('fahrzeugart', 'pritsche', 'Pritschenwagen', 'Camion à pont', 20, '{}'),
  ('fahrzeugart', 'pw', 'Personenwagen', 'Voiture', 30, '{}'),
  ('fahrzeugart', 'anhaenger', 'Anhänger', 'Remorque', 40, '{"anhaenger": true}'),
  ('fahrzeugart', 'sonstiges', 'Sonstiges', 'Autre', 90, '{}'),
  -- Neue Eintrag-Arten: Tanken/Laden (Kosten pro km), Reifenwechsel und Vignette setzen ihre Frist, «Kosten» für
  -- alles andere (Parkgebühr, Waschanlage, Zubehör).
  ('ressourcen_eintrag', 'tanken', 'Tanken / Laden', 'Plein / recharge', 15, '{"fuer": ["fahrzeug"]}'),
  ('ressourcen_eintrag', 'reifen', 'Reifenwechsel', 'Changement de pneus', 35, '{"fuer": ["fahrzeug"]}'),
  ('ressourcen_eintrag', 'vignette', 'Vignette', 'Vignette', 37, '{"fuer": ["fahrzeug"]}'),
  ('ressourcen_eintrag', 'kosten', 'Übrige Kosten', 'Autres frais', 85, '{"fuer": ["fahrzeug", "geraet"]}')
on conflict do nothing;

-- km_monatlich: Erinnerung am Monatsanfang; privatanteil_prozent_monat: Privatanteil Geschäftsauto für den
-- Lohnausweis (0.9 % des Kaufpreises exkl. MWST pro Monat, Stand ESTV 2026).
update public.einstellungen
   set wert = jsonb_build_object('km_monatlich', true, 'privatanteil_prozent_monat', 0.9) || wert
 where schluessel = 'ressourcen';

-- ---------- Fahrzeuge: alle Angaben einer echten Fahrzeug-Akte ----------

alter table public.fahrzeuge
  add column art                     text not null default 'lieferwagen',   -- Auswahlliste «fahrzeugart»
  add column treibstoff              text check (treibstoff in ('diesel', 'benzin', 'elektro', 'hybrid', 'gas')),
  add column erste_inverkehrsetzung  date,
  add column stammnummer             text,
  add column fahrgestell_nr          text,
  add column gesamtgewicht_kg        int check (gesamtgewicht_kg > 0),
  add column nutzlast_kg             int check (nutzlast_kg >= 0),
  add column anhaengelast_kg         int check (anhaengelast_kg >= 0),
  add column ausweis                 text,            -- Auswahlliste «qualifikation», z. B. fuehrerausweis_be
  add column tankkarte               text,
  add column schluessel              text,
  add column kaufdatum               date,
  add column kaufpreis_rappen        bigint check (kaufpreis_rappen >= 0),   -- bei Leasing: Katalogpreis exkl. MWST
  add column leasinggeber            text,
  add column leasing_vertrag         text,
  add column leasing_beginn          date,
  add column leasing_rate_rappen     bigint check (leasing_rate_rappen >= 0),
  add column leasing_km_jahr         int check (leasing_km_jahr > 0),
  add column leasing_mehr_km_rappen  int check (leasing_mehr_km_rappen >= 0),
  add column versicherung_police     text,
  add column versicherung_deckung    text,
  add column selbstbehalt_rappen     bigint check (selbstbehalt_rappen >= 0),
  add column schaden_telefon         text,
  add column praemie_rappen          bigint check (praemie_rappen >= 0),        -- pro Jahr
  add column verkehrssteuer_rappen   bigint check (verkehrssteuer_rappen >= 0), -- pro Jahr
  add column reifen                  text,            -- «Winter montiert, Sommer bei Garage Kuhn»
  add column naechster_reifenwechsel date,
  add column vignette_bis            date,
  add column privat_anteil           boolean not null default false;
comment on column public.fahrzeuge.kaufpreis_rappen is
  'Kaufpreis exkl. MWST, bei Leasing der Katalogpreis (Grundlage für den Privatanteil).';
comment on column public.fahrzeuge.ausweis is 'Nötiger Führerausweis als Schlüssel der Auswahlliste «qualifikation».';

-- Kilometerstand beim Erfassen eines Fahrzeugs als erster Eintrag, damit «gefahrene km im Jahr» (Kosten pro km,
-- Leasing-Prognose) einen Anfang hat.
create or replace function intern.fahrzeug_erster_km() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.km_stand is not null then
    insert into public.ressourcen_eintraege (fahrzeug_id, art, datum, km, text)
    values (new.id, 'km_stand', coalesce(new.km_stand_am, (now() at time zone 'Europe/Zurich')::date), new.km_stand,
            'Beim Erfassen');
  end if;
  return new;
end
$$;
create trigger erster_km after insert on public.fahrzeuge
  for each row execute function intern.fahrzeug_erster_km();
-- Bestehende Fahrzeuge ohne Kilometer-Eintrag bekommen ihren heutigen Stand als Anfang.
insert into public.ressourcen_eintraege (fahrzeug_id, art, datum, km, text)
select f.id, 'km_stand', coalesce(f.km_stand_am, (now() at time zone 'Europe/Zurich')::date), f.km_stand, 'Beim Erfassen'
  from public.fahrzeuge f
 where f.km_stand is not null and f.geloescht_am is null
   and not exists (select 1 from public.ressourcen_eintraege x where x.fahrzeug_id = f.id and x.km is not null);

-- ---------- Geräte: Kauf, Garantie, Prüfstelle, Ausleihe, Ausmustern ----------

alter table public.geraete
  add column kaufdatum           date,
  add column kaufpreis_rappen    bigint check (kaufpreis_rappen >= 0),
  add column lieferant           text,
  add column garantie_bis        date,
  add column pruefstelle         text,
  add column uebernommen_am      timestamptz,  -- seit wann die Person es hat (für «nicht zurück seit …»)
  add column zurueck_bis         date,         -- ausgeliehen bis
  add column ausgemustert_am     date,
  add column ausgemustert_grund  text check (ausgemustert_grund in ('defekt', 'verloren', 'verkauft', 'ersetzt'));
update public.geraete set uebernommen_am = geaendert_am where person_id is not null;

-- ---------- Einträge: Liter, Stand und Erledigung eines Schadens ----------

alter table public.ressourcen_eintraege
  add column liter       numeric(8, 2) check (liter > 0),   -- bei Elektro kWh
  add column stand       text check (stand in ('offen', 'in_arbeit', 'erledigt')),
  add column erledigung  text,
  add column erledigt_am date;
update public.ressourcen_eintraege set stand = 'offen' where art = 'schaden';
create index ressourcen_eintraege_offen on public.ressourcen_eintraege (stand)
  where stand in ('offen', 'in_arbeit') and geloescht_am is null;

-- Fotos (Schaden) und Dokumente (Fahrzeugausweis, Police, Leasingvertrag, Prüfprotokoll) im privaten Speicher
-- «fuhrpark», Ordner fahrzeug/<id>, geraet/<id>, eintrag/<id>. Löschen nur Administration (Regel 5).
insert into storage.buckets (id, name, public) values ('fuhrpark', 'fuhrpark', false) on conflict do nothing;
create policy "fuhrpark lesen" on storage.objects for select to authenticated
  using (bucket_id = 'fuhrpark' and intern.hat_recht('basis'));
create policy "fuhrpark hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'fuhrpark' and intern.hat_recht('basis')
              and (storage.foldername(name))[1] in ('fahrzeug', 'geraet', 'eintrag'));
create policy "fuhrpark loeschen" on storage.objects for delete to authenticated
  using (bucket_id = 'fuhrpark' and intern.hat_recht('admin'));

/**
 * MFK, Service, Prüfung, Schaden, Kilometerstand, Tanken, Reifenwechsel, Vignette oder Kosten erfassen und die
 * nächste Frist setzen. Wiederholbar: dieselbe p_id vom Handy legt nichts doppelt an. Neu: Liter beim Tanken,
 * Reifen und Vignette setzen ihre Frist, ein Schaden beginnt mit Stand «offen».
 */
drop function public.ressource_eintrag_erfassen(uuid, uuid, uuid, text, date, int, bigint, text, date, text, uuid);
create function public.ressource_eintrag_erfassen(
  p_id uuid, p_fahrzeug uuid, p_geraet uuid, p_art text, p_datum date, p_km int default null,
  p_kosten_rappen bigint default null, p_ergebnis text default null, p_naechste date default null,
  p_text text default null, p_dokument uuid default null, p_liter numeric default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select wert from public.einstellungen where schluessel = 'ressourcen'), '{}');
  f public.fahrzeuge;
  g public.geraete;
  art public.auswahlwerte;
  naechste date := p_naechste;
  neu_id uuid := coalesce(p_id, gen_random_uuid());
  km_neu boolean;
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
  if p_art in ('tanken', 'kosten') and p_kosten_rappen is null then
    raise exception using errcode = 'P0001', message = 'ressourcen.kosten_fehlt';
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
    -- Vignette gilt bis Ende Januar des Folgejahres, wenn nichts anderes angegeben ist.
    if p_art = 'vignette' and naechste is null then
      naechste := make_date(extract(year from p_datum)::int + 1, 1, 31);
    end if;
    km_neu := p_km is not null and p_datum >= coalesce(f.km_stand_am, p_datum);
    update public.fahrzeuge x set
      km_stand = case when km_neu then p_km else x.km_stand end,
      km_stand_am = case when km_neu then p_datum else x.km_stand_am end,
      naechste_mfk = case when p_art = 'mfk' then naechste else x.naechste_mfk end,
      naechster_service = case when p_art = 'service' then naechste else x.naechster_service end,
      service_km = case when p_art = 'service' and p_km is not null
                        then p_km + coalesce((cfg ->> 'service_km')::int, 20000) else x.service_km end,
      naechster_reifenwechsel = case when p_art = 'reifen' then naechste else x.naechster_reifenwechsel end,
      vignette_bis = case when p_art = 'vignette' then naechste else x.vignette_bis end
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
        when x.zustand = 'ausser_betrieb' then x.zustand
        when p_art = 'schaden' then 'defekt'
        when p_art in ('pruefung', 'kalibrierung', 'reparatur') and p_ergebnis = 'maengel' then 'maengel'
        when p_art in ('pruefung', 'kalibrierung', 'reparatur') and p_ergebnis = 'ok' then 'ok'
        else x.zustand end
     where x.id = g.id;
  end if;

  insert into public.ressourcen_eintraege (id, fahrzeug_id, geraet_id, art, datum, km, kosten_rappen, ergebnis,
                                           naechste_am, text, dokument_id, liter, stand)
  values (neu_id, p_fahrzeug, p_geraet, p_art, p_datum, p_km, p_kosten_rappen, p_ergebnis,
          case when p_art in ('mfk', 'service', 'pruefung', 'kalibrierung', 'reifen', 'vignette') then naechste end,
          nullif(trim(p_text), ''), p_dokument, p_liter, case when p_art = 'schaden' then 'offen' end);

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
revoke execute on function public.ressource_eintrag_erfassen(uuid, uuid, uuid, text, date, int, bigint, text, date, text, uuid, numeric)
  from public, anon;
grant execute on function public.ressource_eintrag_erfassen(uuid, uuid, uuid, text, date, int, bigint, text, date, text, uuid, numeric)
  to authenticated;

/**
 * Stand eines Schadens setzen (offen → in Arbeit → erledigt), mit Text (Garage, Versicherungsfall) und Kosten.
 * «Erledigt» setzt ein Gerät wieder auf «in Ordnung», wenn kein anderer Schaden offen ist.
 */
create or replace function public.ressource_schaden_setzen(
  p_eintrag uuid, p_stand text, p_erledigung text default null, p_kosten_rappen bigint default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  e public.ressourcen_eintraege;
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'ressourcen.kein_recht';
  end if;
  if p_stand not in ('offen', 'in_arbeit', 'erledigt') then
    raise exception using errcode = 'P0001', message = 'ressourcen.stand';
  end if;
  select * into e from public.ressourcen_eintraege x
   where x.id = p_eintrag and x.art = 'schaden' and x.geloescht_am is null for update;
  if e.id is null then raise exception using errcode = 'P0001', message = 'ressourcen.nicht_gefunden'; end if;
  update public.ressourcen_eintraege x set
    stand = p_stand,
    erledigung = coalesce(nullif(trim(p_erledigung), ''), x.erledigung),
    kosten_rappen = coalesce(p_kosten_rappen, x.kosten_rappen),
    erledigt_am = case when p_stand = 'erledigt' then (now() at time zone 'Europe/Zurich')::date end
   where x.id = e.id;
  if p_stand = 'erledigt' and e.geraet_id is not null and not exists (
       select 1 from public.ressourcen_eintraege x
        where x.geraet_id = e.geraet_id and x.id <> e.id and x.art = 'schaden'
          and x.stand in ('offen', 'in_arbeit') and x.geloescht_am is null) then
    update public.geraete set zustand = 'ok' where id = e.geraet_id and zustand = 'defekt';
  end if;
end
$$;
revoke execute on function public.ressource_schaden_setzen(uuid, text, text, bigint) from public, anon;
grant execute on function public.ressource_schaden_setzen(uuid, text, text, bigint) to authenticated;

/**
 * Gerät oder Fahrzeug weitergeben: an eine Person, in ein Fahrzeug (nur Geräte) oder zurück ins Lager (beides
 * leer). Neu: «zurück bis» bei Ausleihen und seit wann die Person das Gerät hat. Hält die Übergabe im Verlauf fest.
 */
drop function public.ressource_uebergeben(uuid, uuid, uuid, uuid, text);
create function public.ressource_uebergeben(
  p_fahrzeug uuid, p_geraet uuid, p_person uuid, p_in_fahrzeug uuid default null, p_text text default null,
  p_zurueck_bis date default null
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
    update public.geraete set person_id = p_person, fahrzeug_id = p_in_fahrzeug,
                              uebernommen_am = case when p_person is not null then now() end,
                              zurueck_bis = case when p_person is not null then p_zurueck_bis end
     where id = p_geraet;
  end if;
  insert into public.ressourcen_eintraege (fahrzeug_id, geraet_id, art, text)
  values (p_fahrzeug, p_geraet, 'uebergabe', vorher || ' → ' || nachher
          || coalesce(' · bis ' || to_char(p_zurueck_bis, 'DD.MM.YYYY'), '')
          || coalesce(' · ' || nullif(trim(p_text), ''), ''));
end
$$;
revoke execute on function public.ressource_uebergeben(uuid, uuid, uuid, uuid, text, date) from public, anon;
grant execute on function public.ressource_uebergeben(uuid, uuid, uuid, uuid, text, date) to authenticated;

-- ---------- Reservierungen und Belegung ----------

create table public.ressourcen_reservierungen (
  id           uuid primary key default gen_random_uuid(),
  fahrzeug_id  uuid references public.fahrzeuge (id),
  geraet_id    uuid references public.geraete (id),
  von          date not null,
  bis          date not null,
  art          text not null default 'hand' check (art in ('hand', 'werkstatt', 'einsatz')),
  einsatz_id   uuid references public.einsaetze (id),  -- ersetzt das automatische Fahrzeug dieses Einsatzes
  projekt_id   uuid references public.projekte (id),
  person_id    uuid references public.personen (id),
  zweck        text,
  constraint ressourcen_reservierungen_ein_bezug check ((fahrzeug_id is null) <> (geraet_id is null)),
  constraint ressourcen_reservierungen_zeit check (bis >= von)
);
select intern.richte_fachtabelle_ein('ressourcen_reservierungen');
create index ressourcen_reservierungen_zeit on public.ressourcen_reservierungen (von, bis) where geloescht_am is null;
create index ressourcen_reservierungen_einsatz on public.ressourcen_reservierungen (einsatz_id) where geloescht_am is null;
drop policy "anlegen" on public.ressourcen_reservierungen;
drop policy "aendern" on public.ressourcen_reservierungen;

/**
 * Fahrzeug oder Gerät reservieren (von Hand, Werkstatt oder für einen Einsatz). Wiederholbar mit der ID aus der
 * App; dieselbe ID ändert die Reservierung. Mit Einsatz ersetzt sie das Fahrzeug, das dem Team automatisch folgt.
 */
create or replace function public.ressource_reservieren(
  p_id uuid, p_fahrzeug uuid, p_geraet uuid, p_von date, p_bis date, p_art text default 'hand',
  p_einsatz uuid default null, p_person uuid default null, p_zweck text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  neu_id uuid := coalesce(p_id, gen_random_uuid());
  projekt uuid;
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'ressourcen.kein_recht';
  end if;
  if (p_fahrzeug is null) = (p_geraet is null) then
    raise exception using errcode = 'P0001', message = 'ressourcen.bezug';
  end if;
  if p_von is null or p_bis is null or p_bis < p_von then
    raise exception using errcode = 'P0001', message = 'ressourcen.zeitraum';
  end if;
  if p_art not in ('hand', 'werkstatt', 'einsatz') or (p_art = 'einsatz') <> (p_einsatz is not null) then
    raise exception using errcode = 'P0001', message = 'ressourcen.art';
  end if;
  if p_einsatz is not null then
    select e.projekt_id into projekt from public.einsaetze e where e.id = p_einsatz and e.geloescht_am is null;
    if projekt is null then raise exception using errcode = 'P0001', message = 'ressourcen.nicht_gefunden'; end if;
  end if;
  insert into public.ressourcen_reservierungen as r (id, fahrzeug_id, geraet_id, von, bis, art, einsatz_id,
                                                     projekt_id, person_id, zweck)
  values (neu_id, p_fahrzeug, p_geraet, p_von, p_bis, p_art, p_einsatz, projekt, p_person, nullif(trim(p_zweck), ''))
  on conflict (id) do update set fahrzeug_id = excluded.fahrzeug_id, geraet_id = excluded.geraet_id,
    von = excluded.von, bis = excluded.bis, art = excluded.art, einsatz_id = excluded.einsatz_id,
    projekt_id = excluded.projekt_id, person_id = excluded.person_id, zweck = excluded.zweck, geloescht_am = null;
  return neu_id;
end
$$;
revoke execute on function public.ressource_reservieren(uuid, uuid, uuid, date, date, text, uuid, uuid, text) from public, anon;
grant execute on function public.ressource_reservieren(uuid, uuid, uuid, date, date, text, uuid, uuid, text) to authenticated;

/** Reservierung aufheben (in den Papierkorb, Regel 5). */
create or replace function public.ressource_reservierung_aufheben(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'ressourcen.kein_recht';
  end if;
  update public.ressourcen_reservierungen set geloescht_am = now() where id = p_id and geloescht_am is null;
end
$$;
revoke execute on function public.ressource_reservierung_aufheben(uuid) from public, anon;
grant execute on function public.ressource_reservierung_aufheben(uuid) to authenticated;

/**
 * Belegung aller Fahrzeuge und Geräte: Reservierungen plus «Fahrzeug folgt dem Team» (Chris 2.11.2026, Frage 1 A):
 * ein interner Einsatz belegt das Fahrzeug der fest zugeteilten Person, wenn sie eingeplant ist und für diesen
 * Einsatz nicht von Hand ein anderes Fahrzeug gewählt wurde.
 */
create view public.ressourcen_belegung with (security_invoker = true) as
select 'hand'::text as quelle, r.id as reservierung_id, r.fahrzeug_id, r.geraet_id, r.von, r.bis, r.art,
       r.einsatz_id, r.projekt_id, r.person_id, r.zweck,
       coalesce(nullif(trim(coalesce(k.firma, concat_ws(' ', k.vorname, k.nachname))), '') || coalesce(', ' || o.ort, ''),
                p.titel, p.nummer) as projekt
  from public.ressourcen_reservierungen r
  left join public.projekte p on p.id = r.projekt_id
  left join public.kontakte k on k.id = p.kontakt_id
  left join public.objekte o on o.id = p.objekt_id
 where r.geloescht_am is null
union all
select 'auto', null, f.id, null, e.von, e.bis, 'einsatz', e.id, e.projekt_id, f.person_id, null,
       coalesce(nullif(trim(coalesce(k.firma, concat_ws(' ', k.vorname, k.nachname))), '') || coalesce(', ' || o.ort, ''),
                p.titel, p.nummer)
  from public.einsaetze e
  join public.fahrzeuge f on f.person_id = any (e.personen) and f.geloescht_am is null and not f.ausser_betrieb
  join public.projekte p on p.id = e.projekt_id
  left join public.kontakte k on k.id = p.kontakt_id
  left join public.objekte o on o.id = p.objekt_id
 where e.geloescht_am is null and e.art = 'intern'
   and not exists (select 1 from public.ressourcen_reservierungen r
                    where r.einsatz_id = e.id and r.fahrzeug_id is not null and r.geloescht_am is null);
grant select on public.ressourcen_belegung to authenticated;

-- ---------- Fristen: neu Reifen, Vignette, Leasing-Ende und Ausleihe ----------

create or replace view public.fristen with (security_invoker = true) as
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
 where g.geloescht_am is null and g.zustand <> 'ausser_betrieb' and g.ausgemustert_am is null
   and g.naechste_pruefung is not null
union all
select 'ausweis', 'qualifikationen', q.id, q.art, q.gueltig_bis, q.person_id, p.standort_id
  from (select distinct on (x.person_id, x.art) x.*
          from public.qualifikationen x
         where x.geloescht_am is null
         order by x.person_id, x.art, x.gueltig_bis desc nulls first, x.erworben_am desc nulls last) q
  join public.personen p on p.id = q.person_id and p.aktiv and p.geloescht_am is null
 where q.gueltig_bis is not null
union all
select 'reifen', 'fahrzeuge', f.id, f.bezeichnung || ' ' || f.kennzeichen, f.naechster_reifenwechsel, f.person_id,
       f.standort_id
  from public.fahrzeuge f
 where f.geloescht_am is null and not f.ausser_betrieb and f.naechster_reifenwechsel is not null
union all
select 'vignette', 'fahrzeuge', f.id, f.bezeichnung || ' ' || f.kennzeichen, f.vignette_bis, f.person_id, f.standort_id
  from public.fahrzeuge f
 where f.geloescht_am is null and not f.ausser_betrieb and f.vignette_bis is not null and f.art <> 'anhaenger'
union all
select 'leasing', 'fahrzeuge', f.id, f.bezeichnung || ' ' || f.kennzeichen, f.leasing_bis, null, f.standort_id
  from public.fahrzeuge f
 where f.geloescht_am is null and not f.ausser_betrieb and f.leasing_bis is not null
union all
select 'ausleihe', 'geraete', g.id, g.bezeichnung || coalesce(' (' || g.inventar_nr || ')', ''), g.zurueck_bis,
       g.person_id, g.standort_id
  from public.geraete g
 where g.geloescht_am is null and g.ausgemustert_am is null and g.person_id is not null and g.zurueck_bis is not null;
grant select on public.fristen to authenticated;

-- Fristen melden: Namen der neuen Arten; Leasing-Ende geht an die Administration (Ersatz bestellen, ~90 Tage
-- Lieferzeit, darum mit dem längeren Vorlauf der Ausweise).
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
     where f.faellig_am <= heute + case when f.art in ('ausweis', 'leasing')
                                        then coalesce((cfg ->> 'vorlauf_ausweis_tage')::int, 60)
                                        when f.art = 'ausleihe' then 0
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
      name_de := case r.art when 'mfk' then 'MFK' when 'service' then 'Service' when 'reifen' then 'Reifenwechsel'
                            when 'vignette' then 'Vignette' when 'leasing' then 'Leasing-Ende'
                            when 'ausleihe' then 'Zurückbringen' else 'Prüfung' end || ': ' || r.titel;
      name_fr := case r.art when 'mfk' then 'Expertise' when 'service' then 'Service' when 'reifen' then 'Pneus'
                            when 'vignette' then 'Vignette' when 'leasing' then 'Fin du leasing'
                            when 'ausleihe' then 'À rendre' else 'Contrôle' end || ' : ' || r.titel;
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

-- ---------- Kilometerstand monatlich (Chris 2.11.2026, Frage 4 A) ----------

/**
 * Zeitplan, stündlich: Am Monatsanfang erinnert die Glocke die fest zugeteilte Person, den Kilometerstand
 * einzutragen, wenn er in diesem Monat noch fehlt. Einmal pro Fahrzeug und Monat; Anhänger haben keinen Zähler.
 */
create or replace function public.fuhrpark_km_erinnern(p_heute date default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  heute date := coalesce(p_heute, (now() at time zone 'Europe/Zurich')::date);
  monat date := date_trunc('month', heute)::date;
  r record;
  n int := 0;
  k int;
begin
  if not coalesce((select (wert ->> 'km_monatlich')::boolean from public.einstellungen
                    where schluessel = 'ressourcen'), true) then
    return 0;
  end if;
  for r in
    select f.id, f.bezeichnung, f.kennzeichen, f.person_id, f.km_stand
      from public.fahrzeuge f
      join public.personen p on p.id = f.person_id and p.aktiv and p.geloescht_am is null
     where f.geloescht_am is null and not f.ausser_betrieb and f.art <> 'anhaenger'
       and coalesce(f.km_stand_am, '1900-01-01') < monat
  loop
    insert into intern.fristen_gemeldet (schluessel) values ('km:' || r.id || ':' || to_char(monat, 'YYYY-MM'))
    on conflict do nothing;
    get diagnostics k = row_count;
    continue when k = 0;
    n := n + 1;
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    values (r.person_id, 'info',
            'Kilometerstand eintragen: ' || r.bezeichnung || ' ' || r.kennzeichen,
            'Saisir le kilométrage : ' || r.bezeichnung || ' ' || r.kennzeichen,
            'Zuletzt ' || coalesce(to_char(r.km_stand, 'FM999G999G999') || ' km', 'nichts eingetragen'),
            'Dernier relevé ' || coalesce(to_char(r.km_stand, 'FM999G999G999') || ' km', 'aucun'),
            '/fleet?fahrzeug=' || r.id || '&km=1');
  end loop;
  return n;
end
$$;
revoke execute on function public.fuhrpark_km_erinnern(date) from public, anon, authenticated;
grant execute on function public.fuhrpark_km_erinnern(date) to service_role;

-- ---------- Kosten pro Fahrzeug (Recht «finanzen») ----------

/**
 * Kosten pro Fahrzeug in einem Jahr (bis heute): Leasing (Rate × Monate), Treibstoff/Strom (Einträge «Tanken»),
 * Unterhalt (Service, MFK, Reparatur, Reifen, Schaden), Versicherung und Steuer (Jahresbeträge anteilig) und übrige
 * Kosten; dazu gefahrene Kilometer, Liter und der Privatanteil für den Lohnausweis. Nur mit Recht «finanzen».
 */
create or replace function public.fuhrpark_kosten(p_jahr int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  heute date := (now() at time zone 'Europe/Zurich')::date;
  anfang date := make_date(p_jahr, 1, 1);
  ende date := least(make_date(p_jahr, 12, 31), heute);
  prozent numeric := coalesce((select (wert ->> 'privatanteil_prozent_monat')::numeric from public.einstellungen
                                where schluessel = 'ressourcen'), 0.9);
  fahrzeuge jsonb;
begin
  if not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'ressourcen.kein_recht';
  end if;
  if ende < anfang then
    return jsonb_build_object('jahr', p_jahr, 'fahrzeuge', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(z order by z ->> 'bezeichnung'), '[]') into fahrzeuge from (
    select jsonb_build_object(
      'fahrzeug_id', f.id, 'bezeichnung', f.bezeichnung, 'kennzeichen', f.kennzeichen,
      'km', greatest(coalesce(km.bis - km.von, 0), 0),
      'liter', coalesce(e.liter, 0),
      'leasing_rappen', coalesce(f.leasing_rate_rappen, 0) * lm.monate,
      'treibstoff_rappen', coalesce(e.treibstoff, 0),
      'unterhalt_rappen', coalesce(e.unterhalt, 0),
      'fix_rappen', round((coalesce(f.praemie_rappen, 0) + coalesce(f.verkehrssteuer_rappen, 0)) * jm.monate / 12.0)::bigint,
      'uebrige_rappen', coalesce(e.uebrige, 0),
      'privatanteil_rappen', case when f.privat_anteil and f.kaufpreis_rappen is not null
                                  then round(f.kaufpreis_rappen * prozent / 100 * jm.monate)::bigint end
    ) as z
      from public.fahrzeuge f
      -- Monate im Jahr, in denen das Fahrzeug im Betrieb bzw. im Leasing war (angefangene Monate zählen).
      cross join lateral (select count(*)::int as monate from generate_series(
        date_trunc('month', greatest(anfang, coalesce(f.kaufdatum, f.leasing_beginn, f.erste_inverkehrsetzung, anfang))),
        ende, interval '1 month') m) jm
      cross join lateral (select case when f.leasing_rate_rappen is null then 0 else count(*)::int end as monate
                            from generate_series(date_trunc('month', greatest(anfang, coalesce(f.leasing_beginn, anfang))),
                                                 least(ende, coalesce(f.leasing_bis, ende)), interval '1 month') m) lm
      cross join lateral (
        select coalesce((select max(x.km) from public.ressourcen_eintraege x
                          where x.fahrzeug_id = f.id and x.geloescht_am is null and x.datum < anfang),
                        (select min(x.km) from public.ressourcen_eintraege x
                          where x.fahrzeug_id = f.id and x.geloescht_am is null and x.datum between anfang and ende)) as von,
               (select max(x.km) from public.ressourcen_eintraege x
                 where x.fahrzeug_id = f.id and x.geloescht_am is null and x.datum between anfang and ende) as bis) km
      left join lateral (
        select sum(x.liter) filter (where x.art = 'tanken') as liter,
               sum(x.kosten_rappen) filter (where x.art = 'tanken') as treibstoff,
               sum(x.kosten_rappen) filter (where x.art in ('service', 'mfk', 'reparatur', 'reifen', 'schaden')) as unterhalt,
               sum(x.kosten_rappen) filter (where x.art in ('kosten', 'vignette', 'km_stand', 'notiz')) as uebrige
          from public.ressourcen_eintraege x
         where x.fahrzeug_id = f.id and x.geloescht_am is null and x.datum between anfang and ende) e on true
     where f.geloescht_am is null
       and (not f.ausser_betrieb or exists (select 1 from public.ressourcen_eintraege x
                                              where x.fahrzeug_id = f.id and x.datum between anfang and ende))
  ) t;
  return jsonb_build_object(
    'jahr', p_jahr,
    'fahrzeuge', fahrzeuge,
    'geraete_wert_rappen', (select coalesce(sum(g.kaufpreis_rappen), 0) from public.geraete g
                             where g.geloescht_am is null and g.ausgemustert_am is null),
    'geraete_kosten_rappen', (select coalesce(sum(x.kosten_rappen), 0) from public.ressourcen_eintraege x
                               where x.geraet_id is not null and x.geloescht_am is null
                                 and x.datum between anfang and ende));
end
$$;
revoke execute on function public.fuhrpark_kosten(int) from public, anon;
grant execute on function public.fuhrpark_kosten(int) to authenticated;
