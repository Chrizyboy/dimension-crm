-- Grossprojekte: nur noch, was für Kunde, Youdera und uns wirklich passt (Chris, 19.11.2026, Entscheid 0029,
-- Nachtrag «Youdera-Prüfung und Verkaufsblatt»).
-- «Er muss nur Projekte bringen, die wirklich interessant sind, für den Kunden, Youdera und für uns», «ich möchte bei
-- jedem Projekt wissen, warum und wie es angegangen werden soll» und «es muss für mich sehr einfach sein, diesen Leuten
-- das zu verkaufen».
-- 1. Bestehende PV: Die Dachsuche gleicht jedes Dach mit dem Register der Elektrizitätsproduktionsanlagen des Bundes
--    ab (pv_bestand_kw). Wo schon eine grosse Anlage steht, gibt es nichts zu verkaufen.
-- 2. Youdera-Prüfung (intern.gp_eignung): Youdera kauft Strom-Contracting (PPA) von 30 kWp bis 4 MWp, der Abnehmer muss
--    Eigentümer des Gebäudes sein und mindestens 70 % des Stroms selbst brauchen. Die Anlage wird darum auf den Verbrauch
--    ausgelegt (nicht aufs ganze Dach), Verbrauch aus Grundfläche × Geschosse × kWh/m² je Nutzung, bis echte Zahlen
--    (Stromrechnung) im Rechner stehen. Daraus: Weg (PPA, ZEV, Dachmiete), Ersparnis des Kunden, Bauvolumen, Marge und
--    Wartung für uns, und eine Ampel mit drei Seiten (Kunde, Youdera, wir).
-- 3. Bauherrschaft neu gewichtet: Firmen, Landwirte und Gemeinden, die ihr Gebäude selbst nutzen, zuerst;
--    Pensionskassen und Immobilienfirmen vermieten meist und taugen nur für ZEV oder Dachmiete.
-- Alle Werte in einstellungen.grossprojekte.eignung (Regel 8, nur Administration).

alter table public.grossprojekte
  add column pv_bestand_kw numeric check (pv_bestand_kw >= 0),     -- schon gebaute PV laut Bundesregister (0 = keine)
  add column pv_geprueft_am timestamptz,                           -- wann das Register abgefragt wurde (leer = nie)
  add column grundflaeche_m2 int check (grundflaeche_m2 >= 0),     -- Gebäudefläche laut Gebäuderegister (garea)
  add column geschosse int check (geschosse between 0 and 200),    -- Geschosse laut Gebäuderegister (gastw)
  add column egrid text,                                           -- Grundstück-ID fürs Grundbuch
  add column eignung jsonb not null default '{}' check (jsonb_typeof(eignung) = 'object');
comment on column public.grossprojekte.eignung is
  'Youdera-Prüfung (setzt der Trigger): weg, ampel, kwp_empfohlen, verbrauch_kwh, eigenverbrauch_prozent, '
  'ersparnis_chf, investition_chf, marge_chf, wartung_chf, pruefungen {kunde, youdera, wir}: [{code, stand, wert}].';

-- ---------- Einstellungen ----------

update public.einstellungen set wert = jsonb_build_object(
  'eignung', $json${
    "kwp_min": 30,
    "kwp_max": 4000,
    "eigenverbrauch_min_prozent": 70,
    "dachmiete_ab_kwp": 300,
    "zev_ab_wohnungen": 6,
    "pv_bestand_max_anteil": 0.3,
    "strompreis_rp_kwh": 24,
    "fahrzeit_gut_min": 45,
    "dach_pruefen_ab_jahre": 30,
    "verbrauch_kwh_m2": {"industrie": 120, "kuehlung": 250, "gewerbe": 80, "spital": 250, "heim": 100,
                         "schule": 40, "sport": 60, "verwaltung": 90, "ueberbauung": 35, "mfh": 35,
                         "landwirtschaft": 40, "andere": 60},
    "anteil_ertrag": {"industrie": 0.6, "kuehlung": 0.7, "gewerbe": 0.5, "spital": 0.6, "heim": 0.5,
                      "schule": 0.35, "sport": 0.4, "verwaltung": 0.45, "ueberbauung": 0.4, "mfh": 0.4,
                      "landwirtschaft": 0.5, "andere": 0.4},
    "eigentum": {"gewerbe": "nutzt", "landwirtschaft": "nutzt", "gemeinde": "nutzt", "kanton": "nutzt",
                 "kirche": "nutzt", "genossenschaft": "zev", "pensionskasse": "vermietet", "immobilien": "vermietet",
                 "privat": "offen", "unbekannt": "offen"},
    "punkte": {"gruen": 10, "gelb": 0, "rot": -15}
  }$json$::jsonb,
  'grundbuch', $json${
    "FR": {"url": "https://www.fr.ch/territoire-amenagement-et-constructions/registre-foncier/consultation-en-ligne-du-registre-foncier",
           "de": "RFpublic: Adresse oder Parzelle eingeben, Eigentümer sofort sichtbar.",
           "fr": "RFpublic : saisir l’adresse ou la parcelle, propriétaire visible tout de suite."},
    "VD": {"url": "https://www.vd.ch/prestation/demander-des-renseignements-sur-les-donnees-publiques-du-registre-foncier",
           "de": "Intercapi public: Anmeldung per SMS, 5 Abfragen pro Tag.",
           "fr": "Intercapi public : connexion par SMS, 5 consultations par jour."},
    "ZG": {"url": "https://zg.ch/de/planen-bauen/grundbuch/eigentuemerauskunft",
           "de": "ZugMap: Eigentümerabfrage nach Registrierung mit Handy-Nummer.",
           "fr": "ZugMap : propriétaire après inscription avec numéro de mobile."},
    "ZH": {"url": "https://www.zh.ch/de/planen-bauen/geoinformation/kataster/grundbuch.html",
           "de": "GIS-Browser mit Captcha, wenige Abfragen pro Tag; sonst Notariat anrufen.",
           "fr": "GIS-Browser avec captcha, peu de consultations par jour ; sinon appeler le notariat."},
    "LU": {"url": "https://grundbuch.lu.ch",
           "de": "Eigentümerabfrage im Grundbuchplan nach einmaliger Registrierung.",
           "fr": "Consultation du propriétaire après inscription unique."},
    "BE": {"url": "https://www.topo.apps.be.ch/pub/map/?lang=de&datatheme=GRUDIS_FK",
           "de": "GRUDIS public im Geoportal (Captcha).",
           "fr": "GRUDIS public sur le géoportail (captcha)."},
    "SO": {"url": "https://so.ch/services/grundbuch-eigentuemerauskunft-anfragen-bestellen/",
           "de": "Online in der Karte das Grundstück anklicken.",
           "fr": "En ligne : cliquer sur la parcelle dans la carte."},
    "VS": {"url": "https://www.vs.ch/de/web/srf/consultation-en-ligne-du-registre-foncier1",
           "de": "Öffentlicher Zugang, 10 Abfragen pro Tag.",
           "fr": "Accès public, 10 consultations par jour."},
    "AG": {"url": "https://www.ag.ch/de/themen/planen-bauen/grundbuch-vermessung/grundbuch/das-grundbuch",
           "de": "Keine Online-Abfrage: Grundbuchamt anrufen oder anschreiben, Parzelle und EGRID angeben.",
           "fr": "Pas de consultation en ligne : appeler ou écrire au registre foncier avec parcelle et EGRID."}
  }$json$::jsonb) || wert
 where schluessel = 'grossprojekte';

-- Bauherrschaft neu gewichtet (bewusste Änderung, nicht nur ergänzt): Youdera braucht den Eigentümer als Abnehmer.
update public.einstellungen
   set wert = jsonb_set(wert, '{punkte,bauherr}', $json${
     "gewerbe": 15, "landwirtschaft": 13, "gemeinde": 13, "kanton": 12, "kirche": 10, "genossenschaft": 10,
     "unbekannt": 7, "privat": 5, "pensionskasse": 5, "immobilien": 5}$json$::jsonb)
 where schluessel = 'grossprojekte';

-- ---------- Youdera-Prüfung ----------

/** Ein Prüfpunkt der Ampel: code, stand (ok, offen, nein) und der Wert dahinter. */
create or replace function intern.gp_pruefpunkt(p_code text, p_stand text, p_wert jsonb default null) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('code', p_code, 'stand', p_stand) || case when p_wert is null then '{}' else jsonb_build_object('wert', p_wert) end
$$;

/**
 * Passt das Grossprojekt für Kunde, Youdera und uns? Rechnet aus Gebäude, Schätzung und eigenen Werten (Rechner):
 * Verbrauch (Stromrechnung vor Schätzung aus Fläche × Geschosse × kWh/m²), Anlage passend zum Verbrauch (damit der
 * Eigenverbrauch die Schwelle von Youdera erreicht), Weg (ppa, zev, dachmiete, keiner), Ersparnis des Kunden, Bauvolumen,
 * Marge und Wartung für uns, Prüfpunkte je Seite und Ampel. «ausschluss» nur, wenn klar nichts zu holen ist.
 */
create or replace function intern.gp_eignung(g public.grossprojekte) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  c jsonb := intern.gp_cfg();
  e jsonb := coalesce(c -> 'eignung', '{}');
  an jsonb := c -> 'annahmen';
  s jsonb := coalesce(g.schaetzung, '{}');
  r jsonb := coalesce(g.rechnung, '{}');
  nutzung text := coalesce(g.nutzung, 'andere');
  kwp_dach numeric := nullif((s ->> 'kwp')::numeric, 0);
  kwh_kwp numeric;
  verbrauch numeric;
  v_quelle text;
  flaeche numeric;
  anteil numeric := coalesce((e -> 'anteil_ertrag' ->> nutzung)::numeric, 0.4);
  kwp numeric;
  ertrag numeric;
  ev numeric;               -- Eigenverbrauch als Anteil 0..1
  ev_min numeric := coalesce((e ->> 'eigenverbrauch_min_prozent')::numeric, 70) / 100;
  kwp_min numeric := coalesce((e ->> 'kwp_min')::numeric, 30);
  kwp_max numeric := coalesce((e ->> 'kwp_max')::numeric, 4000);
  dachmiete_ab numeric := coalesce((e ->> 'dachmiete_ab_kwp')::numeric, 300);
  eigentum text;
  -- Vorschlag der Recherche zählt nur, wenn die KI sich sicher ist (Quelle gefunden); sonst bleibt es offen.
  nutzt_selbst text := case when g.recherche #>> '{eigentuemer,sicherheit}' = 'hoch'
                            then g.recherche ->> 'eigentuemer_nutzt_selbst' end;
  weg text;
  strompreis numeric := coalesce((r ->> 'strompreis_rp')::numeric, (e ->> 'strompreis_rp_kwh')::numeric, 24);
  preis numeric := coalesce((r ->> 'preis_rp')::numeric, (s ->> 'preis_rp_kwh')::numeric);
  inv numeric;
  ersparnis numeric;
  bonitaet text := g.recherche ->> 'bonitaet';
  kunde jsonb := '[]';
  youdera jsonb := '[]';
  wir jsonb := '[]';
  alle jsonb;
  ampel text;
  ausschluss text;
  alter_jahre int := case when g.baujahr is not null then extract(year from current_date)::int - g.baujahr end;
begin
  if kwp_dach is null then return '{}'; end if;
  kwh_kwp := coalesce(nullif((s ->> 'ertrag_kwh')::numeric, 0) / kwp_dach, (an ->> 'kwh_pro_kwp')::numeric, 950);

  -- Verbrauch: echte Zahl aus dem Rechner zuerst, sonst Fläche × Geschosse × kWh/m² je Nutzung. Ohne Grundfläche
  -- dient die Dachfläche als Fläche (geeignetes Dach ist meist rund 60 % der Grundfläche).
  if (r ->> 'verbrauch_kwh') is not null then
    verbrauch := (r ->> 'verbrauch_kwh')::numeric;
    v_quelle := 'rechnung';
  else
    flaeche := coalesce(g.grundflaeche_m2::numeric, g.dachflaeche_m2 / 0.6) * greatest(coalesce(g.geschosse, 1), 1);
    verbrauch := flaeche * coalesce((e -> 'verbrauch_kwh_m2' ->> nutzung)::numeric, 60)
               + coalesce(g.wohnungen, 0) * 3500 * case when nutzung in ('mfh', 'ueberbauung') then 0 else 1 end;
    v_quelle := 'schaetzung';
  end if;

  -- Eigentum: sichere Antwort der Recherche (nutzt selbst ja/nein) vor der Art der Bauherrschaft.
  eigentum := case
    when nutzt_selbst = 'true' then 'nutzt'
    when nutzt_selbst = 'false' then 'vermietet'
    else coalesce(e -> 'eigentum' ->> coalesce(g.bauherr_art, 'unbekannt'), 'offen') end;
  if nutzung in ('mfh', 'ueberbauung') and coalesce(g.wohnungen, 0) >= coalesce((e ->> 'zev_ab_wohnungen')::int, 6) then
    eigentum := 'zev';
  end if;

  -- Anlage auf den Verbrauch auslegen: Ertrag höchstens «anteil_ertrag» des Verbrauchs, dann erreicht der
  -- Eigenverbrauch etwa die Schwelle. Eigenverbrauch einfach geschätzt: ev = Schwelle × anteil × Verbrauch / Ertrag.
  kwp := least(kwp_dach, kwp_max, greatest(anteil * verbrauch / kwh_kwp, 0));
  weg := case
    when eigentum = 'vermietet' then case when kwp_dach >= dachmiete_ab then 'dachmiete' else 'keiner' end
    when kwp >= kwp_min then case when eigentum = 'zev' then 'zev' else 'ppa' end
    when kwp_dach >= dachmiete_ab then 'dachmiete'
    else 'keiner' end;
  if weg = 'dachmiete' then kwp := least(kwp_dach, kwp_max); end if;
  kwp := round(kwp);
  ertrag := kwp * kwh_kwp;
  ev := case when weg = 'dachmiete' or ertrag = 0 then 0
             else least(0.95, ev_min * anteil * verbrauch / ertrag) end;

  inv := kwp * coalesce(intern.gp_staffel(an -> 'chf_pro_kwp', kwp, 'chf'), 1200);
  -- Ersparnis des Kunden: eigener Solarstrom zum Contracting-Preis statt zum Netzpreis (bei Dachmiete die Miete
  -- kennen wir nicht, darum keine Zahl).
  ersparnis := case when weg in ('ppa', 'zev') and preis is not null then ertrag * ev * (strompreis - preis) / 100 end;

  -- Kunde: spart er, und hält das Dach 25 Jahre?
  kunde := kunde || intern.gp_pruefpunkt('ersparnis',
    case when ersparnis is null then 'offen' when ersparnis > 0 then 'ok' else 'nein' end,
    to_jsonb(round(coalesce(ersparnis, 0), -2)));
  kunde := kunde || intern.gp_pruefpunkt('dach',
    case when alter_jahre is null then 'offen'
         when alter_jahre >= coalesce((e ->> 'dach_pruefen_ab_jahre')::int, 30) then 'offen' else 'ok' end,
    to_jsonb(g.baujahr));

  -- Youdera: Grösse, Eigenverbrauch, Eigentümer = Abnehmer, Bonität.
  youdera := youdera || intern.gp_pruefpunkt('groesse',
    case when kwp between kwp_min and kwp_max then 'ok' else 'nein' end, to_jsonb(kwp));
  youdera := youdera || intern.gp_pruefpunkt('eigenverbrauch',
    case when weg = 'dachmiete' then 'offen' when weg = 'keiner' then 'nein'
         when ev >= ev_min - 0.01 then 'ok' else 'nein' end,
    to_jsonb(round(ev * 100)));
  youdera := youdera || intern.gp_pruefpunkt('eigentuemer',
    case eigentum when 'nutzt' then 'ok' when 'zev' then 'ok'
                  when 'vermietet' then case when weg = 'dachmiete' then 'offen' else 'nein' end else 'offen' end,
    to_jsonb(eigentum));
  youdera := youdera || intern.gp_pruefpunkt('bonitaet',
    case when bonitaet = 'auffaellig' then 'nein' else 'offen' end, to_jsonb(coalesce(bonitaet, 'unbekannt')));

  -- Wir: Dach noch frei, nahe genug, Auftrag gross genug.
  wir := wir || intern.gp_pruefpunkt('pv_bestand',
    case when g.pv_bestand_kw is null then 'offen'
         when g.pv_bestand_kw = 0 then 'ok'
         when g.pv_bestand_kw < kwp_dach * coalesce((e ->> 'pv_bestand_max_anteil')::numeric, 0.3) then 'offen'
         else 'nein' end,
    to_jsonb(g.pv_bestand_kw));
  wir := wir || intern.gp_pruefpunkt('distanz',
    case when g.fahrzeit_min is null then 'offen'
         when g.fahrzeit_min <= coalesce((e ->> 'fahrzeit_gut_min')::int, 45) then 'ok' else 'offen' end,
    to_jsonb(g.fahrzeit_min));
  wir := wir || intern.gp_pruefpunkt('auftrag', case when weg = 'keiner' then 'nein' else 'ok' end,
    to_jsonb(round(inv, -3)));

  -- Ampel: rot bei einem «nein»; grün, wenn Grösse, Eigenverbrauch, Ersparnis und PV-Bestand stimmen
  -- (Eigentum und Bonität klärt man immer erst im Gespräch); sonst gelb.
  alle := kunde || youdera || wir;
  ampel := case
    when exists (select 1 from jsonb_array_elements(alle) x where x ->> 'stand' = 'nein') then 'rot'
    when not exists (select 1 from jsonb_array_elements(alle) x
                      where x ->> 'code' in ('groesse', 'eigenverbrauch', 'ersparnis', 'pv_bestand')
                        and x ->> 'stand' <> 'ok') then 'gruen'
    else 'gelb' end;

  -- Ausschluss nur, wenn klar nichts zu holen ist: Dach schon belegt oder weder PPA, ZEV noch Dachmiete möglich.
  ausschluss := case
    when exists (select 1 from jsonb_array_elements(wir) x where x ->> 'code' = 'pv_bestand' and x ->> 'stand' = 'nein')
      then 'pv_vorhanden'
    when weg = 'keiner' then 'kein_weg' end;

  return jsonb_build_object(
    'weg', weg, 'ampel', ampel, 'ausschluss', ausschluss,
    'punkte', coalesce((e -> 'punkte' ->> ampel)::int, 0),
    'kwp_empfohlen', kwp, 'kwp_dach', kwp_dach, 'ertrag_kwh', round(ertrag),
    'verbrauch_kwh', round(verbrauch, -3), 'verbrauch_quelle', v_quelle,
    'eigenverbrauch_prozent', round(ev * 100), 'strompreis_rp', strompreis, 'preis_rp', preis,
    'ersparnis_chf', round(coalesce(ersparnis, 0), -2),
    'investition_chf', round(inv, -3),
    'marge_chf', round(inv * coalesce((an ->> 'marge_prozent')::numeric, 20) / 100, -2),
    'wartung_chf', round(inv * coalesce((an ->> 'betrieb_prozent')::numeric, 1.5) / 100, -2),
    'pruefungen', jsonb_build_object('kunde', kunde, 'youdera', youdera, 'wir', wir));
end
$$;

/**
 * Bewertet ein Grossprojekt wie beim Speichern (Trigger und Dachsuche): Kanton, Standort, Sprache und Fahrzeit aus der
 * PLZ (wenn neu), Punkte und Schätzung (intern.gp_bewerten), dazu die Youdera-Prüfung. Die Ampel gibt Punkte dazu oder
 * weg; ist klar nichts zu holen (Dach belegt, kein Weg), ist das Grossprojekt ausgeschlossen.
 */
create or replace function intern.gp_vorbereitet(g public.grossprojekte, p_lage boolean) returns public.grossprojekte
language plpgsql stable security definer set search_path = '' as $$
declare
  b record;
  n int;
begin
  g.plz := nullif(substring(coalesce(g.plz, '') from '\d{4}'), '');
  if g.plz is not null and p_lage then
    g.kanton := coalesce((select v.kanton from public.plz_verzeichnis v where v.plz = g.plz limit 1), g.kanton);
    g.standort_id := (select s.id from public.standorte s where s.kuerzel = public.standort_fuer_plz(g.plz));
    g.sprache := coalesce((select s.sprache from public.standorte s where s.id = g.standort_id), g.sprache, 'de');
    select min(intern.fahrzeit_min(s.plz, g.plz)) into g.fahrzeit_min from public.standorte s where s.geloescht_am is null;
  end if;
  select * into b from intern.gp_bewerten(g);
  g.punkte := b.punkte;
  g.punkte_details := b.details;
  g.art := b.art;
  g.ausschluss := b.ausschluss;
  g.schaetzung := b.schaetzung;
  g.eignung := coalesce(intern.gp_eignung(g), '{}');
  -- Wärme-Contracting bleibt möglich, auch wenn PV nicht passt: dann kein Ausschluss, nur weniger Punkte.
  if g.ausschluss is null and g.eignung ->> 'ausschluss' is not null and g.art = 'pv' then
    g.ausschluss := g.eignung ->> 'ausschluss';
    g.punkte := 0;
  elsif g.ausschluss is null and g.eignung ? 'ampel' then
    n := coalesce((g.eignung ->> 'punkte')::int, 0);
    g.punkte_details := g.punkte_details || jsonb_build_object('was', 'youdera', 'punkte', n, 'wert', g.eignung ->> 'ampel');
    g.punkte := least(100, greatest(0, g.punkte + n));
  end if;
  return g;
end
$$;

-- ---------- Dachsuche und Anreicherung mit den neuen Feldern ----------

/**
 * Ein Gebäude aus der Dachsuche aufnehmen (wie bisher, dazu PV-Bestand, Grundfläche, Geschosse, EGRID). Gibt die id
 * zurück oder null, wenn es schon bekannt ist, zu wenig Punkte hat oder ausgeschlossen ist (auch: Dach schon belegt).
 */
create or replace function public.grossprojekt_aus_suche(p jsonb, p_meldung text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  g public.grossprojekte;
  v_id uuid;
  v_ab int := coalesce((intern.gp_cfg() #>> '{suche,ab_punkte}')::int, (intern.gp_cfg() ->> 'melden_ab')::int, 50);
  v_e numeric := nullif(p ->> 'lage_e', '')::numeric;
  v_n numeric := nullif(p ->> 'lage_n', '')::numeric;
begin
  if nullif(p ->> 'egid', '') is null then return null; end if;
  if exists (select 1 from public.grossprojekte x where x.egid = p ->> 'egid'
                or (x.quelle = 'suche' and x.quell_id = 'egid:' || (p ->> 'egid'))
                or (v_e is not null and abs(x.lage_e - v_e) < 30 and abs(x.lage_n - v_n) < 30)) then
    return null;
  end if;
  g := jsonb_populate_record(null::public.grossprojekte, p - 'id' - 'nummer' - 'stand' - 'punkte' - 'eignung');
  g.quelle := 'suche';
  g.quell_id := 'egid:' || (p ->> 'egid');
  g.bauherr_art := coalesce(g.bauherr_art, 'unbekannt');
  g := intern.gp_vorbereitet(g, true);
  if g.ausschluss is not null or g.punkte < v_ab then return null; end if;

  perform set_config('gp.ablauf', 'ja', true);
  insert into public.grossprojekte (titel, beschreibung, quelle, quell_id, quell_url, strasse, plz, gemeinde, parzelle,
    lage_e, lage_n, bauherr_art, nutzung, dachflaeche_m2, dach_klasse, stromertrag_kwh, heizung, heizung_jahr,
    wohnungen, baujahr, egid, angereichert_am, anreicherung, pv_bestand_kw, pv_geprueft_am, grundflaeche_m2,
    geschosse, egrid)
  values (
    left(concat_ws(', ', case g.sprache when 'fr' then
        case g.nutzung when 'industrie' then 'Bâtiment industriel' when 'gewerbe' then 'Bâtiment commercial'
          when 'verwaltung' then 'Bâtiment administratif' when 'schule' then 'École' when 'spital' then 'Hôpital'
          when 'heim' then 'EMS' when 'sport' then 'Salle de sport' else 'Grand bâtiment' end
      else
        case g.nutzung when 'industrie' then 'Industriegebäude' when 'gewerbe' then 'Gewerbegebäude'
          when 'verwaltung' then 'Bürogebäude' when 'schule' then 'Schulhaus' when 'spital' then 'Spital'
          when 'heim' then 'Heim' when 'sport' then 'Sporthalle' else 'Grosses Gebäude' end
      end, coalesce(g.strasse, g.gemeinde)), 500),
    case g.sprache when 'fr' then 'Trouvé par la recherche de toits. Propriétaire à vérifier au registre foncier.'
      else 'Von der Dachsuche gefunden. Eigentümer im Grundbuch nachschlagen.' end,
    'suche', g.quell_id, coalesce(nullif(p ->> 'quell_url', ''), 'Gebäuderegister EGID ' || g.egid),
    g.strasse, g.plz, g.gemeinde, g.parzelle, g.lage_e, g.lage_n, g.bauherr_art, g.nutzung, g.dachflaeche_m2,
    g.dach_klasse, g.stromertrag_kwh, g.heizung, g.heizung_jahr, g.wohnungen, g.baujahr, g.egid, now(),
    left(coalesce(p_meldung, 'Dachsuche'), 300), g.pv_bestand_kw,
    case when g.pv_bestand_kw is not null then now() end, g.grundflaeche_m2, g.geschosse, g.egrid)
  returning id into v_id;
  perform set_config('gp.ablauf', '', true);
  perform intern.gp_vermerk(v_id, 'Gefunden: Dachsuche', jsonb_build_object('meldung', p_meldung));
  return v_id;
end
$$;
revoke execute on function public.grossprojekt_aus_suche(jsonb, text) from public, anon, authenticated;
grant execute on function public.grossprojekt_aus_suche(jsonb, text) to service_role;

/** Gebäudedaten speichern (wie bisher; dazu Grundfläche, Geschosse, EGRID und PV-Bestand). Eigenes bleibt stehen. */
create or replace function public.grossprojekt_anreichern(p_id uuid, p jsonb, p_meldung text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.grossprojekte g set
    lage_e = coalesce(nullif(p ->> 'lage_e', '')::numeric, g.lage_e),
    lage_n = coalesce(nullif(p ->> 'lage_n', '')::numeric, g.lage_n),
    strasse = coalesce(g.strasse, nullif(p ->> 'strasse', '')),
    plz = coalesce(g.plz, nullif(p ->> 'plz', '')),
    gemeinde = coalesce(g.gemeinde, nullif(p ->> 'gemeinde', '')),
    dachflaeche_m2 = coalesce(g.dachflaeche_m2, nullif(p ->> 'dachflaeche_m2', '')::int),
    dach_klasse = coalesce(nullif(p ->> 'dach_klasse', '')::int, g.dach_klasse),
    stromertrag_kwh = coalesce(nullif(p ->> 'stromertrag_kwh', '')::int, g.stromertrag_kwh),
    heizung = coalesce(g.heizung, nullif(p ->> 'heizung', '')),
    heizung_jahr = coalesce(g.heizung_jahr, nullif(p ->> 'heizung_jahr', '')::int),
    wohnungen = coalesce(g.wohnungen, nullif(p ->> 'wohnungen', '')::int),
    baujahr = coalesce(g.baujahr, nullif(p ->> 'baujahr', '')::int),
    egid = coalesce(nullif(p ->> 'egid', ''), g.egid),
    nutzung = coalesce(g.nutzung, nullif(p ->> 'nutzung', '')),
    grundflaeche_m2 = coalesce(g.grundflaeche_m2, nullif(p ->> 'grundflaeche_m2', '')::int),
    geschosse = coalesce(g.geschosse, nullif(p ->> 'geschosse', '')::int),
    egrid = coalesce(g.egrid, nullif(p ->> 'egrid', '')),
    pv_bestand_kw = case when p ? 'pv_bestand_kw' then nullif(p ->> 'pv_bestand_kw', '')::numeric else g.pv_bestand_kw end,
    pv_geprueft_am = case when p ? 'pv_bestand_kw' then now() else g.pv_geprueft_am end,
    angereichert_am = now(),
    anreicherung = left(p_meldung, 300)
   where g.id = p_id;
  perform intern.gp_vermerk(p_id, 'Gebäudedaten: ' || left(p_meldung, 300), coalesce(p, '{}'));
end
$$;
revoke execute on function public.grossprojekt_anreichern(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.grossprojekt_anreichern(uuid, jsonb, text) to service_role;

/** Für den Zeitplan: PV-Bestand und Gebäudefläche nachtragen (Grossprojekte von vor dieser Prüfung). */
create or replace function public.grossprojekt_pv_offen(p_limit int default 20) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'lage_e', lage_e, 'lage_n', lage_n, 'egid', egid,
           'grundflaeche_m2', grundflaeche_m2)), '[]')
    from (select id, lage_e, lage_n, egid, grundflaeche_m2 from public.grossprojekte
           where pv_geprueft_am is null and lage_e is not null and geloescht_am is null
             and stand in ('pruefen', 'beobachten', 'bewilligt')
           order by punkte desc, erstellt_am limit greatest(p_limit, 0)) x
$$;

/** Für den Zeitplan: PV-Bestand (und was das Register sonst noch hergibt) eintragen; danach neu bewertet. */
create or replace function public.grossprojekt_pv_setzen(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_vorher text;
  v_nachher text;
begin
  select ausschluss into v_vorher from public.grossprojekte where id = p_id;
  update public.grossprojekte g set
    pv_bestand_kw = coalesce(nullif(p ->> 'pv_bestand_kw', '')::numeric, 0),
    pv_geprueft_am = now(),
    grundflaeche_m2 = coalesce(g.grundflaeche_m2, nullif(p ->> 'grundflaeche_m2', '')::int),
    geschosse = coalesce(g.geschosse, nullif(p ->> 'geschosse', '')::int),
    egrid = coalesce(g.egrid, nullif(p ->> 'egrid', ''))
   where g.id = p_id
  returning ausschluss into v_nachher;
  if coalesce(nullif(p ->> 'pv_bestand_kw', '')::numeric, 0) > 0 then
    perform intern.gp_vermerk(p_id, 'Bestehende PV laut Bundesregister: ' || (p ->> 'pv_bestand_kw') || ' kW'
      || case when v_nachher = 'pv_vorhanden' and v_vorher is distinct from v_nachher then ' (Dach schon belegt)' else '' end);
  end if;
end
$$;
revoke execute on function public.grossprojekt_pv_offen(int) from public, anon, authenticated;
revoke execute on function public.grossprojekt_pv_setzen(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.grossprojekt_pv_offen(int) to service_role;
grant execute on function public.grossprojekt_pv_setzen(uuid, jsonb) to service_role;

-- ---------- Recherche: Zahlen fürs Verkaufsblatt mitgeben ----------

/** Für den Zeitplan: nächste Grossprojekte für die Recherche (wie bisher, dazu die Youdera-Prüfung und Fläche). */
create or replace function public.grossprojekt_recherche_offen(p_limit int default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[];
begin
  -- Hängengebliebene (Abbruch des Zeitplans) nach einer Stunde wieder freigeben.
  update public.grossprojekte set recherche_stand = 'wartet'
   where recherche_stand = 'laeuft' and coalesce(recherche_am, erstellt_am) < now() - interval '1 hour';
  select coalesce(array_agg(id), '{}') into v_ids from (
    select id from public.grossprojekte
     where recherche_stand = 'wartet' and geloescht_am is null and stand in ('pruefen', 'beobachten')
     order by punkte desc, erstellt_am limit greatest(p_limit, 0)) x;
  update public.grossprojekte set recherche_stand = 'laeuft', recherche_am = now() where id = any (v_ids);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id, 'titel', g.titel, 'sprache', g.sprache, 'strasse', g.strasse, 'plz', g.plz,
      'gemeinde', g.gemeinde, 'kanton', g.kanton, 'parzelle', g.parzelle, 'egid', g.egid, 'nutzung', g.nutzung,
      'bauherr', g.bauherr, 'bauherr_art', g.bauherr_art, 'beschreibung', g.beschreibung, 'quelle', g.quelle,
      'quell_url', g.quell_url, 'dachflaeche_m2', g.dachflaeche_m2, 'heizung', g.heizung,
      'heizung_jahr', g.heizung_jahr, 'baujahr', g.baujahr, 'wohnungen', g.wohnungen, 'art', g.art,
      'schaetzung', g.schaetzung, 'standort', s.name, 'grundflaeche_m2', g.grundflaeche_m2,
      'pv_bestand_kw', g.pv_bestand_kw, 'eignung', g.eignung - 'pruefungen'))
      from public.grossprojekte g left join public.standorte s on s.id = g.standort_id
     where g.id = any (v_ids)), '[]');
end
$$;
revoke execute on function public.grossprojekt_recherche_offen(int) from public, anon, authenticated;
grant execute on function public.grossprojekt_recherche_offen(int) to service_role;

-- Alle offenen und bewilligten neu bewerten (Trigger «vorbereiten» rechnet die Youdera-Prüfung).
update public.grossprojekte set titel = titel where geloescht_am is null and stand in ('pruefen', 'beobachten', 'bewilligt');
