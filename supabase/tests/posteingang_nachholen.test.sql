-- Prüft das Nachholen älterer Mails: Stand je Postfach, Archiv ohne Frist (nie in «Wartet auf uns» oder der
-- Reaktionszeit), Zuordnung über Absender und Nummer im Betreff, keine Doppelten, Sichtbarkeit (eigenes Postfach nur
-- die Person selbst), Grenze in Monaten und Rechte.
-- Ausführen: npm run db:test
begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000019a1', 'nh-anna@test.local'),
  ('00000000-0000-0000-0000-0000000019a2', 'nh-ben@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000019b1', 'nh_anna', 'Anna NH', 'nh-anna@dimension-solaire.ch',
   '00000000-0000-0000-0000-0000000019a1', 'mitarbeit', '{}'),
  ('00000000-0000-0000-0000-0000000019b2', 'nh_ben', 'Ben NH', 'nh-ben@dimension-solaire.ch',
   '00000000-0000-0000-0000-0000000019a2', 'mitarbeit', '{}');
update public.integrationen set einstellungen = einstellungen || '{"eigene_domains": ["dimension-solaire.ch"]}'
 where dienst = 'microsoft';
update public.einstellungen set wert = wert || jsonb_build_object('aktiv', true, 'aktiv_seit', now(),
  'nachholen_monate', 12) where schluessel = 'posteingang';

insert into public.kontakte (id, vorname, nachname, email)
values ('00000000-0000-0000-0000-0000000019c1', 'Kunde', 'NH', 'kunde.nh@bluewin.ch');
insert into public.projekte (id, nummer, kontakt_id)
values ('00000000-0000-0000-0000-0000000019d1', 'NH4711', '00000000-0000-0000-0000-0000000019c1');

-- Stand: beginnt beim Start des normalen Abholens, Grenze 12 Monate
select ok((public.posteingang_nachholen_stand('00000000-0000-0000-0000-0000000019b1', 'inbox') ->> 'bis')::timestamptz
  <= now(), 'Stand beginnt beim Start des normalen Abholens');
select ok(abs(extract(epoch from (public.posteingang_nachholen_stand('00000000-0000-0000-0000-0000000019b1', 'inbox')
  ->> 'grenze')::timestamptz - (now() - interval '12 months'))) < 5, 'Grenze 12 Monate zurück');

select is(public.posteingang_nachholen('00000000-0000-0000-0000-0000000019b1', 'inbox',
  '00000000-0000-0000-0000-0000000019b1', 'me', $j$[
  {"kennung": "<nh1@x>", "outlook_id": "o1", "eingang_am": "2026-03-02T09:00:00+01:00", "von": "kunde.nh@bluewin.ch",
   "betreff": "AW: Projekt NH4711 Montage", "vorschau": "Danke"},
  {"kennung": "<nh2@x>", "outlook_id": "o2", "eingang_am": "2026-03-01T09:00:00+01:00", "von": "newsletter@shop-nh.ch",
   "betreff": "Rabatt"},
  {"kennung": "<nh3@x>", "outlook_id": "o3", "eingang_am": "2026-02-28T09:00:00+01:00", "von": "irgendwer@gmail.com",
   "betreff": "Frage"}
]$j$, '2026-02-28T09:00:00+01:00', false), 3, 'drei ältere Mails aufgenommen');
select is(public.posteingang_nachholen('00000000-0000-0000-0000-0000000019b1', 'inbox',
  '00000000-0000-0000-0000-0000000019b1', 'me', '[{"kennung": "<nh1@x>", "outlook_id": "o1", "von": "x@y.ch"}]',
  '2026-02-27T09:00:00+01:00', false), 0, 'dieselbe Mail nur einmal');

select is((select stand || '/' || erledigt_grund || '/' || art || '/' || coalesce(frist_am::text, '-') || '/'
  || sichtbar from public.posteingang where kennung = '<nh1@x>'), 'erledigt/archiv/kunde/-/person',
  'Kundenmail: erledigt als Archiv, ohne Frist, nur im eigenen Postfach sichtbar');
select is((select projekt_id from public.posteingang where kennung = '<nh1@x>'),
  '00000000-0000-0000-0000-0000000019d1'::uuid, 'Projekt über die Nummer im Betreff');
select is((select stand || '/' || art from public.posteingang where kennung = '<nh2@x>'), 'abgelegt/werbung',
  'Newsletter abgelegt');
select is((select stand || '/' || art from public.posteingang where kennung = '<nh3@x>'), 'erledigt/sonstiges',
  'Unbekannter Absender: erledigt, keine KI');
select is((select count(*)::int from public.posteingang where kennung like '<nh%' and stand in ('neu', 'offen')), 0,
  'nichts davon wartet auf eine Antwort');
select is((select bis from intern.posteingang_nachholen
  where schluessel = '00000000-0000-0000-0000-0000000019b1' and ordner = 'inbox'),
  '2026-02-27T09:00:00+01:00'::timestamptz, 'Stand rückt auf die älteste Mail');

-- Letzte Seite: Stand auf die Grenze, danach nichts mehr zu tun
select public.posteingang_nachholen('00000000-0000-0000-0000-0000000019b1', 'inbox',
  '00000000-0000-0000-0000-0000000019b1', 'me', '[]', null, true);
select is(public.posteingang_nachholen_stand('00000000-0000-0000-0000-0000000019b1', 'inbox'), null,
  'fertig bis zur Grenze');
update public.einstellungen set wert = wert || '{"nachholen_monate": 24}' where schluessel = 'posteingang';
select isnt(public.posteingang_nachholen_stand('00000000-0000-0000-0000-0000000019b1', 'inbox'), null,
  'mehr Monate: holt weiter zurück');

-- Sichtbarkeit und Rechte
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000019a2", "role": "authenticated"}', true);
select is((select count(*)::int from public.posteingang where kennung like '<nh%'), 0,
  'Ben sieht Annas ältere Mails nicht');
select throws_ok($$select public.posteingang_nachholen_stand('x', 'inbox')$$, '42501', null,
  'Nachholen nur der Server');
reset role;
select set_config('request.jwt.claims', '', true);

select * from finish();
rollback;
