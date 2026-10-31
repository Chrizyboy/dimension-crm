-- Gewicht der Artikel auf Gramm genau (3 Nachkommastellen). V233 führte Kleinteile mit 0.027 kg;
-- numeric(10,2) rundete beim Import auf 0.03 kg (42 Artikel, gefunden im Abgleich alt gegen neu).
-- Die Sicht preisliste hängt an der Spalte und wird mit ihrer bisherigen Definition neu angelegt.

do $$
declare
  definition text := pg_get_viewdef('public.preisliste'::regclass);
begin
  drop view public.preisliste;
  alter table public.artikel alter column gewicht_kg type numeric(10, 3);
  execute 'create view public.preisliste as ' || definition;
end
$$;

grant select on public.preisliste to authenticated;
