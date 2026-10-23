-- Prüft Phase 13: Einstellung «ki» nur für die Administration, Tageslimit (alle und pro Person), Kostenprotokoll
-- (nur der Server schreibt, jede Person sieht ihres), Briefing und Schreibstil nur für sich, Kontext nach Rechten
-- (Rechnungen nur mit «finanzen»), KI-Entwurf im Ausgangskorb nur für wartende Mails mit unverändertem Text, und
-- die Vorlage «Offerte nachfassen» lässt die KI schreiben (mit Freigabe).
-- Ausführen: npm run db:test
begin;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000013a1', 'p13-vk@test.local'),
  ('00000000-0000-0000-0000-0000000013a2', 'p13-ad@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte, sprache) values
  ('00000000-0000-0000-0000-0000000013b1', 'p13_vk', 'Vera Vertrieb', '00000000-0000-0000-0000-0000000013a1', 'verkauf', '{}', 'de'),
  ('00000000-0000-0000-0000-0000000013b2', 'p13_ad', 'Adam Admin', '00000000-0000-0000-0000-0000000013a2', 'admin', '{}', 'fr');
insert into public.kontakte (id, art, kontaktart, vorname, nachname, email, telefon, sprache) values
  ('00000000-0000-0000-0000-0000000013c1', 'person', 'privat', 'Kim', 'Kontext', 'kim@beispiel.test', '+41790001301', 'de');
insert into public.verkaufschancen (id, kontakt_id, kommentar_kunde) values
  ('00000000-0000-0000-0000-0000000013d1', '00000000-0000-0000-0000-0000000013c1', 'Bitte mit Speicher');

-- Eigene Ausgangslage: Limit 1 Franken, pro Person 50 Rappen; heutige Kosten anderer Tests zählen nicht.
update public.ki_aufrufe set zeitpunkt = zeitpunkt - interval '2 days' where zeitpunkt > now() - interval '2 days';
update public.einstellungen set wert = wert || '{"aktiv": true, "tageslimit_rappen": 100, "person_limit_rappen": 50}'
 where schluessel = 'ki';

select ok((select wert -> 'modelle' ? 'standard' and wert -> 'modelle' ? 'schnell' from public.einstellungen where schluessel = 'ki'),
  'Modelle zentral in der Einstellung «ki»');
select ok((select length(wert -> 'stil' ->> 'de') > 200 and length(wert -> 'stil' ->> 'fr') > 200 from public.einstellungen where schluessel = 'ki'),
  'Firmen-Schreibstil DE und FR aus V233');

-- Budget
select is((public.ki_budget('00000000-0000-0000-0000-0000000013b1') ->> 'frei')::boolean, true, 'ohne Kosten frei');
insert into public.ki_aufrufe (person_id, funktion, modell, ok, kosten_millirappen) values
  ('00000000-0000-0000-0000-0000000013b1', 'entwurf', 'claude-opus-5-5', true, 50000);
select is((public.ki_budget('00000000-0000-0000-0000-0000000013b1') ->> 'frei')::boolean, false, 'Personen-Limit erreicht');
select is((public.ki_budget('00000000-0000-0000-0000-0000000013b2') ->> 'frei')::boolean, true, 'andere Person noch frei');
insert into public.ki_aufrufe (person_id, funktion, modell, ok, kosten_millirappen) values
  ('00000000-0000-0000-0000-0000000013b2', 'briefing', 'claude-opus-5-5', true, 50000);
select is((public.ki_budget('00000000-0000-0000-0000-0000000013b2') ->> 'frei')::boolean, false, 'Tageslimit für alle erreicht');
select is((public.ki_budget('00000000-0000-0000-0000-0000000013b2') ->> 'heute_millirappen')::bigint, 100000::bigint,
  'Kosten von heute zusammengezählt');
update public.einstellungen set wert = wert || '{"tageslimit_rappen": 1000, "person_limit_rappen": null}' where schluessel = 'ki';
select is((public.ki_budget('00000000-0000-0000-0000-0000000013b1') ->> 'frei')::boolean, true, 'höheres Limit gibt wieder frei');
update public.einstellungen set wert = wert || '{"aktiv": false}' where schluessel = 'ki';
select is((public.ki_budget('00000000-0000-0000-0000-0000000013b1') ->> 'frei')::boolean, false, 'ausgeschaltet = nicht frei');
update public.einstellungen set wert = wert || '{"aktiv": true}' where schluessel = 'ki';

insert into public.ki_ergebnisse (art, bezug_tabelle, bezug_id, person_id, sprache, inhalt, modell) values
  ('briefing', 'personen', '00000000-0000-0000-0000-0000000013b2', '00000000-0000-0000-0000-0000000013b2', 'fr', '{"gruss": "Bonjour"}', 'x'),
  ('zusammenfassung', 'verkaufschancen', '00000000-0000-0000-0000-0000000013d1', '00000000-0000-0000-0000-0000000013b2', 'de', '{"kurz": "Lead"}', 'x');
insert into public.schreibstile (person_id, regeln, beispiele, anzahl) values
  ('00000000-0000-0000-0000-0000000013b2', '["Kurz"]', '[]', 1);

-- Als Verkauf
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000013a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000013a1', true);
select throws_ok($$ update public.einstellungen set wert = wert where schluessel = 'ki' $$, '42501', 'ki.kein_recht',
  'KI-Einstellung nur Administration');
select throws_ok($$ insert into public.ki_aufrufe (funktion, modell, ok) values ('x', 'x', true) $$, '42501', null,
  'App schreibt nie ins Kostenprotokoll');
select is((select count(*)::int from public.ki_aufrufe where person_id <> '00000000-0000-0000-0000-0000000013b1'), 0,
  'Verkauf sieht nur eigene Kosten');
select is((select count(*)::int from public.ki_ergebnisse where art = 'briefing'), 0, 'fremdes Briefing unsichtbar');
select is((select count(*)::int from public.ki_ergebnisse where art = 'zusammenfassung' and bezug_id = '00000000-0000-0000-0000-0000000013d1'), 1,
  'Zusammenfassung zum Lead für alle sichtbar');
select is((select count(*)::int from public.schreibstile), 0, 'fremder Schreibstil unsichtbar');
select is(public.ki_kontext('verkaufschancen', '00000000-0000-0000-0000-0000000013d1') -> 'kunde' ->> 'nachname', 'Kontext',
  'Kontext liest Kunde zum Lead');
select ok(not (public.ki_kontext('kontakte', '00000000-0000-0000-0000-0000000013c1') ? 'rechnungen'),
  'ohne Recht «finanzen» keine Rechnungen im Kontext');
select throws_ok($$ select public.ki_entwuerfe_offen(5) $$, '42501', null, 'App holt keine Automations-Aufträge');
select throws_ok($$ select public.ki_budget('00000000-0000-0000-0000-0000000013b1') $$, '42501', null,
  'fremdes Budget nur für den Server');
select is((public.ki_mein_budget() ->> 'person_millirappen')::bigint, 50000::bigint, 'eigenes Budget lesbar');
reset role;

-- KI-Entwurf im Ausgangskorb (Server)
insert into public.ausgangskorb (id, kanal, an, betreff, text, status, sprache, ki_status, ki_auftrag) values
  ('00000000-0000-0000-0000-0000000013e1', 'mail', 'kim@beispiel.test', 'Offerte', 'Vorlage', 'wartet', 'de', 'wartet', '{"art": "nachfassen"}'),
  ('00000000-0000-0000-0000-0000000013e2', 'mail', 'kim@beispiel.test', 'Offerte', 'Vorlage', 'wartet', 'de', 'wartet', '{"art": "nachfassen"}');
select is(public.ki_entwurf_einsetzen('00000000-0000-0000-0000-0000000013e1', true, 'Neu', 'KI-Text', 'Vorlage'), 'fertig',
  'Entwurf eingesetzt');
select is((select text || '|' || (ki_auftrag ->> 'vorlage_text') from public.ausgangskorb where id = '00000000-0000-0000-0000-0000000013e1'),
  'KI-Text|Vorlage', 'Text ersetzt, Vorlage bleibt zum Vergleich');
select is(public.ki_entwurf_einsetzen('00000000-0000-0000-0000-0000000013e2', true, 'Neu', 'KI-Text', 'anders'), 'uebersprungen',
  'von Hand geänderter Text bleibt');
select ok((select aktionen @> '[{"art": "mail", "ki": "nachfassen"}]' and modus = 'freigabe' from public.automationen
            where vorlage = 'offerte_nachfassen' and geloescht_am is null),
  'Vorlage «Offerte nachfassen»: KI schreibt, mit Freigabe');

select * from finish();
rollback;
