-- Prüft «Eingangsrechnungen hochladen» (Chris 27.11.2026): jede Person lädt hoch, Dateiname und Ablage-Jahr nach der
-- Leistungsperiode, Abgrenzung, Freigabe durch einen Prüfer (nie die Person, die hochgeladen hat), Glocke, Ablage
-- in Compta, Mail an AbaNinja nach der Freigabe und Verknüpfung beim Abgleich statt doppelter Rechnung.
-- Ausführen: npm run db:test
begin;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000061a1', 'eh-davis@test.local'),
  ('00000000-0000-0000-0000-0000000061a2', 'eh-erich@test.local'),
  ('00000000-0000-0000-0000-0000000061a3', 'eh-chris@test.local'),
  ('00000000-0000-0000-0000-0000000061a4', 'eh-andere@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000061b1', 'eh_davis', 'Davis Innen', '00000000-0000-0000-0000-0000000061a1', 'innendienst', '{}'),
  ('00000000-0000-0000-0000-0000000061b2', 'eh_erich', 'Erich Prüfer', '00000000-0000-0000-0000-0000000061a2', 'buchhaltung', '{}'),
  ('00000000-0000-0000-0000-0000000061b3', 'eh_chris', 'Chris Prüfer', '00000000-0000-0000-0000-0000000061a3', 'verkauf', '{}'),
  ('00000000-0000-0000-0000-0000000061b4', 'eh_andere', 'Anna Andere', '00000000-0000-0000-0000-0000000061a4', 'verkauf', '{}');
update public.einstellungen
   set wert = jsonb_set(wert, '{eingang}', coalesce(wert -> 'eingang', '{}') || jsonb_build_object(
         'pruefer_ids', '["00000000-0000-0000-0000-0000000061b2", "00000000-0000-0000-0000-0000000061b3"]'::jsonb,
         'abaninja_mail', 'belege@abaninja.test'))
 where schluessel = 'finanzen';
insert into public.dokumente (id, name, mime_typ, ordner, speicher, speicher_pfad, bezug_tabelle) values
  ('00000000-0000-0000-0000-0000000061d1', 'scan.pdf', 'application/pdf', 'eingang', 'intern', 'eingang/x/scan.pdf', 'eingangsrechnungen');
create temp table t_e (id uuid) on commit drop;
grant all on t_e to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000061a1", "role": "authenticated"}', true);
insert into t_e select public.eingang_hochladen(null, jsonb_build_object(
  'lieferant', 'Strassenverkehrsamt Kanton Aargau', 'nummer', '2026-1511295', 'datum', '2026-11-06',
  'faellig_am', '2027-01-31', 'betrag_rappen', 41900, 'iban', 'CH30 3000 0001 5000 2130 8',
  'referenz', '000082114422026015112950010', 'grund', 'KIA EV9', 'periode_von', '2027-01-01',
  'periode_bis', '2027-12-31', 'dokument_id', '00000000-0000-0000-0000-0000000061d1'));
select is((select dateiname from public.eingangsrechnungen_liste where id = (select id from t_e)),
  '20261106_Strassenverkehrsamt Kanton Aargau_2026-1511295_KIA EV9.pdf', 'Dateiname wie in Compta');
select is((select ablage_jahr from public.eingangsrechnungen_liste where id = (select id from t_e)), 2027,
  'Ablage im Jahr der Leistungsperiode');
select ok((select (abgrenzung ->> 'noetig')::boolean from public.eingangsrechnungen_liste where id = (select id from t_e)),
  'Rechnung 2026 für 2027: Abgrenzung nötig');
select is((select status || '|' || iban from public.eingangsrechnungen where id = (select id from t_e)),
  'visum_pl|CH3030000001500021308', 'direkt zur Freigabe, IBAN ohne Leerzeichen');
select ok(not (select ich_visiere from public.eingangsrechnungen_liste where id = (select id from t_e)),
  'wer hochlädt, gibt nicht selbst frei');
reset role;
select is((select count(*)::int from public.benachrichtigungen where titel_de = 'Rechnung freigeben'
             and person_id in ('00000000-0000-0000-0000-0000000061b2', '00000000-0000-0000-0000-0000000061b3')), 2,
  'Glocke an Erich und Chris');
set local role authenticated;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000061a4", "role": "authenticated"}', true);
select is((select count(*)::int from public.eingangsrechnungen_liste where id = (select id from t_e)), 0,
  'andere sehen die Rechnung nicht');
select throws_ok(format('select public.eingang_visieren(%L, true, null)', (select id from t_e)),
  'P0001', 'finanzen.nicht_dein_visum', 'nur Prüfer geben frei');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000061a3", "role": "authenticated"}', true);
select ok((select ich_visiere from public.eingangsrechnungen_liste where id = (select id from t_e)), 'Chris sieht: wartet auf mich');
select ok(public.eingang_hochladen((select id from t_e), jsonb_build_object(
  'lieferant', 'Strassenverkehrsamt Kanton Aargau', 'nummer', '2026-1511295', 'datum', '2026-11-06',
  'faellig_am', '2027-01-31', 'betrag_rappen', 41900, 'grund', 'KIA EV9 Verkehrssteuer', 'periode_von', '2027-01-01',
  'periode_bis', '2027-12-31', 'dokument_id', '00000000-0000-0000-0000-0000000061d1')) is not null, 'Prüfer korrigiert den Grund');
select is(public.eingang_visieren((select id from t_e), true, null), 'bereit', 'eine Freigabe reicht');

reset role;
select is((select an || '|' || status || '|' || (anhaenge -> 0 ->> 'name') from public.ausgangskorb
            where bezug_id = (select id from t_e)),
  'belege@abaninja.test|freigegeben|20261106_Strassenverkehrsamt Kanton Aargau_2026-1511295_KIA EV9 Verkehrssteuer.pdf',
  'nach der Freigabe geht das PDF an AbaNinja');
select is((select dateiname || '|' || jahr from public.eingang_ablage_offen(10) where id = (select id from t_e)),
  '20261106_Strassenverkehrsamt Kanton Aargau_2026-1511295_KIA EV9 Verkehrssteuer.pdf|2027', 'Ablage ist offen');
select public.eingang_ablage_ergebnis((select id from t_e), true, 'item-1', 'https://sp/x.pdf',
  '20261106_Strassenverkehrsamt Kanton Aargau_2026-1511295_KIA EV9 Verkehrssteuer.pdf', 2027, null);
select is((select count(*)::int from public.eingang_ablage_offen(10) where id = (select id from t_e)), 0, 'nach der Ablage erledigt');
update public.eingangsrechnungen set periode_von = '2026-12-01' where id = (select id from t_e);
select is((select jahr || '|' || item_id from public.eingang_ablage_offen(10) where id = (select id from t_e)), '2026|item-1',
  'neues Jahr: wird verschoben, nicht doppelt abgelegt');

-- AbaNinja-Abgleich bringt die Rechnung zurück: verknüpfen statt neu anlegen.
insert into public.kreditor_zahlungen (firma, betrag_rappen, offen_rappen, status, quelle, abaninja_uuid, rechnung_nr)
values ('Strassenverkehrsamt AG', 41900, 41900, 'offen', 'abaninja', 'test-uuid-961', '2026-1511295');
select is((select count(*)::int from public.eingangsrechnungen where abaninja_uuid = 'test-uuid-961'), 1, 'keine doppelte Rechnung');
select is((select quelle || '|' || status from public.eingangsrechnungen where abaninja_uuid = 'test-uuid-961'), 'upload|bereit',
  'mit der hochgeladenen verknüpft');
select ok((select geprueft from public.kreditor_zahlungen where abaninja_uuid = 'test-uuid-961'), 'in den Finanzen als geprüft');

-- Ablehnen geht mit Grund zurück an die Person, die hochgeladen hat.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000061a1", "role": "authenticated"}', true);
insert into t_e select public.eingang_hochladen(null, '{"lieferant": "Swisscom", "betrag_rappen": 9900}');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000061a2", "role": "authenticated"}', true);
select public.eingang_visieren((select id from t_e where id not in (select id from public.eingangsrechnungen where abaninja_uuid is not null)), false, 'falsche Firma');
reset role;
select is((select count(*)::int from public.benachrichtigungen where titel_de = 'Rechnung zurückgewiesen'
             and person_id = '00000000-0000-0000-0000-0000000061b1'), 1, 'Glocke an Davis bei Ablehnung');

select * from finish();
rollback;
