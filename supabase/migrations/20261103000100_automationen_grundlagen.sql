-- Phase 12, Teil 1: Grundlagen der Automationen (Auslöser → Bedingungen → Aktionen), siehe Entscheid 0023.
-- Eine Automation ist eine Zeile mit Auslöser, Bedingungen und Aktionen als Daten (Regel 8). Signale halten fest,
-- dass etwas passiert ist; ein Lauf führt eine Automation für genau ein Signal aus und protokolliert jeden Schritt.
-- Benachrichtigungen (Glocke) kommen ab jetzt vom Server.

create table public.automationen (
  id               uuid primary key default gen_random_uuid(),
  vorlage          text unique,                         -- Schlüssel der mitgelieferten Vorlage, null = eigene
  name_de          text not null,
  name_fr          text not null,
  beschreibung_de  text,
  beschreibung_fr  text,
  aktiv            boolean not null default false,
  aktiv_seit       timestamptz,                         -- nur was danach passiert, löst aus (kein Nachholen)
  modus            text not null default 'freigabe' check (modus in ('freigabe', 'automatisch')),
  ausloeser        text not null,
  bedingungen      jsonb not null default '[]',
  aktionen         jsonb not null default '[]',
  ausfuehren_als   uuid references public.personen (id),
  reihenfolge      int not null default 0
);
select intern.richte_fachtabelle_ein('automationen', 'admin');
comment on table public.automationen is 'Automationen (Phase 12): Auslöser, Bedingungen, Aktionen. Ändern nur Administration.';
comment on column public.automationen.modus is
  '«freigabe» (Standard): Mails und SMS warten im Ausgangskorb. «automatisch»: sie gehen ohne Freigabe (Regel 6).';
comment on column public.automationen.ausfuehren_als is
  'Die Automation handelt mit den Rechten dieser Person (wer sie zuletzt eingeschaltet oder geändert hat).';

-- Signale: «das ist passiert». Eindeutig je Ereignis und Schlüssel, damit nichts doppelt auslöst.
-- «basis» = beim ersten Durchsehen schon vorhanden (Altbestand), löst nie aus.
create table intern.automation_signale (
  id          bigint generated always as identity primary key,
  ereignis    text not null,
  tabelle     text,
  bezug_id    uuid,
  schluessel  text not null,
  daten       jsonb not null default '{}',
  basis       boolean not null default false,
  verteilt    boolean not null default false,
  erstellt_am timestamptz not null default now(),
  unique (ereignis, schluessel)
);
create index automation_signale_offen_idx on intern.automation_signale (id) where not verteilt;

-- Wann ein Ereignis zum ersten Mal durchgesehen wurde (danach gilt alles Neue als Signal).
create table intern.automation_durchsicht (
  ereignis   text primary key,
  zuerst_am  timestamptz not null default now(),
  zuletzt_am timestamptz not null default now()
);

-- Läufe: das Protokoll jeder Ausführung. Kein Papierkorb nötig, es ist selbst ein Protokoll.
create table public.automation_laeufe (
  id            uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automationen (id),
  signal_id     bigint not null,
  ereignis      text not null,
  tabelle       text,
  bezug_id      uuid,
  kontakt_id    uuid references public.kontakte (id),
  titel         text,
  stand         text not null default 'laeuft'
                check (stand in ('laeuft', 'wartet', 'server', 'fertig', 'uebersprungen', 'fehler', 'abgebrochen')),
  schritt       int not null default 0,                 -- 0 = Bedingungen, 1… = Aktionen
  weiter_am     timestamptz not null default now(),
  protokoll     jsonb not null default '[]',
  fehler        int not null default 0,
  erstellt_am   timestamptz not null default now(),
  geaendert_am  timestamptz not null default now(),
  beendet_am    timestamptz,
  unique (automation_id, signal_id)
);
create index automation_laeufe_faellig_idx on public.automation_laeufe (weiter_am) where stand in ('laeuft', 'wartet');
create index automation_laeufe_automation_idx on public.automation_laeufe (automation_id, erstellt_am desc);
create index automation_laeufe_bezug_idx on public.automation_laeufe (bezug_id);
alter table public.automation_laeufe enable row level security;
create policy lesen on public.automation_laeufe for select to authenticated using ((select intern.hat_recht('admin')));
grant select on public.automation_laeufe to authenticated;
insert into intern.tabellen_leserecht (tabelle, recht) values ('automation_laeufe', 'admin')
on conflict (tabelle) do update set recht = excluded.recht;
comment on column public.automation_laeufe.protokoll is
  'Je Schritt: {"nr", "art", "ergebnis": ok|fehler|uebersprungen|wartet|server, "meldung", "werte", "ziel", "zeit"}';

-- Benachrichtigungen (Glocke): je Person, nur für sie lesbar. Ändern nur über die Funktionen unten.
create table public.benachrichtigungen (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.personen (id),
  art          text not null default 'info' check (art in ('info', 'ok', 'warnung', 'kritisch')),
  titel_de     text not null,
  titel_fr     text not null,
  text_de      text,
  text_fr      text,
  ziel         text,
  lauf_id      uuid references public.automation_laeufe (id),
  gelesen_am   timestamptz,
  ausgeblendet_am timestamptz,
  erstellt_am  timestamptz not null default now()
);
create index benachrichtigungen_person_idx on public.benachrichtigungen (person_id, erstellt_am desc)
  where ausgeblendet_am is null;
alter table public.benachrichtigungen enable row level security;
create policy lesen on public.benachrichtigungen for select to authenticated
  using (person_id = (select intern.meine_person_id()));
grant select on public.benachrichtigungen to authenticated;

-- Aufgaben aus einer Automation tragen den Lauf (für «woher kommt das?»).
alter table public.aufgaben add column if not exists lauf_id uuid references public.automation_laeufe (id);
create index if not exists aufgaben_person_offen_idx on public.aufgaben (person_id, faellig_am)
  where erledigt_am is null and geloescht_am is null;

-- Einstellungen der Auslöser, die nach Datum gehen.
insert into public.einstellungen (schluessel, wert) values
  ('automationen', '{"wartung_vorlauf_tage": 30, "rechnung_karenz_tage": 5, "termin_gehabt_tage": 30, "bewertung_link": ""}')
on conflict (schluessel) do nothing;

/** Betrag in Rappen als «CHF 12'500.00» (Schweizer Schreibweise, unabhängig von der Datenbank-Sprache). */
create or replace function intern.chf_text(p_rappen bigint) returns text
language sql immutable set search_path = '' as $$
  select case when p_rappen is null then null
    else 'CHF ' || replace(to_char(p_rappen / 100.0, 'FM999,999,999,990.00'), ',', '''') end
$$;

/** Datum als «21.10.2026». */
create or replace function intern.datum_text(p date) returns text
language sql immutable set search_path = '' as $$ select to_char(p, 'DD.MM.YYYY') $$;

/** Wert aus einem Kontext über einen Pfad mit Punkten («kontakt.sprache»). */
create or replace function intern.automation_wert(p_kontext jsonb, p_pfad text) returns jsonb
language sql immutable set search_path = '' as $$
  select p_kontext #> string_to_array(p_pfad, '.')
$$;

/**
 * Prüft eine Bedingung {feld, op, wert} gegen den Kontext. Zahlen werden als Zahlen verglichen, sonst als Text
 * (Datum als JJJJ-MM-TT vergleicht sich richtig). Operatoren: = != > >= < <= enthaelt in leer nicht_leer.
 */
create or replace function intern.automation_bedingung(p_kontext jsonb, p_b jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  v jsonb := intern.automation_wert(p_kontext, p_b ->> 'feld');
  op text := coalesce(p_b ->> 'op', '=');
  w jsonb := p_b -> 'wert';
  a text;
  b text;
  zahl boolean;
begin
  if op = 'leer' then
    return v is null or v = 'null' or v = '""' or v = '[]';
  elsif op = 'nicht_leer' then
    return not (v is null or v = 'null' or v = '""' or v = '[]');
  end if;
  if v is null or v = 'null' then return op = '!='; end if;
  if op = 'enthaelt' then
    if jsonb_typeof(v) = 'array' then return v @> jsonb_build_array(w #>> '{}'); end if;
    return position(lower(w #>> '{}') in lower(v #>> '{}')) > 0;
  elsif op = 'in' then
    return jsonb_typeof(w) = 'array' and w @> jsonb_build_array(v #>> '{}');
  end if;
  a := v #>> '{}';
  b := w #>> '{}';
  zahl := a ~ '^-?\d+(\.\d+)?$' and b ~ '^-?\d+(\.\d+)?$';
  return case op
    when '=' then case when zahl then a::numeric = b::numeric else a = b end
    when '!=' then case when zahl then a::numeric <> b::numeric else a <> b end
    when '>' then case when zahl then a::numeric > b::numeric else a > b end
    when '>=' then case when zahl then a::numeric >= b::numeric else a >= b end
    when '<' then case when zahl then a::numeric < b::numeric else a < b end
    when '<=' then case when zahl then a::numeric <= b::numeric else a <= b end
    else false
  end;
end
$$;

/** Erste Bedingung, die nicht erfüllt ist (null = alle erfüllt). */
create or replace function intern.automation_nicht_erfuellt(p_kontext jsonb, p_bedingungen jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select b from jsonb_array_elements(coalesce(p_bedingungen, '[]')) b
   where not intern.automation_bedingung(p_kontext, b) limit 1
$$;

/** Platzhalter {Anrede}, {Termin} … aus kontext.platzhalter ersetzen. Unbekannte bleiben stehen (fällt auf). */
create or replace function intern.automation_text(p_vorlage text, p_kontext jsonb) returns text
language sql immutable set search_path = '' as $$
  select intern.as_text(p_vorlage, coalesce(p_kontext -> 'platzhalter', '{}'))
$$;

/** Text in der gewünschten Sprache aus {de, fr}, sonst Deutsch. */
create or replace function intern.zweisprachig(p jsonb, p_sprache text) returns text
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p) = 'string' then p #>> '{}'
              else coalesce(nullif(p ->> coalesce(p_sprache, 'de'), ''), nullif(p ->> 'de', '')) end
$$;

/** Wohin ein Klick auf einen Bezug führt (Adresse in der App). */
create or replace function intern.automation_ziel(p_tabelle text, p_id uuid) returns text
language sql immutable set search_path = '' as $$
  select case p_tabelle
    when 'verkaufschancen' then '/sales?lead=' || p_id
    when 'offerten' then '/quotes?offerte=' || p_id
    when 'projekte' then '/projects?projekt=' || p_id
    when 'rechnungen' then '/invoices?rechnung=' || p_id
    when 'wartungsvertraege' then '/aftersales?reiter=wartung'
    when 'kontakte' then '/customers?kunde=' || p_id
    when 'ausgangskorb' then '/outbox?eintrag=' || p_id
    when 'aufgaben' then '/tasks'
  end
$$;

/** Anrede wie in V233 (Marketing): «Guten Tag Anna Muster» bzw. «Bonjour Anna Muster,». */
create or replace function intern.anrede_text(p_vorname text, p_nachname text, p_sprache text) returns text
language sql immutable set search_path = '' as $$
  select case
    when nullif(trim(p_vorname), '') is null then
      case when p_sprache = 'fr' then 'Madame, Monsieur,' else 'Sehr geehrte Damen und Herren' end
    when p_sprache = 'fr' then 'Bonjour ' || concat_ws(' ', trim(p_vorname), nullif(trim(p_nachname), '')) || ','
    else 'Guten Tag ' || concat_ws(' ', trim(p_vorname), nullif(trim(p_nachname), ''))
  end
$$;

/** Kontakt als Kontext (Name, Anrede, Mail, Telefon, Sprache, Wartungsvertrag, Anlage). */
create or replace function intern.automation_kontakt(p_kontakt uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', k.id, 'anrede', k.anrede, 'vorname', k.vorname, 'nachname', k.nachname, 'firma', k.firma,
    'name', coalesce(nullif(concat_ws(' ', k.vorname, k.nachname), ''), k.firma),
    'email', nullif(trim(k.email), ''), 'telefon', nullif(trim(k.telefon), ''), 'sprache', coalesce(k.sprache, 'de'),
    'werbesperre', k.werbesperre, 'kundennummer', k.kundennummer,
    'hat_wartungsvertrag', exists (select 1 from public.wartungsvertraege w where w.kontakt_id = k.id
                                     and w.geloescht_am is null and w.status = 'aktiv'),
    'ort', (select o.ort from public.objekte o where o.kontakt_id = k.id and o.geloescht_am is null
             order by o.erstellt_am desc limit 1))
  from public.kontakte k where k.id = p_kontakt
$$;

/** Person als Kontext (für «zuständig»). */
create or replace function intern.automation_person(p_person uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'name', p.name, 'email', p.email, 'sprache', coalesce(p.sprache, 'de'))
    from public.personen p where p.id = p_person and p.geloescht_am is null
$$;
