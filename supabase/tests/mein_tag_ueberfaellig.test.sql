-- Prüft Mein Tag (3.11.2026): Ein offener Service-Fall mit Termin gestern bleibt auf heute mit «überfällig»,
-- ein erledigter nicht; der Blick in die Vergangenheit zeigt ihn am Termin-Tag.
-- Ausführen: npm run db:test
begin;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000a0a1', 'mtu-mo@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte, sprache, profil) values
  ('00000000-0000-0000-0000-00000000a0b1', 'mtu_mo', 'Mona Ueberfaellig', 'mtu-mo@test.local',
   '00000000-0000-0000-0000-00000000a0a1', 'montage', '{}', 'fr', '{}');
insert into public.kontakte (id, vorname, nachname) values ('00000000-0000-0000-0000-00000000a0c1', 'Rita', 'Gisler');
insert into public.service_faelle (id, nummer, titel, kontakt_id, kategorie, prioritaet, status, person_id, termin_am) values
  ('00000000-0000-0000-0000-00000000a0e1', 'S9301', 'Onduleur en panne', '00000000-0000-0000-0000-00000000a0c1', 'stoerung', 'normal',
   'termin', '00000000-0000-0000-0000-00000000a0b1', ((now() at time zone 'Europe/Zurich')::date - 1 + time '09:00') at time zone 'Europe/Zurich'),
  ('00000000-0000-0000-0000-00000000a0e2', 'S9302', 'Schon erledigt', '00000000-0000-0000-0000-00000000a0c1', 'stoerung', 'normal',
   'erledigt', '00000000-0000-0000-0000-00000000a0b1', ((now() at time zone 'Europe/Zurich')::date - 1 + time '14:00') at time zone 'Europe/Zurich');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a0a1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a0a1', true);

create temp table heute_plan on commit drop as
  select e from jsonb_array_elements(public.mein_tag((now() at time zone 'Europe/Zurich')::date,
                                                     (now() at time zone 'Europe/Zurich')::date + 6, null) -> 'eintraege') e;

select is((select count(*)::int from heute_plan), 1, 'Nur der offene Fall von gestern, der erledigte nicht');
select is((select e ->> 'von' from heute_plan), ((now() at time zone 'Europe/Zurich')::date)::text, 'steht auf heute');
select is((select (e ->> 'ueberfaellig')::boolean from heute_plan), true, 'mit «überfällig»');
select is((select e ->> 'termin_tag' from heute_plan), ((now() at time zone 'Europe/Zurich')::date - 1)::text, 'ursprünglicher Termin-Tag');
select is((select e ->> 'zeit' from heute_plan), '09:00', 'Uhrzeit bleibt');

-- Blick auf gestern: am Termin-Tag, nicht überfällig
select is((select (e ->> 'ueberfaellig')::boolean
             from jsonb_array_elements(public.mein_tag((now() at time zone 'Europe/Zurich')::date - 1,
                                                       (now() at time zone 'Europe/Zurich')::date - 1, null) -> 'eintraege') e
            where e ->> 'id' = '00000000-0000-0000-0000-00000000a0e1'), false, 'gestern angeschaut: nicht überfällig');

-- Erledigt: verschwindet
reset role;
update public.service_faelle set status = 'erledigt' where id = '00000000-0000-0000-0000-00000000a0e1';
set local role authenticated;
select is((select jsonb_array_length(public.mein_tag((now() at time zone 'Europe/Zurich')::date,
                                                     (now() at time zone 'Europe/Zurich')::date, null) -> 'eintraege')), 0,
  'nach «Erledigt» weg');

select * from finish();
rollback;
