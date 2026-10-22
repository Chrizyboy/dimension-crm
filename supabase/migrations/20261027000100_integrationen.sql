-- Phase 8, Teil 1: Grundlage der Integrationen (Microsoft 365, AbaNinja, SMS über ASPSMS).
-- Geheimnisse (Client-Secret, API-Token, SMS-Zugang) liegen nie hier, nur in den Edge-Function-Secrets.
-- Microsoft verbindet jede Person selbst (Entscheid Chris 22.10.2026): ihr Refresh-Token liegt
-- verschlüsselt im Schema «intern», das die App nie lesen kann.

-- Status und nicht geheime Einstellungen pro Dienst (z. B. SMS-Absender, SharePoint-Ordner, Postfach info@).
create table public.integrationen (
  id                  uuid not null default gen_random_uuid() unique,
  dienst              text primary key check (dienst in ('microsoft', 'abaninja', 'sms', 'zeitplan')),
  einstellungen       jsonb not null default '{}',
  zuletzt_geprueft_am timestamptz,
  zuletzt_ok          boolean,
  meldung             text,
  geaendert_am        timestamptz not null default now()
);
comment on table public.integrationen is 'Status, letzter Test und nicht geheime Einstellungen der Integrationen.';
alter table public.integrationen enable row level security;
create policy lesen on public.integrationen for select to authenticated using ((select intern.hat_recht('basis')));
create policy aendern on public.integrationen for update to authenticated
  using ((select intern.hat_recht('admin'))) with check ((select intern.hat_recht('admin')));
create trigger protokoll after insert or update or delete on public.integrationen
  for each row execute function intern.protokolliere();
create trigger geaendert before update on public.integrationen
  for each row execute function intern.setze_geaendert_am();

insert into public.integrationen (dienst, einstellungen) values
  ('microsoft', '{"postfach_anfragen": "info@dimension-solaire.ch", "team_postfaecher": [], "sharepoint_ordner": "Administration/Direction Interne/CRM Backups/Kunden Backup", "kalender_tage": 21}'),
  ('abaninja', '{}'),
  ('sms', '{"absender": "DimSolaire"}'),
  ('zeitplan', '{}');

-- Jeder Aufruf eines fremden Dienstes: wann, was, wie lange, Ergebnis. Nie Inhalte oder Geheimnisse.
create table public.integrations_protokoll (
  id         bigint generated always as identity primary key,
  zeitpunkt  timestamptz not null default now(),
  dienst     text not null,
  aktion     text not null,
  ok         boolean not null,
  status     int,
  dauer_ms   int,
  meldung    text,
  person_id  uuid references public.personen (id)
);
create index integrations_protokoll_zeit_idx on public.integrations_protokoll (zeitpunkt desc);
alter table public.integrations_protokoll enable row level security;
create policy lesen on public.integrations_protokoll for select to authenticated using ((select intern.hat_recht('admin')));

-- Microsoft-Verbindung pro Person. Token AES-GCM-verschlüsselt (Schlüssel nur in den Secrets).
create table intern.microsoft_verbindungen (
  person_id      uuid primary key references public.personen (id),
  konto          text not null,
  token          text,
  bereiche       text,
  verbunden_am   timestamptz not null default now(),
  genutzt_am     timestamptz,
  getrennt_am    timestamptz,
  fehler         text
);

-- Laufende Anmeldungen bei Microsoft (Schutz vor untergeschobenen Rückrufen, PKCE). 10 Minuten gültig.
create table intern.oauth_zustaende (
  zustand     text primary key,
  person_id   uuid not null references public.personen (id),
  pruefwert   text not null,
  sprache     text not null default 'de',
  erstellt_am timestamptz not null default now()
);

-- Wann ein Hintergrund-Job zuletzt lief (Zeitplan entscheidet daraus, was fällig ist).
create table intern.zeitplan_laeufe (
  job        text primary key,
  zuletzt_am timestamptz,
  ok         boolean,
  meldung    text
);

/** Eigene Microsoft-Verbindung (ohne Token): für «Mein Konto». */
create or replace function public.meine_microsoft_verbindung() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('konto', v.konto, 'verbunden_am', v.verbunden_am, 'genutzt_am', v.genutzt_am, 'fehler', v.fehler)
    from intern.microsoft_verbindungen v
   where v.person_id = intern.meine_person_id() and v.token is not null
$$;
revoke execute on function public.meine_microsoft_verbindung() from public, anon;
grant execute on function public.meine_microsoft_verbindung() to authenticated;

/** Wer ist mit Microsoft verbunden (für die Seite «Verbindungen»); Admins sehen alle, andere nur die Liste der Namen. */
create or replace function public.microsoft_verbindungen() returns table (
  person_id uuid, name text, konto text, verbunden boolean, verbunden_am timestamptz, genutzt_am timestamptz, fehler text
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, v.konto, v.token is not null, v.verbunden_am, v.genutzt_am,
         case when intern.hat_recht('admin') or p.id = intern.meine_person_id() then v.fehler end
    from public.personen p
    left join intern.microsoft_verbindungen v on v.person_id = p.id
   where p.aktiv and p.geloescht_am is null and intern.hat_recht('basis')
   order by p.name
$$;
revoke execute on function public.microsoft_verbindungen() from public, anon;
grant execute on function public.microsoft_verbindungen() to authenticated;

-- Kunde in AbaNinja (V139/V145): Verknüpfung, damit nicht jedes Mal gesucht werden muss.
alter table public.kontakte
  add column if not exists abaninja_id text,
  add column if not exists abaninja_abgeglichen_am timestamptz;
comment on column public.kontakte.abaninja_id is 'UUID des Kunden in AbaNinja (V139). Gesetzt beim Suchen/Anlegen aus der Kundenakte.';
create unique index if not exists kontakte_abaninja_idx on public.kontakte (abaninja_id) where abaninja_id is not null and geloescht_am is null;

-- pg_cron ruft jede Minute die Edge Function «zeitplan» auf. Adresse und Schlüssel stehen im Vault
-- (crm_funktionen_url, crm_zeitplan_schluessel); fehlen sie (z. B. lokal), passiert nichts.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

/** Ruft die Edge Function «zeitplan» auf, falls Adresse und Schlüssel im Vault eingetragen sind. */
create or replace function intern.zeitplan_anstossen() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_schluessel text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'crm_funktionen_url';
  select decrypted_secret into v_schluessel from vault.decrypted_secrets where name = 'crm_zeitplan_schluessel';
  if v_url is null or v_schluessel is null then return; end if;
  perform net.http_post(
    url := v_url || '/zeitplan',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-zeitplan-schluessel', v_schluessel),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
end
$$;
revoke execute on function intern.zeitplan_anstossen() from public, anon, authenticated;

select cron.schedule('crm-zeitplan', '* * * * *', 'select intern.zeitplan_anstossen()');
