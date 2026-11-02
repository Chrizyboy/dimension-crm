-- Prüft «Offerten vollständig» (Entscheid 0041): Senden setzt Gültigkeit und ersten Nachfass-Schritt, Freigabe bei
-- Rabatt, Nachfassen mit Ergebnis setzt den nächsten Schritt, Varianten bestimmen den Betrag, Chance und Phase.
-- Ausführen: npm run db:test
begin;
select plan(26);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000039a1', 'of-andy@test.local'),
  ('00000000-0000-0000-0000-0000000039a2', 'of-chris@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000039b1', 'of_andy', 'Andy Offerten', '00000000-0000-0000-0000-0000000039a1', 'innendienst', '{}'),
  ('00000000-0000-0000-0000-0000000039b2', 'of_chris', 'Chris Freigabe', '00000000-0000-0000-0000-0000000039a2', 'innendienst', '{}');
update public.einstellungen set wert = jsonb_set(wert, '{freigabe,durch}', '["of_chris"]') where schluessel = 'offerten';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);

create temporary table t39 (vc uuid, o uuid) on commit drop;
grant all on t39 to authenticated;
insert into t39 (vc) select public.lead_anlegen(jsonb_build_object(
  'kontakt', jsonb_build_object('vorname', 'Anna', 'nachname', 'Brunner39'),
  'objekt', jsonb_build_object('strasse', 'Bachstrasse 12', 'plz', '5630', 'ort', 'Muri AG')));
select public.setze_stand((select vc from t39), 'offerte', jsonb_build_object('richtofferte', true, 'notiz', 'bitte offerieren'));
select is((select phase from public.offerten_liste where verkaufschance_id = (select vc from t39)), null::text,
  'ohne Offerte steht der Lead nur im Eingang');
update t39 set o = public.offerte_status_setzen((select vc from t39), 'bearbeitung');
select is((select phase from public.offerten_liste where id = (select o from t39)), 'planung', 'in Bearbeitung = Planung');

-- Varianten: die gewählte bestimmt Betrag und Leistung
select throws_ok(format($$ select public.offerte_angaben_setzen(%L, '{"varianten": [{"titel": "ohne Kennung"}]}') $$, (select o from t39)),
  'offerte.varianten_ungueltig', 'Variante braucht eine Kennung');
select lives_ok(format($$ select public.offerte_angaben_setzen(%L, '{"varianten": [
  {"k": "A", "titel": "Nur PV", "betrag_rappen": 2274000, "kwp": 11.2},
  {"k": "B", "titel": "PV + Batterie", "betrag_rappen": 2735000, "kwp": 11.2, "batterie": "LUNA2000 10 kWh"}]}') $$, (select o from t39)),
  'Varianten gespeichert');
select throws_ok(format($$ select public.offerte_angaben_setzen(%L, '{"variante": "C"}') $$, (select o from t39)),
  'offerte.variante_unbekannt', 'nur vorhandene Variante wählbar');
select public.offerte_angaben_setzen((select o from t39), '{"variante": "B"}');
select is((select betrag_rappen from public.offerten where id = (select o from t39)), 2735000::bigint, 'Betrag aus Variante B');

-- Unterlagen werden zusammengeführt
select public.offerte_angaben_setzen((select o from t39), '{"unterlagen": {"fotos": true}}');
select public.offerte_angaben_setzen((select o from t39), '{"unterlagen": {"stromrechnung": true}}');
select is((select unterlagen from public.offerten where id = (select o from t39)), '{"fotos": true, "stromrechnung": true}'::jsonb,
  'Unterlagen-Häkchen bleiben erhalten');

-- Freigabe: Rabatt über 5 % hält das Senden auf
select public.offerte_angaben_setzen((select o from t39), '{"rabatt_prozent": 9}');
select is((select freigabe_grund from public.offerten_liste where id = (select o from t39)), 'rabatt', 'Rabatt 9 % braucht Freigabe');
select is((select phase from public.offerten_liste where id = (select o from t39)), 'pruefen', 'steht in «Prüfen»');
select throws_ok(format($$ select public.offerte_status_setzen(%L, 'offeriert') $$, (select vc from t39)),
  'offerte.freigabe_fehlt', 'ohne Freigabe nicht senden');
select throws_ok(format($$ select public.offerte_freigeben(%L) $$, (select o from t39)),
  '42501', null, 'Andy darf nicht selbst freigeben');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a2", "role": "authenticated"}', true);
select lives_ok(format($$ select public.offerte_freigeben(%L, 'ok, Stammkunde') $$, (select o from t39)), 'Chris gibt frei');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000039a1", "role": "authenticated"}', true);

-- Senden: Gültigkeit, erster Nachfass-Schritt nach Plan (Tag 3), Stand «offeriert» statt «vertagt»
select public.offerte_status_setzen((select vc from t39), 'offeriert');
select is((select nachfassen_am from public.offerten where id = (select o from t39)), current_date + 3, 'erstes Nachfassen nach 3 Tagen');
select is((select gueltig_bis from public.offerten_liste where id = (select o from t39)), current_date + 30, 'gültig 30 Tage');
select is((select stand from public.offerten_liste where id = (select o from t39)), 'offeriert', 'Plan-Datum ist nicht «vertagt»');
select is((select chance from public.offerten_liste where id = (select o from t39)), 30, 'Chance offeriert 30 %');

-- Nachfassen mit Ergebnis
select is(public.offerte_nachfassen((select o from t39), 'nicht_erreicht'),
  intern.plus_arbeitstage(current_date, 2), 'nicht erreicht: in 2 Arbeitstagen nochmals');
select is((select nachfass_schritt from public.offerten where id = (select o from t39)), 0, 'Plan-Schritt bleibt');
select is(public.offerte_nachfassen((select o from t39), 'interessiert', '{"notiz": "Bank klärt", "konkurrenz": "Helion"}'),
  greatest(current_date + 10, intern.plus_arbeitstage(current_date, 2)), 'interessiert: Tag 10 des Plans');
select is((select array[phase, konkurrenz, chance::text] from public.offerten_liste where id = (select o from t39)),
  array['verhandlung', 'Helion', '60'], 'Verhandlung, Konkurrenz, Chance 60 %');
select is((select count(*)::int from public.aktivitaeten where offerte_id = (select o from t39) and art = 'anruf'), 2,
  'jeder Anruf steht im Verlauf');
select throws_ok(format($$ select public.offerte_nachfassen(%L, 'nein') $$, (select o from t39)),
  'stand.grund_fehlt', 'verloren nur mit Grund');
select public.offerte_angaben_setzen((select o from t39), '{"chance_prozent": 80}');
select is((select chance from public.offerten_liste where id = (select o from t39)), 80, 'Chance von Hand überschreibt');
select public.offerte_nachfassen((select o from t39), 'ja', '{"variante": "A"}');
select is((select array[phase, variante] from public.offerten_liste where id = (select o from t39)), array['gewonnen', 'A'],
  'Ja mit Variante A: gewonnen');
select is((select betrag_rappen from public.offerten where id = (select o from t39)), 2274000::bigint, 'Betrag folgt der gewählten Variante');
reset role;

-- Einstellungen nur Administration
set local role authenticated;
select throws_ok($$ update public.einstellungen set wert = wert where schluessel = 'offerten' $$, '42501', null,
  'Offerten-Einstellungen nur Administration');
reset role;

select * from finish();
rollback;
