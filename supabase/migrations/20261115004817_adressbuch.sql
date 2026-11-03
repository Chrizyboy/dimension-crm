-- Adressbuch neu (Entscheid 0049, Chris 03.11.2026: nur Geschäftspartner, ElCom-Verzeichnis, UID-Register,
-- Provision mit Aufgabe). Ein Kontakt kann mehrere Partner-Rollen haben; jede Rolle bringt ihre Felder mit
-- (Felder als Daten in auswahlwerte 'partnerrolle', Regel 8). Dazu Postadresse, Nachweise mit Ablauf,
-- Netzbetreiber je Gemeinde (ElCom) und die Provision für Vermittler.

-- 1. Rollen mit ihren Feldern -------------------------------------------------------------------------------
-- Feldtypen: text, lang (mehrzeilig), url, email, telefon, zahl, prozent, chf (Rappen), datum.
insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe, eigenschaften) values
  ('partnerrolle', 'netzbetreiber', 'Netzbetreiber', 'Gestionnaire de réseau', 10, 'info', jsonb_build_object('felder', jsonb_build_array(
    jsonb_build_object('k', 'einreichung', 't', 'text', 'de', 'So reichen wir ein', 'fr', 'Mode de dépôt'),
    jsonb_build_object('k', 'portal_url', 't', 'url', 'de', 'Portal', 'fr', 'Portail'),
    jsonb_build_object('k', 'unterlagen', 't', 'lang', 'de', 'Unterlagen fürs Gesuch', 'fr', 'Documents pour la demande'),
    jsonb_build_object('k', 'nach_ibn', 't', 'lang', 'de', 'Nach der Inbetriebnahme', 'fr', 'Après la mise en service'),
    jsonb_build_object('k', 'antwort_tage', 't', 'zahl', 'de', 'Antwort üblich (Arbeitstage)', 'fr', 'Réponse habituelle (jours ouvrables)'),
    jsonb_build_object('k', 'zaehler', 't', 'text', 'de', 'Zähler', 'fr', 'Compteur'),
    jsonb_build_object('k', 'tarif_url', 't', 'url', 'de', 'Rückliefertarif', 'fr', 'Tarif de reprise')))),
  ('partnerrolle', 'lieferant', 'Lieferant', 'Fournisseur', 20, 'marke', jsonb_build_object('felder', jsonb_build_array(
    jsonb_build_object('k', 'kundennummer', 't', 'text', 'de', 'Unsere Kundennummer', 'fr', 'Notre numéro client'),
    jsonb_build_object('k', 'bestell_email', 't', 'email', 'de', 'Bestell-Mail', 'fr', 'E-mail de commande'),
    jsonb_build_object('k', 'bestellschluss', 't', 'text', 'de', 'Bestellschluss', 'fr', 'Heure limite de commande'),
    jsonb_build_object('k', 'lieferung', 't', 'text', 'de', 'Lieferung', 'fr', 'Livraison'),
    jsonb_build_object('k', 'mindestwert', 't', 'chf', 'de', 'Mindestbestellwert', 'fr', 'Commande minimale'),
    jsonb_build_object('k', 'zahlung', 't', 'text', 'de', 'Zahlungsbedingung', 'fr', 'Conditions de paiement'),
    jsonb_build_object('k', 'shop_url', 't', 'url', 'de', 'Shop (Login nicht im CRM)', 'fr', 'Boutique (login hors CRM)'),
    jsonb_build_object('k', 'marken', 't', 'text', 'de', 'Liefert Marken', 'fr', 'Marques livrées')))),
  ('partnerrolle', 'hersteller', 'Hersteller', 'Fabricant', 30, null, jsonb_build_object('felder', jsonb_build_array(
    jsonb_build_object('k', 'hotline', 't', 'telefon', 'de', 'Service-Hotline', 'fr', 'Hotline service'),
    jsonb_build_object('k', 'garantie_url', 't', 'url', 'de', 'Garantie-/RMA-Portal', 'fr', 'Portail garantie / RMA'),
    jsonb_build_object('k', 'garantie_jahre', 't', 'zahl', 'de', 'Garantie (Jahre)', 'fr', 'Garantie (années)'),
    jsonb_build_object('k', 'rma_ablauf', 't', 'lang', 'de', 'So läuft ein Garantiefall', 'fr', 'Déroulement d’un cas de garantie'),
    jsonb_build_object('k', 'marken', 't', 'text', 'de', 'Marken, Produkte', 'fr', 'Marques, produits')))),
  ('partnerrolle', 'subunternehmer', 'Subunternehmer', 'Sous-traitant', 40, 'ok', jsonb_build_object('felder', jsonb_build_array(
    jsonb_build_object('k', 'gewerk', 't', 'text', 'de', 'Gewerk', 'fr', 'Corps de métier'),
    jsonb_build_object('k', 'einsatzgebiet', 't', 'text', 'de', 'Einsatzgebiet', 'fr', 'Zone d’intervention'),
    jsonb_build_object('k', 'vorlauf', 't', 'text', 'de', 'Vorlauf', 'fr', 'Délai'),
    jsonb_build_object('k', 'preise', 't', 'lang', 'de', 'Preise', 'fr', 'Prix'),
    jsonb_build_object('k', 'zahlung', 't', 'text', 'de', 'Zahlungsbedingung', 'fr', 'Conditions de paiement')))),
  ('partnerrolle', 'gemeinde', 'Gemeinde & Behörde', 'Commune & autorité', 50, null, jsonb_build_object('felder', jsonb_build_array(
    jsonb_build_object('k', 'abteilung', 't', 'text', 'de', 'Abteilung', 'fr', 'Service'),
    jsonb_build_object('k', 'verfahren', 't', 'text', 'de', 'Verfahren für PV', 'fr', 'Procédure pour le PV'),
    jsonb_build_object('k', 'unterlagen', 't', 'lang', 'de', 'Unterlagen', 'fr', 'Documents'),
    jsonb_build_object('k', 'portal_url', 't', 'url', 'de', 'Portal', 'fr', 'Portail')))),
  ('partnerrolle', 'architekt', 'Architekt & Planer', 'Architecte & planificateur', 60, null, jsonb_build_object('felder', jsonb_build_array(
    jsonb_build_object('k', 'schwerpunkt', 't', 'text', 'de', 'Schwerpunkt', 'fr', 'Spécialité')))),
  ('partnerrolle', 'elektriker', 'Elektriker', 'Électricien', 70, null, jsonb_build_object('felder', jsonb_build_array(
    jsonb_build_object('k', 'bewilligung', 't', 'text', 'de', 'Installationsbewilligung', 'fr', 'Autorisation d’installer'),
    jsonb_build_object('k', 'gebiet', 't', 'text', 'de', 'Gebiet', 'fr', 'Région')))),
  ('partnerrolle', 'vermittler', 'Vermittler', 'Apporteur d’affaires', 80, 'warn', jsonb_build_object('felder', jsonb_build_array(
    jsonb_build_object('k', 'provision_prozent', 't', 'prozent', 'de', 'Provision (% vom Auftrag exkl. MWST)', 'fr', 'Commission (% de la commande HT)'),
    jsonb_build_object('k', 'auszahlung', 't', 'text', 'de', 'Ausbezahlt bei', 'fr', 'Versée à')))),
  ('partnerrolle', 'partner', 'Partner (andere)', 'Partenaire (autre)', 90, null, jsonb_build_object('felder', jsonb_build_array(
    jsonb_build_object('k', 'zusammenarbeit', 't', 'lang', 'de', 'Zusammenarbeit', 'fr', 'Collaboration'))))
on conflict (liste, schluessel) do nothing;

-- Nachweise mit Ablaufdatum (Subunternehmer, Elektriker): Auswahlliste, damit man Arten ergänzen kann.
insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge) values
  ('partnernachweis', 'haftpflicht', 'Betriebshaftpflicht', 'Responsabilité civile', 10),
  ('partnernachweis', 'suva', 'SUVA-Bestätigung', 'Attestation SUVA', 20),
  ('partnernachweis', 'gav', 'Mindestlohn-Erklärung (GAV)', 'Déclaration salaire minimum (CCT)', 30),
  ('partnernachweis', 'installationsbewilligung', 'Installationsbewilligung ESTI', 'Autorisation d’installer ESTI', 40),
  ('partnernachweis', 'andere', 'Anderer Nachweis', 'Autre attestation', 90)
on conflict (liste, schluessel) do nothing;

insert into public.einstellungen (schluessel, wert) values ('adressbuch', jsonb_build_object(
  'nachweis_vorlauf_tage', 30,
  'gesuch_warnung_tage', 15,
  -- ElCom-Daten auf LINDAS (öffentlich, ohne Schlüssel). Abfrage als Daten, damit sie sich ohne Update anpassen lässt.
  'elcom', jsonb_build_object('jahr', null, 'url', 'https://lindas.admin.ch/query')))
on conflict (schluessel) do nothing;

-- 2. Rollen pro Kontakt ----------------------------------------------------------------------------------------
create table public.kontakt_rollen (
  id         uuid primary key default gen_random_uuid(),
  kontakt_id uuid not null references public.kontakte (id),
  rolle      text not null,                 -- auswahlwerte 'partnerrolle'
  angaben    jsonb not null default '{}',   -- Felder der Rolle, z. B. {"kundennummer": "40118"}
  aktiv      boolean not null default true
);
select intern.richte_fachtabelle_ein('kontakt_rollen');
create unique index kontakt_rollen_paar_idx on public.kontakt_rollen (kontakt_id, rolle) where geloescht_am is null;
create index kontakt_rollen_rolle_idx on public.kontakt_rollen (rolle) where geloescht_am is null;
comment on table public.kontakt_rollen is 'Partner-Rollen eines Kontakts (Netzbetreiber, Lieferant, …) mit den Feldern der Rolle.';

-- 3. Postadresse und Firmenangaben der Partner (Kunden haben ihre Adresse beim Gebäude) ------------------------
create table public.partner_angaben (
  id         uuid primary key default gen_random_uuid(),
  kontakt_id uuid not null unique references public.kontakte (id),
  strasse    text,
  plz        text,
  ort        text,
  land       text not null default 'CH',
  webseite   text,
  uid_nr     text,                          -- CHE-123.456.789, aus dem UID-Register übernommen
  rechtsform text,
  bewertung_notiz text
);
select intern.richte_fachtabelle_ein('partner_angaben');

-- 4. Nachweise mit Ablaufdatum ---------------------------------------------------------------------------------
create table public.partner_nachweise (
  id          uuid primary key default gen_random_uuid(),
  kontakt_id  uuid not null references public.kontakte (id),
  art         text not null,                -- auswahlwerte 'partnernachweis'
  gueltig_bis date,
  dokument_id uuid references public.dokumente (id),
  notiz       text
);
select intern.richte_fachtabelle_ein('partner_nachweise');
create index partner_nachweise_kontakt_idx on public.partner_nachweise (kontakt_id) where geloescht_am is null;

-- 5. Bewertung erledigter Subunternehmer-Aufträge (1–5 Sterne) -----------------------------------------------
alter table public.subunternehmer_auftraege
  add column if not exists bewertung_qualitaet smallint check (bewertung_qualitaet between 1 and 5),
  add column if not exists bewertung_termin    smallint check (bewertung_termin between 1 and 5),
  add column if not exists bewertung_preis     smallint check (bewertung_preis between 1 and 5);

-- 6. Rollen mit Einkauf und Projekten verbinden -----------------------------------------------------------------
-- Wer die Rolle Lieferant oder Subunternehmer bekommt, erscheint auch in Einkauf bzw. Projekten (gleiche Firma,
-- nichts doppelt). Bestehende Lieferanten/Subunternehmer ohne Kontakt bleiben, wie sie sind.
create or replace function intern.partnerrolle_verbinden() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k public.kontakte;
  v_name text;
begin
  if new.geloescht_am is not null or not new.aktiv then return new; end if;
  select * into k from public.kontakte where id = new.kontakt_id;
  v_name := intern.kontaktname(k);
  if new.rolle = 'lieferant' and not exists (select 1 from public.lieferanten where kontakt_id = new.kontakt_id) then
    insert into public.lieferanten (name, kontakt_id, email_bestellung, kundennummer_bei_lieferant)
    values (v_name, new.kontakt_id, nullif(new.angaben ->> 'bestell_email', ''), nullif(new.angaben ->> 'kundennummer', ''))
    on conflict (name) do update set kontakt_id = coalesce(public.lieferanten.kontakt_id, excluded.kontakt_id);
  elsif new.rolle = 'lieferant' then
    update public.lieferanten
       set email_bestellung = coalesce(nullif(new.angaben ->> 'bestell_email', ''), email_bestellung),
           kundennummer_bei_lieferant = coalesce(nullif(new.angaben ->> 'kundennummer', ''), kundennummer_bei_lieferant)
     where kontakt_id = new.kontakt_id;
  elsif new.rolle = 'subunternehmer' and not exists (select 1 from public.subunternehmer where kontakt_id = new.kontakt_id) then
    insert into public.subunternehmer (name, gewerk, kontakt_id)
    values (v_name, nullif(new.angaben ->> 'gewerk', ''), new.kontakt_id)
    on conflict (name) do update set kontakt_id = coalesce(public.subunternehmer.kontakt_id, excluded.kontakt_id);
  end if;
  return new;
end
$$;
create trigger verbinden after insert or update of angaben, aktiv, geloescht_am on public.kontakt_rollen
  for each row execute function intern.partnerrolle_verbinden();

-- Bestehendes übernehmen: Lieferanten und Subunternehmer mit Kontakt sowie Kontakte mit Partner-Kontaktart.
insert into public.kontakt_rollen (kontakt_id, rolle, angaben)
select l.kontakt_id, 'lieferant', jsonb_strip_nulls(jsonb_build_object('kundennummer', l.kundennummer_bei_lieferant,
         'bestell_email', l.email_bestellung))
  from public.lieferanten l join public.kontakte k on k.id = l.kontakt_id and k.geloescht_am is null
 where l.kontakt_id is not null
on conflict do nothing;
insert into public.kontakt_rollen (kontakt_id, rolle, angaben)
select s.kontakt_id, 'subunternehmer', jsonb_strip_nulls(jsonb_build_object('gewerk', s.gewerk))
  from public.subunternehmer s join public.kontakte k on k.id = s.kontakt_id and k.geloescht_am is null
 where s.kontakt_id is not null
   and not exists (select 1 from public.kontakt_rollen r where r.kontakt_id = s.kontakt_id and r.rolle = 'subunternehmer')
on conflict do nothing;
insert into public.kontakt_rollen (kontakt_id, rolle)
select k.id, case k.kontaktart when 'behoerde' then 'gemeinde' else k.kontaktart end
  from public.kontakte k
 where k.geloescht_am is null and k.kontaktart in ('partner', 'architekt', 'elektriker', 'lieferant', 'behoerde')
   and not exists (select 1 from public.kontakt_rollen r where r.kontakt_id = k.id
                    and r.rolle = case k.kontaktart when 'behoerde' then 'gemeinde' else k.kontaktart end)
on conflict do nothing;
