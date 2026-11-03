-- Prüft «Heute prüfen», den nächtlichen Abgleich mit der Dienst-Rolle, die Rate bei Montage (nie die letzte Tranche)
-- und die Erinnerungen der Buchhaltung (Modul-Prüfung 25A). Ausführen: npm run db:test
begin;
select plan(9);

update public.automationen set aktiv = false where vorlage is not null;
update public.automationen set aktiv = true where vorlage = 'rate_montage';
update intern.automation_signale set verteilt = true where not verteilt;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000040a1', 'p40-bh@test.local'),
  ('00000000-0000-0000-0000-0000000040a2', 'p40-ad@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000040b1', 'p40_bh', 'Berta Buchhaltung', '00000000-0000-0000-0000-0000000040a1', 'buchhaltung', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000040b2', 'p40_ad', 'Arno Admin', '00000000-0000-0000-0000-0000000040a2', 'admin', '{}', 'de');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, email, sprache) values
  ('00000000-0000-0000-0000-0000000040c1', 'person', 'privat', 'Rita', 'Rate', 'rita@beispiel.test', 'de');
insert into public.projekte (id, nummer, kontakt_id, titel, ablauf_vorlage_id) values
  ('00000000-0000-0000-0000-0000000040e1', 'P9401', '00000000-0000-0000-0000-0000000040c1', 'PV Raten',
   (select id from public.ablauf_vorlagen where schluessel = 'pv'));
insert into public.zahlungsplan (id, projekt_id, bezeichnung, betrag_rappen, faellig_am) values
  ('00000000-0000-0000-0000-0000000040f1', '00000000-0000-0000-0000-0000000040e1', 'Anzahlung 40 %', 1200000, current_date),
  ('00000000-0000-0000-0000-0000000040f2', '00000000-0000-0000-0000-0000000040e1', 'Montage 30 %', 900000, null),
  ('00000000-0000-0000-0000-0000000040f3', '00000000-0000-0000-0000-0000000040e1', 'Schluss 30 %', 900000, null);
-- Anzahlung ist schon verrechnet (als Buchhaltung)
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000040a1", "role": "authenticated"}', true);
select public.rechnung_entwurf(jsonb_build_object('zahlungsplan_id', '00000000-0000-0000-0000-0000000040f1'));

-- Montage erledigt → Rate «Montage 30 %»
select intern.automation_signal('projekt.schritt_erledigt', 'projekte', '00000000-0000-0000-0000-0000000040e1',
  '00000000-0000-0000-0000-0000000040e1:montage', '{"schritt": "montage"}', false);
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select public.automationen_abarbeiten(50);
reset role;
select is((select z.bezeichnung from public.rechnungen r join public.zahlungsplan z on z.id = r.zahlungsplan_id
            where r.projekt_id = '00000000-0000-0000-0000-0000000040e1' and z.id <> '00000000-0000-0000-0000-0000000040f1'),
  'Montage 30 %', 'Rate bei Montage, nicht die Schlussrate');

-- Zweite Montage-Meldung: nur noch die letzte Tranche offen → nichts
select intern.automation_signal('projekt.schritt_erledigt', 'projekte', '00000000-0000-0000-0000-0000000040e1',
  '00000000-0000-0000-0000-0000000040e1:montage:2', '{"schritt": "montage"}', false);
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select public.automationen_abarbeiten(50);
reset role;
select is((select count(*)::int from public.rechnungen where zahlungsplan_id = '00000000-0000-0000-0000-0000000040f3'), 0,
  'Schlussrate bleibt für die IBN');

-- Mahnung wartet im Ausgangskorb
insert into public.ausgangskorb (kanal, art, an, betreff, text, status, bezug_tabelle, bezug_id, kontakt_id)
select 'mail', 'mahnung', 'rita@beispiel.test', 'Zahlungserinnerung', 'x', 'wartet', 'rechnungen', r.id, r.kontakt_id
  from public.rechnungen r where r.zahlungsplan_id = '00000000-0000-0000-0000-0000000040f1';

-- Heute prüfen als Buchhaltung
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000040a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000040a1', true);
select ok(jsonb_array_length(public.rechnungen_heute() -> 'entwuerfe') >= 2, 'Entwürfe in «Heute prüfen»');
select ok(exists (select 1 from jsonb_array_elements(public.rechnungen_heute() -> 'mahnungen') m where m ->> 'kunde' = 'Rita Rate'),
  'wartende Mahnung mit Kunde');
reset role;

-- Abgleich mit der Dienst-Rolle (Zeitplan)
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select is((public.abaninja_abgleich_anwenden('{"rechnungen": [], "belege": []}') ->> 'rechnungen')::int, 0,
  'Zeitplan darf abgleichen');
reset role;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000040a1", "role": "authenticated"}', true);

-- Erinnerungen: Mahnlauf nur montags, Spesen nur am 1.
select ok(public.finanzen_erinnern() >= 0, 'Erinnerungen laufen ohne Fehler');
select ok(intern.buchhaltung_personen() @> array['00000000-0000-0000-0000-0000000040b1'::uuid], 'Buchhaltung bekommt die Glocke');
select is(public.finanzen_erinnern(), 0, 'nicht zweimal');
select ok(not has_function_privilege('authenticated', 'public.finanzen_erinnern()', 'execute'), 'nur der Zeitplan');

select * from finish();
rollback;
