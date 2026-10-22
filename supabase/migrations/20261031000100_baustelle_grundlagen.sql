-- Phase 9b, Teil 1: Baustelle und Service am Handy (Entscheid 0009 und 0020).
-- Ein Rapport für alles (Montage, Service, Wartung, IBN) mit Zeiten (Start/Stopp), Mehrmaterial, Fotos,
-- Nachträgen und Unterschrift. Zeiten gehen geprüft als Datei an den AbaNinja-Lohn. Garantiefälle beim
-- Hersteller hängen am Service-Fall.

-- Rapport ---------------------------------------------------------------------------------------------------
alter table public.rapporte drop constraint if exists rapporte_art_check;
alter table public.rapporte
  add constraint rapporte_art_check check (art in ('montage', 'service', 'wartung', 'ibn')),
  add column if not exists nummer text not null default '',
  add column if not exists einsatz_id uuid references public.einsaetze (id),
  add column if not exists wartungsvertrag_id uuid references public.wartungsvertraege (id),
  add column if not exists montage_fertig boolean not null default false,
  add column if not exists verrechnung text check (verrechnung in ('garantie', 'kostenpflichtig', 'kulanz', 'vertrag')),
  add column if not exists pruefpunkte jsonb not null default '{}',
  add column if not exists notiz_intern text;
comment on column public.rapporte.material is 'Mehrmaterial [{bezeichnung, menge, einheit, artikel_id}], nicht die ganze Stückliste.';
comment on column public.rapporte.fotos is 'Nicht mehr benutzt: Fotos sind dokumente mit bezug_tabelle = rapporte (offline sicher).';
comment on column public.rapporte.unterschrift_kunde is 'Unterschrift {name, dokument_id, am} oder {ohne: Grund}.';
comment on column public.rapporte.montage_fertig is 'Montage-Rapport: «Montage abgeschlossen» setzt die Baustelle auf «IBN ausstehend».';
comment on column public.rapporte.verrechnung is 'Service/Wartung: wie verrechnet wird (Rechnung folgt in Phase 10).';
comment on column public.rapporte.pruefpunkte is 'IBN-Protokoll: {schluessel: wert} nach Einstellung ibn_pruefpunkte.';
create index if not exists rapporte_projekt_idx on public.rapporte (projekt_id) where geloescht_am is null;
create index if not exists rapporte_datum_idx on public.rapporte (datum) where geloescht_am is null;

create sequence if not exists intern.rapport_nummer;
select setval('intern.rapport_nummer', greatest(1, coalesce((select max(nullif(regexp_replace(nummer, '\D', '', 'g'), '')::int) from public.rapporte), 0)),
              exists (select 1 from public.rapporte where nummer <> ''));

/**
 * Nummer R0001 …, Person und Projekt eines neuen Rapports. Ein abgeschlossener Rapport ist fest: Er ist mit
 * der Unterschrift des Kunden bestätigt. Nur «rapport_oeffnen» (Recht preise) nimmt den Abschluss zurück.
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
        and (new.geloescht_am is not distinct from old.geloescht_am) then
    raise exception using errcode = 'P0001', message = 'baustelle.rapport_abgeschlossen';
  end if;
  return new;
end
$$;
create trigger vorbereiten before insert or update on public.rapporte
  for each row execute function intern.rapport_vorbereiten();

-- Zeiten ----------------------------------------------------------------------------------------------------
alter table public.zeiten
  add column if not exists art text not null default 'arbeit' check (art in ('arbeit', 'reise')),
  add column if not exists freigegeben_am timestamptz,
  add column if not exists freigegeben_von uuid references public.personen (id),
  add column if not exists notiz text;
comment on column public.zeiten.freigegeben_am is 'Vom Büro geprüft; erst geprüfte Zeiten gehen an den Lohn.';
comment on column public.zeiten.exportiert_am is 'In der Lohn-Datei für AbaNinja; danach unveränderlich.';
create unique index if not exists zeiten_eine_laeuft on public.zeiten (person_id) where stopp is null and geloescht_am is null;
create index if not exists zeiten_start_idx on public.zeiten (start) where geloescht_am is null;
create index if not exists zeiten_rapport_idx on public.zeiten (rapport_id) where geloescht_am is null;

-- Arbeitszeit ist persönlich: jede Person sieht ihre eigenen Zeiten; Projektleitung (preise) und Buchhaltung
-- (finanzen) sehen alle, weil sie prüfen und den Lohn machen.
drop policy if exists lesen on public.zeiten;
drop policy if exists anlegen on public.zeiten;
drop policy if exists aendern on public.zeiten;
create policy lesen on public.zeiten for select to authenticated using (
  person_id = (select intern.meine_person_id()) or (select intern.hat_recht('preise')) or (select intern.hat_recht('finanzen')));
create policy anlegen on public.zeiten for insert to authenticated with check (
  (select intern.hat_recht('basis')) and (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('preise'))));
create policy aendern on public.zeiten for update to authenticated using (
  person_id = (select intern.meine_person_id()) or (select intern.hat_recht('preise')) or (select intern.hat_recht('finanzen')))
  with check (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('preise')) or (select intern.hat_recht('finanzen')));

/** Exportierte Zeiten sind fest; geprüfte ändert nur, wer prüfen darf (die Prüfung fällt dabei weg). */
create or replace function intern.zeit_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.exportiert_am is not null and new.exportiert_am is not null then
    raise exception using errcode = 'P0001', message = 'baustelle.zeit_exportiert';
  end if;
  if old.freigegeben_am is not null and new.freigegeben_am is not null
     and (new.start, new.stopp, new.pause_min, new.person_id, new.geloescht_am)
         is distinct from (old.start, old.stopp, old.pause_min, old.person_id, old.geloescht_am) then
    if not (intern.hat_recht('preise') or intern.hat_recht('finanzen')) then
      raise exception using errcode = 'P0001', message = 'baustelle.zeit_geprueft';
    end if;
    new.freigegeben_am := null;
    new.freigegeben_von := null;
  end if;
  return new;
end
$$;
create trigger pruefen before update on public.zeiten for each row execute function intern.zeit_pruefen();

-- Nachträge -------------------------------------------------------------------------------------------------
alter table public.nachtraege
  add column if not exists nummer text not null default '',
  add column if not exists person_id uuid references public.personen (id),
  add column if not exists stunden numeric(8, 2),
  add column if not exists material jsonb not null default '[]',
  add column if not exists unterschrift_kunde jsonb,
  add column if not exists abgelehnt_grund text;
alter table public.nachtraege
  add constraint nachtraege_status_check check (status in ('offen', 'vom_kunden_bestaetigt', 'abgelehnt', 'verrechnet'));
comment on column public.nachtraege.betrag_rappen is 'Preis exkl. MWST in Rappen; setzt das Büro (Recht preise), fliesst in die Schlussrechnung (Phase 10).';
create index if not exists nachtraege_projekt_idx on public.nachtraege (projekt_id) where geloescht_am is null;

create sequence if not exists intern.nachtrag_nummer;
select setval('intern.nachtrag_nummer', greatest(1, coalesce((select max(nullif(regexp_replace(nummer, '\D', '', 'g'), '')::int) from public.nachtraege), 0)),
              exists (select 1 from public.nachtraege where nummer <> ''));

/** Nummer N001 …; den Preis setzt nur, wer Preise sehen darf; ein verrechneter Nachtrag ist fest. */
create or replace function intern.nachtrag_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.nummer, '') = '' then
      new.nummer := 'N' || lpad(nextval('intern.nachtrag_nummer')::text, 3, '0');
    end if;
    new.person_id := coalesce(new.person_id, intern.meine_person_id());
  elsif old.status = 'verrechnet' and new.geloescht_am is not distinct from old.geloescht_am then
    raise exception using errcode = 'P0001', message = 'baustelle.nachtrag_verrechnet';
  end if;
  if new.betrag_rappen is distinct from (case when tg_op = 'INSERT' then null else old.betrag_rappen end)
     and not intern.hat_recht('preise') then
    raise exception using errcode = 'P0001', message = 'baustelle.nachtrag_preis';
  end if;
  return new;
end
$$;
create trigger vorbereiten before insert or update on public.nachtraege
  for each row execute function intern.nachtrag_vorbereiten();

-- Garantiefall beim Hersteller ------------------------------------------------------------------------------
-- Defekte Komponente zurück an den Hersteller: gemeldet, eingeschickt, Ersatz erhalten, Gutschrift.
create table public.garantiefaelle (
  id               uuid primary key default gen_random_uuid(),
  service_fall_id  uuid references public.service_faelle (id),
  anlage_id        uuid references public.anlagen (id),
  hersteller       text not null,
  komponente       text not null,
  seriennummer     text,
  rma_nummer       text,
  status           text not null default 'offen'
                   check (status in ('offen', 'gemeldet', 'eingeschickt', 'ersatz_erhalten', 'abgeschlossen', 'abgelehnt')),
  gemeldet_am      date,
  eingeschickt_am  date,
  ersatz_am        date,
  gutschrift_rappen bigint,
  abgeschlossen_am date,
  notiz            text
);
select intern.richte_fachtabelle_ein('garantiefaelle');
create index garantiefaelle_fall_idx on public.garantiefaelle (service_fall_id) where geloescht_am is null;

/** Datum je Schritt setzt sich mit dem Status (von Hand überschreibbar). */
create or replace function intern.garantiefall_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from (case when tg_op = 'INSERT' then null else old.status end) then
    case new.status
      when 'gemeldet' then new.gemeldet_am := coalesce(new.gemeldet_am, current_date);
      when 'eingeschickt' then new.eingeschickt_am := coalesce(new.eingeschickt_am, current_date);
      when 'ersatz_erhalten' then new.ersatz_am := coalesce(new.ersatz_am, current_date);
      when 'abgeschlossen' then new.abgeschlossen_am := coalesce(new.abgeschlossen_am, current_date);
      else null;
    end case;
  end if;
  return new;
end
$$;
create trigger vorbereiten before insert or update on public.garantiefaelle
  for each row execute function intern.garantiefall_vorbereiten();

-- Auswahllisten und Einstellungen ---------------------------------------------------------------------------
insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe) values
  ('rapportart', 'montage', 'Montage', 'Montage', 10, 'marke'),
  ('rapportart', 'service', 'Service', 'Service', 20, 'warn'),
  ('rapportart', 'wartung', 'Wartung', 'Maintenance', 30, 'info'),
  ('rapportart', 'ibn', 'Inbetriebnahme (IBN)', 'Mise en service (MES)', 40, 'ok'),
  ('verrechnung', 'garantie', 'Garantie (gratis)', 'Garantie (gratuit)', 10, 'ok'),
  ('verrechnung', 'kostenpflichtig', 'Kostenpflichtig', 'Payant', 20, 'warn'),
  ('verrechnung', 'kulanz', 'Kulanz (gratis)', 'Geste commercial (gratuit)', 30, 'info'),
  ('verrechnung', 'vertrag', 'Im Wartungsvertrag', 'Inclus dans le contrat', 40, 'neutral'),
  ('nachtragstatus', 'offen', 'Offen', 'Ouvert', 10, 'warn'),
  ('nachtragstatus', 'vom_kunden_bestaetigt', 'Vom Kunden bestätigt', 'Confirmé par le client', 20, 'ok'),
  ('nachtragstatus', 'abgelehnt', 'Abgelehnt', 'Refusé', 30, 'neutral'),
  ('nachtragstatus', 'verrechnet', 'Verrechnet', 'Facturé', 40, 'info'),
  ('garantiestatus', 'offen', 'Offen', 'Ouvert', 10, 'warn'),
  ('garantiestatus', 'gemeldet', 'Beim Hersteller gemeldet', 'Annoncé au fabricant', 20, 'info'),
  ('garantiestatus', 'eingeschickt', 'Eingeschickt', 'Renvoyé', 30, 'info'),
  ('garantiestatus', 'ersatz_erhalten', 'Ersatz erhalten', 'Remplacement reçu', 40, 'marke'),
  ('garantiestatus', 'abgeschlossen', 'Abgeschlossen', 'Clôturé', 50, 'ok'),
  ('garantiestatus', 'abgelehnt', 'Vom Hersteller abgelehnt', 'Refusé par le fabricant', 60, 'kritisch'),
  ('zeitart', 'arbeit', 'Arbeit', 'Travail', 10, 'marke'),
  ('zeitart', 'reise', 'Reise', 'Déplacement', 20, 'info')
on conflict (liste, schluessel) do nothing;

-- IBN-Protokoll: Prüfpunkte als Daten (Regel 8). art: ja_nein oder wert (mit Einheit).
insert into public.einstellungen (schluessel, wert) values ('ibn_pruefpunkte', $j$[
  {"schluessel": "sichtpruefung", "de": "Sichtprüfung Module, Befestigung, Kabelführung", "fr": "Contrôle visuel modules, fixations, câbles", "art": "ja_nein"},
  {"schluessel": "leerlaufspannung", "de": "Leerlaufspannung je String", "fr": "Tension à vide par string", "art": "wert", "einheit": "V"},
  {"schluessel": "kurzschlussstrom", "de": "Kurzschlussstrom je String", "fr": "Courant de court-circuit par string", "art": "wert", "einheit": "A"},
  {"schluessel": "isolation", "de": "Isolationswiderstand", "fr": "Résistance d’isolement", "art": "wert", "einheit": "MΩ"},
  {"schluessel": "erdung", "de": "Erdung und Potentialausgleich geprüft", "fr": "Mise à terre et liaison équipotentielle contrôlées", "art": "ja_nein"},
  {"schluessel": "wechselrichter", "de": "Wechselrichter nach Vorgaben Netzbetreiber eingestellt", "fr": "Onduleur réglé selon le gestionnaire de réseau", "art": "ja_nein"},
  {"schluessel": "batterie", "de": "Batterie geladen und Notstrom geprüft", "fr": "Batterie chargée et secours testé", "art": "ja_nein"},
  {"schluessel": "monitoring", "de": "Monitoring eingerichtet und Kunde eingeladen", "fr": "Monitoring configuré et client invité", "art": "ja_nein"},
  {"schluessel": "instruktion", "de": "Kunde instruiert (Bedienung, Abschalten, Notfall)", "fr": "Client instruit (utilisation, arrêt, urgence)", "art": "ja_nein"}
]$j$::jsonb)
on conflict (schluessel) do nothing;

-- Sichten ---------------------------------------------------------------------------------------------------

/** Rapporte mit Projekt, Kunde, Person, Stunden, Fotos und offenen Nachträgen (Büro-Liste und Handy). */
create or replace view public.rapporte_liste with (security_invoker = true) as
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
       (select count(*) from public.nachtraege n where n.rapport_id = r.id and n.geloescht_am is null)::int as nachtraege_anzahl
  from public.rapporte r
  left join public.projekte p on p.id = r.projekt_id
  left join public.kontakte k on k.id = p.kontakt_id
  left join public.objekte o on o.id = p.objekt_id
  left join public.personen pe on pe.id = r.person_id
  left join public.service_faelle f on f.id = r.service_fall_id
 where r.geloescht_am is null;

/** Zeiten mit Person, Projekt und Stunden (Ortszeit Schweiz), für Prüfung und Lohn-Export. */
create or replace view public.zeiten_liste with (security_invoker = true) as
select z.*,
       pe.name as person, pe.kuerzel as person_kuerzel,
       p.nummer as projekt_nummer,
       r.nummer as rapport_nummer,
       (z.start at time zone 'Europe/Zurich')::date as tag,
       case when z.stopp is null then null
            else round((extract(epoch from (z.stopp - z.start)) / 3600.0 - z.pause_min / 60.0)::numeric, 2) end as stunden
  from public.zeiten z
  join public.personen pe on pe.id = z.person_id
  left join public.projekte p on p.id = z.projekt_id
  left join public.rapporte r on r.id = z.rapport_id
 where z.geloescht_am is null;

/** Nachträge mit Projekt, Kunde und Rapport. */
create or replace view public.nachtraege_liste with (security_invoker = true) as
select n.*,
       p.nummer as projekt_nummer,
       coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma) as kunde,
       r.nummer as rapport_nummer,
       pe.name as person
  from public.nachtraege n
  join public.projekte p on p.id = n.projekt_id
  left join public.kontakte k on k.id = p.kontakt_id
  left join public.rapporte r on r.id = n.rapport_id
  left join public.personen pe on pe.id = n.person_id
 where n.geloescht_am is null;

grant select on public.rapporte_liste, public.zeiten_liste, public.nachtraege_liste to authenticated;
