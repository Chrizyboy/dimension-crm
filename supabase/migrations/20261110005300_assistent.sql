-- Assistent (Ausbau KI-Assistent, Entscheid 0039): Gespräche mit dem Assistenten (privat, 90 Tage), Aufträge als
-- Vorlagen je Rolle (Firma und eigene) und Funktionen einzeln ausschaltbar (einstellungen.ki.aus).

-- Gespräche: Fragen ans CRM und gelesene Dokumente. Nur die Person selbst sieht ihre Gespräche, auch die
-- Administration nicht. Inhalte bleiben 90 Tage, danach landen sie im Papierkorb (beim nächsten neuen Gespräch).
create table public.ki_gespraeche (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null default intern.meine_person_id() references public.personen (id),
  art            text not null default 'frage' check (art in ('frage', 'dokument')),
  titel          text not null,
  bezug_tabelle  text,
  bezug_id       uuid,
  nachrichten    jsonb not null default '[]',
  kosten_millirappen bigint not null default 0
);
select intern.richte_fachtabelle_ein('ki_gespraeche');
create index ki_gespraeche_person_idx on public.ki_gespraeche (person_id, geaendert_am desc) where geloescht_am is null;
create policy nur_eigene on public.ki_gespraeche as restrictive for all to authenticated
  using (person_id = (select intern.meine_person_id()))
  with check (person_id = (select intern.meine_person_id()));
comment on table public.ki_gespraeche is
  'Gespräche mit dem Assistenten (Fragen ans CRM, Dokumente). Privat je Person, nach 90 Tagen in den Papierkorb.';
comment on column public.ki_gespraeche.nachrichten is
  'Runden [{"frage", "antwort", "tabelle", "vorschlaege", "quellen", "am"}]; Tabellen höchstens 50 Zeilen.';

/** Alte Gespräche (älter als 90 Tage) der Person in den Papierkorb, sobald sie ein neues beginnt. */
create or replace function intern.ki_gespraeche_aufraeumen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.ki_gespraeche set geloescht_am = now()
   where person_id = new.person_id and geloescht_am is null and geaendert_am < now() - interval '90 days';
  return new;
end;
$$;
create trigger aufraeumen after insert on public.ki_gespraeche
  for each row execute function intern.ki_gespraeche_aufraeumen();

-- Aufträge: fertige Fragen oder Texte mit einem Klick. Ohne Person = Firmenvorlage (nur Administration),
-- mit Person = eigener Auftrag (nur diese Person). «rollen» leer = für alle.
create table public.ki_vorlagen (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid references public.personen (id),
  art         text not null check (art in ('frage', 'text')),
  titel_de    text not null,
  titel_fr    text not null,
  text_de     text not null default '',
  text_fr     text not null default '',
  auftrag     text not null,
  kundenart   text,
  rollen      text[] not null default '{}',
  reihenfolge int not null default 100
);
select intern.richte_fachtabelle_ein('ki_vorlagen');
create policy eigene_oder_firma on public.ki_vorlagen as restrictive for select to authenticated
  using (person_id is null or person_id = (select intern.meine_person_id()));
create policy aendern_eigene_oder_admin on public.ki_vorlagen as restrictive for insert to authenticated
  with check (person_id = (select intern.meine_person_id())
              or (person_id is null and (select intern.hat_recht('admin'))));
create policy bearbeiten_eigene_oder_admin on public.ki_vorlagen as restrictive for update to authenticated
  using (person_id = (select intern.meine_person_id()) or (person_id is null and (select intern.hat_recht('admin'))))
  with check (person_id = (select intern.meine_person_id())
              or (person_id is null and (select intern.hat_recht('admin'))));
comment on table public.ki_vorlagen is
  'Aufträge für den Assistenten: art frage (geht als Frage ans CRM) oder text (öffnet das Schreibfenster).';

insert into public.ki_vorlagen (art, titel_de, titel_fr, text_de, text_fr, auftrag, kundenart, rollen, reihenfolge) values
  ('frage', 'Wen muss ich nachfassen?', 'Qui dois-je relancer ?',
   'Offene Offerten mit fälligem Nachfassen, älteste zuerst.', 'Offres ouvertes à relancer, les plus anciennes d''abord.',
   'Welche offenen Offerten sind älter als 10 Tage und wurden noch nicht oder vor mehr als 7 Tagen nachgefasst? Sortiere nach Alter und schlage je eine Nachfass-Mail vor.',
   null, '{verkauf,innendienst,admin}', 10),
  ('frage', 'Leads ohne Termin', 'Leads sans rendez-vous',
   'Neue Anfragen, bei denen noch kein Termin steht.', 'Nouvelles demandes sans rendez-vous fixé.',
   'Welche offenen Leads haben noch keinen Termin und keine Offerte? Älteste zuerst, mit Zuständigen.',
   null, '{verkauf,admin}', 20),
  ('text', 'Antwort auf eine Anfrage', 'Réponse à une demande',
   'Mail einfügen, Antwort mit Vorschlag für einen Besichtigungstermin.', 'Coller l''e-mail, réponse avec proposition de visite.',
   'Freundliche Antwort auf die Anfrage, kurz, mit Vorschlag für einen Besichtigungstermin [Datum].',
   'antwort', '{verkauf,innendienst,admin}', 30),
  ('text', 'Begleittext zur Offerte', 'Lettre d''accompagnement de l''offre',
   'Kurz, mit den wichtigsten Zahlen der Offerte.', 'Court, avec les chiffres clés de l''offre.',
   'Begleittext zur Offerte: Leistung, Preis, Förderung und Eigenverbrauch aus den Daten, nächster Schritt.',
   'offerttext', '{verkauf,innendienst,admin}', 40),
  ('text', 'Kunde über Montage informieren', 'Informer le client du montage',
   'Termin, Team und was der Kunde vorbereiten muss.', 'Date, équipe et ce que le client doit préparer.',
   'Kunde über den Montagetermin informieren: Datum, ungefähre Dauer, was vorzubereiten ist (Zugang zum Dach, Strom, Platz für Material und Parkplatz).',
   'termin', '{projektleitung,innendienst,admin}', 50),
  ('frage', 'Wochenstand Projekte', 'Point hebdomadaire des projets',
   'Was ist blockiert, was fehlt, wer ist dran.', 'Ce qui bloque, ce qui manque, qui s''en occupe.',
   'Welche laufenden Projekte haben fehlendes Material oder einen Baubeginn in den nächsten 21 Tagen? Nenne Verantwortliche und was offen ist.',
   null, '{projektleitung,admin}', 60),
  ('frage', 'Offene Service-Fälle', 'Cas de service ouverts',
   'Was ist offen, was ist dringend, was ist überfällig.', 'Ce qui est ouvert, urgent ou en retard.',
   'Welche Service-Fälle sind offen? Dringende und überfällige zuerst, mit Kunde, Ort und Termin.',
   null, '{projektleitung,montage,admin}', 70),
  ('frage', 'Überfällige Rechnungen', 'Factures en retard',
   'Fällig und nicht bezahlt, mit Mahnstufe.', 'Échues et non payées, avec niveau de rappel.',
   'Welche Rechnungen sind fällig und nicht bezahlt? Mit Betrag, Tagen überfällig und Mahnstufe, grösste zuerst. Schlage freundliche Zahlungserinnerungen vor.',
   null, '{buchhaltung,admin}', 80),
  ('frage', 'Wochenbericht', 'Rapport hebdomadaire',
   'Verkauf, gewonnene Aufträge, Montage und offene Rechnungen der letzten 7 Tage.', 'Ventes, commandes gagnées, montages et factures ouvertes des 7 derniers jours.',
   'Fasse die letzten 7 Tage zusammen: neue Leads, verschickte und gewonnene Offerten (Summe), gestartete Projekte, offene Service-Fälle und überfällige Rechnungen. Nenne Auffälliges.',
   null, '{admin}', 90),
  ('frage', 'Meine Aufgaben', 'Mes tâches',
   'Was heute und diese Woche fällig ist.', 'Ce qui est dû aujourd''hui et cette semaine.',
   'Welche meiner offenen Aufgaben sind heute oder in den nächsten 7 Tagen fällig oder schon überfällig?',
   null, '{}', 5);

-- Funktionen einzeln ausschalten: «aus» = Liste der Funktionen, die nicht laufen (Administration).
-- Fragen ans CRM und Dokumente lesen bekommen ihre Stufe.
update public.einstellungen
   set wert = wert
     || jsonb_build_object('aus', coalesce(wert -> 'aus', '[]'::jsonb))
     || jsonb_build_object('funktionen', coalesce(wert -> 'funktionen', '{}'::jsonb)
          || '{"frage_plan": "schnell", "frage": "standard", "dokument": "schnell"}'::jsonb)
 where schluessel = 'ki';
