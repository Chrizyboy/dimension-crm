-- Auftragsbestätigung statt Werkvertrag (Chris 27.11.2026, Fall Weller 101679, Entscheid 0061).
-- Neue Angaben im Vertrag: Dokumentart, vereinbarte Funktionen (Kundenziele), Bemerkungen des Kunden vom
-- Bestellschein und die bestellten Optionen der Offerte (Bezeichnungen aus der Stückliste).

/** Nur bekannte Angaben übernehmen; leere Texte und leere Listen entfernen. */
create or replace function intern.werkvertrag_angaben(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, v), '{}')
    from jsonb_each(coalesce(p, '{}')) e(k, v)
   where k in ('gegenstand', 'material', 'beginn', 'fertig', 'optionen', 'ansprechperson',
               'art', 'ziele', 'bemerkungen', 'gewaehlt')
     and v <> '""'::jsonb and v <> 'null'::jsonb and v <> '[]'::jsonb
     and (k <> 'art' or v in ('"werkvertrag"'::jsonb, '"auftragsbestaetigung"'::jsonb))
$$;
