-- Testdaten für die lokale Entwicklung (npm run db:reset).
-- Echte Daten aus der Vorlage kommen in Phase 3 per Import-Skript, nie über diese Datei.
insert into public.app_info (schluessel, wert) values ('umgebung', 'lokal')
on conflict (schluessel) do update set wert = excluded.wert;
