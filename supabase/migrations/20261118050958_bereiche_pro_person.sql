-- Bereiche pro Person (Chris 27.11.2026): «Loris und Chris sehen alles, der Rest muss von uns freigegeben werden.»
-- In der App umgeht nur noch die Administration die Bereiche (nicht mehr «gl»), und ohne Auswahl gibt es nur Mein Tag.
-- Startwerte (Pop-up 27.11.2026 «Wie die Rolle vom 2.11.»): Personen, die noch «Mitarbeit (noch zuordnen)» haben,
-- bekommen ihre Rolle im Geschäft vom 2.11.2026. Eine eigene Auswahl an der Person bleibt (z. B. Davis).
-- Nur wo die Rolle noch «mitarbeit» ist, damit nichts überschrieben wird, was schon jemand gesetzt hat.
update public.personen p
   set rolle = z.rolle
  from (values ('andreas', 'andreas@dimension-solaire.ch', 'projektleitung'),
               ('jose', 'jose@dimension-solaire.ch', 'projektleitung'),
               ('filipe', 'filipe@dimension-solaire.ch', 'verkauf'),
               ('erich', 'erich@dimension-solaire.ch', 'buchhaltung'),
               ('davis', 'davis@dimension-solaire.ch', 'innendienst')) as z (kuerzel, email, rolle)
 where (p.kuerzel = z.kuerzel or lower(p.email) = z.email)
   and p.geloescht_am is null
   and p.rolle = 'mitarbeit';

-- Anmeldung: «gl» öffnet keine Bereiche mehr (vorher leere Liste = alle). Die App lässt nur das Recht «admin» alles
-- sehen; leer heisst jetzt «nichts freigegeben» (nur Mein Tag). Sonst unverändert gegenüber 20261115472364.
CREATE OR REPLACE FUNCTION public.meine_anmeldung()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_person public.personen;
  v_rolle public.rollen;
begin
  select * into v_person from public.personen
  where auth_user_id = auth.uid() and aktiv and geloescht_am is null;
  if not found then
    return null;
  end if;
  select * into v_rolle from public.rollen where schluessel = v_person.rolle;

  -- Höchstens alle 15 Minuten, damit das Protokoll nicht mit Anmeldungen vollläuft.
  if v_person.zuletzt_aktiv is null or v_person.zuletzt_aktiv < now() - interval '15 minutes' then
    update public.personen set zuletzt_aktiv = now() where id = v_person.id;
  end if;

  return jsonb_build_object(
    'id', v_person.id,
    'kuerzel', v_person.kuerzel,
    'name', v_person.name,
    'email', v_person.email,
    'rolle', v_person.rolle,
    'rolle_name', jsonb_build_object('de', v_rolle.name_de, 'fr', v_rolle.name_fr),
    'rechte', to_jsonb(intern.wirksame_rechte(v_person.id)),
    'bereiche', to_jsonb(case when cardinality(v_person.bereiche) > 0 then v_person.bereiche
                              else coalesce(v_rolle.bereiche, '{}') end),
    'ansicht', coalesce(v_rolle.ansicht, 'voll'),
    'sprache', v_person.sprache,
    'darstellung', v_person.darstellung,
    'standort_id', v_person.standort_id,
    'profil', v_person.profil
  );
end;
$function$;
