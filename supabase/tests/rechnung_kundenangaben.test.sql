-- Prüft, dass Rechnungsadresse, Rechnungs-Mail und Zahlungsfrist des Kunden (Kundenakte) in neue Rechnungen kommen,
-- leere Felder nichts verdecken und eine von Hand gesetzte Fälligkeit bleibt.
-- Ausführen: npm run db:test
begin;
select plan(6);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000052a1', 'rk-bh@test.local');
insert into public.personen (id, kuerzel, name, auth_user_id, rolle, rechte) values
  ('00000000-0000-0000-0000-0000000052b1', 'rk_bh', 'Bruno Buchhaltung', '00000000-0000-0000-0000-0000000052a1', 'buchhaltung', '{}');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000052a1", "role": "authenticated"}', true);

insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache, email, rechnungsadresse, rechnungs_email, zahlungsfrist_tage) values
  ('00000000-0000-0000-0000-0000000052c1', 'person', 'privat', 'Vera', 'Verwaltet', 'de', 'vera@beispiel.test',
   '{"name": "Immo Verwaltung AG", "zusatz": "", "strasse": "Bahnhofstrasse 1", "plz": "5630", "ort": "Muri"}',
   'rechnungen@immo.test', 10),
  ('00000000-0000-0000-0000-0000000052c2', 'person', 'privat', 'Otto', 'Normal', 'de', 'otto@beispiel.test', null, null, null);
insert into public.projekte (id, nummer, kontakt_id, status, bau_status, standort_id, vertragswert_rappen) values
  ('00000000-0000-0000-0000-0000000052e1', '952001', '00000000-0000-0000-0000-0000000052c1', 'im_bau', 'terminiert',
   (select id from public.standorte where kuerzel = 'muri'), 1000000),
  ('00000000-0000-0000-0000-0000000052e2', '952002', '00000000-0000-0000-0000-0000000052c2', 'im_bau', 'terminiert',
   (select id from public.standorte where kuerzel = 'muri'), 1000000);
insert into public.zahlungsplan (id, projekt_id, bezeichnung, betrag_rappen, faellig_am) values
  ('00000000-0000-0000-0000-0000000052f1', '00000000-0000-0000-0000-0000000052e1', 'Anzahlung', 300000, current_date),
  ('00000000-0000-0000-0000-0000000052f2', '00000000-0000-0000-0000-0000000052e1', 'Schluss', 700000, current_date),
  ('00000000-0000-0000-0000-0000000052f3', '00000000-0000-0000-0000-0000000052e2', 'Anzahlung', 300000, current_date);

create temp table t_r (name text primary key, id uuid) on commit drop;
insert into t_r select 'vera', public.rechnung_entwurf('{"zahlungsplan_id": "00000000-0000-0000-0000-0000000052f1"}');
insert into t_r select 'vera2', public.rechnung_entwurf('{"zahlungsplan_id": "00000000-0000-0000-0000-0000000052f2"}');
insert into t_r select 'otto', public.rechnung_entwurf('{"zahlungsplan_id": "00000000-0000-0000-0000-0000000052f3"}');

select is((select rechnung_an from public.rechnungen where id = (select id from t_r where name = 'vera')),
  '{"name": "Immo Verwaltung AG", "strasse": "Bahnhofstrasse 1", "plz": "5630", "ort": "Muri", "email": "rechnungen@immo.test"}'::jsonb,
  'Rechnungsadresse und -Mail des Kunden kommen in die neue Rechnung, leere Felder nicht');
select is((select rechnung_an from public.rechnungen where id = (select id from t_r where name = 'otto')), null,
  'ohne Angaben am Kunden bleibt rechnung_an leer');

select public.rechnung_stellen((select id from t_r where name = 'vera'), current_date);
select is((select faellig_am from public.rechnungen where id = (select id from t_r where name = 'vera')), current_date + 10,
  'eigene Zahlungsfrist des Kunden gilt beim Stellen');
select public.rechnung_stellen((select id from t_r where name = 'otto'), current_date);
select is((select faellig_am from public.rechnungen where id = (select id from t_r where name = 'otto')),
  current_date + (select zahlungsfrist_tage from public.firmen f join public.rechnungen r on r.firma_id = f.id
                   where r.id = (select id from t_r where name = 'otto')),
  'ohne eigene Frist gilt die Frist der Firma');

update public.rechnungen set faellig_am = current_date + 45 where id = (select id from t_r where name = 'vera2');
select public.rechnung_stellen((select id from t_r where name = 'vera2'), current_date);
select is((select faellig_am from public.rechnungen where id = (select id from t_r where name = 'vera2')), current_date + 45,
  'von Hand gesetzte Fälligkeit bleibt');

select public.rechnung_angaben((select id from t_r where name = 'vera2'),
  '{"rechnung_an": null, "kunden_referenz": null, "versandweg": "mail"}');
select is((select rechnung_an from public.rechnungen where id = (select id from t_r where name = 'vera2')), null,
  'in der Akte entfernte Rechnungsadresse bleibt entfernt');

select * from finish();
rollback;
