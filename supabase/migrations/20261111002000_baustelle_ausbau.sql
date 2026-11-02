-- Baustelle & Rapporte vollständig (Entscheid 0041, Neuentwurf vom 2.11.2026).
-- Montage am Handy: Arbeitsschritte je Projektart, Sicherheits-Check, Teamzeiten, Pflichtfotos, Seriennummern,
-- Meldungen von der Baustelle, Abnahme am letzten Tag. Projektleitung: Baustellen heute, Baustellen-Akte,
-- Rapporte visieren, Wochenblatt der Zeiten. GL: Auswertung Soll/Ist.
-- «mein_tag» bleibt unverändert (der Service-Thread pflegt sie); die Handy-Zusätze kommen aus baustellen_infos.

-- ---------- Einstellungen (Regel 8: Konfiguration statt Code) ----------
insert into public.einstellungen (schluessel, wert) values ('baustelle', $j${
  "schritte": {
    "pv": [
      {"schluessel": "sicherheit", "de": "Gerüst und Sicherheit eingerichtet", "fr": "Échafaudage et sécurité installés"},
      {"schluessel": "unterkonstruktion", "de": "Dachhaken und Schienen montiert", "fr": "Crochets et rails montés"},
      {"schluessel": "module", "de": "Module verlegt", "fr": "Modules posés"},
      {"schluessel": "dc", "de": "DC-Verkabelung, Strings beschriftet", "fr": "Câblage DC, strings étiquetés"},
      {"schluessel": "wechselrichter", "de": "Wechselrichter montiert", "fr": "Onduleur monté"},
      {"schluessel": "speicher", "de": "Speicher montiert", "fr": "Batterie montée", "speicher": true},
      {"schluessel": "durchfuehrungen", "de": "Durchführungen abgedichtet", "fr": "Passages étanchéifiés"},
      {"schluessel": "geraeumt", "de": "Baustelle geräumt, Abfall entsorgt", "fr": "Chantier rangé, déchets évacués"}
    ],
    "speicher": [
      {"schluessel": "speicher", "de": "Speicher montiert", "fr": "Batterie montée"},
      {"schluessel": "wechselrichter", "de": "Wechselrichter angepasst oder ersetzt", "fr": "Onduleur adapté ou remplacé"},
      {"schluessel": "ac", "de": "AC-Anschluss vorbereitet", "fr": "Raccordement AC préparé"},
      {"schluessel": "geraeumt", "de": "Baustelle geräumt, Abfall entsorgt", "fr": "Chantier rangé, déchets évacués"}
    ],
    "wallbox": [
      {"schluessel": "wallbox", "de": "Wallbox montiert", "fr": "Borne montée"},
      {"schluessel": "kabel", "de": "Zuleitung verlegt", "fr": "Câble d’alimentation posé"},
      {"schluessel": "geraeumt", "de": "Baustelle geräumt, Abfall entsorgt", "fr": "Chantier rangé, déchets évacués"}
    ],
    "waermepumpe": [
      {"schluessel": "demontage", "de": "Alte Heizung demontiert", "fr": "Ancien chauffage démonté"},
      {"schluessel": "aussengeraet", "de": "Aussengerät gesetzt", "fr": "Unité extérieure posée"},
      {"schluessel": "innengeraet", "de": "Innengerät und Speicher montiert", "fr": "Unité intérieure et ballon montés"},
      {"schluessel": "hydraulik", "de": "Hydraulik angeschlossen, gefüllt, entlüftet", "fr": "Hydraulique raccordée, remplie, purgée"},
      {"schluessel": "elektro", "de": "Elektroanschluss vorbereitet", "fr": "Raccordement électrique préparé"},
      {"schluessel": "geraeumt", "de": "Baustelle geräumt, Abfall entsorgt", "fr": "Chantier rangé, déchets évacués"}
    ]
  },
  "fotos": {
    "pv": [
      {"schluessel": "vorher", "de": "Vorher", "fr": "Avant"},
      {"schluessel": "unterkonstruktion", "de": "Unterkonstruktion", "fr": "Sous-construction"},
      {"schluessel": "modulfeld", "de": "Modulfeld", "fr": "Champ de modules"},
      {"schluessel": "strings", "de": "Strings beschriftet", "fr": "Strings étiquetés"},
      {"schluessel": "wr_schild", "de": "Typenschild Wechselrichter", "fr": "Plaque onduleur"},
      {"schluessel": "speicher", "de": "Speicher", "fr": "Batterie", "speicher": true},
      {"schluessel": "nachher", "de": "Nachher", "fr": "Après"}
    ],
    "speicher": [
      {"schluessel": "vorher", "de": "Vorher", "fr": "Avant"},
      {"schluessel": "speicher", "de": "Speicher", "fr": "Batterie"},
      {"schluessel": "wr_schild", "de": "Typenschild Wechselrichter", "fr": "Plaque onduleur"}
    ],
    "wallbox": [
      {"schluessel": "wallbox", "de": "Wallbox montiert", "fr": "Borne montée"}
    ],
    "waermepumpe": [
      {"schluessel": "vorher", "de": "Vorher", "fr": "Avant"},
      {"schluessel": "aussengeraet", "de": "Aussengerät", "fr": "Unité extérieure"},
      {"schluessel": "innengeraet", "de": "Innengerät", "fr": "Unité intérieure"},
      {"schluessel": "typenschild", "de": "Typenschild", "fr": "Plaque signalétique"}
    ]
  },
  "sicherheit": [
    {"schluessel": "geruest", "de": "Gerüst und Seitenschutz geprüft", "fr": "Échafaudage et protection latérale contrôlés"},
    {"schluessel": "absturz", "de": "Absturzsicherung und Anschlagpunkte da", "fr": "Protection antichute et points d’ancrage en place"},
    {"schluessel": "psa", "de": "PSA (Helm, Schuhe, Handschuhe)", "fr": "EPI (casque, chaussures, gants)"},
    {"schluessel": "wetter", "de": "Wetter ok (kein Gewitter, Wind unter 50 km/h)", "fr": "Météo ok (pas d’orage, vent sous 50 km/h)"},
    {"schluessel": "erste_hilfe", "de": "Erste-Hilfe-Koffer im Fahrzeug", "fr": "Trousse de secours dans le véhicule"}
  ],
  "soll": {
    "h_pro_kwp": {"standard": 4.5, "flachdach": 3.2},
    "speicher_h": 8,
    "pauschal": {"speicher": 10, "wallbox": 6, "waermepumpe": 40}
  },
  "zeiten": {
    "woche_soll_h": 42.5,
    "pausen": [{"ab_h": 5.5, "min": 15}, {"ab_h": 7, "min": 30}, {"ab_h": 9, "min": 60}],
    "max_tag_h": 10,
    "saldo_warnung_h": 50
  }
}$j$::jsonb)
on conflict (schluessel) do nothing;

/** Baustellen-Einstellungen ändern nur Administration (eigener Trigger, intern.einstellung_schuetzen bleibt unberührt). */
create or replace function intern.baustelle_einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'baustelle.kein_recht';
  end if;
  return new;
end
$$;
create trigger baustelle_schuetzen before insert or update on public.einstellungen
  for each row when (new.schluessel = 'baustelle') execute function intern.baustelle_einstellung_schuetzen();

create or replace function intern.baustelle_cfg() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select wert from public.einstellungen where schluessel = 'baustelle'), '{}')
$$;

-- ---------- Neue Felder ----------
alter table public.rapporte
  add column if not exists schritte jsonb not null default '{}',
  add column if not exists sicherheit jsonb,
  add column if not exists seriennummern jsonb not null default '[]',
  add column if not exists vorbehalte jsonb not null default '[]',
  add column if not exists visiert_am timestamptz,
  add column if not exists visiert_von uuid references public.personen (id),
  add column if not exists rueckfrage text,
  add column if not exists rueckfrage_am timestamptz;
comment on column public.rapporte.schritte is 'Heute erledigte Arbeitsschritte {schluessel: true} nach einstellungen.baustelle.schritte.';
comment on column public.rapporte.sicherheit is 'Sicherheits-Check vor Arbeitsbeginn {am, person_id, punkte: {schluessel: bool}}.';
comment on column public.rapporte.seriennummern is 'Gescannte Seriennummern [{id, art, modell, seriennummer}]; gehen bei der IBN in anlagen.komponenten.';
comment on column public.rapporte.vorbehalte is 'Abnahme mit Vorbehalt: offene Punkte [{text}], die der Kunde mit der Unterschrift kennt.';
comment on column public.rapporte.visiert_am is 'Projektleitung hat den Rapport gelesen und für in Ordnung befunden.';

alter table public.projekte add column if not exists soll_stunden numeric(8, 1);
comment on column public.projekte.soll_stunden is 'Montage-Stunden Soll von Hand; leer = Faustregel aus einstellungen.baustelle.soll.';

alter table public.dokumente add column if not exists kategorie text;
comment on column public.dokumente.kategorie is 'Art des Fotos (z. B. Pflichtfoto «modulfeld» nach einstellungen.baustelle.fotos).';

/**
 * Ersetzt die Fassung aus 20261031000100: Ein abgeschlossener Rapport bleibt fest, nur Visum und Rückfrage der
 * Projektleitung dürfen sich noch ändern (sie gehören nicht zum unterschriebenen Inhalt).
 */
create or replace function intern.rapport_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.nummer, '') = '' then
      new.nummer := 'R' || lpad(nextval('intern.rapport_nummer')::text, 4, '0');
    end if;
    new.person_id := coalesce(new.person_id, intern.meine_person_id());
    if new.projekt_id is null and new.service_fall_id is not null then
      select f.projekt_id into new.projekt_id from public.service_faelle f where f.id = new.service_fall_id;
    end if;
    if new.projekt_id is null and new.wartungsvertrag_id is not null then
      select coalesce(w.projekt_id, a.projekt_id) into new.projekt_id
        from public.wartungsvertraege w left join public.anlagen a on a.id = w.anlage_id where w.id = new.wartungsvertrag_id;
    end if;
  elsif old.abgeschlossen_am is not null and new.abgeschlossen_am is not null
        and (new.geloescht_am is not distinct from old.geloescht_am)
        and (to_jsonb(new) - array['visiert_am', 'visiert_von', 'rueckfrage', 'rueckfrage_am', 'geaendert_am', 'team'])
            is distinct from (to_jsonb(old) - array['visiert_am', 'visiert_von', 'rueckfrage', 'rueckfrage_am', 'geaendert_am', 'team']) then
    raise exception using errcode = 'P0001', message = 'baustelle.rapport_abgeschlossen';
  end if;
  return new;
end
$$;

-- ---------- Meldungen von der Baustelle ----------
create table public.baustellen_meldungen (
  id              uuid primary key default gen_random_uuid(),
  nummer          text not null default '',
  projekt_id      uuid references public.projekte (id),
  rapport_id      uuid references public.rapporte (id),
  service_fall_id uuid references public.service_faelle (id),
  art             text not null check (art in ('material', 'schaden', 'kunde', 'wetter', 'planung', 'sicherheit')),
  text            text not null,
  weiter          boolean not null default true,
  person_id       uuid references public.personen (id),
  erledigt_am     timestamptz,
  erledigt_von    uuid references public.personen (id),
  erledigt_notiz  text,
  constraint baustellen_meldungen_bezug check (projekt_id is not null or rapport_id is not null or service_fall_id is not null)
);
select intern.richte_fachtabelle_ein('baustellen_meldungen');
create index baustellen_meldungen_offen on public.baustellen_meldungen (projekt_id) where erledigt_am is null and geloescht_am is null;
comment on table public.baustellen_meldungen is 'Probleme von der Baustelle (Material, Schaden, Kunde, Wetter, Planung, Sicherheit); Aufgabe und Glocke an die Projektleitung.';

create sequence if not exists intern.meldung_nummer;

/** Nummer M001 …, Person und Projekt; danach Aufgabe und Glocke an die Projektleitung (sonst Administration). */
create or replace function intern.meldung_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.nummer, '') = '' then
    new.nummer := 'M' || lpad(nextval('intern.meldung_nummer')::text, 3, '0');
  end if;
  new.person_id := coalesce(new.person_id, intern.meine_person_id());
  if new.projekt_id is null and new.rapport_id is not null then
    select r.projekt_id, coalesce(new.service_fall_id, r.service_fall_id) into new.projekt_id, new.service_fall_id
      from public.rapporte r where r.id = new.rapport_id;
  end if;
  return new;
end
$$;
create trigger vorbereiten before insert on public.baustellen_meldungen
  for each row execute function intern.meldung_vorbereiten();

create or replace function intern.meldung_melden() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_pl uuid;
  v_titel text;
  v_ort text;
  v_titel_fr text;
begin
  select p.verantwortlich_id, p.nummer into v_pl, v_ort from public.projekte p where p.id = new.projekt_id;
  v_titel := 'Meldung ' || new.nummer || ' (' || new.art || ')' || coalesce(' · ' || v_ort, '');
  v_titel_fr := 'Signalement ' || new.nummer || ' (' || new.art || ')' || coalesce(' · ' || v_ort, '');
  if v_pl is null then
    perform intern.benachrichtige_admins(new.person_id, case when new.weiter then 'warnung' else 'kritisch' end,
                                         v_titel, v_titel_fr, left(new.text, 300), '/fieldwork?reiter=meldungen');
    return new;
  end if;
  perform intern.aufgabe_einmal(v_pl, v_titel, current_date, 'baustellen_meldungen', new.id, new.text);
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  values (v_pl, case when new.weiter then 'warnung' else 'kritisch' end, v_titel, v_titel_fr,
          left(new.text, 300), left(new.text, 300), '/fieldwork?reiter=meldungen');
  return new;
end
$$;
create trigger melden after insert on public.baustellen_meldungen
  for each row execute function intern.meldung_melden();

/** Meldung von der Baustelle erfassen (p: id, rapport_id, projekt_id, service_fall_id, art, text, weiter). Wiederholbar. */
create or replace function public.meldung_erfassen(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
begin
  if exists (select 1 from public.baustellen_meldungen where id = v_id) then return v_id; end if;
  if nullif(trim(coalesce(p ->> 'text', '')), '') is null then
    raise exception using errcode = 'P0001', message = 'baustelle.meldung_leer';
  end if;
  insert into public.baustellen_meldungen (id, rapport_id, projekt_id, service_fall_id, art, text, weiter)
  values (v_id, nullif(p ->> 'rapport_id', '')::uuid, nullif(p ->> 'projekt_id', '')::uuid,
          nullif(p ->> 'service_fall_id', '')::uuid, coalesce(nullif(p ->> 'art', ''), 'planung'), trim(p ->> 'text'),
          coalesce((p ->> 'weiter')::boolean, true));
  return v_id;
end
$$;

/** Meldung erledigen (oder mit p_wieder wieder öffnen); schliesst auch die Aufgabe dazu. */
create or replace function public.meldung_erledigen(p_id uuid, p_notiz text default null, p_wieder boolean default false)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.baustellen_meldungen
     set erledigt_am = case when p_wieder then null else coalesce(erledigt_am, now()) end,
         erledigt_von = case when p_wieder then null else intern.meine_person_id() end,
         erledigt_notiz = case when p_wieder then erledigt_notiz else nullif(trim(coalesce(p_notiz, '')), '') end
   where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.meldung_nicht_gefunden'; end if;
  if not p_wieder then
    update public.aufgaben set erledigt_am = now(), erledigt_von = intern.meine_person_id()
     where bezug_tabelle = 'baustellen_meldungen' and bezug_id = p_id and erledigt_am is null;
  end if;
end
$$;

-- ---------- Wochen-Bestätigung der Zeiten ----------
create table public.zeiten_wochen (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references public.personen (id),
  woche         date not null check (extract(isodow from woche) = 1),
  bestaetigt_am timestamptz not null default now()
);
select intern.richte_fachtabelle_ein('zeiten_wochen');
create unique index zeiten_wochen_einmal on public.zeiten_wochen (person_id, woche) where geloescht_am is null;
comment on table public.zeiten_wochen is 'Monteur bestätigt seine Woche (Montag); danach prüft die Projektleitung.';

/** Eigene Woche bestätigen (p_woche = Montag). Wiederholbar. */
create or replace function public.zeiten_woche_bestaetigen(p_woche date)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_person uuid := intern.meine_person_id();
begin
  if v_person is null then raise exception using errcode = 'P0001', message = 'baustelle.keine_person'; end if;
  if extract(isodow from p_woche) <> 1 then raise exception using errcode = 'P0001', message = 'baustelle.woche_montag'; end if;
  if exists (select 1 from public.zeiten where person_id = v_person and stopp is null and geloescht_am is null
              and start < (p_woche + 7)::timestamp at time zone 'Europe/Zurich'
              and start >= p_woche::timestamp at time zone 'Europe/Zurich') then
    raise exception using errcode = 'P0001', message = 'baustelle.zeit_laeuft';
  end if;
  insert into public.zeiten_wochen (person_id, woche) values (v_person, p_woche)
  on conflict (person_id, woche) where geloescht_am is null do nothing;
end
$$;

-- ---------- Hilfen: Schritte, Soll, Ist ----------

/** Projektart (Schlüssel der Ablauf-Vorlage, Standard pv) und ob ein Speicher dazugehört. */
create or replace function intern.baustelle_art(p_projekt uuid, out vorlage text, out speicher boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce(v.schluessel, 'pv'),
         coalesce(v.schluessel = 'speicher' or nullif(trim(o.batterie), '') is not null, false)
    from public.projekte p
    left join public.ablauf_vorlagen v on v.id = p.ablauf_vorlage_id
    left join public.offerten o on o.id = p.offerte_id
   where p.id = p_projekt
$$;

/** Arbeitsschritte bzw. Pflichtfotos (p_liste = schritte|fotos), die für das Projekt gelten. */
create or replace function intern.baustelle_liste(p_projekt uuid, p_liste text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(s order by n), '[]')
    from intern.baustelle_art(p_projekt) a,
         jsonb_array_elements(coalesce(intern.baustelle_cfg() -> p_liste -> a.vorlage,
                                       intern.baustelle_cfg() -> p_liste -> 'pv', '[]')) with ordinality x(s, n)
   where a.vorlage is not null and (not coalesce((s ->> 'speicher')::boolean, false) or a.speicher)
$$;

/** Schritte, die in irgendeinem Rapport des Projekts erledigt sind, mit dem ersten Datum. */
create or replace function intern.baustelle_erledigt(p_projekt uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, d), '{}') from (
    select e.key as k, min(r.datum) as d
      from public.rapporte r, jsonb_each(r.schritte) e
     where r.projekt_id = p_projekt and r.geloescht_am is null and e.value = 'true'::jsonb
     group by e.key) x
$$;

/** Fortschritt 0–100 nach erledigten Schritten. */
create or replace function intern.baustelle_fortschritt(p_projekt uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case when jsonb_array_length(l) = 0 then 0
              else round(100.0 * (select count(*) from jsonb_array_elements(l) s where intern.baustelle_erledigt(p_projekt) ? (s ->> 'schluessel'))
                         / jsonb_array_length(l))::int end
    from intern.baustelle_liste(p_projekt, 'schritte') l
$$;

/**
 * Soll-Stunden der Montage: von Hand am Projekt, sonst Faustregel (Pauschale je Projektart, bei PV kWp × Stunden
 * nach Dachform plus Speicher). Ohne kWp keine Faustregel.
 */
create or replace function intern.baustelle_soll(p_projekt uuid, out stunden numeric, out quelle text)
language plpgsql stable security definer set search_path = '' as $$
declare
  c jsonb := intern.baustelle_cfg() -> 'soll';
  p public.projekte;
  a record;
  v_kwp numeric;
  v_dach text;
begin
  select * into p from public.projekte where id = p_projekt;
  if p.soll_stunden is not null then stunden := p.soll_stunden; quelle := 'hand'; return; end if;
  select * into a from intern.baustelle_art(p_projekt);
  if a.vorlage <> 'pv' and c -> 'pauschal' ? a.vorlage then
    stunden := (c -> 'pauschal' ->> a.vorlage)::numeric; quelle := 'regel'; return;
  end if;
  v_kwp := coalesce((select an.leistung_kwp from public.anlagen an where an.projekt_id = p_projekt and an.geloescht_am is null limit 1),
                    (select o.leistung_kwp from public.offerten o where o.id = p.offerte_id));
  if v_kwp is null or v_kwp <= 0 then return; end if;
  select ob.dachform into v_dach from public.objekte ob where ob.id = p.objekt_id;
  stunden := round(v_kwp * coalesce((c -> 'h_pro_kwp' ->> v_dach)::numeric, (c -> 'h_pro_kwp' ->> 'standard')::numeric, 4.5)
                   + case when a.speicher then coalesce((c ->> 'speicher_h')::numeric, 0) else 0 end, 1);
  quelle := 'regel';
end
$$;

/** Ist-Stunden auf dem Projekt (Arbeit und Reise getrennt, nur gestoppte Zeiten). */
create or replace function intern.baustelle_ist(p_projekt uuid, out arbeit numeric, out reise numeric)
language sql stable security definer set search_path = '' as $$
  select coalesce(round(sum(h) filter (where art = 'arbeit'), 1), 0), coalesce(round(sum(h) filter (where art = 'reise'), 1), 0)
    from (select z.art, extract(epoch from (coalesce(z.stopp, now()) - z.start)) / 3600.0 - z.pause_min / 60.0 as h
            from public.zeiten z where z.projekt_id = p_projekt and z.geloescht_am is null) x
$$;

/** Soll-Stunden von Hand setzen (leer = Faustregel). Recht preise. */
create or replace function public.baustelle_soll_setzen(p_projekt uuid, p_stunden numeric)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'baustelle.recht_fehlt'; end if;
  if p_stunden is not null and p_stunden < 0 then raise exception using errcode = 'P0001', message = 'baustelle.soll_negativ'; end if;
  update public.projekte set soll_stunden = p_stunden where id = p_projekt and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.projekt_nicht_gefunden'; end if;
end
$$;

/** Text aus den erledigten Schritten (für Rapporte, in denen nichts getippt wurde). */
create or replace function intern.baustelle_schritt_text(p_projekt uuid, p_schritte jsonb) returns text
language sql stable security definer set search_path = '' as $$
  select string_agg(s ->> 'de', ', ' order by n)
    from jsonb_array_elements(intern.baustelle_liste(p_projekt, 'schritte')) with ordinality x(s, n)
   where coalesce(p_schritte ->> (s ->> 'schluessel'), 'false') = 'true'
$$;

/** Seriennummern aus allen Rapporten des Projekts in die Anlage übernehmen (ohne Doppelte). */
create or replace function intern.seriennummern_in_anlage(p_projekt uuid) returns void
language sql security definer set search_path = '' as $$
  update public.anlagen a set komponenten = a.komponenten || coalesce((
    select jsonb_agg(jsonb_build_object('art', s ->> 'art', 'modell', nullif(s ->> 'modell', ''), 'seriennummer', s ->> 'seriennummer',
                                        'quelle', 'rapport'))
      from (select distinct on (s ->> 'seriennummer') s
              from public.rapporte r, jsonb_array_elements(r.seriennummern) s
             where r.projekt_id = p_projekt and r.geloescht_am is null and nullif(trim(s ->> 'seriennummer'), '') is not null) x
     where not exists (select 1 from jsonb_array_elements(a.komponenten) k where k ->> 'seriennummer' = x.s ->> 'seriennummer')), '[]')
   where a.projekt_id = p_projekt and a.geloescht_am is null
$$;

-- ---------- Rapport speichern und abschliessen (ersetzt Fassung 20261031000200) ----------

/**
 * Rapport anlegen oder ändern (p: id, art, datum, projekt_id, service_fall_id, wartungsvertrag_id, einsatz_id,
 * arbeiten, material, team, pruefpunkte, schritte, sicherheit, seriennummern, vorbehalte, montage_fertig,
 * verrechnung, notiz_intern). Prüfpunkte und Schritte werden mit den gespeicherten zusammengeführt (vom Handy
 * kommen sie einzeln). Gibt die ID zurück.
 */
create or replace function public.rapport_speichern(p jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  r public.rapporte;
begin
  select * into r from public.rapporte where id = v_id;
  if not found then
    if nullif(p ->> 'projekt_id', '') is null and nullif(p ->> 'service_fall_id', '') is null
       and nullif(p ->> 'wartungsvertrag_id', '') is null then
      raise exception using errcode = 'P0001', message = 'baustelle.rapport_ohne_bezug';
    end if;
    insert into public.rapporte (id, art, datum, projekt_id, service_fall_id, wartungsvertrag_id, einsatz_id, arbeiten,
                                 material, team, pruefpunkte, schritte, sicherheit, seriennummern, vorbehalte,
                                 montage_fertig, verrechnung, notiz_intern)
    values (v_id, coalesce(nullif(p ->> 'art', ''), 'montage'),
            coalesce(nullif(p ->> 'datum', '')::date, (now() at time zone 'Europe/Zurich')::date),
            nullif(p ->> 'projekt_id', '')::uuid, nullif(p ->> 'service_fall_id', '')::uuid,
            nullif(p ->> 'wartungsvertrag_id', '')::uuid, nullif(p ->> 'einsatz_id', '')::uuid,
            nullif(trim(p ->> 'arbeiten'), ''), coalesce(p -> 'material', '[]'),
            coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p -> 'team') x), '{}'),
            coalesce(p -> 'pruefpunkte', '{}'), coalesce(p -> 'schritte', '{}'), p -> 'sicherheit',
            coalesce(p -> 'seriennummern', '[]'), coalesce(p -> 'vorbehalte', '[]'),
            coalesce((p ->> 'montage_fertig')::boolean, false),
            nullif(p ->> 'verrechnung', ''), nullif(trim(p ->> 'notiz_intern'), ''));
    return v_id;
  end if;
  if r.geloescht_am is not null then raise exception using errcode = 'P0001', message = 'baustelle.rapport_geloescht'; end if;
  update public.rapporte set
    datum = coalesce(nullif(p ->> 'datum', '')::date, datum),
    arbeiten = intern.feld(p, 'arbeiten', arbeiten),
    material = case when p ? 'material' then coalesce(p -> 'material', '[]') else material end,
    team = case when p ? 'team' then coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p -> 'team') x), '{}') else team end,
    pruefpunkte = case when p ? 'pruefpunkte' then pruefpunkte || coalesce(p -> 'pruefpunkte', '{}') else pruefpunkte end,
    schritte = case when p ? 'schritte' then schritte || coalesce(p -> 'schritte', '{}') else schritte end,
    sicherheit = case when p ? 'sicherheit' then p -> 'sicherheit' else sicherheit end,
    seriennummern = case when p ? 'seriennummern' then coalesce(p -> 'seriennummern', '[]') else seriennummern end,
    vorbehalte = case when p ? 'vorbehalte' then coalesce(p -> 'vorbehalte', '[]') else vorbehalte end,
    montage_fertig = coalesce((p ->> 'montage_fertig')::boolean, montage_fertig),
    verrechnung = intern.feld(p, 'verrechnung', verrechnung),
    notiz_intern = intern.feld(p, 'notiz_intern', notiz_intern)
  where id = v_id;
  return v_id;
end
$$;

/**
 * Rapport abschliessen (p: unterschrift {name, dokument_id, am} oder ohne_unterschrift (Grund), montage_fertig,
 * verrechnung, fall_erledigt, vorbehalte, stopp). Die Unterschrift des Kunden braucht es bei der Abnahme
 * (Montage fertig), bei IBN, Service und Wartung und wenn offene Nachträge am Rapport hängen; ein gewöhnlicher
 * Tagesrapport der Montage geht ohne. Ohne getippten Text gelten die erledigten Schritte als Arbeiten.
 * Laufende Zeiten des Rapports enden. Folgen je Art wie bisher; dazu Seriennummern in die Anlage und bei
 * Vorbehalten eine Aufgabe an die Projektleitung.
 */
create or replace function public.rapport_abschliessen(p_id uuid, p jsonb default '{}')
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  r public.rapporte;
  v_unterschrift jsonb;
  v_stopp timestamptz := coalesce(nullif(p ->> 'stopp', '')::timestamptz, now());
  v_text text;
  v_fertig boolean;
  v_pflicht boolean;
  v_pl uuid;
begin
  select * into r from public.rapporte where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.rapport_nicht_gefunden'; end if;
  if r.abgeschlossen_am is not null then return; end if;  -- Wiederholung nach Funkloch
  v_fertig := coalesce((p ->> 'montage_fertig')::boolean, r.montage_fertig);
  v_pflicht := r.art <> 'montage' or v_fertig
               or exists (select 1 from public.nachtraege n where n.rapport_id = p_id and n.status = 'offen' and n.geloescht_am is null);
  if nullif(trim(coalesce(p -> 'unterschrift' ->> 'name', '')), '') is not null and nullif(p -> 'unterschrift' ->> 'dokument_id', '') is not null then
    v_unterschrift := jsonb_build_object('name', trim(p -> 'unterschrift' ->> 'name'), 'dokument_id', p -> 'unterschrift' ->> 'dokument_id',
                                         'am', coalesce(p -> 'unterschrift' ->> 'am', now()::text));
  elsif nullif(trim(coalesce(p ->> 'ohne_unterschrift', '')), '') is not null then
    v_unterschrift := jsonb_build_object('ohne', trim(p ->> 'ohne_unterschrift'), 'am', now());
  elsif v_pflicht then
    raise exception using errcode = 'P0001', message = 'baustelle.unterschrift_fehlt';
  end if;
  if nullif(trim(coalesce(r.arbeiten, '')), '') is null and r.projekt_id is not null then
    r.arbeiten := intern.baustelle_schritt_text(r.projekt_id, r.schritte);
  end if;
  if nullif(trim(coalesce(r.arbeiten, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'baustelle.arbeiten_fehlen';
  end if;
  if r.art in ('service', 'wartung') and coalesce(nullif(p ->> 'verrechnung', ''), r.verrechnung) is null then
    raise exception using errcode = 'P0001', message = 'baustelle.verrechnung_fehlt';
  end if;

  update public.zeiten set stopp = greatest(v_stopp, start + interval '1 minute')
   where rapport_id = p_id and stopp is null and geloescht_am is null;
  update public.rapporte set unterschrift_kunde = v_unterschrift, abgeschlossen_am = now(), arbeiten = r.arbeiten,
         montage_fertig = v_fertig,
         verrechnung = coalesce(nullif(p ->> 'verrechnung', ''), verrechnung),
         vorbehalte = case when p ? 'vorbehalte' then coalesce(p -> 'vorbehalte', '[]') else vorbehalte end
   where id = p_id
  returning * into r;

  if v_unterschrift ? 'dokument_id' then
    update public.nachtraege set status = 'vom_kunden_bestaetigt', bestaetigt_am = now(), unterschrift_kunde = v_unterschrift
     where rapport_id = p_id and status = 'offen' and geloescht_am is null;
  end if;

  v_text := r.nummer || ': ' || left(coalesce(r.arbeiten, ''), 300);
  if r.art = 'montage' and r.montage_fertig and r.projekt_id is not null then
    update public.projekte set bau_vorher = intern.bau_merken(id), bau_status = 'ibn'
     where id = r.projekt_id and coalesce(bau_status, 'ausstehend') in ('ausstehend', 'terminiert');
  elsif r.art = 'ibn' and r.projekt_id is not null then
    update public.projekte set bau_vorher = intern.bau_merken(id), status = 'abgeschlossen', bau_status = 'fertig'
     where id = r.projekt_id and coalesce(bau_status, '') <> 'fertig';
    perform intern.anlage_zum_projekt(r.projekt_id, r.datum);
  elsif r.art = 'service' and r.service_fall_id is not null then
    update public.service_faelle
       set verlauf = verlauf || jsonb_build_array(jsonb_build_object('am', now(), 'person_id', intern.meine_person_id(),
                                                                    'text', v_text, 'rapport_id', r.id)),
           status = case when coalesce((p ->> 'fall_erledigt')::boolean, false) then 'erledigt' else status end
     where id = r.service_fall_id;
  elsif r.art = 'wartung' and r.wartungsvertrag_id is not null then
    perform public.wartung_erledigt(r.wartungsvertrag_id, r.datum, v_text);
  end if;
  if r.projekt_id is not null and (r.art = 'ibn' or jsonb_array_length(r.seriennummern) > 0) then
    perform intern.seriennummern_in_anlage(r.projekt_id);
  end if;
  if jsonb_array_length(r.vorbehalte) > 0 and r.projekt_id is not null then
    select verantwortlich_id into v_pl from public.projekte where id = r.projekt_id;
    perform intern.aufgabe_einmal(v_pl, 'Abnahme mit Vorbehalt ' || r.nummer, current_date + 7, 'rapporte', r.id,
      (select string_agg('• ' || (v ->> 'text'), E'\n') from jsonb_array_elements(r.vorbehalte) v));
  end if;
end
$$;

/** Glocke an eine Person (security definer: die Projektleitung darf anderen keine Zeilen schreiben). */
create or replace function intern.baustelle_glocke(p_person uuid, p_art text, p_titel_de text, p_titel_fr text, p_text text, p_ziel text)
returns void
language sql security definer set search_path = '' as $$
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select p_person, p_art, p_titel_de, p_titel_fr, p_text, p_text, p_ziel where p_person is not null
$$;

/** Rapport visieren (gelesen, in Ordnung) oder mit p_rueckfrage zurückfragen (Glocke an den Monteur). Recht preise. */
create or replace function public.rapport_visieren(p_id uuid, p_rueckfrage text default null)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  r public.rapporte;
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'baustelle.recht_fehlt'; end if;
  select * into r from public.rapporte where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.rapport_nicht_gefunden'; end if;
  if nullif(trim(coalesce(p_rueckfrage, '')), '') is null then
    update public.rapporte set visiert_am = now(), visiert_von = intern.meine_person_id(), rueckfrage = null, rueckfrage_am = null
     where id = p_id;
    return;
  end if;
  update public.rapporte set visiert_am = null, visiert_von = null, rueckfrage = trim(p_rueckfrage), rueckfrage_am = now()
   where id = p_id;
  perform intern.baustelle_glocke(r.person_id, 'warnung', 'Rückfrage zu Rapport ' || r.nummer, 'Question sur le rapport ' || r.nummer,
                                  trim(p_rueckfrage), '/fieldwork?rapport=' || r.id);
end
$$;

-- ---------- Teamzeiten ----------

/**
 * Teamleitung startet die Zeit für mehrere Personen auf einmal (p: rapport_id, start, personen [{person_id, id, art}]).
 * Erlaubt für alle im Einsatz des Rapports und mit Recht preise. Eine laufende Zeit der Person endet. Wiederholbar.
 */
create or replace function public.zeit_team_starten(p jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_ich uuid := intern.meine_person_id();
  r public.rapporte;
  v_team uuid[];
  v_start timestamptz := coalesce(nullif(p ->> 'start', '')::timestamptz, now());
  x jsonb;
  v_person uuid;
  v_id uuid;
  n int := 0;
begin
  if v_ich is null then raise exception using errcode = 'P0001', message = 'baustelle.keine_person'; end if;
  select * into r from public.rapporte where id = nullif(p ->> 'rapport_id', '')::uuid and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.rapport_nicht_gefunden'; end if;
  select coalesce(es.personen, '{}') into v_team from public.einsaetze es where es.id = r.einsatz_id;
  v_team := coalesce(v_team, '{}') || r.team || coalesce(r.person_id, v_ich);
  if not (v_ich = any (v_team) or intern.hat_recht('preise')) then
    raise exception using errcode = 'P0001', message = 'baustelle.nicht_im_team';
  end if;
  if v_start > now() + interval '10 minutes' then raise exception using errcode = 'P0001', message = 'baustelle.zeit_zukunft'; end if;
  for x in select * from jsonb_array_elements(coalesce(p -> 'personen', '[]')) loop
    v_person := (x ->> 'person_id')::uuid;
    v_id := coalesce(nullif(x ->> 'id', '')::uuid, gen_random_uuid());
    if not (v_person = any (v_team) or intern.hat_recht('preise')) then
      raise exception using errcode = 'P0001', message = 'baustelle.nicht_im_team';
    end if;
    continue when exists (select 1 from public.zeiten where id = v_id);
    update public.zeiten set stopp = greatest(v_start, start + interval '1 minute')
     where person_id = v_person and stopp is null and geloescht_am is null;
    insert into public.zeiten (id, person_id, rapport_id, projekt_id, start, art)
    values (v_id, v_person, r.id, r.projekt_id, v_start, coalesce(nullif(x ->> 'art', ''), 'arbeit'));
    n := n + 1;
  end loop;
  update public.rapporte set team = (select array_agg(distinct t) from unnest(team || array(
           select (x2 ->> 'person_id')::uuid from jsonb_array_elements(coalesce(p -> 'personen', '[]')) x2)) t)
   where id = r.id;
  return n;
end
$$;

/** Teamleitung stoppt die laufenden Zeiten des Rapports (p: rapport_id, stopp, pause_min, personen [uuid], leer = alle). */
create or replace function public.zeit_team_stoppen(p jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_ich uuid := intern.meine_person_id();
  r public.rapporte;
  v_team uuid[];
  v_stopp timestamptz := coalesce(nullif(p ->> 'stopp', '')::timestamptz, now());
  v_personen uuid[] := (select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p -> 'personen', '[]')) x);
  n int;
begin
  select * into r from public.rapporte where id = nullif(p ->> 'rapport_id', '')::uuid and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.rapport_nicht_gefunden'; end if;
  select coalesce(es.personen, '{}') into v_team from public.einsaetze es where es.id = r.einsatz_id;
  v_team := coalesce(v_team, '{}') || r.team || r.person_id;
  if not (v_ich = any (v_team) or intern.hat_recht('preise')) then
    raise exception using errcode = 'P0001', message = 'baustelle.nicht_im_team';
  end if;
  update public.zeiten set stopp = greatest(v_stopp, start + interval '1 minute'),
         pause_min = coalesce(nullif(p ->> 'pause_min', '')::int, pause_min)
   where rapport_id = r.id and stopp is null and geloescht_am is null
     and (v_personen is null or person_id = any (v_personen));
  get diagnostics n = row_count;
  return n;
end
$$;

-- ---------- Rapport-Liste mit den neuen Feldern ----------
drop view if exists public.rapporte_liste;
create view public.rapporte_liste with (security_invoker = true) as
select r.*,
       p.nummer as projekt_nummer,
       coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma) as kunde,
       o.strasse as objekt_strasse, o.plz as objekt_plz, o.ort as objekt_ort,
       pe.name as person,
       f.nummer as service_nummer,
       coalesce((select round(sum(extract(epoch from (coalesce(z.stopp, now()) - z.start)) / 3600.0 - z.pause_min / 60.0)::numeric, 2)
                   from public.zeiten z where z.rapport_id = r.id and z.geloescht_am is null), 0) as stunden,
       (select count(*) from public.dokumente d
         where d.bezug_tabelle = 'rapporte' and d.bezug_id = r.id and d.ordner = 'fotos' and d.geloescht_am is null)::int as fotos_anzahl,
       (select count(*) from public.nachtraege n where n.rapport_id = r.id and n.geloescht_am is null)::int as nachtraege_anzahl,
       vi.name as visiert_von_name
  from public.rapporte r
  left join public.projekte p on p.id = r.projekt_id
  left join public.service_faelle f on f.id = r.service_fall_id
  left join public.anlagen a on a.id = f.anlage_id
  left join public.wartungsvertraege w on w.id = r.wartungsvertrag_id
  left join public.kontakte k on k.id = coalesce(p.kontakt_id, f.kontakt_id, w.kontakt_id)
  left join public.objekte o on o.id = coalesce(p.objekt_id, a.objekt_id)
  left join public.personen pe on pe.id = r.person_id
  left join public.personen vi on vi.id = r.visiert_von
 where r.geloescht_am is null;
grant select on public.rapporte_liste to authenticated;

/** Meldungen mit Projekt, Kunde, Person und Fotos. */
create view public.baustellen_meldungen_liste with (security_invoker = true) as
select m.*, p.nummer as projekt_nummer,
       coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma) as kunde,
       o.ort as objekt_ort, pe.name as person, er.name as erledigt_von_name, r.nummer as rapport_nummer,
       (select count(*) from public.dokumente d where d.bezug_tabelle = 'baustellen_meldungen' and d.bezug_id = m.id
           and d.geloescht_am is null)::int as fotos_anzahl
  from public.baustellen_meldungen m
  left join public.projekte p on p.id = m.projekt_id
  left join public.kontakte k on k.id = p.kontakt_id
  left join public.objekte o on o.id = p.objekt_id
  left join public.personen pe on pe.id = m.person_id
  left join public.personen er on er.id = m.erledigt_von
  left join public.rapporte r on r.id = m.rapport_id
 where m.geloescht_am is null;
grant select on public.baustellen_meldungen_liste to authenticated;

-- ---------- Abfragen für Handy, Projektleitung und GL ----------

/**
 * Zusätze zum Tagesplan am Handy je Einsatz: Projektart, Schritte (mit erledigten), Pflichtfotos (mit
 * vorhandenen), Soll/Ist, Projektleitung, Team mit IDs (für Teamzeiten). Wird am Handy mit dem Tagesplan abgelegt.
 */
create or replace function public.baustellen_infos(p_einsaetze uuid[])
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_object_agg(es.id, jsonb_build_object(
    'projekt_id', p.id,
    'vorlage', (intern.baustelle_art(p.id)).vorlage,
    'speicher', (intern.baustelle_art(p.id)).speicher,
    'schritte', intern.baustelle_liste(p.id, 'schritte'),
    'erledigt', intern.baustelle_erledigt(p.id),
    'fortschritt', intern.baustelle_fortschritt(p.id),
    'fotos', intern.baustelle_liste(p.id, 'fotos'),
    'fotos_da', (select coalesce(jsonb_agg(distinct d.kategorie), '[]') from public.dokumente d
                   join public.rapporte r on r.id = d.bezug_id and d.bezug_tabelle = 'rapporte'
                  where r.projekt_id = p.id and d.kategorie is not null and d.geloescht_am is null),
    'soll', (intern.baustelle_soll(p.id)).stunden,
    'ist', (intern.baustelle_ist(p.id)).arbeit,
    'pl', (select jsonb_build_object('name', pe.name, 'telefon', coalesce(pe.profil ->> 'mobil', pe.profil ->> 'telefon'))
             from public.personen pe where pe.id = p.verantwortlich_id),
    'team', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'kuerzel', t.kuerzel) order by t.name), '[]')
               from public.personen t where t.id = any (es.personen)),
    'meldungen_offen', (select count(*) from public.baustellen_meldungen m
                         where m.projekt_id = p.id and m.erledigt_am is null and m.geloescht_am is null)
  )), '{}')
    from public.einsaetze es
    join public.projekte p on p.id = es.projekt_id
   where es.id = any (p_einsaetze) and es.geloescht_am is null
$$;

/**
 * Baustellen-Mappe für das Handy (auch ohne Netz, wird am Gerät abgelegt): Anlage, Dach, Hinweise der
 * Projektleitung (Notizen der Einsätze), Pläne und Dokumente, Kontakte, Material mit Stand.
 */
create or replace function public.baustellen_mappe(p_projekt uuid)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'projekt', jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel, 'bau_status', p.bau_status,
                                  'vorlage', (intern.baustelle_art(p.id)).vorlage),
    'anlage', jsonb_build_object(
      'kwp', coalesce((select a.leistung_kwp from public.anlagen a where a.projekt_id = p.id and a.geloescht_am is null limit 1), o.leistung_kwp),
      'module', o.anzahl_module, 'wechselrichter', o.wechselrichter, 'batterie', nullif(trim(o.batterie), ''),
      'komponenten', (select a.komponenten from public.anlagen a where a.projekt_id = p.id and a.geloescht_am is null limit 1)),
    'dach', jsonb_build_object('dachform', ob.dachform, 'gebaeudeart', ob.gebaeudeart, 'details', nullif(ob.dach, '{}'::jsonb)),
    'adresse', jsonb_build_object('strasse', ob.strasse, 'plz', ob.plz, 'ort', ob.ort, 'breite', ob.breite, 'laenge', ob.laenge),
    'hinweise', (select coalesce(jsonb_agg(jsonb_build_object('von', es.von, 'bis', es.bis, 'text', es.notiz) order by es.von), '[]')
                   from public.einsaetze es where es.projekt_id = p.id and es.geloescht_am is null and nullif(trim(es.notiz), '') is not null),
    'dokumente', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'ordner', d.ordner, 'mime_typ', d.mime_typ,
                                                               'speicher', d.speicher, 'speicher_pfad', d.speicher_pfad,
                                                               'sharepoint_url', d.sharepoint_url) order by d.ordner, d.name), '[]')
                    from public.dokumente d
                   where d.geloescht_am is null and coalesce(d.ordner, '') not in ('unterschrift')
                     and ((d.bezug_tabelle = 'projekte' and d.bezug_id = p.id) or (d.bezug_tabelle = 'offerten' and d.bezug_id = p.offerte_id))),
    'kontakte', jsonb_build_array(
        jsonb_build_object('rolle', 'kunde', 'name', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
                           'telefon', k.telefon, 'email', k.email))
      || case when nullif(trim(p.elektriker), '') is not null then jsonb_build_array(jsonb_build_object('rolle', 'elektriker', 'name', p.elektriker)) else '[]' end
      || case when nullif(trim(p.architekt), '') is not null then jsonb_build_array(jsonb_build_object('rolle', 'architekt', 'name', p.architekt)) else '[]' end
      || coalesce((select jsonb_build_array(jsonb_build_object('rolle', 'projektleitung', 'name', pe.name,
                                                               'telefon', coalesce(pe.profil ->> 'mobil', pe.profil ->> 'telefon'), 'email', pe.email))
                     from public.personen pe where pe.id = p.verantwortlich_id), '[]'),
    'material', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'bezeichnung', m.bezeichnung, 'menge', m.menge, 'einheit', m.einheit,
                                                              'artikelnummer', m.artikelnummer, 'vorhanden', m.vorhanden, 'fehlt', m.fehlt,
                                                              'unterwegs', m.unterwegs) order by m.reihenfolge, m.bezeichnung), '[]')
                   from public.projekt_material_stand m where m.projekt_id = p.id),
    'meldungen', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'nummer', m.nummer, 'art', m.art, 'text', m.text, 'erstellt_am', m.erstellt_am)
                                            order by m.erstellt_am desc), '[]')
                    from public.baustellen_meldungen m where m.projekt_id = p.id and m.erledigt_am is null and m.geloescht_am is null)
  )
    from public.projekte p
    left join public.offerten o on o.id = p.offerte_id
    left join public.objekte ob on ob.id = p.objekt_id
    left join public.kontakte k on k.id = p.kontakt_id
   where p.id = p_projekt and p.geloescht_am is null
$$;

/**
 * «Baustellen heute» für die Projektleitung: jede Baustelle mit Einsatz am Tag (Team, wer seit wann gestempelt
 * ist, Schritte, Fortschritt, Soll/Ist, Fotos, Meldungen, Rapport von heute, fehlender Rapport von gestern),
 * dazu Kennzahlen, offene Meldungen und Rapporte zum Visieren.
 */
create or replace function public.baustellen_heute(p_tag date default null)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_tag date := coalesce(p_tag, (now() at time zone 'Europe/Zurich')::date);
  v_gestern date := v_tag - case extract(isodow from v_tag)::int when 1 then 3 when 7 then 2 else 1 end;
  v_b jsonb;
begin
  select coalesce(jsonb_agg(b order by b ->> 'nummer'), '[]') into v_b from (
    select jsonb_build_object(
      'einsatz_id', es.id, 'projekt_id', p.id, 'nummer', p.nummer, 'standort_id', p.standort_id,
      'kunde', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
      'ort', ob.ort, 'von', es.von, 'bis', es.bis, 'notiz', es.notiz, 'vorlage', (intern.baustelle_art(p.id)).vorlage,
      'team', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', t.id, 'name', t.name, 'kuerzel', t.kuerzel,
                 'seit', (select min(z.start) from public.zeiten z where z.person_id = t.id and z.geloescht_am is null
                           and (z.start at time zone 'Europe/Zurich')::date = v_tag),
                 'laeuft', exists (select 1 from public.zeiten z where z.person_id = t.id and z.stopp is null and z.geloescht_am is null)
               ) order by t.name), '[]') from public.personen t where t.id = any (es.personen)),
      'schritte', intern.baustelle_liste(p.id, 'schritte'),
      'erledigt', intern.baustelle_erledigt(p.id),
      'fortschritt', intern.baustelle_fortschritt(p.id),
      'soll', (intern.baustelle_soll(p.id)).stunden,
      'ist', (intern.baustelle_ist(p.id)).arbeit,
      'fotos', (select count(*) from public.dokumente d join public.rapporte r on r.id = d.bezug_id and d.bezug_tabelle = 'rapporte'
                 where r.projekt_id = p.id and d.ordner = 'fotos' and d.geloescht_am is null),
      'fotos_heute', (select count(*) from public.dokumente d join public.rapporte r on r.id = d.bezug_id and d.bezug_tabelle = 'rapporte'
                       where r.projekt_id = p.id and r.datum = v_tag and d.ordner = 'fotos' and d.geloescht_am is null),
      'meldungen', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'art', m.art, 'nummer', m.nummer)), '[]')
                      from public.baustellen_meldungen m where m.projekt_id = p.id and m.erledigt_am is null and m.geloescht_am is null),
      'rapport', (select jsonb_build_object('id', r.id, 'nummer', r.nummer, 'abgeschlossen_am', r.abgeschlossen_am)
                    from public.rapporte r where r.projekt_id = p.id and r.datum = v_tag and r.geloescht_am is null
                     and r.service_fall_id is null order by r.erstellt_am limit 1),
      'rapport_gestern_fehlt', es.von <= v_gestern and not exists (
                    select 1 from public.rapporte r where r.projekt_id = p.id and r.datum = v_gestern and r.geloescht_am is null)
    ) as b
      from public.einsaetze es
      join public.projekte p on p.id = es.projekt_id and p.geloescht_am is null
      left join public.kontakte k on k.id = p.kontakt_id
      left join public.objekte ob on ob.id = p.objekt_id
     where es.geloescht_am is null and es.art <> 'geplant' and v_tag between es.von and es.bis
  ) x;

  return jsonb_build_object(
    'tag', v_tag,
    'baustellen', v_b,
    'kennzahlen', jsonb_build_object(
      'baustellen', jsonb_array_length(v_b),
      'personen', (select count(distinct t ->> 'id') from jsonb_array_elements(v_b) b, jsonb_array_elements(b -> 'team') t),
      'gestempelt', (select count(distinct t ->> 'id') from jsonb_array_elements(v_b) b, jsonb_array_elements(b -> 'team') t
                      where t ->> 'seit' is not null),
      'meldungen', (select count(*) from public.baustellen_meldungen m where m.erledigt_am is null and m.geloescht_am is null),
      'rapporte_fehlen', (select count(*) from jsonb_array_elements(v_b) b where (b ->> 'rapport_gestern_fehlt')::boolean),
      'zeiten_pruefen', (select count(*) from public.zeiten z where z.stopp is not null and z.freigegeben_am is null
                          and z.exportiert_am is null and z.geloescht_am is null and z.start > now() - interval '35 days'),
      'nachtraege_rappen', (select coalesce(sum(n.betrag_rappen), 0) from public.nachtraege n
                             where n.status = 'vom_kunden_bestaetigt' and n.geloescht_am is null),
      'nachtraege_ohne_preis', (select count(*) from public.nachtraege n
                                 where n.status in ('offen', 'vom_kunden_bestaetigt') and n.betrag_rappen is null and n.geloescht_am is null)
    ),
    'meldungen', (select coalesce(jsonb_agg(to_jsonb(m) order by m.erstellt_am desc), '[]') from (
                    select ml.id, ml.nummer, ml.art, ml.text, ml.weiter, ml.erstellt_am, ml.projekt_id, ml.projekt_nummer, ml.kunde,
                           ml.person, ml.fotos_anzahl
                      from public.baustellen_meldungen_liste ml where ml.erledigt_am is null order by ml.erstellt_am desc limit 30) m),
    'zu_visieren', (select coalesce(jsonb_agg(to_jsonb(v) order by v.datum desc), '[]') from (
                      select rl.id, rl.nummer, rl.art, rl.datum, rl.kunde, rl.projekt_nummer, rl.person, rl.rueckfrage
                        from public.rapporte_liste rl
                       where rl.abgeschlossen_am is not null and rl.visiert_am is null and rl.datum > v_tag - 30
                       order by rl.datum desc limit 30) v)
  );
end
$$;

/** Baustellen-Akte: alles zu einer Baustelle auf einer Seite (Schritte, Bautagebuch, Stunden, Material, Fotos …). */
create or replace function public.baustelle_akte(p_projekt uuid)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'projekt', jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel, 'status', p.status, 'bau_status', p.bau_status,
                                  'elektriker', p.elektriker, 'soll_stunden', p.soll_stunden,
                                  'kunde', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
                                  'telefon', k.telefon, 'strasse', ob.strasse, 'plz', ob.plz, 'ort', ob.ort,
                                  'pl', (select pe.name from public.personen pe where pe.id = p.verantwortlich_id),
                                  'vorlage', (intern.baustelle_art(p.id)).vorlage, 'speicher', (intern.baustelle_art(p.id)).speicher,
                                  'kwp', o.leistung_kwp),
    'einsaetze', (select coalesce(jsonb_agg(jsonb_build_object('id', es.id, 'von', es.von, 'bis', es.bis, 'art', es.art, 'notiz', es.notiz,
                    'team', (select coalesce(jsonb_agg(t.name order by t.name), '[]') from public.personen t where t.id = any (es.personen)))
                    order by es.von), '[]') from public.einsaetze es where es.projekt_id = p.id and es.geloescht_am is null),
    'schritte', intern.baustelle_liste(p.id, 'schritte'),
    'erledigt', intern.baustelle_erledigt(p.id),
    'fortschritt', intern.baustelle_fortschritt(p.id),
    'fotos_pflicht', intern.baustelle_liste(p.id, 'fotos'),
    'stunden', jsonb_build_object('soll', (intern.baustelle_soll(p.id)).stunden, 'quelle', (intern.baustelle_soll(p.id)).quelle,
                                  'arbeit', (intern.baustelle_ist(p.id)).arbeit, 'reise', (intern.baustelle_ist(p.id)).reise),
    'rapporte', (select coalesce(jsonb_agg(to_jsonb(x) order by x.datum desc, x.nummer desc), '[]') from (
                   select rl.id, rl.nummer, rl.art, rl.datum, rl.person, rl.arbeiten, rl.abgeschlossen_am, rl.visiert_am, rl.rueckfrage,
                          rl.stunden, rl.fotos_anzahl, rl.material, rl.schritte, rl.seriennummern, rl.vorbehalte, rl.sicherheit,
                          rl.montage_fertig, rl.unterschrift_kunde
                     from public.rapporte_liste rl where rl.projekt_id = p.id and rl.service_fall_id is null) x),
    'meldungen', (select coalesce(jsonb_agg(to_jsonb(m) order by m.erstellt_am desc), '[]') from (
                    select ml.id, ml.nummer, ml.art, ml.text, ml.weiter, ml.erstellt_am, ml.person, ml.erledigt_am, ml.erledigt_notiz,
                           ml.erledigt_von_name, ml.fotos_anzahl
                      from public.baustellen_meldungen_liste ml where ml.projekt_id = p.id) m),
    'nachtraege', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'nummer', n.nummer, 'beschreibung', n.beschreibung,
                                                                'stunden', n.stunden, 'betrag_rappen', n.betrag_rappen, 'status', n.status)
                                             order by n.erstellt_am), '[]')
                     from public.nachtraege n where n.projekt_id = p.id and n.geloescht_am is null),
    'material', (select jsonb_build_object('zeilen', count(*), 'fehlt', count(*) filter (where m.fehlt > 0))
                   from public.projekt_material_stand m where m.projekt_id = p.id),
    'fotos', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'kategorie', d.kategorie,
                                                           'speicher_pfad', d.speicher_pfad, 'sharepoint_url', d.sharepoint_url,
                                                           'datum', r.datum, 'rapport_nummer', r.nummer)
                                        order by r.datum desc, d.erstellt_am desc), '[]')
                from public.dokumente d join public.rapporte r on r.id = d.bezug_id and d.bezug_tabelle = 'rapporte'
               where r.projekt_id = p.id and d.ordner = 'fotos' and d.geloescht_am is null and r.geloescht_am is null),
    'anlage', (select jsonb_build_object('id', a.id, 'komponenten', a.komponenten, 'ibn_am', a.ibn_am)
                 from public.anlagen a where a.projekt_id = p.id and a.geloescht_am is null limit 1)
  )
    from public.projekte p
    left join public.offerten o on o.id = p.offerte_id
    left join public.objekte ob on ob.id = p.objekt_id
    left join public.kontakte k on k.id = p.kontakt_id
   where p.id = p_projekt and p.geloescht_am is null
$$;

/** Baustellen der letzten und nächsten Wochen (Liste fürs Büro) mit Fortschritt, Soll/Ist und offenen Meldungen. */
create or replace function public.baustellen_liste(p_tage int default 45)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x ->> 'von' desc), '[]') from (
    select jsonb_build_object(
      'projekt_id', p.id, 'nummer', p.nummer, 'bau_status', p.bau_status, 'standort_id', p.standort_id,
      'kunde', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma), 'ort', ob.ort,
      'von', min(es.von), 'bis', max(es.bis), 'vorlage', (intern.baustelle_art(p.id)).vorlage,
      'fortschritt', intern.baustelle_fortschritt(p.id),
      'soll', (intern.baustelle_soll(p.id)).stunden, 'ist', (intern.baustelle_ist(p.id)).arbeit,
      'meldungen', (select count(*) from public.baustellen_meldungen m where m.projekt_id = p.id and m.erledigt_am is null and m.geloescht_am is null),
      'rapporte', (select count(*) from public.rapporte r where r.projekt_id = p.id and r.geloescht_am is null and r.service_fall_id is null)
    ) as x
      from public.einsaetze es
      join public.projekte p on p.id = es.projekt_id and p.geloescht_am is null
      left join public.kontakte k on k.id = p.kontakt_id
      left join public.objekte ob on ob.id = p.objekt_id
     where es.geloescht_am is null and es.art <> 'geplant'
       and es.bis >= (now() at time zone 'Europe/Zurich')::date - p_tage and es.von <= (now() at time zone 'Europe/Zurich')::date + p_tage
     group by p.id, k.id, ob.id) y
$$;

/**
 * Wochenblatt der Zeiten (p_montag): je Person Stunden pro Tag, Abwesenheiten, Soll nach Pensum, Saldo seit
 * Jahresbeginn (Abwesenheiten zählen als Soll-Zeit), Bestätigung der Person, Ungeprüfte und nicht gestempelte
 * Einsatztage. Alle Personen nur mit Recht preise oder finanzen, sonst nur die eigene. Feiertage zählen (noch)
 * als Arbeitstage.
 */
create or replace function public.zeiten_wochenblatt(p_montag date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ich uuid := intern.meine_person_id();
  v_alle boolean := intern.hat_recht('preise') or intern.hat_recht('finanzen');
  v_soll numeric := coalesce((intern.baustelle_cfg() -> 'zeiten' ->> 'woche_soll_h')::numeric, 42.5);
  v_jahr date := date_trunc('year', p_montag)::date;
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
        'saldo_jahr', round((
            select coalesce(sum(extract(epoch from (z.stopp - z.start)) / 3600.0 - z.pause_min / 60.0), 0)
              from public.zeiten z where z.person_id = pe.id and z.geloescht_am is null and z.stopp is not null
               and (z.start at time zone 'Europe/Zurich')::date between v_jahr and v_bis)
          - (select count(*) from generate_series(v_jahr, v_bis, interval '1 day') d
              where extract(isodow from d) < 6
                and not exists (select 1 from public.abwesenheiten_alle a where a.person_id = pe.id and d::date between a.von and a.bis and not a.halbtag))
            * v_soll / 5 * coalesce(pa.pensum, 100) / 100.0, 1),
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

/**
 * Auswertung für die Geschäftsleitung im Zeitraum: fertige Baustellen mit Soll/Ist, Stunden pro kWp nach
 * Dachform, Arbeit gegen Reise, bestätigte Nachträge, Meldungen nach Art, Rapporte am selben Tag. Recht preise.
 */
create or replace function public.baustelle_auswertung(p_von date, p_bis date)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_fertig jsonb;
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'baustelle.recht_fehlt'; end if;
  select coalesce(jsonb_agg(f order by f ->> 'datum'), '[]') into v_fertig from (
    select jsonb_build_object('projekt_id', p.id, 'nummer', p.nummer, 'datum', max(r.datum),
             'kunde', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma), 'ort', ob.ort,
             'vorlage', (intern.baustelle_art(p.id)).vorlage, 'dachform', ob.dachform, 'kwp', o.leistung_kwp,
             'soll', (intern.baustelle_soll(p.id)).stunden, 'ist', (intern.baustelle_ist(p.id)).arbeit,
             'reise', (intern.baustelle_ist(p.id)).reise,
             'meldungen', (select count(*) from public.baustellen_meldungen m where m.projekt_id = p.id and m.geloescht_am is null)) as f
      from public.rapporte r
      join public.projekte p on p.id = r.projekt_id
      left join public.offerten o on o.id = p.offerte_id
      left join public.objekte ob on ob.id = p.objekt_id
      left join public.kontakte k on k.id = p.kontakt_id
     where r.geloescht_am is null and r.art = 'montage' and r.montage_fertig and r.abgeschlossen_am is not null
       and r.datum between p_von and p_bis
     group by p.id, o.id, ob.id, k.id) x;
  return jsonb_build_object(
    'fertig', v_fertig,
    'stunden', (select jsonb_build_object(
                  'arbeit', round(coalesce(sum(h) filter (where art = 'arbeit'), 0), 1),
                  'reise', round(coalesce(sum(h) filter (where art = 'reise'), 0), 1),
                  'auf_projekt', round(coalesce(sum(h) filter (where projekt_id is not null), 0), 1))
                  from (select z.art, z.projekt_id, extract(epoch from (z.stopp - z.start)) / 3600.0 - z.pause_min / 60.0 as h
                          from public.zeiten z where z.geloescht_am is null and z.stopp is not null
                           and (z.start at time zone 'Europe/Zurich')::date between p_von and p_bis) s),
    'nachtraege', (select jsonb_build_object('anzahl', count(*), 'rappen', coalesce(sum(n.betrag_rappen), 0))
                     from public.nachtraege n where n.geloescht_am is null and n.status in ('vom_kunden_bestaetigt', 'verrechnet')
                      and (n.bestaetigt_am at time zone 'Europe/Zurich')::date between p_von and p_bis),
    'meldungen', (select coalesce(jsonb_object_agg(art, n), '{}') from (
                    select m.art, count(*) as n from public.baustellen_meldungen m where m.geloescht_am is null
                       and (m.erstellt_am at time zone 'Europe/Zurich')::date between p_von and p_bis group by m.art) mm),
    'rapporte', (select jsonb_build_object('anzahl', count(*),
                    'gleicher_tag', count(*) filter (where (r.abgeschlossen_am at time zone 'Europe/Zurich')::date <= r.datum),
                    'visiert', count(*) filter (where r.visiert_am is not null))
                   from public.rapporte r where r.geloescht_am is null and r.abgeschlossen_am is not null
                    and r.datum between p_von and p_bis)
  );
end
$$;

revoke execute on function public.zeit_team_starten(jsonb), public.zeit_team_stoppen(jsonb), public.zeiten_wochenblatt(date)
  from public, anon;
grant execute on function public.meldung_erfassen(jsonb), public.meldung_erledigen(uuid, text, boolean),
  public.zeiten_woche_bestaetigen(date), public.baustelle_soll_setzen(uuid, numeric), public.rapport_speichern(jsonb),
  public.rapport_abschliessen(uuid, jsonb), public.rapport_visieren(uuid, text), public.zeit_team_starten(jsonb),
  public.zeit_team_stoppen(jsonb), public.baustellen_infos(uuid[]), public.baustellen_mappe(uuid),
  public.baustellen_heute(date), public.baustelle_akte(uuid), public.baustellen_liste(int), public.zeiten_wochenblatt(date),
  public.baustelle_auswertung(date, date) to authenticated;
