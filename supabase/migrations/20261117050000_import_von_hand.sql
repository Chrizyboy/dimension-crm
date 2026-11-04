-- Schutz für den Import am Stichtag: Was im neuen CRM von Hand geändert wurde, überschreibt ein zweiter Import nicht.
-- «Von Hand» = ein Eintrag im Änderungsprotokoll mit Person (benutzer). Import und Zeitplan schreiben ohne Person.

/**
 * Welche der übernommenen Zeilen (alt_id) hat eine Person im neuen CRM geändert, in den Papierkorb gelegt oder
 * wiederhergestellt? Nur für den Import (service_role).
 */
create or replace function public.import_von_hand_geaendert(p_tabelle text, p_alt_ids text[])
returns table (alt_id text, zuletzt timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Nur Tabellen mit alt_id; der Name wird geprüft, bevor er in die Abfrage kommt.
  if not exists (
    select 1 from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = p_tabelle and c.column_name = 'alt_id'
  ) then
    raise exception 'import_tabelle_unbekannt';
  end if;
  return query execute format(
    $q$select t.alt_id::text, max(a.zeitpunkt)
         from public.%I t
         join public.aenderungsprotokoll a on a.tabelle = %L and a.datensatz = t.id
        where t.alt_id = any($1) and a.benutzer is not null
          and a.aktion in ('geaendert', 'papierkorb', 'wiederhergestellt')
        group by t.alt_id$q$,
    p_tabelle, p_tabelle)
  using p_alt_ids;
end;
$$;

revoke all on function public.import_von_hand_geaendert(text, text[]) from public, anon, authenticated;
grant execute on function public.import_von_hand_geaendert(text, text[]) to service_role;
