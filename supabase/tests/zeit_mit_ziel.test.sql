-- Prüft «Zeit immer mit Ziel» (Chris 4.11.2026): ohne Projekt, Service-Fall oder internen Posten kein Start;
-- interner Posten nur allein und nur aus den Einstellungen; Service-Fall kommt aus dem Rapport.
-- Ausführen: npm run db:test
begin;
select plan(8);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000c1a1', 'zz-mo@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache, profil) values
  ('00000000-0000-0000-0000-00000000c1b1', 'zz_mo', 'Zora Ziel', 'zz-mo@test.local', '00000000-0000-0000-0000-00000000c1a1', 'montage', '{}', 'fr', '{}');
insert into public.kontakte (id, vorname, nachname) values ('00000000-0000-0000-0000-00000000c1c1', 'Rita', 'Gisler');
insert into public.service_faelle (id, nummer, titel, kontakt_id, kategorie, prioritaet, status) values
  ('00000000-0000-0000-0000-00000000c1e1', 'S9401', 'Onduleur', '00000000-0000-0000-0000-00000000c1c1', 'stoerung', 'normal', 'termin');
insert into public.rapporte (id, art, service_fall_id, person_id, datum) values
  ('00000000-0000-0000-0000-00000000c1f1', 'service', '00000000-0000-0000-0000-00000000c1e1', '00000000-0000-0000-0000-00000000c1b1', current_date);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000c1a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a1', true);

select throws_ok($$ select public.zeit_starten('{"art": "arbeit"}') $$, 'P0001', 'baustelle.zeit_ohne_ziel', 'ohne Ziel kein Start');
select throws_ok($$ select public.zeit_starten('{"intern": "kaffee"}') $$, 'P0001', 'baustelle.zeit_posten_unbekannt', 'nur Posten aus den Einstellungen');
select throws_ok($$ select public.zeit_starten('{"intern": "lager", "service_fall_id": "00000000-0000-0000-0000-00000000c1e1"}') $$,
  'P0001', 'baustelle.zeit_ein_ziel', 'interner Posten steht allein');

select lives_ok($$ select public.zeit_starten('{"id": "00000000-0000-0000-0000-00000000c1d1", "intern": "lager"}') $$, 'Lager geht');
select lives_ok($$ select public.zeit_starten(jsonb_build_object('id', '00000000-0000-0000-0000-00000000c1d2',
  'rapport_id', '00000000-0000-0000-0000-00000000c1f1')) $$, 'Start mit Rapport');
select is((select service_fall_id from public.zeiten where id = '00000000-0000-0000-0000-00000000c1d2'),
  '00000000-0000-0000-0000-00000000c1e1'::uuid, 'Service-Fall kommt aus dem Rapport');
select is((select array[intern_fr, service_nummer] from public.zeiten_liste
            where id in ('00000000-0000-0000-0000-00000000c1d1', '00000000-0000-0000-0000-00000000c1d2') order by start limit 1),
  array['Dépôt / atelier', null], 'Liste zeigt den Posten in der Sprache');

-- Korrektur von Hand: auf Lager umstellen, Rapport fällt weg
select public.zeit_speichern(jsonb_build_object('id', '00000000-0000-0000-0000-00000000c1d2', 'start', now() - interval '1 hour',
  'stopp', now(), 'art', 'arbeit', 'intern', 'lager', 'projekt_id', null, 'service_fall_id', null, 'rapport_id', null));
select is((select array[intern, coalesce(rapport_id::text, '-')] from public.zeiten where id = '00000000-0000-0000-0000-00000000c1d2'),
  array['lager', '-'], 'Korrektur auf Lager');

select * from finish();
rollback;
