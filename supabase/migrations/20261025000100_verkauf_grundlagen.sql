-- Phase 6, Teil 1: Grundlagen für «Anfragen & Leads».
-- Standort und Sprache aus der PLZ (V233 computeErst), Lage für Karte und Route,
-- Lead-Nummern in der Datenbank statt im Browser, Aussendienst-Personen.

-- Sprache eines Standorts: neue Leads aus der Region Bulle schreiben wir französisch an (V170).
alter table public.standorte add column sprache text not null default 'de' check (sprache in ('de', 'fr'));
update public.standorte set sprache = 'fr' where kuerzel = 'bulle';

-- Wer Kundentermine hat (V233 TOUR_PERSONS: Chris, Loris, Filipe). Als Daten, nicht im Code.
alter table public.personen add column aussendienst boolean not null default false;
update public.personen p set aussendienst = true
 where p.profil ->> 'position' in ('aussen', 'beides')
    or exists (select 1 from public.verkaufschancen v where v.tour_person_id = p.id);

-- Zuständiger Standort einer Verkaufschance als Fremdschlüssel. «zustaendig» bleibt als Text aus V233
-- (Muri, Bulle, Andy); «Andy» hiess dort nur «beim Innendienst» und ist neu die Stufe «zur Offerte».
alter table public.verkaufschancen add column standort_id uuid references public.standorte (id);
create index verkaufschancen_standort_idx on public.verkaufschancen (standort_id) where geloescht_am is null;
alter table public.offerten add column verlustgrund text;

/**
 * Standort-Regeln (V233 computeErst) als Einstellung: die erste passende Regel gewinnt.
 * Eine Regel prüft Kantone, einen PLZ-Bereich und ob die PLZ im Verzeichnis fehlt.
 */
insert into public.einstellungen (schluessel, wert) values ('standort_regeln', $j$[
  {"kantone": ["GE", "VD", "NE", "JU"], "standort": "bulle"},
  {"kantone": ["FR"], "plz_von": 1712, "plz_bis": 1719, "standort": "muri", "hinweis": "Sensebezirk (deutsch)"},
  {"kantone": ["FR"], "standort": "bulle"},
  {"kantone": ["VS"], "plz_von": 3900, "plz_bis": 3999, "standort": "muri", "hinweis": "Oberwallis (deutsch)"},
  {"kantone": ["VS"], "standort": "bulle"},
  {"kantone": ["BE"], "plz_von": 2600, "plz_bis": 2799, "standort": "bulle", "hinweis": "Berner Jura (französisch)"},
  {"unbekannt": true, "plz_von": 1000, "plz_bis": 1997, "standort": "bulle"},
  {"unbekannt": true, "plz_von": 2000, "plz_bis": 2354, "standort": "bulle"},
  {"unbekannt": true, "plz_von": 2600, "plz_bis": 2954, "standort": "bulle"},
  {"standort": "muri"}
]$j$::jsonb)
on conflict (schluessel) do nothing;

/** Eintrag im PLZ-Verzeichnis zu PLZ oder Ort (genau, sonst Anfang des Namens), wie V233 geo(). */
create or replace function intern.ort_aus_verzeichnis(p_plz text, p_ort text)
returns public.plz_verzeichnis
language plpgsql stable set search_path = '' as $$
declare
  z text := left(regexp_replace(coalesce(p_plz, ''), '\D', '', 'g'), 4);
  o text := lower(trim(regexp_replace(coalesce(p_ort, ''), '\(.*?\)', '', 'g')));
  v public.plz_verzeichnis;
begin
  if length(z) = 4 then
    select * into v from public.plz_verzeichnis x where x.plz = z;
    if found then return v; end if;
  end if;
  if o = '' then return null; end if;
  select * into v from public.plz_verzeichnis x where x.ort_name = o order by x.ort_name, x.plz limit 1;
  if found then return v; end if;
  select x.* into v from public.plz_ortschaften a join public.plz_verzeichnis x on x.plz = a.plz
   where a.ort_name = o order by a.ort_name, a.plz limit 1;
  if found then return v; end if;
  if length(o) >= 3 then
    -- Bereich statt LIKE, damit der Index auch mit Parameter greift.
    select * into v from public.plz_verzeichnis x where x.ort_name ~>=~ o and x.ort_name ~<~ (o || chr(65535))
     order by x.ort_name, x.plz limit 1;
    if found then return v; end if;
    select x.* into v from public.plz_ortschaften a join public.plz_verzeichnis x on x.plz = a.plz
     where a.ort_name ~>=~ o and a.ort_name ~<~ (o || chr(65535)) order by a.ort_name, a.plz limit 1;
  end if;
  return v;
end
$$;

/** Standort-Kürzel (muri/bulle) für eine PLZ nach den Regeln in den Einstellungen. */
create or replace function public.standort_fuer_plz(p_plz text)
returns text
language plpgsql stable security invoker set search_path = '' as $$
declare
  z int := nullif(left(regexp_replace(coalesce(p_plz, ''), '\D', '', 'g'), 4), '')::int;
  kt text;
  r jsonb;
begin
  if z is null then return null; end if;
  select v.kanton into kt from public.plz_verzeichnis v where v.plz = lpad(z::text, 4, '0');
  for r in select jsonb_array_elements(wert) from public.einstellungen where schluessel = 'standort_regeln' loop
    continue when r ? 'kantone' and (kt is null or not (r -> 'kantone') ? kt);
    continue when coalesce((r ->> 'unbekannt')::boolean, false) and kt is not null;
    continue when r ? 'plz_von' and z < (r ->> 'plz_von')::int;
    continue when r ? 'plz_bis' and z > (r ->> 'plz_bis')::int;
    return r ->> 'standort';
  end loop;
  return null;
end
$$;
revoke execute on function public.standort_fuer_plz(text) from public, anon;
grant execute on function public.standort_fuer_plz(text) to authenticated;

/** Alles, was ein Formular zu einer PLZ wissen will: Ort, Kanton, Standort, Sprache, Lage, Höhe. */
create or replace function public.plz_auskunft(p_plz text)
returns table (plz text, ort text, kanton text, standort text, sprache text, breite double precision, laenge double precision, hoehe int)
language sql stable security invoker set search_path = '' as $$
  select v.plz, regexp_replace(v.ort, '\s+\d+$', ''), v.kanton, s.kuerzel, s.sprache, v.breite, v.laenge, v.hoehe
    from public.plz_verzeichnis v
    left join public.standorte s on s.kuerzel = public.standort_fuer_plz(v.plz)
   where v.plz = left(regexp_replace(coalesce(p_plz, ''), '\D', '', 'g'), 4)
$$;
revoke execute on function public.plz_auskunft(text) from public, anon;
grant execute on function public.plz_auskunft(text) to authenticated;

-- Lead-Nummern L001 … zählt die Datenbank, damit zwei Personen nie dieselbe Nummer bekommen (V233: im Browser).
create sequence public.lead_nummer_seq;
select setval('public.lead_nummer_seq', greatest(1, coalesce(
  (select max(nullif(regexp_replace(nummer, '\D', '', 'g'), '')::int) from public.verkaufschancen), 0)),
  exists (select 1 from public.verkaufschancen));

/**
 * Vor dem Speichern einer Verkaufschance: Nummer vergeben, Standort aus dem alten Text oder der PLZ,
 * Region des Objekts übernehmen. Läuft auch beim Import, darum ohne Annahmen über die Oberfläche.
 */
create or replace function intern.verkaufschance_ergaenzen() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.nummer is null or new.nummer = '' then
    new.nummer := 'L' || lpad(nextval('public.lead_nummer_seq')::text, 3, '0');
  end if;
  if new.standort_id is null then
    select s.id into new.standort_id from public.standorte s
     where lower(s.name) = lower(coalesce(nullif(new.zustaendig, 'Andy'), new.erstkontakt_standort));
  end if;
  if new.standort_id is null and new.objekt_id is not null then
    select s.id into new.standort_id from public.objekte o
      join public.standorte s on s.kuerzel = public.standort_fuer_plz(o.plz)
     where o.id = new.objekt_id;
  end if;
  if new.region_id is null and new.objekt_id is not null then
    select o.region_id into new.region_id from public.objekte o where o.id = new.objekt_id;
  end if;
  return new;
end
$$;
create trigger ergaenzen before insert or update of nummer, standort_id, zustaendig, objekt_id
  on public.verkaufschancen for each row execute function intern.verkaufschance_ergaenzen();
-- Leerer Standard, damit die App ohne Nummer anlegen kann; der Trigger setzt sie vor der NOT-NULL-Prüfung.
alter table public.verkaufschancen alter column nummer set default '';

update public.verkaufschancen set standort_id = null where standort_id is null; -- löst den Trigger für alle aus

/** Die Person der angemeldeten Benutzerin (für «meine» Ansichten und Aktivitäten). */
create or replace function intern.meine_person_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.personen p where p.auth_user_id = auth.uid() and p.geloescht_am is null limit 1
$$;
grant execute on function intern.meine_person_id() to authenticated;

-- Einstellungen für Tagesroute und Tour (V233 st.set und st.ev): Schätzung der Fahrzeit und Elektroauto.
insert into public.einstellungen (schluessel, wert) values ('tourplanung', $j${
  "tempo_kmh": 70, "umweg_faktor": 1.35, "zuschlag_min": 8, "besuch_min": 60, "puffer_min": 10,
  "spaetestens": "17:00", "abfahrt": "08:00",
  "auto": {"aktiv": true, "kwh": 64.7, "verbrauch": 25, "start": 100, "reserve": 15, "ziel": 80, "kw": 90, "zuschlag": 10}
}$j$::jsonb)
on conflict (schluessel) do nothing;

-- Weitere Werte aus V233 als Auswahllisten (Konfiguration statt Code).
insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, eigenschaften) values
  ('quelle', 'messe', 'Messe/Event', 'Salon/événement', 70, '{"vorlage": ["Messe/Event"]}'),
  ('quelle', 'sonstiges', 'Sonstiges', 'Autre', 80, '{"vorlage": ["Sonstiges"]}'),
  ('finanzierung', 'kaufen', 'Kaufen', 'Acheter', 10, '{"vorlage": ["Kaufen"]}'),
  ('finanzierung', 'mieten', 'Mieten', 'Louer', 20, '{"vorlage": ["Mieten"]}'),
  ('finanzierung', 'beides', 'Beides interessant', 'Les deux', 30, '{"vorlage": ["Beides interessant"]}'),
  ('finanzierung', 'offen', 'Noch offen', 'Pas encore décidé', 40, '{"vorlage": ["Noch offen"]}'),
  ('foerderung', 'ja', 'Ja', 'Oui', 10, '{"vorlage": ["Ja"]}'),
  ('foerderung', 'nein', 'Nein', 'Non', 20, '{"vorlage": ["Nein"]}'),
  ('foerderung', 'weiss_nicht', 'Weiss nicht', 'Ne sait pas', 30, '{"vorlage": ["Weiss nicht"]}'),
  ('zeithorizont', 'bis_3', 'bis in 3 Monaten', 'd''ici 3 mois', 10, '{"vorlage": ["bis in 3 Monaten"]}'),
  ('zeithorizont', '4_6', 'in 4–6 Monaten', 'dans 4 à 6 mois', 20, '{"vorlage": ["in 4-6 Monaten"]}'),
  ('zeithorizont', 'ueber_6', 'in mehr als 6 Monaten', 'dans plus de 6 mois', 30, '{"vorlage": ["in mehr als 6 Monaten"]}'),
  ('zeithorizont', 'weiss_nicht', 'Weiss nicht', 'Ne sait pas', 40, '{"vorlage": ["Weiss nicht"]}'),
  ('erreichbarkeit', 'ganztags', 'Ganztags', 'Toute la journée', 10, '{"vorlage": ["Ganztags"]}'),
  ('erreichbarkeit', 'vormittag', 'Vormittag (8–12 Uhr)', 'Matin (8–12 h)', 20, '{"vorlage": ["Vormittag (8-12 Uhr)"], "von": "08:00", "bis": "12:00"}'),
  ('erreichbarkeit', 'mittag', 'Mittag (12–13 Uhr)', 'Midi (12–13 h)', 30, '{"vorlage": ["Mittag (12-13 Uhr)"], "von": "12:00", "bis": "13:00"}'),
  ('erreichbarkeit', 'nachmittag', 'Nachmittag (13–17 Uhr)', 'Après-midi (13–17 h)', 40, '{"vorlage": ["Nachmittag (13-17 Uhr)"], "von": "13:00", "bis": "17:00"}'),
  ('erreichbarkeit', 'abends', 'Abends (17–19 Uhr)', 'Soir (17–19 h)', 50, '{"vorlage": ["Abends (17-19 Uhr)"], "von": "17:00", "bis": "19:00"}'),
  ('interesse', 'pv', 'Photovoltaik', 'Photovoltaïque', 10, '{}'),
  ('interesse', 'batterie', 'Batterie', 'Batterie', 20, '{}'),
  ('interesse', 'wallbox', 'Ladestation', 'Borne de recharge', 30, '{}'),
  ('interesse', 'waermepumpe', 'Wärmepumpe', 'Pompe à chaleur', 40, '{}')
on conflict (liste, schluessel) do nothing;

-- Bereits importierte Texte auf die Schlüssel der neuen Listen umstellen (der Import macht das ab jetzt selbst).
update public.verkaufschancen v set finanzierung = a.schluessel from public.auswahlwerte a
 where a.liste = 'finanzierung' and a.eigenschaften -> 'vorlage' ? v.finanzierung;
update public.verkaufschancen v set foerderung = a.schluessel from public.auswahlwerte a
 where a.liste = 'foerderung' and a.eigenschaften -> 'vorlage' ? v.foerderung;
update public.verkaufschancen v set zeithorizont = a.schluessel from public.auswahlwerte a
 where a.liste = 'zeithorizont' and a.eigenschaften -> 'vorlage' ? v.zeithorizont;
update public.verkaufschancen v set erreichbarkeit = a.schluessel from public.auswahlwerte a
 where a.liste = 'erreichbarkeit' and a.eigenschaften -> 'vorlage' ? v.erreichbarkeit;

/** Wer einen Kundentermin bekommt, gehört zum Aussendienst (auch nach einem Import der Vorlage). */
create or replace function intern.markiere_aussendienst() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.tour_person_id is not null then
    update public.personen set aussendienst = true where id = new.tour_person_id and not aussendienst;
  end if;
  return null;
end
$$;
create trigger aussendienst after insert or update of tour_person_id
  on public.verkaufschancen for each row execute function intern.markiere_aussendienst();
