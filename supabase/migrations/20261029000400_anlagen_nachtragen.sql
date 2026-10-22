-- Phase 9, Teil 4: Abgeschlossene Projekte aus V233 haben noch keine Anlage-Daten. Einmal nachtragen,
-- damit Service und Wartung sie finden: Komponenten aus der Offerte, IBN = Ende des letzten festen Einsatzes
-- (falls bekannt). Garantie und Kontrolle bleiben leer, bis sie jemand einträgt.
select intern.anlage_zum_projekt(p.id, (select max(e.bis) from public.einsaetze e
                                         where e.projekt_id = p.id and e.art <> 'geplant' and e.geloescht_am is null))
  from public.projekte p
 where p.status = 'abgeschlossen' and p.geloescht_am is null and p.objekt_id is not null
   and not exists (select 1 from public.anlagen a where a.projekt_id = p.id and a.geloescht_am is null);
