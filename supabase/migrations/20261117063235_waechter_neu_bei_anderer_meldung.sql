-- Dienst-Wächter: eine neue Glocke, wenn sich bei einem laufenden Ausfall der Grund ändert.
-- Bisher läutete jeder Schlüssel nur einmal, bis der Ausfall behoben war. So blieb bei SMS die Meldung «netzwerk»
-- vom 03.11. stehen, obwohl ASPSMS seit dem Umbau auf pg_net erreichbar ist und nun die Zugangsdaten ablehnt
-- (sms_3). Gleicher Text: weiterhin keine zweite Glocke.

alter table intern.dienst_meldungen add column text_de text;

/** Glocke einmal pro Ausfall und Grund. Gibt 1 zurück, wenn gemeldet wurde. */
create or replace function intern.waechter_melden(p_schluessel text, p_an uuid[], p_titel_de text, p_titel_fr text,
                                                  p_text_de text, p_text_fr text, p_ziel text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_alt intern.dienst_meldungen;
begin
  if coalesce(cardinality(p_an), 0) = 0 then return 0; end if;
  select * into v_alt from intern.dienst_meldungen where schluessel = p_schluessel for update;
  if found and v_alt.text_de is not distinct from p_text_de then return 0; end if;
  insert into intern.dienst_meldungen (schluessel, text_de) values (p_schluessel, p_text_de)
  on conflict (schluessel) do update set text_de = excluded.text_de, gemeldet_am = now();
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
  select x, 'warnung', p_titel_de, p_titel_fr, p_text_de, p_text_fr, p_ziel, true from unnest(p_an) x;
  return 1;
end
$$;
