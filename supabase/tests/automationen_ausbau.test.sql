-- Prüft den Ausbau der Automationen (Entscheid 0044): Arbeitstage und Versandfenster mit Feiertagen, Kontakt-Pause,
-- «sonst überspringen», Ersatz-Aufgabe ohne Mail-Adresse, Wiedervorlage und Notiz, Stoppen nur mit Grund und nur
-- durch Berechtigte, Fortsetzen, Verschieben, Wiederholen eines Schritts, geplante Schritte je Datensatz, «Warum?»,
-- Übersicht und Probelauf nur Administration, neuer Auslöser «Lead ohne Kontakt» (nur Neues).
-- Ausführen: npm run db:test
begin;
select plan(36);

update public.automationen set aktiv = false where vorlage is not null;
update intern.automation_signale set verteilt = true where not verteilt;
update public.einstellungen set wert = wert || '{"versandfenster": {"immer": true}, "kontakt_pause_tage": 0}'
 where schluessel = 'automationen';

-- Arbeitstage und Versandfenster (Zeiten in Zürich; Weihnachten 25./26.12. sind Feiertage)
select is(intern.automation_arbeitstage_plus('2026-12-23', 2), '2026-12-28'::date, 'Arbeitstage überspringen Feiertage und Wochenende');
select is(intern.automation_warte_bis('{"tage": 1, "arbeitstage": true}', '2026-11-06 10:00 Europe/Zurich'),
  '2026-11-09 10:00 Europe/Zurich'::timestamptz, 'Freitag + 1 Arbeitstag = Montag, gleiche Uhrzeit');
select is(intern.automation_im_fenster('{"tage": [1,2,3,4,5], "von": "08:00", "bis": "18:00"}', '2026-11-03 09:00 Europe/Zurich'),
  '2026-11-03 09:00 Europe/Zurich'::timestamptz, 'im Fenster: sofort');
select is(intern.automation_im_fenster('{"tage": [1,2,3,4,5], "von": "08:00", "bis": "18:00"}', '2026-11-03 19:00 Europe/Zurich'),
  '2026-11-04 08:00 Europe/Zurich'::timestamptz, 'abends: nächster Morgen 08:00');
select is(intern.automation_im_fenster('{"tage": [1,2,3,4,5], "von": "08:00", "bis": "18:00"}', '2026-11-07 10:00 Europe/Zurich'),
  '2026-11-09 08:00 Europe/Zurich'::timestamptz, 'Samstag: Montag 08:00');
select is(intern.automation_im_fenster('{"tage": [1,2,3,4,5], "von": "08:00", "bis": "18:00"}', '2026-12-24 19:00 Europe/Zurich'),
  '2026-12-28 08:00 Europe/Zurich'::timestamptz, 'über Weihnachten: Montag nach den Feiertagen');
select is(intern.automation_im_fenster('{"immer": true}', '2026-11-07 23:00 Europe/Zurich'),
  '2026-11-07 23:00 Europe/Zurich'::timestamptz, '«immer» kennt kein Fenster');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'a39-vk@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'a39-ad@test.local'),
  ('00000000-0000-0000-0000-0000000039a3', 'a39-pl@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000039b1', 'a39_vk', 'Vera Vertrieb', '00000000-0000-0000-0000-0000000039a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000039b2', 'a39_ad', 'Adam Admin', '00000000-0000-0000-0000-0000000039a2', 'admin', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000039b3', 'a39_pl', 'Paul Planer', '00000000-0000-0000-0000-0000000039a3', 'montage', '{}', 'de');

-- Administration richtet eine Automation mit den neuen Bausteinen ein
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a2', true);
select throws_ok($$ insert into public.automationen (name_de, name_fr, ausloeser, aktionen, versandfenster)
  values ('x', 'x', 'lead.neu', '[{"art": "notiz"}]', '{"tage": [1], "von": "18:00", "bis": "08:00"}') $$,
  'P0001', 'automation.versandfenster', 'Versandfenster muss Sinn ergeben');
insert into public.automationen (id, name_de, name_fr, ausloeser, aktiv, aktionen) values
  ('00000000-0000-0000-0000-0000000039d1', 'Ausbau', 'Ausbau', 'lead.neu', true, $j$[
    {"art": "notiz", "text": {"de": "Automatisch: neuer Lead {Name}", "fr": "Auto : {Name}"}},
    {"art": "pruefen", "sonst": "ueberspringen", "bedingungen": [{"feld": "lead.quelle", "op": "=", "wert": "messe"}]},
    {"art": "aufgabe", "an": ["person:00000000-0000-0000-0000-0000000039b3"], "titel": {"de": "Nur Messe", "fr": "Salon"}},
    {"art": "mail", "ersatz_aufgabe": true, "absender": ["person:00000000-0000-0000-0000-0000000039b1"],
     "betreff": {"de": "Danke", "fr": "Merci"}, "text": {"de": "x", "fr": "x"}},
    {"art": "wiedervorlage", "tage": 30, "text": {"de": "Später nachfragen", "fr": "Plus tard"}},
    {"art": "warten", "tage": 2, "arbeitstage": true},
    {"art": "benachrichtigung", "an": ["person:00000000-0000-0000-0000-0000000039b2"], "titel": {"de": "Fertig {Name}", "fr": "Fini"}}
  ]$j$);
select ok(jsonb_array_length(public.automation_probelauf(
    (select to_jsonb(a) from public.automationen a where a.id = '00000000-0000-0000-0000-0000000039d1'),
    'verkaufschancen', (select id from public.verkaufschancen limit 1)) -> 'schritte') >= 1, 'Probelauf rechnet die Schritte aus');
select ok(public.automation_uebersicht() ? 'aktiv', 'Übersicht für die Administration');

-- Lead ohne Mail-Adresse von Vera
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a1', true);
select public.lead_anlegen('{"kontakt": {"vorname": "Otto", "nachname": "Ohnemail", "telefon": "079 000 39 01", "sprache": "de"}, "objekt": {"plz": "5630", "ort": "Muri"}, "lead": {"quelle": "website"}}');
select throws_ok($$ select public.automation_uebersicht() $$, '42501', 'recht.fehlt', 'Übersicht nicht für den Verkauf');
select throws_ok($$ select * from public.automation_geplant() $$, '42501', 'recht.fehlt', 'alle geplanten Schritte nur Administration');
reset role;

set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select public.automationen_abarbeiten(50);
reset role;
create temp table l39 on commit drop as
  select l.* from public.automation_laeufe l where l.automation_id = '00000000-0000-0000-0000-0000000039d1';
grant select on l39 to authenticated, service_role;
select is((select stand from l39), 'wartet', 'Lauf wartet nach dem Warten in Arbeitstagen');
select is((select count(*)::int from public.aktivitaeten a where (a.details ->> 'lauf_id')::uuid = (select id from l39)
            and a.text = 'Automatisch: neuer Lead Otto Ohnemail'), 1, 'Notiz in der Zeitachse');
select is((select count(*)::int from public.aufgaben where lauf_id = (select id from l39) and titel = 'Nur Messe'), 0,
  '«sonst überspringen» lässt den nächsten Schritt aus');
select is((select titel from public.aufgaben where lauf_id = (select id from l39) and person_id = '00000000-0000-0000-0000-0000000039b1'),
  'Anrufen statt Mail: Otto Ohnemail', 'ohne Mail-Adresse: Anruf-Aufgabe an die absendende Person');
select is((select wiedervorlage_am from public.verkaufschancen where id = (select bezug_id from l39)),
  (now() at time zone 'Europe/Zurich')::date + 30, 'Wiedervorlage gesetzt');

-- Stoppen, Fortsetzen, Verschieben: Vera (hat eine Aufgabe aus dem Lauf) ja, Paul nein
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a3", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a3', true);
select throws_ok($$ select public.automation_lauf_stoppen((select id from l39), 'egal') $$, '42501', 'recht.fehlt', 'Unbeteiligte stoppen nicht');
select is((select darf from public.automation_geplant('verkaufschancen', (select bezug_id from l39))), false, 'geplant: Paul darf nicht ändern');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a1', true);
select is((select art || '|' || darf from public.automation_geplant('verkaufschancen', (select bezug_id from l39))), 'benachrichtigung|true',
  'geplant: nächster Schritt nach dem Warten, Vera darf ändern');
select ok((public.automation_warum((select id from l39)) ->> 'name_de') = 'Ausbau', '«Warum?» für die Empfängerin der Aufgabe');
select throws_ok($$ select public.automation_lauf_stoppen((select id from l39), '  ') $$, 'P0001', 'automation.grund_fehlt', 'Stoppen braucht einen Grund');
select lives_ok($$ select public.automation_lauf_stoppen((select id from l39), 'Kunde ruft selbst an') $$, 'Zuständige stoppt mit Grund');
reset role;
select is((select stand || '|' || gestoppt_grund from public.automation_laeufe where id = (select id from l39)), 'gestoppt|Kunde ruft selbst an',
  'Lauf gestoppt, Grund gespeichert');
select is((select count(*)::int from public.aktivitaeten where (details ->> 'lauf_id')::uuid = (select id from l39) and text like '%gestoppt: Kunde ruft selbst an'), 1,
  'Grund steht in der Zeitachse');
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
update public.automation_laeufe set weiter_am = now() - interval '1 minute' where id = (select id from l39);
select public.automationen_abarbeiten(50);
reset role;
select is((select stand from public.automation_laeufe where id = (select id from l39)), 'gestoppt', 'gestoppt läuft nicht weiter');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a1', true);
select public.automation_lauf_fortsetzen((select id from l39));
select ok(public.automation_lauf_verschieben((select id from l39), 3) > now() + interval '2 days', 'um 3 Tage verschoben');
select public.automation_lauf_jetzt((select id from l39));
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select public.automationen_abarbeiten(50);
reset role;
select is((select stand from public.automation_laeufe where id = (select id from l39)), 'fertig', 'nach «Jetzt» zu Ende gelaufen');

-- Wiederholen nur Administration und nur für einen fehlgeschlagenen oder übersprungenen Schritt
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a1', true);
select throws_ok($$ select public.automation_schritt_wiederholen((select id from l39), 4) $$, '42501', 'recht.fehlt', 'Wiederholen nur Administration');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000039a2', true);
select throws_ok($$ select public.automation_schritt_wiederholen((select id from l39), 1) $$, 'P0001', 'automation.schritt_ok', 'gelungener Schritt wird nicht wiederholt');
select lives_ok($$ select public.automation_schritt_wiederholen((select id from l39), 4) $$, 'übersprungene Mail wiederholen');
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select public.automationen_abarbeiten(50);
reset role;
select is((select stand || '|' || coalesce(nur_schritt::text, '-') from public.automation_laeufe where id = (select id from l39)), 'fertig|-',
  'nach dem einen Schritt wieder zu Ende');

-- Kontakt-Pause: höchstens eine automatische Mail in 3 Tagen
update public.einstellungen set wert = wert || '{"kontakt_pause_tage": 3}' where schluessel = 'automationen';
insert into public.kontakte (id, art, kontaktart, vorname, nachname, email, sprache) values
  ('00000000-0000-0000-0000-0000000039c1', 'person', 'privat', 'Pia', 'Pause', 'pia@beispiel.test', 'de');
insert into public.ausgangskorb (kanal, art, an, betreff, text, kontakt_id, schluessel, status) values
  ('mail', 'automation', 'pia@beispiel.test', 'Vorher', 'x', '00000000-0000-0000-0000-0000000039c1', 'automation:vorher:1', 'gesendet');
select ok(intern.automation_kontakt_frei_ab('00000000-0000-0000-0000-0000000039c1', 3, gen_random_uuid()) > now() + interval '2 days',
  'nach einer automatischen Mail: Pause bis in 3 Tagen');
select is(intern.automation_kontakt_frei_ab('00000000-0000-0000-0000-0000000039c1', 0, gen_random_uuid()), null, 'ohne Pause frei');

-- Neuer Auslöser «Lead ohne Kontakt»: der Bestand ist Basis, Neues gibt ein Signal
select intern.automationen_durchsehen_ausbau(true);
insert into public.verkaufschancen (id, kontakt_id, stufe, eingang_am) values
  ('00000000-0000-0000-0000-0000000039e1', '00000000-0000-0000-0000-0000000039c1', 'neu', current_date - 20);
select intern.automationen_durchsehen_ausbau(true);
select is((select count(*)::int from intern.automation_signale where ereignis = 'lead.ohne_kontakt'
            and bezug_id = '00000000-0000-0000-0000-0000000039e1' and not basis), 1, 'Lead ohne Kontakt gibt ein Signal');
select ok(jsonb_array_length(public.automation_katalog_ausbau() -> 'ereignisse') = 4, 'Katalog des Ausbaus kennt 4 Auslöser');

select * from finish();
rollback;
