-- Testdaten für die lokale Entwicklung (npm run db:reset).
-- Echte Daten aus der Vorlage kommen in Phase 3 per Import-Skript, nie über diese Datei.
insert into public.app_info (schluessel, wert) values ('umgebung', 'lokal')
on conflict (schluessel) do update set wert = excluded.wert;

-- Phase 4: drei erfundene Testpersonen, um Rollen und Rechte auszuprobieren (Anmeldung mit Code per E-Mail,
-- die Mails erscheinen lokal unter http://127.0.0.1:54324). Keine echten Personen, keine echten Adressen.
insert into public.personen (kuerzel, name, email, rolle, sprache, standort_id) values
  ('seed_admin', 'Anna Admin', 'admin@test.local', 'admin', 'de', (select id from public.standorte where kuerzel = 'muri')),
  ('seed_verkauf', 'Vera Verkauf', 'verkauf@test.local', 'verkauf', 'de', (select id from public.standorte where kuerzel = 'muri')),
  ('seed_buchhaltung', 'Benoît Buchhaltung', 'buchhaltung@test.local', 'buchhaltung', 'fr', (select id from public.standorte where kuerzel = 'bulle'))
on conflict (kuerzel) do nothing;

-- Phase 9b: erfundener Monteur für die Handy-Ansicht «Baustelle & Rapporte».
insert into public.personen (kuerzel, name, email, rolle, sprache, standort_id) values
  ('seed_montage', 'Mario Montage', 'montage@test.local', 'montage', 'de', (select id from public.standorte where kuerzel = 'bulle'))
on conflict (kuerzel) do nothing;

-- Monteur-Version (einfache Ansicht: nur Zeit, Spesen, Plan), erfunden.
insert into public.personen (kuerzel, name, email, rolle, sprache, standort_id) values
  ('seed_monteur', 'Milo Monteur', 'milo@test.local', 'monteur', 'de', (select id from public.standorte where kuerzel = 'bulle'))
on conflict (kuerzel) do nothing;

-- Erfundene Finanzdaten, damit man sieht, wer was sieht. Kontakte bewusst nicht: sie würden
-- Kundennummern belegen, die der Import der Vorlage braucht.
insert into public.kreditor_zahlungen (firma, betrag_rappen, alt_id) values
  ('Testlieferant Solar AG', 1250000, 'seed:kreditor:1'),
  ('Testlieferant Gerüst GmbH', 380000, 'seed:kreditor:2')
on conflict (alt_id) do nothing;
