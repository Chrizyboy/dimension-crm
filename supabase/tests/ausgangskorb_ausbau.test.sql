-- Prüft den Ausbau des Ausgangskorbs (Entscheid 0041): «Für mich» und Freigaberecht je Art, Rückgängig-Frist sperrt
-- den Versand, Zurückholen, später senden, «Zurück an» mit Glocke, Briefe (nie vom Server, von Hand versendet,
-- Rücklauf), Prüfungen, Zusammenhang und die Erinnerung des Zeitplans.
-- Ausführen: npm run db:test
begin;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a0a1', 'ak-verkauf@test.local'),
  ('00000000-0000-0000-0000-00000000a0a2', 'ak-buchhaltung@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-00000000a0b1', 'ak_verkauf', 'Vera Ausgang', '00000000-0000-0000-0000-00000000a0a1', 'verkauf', '{}'),
  ('00000000-0000-0000-0000-00000000a0b2', 'ak_bh', 'Bea Buchhaltung', '00000000-0000-0000-0000-00000000a0a2', 'mitarbeit', '{finanzen}');

create temporary table ak (name text primary key, id uuid) on commit drop;
grant all on ak to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a0a1", "role": "authenticated"}', true);

insert into ak select 'offerte', public.ausgang_anlegen(
  '{"kanal": "mail", "art": "offerte", "an": "kunde@beispiel.test", "betreff": "Ihre Offerte", "text": "Guten Tag"}');
insert into ak select 'mahnung', public.ausgang_anlegen(
  '{"kanal": "mail", "art": "mahnung", "an": "zahlt-nicht@beispiel.test", "betreff": "Zahlungserinnerung", "text": "Bitte zahlen"}');

select is((select fuer_mich from public.ausgang_ansicht where id = (select id from ak where name = 'offerte')), true,
  'eigene Offerte: «Für mich»');
select is((select darf_freigeben from public.ausgang_ansicht where id = (select id from ak where name = 'mahnung')), false,
  'Mahnung darf nur, wer Finanzen hat');
select is((select fuer_mich from public.ausgang_ansicht where id = (select id from ak where name = 'mahnung')), false,
  'Mahnung ist nicht «Für mich» beim Verkauf');
select is((select vorbereitet_von from public.ausgang_ansicht where id = (select id from ak where name = 'offerte')), 'Vera Ausgang',
  'wer vorbereitet hat, steht dabei');
select ok(exists (select 1 from jsonb_array_elements(public.ausgang_pruefen((select id from ak where name = 'mahnung'))) p
                   where p ->> 'code' = 'kein_recht'), 'Prüfung nennt das fehlende Recht');
select ok(exists (select 1 from jsonb_array_elements(public.ausgang_pruefen((select id from ak where name = 'offerte'))) p
                   where p ->> 'code' = 'outlook_fehlt' and p ->> 'stufe' = 'fehler'), 'Prüfung: Outlook nicht verbunden');
select ok(public.ausgang_kontext((select id from ak where name = 'offerte')) ? 'verlauf', 'Zusammenhang kommt in einer Abfrage');

-- Freigeben mit Rückgängig-Frist: der Server holt den Eintrag noch nicht
select is(public.ausgang_freigeben(array[(select id from ak where name = 'offerte')], null, 10), 1, 'Freigabe mit Frist');
select ok((select rueckgaengig_bis > now() from public.ausgangskorb where id = (select id from ak where name = 'offerte')),
  'Frist zum Zurückholen gesetzt');
select is(public.ausgang_zurueckholen(array[(select id from ak where name = 'offerte')]), 1, 'Zurückholen innerhalb der Frist');
select is((select status from public.ausgangskorb where id = (select id from ak where name = 'offerte')), 'wartet',
  'zurückgeholt wartet wieder');
select throws_ok(format($$ select public.ausgang_zurueckholen(array[%L::uuid]) $$, (select id from ak where name = 'offerte')),
  'ausgang.schon_unterwegs', 'was nicht freigegeben ist, lässt sich nicht zurückholen');

-- Später senden
select is(public.ausgang_freigeben(array[(select id from ak where name = 'offerte')], now() + interval '1 day', 0), 1,
  'Freigabe für morgen');
select ok((select sende_ab > now() + interval '23 hours' from public.ausgangskorb where id = (select id from ak where name = 'offerte')),
  'Sendezeit gespeichert');

-- Brief: anlegen, freigeben, von Hand versendet, Rücklauf
insert into ak select 'brief', public.ausgang_anlegen(
  '{"kanal": "brief", "art": "werkvertrag", "an": "Familie Muster\nDorfstrasse 1\n5630 Muri", "betreff": "Werkvertrag zur Unterschrift"}');
select is((select kanal || ' ' || status from public.ausgangskorb where id = (select id from ak where name = 'brief')), 'brief wartet',
  'Brief kommt in den Ausgangskorb');
select is(public.ausgang_freigeben(array[(select id from ak where name = 'brief')]), 1, 'Brief freigegeben (zum Drucken)');
select lives_ok(format($$ select public.ausgang_als_gesendet(%L) $$, (select id from ak where name = 'brief')),
  'Brief als versendet markiert');
select lives_ok(format($$ select public.ausgang_ruecklauf(%L) $$, (select id from ak where name = 'brief')), 'Rücklauf erhalten');
select ok((select ruecklauf_am is not null and status = 'gesendet' from public.ausgangskorb where id = (select id from ak where name = 'brief')),
  'Brief: gesendet mit Rücklauf');

-- Zurück an: Buchhaltung schickt die Mahnung mit Notiz an die Verfasserin
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000a0a2", "role": "authenticated"}', true);
select is((select fuer_mich from public.ausgang_ansicht where id = (select id from ak where name = 'mahnung')), true,
  'Buchhaltung sieht die Mahnung «Für mich»');
select is(public.ausgang_zurueck((select id from ak where name = 'mahnung'), 'Teilzahlung von gestern abziehen'),
  '00000000-0000-0000-0000-00000000a0b1'::uuid, 'zurück an die Person, die vorbereitet hat');
select is((select fuer_mich from public.ausgang_ansicht where id = (select id from ak where name = 'mahnung')), false,
  'zurückgeschickt gehört nicht mehr der Buchhaltung');

reset role;
select is((select count(*)::int from public.benachrichtigungen
            where person_id = '00000000-0000-0000-0000-00000000a0b1' and ziel like '/outbox?eintrag=%'), 1,
  'die Verfasserin bekommt eine Glocke');

-- Server holt keine Briefe und nichts in der Rückgängig-Frist
update public.ausgangskorb set sende_ab = null, rueckgaengig_bis = now() + interval '1 minute'
 where id = (select id from ak where name = 'offerte');
select is((select count(*)::int from public.ausgang_holen(50) h where h.id in (select id from ak)), 0,
  'in der Rückgängig-Frist sendet der Server nicht');

select * from finish();
rollback;
