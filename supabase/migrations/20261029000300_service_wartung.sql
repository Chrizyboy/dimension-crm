-- Phase 9, Teil 3: Service & Garantie (V49: Fälle S001 …, Anlage-Daten) und Wartungsverträge (W001 …).

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe) values
  ('servicekategorie', 'stoerung', 'Störung', 'Panne', 10, null),
  ('servicekategorie', 'garantie', 'Garantie', 'Garantie', 20, null),
  ('servicekategorie', 'reklamation', 'Reklamation', 'Réclamation', 30, null),
  ('servicekategorie', 'wartung', 'Wartung / Kontrolle', 'Entretien / contrôle', 40, null),
  ('servicekategorie', 'erweiterung', 'Erweiterung', 'Extension', 50, null),
  ('servicekategorie', 'monitoring', 'Monitoring / App', 'Monitoring / app', 60, null),
  ('servicekategorie', 'frage', 'Frage', 'Question', 70, null),
  ('servicestatus', 'neu', 'Neu', 'Nouveau', 10, 'info'),
  ('servicestatus', 'bearbeitung', 'In Bearbeitung', 'En cours', 20, 'marke'),
  ('servicestatus', 'termin', 'Termin geplant', 'RDV planifié', 30, 'info'),
  ('servicestatus', 'teile', 'Wartet auf Teile', 'Attente pièces', 40, 'warn'),
  ('servicestatus', 'kunde', 'Wartet auf Kunde', 'Attente client', 50, 'warn'),
  ('servicestatus', 'erledigt', 'Erledigt', 'Terminé', 60, 'ok'),
  ('prioritaet', 'hoch', 'Hoch', 'Haute', 10, 'kritisch'),
  ('prioritaet', 'normal', 'Normal', 'Normale', 20, 'neutral'),
  ('prioritaet', 'tief', 'Tief', 'Basse', 30, 'neutral'),
  ('komponente', 'pv', 'PV-Anlage', 'Installation PV', 10, null),
  ('komponente', 'wechselrichter', 'Wechselrichter', 'Onduleur', 20, null),
  ('komponente', 'batterie', 'Batterie', 'Batterie', 30, null),
  ('komponente', 'wallbox', 'Wallbox', 'Borne de recharge', 40, null),
  ('komponente', 'waermepumpe', 'Wärmepumpe', 'Pompe à chaleur', 50, null),
  ('komponente', 'notstrom', 'Notstrom', 'Courant de secours', 60, null),
  ('monitoring', 'solaredge', 'SolarEdge', 'SolarEdge', 10, null),
  ('monitoring', 'huawei', 'Huawei FusionSolar', 'Huawei FusionSolar', 20, null),
  ('monitoring', 'fronius', 'Fronius', 'Fronius', 30, null),
  ('monitoring', 'sma', 'SMA', 'SMA', 40, null),
  ('monitoring', 'enphase', 'Enphase', 'Enphase', 50, null),
  ('monitoring', 'goodwe', 'GoodWe', 'GoodWe', 60, null),
  ('monitoring', 'andere', 'Andere', 'Autre', 70, null),
  ('wartungsstatus', 'aktiv', 'Aktiv', 'Actif', 10, 'ok'),
  ('wartungsstatus', 'gekuendigt', 'Gekündigt', 'Résilié', 20, 'neutral'),
  ('wartungsstatus', 'beendet', 'Beendet', 'Terminé', 30, 'neutral')
on conflict (liste, schluessel) do nothing;

-- Leistungskatalog der Wartung als Daten (Regel 8), Vorlage V233 WA_LEIST; die ersten fünf sind vorgewählt.
insert into public.einstellungen (schluessel, wert) values ('wartung_leistungen', '[
  {"de": "Sichtkontrolle Module, Unterkonstruktion und Verkabelung", "fr": "Contrôle visuel des modules, de la sous-structure et du câblage", "standard": true},
  {"de": "Kontrolle Wechselrichter und Fehlerspeicher", "fr": "Contrôle de l’onduleur et de la mémoire d’erreurs", "standard": true},
  {"de": "Funktionsprüfung Batteriespeicher", "fr": "Test de fonctionnement de la batterie", "standard": true},
  {"de": "Kontrolle Überspannungsschutz und Sicherungen", "fr": "Contrôle de la protection contre les surtensions et des fusibles", "standard": true},
  {"de": "Prüfung Monitoring und Ertragsdaten", "fr": "Vérification du monitoring et des données de production", "standard": true},
  {"de": "Reinigung der Module (nach Bedarf)", "fr": "Nettoyage des modules (selon besoin)", "standard": false},
  {"de": "Kurzbericht mit Empfehlungen", "fr": "Bref rapport avec recommandations", "standard": false}
]') on conflict (schluessel) do nothing;

-- Laufende Nummern S001 … und W001 …, auch nach einem Import nie doppelt.
create sequence if not exists intern.service_nummer;
create sequence if not exists intern.wartung_nummer;
select setval('intern.service_nummer', greatest(1, coalesce((select max(nullif(regexp_replace(nummer, '\D', '', 'g'), '')::int) from public.service_faelle), 0)),
              exists (select 1 from public.service_faelle));

alter table public.wartungsvertraege
  add column if not exists nummer text unique,
  add column if not exists projekt_id uuid references public.projekte (id),
  add column if not exists start_am date,
  add column if not exists laufzeit_jahre int not null default 3,
  add column if not exists status text not null default 'aktiv',
  add column if not exists sprache text,
  add column if not exists notiz text;
alter table public.wartungsvertraege alter column rhythmus_monate set default 12;
comment on column public.wartungsvertraege.leistungen is 'Gewählte Leistungen [{de, fr}], beim Abschluss aus dem Katalog kopiert.';
comment on column public.wartungsvertraege.preis_rappen is 'Preis pro Jahr inkl. MWST in Rappen.';
select setval('intern.wartung_nummer', greatest(1, coalesce((select max(nullif(regexp_replace(nummer, '\D', '', 'g'), '')::int) from public.wartungsvertraege), 0)),
              exists (select 1 from public.wartungsvertraege where nummer is not null));

alter table public.anlagen add column if not exists notiz text;
comment on column public.anlagen.komponenten is 'Komponenten [{art, hersteller, modell, anzahl, seriennummer, garantie_bis}].';
comment on column public.anlagen.monitoring is 'Monitoring {hersteller, link, kennung}.';
create index if not exists anlagen_projekt_idx on public.anlagen (projekt_id) where geloescht_am is null;
create index if not exists service_faelle_kontakt_idx on public.service_faelle (kontakt_id) where geloescht_am is null;

/** Nummer und Erledigt-Datum eines Service-Falls; Erledigt-Datum kommt und geht mit dem Status. */
create or replace function intern.service_fall_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and coalesce(new.nummer, '') = '' then
    new.nummer := 'S' || lpad(nextval('intern.service_nummer')::text, 3, '0');
  end if;
  if new.status = 'erledigt' and (tg_op = 'INSERT' or old.status is distinct from 'erledigt') then
    new.erledigt_am := coalesce(new.erledigt_am, current_date);
  elsif new.status <> 'erledigt' then
    new.erledigt_am := null;
  end if;
  return new;
end
$$;
create trigger vorbereiten before insert or update on public.service_faelle
  for each row execute function intern.service_fall_vorbereiten();

/** Nummer eines Wartungsvertrags und die erste Wartung (Start + Rhythmus), wenn keine eingetragen ist. */
create or replace function intern.wartung_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.nummer, '') = '' then
    new.nummer := 'W' || lpad(nextval('intern.wartung_nummer')::text, 3, '0');
  end if;
  if new.naechste_wartung is null and new.start_am is not null and new.status = 'aktiv' then
    new.naechste_wartung := (new.start_am + make_interval(months => coalesce(new.rhythmus_monate, 12)))::date;
  end if;
  return new;
end
$$;
create trigger vorbereiten before insert or update on public.wartungsvertraege
  for each row execute function intern.wartung_vorbereiten();

/** Notiz an den Verlauf eines Service-Falls anhängen (mit Datum und Person), ohne andere Einträge zu überschreiben. */
create or replace function public.service_notiz(p_id uuid, p_text text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if nullif(trim(p_text), '') is null then raise exception using errcode = 'P0001', message = 'service.notiz_leer'; end if;
  update public.service_faelle
     set verlauf = verlauf || jsonb_build_array(jsonb_build_object('am', now(), 'person_id', intern.meine_person_id(),
                                                                  'text', trim(p_text)))
   where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'service.nicht_gefunden'; end if;
end
$$;

/** Wartung durchgeführt: letzte = Datum, nächste = Datum + Rhythmus, Eintrag im Verlauf. */
create or replace function public.wartung_erledigt(p_id uuid, p_am date default current_date, p_notiz text default null)
returns date
language plpgsql security invoker set search_path = '' as $$
declare
  v_naechste date;
begin
  update public.wartungsvertraege
     set letzte_wartung = p_am,
         naechste_wartung = (p_am + make_interval(months => coalesce(rhythmus_monate, 12)))::date,
         verlauf = verlauf || jsonb_build_array(jsonb_build_object('am', p_am, 'person_id', intern.meine_person_id(),
                                                                  'notiz', nullif(trim(p_notiz), '')))
   where id = p_id and geloescht_am is null and status = 'aktiv'
  returning naechste_wartung into v_naechste;
  if not found then raise exception using errcode = 'P0001', message = 'wartung.nicht_aktiv'; end if;
  return v_naechste;
end
$$;

revoke execute on function public.service_notiz(uuid, text) from public, anon;
revoke execute on function public.wartung_erledigt(uuid, date, text) from public, anon;
grant execute on function public.service_notiz(uuid, text) to authenticated;
grant execute on function public.wartung_erledigt(uuid, date, text) to authenticated;
