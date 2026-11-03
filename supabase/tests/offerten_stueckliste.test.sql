-- Prüft die Stückliste aus Eturnity (Entscheid 0046, Schritt 3): speichern über offerte_werte_setzen, im Verlauf nur
-- die Zahl der Positionen, «nur leere Felder» überschreibt nicht, und die Materialliste des Projekts kommt aus der
-- Stückliste (nur Material, ohne Optionen, Artikel nach Ähnlichkeit in der passenden Kategorie).
-- Ausführen: npm run db:test
begin;
select plan(9);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000046a1', 'st-andy@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000046b1', 'st_andy', 'Andy Stückliste', '00000000-0000-0000-0000-0000000046a1', 'innendienst', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000046c1', 'person', 'privat', 'Lea', 'Stueckli', 'de');
insert into public.offerten (id, nummer, kontakt_id) values
  ('00000000-0000-0000-0000-0000000046f1', 'T46-1', '00000000-0000-0000-0000-0000000046c1');
insert into public.artikel (id, name, kategorie, einheit) values
  ('00000000-0000-0000-0000-000000004601', 'Muster Solar MS-450 Black', 'module', 'Stk'),
  ('00000000-0000-0000-0000-000000004602', 'Beispiel Hybrid 8.0', 'wechselrichter', 'Stk');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000046a1", "role": "authenticated"}', true);

select throws_ok($$ select public.offerte_werte_setzen('00000000-0000-0000-0000-0000000046f1', '{"stueckliste": {"x": 1}}', 'test') $$,
  'P0001', 'offerten.stueckliste_ungueltig', 'Stückliste muss eine Liste sein');

select public.offerte_werte_setzen('00000000-0000-0000-0000-0000000046f1', '{"eturnity_id": "hyd-46", "stueckliste": [
  {"gruppe": "Solarstromanlage", "typ": "modul", "bezeichnung": "Muster Solar MS-450 Black", "menge": 24, "einheit": "St.", "ep_rappen": 8500, "preis_rappen": 204000, "art": "material", "optional": false},
  {"gruppe": "Solarstromanlage", "typ": "wechselrichter", "bezeichnung": "Beispiel Hybrid 8.0", "menge": 1, "einheit": "St.", "ep_rappen": 190000, "preis_rappen": 190000, "art": "material", "optional": false},
  {"gruppe": "Solarstromanlage", "typ": null, "bezeichnung": "DC Solarkabel", "menge": 50, "einheit": "m", "ep_rappen": 130, "preis_rappen": 6500, "art": "material", "optional": false},
  {"gruppe": "Solarstromanlage", "typ": null, "bezeichnung": "Montage: Module", "menge": 1, "einheit": "St.", "ep_rappen": 240000, "preis_rappen": 240000, "art": "leistung", "optional": false},
  {"gruppe": "Solarstromanlage", "typ": null, "bezeichnung": "Notstrom-Box", "menge": 1, "einheit": "St.", "ep_rappen": 50000, "preis_rappen": 50000, "art": "material", "optional": true}
]}', 'eturnity-pdf');

select is((select jsonb_array_length(stueckliste) from public.offerten where id = '00000000-0000-0000-0000-0000000046f1'), 5,
  'Stückliste gespeichert');
select is((select eturnity_id from public.offerten where id = '00000000-0000-0000-0000-0000000046f1'), 'hyd-46',
  'Eturnity-Projekt gespeichert');
select is((select (details -> 'positionen')::int from public.aktivitaeten
            where kontakt_id = '00000000-0000-0000-0000-0000000046c1' and details ->> 'offerte_id' = '00000000-0000-0000-0000-0000000046f1'
            order by erstellt_am desc limit 1), 5, 'Verlauf nennt nur die Zahl der Positionen');
select ok(not exists (select 1 from public.aktivitaeten
            where kontakt_id = '00000000-0000-0000-0000-0000000046c1' and details -> 'werte' ? 'stueckliste'),
  'die ganze Liste steht nicht im Verlauf');

select public.offerte_werte_setzen('00000000-0000-0000-0000-0000000046f1', '{"stueckliste": []}', 'eturnity-pdf', true);
select is((select jsonb_array_length(stueckliste) from public.offerten where id = '00000000-0000-0000-0000-0000000046f1'), 5,
  '«nur leere Felder» behält die Stückliste');

-- Auftrag: die Materialliste entsteht aus der Stückliste (Kabel ohne Artikel, Montage und Option nicht).
reset role;
insert into public.projekte (id, nummer, kontakt_id, offerte_id, status, standort_id) values
  ('00000000-0000-0000-0000-0000000046e1', 'P46', '00000000-0000-0000-0000-0000000046c1', '00000000-0000-0000-0000-0000000046f1',
   'auftrag', (select id from public.standorte where kuerzel = 'muri'));
select is((select count(*)::int from public.projekt_material where projekt_id = '00000000-0000-0000-0000-0000000046e1'), 3,
  'Materialliste aus der Stückliste: nur Material, ohne Optionen');
select is((select array_agg(artikel_id order by reihenfolge) from public.projekt_material
            where projekt_id = '00000000-0000-0000-0000-0000000046e1'),
  array['00000000-0000-0000-0000-000000004601', '00000000-0000-0000-0000-000000004602', null]::uuid[],
  'Module und Wechselrichter finden ihren Artikel, das Kabel bleibt offen');
select is((select array_agg(einheit order by reihenfolge) from public.projekt_material
            where projekt_id = '00000000-0000-0000-0000-0000000046e1'), array['Stk', 'Stk', 'm'],
  'Einheiten wie im Einkauf');

select * from finish();
rollback;
