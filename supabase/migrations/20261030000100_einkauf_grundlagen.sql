-- Phase 9a, Teil 1: Einkauf und Material (Entscheid 0009 und 0019).
-- Material je Projekt, Bestellungen B0001 … mit Freigabe, Lager nur in Bulle (Lagerorte bleiben Daten).
-- Bestellungen enthalten Einkaufspreise und sind deshalb nur mit Recht «preise» sichtbar.

-- Materialliste eines Projekts (Stückliste). «reserviert» liegt im Lager und ist für das Projekt gehalten,
-- «entnommen» ist aus dem Lager an die Baustelle gegangen. Bestellt und direkt geliefert rechnet die Sicht.
create table public.projekt_material (
  id          uuid primary key default gen_random_uuid(),
  projekt_id  uuid not null references public.projekte (id),
  artikel_id  uuid references public.artikel (id),
  bezeichnung text not null,
  menge       numeric(12, 3) not null check (menge >= 0),
  einheit     text not null default 'Stk',
  quelle      text not null default 'hand' check (quelle in ('kalkulation', 'offerte', 'hand')),
  reserviert  numeric(12, 3) not null default 0 check (reserviert >= 0),
  entnommen   numeric(12, 3) not null default 0 check (entnommen >= 0),
  reihenfolge int not null default 0,
  notiz       text
);
select intern.richte_fachtabelle_ein('projekt_material');
create index projekt_material_projekt_idx on public.projekt_material (projekt_id) where geloescht_am is null;

alter table public.bestellpositionen
  add column if not exists projekt_material_id uuid references public.projekt_material (id),
  add column if not exists artikelnummer text,
  add column if not exists reihenfolge int not null default 0;
create index if not exists bestellpositionen_bestellung_idx on public.bestellpositionen (bestellung_id) where geloescht_am is null;
create index if not exists bestellpositionen_material_idx on public.bestellpositionen (projekt_material_id) where geloescht_am is null;

alter table public.bestellungen
  add column if not exists storniert_grund text,
  add column if not exists geliefert_am date;
alter table public.bestellungen alter column nummer set default '';
alter table public.bestellungen
  add constraint bestellungen_status_check
  check (status in ('entwurf', 'freigegeben', 'bestellt', 'teilgeliefert', 'geliefert', 'storniert'));
create index if not exists bestellungen_projekt_idx on public.bestellungen (projekt_id) where geloescht_am is null;

alter table public.lieferanten
  add column if not exists sprache text not null default 'de' check (sprache in ('de', 'fr')),
  add column if not exists telefon text;
comment on column public.lieferanten.sprache is 'Sprache der Bestellung (Mail und PDF).';

-- Einkaufspreise nur mit Recht «preise» (wie lieferantenpreise, Entscheid 0019).
do $$
declare t text;
begin
  foreach t in array array['bestellungen', 'bestellpositionen'] loop
    execute format('drop policy lesen on public.%I', t);
    execute format('drop policy anlegen on public.%I', t);
    execute format('drop policy aendern on public.%I', t);
    execute format('create policy lesen on public.%I for select to authenticated using ((select intern.hat_recht(%L)))', t, 'preise');
    execute format('create policy anlegen on public.%I for insert to authenticated with check ((select intern.hat_recht(%L)))', t, 'preise');
    execute format('create policy aendern on public.%I for update to authenticated using ((select intern.hat_recht(%L))) with check ((select intern.hat_recht(%L)))', t, 'preise', 'preise');
  end loop;
end
$$;

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe) values
  ('bestellstatus', 'entwurf', 'Entwurf', 'Brouillon', 10, 'neutral'),
  ('bestellstatus', 'freigegeben', 'Freigegeben', 'Validée', 20, 'info'),
  ('bestellstatus', 'bestellt', 'Bestellt', 'Commandée', 30, 'marke'),
  ('bestellstatus', 'teilgeliefert', 'Teilweise geliefert', 'Livrée en partie', 40, 'warn'),
  ('bestellstatus', 'geliefert', 'Geliefert', 'Livrée', 50, 'ok'),
  ('bestellstatus', 'storniert', 'Storniert', 'Annulée', 60, 'neutral')
on conflict (liste, schluessel) do nothing;

-- Laufende Nummer B0001 …
create sequence if not exists intern.bestell_nummer;
select setval('intern.bestell_nummer', greatest(1, coalesce((select max(nullif(regexp_replace(nummer, '\D', '', 'g'), '')::int) from public.bestellungen), 0)),
              exists (select 1 from public.bestellungen));

/** Nummer einer neuen Bestellung; Positionen und Lieferant lassen sich nur im Entwurf ändern. */
create or replace function intern.bestellung_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.nummer, '') = '' then
      new.nummer := 'B' || lpad(nextval('intern.bestell_nummer')::text, 4, '0');
    end if;
  elsif old.status <> 'entwurf' and new.lieferant_id is distinct from old.lieferant_id then
    raise exception using errcode = 'P0001', message = 'einkauf.nicht_entwurf';
  end if;
  return new;
end
$$;
create trigger vorbereiten before insert or update on public.bestellungen
  for each row execute function intern.bestellung_vorbereiten();

/**
 * Positionen nur im Entwurf anlegen oder ändern (ausser der gelieferten Menge beim Wareneingang),
 * danach das Total der Bestellung neu rechnen.
 */
create or replace function intern.bestellposition_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_bestellung uuid := coalesce(new.bestellung_id, old.bestellung_id);
begin
  select status into v_status from public.bestellungen where id = v_bestellung;
  if v_status <> 'entwurf' and (tg_op = 'INSERT'
      or (new.menge, new.ek_rappen, new.artikel_id, new.bezeichnung, new.geloescht_am)
         is distinct from (old.menge, old.ek_rappen, old.artikel_id, old.bezeichnung, old.geloescht_am)) then
    raise exception using errcode = 'P0001', message = 'einkauf.nicht_entwurf';
  end if;
  return new;
end
$$;
create trigger pruefen before insert or update on public.bestellpositionen
  for each row execute function intern.bestellposition_pruefen();

create or replace function intern.bestellung_total() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.bestellungen b
     set total_rappen = (select sum(round(p.menge * p.ek_rappen))::bigint from public.bestellpositionen p
                          where p.bestellung_id = b.id and p.geloescht_am is null)
   where b.id = new.bestellung_id;
  return null;
end
$$;
create trigger total after insert or update on public.bestellpositionen
  for each row execute function intern.bestellung_total();

-- Sichten (mit den Rechten der aufrufenden Person).

/** Bestellungen mit Lieferant, Projekt, Lieferziel, Lieferstand und dem Stand der Bestell-Mail. */
create or replace view public.bestellungen_liste with (security_invoker = true) as
select b.id, b.nummer, b.status, b.lieferant_id, b.projekt_id, b.lagerort_id, b.liefertermin, b.bestellt_am,
       b.geliefert_am, b.freigegeben_am, b.total_rappen, b.notiz, b.storniert_grund, b.erstellt_am,
       l.name as lieferant, l.email_bestellung, l.sprache as lieferant_sprache, l.kundennummer_bei_lieferant,
       pr.nummer as projekt_nummer, pr.titel as projekt_titel,
       coalesce(nullif(k.firma, ''), concat_ws(' ', k.vorname, k.nachname)) as kunde,
       o.strasse as objekt_strasse, o.plz as objekt_plz, o.ort as objekt_ort,
       lo.name as lagerort, lo.adresse as lagerort_adresse,
       fp.name as freigegeben_von,
       (select count(*) from public.bestellpositionen p where p.bestellung_id = b.id and p.geloescht_am is null) as positionen,
       (select coalesce(sum(p.menge), 0) from public.bestellpositionen p where p.bestellung_id = b.id and p.geloescht_am is null) as menge_total,
       (select coalesce(sum(least(p.geliefert_menge, p.menge)), 0) from public.bestellpositionen p where p.bestellung_id = b.id and p.geloescht_am is null) as menge_geliefert,
       (b.status in ('bestellt', 'teilgeliefert') and b.liefertermin < current_date) as ueberfaellig,
       (select a.status from public.ausgangskorb a where a.bezug_tabelle = 'bestellungen' and a.bezug_id = b.id
           and a.geloescht_am is null order by a.erstellt_am desc limit 1) as mail_status
  from public.bestellungen b
  join public.lieferanten l on l.id = b.lieferant_id
  left join public.projekte pr on pr.id = b.projekt_id
  left join public.kontakte k on k.id = pr.kontakt_id
  left join public.objekte o on o.id = pr.objekt_id
  left join public.lagerorte lo on lo.id = b.lagerort_id
  left join public.personen fp on fp.id = b.freigegeben_von
 where b.geloescht_am is null;

/** Lagerbestand je Lagerort und Artikel: frei = Bestand minus reserviert, dazu offene Lager-Bestellungen. */
create or replace view public.lager_uebersicht with (security_invoker = true) as
select lb.id, lb.lagerort_id, lo.name as lagerort, lb.artikel_id, a.name as artikel, a.artikelnummer, a.kategorie,
       a.einheit, lb.menge, lb.reserviert, lb.menge - lb.reserviert as frei, lb.mindestmenge,
       coalesce((select sum(greatest(p.menge - p.geliefert_menge, 0)) from public.bestellpositionen p
                   join public.bestellungen b on b.id = p.bestellung_id
                  where p.artikel_id = lb.artikel_id and b.lagerort_id = lb.lagerort_id and p.geloescht_am is null
                    and b.geloescht_am is null and b.status in ('entwurf', 'freigegeben', 'bestellt', 'teilgeliefert')), 0) as unterwegs,
       (lb.mindestmenge is not null and lb.menge - lb.reserviert < lb.mindestmenge) as unter_mindest,
       lb.geaendert_am
  from public.lagerbestand lb
  join public.lagerorte lo on lo.id = lb.lagerort_id
  join public.artikel a on a.id = lb.artikel_id
 where lb.geloescht_am is null;

/**
 * Materialliste je Projekt mit Deckung: vorhanden = reserviert + entnommen + direkt auf die Baustelle geliefert,
 * unterwegs = bestellt und noch nicht geliefert, fehlt = was weder da noch bestellt ist.
 */
create or replace view public.projekt_material_stand with (security_invoker = true) as
with z as (
  select m.*,
         coalesce((select sum(greatest(p.menge - p.geliefert_menge, 0)) from public.bestellpositionen p
                     join public.bestellungen b on b.id = p.bestellung_id
                    where p.projekt_material_id = m.id and p.geloescht_am is null and b.geloescht_am is null
                      and b.status in ('entwurf', 'freigegeben', 'bestellt', 'teilgeliefert')), 0) as unterwegs,
         coalesce((select sum(p.geliefert_menge) from public.bestellpositionen p
                     join public.bestellungen b on b.id = p.bestellung_id
                    where p.projekt_material_id = m.id and p.geloescht_am is null and b.geloescht_am is null
                      and b.lagerort_id is null), 0) as direkt_geliefert
    from public.projekt_material m
   where m.geloescht_am is null
)
select z.id, z.projekt_id, z.artikel_id, z.bezeichnung, z.menge, z.einheit, z.quelle, z.reserviert, z.entnommen,
       z.reihenfolge, z.notiz, a.artikelnummer, a.kategorie, z.unterwegs, z.direkt_geliefert,
       z.reserviert + z.entnommen + z.direkt_geliefert as vorhanden,
       greatest(z.menge - z.reserviert - z.entnommen - z.direkt_geliefert - z.unterwegs, 0) as fehlt,
       coalesce((select sum(lb.menge - lb.reserviert) from public.lagerbestand lb
                  where lb.artikel_id = z.artikel_id and lb.geloescht_am is null), 0) as frei_im_lager
  from z
  left join public.artikel a on a.id = z.artikel_id;

grant select on public.bestellungen_liste, public.lager_uebersicht, public.projekt_material_stand to authenticated;
