-- Prüft, dass der Abgleich Rechnungen übernimmt, die direkt in AbaNinja gestellt wurden (Chris 4.11.2026):
-- Kunde über AbaNinja-UUID oder Kundennummer, bezahlt/teilbezahlt/offen, Entwürfe und Unbekannte nicht, nicht doppelt,
-- keine Automation, Storno aus AbaNinja und Zahlung beim nächsten Abgleich. Ausführen: npm run db:test
begin;
select plan(14);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000061a1', 'p61-bh@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000061b1', 'p61_bh', 'Bruno Buchhaltung', '00000000-0000-0000-0000-0000000061a1', 'buchhaltung', '{}', 'de');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache, abaninja_id, kundennummer) values
  ('00000000-0000-0000-0000-0000000061c1', 'person', 'privat', 'Anna', 'Verknüpft', 'de', 'aba-p61-1', 961001),
  ('00000000-0000-0000-0000-0000000061c2', 'person', 'privat', 'Paul', 'Nummer', 'fr', null, 961002);
insert into public.projekte (id, nummer, kontakt_id, titel, ablauf_vorlage_id) values
  ('00000000-0000-0000-0000-0000000061e1', '961201', '00000000-0000-0000-0000-0000000061c1', 'PV Anna',
   (select id from public.ablauf_vorlagen where schluessel = 'pv'));

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000061a1", "role": "authenticated"}', true);
set local role authenticated;

create temp table t_erg on commit drop as
select public.abaninja_abgleich_anwenden($j${"belege": [], "rechnungen": [
  {"uuid": "inv-p61-1", "nummer": "RE-P61-1", "status": "open", "total_rappen": 1250000, "offen_rappen": 250000,
   "datum": "2026-10-01", "faellig_am": "2026-10-31", "titel": "Schlussrechnung 961201", "reference": "",
   "empfaenger": ["aba-p61-1"], "kundennummer": ""},
  {"uuid": "inv-p61-2", "nummer": "RE-P61-2", "status": "paid", "total_rappen": 9900, "offen_rappen": 0,
   "datum": "2026-09-01", "titel": "Service", "empfaenger": ["aba-p61-2"], "kundennummer": "961002"},
  {"uuid": "inv-p61-3", "nummer": "RE-P61-3", "status": "draft", "total_rappen": 5000, "offen_rappen": 5000,
   "empfaenger": ["aba-p61-1"]},
  {"uuid": "inv-p61-4", "nummer": "RE-P61-4", "status": "open", "total_rappen": 7000, "offen_rappen": 7000,
   "empfaenger": ["unbekannt"], "kundennummer": "999999999"}
]}$j$::jsonb) as e;

select is((select (e ->> 'rechnungen_neu')::int from t_erg), 2, 'zwei Rechnungen aus AbaNinja übernommen');
select is((select (e ->> 'ohne_kunde')::int from t_erg), 1, 'eine ohne bekannten Kunden gemeldet');
select is((select status from public.rechnungen where abaninja_uuid = 'inv-p61-1'), 'teilbezahlt', 'offen mit Teilzahlung');
select is((select total_rappen - bezahlt_rappen from public.rechnungen where abaninja_uuid = 'inv-p61-1'), 250000::bigint,
  'offener Betrag wie in AbaNinja');
select is((select projekt_id from public.rechnungen where abaninja_uuid = 'inv-p61-1'),
  '00000000-0000-0000-0000-0000000061e1'::uuid, 'Projekt aus dem Titel');
select is((select nummer || '/' || quelle from public.rechnungen where abaninja_uuid = 'inv-p61-1'), 'RE-P61-1/abaninja',
  'Nummer aus AbaNinja, Quelle abaninja');
select is((select status from public.rechnungen where abaninja_uuid = 'inv-p61-2'), 'bezahlt', 'bezahlte über die Kundennummer');
select is((select abaninja_id from public.kontakte where id = '00000000-0000-0000-0000-0000000061c2'), 'aba-p61-2',
  'Kunde über die Kundennummer mit AbaNinja verknüpft');
select ok(not exists (select 1 from public.rechnungen where abaninja_uuid in ('inv-p61-3', 'inv-p61-4')),
  'Entwurf und Unbekannte nicht übernommen');
reset role;
select ok(not exists (select 1 from intern.automation_signale s join public.rechnungen r on r.id = s.bezug_id
                       where r.abaninja_uuid like 'inv-p61-%' and not s.verteilt),
  'übernommene Rechnungen lösen keine Automation aus');
set local role authenticated;

-- Zweiter Abgleich: Rest bezahlt, nicht doppelt übernommen; dann in AbaNinja storniert.
select is((public.abaninja_abgleich_anwenden($j${"rechnungen": [
  {"uuid": "inv-p61-1", "nummer": "RE-P61-1", "status": "paid", "total_rappen": 1250000, "offen_rappen": 0,
   "empfaenger": ["aba-p61-1"]}]}$j$::jsonb) ->> 'zahlungen')::int, 1, 'Restzahlung beim nächsten Abgleich');
select is((select count(*)::int from public.rechnungen where abaninja_uuid = 'inv-p61-1'), 1, 'nicht doppelt');
select is((select status from public.rechnungen where abaninja_uuid = 'inv-p61-1'), 'bezahlt', 'jetzt bezahlt');
select public.abaninja_abgleich_anwenden($j${"rechnungen": [
  {"uuid": "inv-p61-2", "nummer": "RE-P61-2", "status": "cancelled", "total_rappen": 9900, "offen_rappen": 0}]}$j$::jsonb);
select is((select status from public.rechnungen where abaninja_uuid = 'inv-p61-2'), 'storniert', 'Storno aus AbaNinja übernommen');

select * from finish();
rollback;
