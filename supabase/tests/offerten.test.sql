-- Prüft Phase 7: Nummernkreise Muri/Bulle, «Neue Offerten» mit Bearbeitung und Rückfrage, Versionen,
-- «Zurück zur Offerte», Entscheid beim Nachfassen, Auftrag mit Zahlungsplan und Werkvertrag,
-- und dass Einkaufspreise nur mit dem Recht «preise» sichtbar sind.
-- Ausführen: npm run db:test
begin;
select plan(34);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000007a1', 'o7-innen@test.local'),
  ('00000000-0000-0000-0000-0000000007a2', 'o7-andere@test.local'),
  ('00000000-0000-0000-0000-0000000007a3', 'o7-verkauf@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000007b1', 'o7_innen', 'Ida Innendienst', '00000000-0000-0000-0000-0000000007a1', 'innendienst', '{}'),
  ('00000000-0000-0000-0000-0000000007b2', 'o7_andere', 'Otto Andere', '00000000-0000-0000-0000-0000000007a2', 'innendienst', '{}'),
  ('00000000-0000-0000-0000-0000000007b3', 'o7_verkauf', 'Vreni Verkauf', '00000000-0000-0000-0000-0000000007a3', 'verkauf', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000007a1", "role": "authenticated"}', true);

-- Nummernkreise wie V233: Bulle 1xxxxx, Muri 2xxxxx, immer die nächste freie Nummer
select ok(intern.naechste_offertnummer((select id from public.standorte where kuerzel = 'bulle')) ~ '^1\d{5}$',
  'Bulle zählt im Kreis 100000–199999');
select ok(intern.naechste_offertnummer((select id from public.standorte where kuerzel = 'muri')) ~ '^2\d{5}$',
  'Muri zählt im Kreis 200000–299999');

-- Lead zur Offerte (Muri)
create temporary table t7 (vc uuid, o uuid) on commit drop;
grant all on t7 to authenticated;
insert into t7 (vc) select public.lead_anlegen(jsonb_build_object(
  'kontakt', jsonb_build_object('vorname', 'Olga', 'nachname', 'Testofferte7'),
  'objekt', jsonb_build_object('strasse', 'Offertweg 7', 'plz', '5630', 'ort', 'Muri AG')));
select public.setze_stand((select vc from t7), 'offerte', jsonb_build_object('richtofferte', true, 'notiz', 'Richtofferte bitte'));
select is((select offerte_status from public.offerten_eingang where id = (select vc from t7)), 'neu',
  'zur Offerte gegebener Lead steht in «Neue Offerten»');
select ok((select richtofferte from public.offerten_eingang where id = (select vc from t7)), 'ohne Termin ist es eine Richtofferte');

-- Bearbeitung: Offerte entsteht mit der nächsten Nummer, die Person steht als «In Bearbeitung von»
update t7 set o = public.offerte_status_setzen((select vc from t7), 'bearbeitung');
select ok((select nummer ~ '^2\d{5}$' from public.offerten where id = (select o from t7)), 'Offerte bekommt eine Muri-Nummer');
select is((select offerte_von from public.verkaufschancen where id = (select vc from t7)), 'Ida', 'In Bearbeitung von Ida');
select ok((select o.verantwortlich_id is not null from public.offerten o where o.id = (select o from t7)), 'Offerte hat eine zuständige Person');
select throws_ok(format($$ select public.offerte_status_setzen(%L, 'rueckfrage', '{}') $$, (select vc from t7)),
  'offerte.notiz_fehlt', 'Rückfrage braucht «Was fehlt noch?»');

-- Eine andere Person muss ausdrücklich übernehmen
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000007a2", "role": "authenticated"}', true);
select throws_ok(format($$ select public.offerte_status_setzen(%L, 'pruefung', '{}') $$, (select vc from t7)),
  'offerte.in_bearbeitung', 'arbeitet schon jemand daran, braucht es «Übernehmen»');
select lives_ok(format($$ select public.offerte_status_setzen(%L, 'pruefung', '{"uebernehmen": true, "notiz": "Dach prüfen"}') $$,
  (select vc from t7)), 'mit «Übernehmen» geht es');
select is((select offerte_hinweis from public.verkaufschancen where id = (select vc from t7)), 'Dach prüfen',
  'Hinweis für den Aussendienst gespeichert');
select is((select stand from public.verkauf_geschaefte where verkaufschance_id = (select vc from t7)), 'pruefung',
  'Pipeline zeigt «Prüfung»');

-- Versendet: Lead abgeschlossen, Offerte offeriert, erscheint in der Liste Muri
select public.offerte_status_setzen((select vc from t7), 'offeriert', jsonb_build_object('datum', current_date - 20));
select is((select status from public.offerten where id = (select o from t7)), 'offeriert', 'Offerte ist offeriert');
select ok(not (select im_eingang from public.offerten_liste where id = (select o from t7)), 'nicht mehr in «Neue Offerten»');
select is((select stand from public.offerten_liste where id = (select o from t7)), 'nachfassen',
  'nach 20 Tagen ist sie zum Nachfassen fällig');

-- Versionen (V67): V1 entsteht automatisch, «Was wurde geändert?» ist Pflicht
select throws_ok(format($$ select public.offerte_version_erfassen(%L, '{}') $$, (select o from t7)),
  'offerte.text_fehlt', 'Version braucht eine Beschreibung');
select is(public.offerte_version_erfassen((select o from t7), jsonb_build_object(
  'text', 'Batterie ergänzt', 'betrag_rappen', 2500000, 'kwp', 10.5, 'uebernehmen', true)), 2, 'zweite Version erfasst');
select is((select jsonb_array_length(versionen) from public.offerten where id = (select o from t7)), 2, 'V1 und V2 vorhanden');
select is((select stand from public.offerten_liste where id = (select o from t7)), 'offeriert',
  'als aktuell übernommen: Nachfassen beginnt neu');
select throws_ok(format($$ select public.offerte_version_entfernen(%L) $$, (select o from t7)),
  'recht.fehlt', 'nur Admin entfernt eine Version');

-- Zurück zur Offerte (V221): Begründung Pflicht, altes Datum bleibt erhalten
select throws_ok(format($$ select public.offerte_zurueck(%L, 'bearbeitung', '') $$, (select o from t7)),
  'stand.grund_fehlt', '«Zurück zur Offerte» braucht eine Begründung');
select public.offerte_zurueck((select o from t7), 'rueckfrage', 'Kunde schickt Stromrechnung');
select is((select offerte_status from public.offerten_eingang where id = (select vc from t7)), 'rueckfrage',
  'Lead steht wieder in «Neue Offerten» mit Rückfrage');
select is((select array_length(angebot_am_frueher, 1) from public.offerten where id = (select o from t7)), 1,
  'früheres Angebotsdatum gespeichert');

-- Nachfassen: vertagt braucht Datum und Grund
select public.offerte_status_setzen((select vc from t7), 'offeriert');
select throws_ok(format($$ select public.offerte_entscheiden(%L, 'vertagt', jsonb_build_object('datum', current_date + 21)) $$,
  (select o from t7)), 'stand.grund_fehlt', 'Vertagen braucht einen Grund');

-- Auftrag erstellen (V232): Zahlungsplan 50/30/20 auf 5 Rappen, Summe exakt
select lives_ok(format($$ select public.auftrag_erstellen(%L, '{"vertragswert_rappen": 3784523, "kondition": "normal", "unterzeichnet_am": "2026-10-21"}') $$,
  (select o from t7)), 'Auftrag erstellen');
select is((select sum(z.betrag_rappen)::bigint from public.zahlungsplan z join public.projekte p on p.id = z.projekt_id
            where p.offerte_id = (select o from t7) and z.geloescht_am is null), 3784523::bigint, 'Zahlungsplan ergibt genau den Vertragswert');
select results_eq(format($$ select z.betrag_rappen from public.zahlungsplan z join public.projekte p on p.id = z.projekt_id
            where p.offerte_id = %L and z.geloescht_am is null order by z.faellig_am nulls last, z.betrag_rappen desc $$, (select o from t7)),
  array[1892260::bigint, 1135355::bigint, 756908::bigint], 'Tranchen auf 5 Rappen, die letzte nimmt den Rest');
select is((select faellig_am from public.zahlungsplan z join public.projekte p on p.id = z.projekt_id
            where p.offerte_id = (select o from t7) and z.bezeichnung like 'Anzahlung%' and z.geloescht_am is null),
  '2026-10-31'::date, 'Anzahlung fällig 10 Tage nach Unterzeichnung');
select is((select status from public.werkvertraege where offerte_id = (select o from t7)), 'erstellt', 'Werkvertrag erstellt');
select throws_ok(format($$ select public.werkvertrag_status((select id from public.werkvertraege where offerte_id = %L), 'unterschrieben', '{}') $$,
  (select o from t7)), 'stand.datum_fehlt', 'unterschrieben nur mit Datum');

-- Preise: Einkauf nur mit Recht «preise»
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000007a3", "role": "authenticated"}', true);
select is((select count(*) from public.preisliste where ek_rappen is not null or marge is not null), 0::bigint,
  'Verkauf sieht weder Einkauf noch Marge');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000007a1", "role": "authenticated"}', true);
select ok((select count(*) from public.preisliste where marge is not null) > 0 or not exists (select 1 from public.preisliste),
  'Innendienst (Recht «preise») sieht die Marge');
reset role;

-- Werkvertrag zeigt den Unternehmer auch ohne eigene Firma (über den Standort)
select ok((select firma_name is not null from public.werkvertraege_liste where offerte_id = (select o from t7)),
  'Werkvertrag kennt seine Firma');
-- Wer Offerten bearbeitet, hat auch den Bereich «Preise» (mindestens die Kundenansicht)
select is((select count(*) from public.rollen where 'quotes' = any(bereiche) and not ('pricing' = any(bereiche))),
  0::bigint, 'Rollen mit Offerten sehen auch Preise');

select * from finish();
rollback;
