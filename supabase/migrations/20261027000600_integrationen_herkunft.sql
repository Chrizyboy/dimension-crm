-- Phase 8: «integrationen» hat seit 0500 einen Papierkorb (geloescht_am) und zählt damit als Fachtabelle.
-- Wie alle Fachtabellen bekommt sie die Herkunftsspalten (alt_id, alt_daten), auch wenn V233 dafür
-- keine Daten hat; so bleibt die Regel «jede Fachtabelle kann den alten Datensatz aufnehmen» ohne Ausnahme.
alter table public.integrationen
  add column if not exists alt_id    text,
  add column if not exists alt_daten jsonb;
