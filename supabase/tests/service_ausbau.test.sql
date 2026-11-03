-- Prüft Service & Garantie Schritt 1 (2.11.2026): Website-Meldung wird ein Fall mit Zuordnung über Projektnummer,
-- Adresse oder gar nicht; Reaktionszeit, Checkliste, Garantie und Einsatzort setzt die Datenbank; Glocke und
-- Bestätigung (mit Freigabe); gleiche Meldung nur einmal; nur der Server darf melden; Verlauf, Checkliste, Akte.
-- Ausführen: npm run db:test
begin;
select plan(24);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000019a1', 'sv-an@test.local'),
  ('00000000-0000-0000-0000-0000000019a2', 'sv-ve@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache, profil) values
  ('00000000-0000-0000-0000-0000000019b1', 'sv_an', 'Andy Service', 'sv-an@test.local', '00000000-0000-0000-0000-0000000019a1', 'admin', '{}', 'de', '{}'),
  ('00000000-0000-0000-0000-0000000019b2', 'sv_ve', 'Vera Service', 'sv-ve@test.local', '00000000-0000-0000-0000-0000000019a2', 'verkauf', '{}', 'de', '{}');
insert into public.kontakte (id, vorname, nachname, email, telefon) values
  ('00000000-0000-0000-0000-0000000019c1', 'Markus', 'Brunner', 'brunner@test.local', '079 412 33 18');
insert into public.objekte (id, kontakt_id, strasse, plz, ort) values
  ('00000000-0000-0000-0000-0000000019d1', '00000000-0000-0000-0000-0000000019c1', 'Bachstrasse 12', '5630', 'Muri AG');
insert into public.projekte (id, nummer, kontakt_id, objekt_id) values
  ('00000000-0000-0000-0000-0000000019e1', '991087', '00000000-0000-0000-0000-0000000019c1', '00000000-0000-0000-0000-0000000019d1');
insert into public.anlagen (id, objekt_id, projekt_id, garantie_bis, leistung_kwp, komponenten) values
  ('00000000-0000-0000-0000-0000000019f1', '00000000-0000-0000-0000-0000000019d1', '00000000-0000-0000-0000-0000000019e1',
   current_date - 30, 11.2, '[{"art": "wechselrichter", "hersteller": "Huawei", "garantie_bis": "2099-03-14"}]');
update public.einstellungen set wert = wert || '{"verantwortlich_id": "00000000-0000-0000-0000-0000000019b1"}' where schluessel = 'service';

-- Website: nur der Server
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000019a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000019a1', true);
select throws_ok($$ select public.service_aus_website('{}') $$, '42501', null, 'Angemeldete melden nicht über den Website-Eingang');
reset role;
set local role service_role;

select throws_ok($$ select public.service_aus_website('{"name": "X", "email": "x@test.local", "address": "Weg 1, 5630 Muri", "problem": "Anlage verschmutzt"}') $$,
  'P0001', 'service.einwilligung_fehlt', 'ohne Einwilligung kein Fall');

-- 1) Projektnummer
select set_config('test.a', (public.service_aus_website('{"name": "Markus Brunner", "email": "Brunner@test.local", "phone": "079 412 33 18",
  "address": "Bachstrasse 12, 5630 Muri", "project": "99-1087", "problem": "Anlage produziert nicht mehr", "message": "Fehler 2062",
  "consent": true, "lang": "de", "idempotency_key": "abc-12345678"}') ->> 'id'), true);
select is((select zuordnung from public.service_faelle where id = current_setting('test.a')::uuid), 'projektnummer', 'über Projektnummer zugeordnet');
select is((select anlage_id from public.service_faelle where id = current_setting('test.a')::uuid), '00000000-0000-0000-0000-0000000019f1'::uuid, 'Anlage gefunden');
select is((select objekt_id from public.service_faelle where id = current_setting('test.a')::uuid), '00000000-0000-0000-0000-0000000019d1'::uuid, 'Einsatzort gesetzt');
select is((select array[quelle, auswirkung, prioritaet, kategorie] from public.service_faelle where id = current_setting('test.a')::uuid),
  array['website', 'steht', 'hoch', 'stoerung'], '«produziert nicht mehr» = Anlage steht, hoch');
select ok((select reaktion_bis between now() + interval '47 hours' and now() + interval '49 hours' from public.service_faelle where id = current_setting('test.a')::uuid),
  'Reaktionszeit 48 h bei Anlage steht');
select ok((select garantie from public.service_faelle where id = current_setting('test.a')::uuid), 'Wechselrichter noch in Garantie (Montage abgelaufen)');
select is((select jsonb_array_length(checkliste) from public.service_faelle where id = current_setting('test.a')::uuid), 6, 'Checkliste Störung übernommen');
select is((select count(*)::int from public.benachrichtigungen where ziel = '/aftersales?fall=' || current_setting('test.a')), 1, 'Glocke für die verantwortliche Person');
select is((select status from public.ausgangskorb where bezug_id = current_setting('test.a')::uuid), 'wartet', 'Bestätigung wartet auf Freigabe');
select is((public.service_aus_website('{"name": "Markus Brunner", "email": "brunner@test.local", "phone": "079 412 33 18",
  "address": "Bachstrasse 12, 5630 Muri", "problem": "Anlage produziert nicht mehr", "consent": true, "idempotency_key": "abc-12345678"}') ->> 'doppelt')::boolean,
  true, 'gleiche Meldung nur einmal');

-- 2) Adresse (andere Schreibweise), französisch
select set_config('test.b', (public.service_aus_website('{"name": "M. Brunner", "email": "anders@test.local", "phone": "0791234567",
  "address": "Bachstr. 12, 5630 Muri AG", "problem": "L''installation produit trop peu", "consent": "true", "lang": "fr"}') ->> 'id'), true);
select is((select zuordnung from public.service_faelle where id = current_setting('test.b')::uuid), 'adresse', 'über Adresse zugeordnet');
select is((select array[auswirkung, prioritaet] from public.service_faelle where id = current_setting('test.b')::uuid), array['teilweise', 'normal'],
  'eingeschränkt, normal');
select is((select sprache from public.ausgangskorb where bezug_id = current_setting('test.b')::uuid), 'fr', 'Bestätigung auf Französisch');

-- 3) Kein Treffer
select set_config('test.c', (public.service_aus_website('{"name": "Lea Neu", "email": "neu@test.local", "phone": "0261112233",
  "address": "Rue du Pré 4, 1630 Bulle", "problem": "Anlage verschmutzt", "consent": true, "lang": "fr"}') ->> 'id'), true);
select is((select array[zuordnung, coalesce(kontakt_id::text, '-')] from public.service_faelle where id = current_setting('test.c')::uuid),
  array['offen', '-'], 'ohne Treffer: offen, ohne Kunde');

-- In der App
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000019a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000019a1', true);
select lives_ok(format('select public.service_kunde_aus_meldung(%L)', current_setting('test.c')), 'Kunde aus Meldung anlegen');
select is((select o.plz || ' ' || o.ort from public.service_faelle f join public.objekte o on o.id = f.objekt_id where f.id = current_setting('test.c')::uuid),
  '1630 Bulle', 'Einsatzort aus der Adresse');
select lives_ok(format('select public.service_eintrag(%L, %L, %L)', current_setting('test.a'), 'anruf', 'Kunde erreicht'), 'Anruf im Verlauf');
select is((select verlauf -> -1 ->> 'art' from public.service_faelle where id = current_setting('test.a')::uuid), 'anruf', 'Art gespeichert');
select lives_ok(format('select public.service_checkliste(%L, 0, true)', current_setting('test.a')), 'Schritt abhaken');
select ok((select checkliste -> 0 ->> 'erledigt_am' is not null from public.service_faelle where id = current_setting('test.a')::uuid), 'Schritt erledigt');
select is((public.service_akte(current_setting('test.a')::uuid) -> 'anlage' ->> 'leistung_kwp')::numeric, 11.2, 'Akte liefert die Anlage');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000019a2", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000019a2', true);
select throws_ok($$ update public.einstellungen set wert = wert where schluessel = 'service' $$, '42501', 'service.kein_recht',
  'Service-Einstellungen nur Administration');

select * from finish();
rollback;
