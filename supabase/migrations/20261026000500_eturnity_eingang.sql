-- Phase 7, Teil 5: Eingang für Meldungen aus Eturnity (Webhook, z. B. «Offerte erstellt» oder «Phase geändert»).
-- Eturnity hat keine offene Schnittstelle zum Abfragen; es kann aber bei Ereignissen eine Adresse aufrufen
-- (direkt oder über Zapier/Make). Die Edge Function «eturnity-eingang» prüft das Geheimnis und legt die
-- Meldung hier unverändert ab. Zuordnen zur Offerte tut ein Mensch oder die Nummer im Text (Regel 7: Daten,
-- keine Anweisungen).

create table public.eturnity_eingang (
  id uuid primary key default gen_random_uuid(),
  ereignis text,
  eturnity_id text,
  offertnummer text,
  daten jsonb not null default '{}',
  empfangen_am timestamptz not null default now(),
  offerte_id uuid references public.offerten (id),
  erledigt_am timestamptz,
  erledigt_von text
);
comment on table public.eturnity_eingang is 'Rohe Webhook-Meldungen aus Eturnity, zum Zuordnen in «Offerten».';
select intern.richte_fachtabelle_ein('eturnity_eingang');
create index eturnity_eingang_offen_idx on public.eturnity_eingang (empfangen_am desc) where erledigt_am is null;

/**
 * Meldung einer Offerte zuordnen: setzt die Eturnity-ID an der Offerte (wenn leer) und erledigt die Meldung.
 * p_offerte = null erledigt die Meldung ohne Zuordnung (z. B. Test oder Doppelmeldung).
 */
create or replace function public.eturnity_zuordnen(p_eingang uuid, p_offerte uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  e public.eturnity_eingang;
begin
  select * into e from public.eturnity_eingang where id = p_eingang and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  update public.eturnity_eingang set offerte_id = p_offerte, erledigt_am = now(), erledigt_von = intern.mein_vorname()
   where id = e.id;
  if p_offerte is not null and e.eturnity_id is not null then
    update public.offerten set eturnity_id = coalesce(eturnity_id, e.eturnity_id) where id = p_offerte;
  end if;
end
$$;
revoke execute on function public.eturnity_zuordnen(uuid, uuid) from public, anon;
grant execute on function public.eturnity_zuordnen(uuid, uuid) to authenticated;
