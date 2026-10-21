-- Phase 6, Teil 4: neue Tabellen für gespeicherte Ansichten, Kalender und den Lead-Monatsbericht.

-- Gespeicherte Ansichten einer Liste (Filter, Spalten, Sortierung), persönlich oder fürs Team.
create table public.gespeicherte_ansichten (
  id         uuid primary key default gen_random_uuid(),
  bereich    text not null,                        -- z. B. 'sales.liste'
  name       text not null check (length(trim(name)) between 1 and 60),
  person_id  uuid references public.personen (id) default intern.meine_person_id(),
  geteilt    boolean not null default false,       -- für alle sichtbar
  einstellungen jsonb not null default '{}'
);
select intern.richte_fachtabelle_ein('gespeicherte_ansichten');
create index gespeicherte_ansichten_bereich_idx on public.gespeicherte_ansichten (bereich) where geloescht_am is null;
-- Persönliche Ansichten sieht und ändert nur die Person selbst; geteilte sehen alle.
drop policy lesen on public.gespeicherte_ansichten;
drop policy aendern on public.gespeicherte_ansichten;
create policy lesen on public.gespeicherte_ansichten for select to authenticated
  using ((select intern.hat_recht('basis')) and (geteilt or person_id = (select intern.meine_person_id())));
create policy aendern on public.gespeicherte_ansichten for update to authenticated
  using ((select intern.hat_recht('basis')) and (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('admin'))))
  with check ((select intern.hat_recht('basis')));

-- Termine aus dem Kalender einer Person: heute aus einer .ics/.csv-Datei oder aus Outlook eingefügt
-- (V233 CAL.byPerson), ab Phase 8 direkt aus Outlook. Termine mit Adresse werden feste Stopps der Route.
create table public.kalender_eintraege (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.personen (id),
  beginn      timestamptz not null,
  ende        timestamptz not null,
  ganztags    boolean not null default false,
  betreff     text,
  ort         text,
  plz         text,                                -- aus dem Ort gelesen, für Karte und Route
  anzeige_als text not null default 'busy' check (anzeige_als in ('free', 'tentative', 'busy', 'oof', 'workingElsewhere')),
  quelle      text not null default 'datei' check (quelle in ('datei', 'einfuegen', 'outlook')),
  extern_id   text,                                -- UID aus der Datei bzw. Outlook-ID, verhindert Doppelte
  link        text,
  check (ende >= beginn)
);
select intern.richte_fachtabelle_ein('kalender_eintraege');
create index kalender_eintraege_person_idx on public.kalender_eintraege (person_id, beginn) where geloescht_am is null;
create unique index kalender_eintraege_extern_idx on public.kalender_eintraege (person_id, quelle, extern_id)
  where extern_id is not null and geloescht_am is null;

/**
 * Ersetzt die Termine einer Person aus einer Quelle im Zeitraum der neuen Einträge (Datei neu geladen).
 * Alte Einträge kommen in den Papierkorb, nichts wird hart gelöscht.
 */
create or replace function public.kalender_ersetzen(p_person uuid, p_quelle text, p_eintraege jsonb)
returns int
language plpgsql security invoker set search_path = '' as $$
declare
  von timestamptz;
  bis timestamptz;
  n int;
begin
  select min((e ->> 'beginn')::timestamptz), max((e ->> 'ende')::timestamptz) into von, bis
    from jsonb_array_elements(p_eintraege) e;
  if von is null then return 0; end if;
  update public.kalender_eintraege set geloescht_am = now()
   where person_id = p_person and quelle = p_quelle and geloescht_am is null and beginn < bis and ende > von;
  insert into public.kalender_eintraege (person_id, beginn, ende, ganztags, betreff, ort, plz, anzeige_als, quelle, extern_id, link)
  select p_person, (e ->> 'beginn')::timestamptz, (e ->> 'ende')::timestamptz, coalesce((e ->> 'ganztags')::boolean, false),
         nullif(e ->> 'betreff', ''), nullif(e ->> 'ort', ''), nullif(e ->> 'plz', ''),
         coalesce(nullif(e ->> 'anzeige_als', ''), 'busy'), p_quelle, nullif(e ->> 'extern_id', ''), nullif(e ->> 'link', '')
    from jsonb_array_elements(p_eintraege) e;
  get diagnostics n = row_count;
  return n;
end
$$;
revoke execute on function public.kalender_ersetzen(uuid, text, jsonb) from public, anon;
grant execute on function public.kalender_ersetzen(uuid, text, jsonb) to authenticated;

-- Lead-Monatsbericht (V174–V176): gekaufte Leads laut Anbieter pro Monat und Quelle, der Bericht-Text
-- und wann er gemeldet wurde. Die erhaltenen Leads zählt das CRM selbst.
create table public.lead_einkauf (
  id           uuid primary key default gen_random_uuid(),
  monat        date not null check (extract(day from monat) = 1),
  quelle       text not null,
  gekauft      int check (gekauft >= 0),
  bericht_text text,
  gemeldet     jsonb                                -- {am, von, an, anzahl}
);
select intern.richte_fachtabelle_ein('lead_einkauf');
create unique index lead_einkauf_monat_quelle_idx on public.lead_einkauf (monat, quelle) where geloescht_am is null;

/** Zahlen für den Monatsbericht: pro Quelle erhaltene Leads und ihr heutiger Stand. */
create or replace function public.lead_monatsbericht(p_monat date)
returns table (quelle text, erhalten int, in_bearbeitung int, termin int, offeriert int, kein_interesse int,
               gruende jsonb, leads jsonb)
language sql stable security invoker set search_path = '' as $$
  with l as (
    select coalesce(g.quelle, 'ohne') as q, g.*
      from public.verkauf_geschaefte g
     where g.verkaufschance_id is not null
       and g.eingang_am >= date_trunc('month', p_monat)::date
       and g.eingang_am < (date_trunc('month', p_monat) + interval '1 month')::date
  )
  select l.q, count(*)::int,
         count(*) filter (where l.stand in ('lead_neu', 'lead_offen', 'lead_spaeter', 'offerte', 'pruefung'))::int,
         count(*) filter (where l.stand in ('termin', 'nach_termin'))::int,
         count(*) filter (where l.gruppe in ('offeriert', 'auftrag', 'verbaut') or l.stand = 'verloren')::int,
         count(*) filter (where l.stand = 'kein')::int,
         coalesce(jsonb_agg(jsonb_build_object('grund', l.verlustgrund)) filter (where l.stand = 'kein'), '[]'),
         jsonb_agg(jsonb_build_object('id', l.id, 'nummer', l.lead_nummer, 'name', l.name, 'ort', l.ort,
           'eingang_am', l.eingang_am, 'stand', l.stand, 'grund', l.verlustgrund) order by l.eingang_am, l.lead_nummer)
    from l group by l.q order by count(*) desc
$$;
revoke execute on function public.lead_monatsbericht(date) from public, anon;
grant execute on function public.lead_monatsbericht(date) to authenticated;

-- Vorlage für die SMS am Vortag (V172). Versand ab Phase 8 über eine Server-Funktion, mit Freigabe.
insert into public.einstellungen (schluessel, wert) values ('sms_erinnerung', $j${
  "aktiv": false, "uhrzeit": "16:00", "absender": "DimSolaire",
  "text_de": "Guten Tag {name}, wir freuen uns auf den Termin morgen, {datum} um {zeit} Uhr. Freundliche Grüsse, {person}, Dimension Solaire",
  "text_fr": "Bonjour {name}, nous nous réjouissons de notre rendez-vous demain, {datum} à {zeit}. Meilleures salutations, {person}, Dimension Solaire"
}$j$::jsonb)
on conflict (schluessel) do nothing;
