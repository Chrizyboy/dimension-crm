-- Prüft «Fotos für Werbung», den Referenz-Post nach der IBN (ohne Namen, nur mit Erlaubnis und Fotos, einmal) und
-- die Nachrüst-Mail-Entwürfe (Modul-Prüfung 34B). Ausführen: npm run db:test
begin;
select plan(8);

insert into public.kontakte (id, art, kontaktart, vorname, nachname, sprache) values
  ('00000000-0000-0000-0000-0000000043c1', 'person', 'privat', 'Fritz', 'Geheimname', 'de');
insert into public.objekte (id, kontakt_id, strasse, plz, ort, gemeinde) values
  ('00000000-0000-0000-0000-0000000043d1', '00000000-0000-0000-0000-0000000043c1', 'Geheimweg 7', '5630', 'Muri AG', 'Muri (AG)');
insert into public.projekte (id, nummer, kontakt_id, objekt_id, titel) values
  ('00000000-0000-0000-0000-0000000043e1', 'P9431', '00000000-0000-0000-0000-0000000043c1', '00000000-0000-0000-0000-0000000043d1', 'PV Referenz'),
  ('00000000-0000-0000-0000-0000000043e2', 'P9432', '00000000-0000-0000-0000-0000000043c1', '00000000-0000-0000-0000-0000000043d1', 'PV ohne Erlaubnis');
insert into public.anlagen (projekt_id, objekt_id, leistung_kwp, komponenten) values
  ('00000000-0000-0000-0000-0000000043e1', '00000000-0000-0000-0000-0000000043d1', 12.4, '[{"art": "pv"}, {"art": "batterie", "modell": "X"}]');
insert into public.rapporte (id, projekt_id, art, datum, fotos_werbung) values
  ('00000000-0000-0000-0000-0000000043a1', '00000000-0000-0000-0000-0000000043e1', 'montage', current_date, true),
  ('00000000-0000-0000-0000-0000000043a2', '00000000-0000-0000-0000-0000000043e2', 'montage', current_date, false);
insert into public.dokumente (id, name, speicher, ordner, kategorie, bezug_tabelle, bezug_id, speicher_pfad) values
  ('00000000-0000-0000-0000-0000000043f1', 'zaehler.jpg', 'intern', 'fotos', 'zaehler', 'rapporte', '00000000-0000-0000-0000-0000000043a1', 'r/1.jpg'),
  ('00000000-0000-0000-0000-0000000043f2', 'dach.jpg', 'intern', 'fotos', 'dach', 'rapporte', '00000000-0000-0000-0000-0000000043a1', 'r/2.jpg'),
  ('00000000-0000-0000-0000-0000000043f3', 'unterschrift.png', 'intern', 'unterschrift', null, 'rapporte', '00000000-0000-0000-0000-0000000043a1', 'r/3.png'),
  ('00000000-0000-0000-0000-0000000043f4', 'dach.jpg', 'intern', 'fotos', 'dach', 'rapporte', '00000000-0000-0000-0000-0000000043a2', 'r/4.jpg');

select isnt(intern.referenz_post_entwurf('00000000-0000-0000-0000-0000000043e1'), null, 'Entwurf entsteht mit Erlaubnis und Fotos');
select is((select bilder from public.social_posts where details ->> 'projekt_id' = '00000000-0000-0000-0000-0000000043e1'),
  '["00000000-0000-0000-0000-0000000043f2", "00000000-0000-0000-0000-0000000043f1"]'::jsonb, 'Fotos: Dach zuerst, keine Unterschrift');
select is((select status || ':' || array_to_string(netzwerke, ',') from public.social_posts
            where details ->> 'projekt_id' = '00000000-0000-0000-0000-0000000043e1'), 'entwurf:instagram,facebook,linkedin',
  'Entwurf für drei Netzwerke, nichts veröffentlicht');
select ok((select texte #>> '{instagram,de}' from public.social_posts where details ->> 'projekt_id' = '00000000-0000-0000-0000-0000000043e1')
            like '%Muri (AG)%12.4-kWp-Photovoltaik-Anlage mit Batteriespeicher%', 'Text mit Ort und Anlage');
select ok((select texte::text not like '%Geheim%' from public.social_posts
            where details ->> 'projekt_id' = '00000000-0000-0000-0000-0000000043e1'), 'kein Name, keine Adresse');
select is(intern.referenz_post_entwurf('00000000-0000-0000-0000-0000000043e1'), null, 'pro Projekt nur einmal');
select is(intern.referenz_post_entwurf('00000000-0000-0000-0000-0000000043e2'), null, 'ohne Erlaubnis kein Entwurf');
select ok((select wert #>> '{nachruest,ohne_batterie,fr,betreff}' from public.einstellungen where schluessel = 'marketing') is not null,
  'Nachrüst-Mail-Entwurf auf Französisch vorhanden');

select * from finish();
rollback;
