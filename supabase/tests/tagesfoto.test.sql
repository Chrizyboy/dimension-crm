-- Prüft «Foto des Tages» (Chris 4.11.2026): offen bis ein Foto am Rapport von heute hängt (einer im Team genügt),
-- Erinnerung ab 18:00 nur einmal.
-- Ausführen: npm run db:test
begin;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000e1a1', 'tf-ds@test.local'),
  ('00000000-0000-0000-0000-00000000e1a2', 'tf-dd@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache, profil) values
  ('00000000-0000-0000-0000-00000000e1b1', 'tf_ds', 'Diogo Eins', 'tf-ds@test.local', '00000000-0000-0000-0000-00000000e1a1', 'montage', '{}', 'fr', '{}'),
  ('00000000-0000-0000-0000-00000000e1b2', 'tf_dd', 'Diogo Zwei', 'tf-dd@test.local', '00000000-0000-0000-0000-00000000e1a2', 'montage', '{}', 'fr', '{}');
insert into public.kontakte (id, vorname, nachname) values ('00000000-0000-0000-0000-00000000e1c1', 'Sophie', 'Morand');
insert into public.projekte (id, nummer, titel, kontakt_id) values
  ('00000000-0000-0000-0000-00000000e1e1', 'P-TF-1', 'Dach', '00000000-0000-0000-0000-00000000e1c1');
insert into public.einsaetze (projekt_id, art, von, bis, personen) values
  ('00000000-0000-0000-0000-00000000e1e1', 'intern', (now() at time zone 'Europe/Zurich')::date, (now() at time zone 'Europe/Zurich')::date,
   array['00000000-0000-0000-0000-00000000e1b1', '00000000-0000-0000-0000-00000000e1b2']::uuid[]);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000e1a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e1a1', true);
select is((select public.tagesfoto_offen() -> 0 ->> 'nummer'), 'P-TF-1', 'Baustelle ohne Foto ist offen');

reset role;
select is(public.tagesfoto_erinnern() >= 0, true, 'Erinnerung läuft');
-- Erinnerung ab 18:00: zweimal laufen, je Person höchstens eine Glocke
select is((select count(*)::int from (select public.tagesfoto_erinnern()) x, public.benachrichtigungen b
            where b.person_id = '00000000-0000-0000-0000-00000000e1b1' and b.titel_de = 'Foto des Tages fehlt') <= 1, true,
  'höchstens eine Glocke je Person und Tag');

-- Kollege lädt ein Foto am Tagesrapport hoch
insert into public.rapporte (id, art, projekt_id, person_id, datum) values
  ('00000000-0000-0000-0000-00000000e1f1', 'montage', '00000000-0000-0000-0000-00000000e1e1', '00000000-0000-0000-0000-00000000e1b2',
   (now() at time zone 'Europe/Zurich')::date);
insert into public.dokumente (id, name, mime_typ, ordner, bezug_tabelle, bezug_id, kategorie, speicher, speicher_pfad, bytes) values
  ('00000000-0000-0000-0000-00000000e1d1', 'Foto.jpg', 'image/jpeg', 'fotos', 'rapporte', '00000000-0000-0000-0000-00000000e1f1',
   'tagesfoto', 'intern', 'rapporte/x/y.jpg', 100);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000e1a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e1a1', true);
select is((select jsonb_array_length(public.tagesfoto_offen())), 0, 'Foto vom Kollegen genügt');

select * from finish();
rollback;
