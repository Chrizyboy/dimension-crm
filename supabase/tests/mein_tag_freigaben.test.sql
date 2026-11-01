-- Prüft «Wartet auf deine Freigabe», die Glocke bei Automations-Fehlern, die Erinnerung an alte Freigaben, die
-- «Woche in Zahlen» und die Kennzahlen der Abwicklung (Modul-Prüfung 27A). Ausführen: npm run db:test
begin;
select plan(11);

update public.automationen set aktiv = false where vorlage is not null;
update intern.automation_signale set verteilt = true where not verteilt;
delete from public.benachrichtigungen where titel_de like 'Woche in Zahlen:%' or titel_de like 'Freigaben warten:%';

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000041a1', 'p41-vk@test.local'),
  ('00000000-0000-0000-0000-0000000041a2', 'p41-ad@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000041b1', 'p41_vk', 'Vera Verkauf', '00000000-0000-0000-0000-0000000041a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000041b2', 'p41_ad', 'Adrian Admin', '00000000-0000-0000-0000-0000000041a2', 'admin', '{}', 'de');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000041c1', 'person', 'privat', 'Nora', 'Beispiel', 'de');

-- Zwei wartende Mails: eine in Veras Namen (alt), eine im Namen des Admins
insert into public.ausgangskorb (id, kanal, an, betreff, text, status, absender_person_id, erstellt_am) values
  ('00000000-0000-0000-0000-0000000041d1', 'mail', 'nora@beispiel.test', 'Ihre Offerte', 'x', 'wartet',
   '00000000-0000-0000-0000-0000000041b1', date_trunc('week', now()) - interval '12 days'),
  ('00000000-0000-0000-0000-0000000041d2', 'mail', 'nora@beispiel.test', 'Termin', 'x', 'wartet',
   '00000000-0000-0000-0000-0000000041b2', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000041a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000041a1', true);
select is((select array_agg(z ->> 'id') from jsonb_array_elements(public.heute_fuer_mich() #> '{freigaben,zeilen}') z
            where z ->> 'id' like '00000000-0000-0000-0000-0000000041%'),
  array['00000000-0000-0000-0000-0000000041d1'], 'nur Freigaben in meinem Namen');
select is((public.heute_fuer_mich() #>> '{freigaben,zeilen,0,ueberfaellig}')::boolean, true, 'alte Freigabe ist markiert');
reset role;

-- Automation endet mit Fehler → Glocke an die Administration, am selben Tag nur einmal
insert into public.automation_laeufe (id, automation_id, signal_id, ereignis, titel) values
  ('00000000-0000-0000-0000-0000000041e1', (select id from public.automationen where vorlage = 'rate_montage'), -41001,
   'projekt.schritt_erledigt', 'P9411 PV Fehler'),
  ('00000000-0000-0000-0000-0000000041e2', (select id from public.automationen where vorlage = 'rate_montage'), -41002,
   'projekt.schritt_erledigt', 'P9412 PV Fehler');
update public.automation_laeufe set stand = 'fehler' where id = '00000000-0000-0000-0000-0000000041e1';
select is((select count(*)::int from public.benachrichtigungen where lauf_id = '00000000-0000-0000-0000-0000000041e1'
             and person_id = '00000000-0000-0000-0000-0000000041b2'), 1, 'Fehler-Glocke an Admin');
select ok(not exists (select 1 from public.benachrichtigungen where lauf_id = '00000000-0000-0000-0000-0000000041e1'
             and person_id = '00000000-0000-0000-0000-0000000041b1'), 'Verkauf bekommt sie nicht');
update public.automation_laeufe set stand = 'fehler' where id = '00000000-0000-0000-0000-0000000041e2';
select is((select count(*)::int from public.benachrichtigungen where lauf_id = '00000000-0000-0000-0000-0000000041e2'), 0,
  'zweiter Fehler am selben Tag: keine neue Glocke');

-- Dienstag letzter Woche 09:00: Erinnerung an Vera (Freigabe älter als 2 Tage), nicht an den Admin
select ok(public.tag_erinnern(((date_trunc('week', now() at time zone 'Europe/Zurich') - interval '6 days' + interval '9 hours')
                                at time zone 'Europe/Zurich')) >= 1, 'Erinnerung läuft');
select is((select count(*)::int from public.benachrichtigungen where titel_de = 'Freigaben warten: 1'
             and person_id = '00000000-0000-0000-0000-0000000041b1'), 1, 'Vera wird erinnert');
select ok(not exists (select 1 from public.benachrichtigungen where titel_de like 'Freigaben warten:%'
             and person_id = '00000000-0000-0000-0000-0000000041b2'), 'neue Freigabe: noch keine Erinnerung');

-- Montag letzter Woche 08:00: Woche in Zahlen an die Administration, nur einmal
select public.tag_erinnern(((date_trunc('week', now() at time zone 'Europe/Zurich') - interval '7 days' + interval '8 hours')
                             at time zone 'Europe/Zurich'));
select public.tag_erinnern(((date_trunc('week', now() at time zone 'Europe/Zurich') - interval '7 days' + interval '9 hours')
                             at time zone 'Europe/Zurich'));
select is((select count(*)::int from public.benachrichtigungen where titel_de like 'Woche in Zahlen:%'
             and person_id = '00000000-0000-0000-0000-0000000041b2'), 1, 'Woche in Zahlen einmal an Admin');

-- Kennzahlen Abwicklung: erledigter Service-Fall mit Dauer in Tagen
insert into public.service_faelle (id, nummer, kontakt_id, titel, status, erledigt_am, erstellt_am) values
  ('00000000-0000-0000-0000-0000000041f1', 'S9411', '00000000-0000-0000-0000-0000000041c1', 'Wechselrichter', 'erledigt',
   current_date, now() - interval '6 days');
select is((select tage from public.kennzahlen_fakten(current_date - 30, current_date)
            where schluessel = 'faelle_dauer' and id = '00000000-0000-0000-0000-0000000041f1'), 6, 'Dauer des Falls in Tagen');
select ok(not has_function_privilege('authenticated', 'public.tag_erinnern(timestamptz)', 'execute'), 'nur der Zeitplan');

select * from finish();
rollback;
