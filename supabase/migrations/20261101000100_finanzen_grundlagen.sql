-- Phase 10, Teil 1: Rechnungen, Zahlungen, Lieferantenrechnungen je Projekt, Spesen und Firmenangaben
-- (Entscheid 0009 und 0021). Rechnungen entstehen im CRM (aus dem Zahlungsplan, als Schlussrechnung mit
-- Nachträgen, aus einem Service-Rapport oder frei) und gehen als Entwurf an AbaNinja (QR-Rechnung, Versand
-- und Buchhaltung dort); ein eigenes PDF mit QR-Teil bleibt als Rückfall. Alles nur mit Recht «finanzen».

-- Firmenangaben je Standort (V233 «Rechnungseinstellungen»): Bank, IBAN, Kontakt, Zahlungsfrist -----------------
alter table public.firmen
  add column if not exists iban text,
  add column if not exists bank text,
  add column if not exists telefon text,
  add column if not exists email text,
  add column if not exists zahlungsfrist_tage int not null default 30 check (zahlungsfrist_tage between 0 and 120);
comment on column public.firmen.iban is 'IBAN für Rechnungen und den QR-Zahlteil (normale IBAN, keine QR-IBAN).';

-- Rechnung ---------------------------------------------------------------------------------------------------
create table public.rechnungen (
  id                 uuid primary key default gen_random_uuid(),
  nummer             text unique,                      -- R2026-001, erst beim Stellen
  art                text not null check (art in ('anzahlung', 'teilzahlung', 'schluss', 'service', 'wartung', 'frei')),
  status             text not null default 'entwurf'
                     check (status in ('entwurf', 'gestellt', 'teilbezahlt', 'bezahlt', 'storniert')),
  kontakt_id         uuid not null references public.kontakte (id),
  projekt_id         uuid references public.projekte (id),
  zahlungsplan_id    uuid references public.zahlungsplan (id),
  rapport_id         uuid references public.rapporte (id),
  service_fall_id    uuid references public.service_faelle (id),
  wartungsvertrag_id uuid references public.wartungsvertraege (id),
  firma_id           uuid not null references public.firmen (id),
  sprache            text not null default 'de' check (sprache in ('de', 'fr')),
  titel              text not null,
  datum              date,
  faellig_am         date,
  inkl_mwst          boolean not null default false,   -- Preise der Positionen inkl. MWST (Werkvertrag)
  mwst_satz          numeric(5, 2) not null default public.mwst_satz(),
  positionen         jsonb not null default '[]',      -- [{text, menge, einheit, preis_rappen, bezug, bezug_id}]
  netto_rappen       bigint not null default 0,
  mwst_rappen        bigint not null default 0,
  total_rappen       bigint not null default 0,
  bezahlt_rappen     bigint not null default 0,
  bezahlt_am         date,
  mahnstufe          int not null default 0 check (mahnstufe between 0 and 3),
  gemahnt_am         date,
  mahnfrist          date,
  abaninja_uuid      text unique,
  abaninja_nummer    text,
  abaninja_status    text,
  abaninja_offen_rappen bigint,
  abaninja_abgeglichen_am timestamptz,
  dokument_id        uuid references public.dokumente (id),
  notiz              text,
  storniert_grund    text
);
select intern.richte_fachtabelle_ein('rechnungen', 'finanzen');
create index rechnungen_projekt_idx on public.rechnungen (projekt_id) where geloescht_am is null;
create index rechnungen_kontakt_idx on public.rechnungen (kontakt_id) where geloescht_am is null;
comment on column public.rechnungen.positionen is
  'Zeilen [{text, menge, einheit, preis_rappen, bezug (nachtrag|rechnung|zeit|material), bezug_id}]; Abzüge negativ.';

/** Summen aus den Positionen, offener Betrag und Stand nach Zahlungen; gestellte Rechnungen sind fest. */
create or replace function intern.rechnung_rechnen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_summe numeric := 0;
begin
  if tg_op = 'UPDATE' and old.status <> 'entwurf'
     and (new.positionen, new.inkl_mwst, new.mwst_satz, new.kontakt_id, new.firma_id)
         is distinct from (old.positionen, old.inkl_mwst, old.mwst_satz, old.kontakt_id, old.firma_id) then
    raise exception using errcode = 'P0001', message = 'finanzen.rechnung_gestellt';
  end if;
  select coalesce(sum(round(coalesce((x ->> 'menge')::numeric, 1) * coalesce((x ->> 'preis_rappen')::numeric, 0))), 0)
    into v_summe from jsonb_array_elements(new.positionen) x;
  if new.inkl_mwst then
    new.total_rappen := v_summe;
    new.netto_rappen := round(v_summe / (1 + new.mwst_satz / 100));
    new.mwst_rappen := new.total_rappen - new.netto_rappen;
  else
    new.netto_rappen := v_summe;
    new.mwst_rappen := round(v_summe * new.mwst_satz / 100);
    new.total_rappen := new.netto_rappen + new.mwst_rappen;
  end if;
  return new;
end
$$;
create trigger rechnen before insert or update on public.rechnungen
  for each row execute function intern.rechnung_rechnen();

-- Zahlungen auf Rechnungen (von Hand oder aus dem Abgleich mit AbaNinja) --------------------------------------
create table public.rechnung_zahlungen (
  id            uuid primary key default gen_random_uuid(),
  rechnung_id   uuid not null references public.rechnungen (id),
  datum         date not null default current_date,
  betrag_rappen bigint not null check (betrag_rappen <> 0),
  quelle        text not null default 'hand' check (quelle in ('hand', 'abaninja')),
  notiz         text
);
select intern.richte_fachtabelle_ein('rechnung_zahlungen', 'finanzen');
create index rechnung_zahlungen_rechnung_idx on public.rechnung_zahlungen (rechnung_id) where geloescht_am is null;

/**
 * Nach jeder Zahlung: bezahlter Betrag, Stand (teilbezahlt/bezahlt) und Bezahlt-Datum der Rechnung, dazu das
 * Bezahlt-Datum der Tranche im Zahlungsplan (davon leben die Fahrplan-Schritte «Anzahlung» und «Schluss»).
 */
create or replace function intern.zahlung_verbuchen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := coalesce(new.rechnung_id, old.rechnung_id);
  v_bezahlt bigint;
  v_datum date;
  r public.rechnungen;
begin
  select coalesce(sum(betrag_rappen), 0), max(datum) into v_bezahlt, v_datum
    from public.rechnung_zahlungen where rechnung_id = v_id and geloescht_am is null;
  select * into r from public.rechnungen where id = v_id;
  if r.status in ('entwurf', 'storniert') then
    raise exception using errcode = 'P0001', message = 'finanzen.nicht_gestellt';
  end if;
  update public.rechnungen
     set bezahlt_rappen = v_bezahlt,
         status = case when v_bezahlt >= r.total_rappen then 'bezahlt' when v_bezahlt > 0 then 'teilbezahlt' else 'gestellt' end,
         bezahlt_am = case when v_bezahlt >= r.total_rappen then v_datum end
   where id = v_id;
  if r.zahlungsplan_id is not null then
    update public.zahlungsplan set bezahlt_am = case when v_bezahlt >= r.total_rappen then v_datum end
     where id = r.zahlungsplan_id;
  end if;
  return null;
end
$$;
create trigger verbuchen after insert or update or delete on public.rechnung_zahlungen
  for each row execute function intern.zahlung_verbuchen();

-- Lieferantenrechnungen aus AbaNinja (Belege) werden zu Kreditor-Zahlungen mit Projekt ---------------------------
alter table public.kreditor_zahlungen
  add column if not exists abaninja_uuid text unique,
  add column if not exists projekt_id uuid references public.projekte (id),
  add column if not exists lieferant_id uuid references public.lieferanten (id),
  add column if not exists offen_rappen bigint,
  add column if not exists bezahlt_am date;
create index if not exists kreditor_zahlungen_projekt_idx on public.kreditor_zahlungen (projekt_id) where geloescht_am is null;
comment on column public.kreditor_zahlungen.projekt_id is 'Lieferantenrechnung gehört zu diesem Projekt (Nachkalkulation).';

-- Spesen: jede Person sieht ihre eigenen, Buchhaltung (finanzen) alle -----------------------------------------
alter table public.spesen alter column status set default 'eingereicht';
alter table public.spesen drop constraint if exists spesen_status_check;
alter table public.spesen add constraint spesen_status_check check (status in ('eingereicht', 'ausbezahlt', 'storniert'));
alter table public.spesen add column if not exists storniert_grund text;
drop policy if exists lesen on public.spesen;
drop policy if exists anlegen on public.spesen;
drop policy if exists aendern on public.spesen;
create policy lesen on public.spesen for select to authenticated using (
  person_id = (select intern.meine_person_id()) or (select intern.hat_recht('finanzen')));
create policy anlegen on public.spesen for insert to authenticated with check (
  (select intern.hat_recht('basis')) and person_id = (select intern.meine_person_id()));
create policy aendern on public.spesen for update to authenticated using (
  person_id = (select intern.meine_person_id()) or (select intern.hat_recht('finanzen')));

/** Spesen: nur eingereichte ändert die Person selbst; ausbezahlt setzt nur die Buchhaltung, danach fest. */
create or replace function intern.spesen_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status in ('ausbezahlt', 'storniert') and new.geloescht_am is not distinct from old.geloescht_am then
    raise exception using errcode = 'P0001', message = 'finanzen.spesen_fest';
  end if;
  if new.status = 'ausbezahlt' and not intern.hat_recht('finanzen') then
    raise exception using errcode = 'P0001', message = 'finanzen.kein_recht';
  end if;
  return new;
end
$$;
create trigger pruefen before update on public.spesen for each row execute function intern.spesen_pruefen();

-- Einstellungen: Stundensätze, Mahnfrist, Spesen-Kategorien ----------------------------------------------------
insert into public.einstellungen (schluessel, wert) values ('finanzen', $j${
  "service_stundensatz_rappen": 12000,
  "intern_stundensatz_rappen": 6500,
  "mahnfrist_tage": 10,
  "buchhaltung_email": null,
  "spesen_kategorien": [
    {"schluessel": "Fahrt / Kilometer", "de": "Fahrt / Kilometer", "fr": "Déplacement / kilomètres"},
    {"schluessel": "Verpflegung", "de": "Verpflegung", "fr": "Repas"},
    {"schluessel": "Material", "de": "Material", "fr": "Matériel"},
    {"schluessel": "Parkieren", "de": "Parkieren", "fr": "Parking"},
    {"schluessel": "Übernachtung", "de": "Übernachtung", "fr": "Nuitée"},
    {"schluessel": "Sonstiges", "de": "Sonstiges", "fr": "Divers"}
  ]
}$j$::jsonb)
on conflict (schluessel) do nothing;
