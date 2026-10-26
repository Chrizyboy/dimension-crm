-- Phase 16, Teil 2: Bereitschaft für den Umzug in die Cloud. Eine Abfrage für Einstellungen › Betrieb: Was im
-- echten Projekt schon eingerichtet ist (Zeitplan, Sicherung, Personen, Daten). Nur ja/nein und Zahlen, nie Werte
-- aus dem Tresor (Vault).

/** Stand des Betriebs für die Administration (Einstellungen › Betrieb). */
create or replace function public.betrieb_stand()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not intern.hat_recht('admin') then
    raise exception 'betrieb.kein_recht' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'schema', (select max(version) from supabase_migrations.schema_migrations),
    'tresor_url', exists (select 1 from vault.secrets where name = 'crm_funktionen_url'),
    'tresor_schluessel', exists (select 1 from vault.secrets where name = 'crm_zeitplan_schluessel'),
    'zeitplan_zuletzt', (select max(zuletzt_am) from intern.zeitplan_laeufe),
    'sicherung_zuletzt', (select max(begonnen_am) from public.sicherungen where status = 'ok'),
    'personen_aktiv', (select count(*) from public.personen where aktiv and geloescht_am is null),
    'personen_ohne_rolle', (select count(*) from public.personen
                             where aktiv and geloescht_am is null and rolle = 'mitarbeit'),
    'personen_angemeldet', (select count(*) from public.personen
                             where aktiv and geloescht_am is null and auth_user_id is not null),
    'microsoft_verbunden', (select count(*) from intern.microsoft_verbindungen where token is not null),
    'kontakte', (select count(*) from public.kontakte where geloescht_am is null),
    'offerten', (select count(*) from public.offerten where geloescht_am is null),
    'import_zuletzt', (select max(beendet_am) from public.import_laeufe where ok)
  );
end
$$;
revoke execute on function public.betrieb_stand() from public, anon;
grant execute on function public.betrieb_stand() to authenticated;
