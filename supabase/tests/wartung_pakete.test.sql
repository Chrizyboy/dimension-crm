-- Prüft die Wartungsverträge nach den Paketen der Website (Entscheid 0037): Tarif nach Paket und kWp, Preis als
-- Vorschlag mit Rabatt, Rhythmus aus dem Paket, Laufzeit und Kündigung, Jahresrechnung als Entwurf (mit
-- Rabattzeile, ohne doppelte) und Einstellung nur Administration.
-- Ausführen: npm run db:test
begin;
select plan(17);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000036a1', 'wp-verkauf@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000036b1', 'wp_verkauf', 'Vera Verkauf', '00000000-0000-0000-0000-0000000036a1', 'verkauf', '{}');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000036c1', 'person', 'privat', 'Lea', 'Beispiel', 'fr');

-- Tarif der Website
select is(public.wartung_tarif('comfort', 11.2), 34900, 'Comfort bis 20 kWp: CHF 349');
select is(public.wartung_tarif('premium', 42), 69000, 'Premium 20–50 kWp: CHF 690');
select is(public.wartung_tarif('essentiel', 100), 29000, 'Essentiel 50–100 kWp: CHF 290');
select is(public.wartung_tarif('premium', 120), null, 'Über 100 kWp auf Anfrage');

-- Vertrag ohne Preis: Tarif wird Preis, Rhythmus aus dem Paket
insert into public.wartungsvertraege (id, kontakt_id, start_am, paket, anlage_kwp, sprache, notiz) values
  ('00000000-0000-0000-0000-0000000036d1', '00000000-0000-0000-0000-0000000036c1', current_date + 10, 'premium', 42, 'fr', 'wp-1');
select is((select preis_netto_rappen from public.wartungsvertraege where notiz = 'wp-1'), 69000, 'Preis = Tarif');
select is((select rhythmus_monate from public.wartungsvertraege where notiz = 'wp-1'), 12, 'Premium: jährliche Inspektion');

-- Rabatt: eigener Preis bleibt, Tarif daneben
update public.wartungsvertraege set preis_netto_rappen = 62100 where notiz = 'wp-1';
select is((select tarif_netto_rappen from public.wartungsvertraege where notiz = 'wp-1'), 69000, 'Tarif bleibt neben dem Rabattpreis');

-- Essentiel hat keine Inspektionen
insert into public.wartungsvertraege (kontakt_id, start_am, paket, anlage_kwp, notiz) values
  ('00000000-0000-0000-0000-0000000036c1', '2026-01-01', 'essentiel', 9, 'wp-2');
select is((select naechste_wartung from public.wartungsvertraege where notiz = 'wp-2'), null, 'Essentiel: keine Inspektion');
select is((select verrechnet_bis from public.wartungsvertraege where notiz = 'wp-2'),
  (public.wartung_laeuft_bis('2026-01-01', 1, current_date) + 1 - interval '1 year')::date - 1,
  'Rückdatiert: erste Rechnung für das laufende Vertragsjahr, keine alten Jahre');
select throws_ok($$ insert into public.wartungsvertraege (kontakt_id, start_am, paket) values
  ('00000000-0000-0000-0000-0000000036c1', '2026-01-01', 'gold') $$, 'wartung.paket_unbekannt', 'Unbekanntes Paket abgelehnt');

-- Laufzeit: 3 Jahre Mindestlaufzeit, danach jeweils 1 Jahr
select is(public.wartung_laeuft_bis('2023-11-01', 3, '2026-11-02'), '2027-10-31'::date, 'Nach der Mindestlaufzeit +1 Jahr');

-- Jahresrechnung 30 Tage im Voraus, mit Rabattzeile, nicht doppelt
select is(public.wartung_jahreslauf() >= 1, true, 'Jahreslauf legt Rechnungen an');
select is((select jsonb_array_length(positionen) from public.rechnungen
            where wartungsvertrag_id = '00000000-0000-0000-0000-0000000036d1'), 2, 'Tarif und Rabatt als Zeilen');
select is((select (positionen -> 1 ->> 'preis_rappen')::int from public.rechnungen
            where wartungsvertrag_id = '00000000-0000-0000-0000-0000000036d1'), -6900, 'Rabais CHF 69');
select public.wartung_jahreslauf();
select is((select count(*) from public.rechnungen where wartungsvertrag_id = '00000000-0000-0000-0000-0000000036d1'),
  1::bigint, 'Zweiter Lauf erzeugt keine doppelte Rechnung');

-- Kündigung: Ende des laufenden Vertragsjahrs
select is(public.wartung_kuendigen('00000000-0000-0000-0000-0000000036d1', current_date),
  public.wartung_laeuft_bis(current_date + 10, 3, current_date), 'Kündigung auf Ende der Mindestlaufzeit');

-- Pakete und Preise nur Administration
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000036a1", "role": "authenticated"}', true);
select throws_ok($$ update public.einstellungen set wert = wert where schluessel = 'wartung_pakete' $$,
  'einstellungen.kein_recht', 'Verkauf darf Pakete und Preise nicht ändern');

select * from finish();
rollback;
