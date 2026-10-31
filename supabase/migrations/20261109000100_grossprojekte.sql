-- Phase 8c, Teil 1: Grossprojekt-Monitor für Energie-Contracting (Wunsch Chris 30.10.2026, Entscheid 0029).
-- Ein Grossprojekt ist ein Gebäude oder Bauvorhaben, bei dem sich PV- oder Wärme-Contracting lohnen kann:
-- grosses Dach, viel Eigenverbrauch, alte fossile Heizung, Bauherrschaft ohne eigenes Kapital. Die Datenbank
-- bewertet jeden Treffer mit 0 bis 100 Punkten und schätzt Grösse, Investition und Contracting-Preis.
-- Alles bleibt im CRM (keine Mail, Chris 30.10.2026): Liste, Karte auf «Mein Tag» und Glocke.
-- Schwellen, Punkte und Annahmen liegen als Daten in «einstellungen.grossprojekte» (Regel 8), nicht im Code.

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe, eigenschaften)
values ('quelle', 'grossprojekt', 'Grossprojekt-Monitor', 'Moniteur grands projets', 85, 'info', '{}')
on conflict do nothing;

-- ---------- Grossprojekte ----------

create sequence public.grossprojekt_nummer_seq;

create table public.grossprojekte (
  id                  uuid primary key default gen_random_uuid(),
  nummer              text unique,
  titel               text not null,
  beschreibung        text,
  -- Herkunft: Quelle des Monitors (simap, amtsblatt) oder von Hand; jede Angabe braucht einen Fundort.
  quelle              text not null default 'hand',
  quell_id            text,
  quell_url           text not null,
  ausschreibung_id    uuid references public.ausschreibungen (id),
  -- Lage
  strasse             text,
  plz                 text,
  gemeinde            text,
  kanton              text,
  parzelle            text,
  standort_id         uuid references public.standorte (id),
  sprache             text not null default 'de' check (sprache in ('de', 'fr')),
  fahrzeit_min        int,
  lage_e              numeric,           -- Koordinaten LV95 (aus der Adresssuche des Bundes)
  lage_n              numeric,
  -- Bauherrschaft und Gebäude
  bauherr             text,
  bauherr_art         text check (bauherr_art in (
    'gemeinde', 'kanton', 'genossenschaft', 'pensionskasse', 'immobilien', 'gewerbe', 'landwirtschaft', 'kirche',
    'privat', 'unbekannt')),
  nutzung             text check (nutzung in (
    'industrie', 'gewerbe', 'kuehlung', 'spital', 'heim', 'schule', 'sport', 'verwaltung', 'ueberbauung', 'mfh',
    'landwirtschaft', 'efh', 'andere')),
  geschuetzt          boolean not null default false,
  heizungsersatz      boolean not null default false,
  dachflaeche_m2      int check (dachflaeche_m2 >= 0),       -- gut geeignete Dachfläche (sonnendach.ch Klasse 3–5)
  dach_klasse         int check (dach_klasse between 1 and 5),
  stromertrag_kwh     int check (stromertrag_kwh >= 0),      -- möglicher Jahresertrag laut sonnendach.ch
  heizung             text check (heizung in ('oel', 'gas', 'elektro', 'holz', 'waermepumpe', 'fernwaerme', 'unbekannt')),
  heizung_jahr        int check (heizung_jahr between 1900 and 2100),
  waermeleistung_kw   int check (waermeleistung_kw >= 0),
  wohnungen           int check (wohnungen >= 0),
  baujahr             int check (baujahr between 1000 and 2100),
  egid                text,
  angereichert_am     timestamptz,
  anreicherung        text,              -- was die Abfrage beim Bund ergab (gefunden, nicht gefunden, Fehler)
  -- Bewertung (setzt der Trigger)
  punkte              int not null default 0,
  punkte_details      jsonb not null default '[]',
  art                 text check (art in ('pv', 'waerme', 'beides')),
  ausschluss          text,
  schaetzung          jsonb not null default '{}',
  -- Ablauf (nur über grossprojekt_entscheiden)
  stand               text not null default 'pruefen' check (stand in ('pruefen', 'beobachten', 'bewilligt', 'verworfen')),
  wiedervorlage_am    date,
  grund               text,
  entschieden_von     uuid references public.personen (id),
  entschieden_am      timestamptz,
  verkaufschance_id   uuid references public.verkaufschancen (id),
  gemeldet_am         timestamptz,
  notiz               text
);
select intern.richte_fachtabelle_ein('grossprojekte');
create unique index grossprojekte_quelle_idx on public.grossprojekte (quelle, quell_id)
  where quell_id is not null and geloescht_am is null;
create index grossprojekte_offen_idx on public.grossprojekte (stand, punkte desc) where geloescht_am is null;
create index grossprojekte_anreichern_idx on public.grossprojekte (erstellt_am) where angereichert_am is null and geloescht_am is null;
comment on table public.grossprojekte is
  'Grossprojekte für PV- und Wärme-Contracting (Phase 8c): Punkte 0–100, Schätzung, Entscheid; Lead erst beim Bewilligen.';
comment on column public.grossprojekte.punkte_details is 'Aufschlüsselung der Punkte: [{"was": "dach", "punkte": 24, "wert": "1''200 m²"}, …].';
comment on column public.grossprojekte.schaetzung is
  'Grobe Schätzung: kwp, ertrag_kwh, investition_rappen, preis_rp_kwh (PV) und waerme_kw, waerme_investition_rappen, waerme_rate_rappen (Jahr).';

-- Verlauf eines Grossprojekts in der gemeinsamen Zeitachse.
alter table public.aktivitaeten add column grossprojekt_id uuid references public.grossprojekte (id);
create index aktivitaeten_grossprojekt_idx on public.aktivitaeten (grossprojekt_id, zeitpunkt desc)
  where grossprojekt_id is not null;

-- ---------- Einstellungen ----------

insert into public.einstellungen (schluessel, wert) values ('grossprojekte', $json${
  "bewilligen": ["andreas"],
  "bewilligen_vertretung": ["chris"],
  "melden_ab": 50,
  "fahrzeit_max": 60,
  "punkte": {
    "dach": {"ab_m2": 500, "voll_m2": 1500, "max": 30},
    "nutzung": {"industrie": 20, "kuehlung": 20, "spital": 20, "gewerbe": 18, "heim": 16, "schule": 14,
                "ueberbauung": 14, "landwirtschaft": 14, "sport": 12, "verwaltung": 12, "mfh": 12, "andere": 4},
    "heizung": {"oel": 20, "gas": 16, "elektro": 14, "unbekannt": 4, "holz": 2, "fernwaerme": 0, "waermepumpe": 0},
    "heizung_alt_jahre": 15,
    "heizung_ab_kw": 50,
    "bauherr": {"gemeinde": 15, "kanton": 15, "genossenschaft": 15, "pensionskasse": 15, "immobilien": 13,
                "kirche": 12, "gewerbe": 10, "landwirtschaft": 10, "unbekannt": 5, "privat": 3},
    "fahrzeit": [{"bis": 30, "punkte": 10}, {"bis": 45, "punkte": 7}, {"bis": 60, "punkte": 4}],
    "wohnungen": [{"ab": 20, "punkte": 5}, {"ab": 6, "punkte": 3}],
    "zu_klein_m2": 200
  },
  "annahmen": {
    "kwp_pro_m2": 0.18,
    "kwh_pro_kwp": 950,
    "chf_pro_kwp": [{"bis": 100, "chf": 1500}, {"bis": 300, "chf": 1200}, {"bis": null, "chf": 1000}],
    "zins_prozent": 4,
    "laufzeit_jahre": 25,
    "betrieb_prozent": 1.5,
    "marge_prozent": 20,
    "kw_pro_wohnung": 6,
    "chf_pro_kw_waerme": 2200,
    "laufzeit_waerme_jahre": 20
  },
  "stichworte": {
    "gross": ["überbauung", "wohnüberbauung", "mehrfamilienhäuser", "mehrfamilienhaus", "wohnsiedlung", "gewerbe",
              "industrie", "produktionshalle", "lagerhalle", "logistik", "werkhof", "schulhaus", "schulanlage",
              "turnhalle", "mehrzweckhalle", "sporthalle", "altersheim", "pflegeheim", "alterszentrum", "spital",
              "verwaltungsgebäude", "einkaufszentrum", "kühlhaus", "stall", "remise",
              "immeubles", "immeuble locatif", "quartier", "halle", "entrepôt", "industriel", "artisanal", "école",
              "ems", "home pour personnes âgées", "hôpital", "centre commercial", "ferme"],
    "waerme": ["heizungsersatz", "heizungssanierung", "heizzentrale", "wärmeerzeugung", "wärmepumpe", "wärmeverbund",
               "fernwärme", "contracting", "energiecontracting", "pompe à chaleur", "chauffage", "chauffage à distance",
               "remplacement du chauffage"],
    "aus": ["einfamilienhaus", "villa", "carport", "garage", "gartenhaus", "pool", "reinigung", "nettoyage", "fällung",
            "abattage", "reklame", "antenne", "maison individuelle", "piscine"],
    "nutzung": {"industrie": ["industrie", "produktion", "industriel"], "kuehlung": ["kühlhaus", "kühlung", "frigorifique"],
                "spital": ["spital", "hôpital", "klinik"], "heim": ["altersheim", "pflegeheim", "alterszentrum", "ems", "home"],
                "schule": ["schul", "école", "kindergarten"], "sport": ["turnhalle", "sporthalle", "mehrzweckhalle", "salle de sport"],
                "verwaltung": ["verwaltung", "administration"], "gewerbe": ["gewerbe", "lagerhalle", "logistik", "werkhof", "entrepôt", "artisanal", "einkaufszentrum", "centre commercial"],
                "ueberbauung": ["überbauung", "wohnsiedlung", "quartier"], "mfh": ["mehrfamilienhaus", "mehrfamilienhäuser", "immeuble"],
                "landwirtschaft": ["stall", "remise", "scheune", "ferme", "rural"]},
    "bauherr": {"genossenschaft": ["genossenschaft", "coopérative", "cooperative"],
                "pensionskasse": ["pensionskasse", "vorsorge", "caisse de pension", "prévoyance", "anlagestiftung"],
                "gemeinde": ["gemeinde ", "einwohnergemeinde", "stadt ", "commune", "ville de", "schulgemeinde", "bürgergemeinde"],
                "kanton": ["kanton ", "canton ", "état de", "staat "],
                "kirche": ["kirchgemeinde", "paroisse", "kirche"],
                "immobilien": ["immobilien", "immobilière", "immobiliare", "real estate", "liegenschaften", "promotion"],
                "landwirtschaft": ["landwirt", "agriculteur", "hof "],
                "gewerbe": [" ag", " sa", " gmbh", " sàrl"]}
  }
}$json$::jsonb)
on conflict (schluessel) do nothing;

/** Einstellungen des Grossprojekt-Monitors. */
create or replace function intern.gp_cfg() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select wert from public.einstellungen where schluessel = 'grossprojekte' and geloescht_am is null), '{}')
$$;

/** Personen (ids) einer Aufgabe laut Einstellung, z. B. «bewilligen». */
create or replace function intern.gp_personen(p_rolle text) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.id), '{}') from public.personen p
   where p.aktiv and p.geloescht_am is null
     and p.kuerzel in (select jsonb_array_elements_text(coalesce(intern.gp_cfg() -> p_rolle, '[]')))
$$;

/** Erster Wert aus einer Staffel [{"bis": 30, "punkte": 10}, …] bzw. [{"ab": 20, …}]. */
create or replace function intern.gp_staffel(p_staffel jsonb, p_wert numeric, p_feld text) returns numeric
language sql immutable set search_path = '' as $$
  select (s ->> p_feld)::numeric
    from jsonb_array_elements(coalesce(p_staffel, '[]')) with ordinality x(s, n)
   where p_wert is not null
     and ((s ? 'bis' and (s ->> 'bis' is null or p_wert <= (s ->> 'bis')::numeric))
       or (s ? 'ab' and p_wert >= (s ->> 'ab')::numeric))
   order by n limit 1
$$;

/** Jährliche Annuität in Rappen (Kapital, Zins in Prozent, Laufzeit in Jahren). */
create or replace function intern.gp_annuitaet(p_kapital numeric, p_zins numeric, p_jahre int) returns numeric
language sql immutable set search_path = '' as $$
  select case when p_jahre is null or p_jahre <= 0 then null
              when coalesce(p_zins, 0) = 0 then p_kapital / p_jahre
              else p_kapital * (p_zins / 100) / (1 - power(1 + p_zins / 100, -p_jahre)) end
$$;

/**
 * Bewertung eines Grossprojekts: Punkte 0–100 mit Aufschlüsselung, Art (PV, Wärme, beides), Ausschluss und Schätzung.
 * Punkte: Dach (bis 30), Nutzung/Eigenverbrauch (bis 20), Heizung (bis 20), Bauherrschaft (bis 15), Fahrzeit (bis 10),
 * Wohnungen für einen Zusammenschluss zum Eigenverbrauch (bis 5). Werte und Annahmen aus «einstellungen.grossprojekte».
 */
create or replace function intern.gp_bewerten(g public.grossprojekte,
  out punkte int, out details jsonb, out art text, out ausschluss text, out schaetzung jsonb)
language plpgsql stable set search_path = '' as $$
declare
  c jsonb := intern.gp_cfg();
  pk jsonb := c -> 'punkte';
  an jsonb := c -> 'annahmen';
  d jsonb := '[]';
  n numeric;
  ab numeric := coalesce((pk -> 'dach' ->> 'ab_m2')::numeric, 500);
  voll numeric := coalesce((pk -> 'dach' ->> 'voll_m2')::numeric, 1500);
  pv boolean := coalesce(g.dachflaeche_m2, 0) >= ab;
  fossil boolean := g.heizung in ('oel', 'gas', 'elektro');
  kw numeric := coalesce(g.waermeleistung_kw::numeric,
                         nullif(g.wohnungen, 0) * coalesce((an ->> 'kw_pro_wohnung')::numeric, 6));
  waerme boolean;
  kwp numeric;
  ertrag numeric;
  inv numeric;
  winv numeric;
begin
  punkte := 0;
  -- Dach: ab «ab_m2» Punkte, ab «voll_m2» volle Punkte; dazwischen linear.
  if g.dachflaeche_m2 is not null then
    n := case when g.dachflaeche_m2 >= voll then (pk -> 'dach' ->> 'max')::numeric
              when g.dachflaeche_m2 >= ab then round((pk -> 'dach' ->> 'max')::numeric * (0.4 + 0.6 * (g.dachflaeche_m2 - ab) / greatest(voll - ab, 1)))
              else round((pk -> 'dach' ->> 'max')::numeric * 0.3 * g.dachflaeche_m2 / greatest(ab, 1)) end;
    d := d || jsonb_build_object('was', 'dach', 'punkte', n, 'wert', g.dachflaeche_m2);
    punkte := punkte + n;
  end if;
  if g.nutzung is not null and g.nutzung <> 'efh' then
    n := coalesce((pk -> 'nutzung' ->> g.nutzung)::numeric, 0);
    d := d || jsonb_build_object('was', 'nutzung', 'punkte', n, 'wert', g.nutzung);
    punkte := punkte + n;
  end if;
  -- Heizung: fossil und alt (oder ein Heizungsersatz ist eingegeben) mit genug Leistung gibt volle Punkte.
  waerme := g.heizungsersatz or (fossil and (kw is null or kw >= coalesce((pk ->> 'heizung_ab_kw')::numeric, 50)));
  if g.heizungsersatz then
    n := (pk -> 'heizung' ->> 'oel')::numeric;
    d := d || jsonb_build_object('was', 'heizungsersatz', 'punkte', n, 'wert', coalesce(g.heizung, 'unbekannt'));
    punkte := punkte + n;
  elsif g.heizung is not null then
    n := coalesce((pk -> 'heizung' ->> g.heizung)::numeric, 0);
    if fossil and g.heizung_jahr is not null
       and g.heizung_jahr > extract(year from current_date) - coalesce((pk ->> 'heizung_alt_jahre')::int, 15) then
      n := round(n / 2);   -- noch jung: Ersatz eher später
    end if;
    if fossil and kw is not null and kw < coalesce((pk ->> 'heizung_ab_kw')::numeric, 50) then n := round(n / 2); end if;
    d := d || jsonb_build_object('was', 'heizung', 'punkte', n, 'wert', g.heizung, 'jahr', g.heizung_jahr, 'kw', kw);
    punkte := punkte + n;
  end if;
  n := coalesce((pk -> 'bauherr' ->> coalesce(g.bauherr_art, 'unbekannt'))::numeric, 0);
  d := d || jsonb_build_object('was', 'bauherr', 'punkte', n, 'wert', coalesce(g.bauherr_art, 'unbekannt'));
  punkte := punkte + n;
  if g.fahrzeit_min is not null then
    n := coalesce(intern.gp_staffel(pk -> 'fahrzeit', g.fahrzeit_min, 'punkte'), 0);
    d := d || jsonb_build_object('was', 'fahrzeit', 'punkte', n, 'wert', g.fahrzeit_min);
    punkte := punkte + n;
  end if;
  if coalesce(g.wohnungen, 0) > 0 then
    n := coalesce(intern.gp_staffel(pk -> 'wohnungen', g.wohnungen, 'punkte'), 0);
    if n > 0 then
      d := d || jsonb_build_object('was', 'wohnungen', 'punkte', n, 'wert', g.wohnungen);
      punkte := punkte + n;
    end if;
  end if;
  punkte := least(100, greatest(0, punkte));

  -- Ausschluss: geschützt, Einfamilienhaus, zu weit, zu klein für Contracting.
  ausschluss := case
    when g.geschuetzt then 'geschuetzt'
    when g.nutzung = 'efh' then 'efh'
    when g.fahrzeit_min > coalesce((c ->> 'fahrzeit_max')::int, 60) then 'fahrzeit'
    when not waerme and g.dachflaeche_m2 is not null and g.dachflaeche_m2 < coalesce((pk ->> 'zu_klein_m2')::int, 200) then 'zu_klein'
  end;
  if ausschluss is not null then punkte := 0; end if;
  art := case when pv and waerme then 'beides' when waerme then 'waerme' when pv then 'pv' end;

  -- Schätzung PV: kWp aus der Fläche, Ertrag aus sonnendach.ch (sonst kWh pro kWp), Investition nach Staffel,
  -- Contracting-Preis = (Annuität + Betrieb) × (1 + Marge) / Ertrag. Wärme: Jahresrate gleich gerechnet.
  schaetzung := '{}';
  if coalesce(g.dachflaeche_m2, 0) > 0 then
    kwp := round(g.dachflaeche_m2 * coalesce((an ->> 'kwp_pro_m2')::numeric, 0.18));
    -- Ertrag von sonnendach.ch gilt für die ganze Fläche; höchstens 1'200 kWh pro kWp, damit Ausreisser nicht täuschen.
    ertrag := case when g.stromertrag_kwh is not null then least(g.stromertrag_kwh, kwp * 1200)
                   else kwp * coalesce((an ->> 'kwh_pro_kwp')::numeric, 950) end;
    inv := kwp * coalesce(intern.gp_staffel(an -> 'chf_pro_kwp', kwp, 'chf'), 1200) * 100;
    schaetzung := schaetzung || jsonb_build_object(
      'kwp', kwp, 'ertrag_kwh', round(ertrag), 'investition_rappen', round(inv),
      'preis_rp_kwh', case when ertrag > 0 then round((intern.gp_annuitaet(inv, (an ->> 'zins_prozent')::numeric,
        coalesce((an ->> 'laufzeit_jahre')::int, 25)) + inv * coalesce((an ->> 'betrieb_prozent')::numeric, 1.5) / 100)
        * (1 + coalesce((an ->> 'marge_prozent')::numeric, 0) / 100) / ertrag, 1) end);
  end if;
  if waerme and kw is not null and kw > 0 then
    winv := kw * coalesce((an ->> 'chf_pro_kw_waerme')::numeric, 2200) * 100;
    schaetzung := schaetzung || jsonb_build_object('waerme_kw', round(kw), 'waerme_investition_rappen', round(winv),
      'waerme_rate_rappen', round((intern.gp_annuitaet(winv, (an ->> 'zins_prozent')::numeric,
        coalesce((an ->> 'laufzeit_waerme_jahre')::int, 20)) + winv * coalesce((an ->> 'betrieb_prozent')::numeric, 1.5) / 100)
        * (1 + coalesce((an ->> 'marge_prozent')::numeric, 0) / 100)));
  end if;
  details := d;
end
$$;

/** Vor jedem Speichern: Nummer, Standort und Fahrzeit ergänzen, Punkte und Schätzung neu rechnen. */
create or replace function intern.grossprojekt_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  b record;
begin
  if new.nummer is null then
    new.nummer := 'GP-' || extract(year from now())::int || '-' || lpad(nextval('public.grossprojekt_nummer_seq')::text, 4, '0');
  end if;
  new.plz := nullif(substring(coalesce(new.plz, '') from '\d{4}'), '');
  if new.plz is not null and (tg_op = 'INSERT' or new.plz is distinct from old.plz) then
    new.kanton := coalesce((select v.kanton from public.plz_verzeichnis v where v.plz = new.plz limit 1), new.kanton);
    new.standort_id := (select s.id from public.standorte s where s.kuerzel = public.standort_fuer_plz(new.plz));
    new.sprache := coalesce((select s.sprache from public.standorte s where s.id = new.standort_id), new.sprache);
    select min(intern.fahrzeit_min(s.plz, new.plz)) into new.fahrzeit_min from public.standorte s where s.geloescht_am is null;
  end if;
  select * into b from intern.gp_bewerten(new);
  new.punkte := b.punkte;
  new.punkte_details := b.details;
  new.art := b.art;
  new.ausschluss := b.ausschluss;
  new.schaetzung := b.schaetzung;
  return new;
end
$$;
create trigger vorbereiten before insert or update on public.grossprojekte
  for each row execute function intern.grossprojekt_vorbereiten();

/**
 * Stand, Entscheid und Lead ändern nur die Abläufe (grossprojekt_entscheiden, grossprojekte_melden). So kann niemand
 * über die Tabelle «bewilligt» setzen und das Bewilligen umgehen. Server und Migrationen sind nicht betroffen.
 */
create or replace function intern.grossprojekt_schuetzen() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and coalesce(current_setting('gp.ablauf', true), '') <> 'ja'
     and (new.stand, new.entschieden_von, new.entschieden_am, new.verkaufschance_id, new.gemeldet_am, new.grund)
         is distinct from
         (case when tg_op = 'INSERT' then 'pruefen' else old.stand end,
          case when tg_op = 'INSERT' then null else old.entschieden_von end,
          case when tg_op = 'INSERT' then null else old.entschieden_am end,
          case when tg_op = 'INSERT' then null else old.verkaufschance_id end,
          case when tg_op = 'INSERT' then null else old.gemeldet_am end,
          case when tg_op = 'INSERT' then null else old.grund end) then
    raise exception using errcode = '42501', message = 'grossprojekt.nur_ablauf';
  end if;
  return new;
end
$$;
create trigger schuetzen before insert or update on public.grossprojekte
  for each row execute function intern.grossprojekt_schuetzen();

-- Die Regeln (wer bewilligt, Schwellen) ändert nur die Administration, wie beim Ausschreibungs-Monitor.
create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel in ('ausschreibungen', 'grossprojekte') and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  if new.schluessel = 'finanzen' and auth.uid() is not null and not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'finanzen.kein_recht';
  end if;
  if new.schluessel = 'marketing' and auth.uid() is not null and not intern.hat_recht('admin')
     and (tg_op = 'INSERT' or (new.wert -> 'social' ->> 'ci') is distinct from (old.wert -> 'social' ->> 'ci')) then
    raise exception using errcode = '42501', message = 'marketing.ci_nur_admin';
  end if;
  if new.schluessel = 'automationen' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'automation.kein_recht';
  end if;
  if new.schluessel = 'ki' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ki.kein_recht';
  end if;
  return new;
end
$$;
