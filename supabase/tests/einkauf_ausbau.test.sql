-- Prüft Einkauf & Material vollständig (Entscheid 0039): Sammelbestellung über Projekte mit Runden auf die
-- Verpackungseinheit, Freigabegrenze und Vorlegen, Auftragsbestätigung mit Abweichungen, Wareneingang mit
-- Lieferschein, Materialplan, Rechnungsabgleich mit AbaNinja-Kreditoren, Glocke und geschützte Einstellung.
-- Ausführen: npm run db:test
begin;
select plan(25);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000eb0a1', 'eb-einkauf@test.local'),
  ('00000000-0000-0000-0000-0000000eb0a2', 'eb-chef@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000eb0b1', 'eb_ek', 'Erika Einkauf', 'eb-einkauf@test.local', '00000000-0000-0000-0000-0000000eb0a1', 'projektleitung', '{preise}'),
  ('00000000-0000-0000-0000-0000000eb0b2', 'eb_gl', 'Gustav Chef', 'eb-chef@test.local', '00000000-0000-0000-0000-0000000eb0a2', 'projektleitung', '{preise}');
update public.einstellungen set wert = wert || '{"freigabe_grenze_rappen": 100000, "freigabe_durch": ["eb-chef@test.local"]}'
 where schluessel = 'einkauf';
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000eb0c1', 'person', 'privat', 'Anne', 'Sciboz', 'fr');
insert into public.artikel (id, name, kategorie, einheit) values
  ('00000000-0000-0000-0000-0000000eb001', 'Testmodul 455 W', 'module', 'Stk');
insert into public.lieferantenpreise (artikel_id, lieferant_id, artikelnummer, ek_rappen, verpackungseinheit, lieferzeit_tage) values
  ('00000000-0000-0000-0000-0000000eb001', (select id from public.lieferanten where name = 'Tritec'), 'T-455', 10000, 36, 3);
insert into public.projekte (id, nummer, kontakt_id, status, standort_id, baubeginn) values
  ('00000000-0000-0000-0000-0000000eb0e1', 'PEB-1', '00000000-0000-0000-0000-0000000eb0c1', 'auftrag',
   (select id from public.standorte where kuerzel = 'bulle'), current_date + 30),
  ('00000000-0000-0000-0000-0000000eb0e2', 'PEB-2', '00000000-0000-0000-0000-0000000eb0c1', 'auftrag',
   (select id from public.standorte where kuerzel = 'bulle'), current_date + 1);
insert into public.projekt_material (projekt_id, artikel_id, bezeichnung, menge) values
  ('00000000-0000-0000-0000-0000000eb0e1', '00000000-0000-0000-0000-0000000eb001', 'Testmodul 455 W', 28),
  ('00000000-0000-0000-0000-0000000eb0e2', '00000000-0000-0000-0000-0000000eb001', 'Testmodul 455 W', 14);
insert into public.kreditor_zahlungen (id, firma, rechnung_nr, rechnung_am, betrag_rappen, lieferant_id) values
  ('00000000-0000-0000-0000-0000000eb0f1', 'Tritec AG', 'RE-77', current_date, 900000, (select id from public.lieferanten where name = 'Tritec'));

create temp table t_seq on commit drop as select last_value, is_called from intern.bestell_nummer;
create temp table t_b (id uuid) on commit drop;
grant all on t_b to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000eb0a1", "role": "authenticated"}', true);

-- Materialplan und Bedarf
select is((select gefaehrdet from public.materialplan where id = '00000000-0000-0000-0000-0000000eb0e2'), true,
  'Montage morgen, nichts bestellt: gefährdet');
select is((select gefaehrdet from public.materialplan where id = '00000000-0000-0000-0000-0000000eb0e1'), false,
  'Montage in 30 Tagen: noch nicht gefährdet');
select is((select bestellen_bis from public.einkauf_bedarf where projekt_id = '00000000-0000-0000-0000-0000000eb0e1'),
  intern.arbeitstage_minus(current_date + 30, 3 + 5), 'bestellen bis = Montage − Lieferzeit − Puffer (Arbeitstage)');

-- Sammelbestellung: beide Projekte in EINEN Entwurf ans Lager Bulle, auf die Palette (36) gerundet
select is((public.sammelbestellung((select id from public.lieferanten where name = 'Tritec')) -> 'bestellungen'
           -> 0) is not null, true, 'Sammelbestellung angelegt');
insert into t_b select id from public.bestellungen where lieferant_id = (select id from public.lieferanten where name = 'Tritec')
   and status = 'entwurf' and erstellt_von = auth.uid();
select is((select count(*) from t_b), 1::bigint, 'ein Entwurf für beide Projekte');
select is((select projekt_id from public.bestellungen where id = (select id from t_b)), null, 'Sammelbestellung ohne einzelnes Projekt');
select is((select sum(menge) from public.bestellpositionen where bestellung_id = (select id from t_b)), 72.000,
  '42 gebraucht, auf 2 Paletten (72) gerundet');
select is((select menge from public.bestellpositionen where bestellung_id = (select id from t_b) and projekt_material_id is null), 30.000,
  'Rest 30 als Lager-Position ohne Projekt');
select is((select projekte from public.bestellungen_liste where id = (select id from t_b)), 'PEB-1, PEB-2', 'Leitstand zeigt beide Projekte');
select is((select bestellt_von from public.bestellungen where id = (select id from t_b)), '00000000-0000-0000-0000-0000000eb0b1'::uuid,
  'bestellende Person gemerkt');

-- Freigabe über der Grenze nur durch die Freigebenden
select throws_ok($$ select public.bestellung_freigeben((select id from t_b)) $$, 'P0001', 'einkauf.freigabe_grenze',
  'CHF 7200 über der Grenze 1000: Einkauf darf nicht selbst freigeben');
select lives_ok($$ select public.bestellung_vorlegen((select id from t_b)) $$, 'zur Freigabe vorgelegt');
reset role;
select is((select count(*) from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000eb0b2'
            and ziel like '/purchasing?bestellung=%'), 1::bigint, 'Glocke beim Freigebenden');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000eb0a2", "role": "authenticated"}', true);
select lives_ok($$ select public.bestellung_freigeben((select id from t_b)) $$, 'Freigebender gibt frei');
select lives_ok($$ select public.bestellung_bestellt((select id from t_b), current_date) $$, 'per Webshop bestellt');
select is((select schritt from public.bestellungen_liste where id = (select id from t_b)), 'ab_offen', 'Schritt: AB offen');

-- Auftragsbestätigung mit Preisabweichung
select is(public.bestellung_ab_erfassen((select id from t_b), jsonb_build_object('nummer', 'AB-1', 'termin', current_date + 2,
  'positionen', (select jsonb_agg(jsonb_build_object('id', id, 'ek_rappen', 10500)) from public.bestellpositionen
                  where bestellung_id = (select id from t_b) and projekt_material_id is null))), 1,
  'eine Position weicht im Preis ab');
select results_eq($$ select schritt, erwartet_am, gefaehrdet from public.bestellungen_liste where id = (select id from t_b) $$,
  $$ values ('unterwegs'::text, current_date + 2, true) $$, 'bestätigt nach Montage PEB-2: unterwegs und gefährdet');

-- Wareneingang mit Lieferschein: beide Projekte bekommen ihre Reservierung
select is(public.wareneingang_buchen((select id from t_b), jsonb_build_object('lieferschein', 'LS-1', 'positionen',
  (select jsonb_agg(jsonb_build_object('id', id, 'menge', menge)) from public.bestellpositionen where bestellung_id = (select id from t_b)))),
  'geliefert', 'alles geliefert');
select results_eq($$ select (select lieferscheine from public.bestellungen where id = (select id from t_b)),
                            (select sum(reserviert) from public.projekt_material where artikel_id = '00000000-0000-0000-0000-0000000eb001') $$,
  $$ values ('{LS-1}'::text[], 42.000) $$, 'Lieferschein vermerkt, 42 für die Projekte reserviert');

-- Rechnungsabgleich: Kreditor aus AbaNinja passt nicht (CHF 9000 statt ca. 7'394 inkl. MWST)
select is((select count(*) from public.bestellung_rechnungen((select id from t_b))), 1::bigint, 'Lieferantenrechnung vorgeschlagen');
select throws_ok($$ select public.bestellung_rechnung((select id from t_b), jsonb_build_object('kreditor_id',
  '00000000-0000-0000-0000-0000000eb0f1', 'geprueft', true)) $$, 'P0001', 'einkauf.rechnung_abweichung',
  'grosse Abweichung braucht eine Notiz');
select lives_ok($$ select public.bestellung_rechnung((select id from t_b), jsonb_build_object('kreditor_id',
  '00000000-0000-0000-0000-0000000eb0f1', 'geprueft', true, 'notiz', 'Fracht und Palettenpfand')) $$, 'mit Notiz geprüft');
reset role;
select results_eq($$ select k.geprueft, b.schritt from public.kreditor_zahlungen k, public.bestellungen_liste b
                      where k.id = '00000000-0000-0000-0000-0000000eb0f1' and b.id = (select id from t_b) $$,
  $$ values (true, 'fertig'::text) $$, 'Rechnung auch in den Finanzen geprüft, Bestellung fertig');

-- Einstellung «einkauf» nur Administration
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000eb0a1", "role": "authenticated"}', true);
select throws_ok($$ update public.einstellungen set wert = wert || '{"freigabe_grenze_rappen": 99999999}' where schluessel = 'einkauf' $$,
  '42501', 'einkauf.kein_recht', 'Freigabegrenze ändert nur die Administration');
reset role;
select setval('intern.bestell_nummer', last_value, is_called) from t_seq;

select * from finish();
rollback;
