-- Marketing vollständig (2.11.2026, Entscheid 0053): Kampagnen mit Ziel, Budget und Ergebnis, Messen und Events,
-- gespeicherte Zielgruppen, Werbemittel mit Lagerbestand, Öffnungen und Klicks, Social Media «von Hand».
-- Die bestehende Tabelle «kampagnen» bleibt der Versand-Verlauf («Letzte Aktionen»); eine Kampagne im Sinn von
-- «ein Ziel, mehrere Schritte» ist neu «marketing_kampagnen». Alles, was zu einem Ziel gehört, zeigt auf sie.

create table public.marketing_kampagnen (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  art               text not null default 'aktion'
                    check (art in ('aktion', 'messe', 'online', 'empfehlung', 'newsletter', 'social', 'gekaufte_leads')),
  status            text not null default 'idee' check (status in ('idee', 'vorbereitung', 'laeuft', 'abgeschlossen')),
  ziel              text,
  start_am          date,
  ende_am           date,
  budget_rappen     bigint check (budget_rappen is null or budget_rappen >= 0),
  ziel_leads        int check (ziel_leads is null or ziel_leads >= 0),
  sprache           text check (sprache in ('de', 'fr', 'de_fr')),
  standort_id       uuid references public.standorte (id),
  verantwortlich_id uuid references public.personen (id),
  -- Kennzeichen im Link der Website (…?kampagne=<kennzeichen>) und im Formular-Feld «Kampagne».
  kennzeichen       text unique check (kennzeichen ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  -- Quelle der Leads (Auswahlliste «quelle»), z. B. solar_guide für gekaufte Leads.
  quelle            text,
  -- Messe: {ort, stand, flaeche_m2, standdienst: [{tag, von, bis, personen: [uuid]}], checkliste: [{text, erledigt, von, am}]}
  details           jsonb not null default '{}',
  notiz             text
);
select intern.richte_fachtabelle_ein('marketing_kampagnen');
create index marketing_kampagnen_zeit_idx on public.marketing_kampagnen (start_am, ende_am) where geloescht_am is null;
comment on table public.marketing_kampagnen is
  'Kampagne: ein Ziel mit Zeitraum, Budget und Schritten (Mails, Posts, Messe, Werbung). Leads, Kosten, Posts zeigen darauf.';

-- Alles, was zu einer Kampagne gehört.
alter table public.kampagnen add column if not exists kampagne_id uuid references public.marketing_kampagnen (id);
alter table public.social_posts add column if not exists kampagne_id uuid references public.marketing_kampagnen (id);
alter table public.newsletter add column if not exists kampagne_id uuid references public.marketing_kampagnen (id);
alter table public.newsletter add column if not exists geplant_am date;
alter table public.verkaufschancen add column if not exists kampagne_id uuid references public.marketing_kampagnen (id);
create index if not exists verkaufschancen_kampagne_idx on public.verkaufschancen (kampagne_id) where kampagne_id is not null;
-- Kosten aus den Lieferantenrechnungen (AbaNinja-Abgleich): Zuordnung durch die Buchhaltung. «kein» = keine Werbung.
alter table public.kreditor_zahlungen add column if not exists kampagne_id uuid references public.marketing_kampagnen (id);
alter table public.kreditor_zahlungen add column if not exists marketing_kanal text
  check (marketing_kanal in ('online', 'messe', 'gekaufte_leads', 'druck', 'social', 'gutschriften', 'sonstiges', 'kein'));

-- Social Media: Idee und «zur Freigabe» als eigene Spalten im Board (Chris 2.11.: Davis bereitet vor, GL gibt frei).
alter table public.social_posts drop constraint if exists social_posts_status_check;
alter table public.social_posts add constraint social_posts_status_check
  check (status in ('idee', 'entwurf', 'zur_freigabe', 'geplant', 'wird_veroeffentlicht', 'veroeffentlicht', 'fehler', 'erledigt'));

-- Fotos für Werbung: Erlaubnis des Kunden beim Rapport (auch in PR #45 mit «if not exists»), Titelbild im Marketing.
alter table public.rapporte add column if not exists fotos_werbung boolean not null default false;
alter table public.dokumente add column if not exists werbung_titel boolean not null default false;

-- Heizung laut Gebäuderegister (GWR) für «Wärmepumpe-Potenzial», gefüllt vom Zeitplan (geo.admin.ch).
alter table public.objekte add column if not exists heizung text;
alter table public.objekte add column if not exists heizung_geprueft_am timestamptz;

-- Gespeicherte Zielgruppen: Name und Filter wie in «Kunden anschreiben»; die Zahl rechnet die App immer neu.
create table public.marketing_zielgruppen (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  beschreibung text,
  filter      jsonb not null default '{}',
  zuletzt_am  timestamptz
);
select intern.richte_fachtabelle_ein('marketing_zielgruppen');

-- Werbemittel: Flyer, Broschüren, Roll-ups, Logos. Datei als Link (SharePoint), Lagerbestand mit Mindestbestand.
create table public.werbemittel (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  art           text not null default 'flyer' check (art in ('flyer', 'broschuere', 'rollup', 'logo', 'vorlage', 'sonstiges')),
  sprache       text check (sprache in ('de', 'fr', 'de_fr')),
  version       text,
  link          text check (link is null or link ~ '^https://'),
  bestand       int check (bestand is null or bestand >= 0),
  mindestbestand int check (mindestbestand is null or mindestbestand >= 0),
  notiz         text
);
select intern.richte_fachtabelle_ein('werbemittel');

-- Öffnungen und Klicks von Serien-Mails und Newslettern (Chris 2.11.: «Ja, Öffnungen und Klicks»). Nur Zeitpunkt
-- und Link, keine IP und kein Gerät. Geschrieben nur von der Edge Function «zaehler» (Service-Schlüssel).
create table public.marketing_ereignisse (
  id          uuid primary key default gen_random_uuid(),
  ausgang_id  uuid not null references public.ausgangskorb (id),
  art         text not null check (art in ('oeffnung', 'klick')),
  url         text,
  am          timestamptz not null default now()
);
create index marketing_ereignisse_ausgang_idx on public.marketing_ereignisse (ausgang_id);
alter table public.marketing_ereignisse enable row level security;
create policy lesen on public.marketing_ereignisse for select to authenticated using ((select intern.hat_recht('basis')));

-- Einstellungen: Budget je Jahr und Kanal, Saison-Themen je Monat, Checkliste «Messe», Werbe-Pause, Kategorien der
-- Lieferantenrechnungen, die nach Werbung aussehen. Nur ergänzen, Bestehendes bleibt.
update public.einstellungen set wert = jsonb_build_object(
  'budget', jsonb_build_object('2026', jsonb_build_object(
    'online', 1200000, 'messe', 1200000, 'gekaufte_leads', 800000, 'druck', 300000, 'social', 200000,
    'gutschriften', 600000, 'sonstiges', 0)),
  'werbepause_tage', 30,
  'kosten_stichworte', jsonb_build_array('werbung', 'marketing', 'inserat', 'messe', 'druck', 'flyer', 'google', 'meta',
    'facebook', 'linkedin', 'solar-guide', 'publicité', 'annonce', 'salon', 'impression'),
  'messe_checkliste', jsonb_build_array(
    'Stand gebucht und bezahlt', 'Standdienst eingeteilt', 'Roll-up DE und FR', 'Flyer genug an Lager',
    'Mustermodul und Batterie-Demo', 'Tablet oder Handy mit Messe-Erfassung', 'Wettbewerb-Karten',
    'Strom am Stand bestätigt', 'Social-Post «Besuchen Sie uns» DE/FR', 'Dankes-Mail an die Besucher vorbereitet'),
  'saison_themen', jsonb_build_object(
    '1', jsonb_build_object('de', 'Strompreise im neuen Jahr', 'fr', 'Prix de l’électricité de la nouvelle année'),
    '2', jsonb_build_object('de', 'Förderbeiträge des Jahres', 'fr', 'Subventions de l’année'),
    '3', jsonb_build_object('de', 'Frühlings-Check der Anlage', 'fr', 'Contrôle de printemps de l’installation'),
    '4', jsonb_build_object('de', 'Messesaison: besuchen Sie uns', 'fr', 'Saison des salons : rendez-nous visite'),
    '5', jsonb_build_object('de', 'Eigenverbrauch im Sommer erhöhen', 'fr', 'Augmenter l’autoconsommation en été'),
    '6', jsonb_build_object('de', 'Laden mit Sonnenstrom (Wallbox)', 'fr', 'Recharger avec le soleil (borne)'),
    '7', jsonb_build_object('de', 'Referenzanlagen des Halbjahres', 'fr', 'Installations de référence du semestre'),
    '8', jsonb_build_object('de', 'Heizungsersatz vor dem Winter planen', 'fr', 'Planifier le remplacement du chauffage'),
    '9', jsonb_build_object('de', 'Wärmepumpe statt Öl', 'fr', 'Pompe à chaleur au lieu du mazout'),
    '10', jsonb_build_object('de', 'Batterie für den Winter', 'fr', 'Batterie pour l’hiver'),
    '11', jsonb_build_object('de', 'Wartung vor dem Winter', 'fr', 'Entretien avant l’hiver'),
    '12', jsonb_build_object('de', 'Jahresrückblick und Dank', 'fr', 'Rétrospective et remerciements')),
  'datenschutz', jsonb_build_object(
    'de', 'Wir zählen, ob diese E-Mail geöffnet und welcher Link angeklickt wird, um unsere Informationen zu verbessern.',
    'fr', 'Nous mesurons si cet e-mail est ouvert et quel lien est cliqué afin d’améliorer nos informations.'))
  || wert
 where schluessel = 'marketing';

-- Kampagnen 2026 als Startpunkt: gekaufte Leads und Empfehlungen laufen ohnehin, damit Leads gleich eine Kampagne haben.
insert into public.marketing_kampagnen (name, art, status, ziel, start_am, ende_am, quelle, kennzeichen)
values
  ('solar-guide.ch 2026', 'gekaufte_leads', 'laeuft', 'Gekaufte Anfragen aus solar-guide.ch', '2026-01-01', '2026-12-31',
   'solar_guide', 'solar-guide-2026'),
  ('Empfehlungen 2026', 'empfehlung', 'laeuft', 'Zufriedene Kunden empfehlen uns weiter', '2026-01-01', '2026-12-31',
   'empfehlung', 'empfehlung-2026')
on conflict (kennzeichen) do nothing;
