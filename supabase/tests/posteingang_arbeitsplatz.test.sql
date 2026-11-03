-- Prüft den Arbeitsplatz im Posteingang (2.11.2026): Zurückstellen und Zurückholen, «auf Kunde warten» von Hand und
-- automatisch nach der Antwort, Nachfassen durch die Wiedervorlage (nur einmal automatisch), eine neue Mail des Kunden
-- beendet das Warten, interne Notiz mit @Kürzel (Glocke, Mail wird fürs Team sichtbar), Absender-Regeln (eigenes
-- Postfach ja, info@ nur wer verteilt, «ablegen» schon beim Aufnehmen), Team-Übersicht nur Zahlen (alle nur Geschäftsleitung), Zahlung nur mit
-- Recht «finanzen». Ausführen: npm run db:test
begin;
select plan(23);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000018c1', 'ap-anna@test.local'),
  ('00000000-0000-0000-0000-0000000018c2', 'ap-ben@test.local');
insert into public.personen (id, kuerzel, name, email, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000018d1', 'ap_anna', 'Anna Arbeit', 'ap-anna@dimension-solaire.ch',
   '00000000-0000-0000-0000-0000000018c1', 'mitarbeit', '{}'),
  ('00000000-0000-0000-0000-0000000018d2', 'ap_ben', 'Ben Verteiler', 'ap-ben@dimension-solaire.ch',
   '00000000-0000-0000-0000-0000000018c2', 'mitarbeit', '{admin}');
update public.integrationen set einstellungen = einstellungen || '{"eigene_domains": ["dimension-solaire.ch"]}'
 where dienst = 'microsoft';
update public.einstellungen set wert = wert || '{"verteilen": ["ap_ben"],
  "warten": {"auto": true, "tage": 3, "arten": ["anfrage"], "mit_offerte": true, "frist_min": 240}}'::jsonb
 where schluessel = 'posteingang';

-- Zwei Mails in Annas Postfach: eine Kundenfrage und eine Anfrage, eingeordnet wie von der KI
select is(public.posteingang_aufnehmen('00000000-0000-0000-0000-0000000018d1', 'me', $j$[
  {"kennung": "<ap1@x>", "outlook_id": "ap1", "konversation": "apk1", "von": "kunde.ap@bluewin.ch",
   "von_name": "Kunde AP", "betreff": "Frage AP", "vorschau": "Wann kommt ihr?"},
  {"kennung": "<ap2@x>", "outlook_id": "ap2", "konversation": "apk2", "von": "neu.ap@gmail.com",
   "betreff": "Anfrage AP", "vorschau": "PV-Anlage"}
]$j$), 2, 'zwei Mails aufgenommen');
select public.posteingang_sortieren(id, '{"art": "kunde", "sprache": "de", "antwort_noetig": true}')
  from public.posteingang where kennung = '<ap1@x>';
select public.posteingang_sortieren(id, '{"art": "anfrage", "sprache": "de", "antwort_noetig": true}')
  from public.posteingang where kennung = '<ap2@x>';
select is((select stand || '/' || zustaendig_id::text from public.posteingang where kennung = '<ap1@x>'),
  'offen/00000000-0000-0000-0000-0000000018d1', 'Kundenfrage offen bei Anna');

-- Anna arbeitet: zurückstellen, zurückholen, auf Kunde warten
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000018c1", "role": "authenticated"}', true);
select throws_ok($$ select public.posteingang_setzen((select id from public.posteingang where kennung = '<ap1@x>'),
  'zurueck', jsonb_build_object('bis', now() - interval '1 hour')) $$, 'posteingang.zeit_ungueltig',
  'zurückstellen in die Vergangenheit geht nicht');
select public.posteingang_setzen((select id from public.posteingang where kennung = '<ap1@x>'), 'zurueck',
  jsonb_build_object('bis', now() + interval '1 day'));
select ok((select zurueck_am > now() from public.posteingang where kennung = '<ap1@x>'), 'zurückgestellt bis morgen');
select public.posteingang_setzen((select id from public.posteingang where kennung = '<ap1@x>'), 'zurueck_holen');
select is((select zurueck_am from public.posteingang where kennung = '<ap1@x>'), null, 'zurückgeholt');
select public.posteingang_setzen((select id from public.posteingang where kennung = '<ap1@x>'), 'warten');
select ok((select stand = 'erledigt' and warten_bis > now() from public.posteingang where kennung = '<ap1@x>'),
  'erledigt und wartet auf den Kunden');

-- Notiz mit @Kürzel: Ben bekommt die Glocke und sieht die Mail
select throws_ok($$ select public.posteingang_notiz((select id from public.posteingang where kennung = '<ap1@x>'), '  ') $$,
  'posteingang.notiz_leer', 'leere Notiz abgelehnt');
select isnt(public.posteingang_notiz((select id from public.posteingang where kennung = '<ap1@x>'),
  '@ap_ben kannst du das prüfen?'), null, 'Notiz gespeichert');
select is((select count(*)::int from public.posteingang_notizen_von((select id from public.posteingang where kennung = '<ap1@x>'))),
  1, 'Notiz mit Namen lesbar');

-- Absender-Regeln: eigenes Postfach ja, Team-Postfach nur wer verteilt, direkt schreiben nie
select isnt(public.posteingang_regel_speichern('{"absender": "@spam-ap.ch", "aktion": "ablegen"}'), null,
  'Regel fürs eigene Postfach');
select throws_ok($$ select public.posteingang_regel_speichern('{"absender": "@spam-ap.ch", "aktion": "ablegen", "team": true}') $$,
  '42501', 'posteingang.kein_recht', 'Regel für info@ nur wer verteilt');
select throws_ok($$ select public.posteingang_regel_speichern('{"absender": "kein absender", "aktion": "ablegen"}') $$,
  'posteingang.absender_ungueltig', 'ungültiger Absender abgelehnt');
select throws_ok($$ insert into public.posteingang_regeln (absender, aktion) values ('@x-ap.ch', 'ablegen') $$,
  '42501', null, 'Regeln nur über die Funktion');
select throws_ok($$ select public.posteingang_zahlung_erfassen((select id from public.posteingang where kennung = '<ap1@x>'),
  '{"firma": "Lieferant AP", "betrag_rappen": 10000}') $$, '42501', 'posteingang.kein_recht_finanzen',
  'Zahlung nur mit Recht Finanzen');
reset role;
select set_config('request.jwt.claims', '', true);

select ok(exists (select 1 from public.benachrichtigungen where person_id = '00000000-0000-0000-0000-0000000018d2'),
  'Ben hat die Glocke');
-- Persönliches Postfach bleibt persönlich; die erwähnte Person darf die Mail trotzdem lesen.
select is((select sichtbar from public.posteingang where kennung = '<ap1@x>'), 'person', 'erwähnte Mail bleibt persönlich');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000018c2", "role": "authenticated"}', true);
set local role authenticated;
select ok(exists (select 1 from public.posteingang where kennung = '<ap1@x>'), 'erwähnte Person (Ben) sieht die Mail');
reset role;
select set_config('request.jwt.claims', '', true);

-- Regel «ablegen» greift schon beim Aufnehmen
select public.posteingang_aufnehmen('00000000-0000-0000-0000-0000000018d1', 'me',
  '[{"kennung": "<ap3@x>", "outlook_id": "ap3", "von": "max.ap@spam-ap.ch", "betreff": "Angebot"}]');
select is((select stand || '/' || sortiert from public.posteingang where kennung = '<ap3@x>'), 'abgelegt/regel',
  'Absender-Regel legt still ab');

-- Wiedervorlage: Kunde hat nicht geantwortet → wieder offen mit «nachfassen»
update public.posteingang set warten_bis = now() - interval '1 minute' where kennung = '<ap1@x>';
select intern.pe_wiedervorlage();
select ok((select stand = 'offen' and nachfassen and frist_am > now() from public.posteingang where kennung = '<ap1@x>'),
  'nachfassen mit neuer Frist');

-- Anfrage beantwortet → automatisch warten; neue Mail des Kunden beendet das Warten
update public.posteingang set stand = 'erledigt', erledigt_grund = 'beantwortet', erledigt_am = now() - interval '1 hour'
 where kennung = '<ap2@x>';
select ok((select warten_bis is not null from public.posteingang where kennung = '<ap2@x>'),
  'nach der Antwort auf eine Anfrage wartet die Mail auf den Kunden');
select public.posteingang_aufnehmen('00000000-0000-0000-0000-0000000018d1', 'me',
  '[{"kennung": "<ap4@x>", "outlook_id": "ap4", "konversation": "apk2", "von": "neu.ap@gmail.com", "betreff": "Re: Anfrage AP"}]');
select is((select warten_bis from public.posteingang where kennung = '<ap2@x>'), null, 'Antwort des Kunden beendet das Warten');

-- Team-Übersicht: Anna sieht nur sich, Ben (Administration, bis es das Recht «gl» gibt) sieht alle
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000018c1", "role": "authenticated"}', true);
select is((select array_agg(z ->> 'person_id') from jsonb_array_elements(public.posteingang_team()) z),
  array['00000000-0000-0000-0000-0000000018d1'], 'ohne Geschäftsleitung nur die eigenen Zahlen');
reset role;
select set_config('request.jwt.claims', '', true);
-- Ben sieht alle
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000018c2", "role": "authenticated"}', true);
select ok((select (z ->> 'offen')::int >= 1 from jsonb_array_elements(public.posteingang_team()) z
            where z ->> 'person_id' = '00000000-0000-0000-0000-0000000018d1'), 'Geschäftsleitung sieht Annas offene Mails');
reset role;
select set_config('request.jwt.claims', '', true);

select * from finish();
rollback;
