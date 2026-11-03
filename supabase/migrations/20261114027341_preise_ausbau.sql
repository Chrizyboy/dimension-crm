-- Preise vollständig (Chris 02.11.2026, Neuentwurf «Preise», Antworten P1–P4):
-- P1 Preise kommen aus Eturnity (zuerst als Export-Datei, später über die Schnittstelle), P2 Preislisten der
-- Lieferanten einlesen, P3 Kalkulation mit Bausteinen, Varianten und Leistungen, P4 Rabatt über der Grenze oder
-- Marge unter der Mindestmarge braucht die Freigabe der Geschäftsleitung.
-- Regeln, Leistungen und Bausteine sind Daten (Regel 8). Einkauf, Marge und Kosten nur mit Recht «preise».

-- Regeln ------------------------------------------------------------------------------------------------------
insert into public.einstellungen (schluessel, wert) values ('preise', $json$
{
  "kategorien": {
    "module": {"marge": 0.25, "mindest": 0.15},
    "wechselrichter": {"marge": 0.22, "mindest": 0.15},
    "batteriespeicher": {"marge": 0.18, "mindest": 0.12},
    "optimierer": {"marge": 0.25, "mindest": 0.15},
    "unterkonstruktion": {"marge": 0.30, "mindest": 0.20},
    "indach_systeme": {"marge": 0.25, "mindest": 0.15},
    "energiemanagement_zaehler": {"marge": 0.25, "mindest": 0.15},
    "ladestationen": {"marge": 0.25, "mindest": 0.15},
    "kabel_montagezubehör": {"marge": 0.35, "mindest": 0.20},
    "schutz_verteilung": {"marge": 0.30, "mindest": 0.20},
    "waermepumpen": {"marge": 0.20, "mindest": 0.12},
    "dienstleistungen": {"marge": 0.25, "mindest": 0.15}
  },
  "skonto": 0.015,
  "rundung_rappen": 5,
  "ek_gueltig_tage": 90,
  "rabatt_frei_prozent": 8,
  "mindest_db_prozent": 15,
  "freigabe_person_ids": [],
  "foerderung": {"name": "Pronovo EIV", "stand": "2026", "grund_rappen": 0, "je_kwp_rappen": 36000, "bis_kwp": 30, "je_kwp_darueber_rappen": 30000}
}
$json$::jsonb)
on conflict (schluessel) do nothing;

/** Die Preis-Regeln (intern, ungefiltert). */
create or replace function intern.preise_cfg() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select wert from public.einstellungen where schluessel = 'preise'), '{}'::jsonb)
$$;

/** Wer Rabatte und tiefe Margen freigibt (Geschäftsleitung). Leer → alle mit Recht «admin». */
create or replace function intern.preise_freigeber() returns uuid[]
language sql stable security definer set search_path = '' as $$
  with liste as (
    select (jsonb_array_elements_text(intern.preise_cfg() -> 'freigabe_person_ids'))::uuid as id
     where jsonb_typeof(intern.preise_cfg() -> 'freigabe_person_ids') = 'array'
  ), gewaehlt as (
    select p.id from public.personen p join liste l on l.id = p.id where p.aktiv and p.geloescht_am is null
  )
  select case when exists (select 1 from gewaehlt) then (select array_agg(id) from gewaehlt)
              else coalesce((select array_agg(p.id) from public.personen p left join public.rollen r on r.schluessel = p.rolle
                              where p.aktiv and p.geloescht_am is null
                                and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}')))), '{}') end
$$;

/** Bin ich Freigeber/in? */
create or replace function intern.preise_bin_freigeber() returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.meine_person_id() = any (intern.preise_freigeber())
$$;

/**
 * Preis-Regeln für die Oberfläche. Mit Recht «preise» alles (Marge je Kategorie, Grenzen, Freigeber); ohne
 * nur Förderung und Rundung (aus Marge und Verkauf liesse sich der Einkauf zurückrechnen).
 */
create or replace function public.preise_regeln() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c jsonb := intern.preise_cfg();
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'recht.fehlt'; end if;
  if not intern.hat_recht('preise') then
    return jsonb_build_object('foerderung', c -> 'foerderung', 'rundung_rappen', c -> 'rundung_rappen');
  end if;
  return c || jsonb_build_object(
    'ich_freigeber', intern.preise_bin_freigeber(),
    'ich_admin', intern.hat_recht('admin'),
    'freigeber', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.name)
                             from public.personen p where p.id = any (intern.preise_freigeber())), '[]'::jsonb));
end
$$;
revoke execute on function public.preise_regeln() from public, anon;
grant execute on function public.preise_regeln() to authenticated;

/**
 * Regeln ändern, auch wer freigibt: nur die Administration (Regel von Chris, 3.11.2026: Einstellungen ändern nur
 * Admins). Nur bekannte Schlüssel; die übrigen bleiben, wie sie sind.
 */
create or replace function public.preise_regeln_setzen(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  erlaubt text[] := array['kategorien', 'skonto', 'rundung_rappen', 'ek_gueltig_tage', 'rabatt_frei_prozent',
                          'mindest_db_prozent', 'freigabe_person_ids', 'foerderung'];
  sauber jsonb := '{}';
  k text;
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'preise.nur_admin';
  end if;
  for k in select jsonb_object_keys(coalesce(p, '{}')) loop
    if k = any (erlaubt) then sauber := sauber || jsonb_build_object(k, p -> k); end if;
  end loop;
  update public.einstellungen set wert = wert || sauber where schluessel = 'preise';
end
$$;
revoke execute on function public.preise_regeln_setzen(jsonb) from public, anon;
grant execute on function public.preise_regeln_setzen(jsonb) to authenticated;

-- Artikel: Garantie und Standard-Marge ------------------------------------------------------------------------
alter table public.artikel add column if not exists garantie_jahre int;
comment on column public.artikel.garantie_jahre is 'Herstellergarantie in Jahren (für den Garantie-Check im Service).';

/** Neue Artikel ohne Marge/Skonto bekommen den Standard ihrer Kategorie aus den Regeln. */
create or replace function intern.artikel_standard_marge() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb := intern.preise_cfg();
begin
  if new.marge is null then new.marge := (c -> 'kategorien' -> new.kategorie ->> 'marge')::numeric; end if;
  if new.skonto is null then new.skonto := (c ->> 'skonto')::numeric; end if;
  return new;
end
$$;
create trigger standard_marge before insert on public.artikel
  for each row execute function intern.artikel_standard_marge();

-- Preisverlauf -------------------------------------------------------------------------------------------------
create table public.preisverlauf (
  id           uuid primary key default gen_random_uuid(),
  artikel_id   uuid not null references public.artikel (id),
  lieferant_id uuid references public.lieferanten (id),
  feld         text not null check (feld in ('ek', 'marge', 'skonto')),
  alt          numeric,
  neu          numeric,
  quelle       text not null default 'von Hand',
  person       text
);
select intern.richte_fachtabelle_ein('preisverlauf', 'preise');
create index preisverlauf_artikel_idx on public.preisverlauf (artikel_id, erstellt_am desc);

/** Quelle der laufenden Änderung (z. B. «Eturnity»), gesetzt vom Import; sonst «von Hand». */
create or replace function intern.preis_quelle() returns text
language sql stable set search_path = '' as $$
  select coalesce(nullif(current_setting('dimension.preis_quelle', true), ''), 'von Hand')
$$;

create or replace function intern.verlauf_ek() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.ek_rappen is distinct from old.ek_rappen then
    insert into public.preisverlauf (artikel_id, lieferant_id, feld, alt, neu, quelle, person)
    values (new.artikel_id, new.lieferant_id, 'ek', case when tg_op = 'UPDATE' then old.ek_rappen end, new.ek_rappen,
            intern.preis_quelle(), intern.mein_vorname());
  end if;
  return new;
end
$$;
create trigger verlauf after insert or update of ek_rappen on public.lieferantenpreise
  for each row execute function intern.verlauf_ek();

create or replace function intern.verlauf_marge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.marge is distinct from old.marge then
    insert into public.preisverlauf (artikel_id, feld, alt, neu, quelle, person)
    values (new.id, 'marge', old.marge, new.marge, intern.preis_quelle(), intern.mein_vorname());
  end if;
  if new.skonto is distinct from old.skonto then
    insert into public.preisverlauf (artikel_id, feld, alt, neu, quelle, person)
    values (new.id, 'skonto', old.skonto, new.skonto, intern.preis_quelle(), intern.mein_vorname());
  end if;
  return new;
end
$$;
create trigger verlauf after update of marge, skonto on public.artikel
  for each row execute function intern.verlauf_marge();

-- Preisliste mit Lager, Lieferanten und Garantie (neue Spalten hinten, Sicht bleibt sonst gleich) --------------
create or replace view public.preisliste as
with ek as (
  select distinct on (lp.artikel_id) lp.artikel_id, lp.ek_rappen, lp.stand, l.name as lieferant
    from public.lieferantenpreise lp
    left join public.lieferanten l on l.id = lp.lieferant_id
   where lp.geloescht_am is null and lp.ek_rappen is not null
   order by lp.artikel_id, lp.ek_rappen, lp.stand desc nulls last
), lager as (
  select lb.artikel_id, sum(lb.menge - lb.reserviert) as frei, sum(lb.reserviert) as reserviert
    from public.lagerbestand lb where lb.geloescht_am is null group by lb.artikel_id
), unterwegs as (
  select p.artikel_id, sum(greatest(p.menge - p.geliefert_menge, 0)) as menge
    from public.bestellpositionen p join public.bestellungen b on b.id = p.bestellung_id
   where p.geloescht_am is null and b.geloescht_am is null and p.artikel_id is not null
     and b.status in ('entwurf', 'freigegeben', 'bestellt', 'teilgeliefert')
   group by p.artikel_id
), lief as (
  select lp.artikel_id, count(*)::int as anzahl from public.lieferantenpreise lp
   where lp.geloescht_am is null and lp.ek_rappen is not null group by lp.artikel_id
), recht as (select intern.hat_recht('preise') as preise)
select
  a.id, a.artikelnummer, a.name, a.kategorie, a.hersteller_gruppe, a.einheit, a.leistung_w,
  a.masse, a.masse_art, a.gewicht_kg, a.datenblaetter, a.nachfolger_id,
  a.archiviert_am, a.archiviert_von, a.archiv_grund, a.geaendert_am,
  coalesce(public.vk_aus_ek(ek.ek_rappen, a.marge, a.skonto), a.verkauf_rappen) as vk_rappen,
  case when recht.preise then ek.ek_rappen end as ek_rappen,
  case when recht.preise then a.marge end as marge,
  case when recht.preise then a.skonto end as skonto,
  case when recht.preise then a.rabatt end as rabatt,
  case when recht.preise then ek.lieferant end as lieferant,
  case when recht.preise then ek.stand end as ek_stand,
  lower(concat_ws(' ', a.name, a.artikelnummer, a.hersteller_gruppe, a.kategorie)) as suchtext,
  coalesce(lager.frei, 0) as lager_frei,
  coalesce(lager.reserviert, 0) as lager_reserviert,
  coalesce(unterwegs.menge, 0) as lager_unterwegs,
  case when recht.preise then coalesce(lief.anzahl, 0) end as lieferanten_anzahl,
  a.garantie_jahre
from public.artikel a
cross join recht
left join ek on ek.artikel_id = a.id
left join lager on lager.artikel_id = a.id
left join unterwegs on unterwegs.artikel_id = a.id
left join lief on lief.artikel_id = a.id
where a.geloescht_am is null and intern.hat_recht('basis');
grant select on public.preisliste to authenticated;

/** Marge oder Skonto für mehrere Artikel auf einmal; p_standard = true setzt den Standard der Kategorie. */
create or replace function public.artikel_preise_mehrfach(p_ids uuid[], p_marge numeric default null,
                                                          p_skonto numeric default null, p_standard boolean default false)
returns int language plpgsql security invoker set search_path = '' as $$
declare
  n int;
  c jsonb := intern.preise_cfg();
begin
  if not intern.hat_recht('preise') then raise exception using message = 'recht.fehlt'; end if;
  if p_marge is not null and (p_marge < 0 or p_marge > 5) then raise exception using message = 'preise.marge_ungueltig'; end if;
  update public.artikel a set
    marge = case when p_standard then coalesce((c -> 'kategorien' -> a.kategorie ->> 'marge')::numeric, a.marge)
                 else coalesce(p_marge, a.marge) end,
    skonto = coalesce(p_skonto, a.skonto)
   where a.id = any (p_ids) and a.geloescht_am is null;
  get diagnostics n = row_count;
  return n;
end
$$;
revoke execute on function public.artikel_preise_mehrfach(uuid[], numeric, numeric, boolean) from public, anon;
grant execute on function public.artikel_preise_mehrfach(uuid[], numeric, numeric, boolean) to authenticated;

/** Wo ein Artikel verwendet wird: offene Kalkulationen, Vorlagen, Projekt-Material (12 Monate). */
create or replace function public.artikel_verwendung(p_artikel uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'kalkulationen_offen', (select count(*) from public.kalkulationen k
                              left join public.offerten o on o.id = k.offerte_id
                             where k.geloescht_am is null
                               and k.positionen @> jsonb_build_array(jsonb_build_object('artikelId', p_artikel))
                               and (o.id is null or o.status in ('in_arbeit', 'offeriert'))),
    'vorlagen', (select coalesce(jsonb_agg(distinct v.name), '[]'::jsonb) from public.preisvorlage_positionen pp
                   join public.preisvorlagen v on v.id = pp.preisvorlage_id
                  where pp.artikel_id = p_artikel and pp.geloescht_am is null and v.geloescht_am is null),
    'projekte_12_monate', (select count(distinct m.projekt_id) from public.projekt_material m
                            where m.artikel_id = p_artikel and m.geloescht_am is null
                              and m.erstellt_am > now() - interval '12 months'),
    'menge_12_monate', (select coalesce(sum(m.menge), 0) from public.projekt_material m
                         where m.artikel_id = p_artikel and m.geloescht_am is null
                           and m.erstellt_am > now() - interval '12 months'))
$$;
revoke execute on function public.artikel_verwendung(uuid) from public, anon;
grant execute on function public.artikel_verwendung(uuid) to authenticated;

-- Leistungen & Pauschalen ---------------------------------------------------------------------------------------
create table public.leistungen (
  id             uuid primary key default gen_random_uuid(),
  schluessel     text not null unique,
  name_de        text not null,
  name_fr        text not null,
  einheit        text not null default 'Std.',
  kosten_rappen  bigint,
  verkauf_rappen bigint not null,
  bereiche       text[] not null default '{kalkulation}',
  reihenfolge    int not null default 100,
  aktiv          boolean not null default true
);
select intern.richte_fachtabelle_ein('leistungen', 'preise');

insert into public.leistungen (schluessel, name_de, name_fr, einheit, kosten_rappen, verkauf_rappen, bereiche, reihenfolge) values
  ('montage_pv', 'Montage PV', 'Montage PV', 'Std.', 6500, 9800, '{kalkulation}', 10),
  ('elektro', 'Elektroinstallation', 'Installation électrique', 'Std.', 7200, 11500, '{kalkulation,rapport}', 20),
  ('service', 'Service-Einsatz', 'Intervention de service', 'Std.', 6500, 12000, '{service,rapport}', 30),
  ('anfahrt_1', 'Anfahrt Zone 1 (bis 20 km)', 'Déplacement zone 1 (jusqu’à 20 km)', 'pauschal', 2500, 6500, '{service}', 40),
  ('anfahrt_2', 'Anfahrt Zone 2 (20–50 km)', 'Déplacement zone 2 (20–50 km)', 'pauschal', 4500, 9500, '{service}', 50),
  ('geruest_efh', 'Gerüst EFH bis 2 Geschosse', 'Échafaudage villa jusqu’à 2 niveaux', 'pauschal', 188000, 235000, '{kalkulation}', 60),
  ('planung', 'Planung & Bewilligung', 'Planification & autorisation', 'pauschal', 52000, 125000, '{kalkulation}', 70),
  ('pronovo', 'Pronovo & Netzanmeldung', 'Pronovo & annonce au réseau', 'pauschal', 13000, 39000, '{kalkulation}', 80),
  ('kleinmaterial', 'Kabel, Stecker, Kleinmaterial', 'Câbles, connecteurs, petit matériel', 'kWp', 2400, 3500, '{kalkulation}', 90),
  ('entsorgung', 'Entsorgung Altgerät', 'Élimination ancien appareil', 'Stk', 6000, 18000, '{service,kalkulation}', 100);

/** Leistungen ohne Kosten, für alle (Verkaufspreise sind nicht geheim). */
create or replace view public.leistungen_liste as
select l.id, l.schluessel, l.name_de, l.name_fr, l.einheit, l.verkauf_rappen, l.bereiche, l.reihenfolge,
       case when intern.hat_recht('preise') then l.kosten_rappen end as kosten_rappen
  from public.leistungen l
 where l.geloescht_am is null and l.aktiv and intern.hat_recht('basis');
grant select on public.leistungen_liste to authenticated;

-- Bausteine der Kalkulation -------------------------------------------------------------------------------------
-- Zeilen: {"art": "leistung", "leistung": "<schluessel>"} oder {"art": "artikel", "artikel_id": "…"} oder
-- {"art": "wahl", "kategorie": "<artikelkategorie>"} (Artikel wählt man beim Einfügen), dazu die Mengen-Regel
-- {"regel": "fest"|"je_modul"|"je_kwp", "faktor": 1.0}. «variante» = nur in dieser Variante (B, C).
create table public.kalk_bausteine (
  id          uuid primary key default gen_random_uuid(),
  name_de     text not null,
  name_fr     text not null,
  zeilen      jsonb not null default '[]',
  reihenfolge int not null default 100
);
select intern.richte_fachtabelle_ein('kalk_bausteine', 'preise');

insert into public.kalk_bausteine (name_de, name_fr, reihenfolge, zeilen) values
  ('PV Aufdach Ziegel', 'PV sur toiture tuiles', 10, $j$[
    {"art": "wahl", "kategorie": "module", "regel": "fest", "faktor": 20},
    {"art": "wahl", "kategorie": "wechselrichter", "regel": "fest", "faktor": 1},
    {"art": "wahl", "kategorie": "unterkonstruktion", "regel": "je_modul", "faktor": 1},
    {"art": "leistung", "leistung": "kleinmaterial", "regel": "je_kwp", "faktor": 1},
    {"art": "leistung", "leistung": "montage_pv", "regel": "je_kwp", "faktor": 4.1},
    {"art": "leistung", "leistung": "elektro", "regel": "fest", "faktor": 16},
    {"art": "leistung", "leistung": "geruest_efh", "regel": "fest", "faktor": 1},
    {"art": "leistung", "leistung": "planung", "regel": "fest", "faktor": 1},
    {"art": "leistung", "leistung": "pronovo", "regel": "fest", "faktor": 1}]$j$),
  ('PV Flachdach', 'PV toit plat', 20, $j$[
    {"art": "wahl", "kategorie": "module", "regel": "fest", "faktor": 20},
    {"art": "wahl", "kategorie": "wechselrichter", "regel": "fest", "faktor": 1},
    {"art": "wahl", "kategorie": "unterkonstruktion", "regel": "je_modul", "faktor": 1},
    {"art": "leistung", "leistung": "kleinmaterial", "regel": "je_kwp", "faktor": 1},
    {"art": "leistung", "leistung": "montage_pv", "regel": "je_kwp", "faktor": 3.5},
    {"art": "leistung", "leistung": "elektro", "regel": "fest", "faktor": 16},
    {"art": "leistung", "leistung": "planung", "regel": "fest", "faktor": 1},
    {"art": "leistung", "leistung": "pronovo", "regel": "fest", "faktor": 1}]$j$),
  ('+ Speicher', '+ Batterie', 30, $j$[
    {"art": "wahl", "kategorie": "batteriespeicher", "regel": "fest", "faktor": 1},
    {"art": "leistung", "leistung": "montage_pv", "regel": "fest", "faktor": 4},
    {"art": "leistung", "leistung": "elektro", "regel": "fest", "faktor": 3}]$j$),
  ('+ Wallbox', '+ Borne de recharge', 40, $j$[
    {"art": "wahl", "kategorie": "ladestationen", "regel": "fest", "faktor": 1},
    {"art": "leistung", "leistung": "elektro", "regel": "fest", "faktor": 5}]$j$),
  ('+ Optimierer', '+ Optimiseurs', 50, $j$[
    {"art": "wahl", "kategorie": "optimierer", "regel": "je_modul", "faktor": 1}]$j$),
  ('Wärmepumpe', 'Pompe à chaleur', 60, $j$[
    {"art": "wahl", "kategorie": "waermepumpen", "regel": "fest", "faktor": 1},
    {"art": "leistung", "leistung": "elektro", "regel": "fest", "faktor": 8},
    {"art": "leistung", "leistung": "entsorgung", "regel": "fest", "faktor": 1}]$j$),
  ('Service-Einsatz', 'Intervention de service', 70, $j$[
    {"art": "leistung", "leistung": "anfahrt_1", "regel": "fest", "faktor": 1},
    {"art": "leistung", "leistung": "service", "regel": "fest", "faktor": 2}]$j$);

-- Preislisten einlesen (Eturnity, Lieferanten) ------------------------------------------------------------------
create table public.preis_importe (
  id           uuid primary key default gen_random_uuid(),
  quelle       text not null,                         -- «Eturnity» oder Name des Lieferanten
  lieferant_id uuid references public.lieferanten (id),
  dateiname    text,
  zuordnung    jsonb not null default '{}',           -- Spalte der Datei je Feld, für das nächste Mal
  zeilen       jsonb not null default '[]',
  ergebnis     jsonb not null default '[]',
  zaehlung     jsonb not null default '{}',
  status       text not null default 'offen' check (status in ('offen', 'uebernommen', 'verworfen')),
  erledigt_am  timestamptz,
  erledigt_von text
);
select intern.richte_fachtabelle_ein('preis_importe', 'preise');

/**
 * Datei prüfen und als «offen» ablegen. Zeilen: {artikelnummer, name, ek_rappen, lieferant?, hersteller?, einheit?,
 * leistung_w?, kategorie?}. Erkennt den Artikel über die Nummer beim Lieferanten, die eigene Nummer oder den Namen
 * und zählt, welche offenen Offerten (Kalkulationen) den Artikel enthalten. Gespeichert wird noch nichts.
 * p_vollstaendig = true: die Datei ist die ganze Liste des Lieferanten → Fehlende gelten als «nicht mehr lieferbar».
 */
create or replace function public.preis_import_anlegen(p_quelle text, p_lieferant uuid, p_dateiname text,
                                                       p_zuordnung jsonb, p_zeilen jsonb, p_vollstaendig boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_variable
declare
  z jsonb;
  i int := 0;
  lief uuid;
  art uuid;
  alt bigint;
  neu bigint;
  c jsonb := intern.preise_cfg();
  zeilen jsonb := '[]';
  nummern text[] := '{}';
  betroffen text[];
  marge numeric;
  skonto numeric;
  id_neu uuid;
  n_g int := 0; n_n int := 0; n_s int := 0; n_t int := 0; n_b int := 0; n_f int := 0;
  offerten text[] := '{}';
begin
  if not intern.hat_recht('preise') then raise exception using message = 'recht.fehlt'; end if;
  if nullif(trim(coalesce(p_quelle, '')), '') is null then raise exception using message = 'preise.quelle_fehlt'; end if;
  for z in select * from jsonb_array_elements(coalesce(p_zeilen, '[]')) loop
    i := i + 1;
    continue when nullif(trim(coalesce(z ->> 'name', '')), '') is null and nullif(trim(coalesce(z ->> 'artikelnummer', '')), '') is null;
    neu := nullif(z ->> 'ek_rappen', '')::bigint;
    lief := coalesce(p_lieferant, (select l.id from public.lieferanten l
                                    where lower(l.name) = lower(trim(coalesce(z ->> 'lieferant', ''))) and l.geloescht_am is null limit 1));
    art := null; alt := null;
    if nullif(trim(coalesce(z ->> 'artikelnummer', '')), '') is not null then
      nummern := nummern || trim(z ->> 'artikelnummer');
      select lp.artikel_id into art from public.lieferantenpreise lp
       where lp.geloescht_am is null and lp.lieferant_id is not distinct from lief and lp.artikelnummer = trim(z ->> 'artikelnummer') limit 1;
      if art is null then
        select a.id into art from public.artikel a
         where a.geloescht_am is null and a.artikelnummer = trim(z ->> 'artikelnummer')
         order by a.archiviert_am nulls first limit 1;
      end if;
    end if;
    if art is null and nullif(trim(coalesce(z ->> 'name', '')), '') is not null then
      select a.id into art from public.artikel a
       where a.geloescht_am is null and lower(a.name) = lower(trim(z ->> 'name'))
       order by a.archiviert_am nulls first limit 1;
    end if;
    if art is not null then
      select lp.ek_rappen into alt from public.lieferantenpreise lp
       where lp.artikel_id = art and lp.geloescht_am is null and (lief is null or lp.lieferant_id is not distinct from lief)
       order by lp.ek_rappen nulls last limit 1;
      select a.marge, a.skonto into marge, skonto from public.artikel a where a.id = art;
      select coalesce(array_agg(distinct o.nummer), '{}') into betroffen
        from public.kalkulationen k join public.offerten o on o.id = k.offerte_id
       where k.geloescht_am is null and o.geloescht_am is null and o.status in ('in_arbeit', 'offeriert')
         and k.positionen @> jsonb_build_array(jsonb_build_object('artikelId', art));
    else
      marge := (c -> 'kategorien' -> coalesce(z ->> 'kategorie', '') ->> 'marge')::numeric;
      skonto := (c ->> 'skonto')::numeric;
      betroffen := '{}';
    end if;
    zeilen := zeilen || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'i', i, 'artikel_id', art, 'artikelnummer', nullif(trim(coalesce(z ->> 'artikelnummer', '')), ''),
      'name', coalesce(nullif(trim(z ->> 'name'), ''), (select a.name from public.artikel a where a.id = art)),
      'lieferant', coalesce(nullif(trim(z ->> 'lieferant'), ''), (select l.name from public.lieferanten l where l.id = lief)),
      'hersteller', nullif(trim(coalesce(z ->> 'hersteller', '')), ''), 'einheit', nullif(trim(coalesce(z ->> 'einheit', '')), ''),
      'leistung_w', nullif(z ->> 'leistung_w', '')::int, 'kategorie', nullif(z ->> 'kategorie', ''),
      'ek_alt', alt, 'ek_neu', neu,
      'vk_neu', public.vk_aus_ek(neu, coalesce(marge, 0.25), coalesce(skonto, 0.015)),
      'art', case when art is null then 'neu' when alt is not distinct from neu or neu is null then 'gleich' else 'geaendert' end,
      'offerten', to_jsonb(betroffen))));
    if art is null then n_n := n_n + 1;
    elsif alt is not distinct from neu or neu is null then n_s := n_s + 1;
    else
      n_g := n_g + 1;
      if alt is null or neu > alt then n_t := n_t + 1; else n_b := n_b + 1; end if;
      offerten := offerten || betroffen;
    end if;
  end loop;
  if p_vollstaendig and p_lieferant is not null then
    for art, alt in
      select lp.artikel_id, lp.ek_rappen from public.lieferantenpreise lp join public.artikel a on a.id = lp.artikel_id
       where lp.lieferant_id = p_lieferant and lp.geloescht_am is null and a.geloescht_am is null and a.archiviert_am is null
         and lp.artikelnummer is not null and not (lp.artikelnummer = any (nummern))
    loop
      i := i + 1;
      n_f := n_f + 1;
      zeilen := zeilen || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'i', i, 'artikel_id', art, 'name', (select a.name from public.artikel a where a.id = art),
        'ek_alt', alt, 'art', 'fehlt')));
    end loop;
  end if;
  insert into public.preis_importe (quelle, lieferant_id, dateiname, zuordnung, zeilen, ergebnis, zaehlung)
  values (trim(p_quelle), p_lieferant, p_dateiname, coalesce(p_zuordnung, '{}'), coalesce(p_zeilen, '[]'), zeilen,
          jsonb_build_object('gelesen', jsonb_array_length(coalesce(p_zeilen, '[]')), 'geaendert', n_g, 'neu', n_n,
                             'gleich', n_s, 'teurer', n_t, 'guenstiger', n_b, 'fehlt', n_f,
                             'offerten', (select count(distinct x) from unnest(offerten) x)))
  returning id into id_neu;
  return jsonb_build_object('id', id_neu) || (select zaehlung from public.preis_importe where id = id_neu);
end
$$;
revoke execute on function public.preis_import_anlegen(text, uuid, text, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.preis_import_anlegen(text, uuid, text, jsonb, jsonb, boolean) to authenticated;

/**
 * Gewählte Zeilen übernehmen: geänderte Preise beim Lieferanten setzen (der günstigste bestimmt den Einkauf),
 * neue Artikel mit Kategorie anlegen. p_zeilen = null → alle geänderten. p_neu = [{"i": 7, "kategorie": "module"}].
 * Lieferanten, die es noch nicht gibt, werden angelegt. Jede Änderung steht danach im Preisverlauf.
 */
create or replace function public.preis_import_uebernehmen(p_import uuid, p_zeilen int[] default null, p_neu jsonb default '[]')
returns jsonb language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_variable
declare
  imp public.preis_importe;
  z jsonb;
  lief uuid;
  art uuid;
  kat text;
  n_g int := 0;
  n_n int := 0;
begin
  if not intern.hat_recht('preise') then raise exception using message = 'recht.fehlt'; end if;
  select * into imp from public.preis_importe where id = p_import and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if imp.status <> 'offen' then raise exception using message = 'preise.import_erledigt'; end if;
  perform set_config('dimension.preis_quelle', imp.quelle, true);
  for z in select * from jsonb_array_elements(imp.ergebnis) loop
    kat := (select n ->> 'kategorie' from jsonb_array_elements(coalesce(p_neu, '[]')) n where (n ->> 'i')::int = (z ->> 'i')::int limit 1);
    continue when not ((z ->> 'art' = 'geaendert' and (p_zeilen is null or (z ->> 'i')::int = any (p_zeilen)))
                       or (z ->> 'art' = 'neu' and kat is not null));
    lief := imp.lieferant_id;
    if lief is null and nullif(z ->> 'lieferant', '') is not null then
      select l.id into lief from public.lieferanten l where lower(l.name) = lower(z ->> 'lieferant') limit 1;
      if lief is null then
        insert into public.lieferanten (name) values (z ->> 'lieferant') returning id into lief;
      end if;
    end if;
    art := nullif(z ->> 'artikel_id', '')::uuid;
    if z ->> 'art' = 'neu' then
      insert into public.artikel (artikelnummer, name, kategorie, hersteller_gruppe, einheit, leistung_w, bevorzugter_lieferant_id, quelle)
      values (z ->> 'artikelnummer', z ->> 'name', kat, z ->> 'hersteller', coalesce(z ->> 'einheit', 'Stk'),
              nullif(z ->> 'leistung_w', '')::int, lief, imp.quelle)
      returning id into art;
      n_n := n_n + 1;
    else
      n_g := n_g + 1;
    end if;
    update public.lieferantenpreise set ek_rappen = (z ->> 'ek_neu')::bigint, stand = current_date,
           artikelnummer = coalesce(z ->> 'artikelnummer', artikelnummer), geloescht_am = null
     where artikel_id = art and lieferant_id is not distinct from lief;
    if not found then
      insert into public.lieferantenpreise (artikel_id, lieferant_id, artikelnummer, ek_rappen, stand)
      values (art, lief, z ->> 'artikelnummer', (z ->> 'ek_neu')::bigint, current_date);
    end if;
  end loop;
  update public.preis_importe set status = 'uebernommen', erledigt_am = now(), erledigt_von = intern.mein_vorname()
   where id = imp.id;
  return jsonb_build_object('geaendert', n_g, 'neu', n_n);
end
$$;
revoke execute on function public.preis_import_uebernehmen(uuid, int[], jsonb) from public, anon;
grant execute on function public.preis_import_uebernehmen(uuid, int[], jsonb) to authenticated;

/** Eingelesene Datei verwerfen (nichts wird geändert). */
create or replace function public.preis_import_verwerfen(p_import uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('preise') then raise exception using message = 'recht.fehlt'; end if;
  update public.preis_importe set status = 'verworfen', erledigt_am = now(), erledigt_von = intern.mein_vorname()
   where id = p_import and status = 'offen';
  if not found then raise exception using message = 'preise.import_erledigt'; end if;
end
$$;
revoke execute on function public.preis_import_verwerfen(uuid) from public, anon;
grant execute on function public.preis_import_verwerfen(uuid) to authenticated;

-- Kalkulation: Varianten und Freigabe ---------------------------------------------------------------------------
alter table public.kalkulationen
  add column if not exists varianten jsonb not null default '[]',
  add column if not exists variante text,
  add column if not exists freigabe jsonb;
comment on column public.kalkulationen.varianten is 'Varianten [{id: "A", name: "Nur PV"}]; Positionen mit «varianten» gelten nur dort.';
comment on column public.kalkulationen.variante is 'Gewählte Variante für Offerte und Summen.';

/**
 * Summen einer Kalkulation wie in der App (lib/kalkulation.ts): Preis = EK × (1 + Marge) × (1 + Skonto) oder der
 * feste Preis einer Leistung; Rabatt in Prozent auf das Total. Nur Positionen der Variante.
 */
create or replace function intern.kalk_summe(p_pos jsonb, p_rabatt numeric, p_variante text) returns jsonb
language sql immutable set search_path = '' as $$
  with z as (
    select p,
           coalesce((p ->> 'menge')::numeric, 0) as menge,
           coalesce((p ->> 'ekRappen')::numeric, 0) as ek,
           coalesce((p ->> 'preisRappen')::numeric,
                    coalesce((p ->> 'ekRappen')::numeric, 0) * (1 + coalesce((p ->> 'marge')::numeric, 0))
                      * (1 + coalesce((p ->> 'skonto')::numeric, 0))) as preis
      from jsonb_array_elements(coalesce(p_pos, '[]')) p
     where p_variante is null or jsonb_typeof(p -> 'varianten') is distinct from 'array'
        or jsonb_array_length(p -> 'varianten') = 0 or (p -> 'varianten') ? p_variante
  ), s as (
    select coalesce(sum(ek * menge), 0) as ek, coalesce(sum(preis * menge), 0) as brutto,
           coalesce(sum(case when (p ->> 'wp') is not null then (p ->> 'wp')::numeric * menge end), 0) as wp,
           coalesce(sum(case when (p ->> 'wp') is not null then menge end), 0) as module
      from z
  )
  select jsonb_build_object(
    'ek', round(s.ek), 'brutto', round(s.brutto),
    'netto', round(s.brutto) - round(s.brutto * least(100, greatest(0, coalesce(p_rabatt, 0))) / 100),
    'kwp', round(s.wp / 10) / 100, 'module', s.module::int)
  from s
$$;

/** Braucht die Kalkulation eine Freigabe? Gründe: Rabatt über der Grenze, Marge einer Position oder des Totals zu tief. */
create or replace function public.kalkulation_freigabe_pruefen(p_kalk uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  k public.kalkulationen;
  c jsonb := intern.preise_cfg();
  s jsonb;
  gruende text[] := '{}';
  db numeric;
  hash text;
begin
  if not intern.hat_recht('preise') then raise exception using message = 'recht.fehlt'; end if;
  select * into k from public.kalkulationen where id = p_kalk and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  s := intern.kalk_summe(k.positionen, coalesce(k.rabatt, 0), k.variante);
  if coalesce(k.rabatt, 0) > coalesce((c ->> 'rabatt_frei_prozent')::numeric, 100) then gruende := gruende || 'rabatt'::text; end if;
  db := case when (s ->> 'netto')::numeric > 0
             then ((s ->> 'netto')::numeric - (s ->> 'ek')::numeric) / (s ->> 'netto')::numeric * 100 end;
  if db is not null and db < coalesce((c ->> 'mindest_db_prozent')::numeric, 0) then gruende := gruende || 'db'::text; end if;
  if exists (
    select 1 from jsonb_array_elements(k.positionen) p
     where (p ->> 'artikelId') is not null and (p ->> 'preisRappen') is null
       and (k.variante is null or jsonb_typeof(p -> 'varianten') is distinct from 'array'
            or jsonb_array_length(p -> 'varianten') = 0 or (p -> 'varianten') ? k.variante)
       and (p ->> 'marge')::numeric < coalesce((c -> 'kategorien' -> (p ->> 'kategorie') ->> 'mindest')::numeric, 0)
  ) then gruende := gruende || 'marge'::text; end if;
  hash := md5(coalesce(k.positionen::text, '') || '|' || coalesce(k.rabatt, 0)::text || '|' || coalesce(k.variante, ''));
  return jsonb_build_object(
    'noetig', cardinality(gruende) > 0 and not intern.preise_bin_freigeber(),
    'gruende', to_jsonb(gruende), 'db_prozent', round(db, 1), 'hash', hash,
    'freigegeben', coalesce(k.freigabe ->> 'status' = 'freigegeben' and k.freigabe ->> 'hash' = hash, false),
    'status', k.freigabe ->> 'status');
end
$$;
revoke execute on function public.kalkulation_freigabe_pruefen(uuid) from public, anon;
grant execute on function public.kalkulation_freigabe_pruefen(uuid) to authenticated;

/** Freigabe anfragen: die Geschäftsleitung bekommt eine Glocke mit Link zur Kalkulation. */
create or replace function public.kalkulation_freigabe_anfragen(p_kalk uuid, p_notiz text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  pr jsonb := public.kalkulation_freigabe_pruefen(p_kalk);
  k public.kalkulationen;
  text_de text;
begin
  if not (pr ->> 'noetig')::boolean then raise exception using message = 'preise.freigabe_unnoetig'; end if;
  select * into k from public.kalkulationen where id = p_kalk;
  update public.kalkulationen set freigabe = jsonb_build_object(
      'status', 'angefragt', 'hash', pr ->> 'hash', 'gruende', pr -> 'gruende', 'db_prozent', pr -> 'db_prozent',
      'rabatt', k.rabatt, 'von_id', intern.meine_person_id(), 'von', intern.mein_vorname(), 'am', now(),
      'notiz', nullif(trim(coalesce(p_notiz, '')), ''))
   where id = p_kalk;
  text_de := format('%s · Rabatt %s %% · Marge %s %%%s', coalesce(nullif(k.titel, ''), 'Kalkulation'),
                    coalesce(k.rabatt, 0), coalesce(pr ->> 'db_prozent', '–'),
                    coalesce(' · ' || nullif(trim(coalesce(p_notiz, '')), ''), ''));
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select x, 'warnung', 'Rabatt freigeben: ' || intern.mein_vorname(), 'Rabais à valider : ' || intern.mein_vorname(),
         text_de, text_de, '/pricing?ansicht=kalkulation&kalkulation=' || p_kalk
    from unnest(intern.preise_freigeber()) x
   where x is distinct from intern.meine_person_id();
end
$$;
revoke execute on function public.kalkulation_freigabe_anfragen(uuid, text) from public, anon;
grant execute on function public.kalkulation_freigabe_anfragen(uuid, text) to authenticated;

/** Freigeben oder ablehnen (nur Geschäftsleitung); wer gefragt hat, bekommt eine Glocke. */
create or replace function public.kalkulation_freigeben(p_kalk uuid, p_ok boolean, p_grund text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k public.kalkulationen;
begin
  if not intern.hat_recht('preise') or not intern.preise_bin_freigeber() then
    raise exception using errcode = '42501', message = 'preise.nur_freigeber';
  end if;
  select * into k from public.kalkulationen where id = p_kalk and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if coalesce(k.freigabe ->> 'status', '') <> 'angefragt' then raise exception using message = 'preise.keine_anfrage'; end if;
  if not p_ok and nullif(trim(coalesce(p_grund, '')), '') is null then raise exception using message = 'stand.grund_fehlt'; end if;
  update public.kalkulationen set freigabe = freigabe || jsonb_build_object(
      'status', case when p_ok then 'freigegeben' else 'abgelehnt' end,
      'entschieden_von', intern.mein_vorname(), 'entschieden_am', now(), 'grund', nullif(trim(coalesce(p_grund, '')), ''))
   where id = p_kalk;
  if nullif(k.freigabe ->> 'von_id', '') is not null then
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    values ((k.freigabe ->> 'von_id')::uuid, case when p_ok then 'ok' else 'kritisch' end,
            case when p_ok then 'Rabatt freigegeben' else 'Rabatt abgelehnt' end,
            case when p_ok then 'Rabais validé' else 'Rabais refusé' end,
            concat_ws(' · ', nullif(k.titel, ''), intern.mein_vorname(), nullif(trim(coalesce(p_grund, '')), '')),
            concat_ws(' · ', nullif(k.titel, ''), intern.mein_vorname(), nullif(trim(coalesce(p_grund, '')), '')),
            '/pricing?ansicht=kalkulation&kalkulation=' || p_kalk);
  end if;
end
$$;
revoke execute on function public.kalkulation_freigeben(uuid, boolean, text) from public, anon;
grant execute on function public.kalkulation_freigeben(uuid, boolean, text) to authenticated;

/**
 * Gespeicherte Kalkulation (gewählte Variante) in die Offerte übernehmen: Betrag exkl. MWST nach Rabatt, kWp, Module,
 * Wechselrichter und Batterie. Ist eine Freigabe nötig und nicht für genau diesen Stand erteilt, wird abgelehnt.
 */
create or replace function public.kalkulation_in_offerte(p_kalk uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  k public.kalkulationen;
  pr jsonb := public.kalkulation_freigabe_pruefen(p_kalk);
  s jsonb;
  namen text;
  bat text;
begin
  select * into k from public.kalkulationen where id = p_kalk;
  if k.offerte_id is null then raise exception using message = 'preise.keine_offerte'; end if;
  if (pr ->> 'noetig')::boolean and not (pr ->> 'freigegeben')::boolean then
    raise exception using message = 'preise.freigabe_noetig';
  end if;
  s := intern.kalk_summe(k.positionen, coalesce(k.rabatt, 0), k.variante);
  select string_agg(case when (p ->> 'menge')::numeric > 1 then (p ->> 'menge')::numeric::text || '× ' else '' end || (p ->> 'name'), ', ')
           filter (where p ->> 'kategorie' = 'wechselrichter'),
         string_agg(case when (p ->> 'menge')::numeric > 1 then (p ->> 'menge')::numeric::text || '× ' else '' end || (p ->> 'name'), ', ')
           filter (where p ->> 'kategorie' = 'batteriespeicher')
    into namen, bat
    from jsonb_array_elements(k.positionen) p
   where coalesce((p ->> 'menge')::numeric, 0) > 0
     and (k.variante is null or jsonb_typeof(p -> 'varianten') is distinct from 'array'
          or jsonb_array_length(p -> 'varianten') = 0 or (p -> 'varianten') ? k.variante);
  perform public.offerte_werte_setzen(k.offerte_id, jsonb_strip_nulls(jsonb_build_object(
    'betrag_rappen', s -> 'netto',
    'leistung_kwp', case when (s ->> 'kwp')::numeric > 0 then s -> 'kwp' end,
    'anzahl_module', case when (s ->> 'module')::int > 0 then s -> 'module' end,
    'wechselrichter', namen, 'batterie', bat)), 'kalkulation');
end
$$;
revoke execute on function public.kalkulation_in_offerte(uuid) from public, anon;
grant execute on function public.kalkulation_in_offerte(uuid) to authenticated;

-- Richtpreis für den Verkauf unterwegs ------------------------------------------------------------------------------
/**
 * Richtpreis aus eigenen Offerten (24 Monate) ähnlicher Grösse (±35 % kWp) mit bzw. ohne Speicher: Spanne
 * 25.–75. Perzentil des Preises je kWp × kWp, exkl. MWST. Zuerst angenommene; sind es weniger als 5, alle offerierten.
 */
create or replace function public.richtpreis(p_kwp numeric, p_speicher boolean) returns jsonb
language sql stable security definer set search_path = '' as $$
  with basis as (
    select o.status, o.betrag_rappen::numeric / o.leistung_kwp as je_kwp
      from public.offerten o
     where o.geloescht_am is null and o.betrag_rappen > 0 and o.leistung_kwp > 0
       and o.leistung_kwp between p_kwp * 0.65 and p_kwp * 1.35
       and (o.batterie is not null and o.batterie <> '') = coalesce(p_speicher, false)
       and coalesce(o.angebot_am, o.erstellt_am::date) > current_date - 730
       and o.status in ('angenommen', 'offeriert')
  ), wahl as (
    select case when (select count(*) from basis where status = 'angenommen') >= 5 then 'angenommen' else 'alle' end as art
  ), b as (
    select je_kwp from basis, wahl where wahl.art = 'alle' or basis.status = 'angenommen'
  )
  select case when not intern.hat_recht('basis') then null else jsonb_build_object(
    'anzahl', (select count(*) from b), 'basis', (select art from wahl),
    'von_rappen', round((select percentile_cont(0.25) within group (order by je_kwp) from b) * p_kwp),
    'bis_rappen', round((select percentile_cont(0.75) within group (order by je_kwp) from b) * p_kwp),
    'median_rappen', round((select percentile_cont(0.5) within group (order by je_kwp) from b) * p_kwp)) end
$$;
revoke execute on function public.richtpreis(numeric, boolean) from public, anon;
grant execute on function public.richtpreis(numeric, boolean) to authenticated;
