-- Projekte Schritt 2 (3.11.2026, Entscheid 0047, Antworten von Chris): Mängel und Restarbeiten als eigene Liste je
-- Projekt, Beteiligte (Elektriker, Gerüstbau, Netzbetreiber …) als Kontakte mit Rolle. Die Kundeninfo bei
-- Meilensteinen läuft über die bestehende Automation «meilenstein_kunde» (Ausgangskorb, mit Freigabe); die Akte zeigt
-- dazu, was für das Projekt im Ausgangskorb liegt oder gesendet wurde.

-- Mängel und Restarbeiten: was nach der Montage noch offen ist. Ein Projekt gilt erst als übergeben, wenn alles erledigt ist.
create table public.projekt_maengel (
  id                uuid primary key default gen_random_uuid(),
  projekt_id        uuid not null references public.projekte (id),
  art               text not null default 'mangel' check (art in ('mangel', 'restarbeit')),
  text              text not null,
  ort               text,                                 -- wo an der Anlage: «Dach Süd», «Technikraum» …
  verantwortlich_id uuid references public.personen (id),
  subunternehmer_id uuid references public.subunternehmer (id),
  frist             date,
  status            text not null default 'offen' check (status in ('offen', 'erledigt')),
  erledigt_am       timestamptz,
  erledigt_von      uuid references public.personen (id),
  erledigt_notiz    text
);
select intern.richte_fachtabelle_ein('projekt_maengel');
create index projekt_maengel_projekt_idx on public.projekt_maengel (projekt_id) where geloescht_am is null;
comment on table public.projekt_maengel is 'Mängel und Restarbeiten je Projekt. Ändern nur über projekt_mangel_speichern / projekt_mangel_erledigen.';

-- Beteiligte: wer ausser dem Kunden am Projekt mitwirkt, als Kontakt mit Rolle (Rollen als Auswahlliste).
create table public.projekt_beteiligte (
  id          uuid primary key default gen_random_uuid(),
  projekt_id  uuid not null references public.projekte (id),
  kontakt_id  uuid not null references public.kontakte (id),
  rolle       text not null,
  notiz       text
);
select intern.richte_fachtabelle_ein('projekt_beteiligte');
create unique index projekt_beteiligte_einmal_idx
  on public.projekt_beteiligte (projekt_id, kontakt_id, rolle) where geloescht_am is null;
create index projekt_beteiligte_kontakt_idx on public.projekt_beteiligte (kontakt_id) where geloescht_am is null;
comment on table public.projekt_beteiligte is 'Beteiligte am Projekt (Kontakt + Rolle aus Auswahlliste «projekt_rolle»).';

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge) values
  ('projekt_rolle', 'elektriker', 'Elektriker', 'Électricien', 10),
  ('projekt_rolle', 'geruestbau', 'Gerüstbau', 'Échafaudage', 20),
  ('projekt_rolle', 'netzbetreiber', 'Netzbetreiber', 'Gestionnaire de réseau', 30),
  ('projekt_rolle', 'architekt', 'Architekt / Planer', 'Architecte / planificateur', 40),
  ('projekt_rolle', 'dachdecker', 'Dachdecker / Spengler', 'Couvreur / ferblantier', 50),
  ('projekt_rolle', 'verwaltung', 'Liegenschaftsverwaltung', 'Gérance', 60),
  ('projekt_rolle', 'bauleitung', 'Bauleitung', 'Direction des travaux', 70),
  ('projekt_rolle', 'andere', 'Andere', 'Autre', 90)
on conflict (liste, schluessel) do nothing;

/**
 * Mangel oder Restarbeit anlegen oder ändern. Wiederholbar mit der ID aus der App (auch vom Handy über die
 * Warteschlange): gibt es die ID schon, wird geändert, sonst angelegt.
 */
create or replace function public.projekt_mangel_speichern(p_id uuid, p_projekt uuid, p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_text text := nullif(trim(p ->> 'text'), '');
  v_art text := coalesce(nullif(p ->> 'art', ''), 'mangel');
begin
  if v_text is null then raise exception using errcode = 'P0001', message = 'projekte.text_fehlt'; end if;
  if v_art not in ('mangel', 'restarbeit') then raise exception using errcode = 'P0001', message = 'projekte.art_unbekannt'; end if;
  if not exists (select 1 from public.projekte where id = p_projekt and geloescht_am is null) then
    raise exception using errcode = 'P0002', message = 'stand.unbekannt';
  end if;
  insert into public.projekt_maengel (id, projekt_id, art, text, ort, verantwortlich_id, subunternehmer_id, frist)
  values (coalesce(p_id, gen_random_uuid()), p_projekt, v_art, v_text, nullif(trim(p ->> 'ort'), ''),
          (nullif(p ->> 'verantwortlich_id', ''))::uuid, (nullif(p ->> 'subunternehmer_id', ''))::uuid,
          (nullif(p ->> 'frist', ''))::date)
  on conflict (id) do update
     set art = excluded.art, text = excluded.text, ort = excluded.ort, verantwortlich_id = excluded.verantwortlich_id,
         subunternehmer_id = excluded.subunternehmer_id, frist = excluded.frist
   where public.projekt_maengel.projekt_id = excluded.projekt_id
  returning id into p_id;
  return p_id;
end
$$;

/** Mangel als erledigt markieren (mit kurzer Notiz) oder wieder öffnen. Wiederholbar. */
create or replace function public.projekt_mangel_erledigen(p_id uuid, p_erledigt boolean, p_notiz text default null)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.projekt_maengel
     set status = case when p_erledigt then 'erledigt' else 'offen' end,
         erledigt_am = case when p_erledigt then coalesce(erledigt_am, now()) end,
         erledigt_von = case when p_erledigt then coalesce(erledigt_von, intern.meine_person_id()) end,
         erledigt_notiz = case when p_erledigt then coalesce(nullif(trim(p_notiz), ''), erledigt_notiz) end
   where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
end
$$;

/** Beteiligten mit Rolle zum Projekt hinzufügen; gibt es ihn mit dieser Rolle schon, wird nur die Notiz ergänzt. */
create or replace function public.projekt_beteiligt_setzen(p_projekt uuid, p_kontakt uuid, p_rolle text, p_notiz text default null)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.auswahlwerte where liste = 'projekt_rolle' and schluessel = p_rolle and aktiv) then
    raise exception using errcode = 'P0001', message = 'projekte.rolle_unbekannt';
  end if;
  select id into v_id from public.projekt_beteiligte
   where projekt_id = p_projekt and kontakt_id = p_kontakt and rolle = p_rolle and geloescht_am is null;
  if v_id is not null then
    update public.projekt_beteiligte set notiz = coalesce(nullif(trim(p_notiz), ''), notiz) where id = v_id;
    return v_id;
  end if;
  insert into public.projekt_beteiligte (projekt_id, kontakt_id, rolle, notiz)
  values (p_projekt, p_kontakt, p_rolle, nullif(trim(p_notiz), ''))
  returning id into v_id;
  return v_id;
end
$$;

/** Beteiligten entfernen: in den Papierkorb, nie hart löschen (Regel 5). */
create or replace function public.projekt_beteiligt_entfernen(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.projekt_beteiligte set geloescht_am = now() where id = p_id and geloescht_am is null;
end
$$;

-- Übergabe erst ohne offene Mängel: der Schritt «uebergabe» (Monitoring & Dokumentation übergeben) lässt sich nicht
-- auf erledigt setzen, solange ein Mangel offen ist. Automatische Abläufe (IBN-Rapport) bleiben unberührt.
create or replace function intern.projekt_uebergabe_pruefen() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.schluessel = 'uebergabe' and new.stand = 'erledigt'
     and (tg_op = 'INSERT' or old.stand is distinct from 'erledigt')
     and exists (select 1 from public.projekt_maengel m
                  where m.projekt_id = new.projekt_id and m.status = 'offen' and m.geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'projekte.maengel_offen';
  end if;
  return new;
end
$$;

create trigger uebergabe_ohne_maengel before insert or update of stand on public.projekt_schritte
  for each row execute function intern.projekt_uebergabe_pruefen();

-- Signale: offene Mängel zählen (für Karte, Kennzahl und «Meine Woche»). Neue Spalte am Ende.
create or replace view public.projekt_signale with (security_invoker = true) as
select p.id as projekt_id,
       p.verantwortlich_id,
       (select count(*) from public.projekt_material_stand m where m.projekt_id = p.id and m.fehlt > 0)::int as material_fehlt,
       (select count(*) from public.projekt_material_stand m where m.projekt_id = p.id)::int as material_positionen,
       (select max(b.liefertermin) from public.bestellungen b
         where b.projekt_id = p.id and b.geloescht_am is null
           and b.status in ('freigegeben', 'bestellt', 'teilgeliefert')) as letzte_lieferung,
       (select min(e.von) from public.einsaetze e
         where e.projekt_id = p.id and e.geloescht_am is null and e.bis >= (now() at time zone 'Europe/Zurich')::date) as naechster_einsatz,
       (select max(a.zeitpunkt) from public.aktivitaeten a where a.projekt_id = p.id and a.geloescht_am is null) as letzte_aktivitaet,
       coalesce((select sum(z.betrag_rappen) from public.offene_tranchen z
                  where z.projekt_id = p.id and z.faellig_am <= (now() at time zone 'Europe/Zurich')::date), 0)::bigint as tranchen_faellig_rappen,
       coalesce((select sum(r.total_rappen - r.bezahlt_rappen) from public.rechnungen r
                  where r.projekt_id = p.id and r.geloescht_am is null and r.status in ('gestellt', 'teilbezahlt')), 0)::bigint as offen_rappen,
       (select min(r.faellig_am) from public.rechnungen r
         where r.projekt_id = p.id and r.geloescht_am is null and r.status in ('gestellt', 'teilbezahlt')) as offen_faellig_am,
       (select count(*) from public.nachtraege n where n.projekt_id = p.id and n.geloescht_am is null and n.status = 'offen')::int as nachtraege_offen,
       (select count(*) from public.projekt_maengel m where m.projekt_id = p.id and m.geloescht_am is null and m.status = 'offen')::int as maengel_offen
  from public.projekte p
 where p.geloescht_am is null
   and (p.status in ('auftrag', 'im_bau')
        or exists (select 1 from public.projekt_maengel m where m.projekt_id = p.id and m.geloescht_am is null and m.status = 'offen'));

create or replace function public.projekt_akte(p_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'verkauf', (select pe.name from public.verkaufschancen v join public.personen pe on pe.id = v.tour_person_id
                 where v.id = p.verkaufschance_id),
    'einsaetze', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'art', e.art, 'von', e.von, 'bis', e.bis, 'notiz', e.notiz,
                                  'personen', (select coalesce(jsonb_agg(coalesce(pe.kurzzeichen, pe.kuerzel) order by pe.kurzzeichen), '[]') from public.personen pe where pe.id = any (e.personen)),
                                  'subunternehmer', (select s.name from public.subunternehmer s where s.id = e.subunternehmer_id))
                                  order by e.von)
                             from public.einsaetze e where e.projekt_id = p.id and e.geloescht_am is null), '[]'),
    'material', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'bezeichnung', m.bezeichnung, 'menge', m.menge, 'einheit', m.einheit,
                                  'vorhanden', m.vorhanden, 'unterwegs', m.unterwegs, 'fehlt', m.fehlt) order by m.reihenfolge, m.bezeichnung)
                            from public.projekt_material_stand m where m.projekt_id = p.id), '[]'),
    'bestellungen', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'nummer', b.nummer, 'status', b.status, 'liefertermin', b.liefertermin,
                                  'lieferant', (select l.name from public.lieferanten l where l.id = b.lieferant_id)) order by b.erstellt_am)
                                from public.bestellungen b where b.projekt_id = p.id and b.geloescht_am is null and b.status <> 'storniert'), '[]'),
    'tranchen', coalesce((select jsonb_agg(jsonb_build_object('id', z.id, 'bezeichnung', z.bezeichnung, 'betrag_rappen', z.betrag_rappen,
                                  'faellig_am', z.faellig_am, 'bezahlt_am', z.bezahlt_am,
                                  'rechnung', (select jsonb_build_object('id', r.id, 'nummer', r.nummer, 'status', r.status)
                                                 from public.rechnungen r where r.zahlungsplan_id = z.id and r.geloescht_am is null and r.status <> 'storniert'
                                                order by r.erstellt_am desc limit 1),
                                  'rechnung_nr', z.rechnung_nr) order by z.faellig_am nulls last, z.erstellt_am)
                            from public.zahlungsplan z where z.projekt_id = p.id and z.geloescht_am is null), '[]'),
    'rechnungen', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'status', r.status, 'titel', r.titel, 'datum', r.datum,
                                  'faellig_am', r.faellig_am, 'total_rappen', r.total_rappen, 'bezahlt_rappen', r.bezahlt_rappen) order by r.erstellt_am)
                              from public.rechnungen r where r.projekt_id = p.id and r.geloescht_am is null and r.status <> 'storniert'), '[]'),
    'nachtraege', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'nummer', n.nummer, 'beschreibung', n.beschreibung,
                                  'betrag_rappen', n.betrag_rappen, 'status', n.status) order by n.erstellt_am)
                              from public.nachtraege n where n.projekt_id = p.id and n.geloescht_am is null), '[]'),
    'rapporte', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'datum', r.datum, 'art', r.art, 'arbeiten', r.arbeiten,
                                  'abgeschlossen_am', r.abgeschlossen_am,
                                  'person', (select pe.name from public.personen pe where pe.id = r.person_id),
                                  'stunden', (select round(sum(extract(epoch from (coalesce(z.stopp, now()) - z.start)) / 3600 - z.pause_min / 60.0)::numeric, 1)
                                                from public.zeiten z where z.rapport_id = r.id and z.geloescht_am is null)) order by r.datum desc)
                            from public.rapporte r where r.projekt_id = p.id and r.geloescht_am is null), '[]'),
    'stunden', (select round(coalesce(sum(extract(epoch from (coalesce(z.stopp, now()) - z.start)) / 3600 - z.pause_min / 60.0), 0)::numeric, 1)
                  from public.zeiten z where z.projekt_id = p.id and z.geloescht_am is null),
    'maengel', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'art', m.art, 'text', m.text, 'ort', m.ort,
                                  'frist', m.frist, 'status', m.status, 'erledigt_am', m.erledigt_am, 'erledigt_notiz', m.erledigt_notiz,
                                  'verantwortlich_id', m.verantwortlich_id,
                                  'verantwortlich', (select coalesce(pe.kurzzeichen, pe.name) from public.personen pe where pe.id = m.verantwortlich_id),
                                  'subunternehmer_id', m.subunternehmer_id,
                                  'subunternehmer', (select s.name from public.subunternehmer s where s.id = m.subunternehmer_id))
                                  order by (m.status = 'erledigt'), m.frist nulls last, m.erstellt_am)
                           from public.projekt_maengel m where m.projekt_id = p.id and m.geloescht_am is null), '[]'),
    'beteiligte', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'rolle', b.rolle, 'notiz', b.notiz, 'kontakt_id', b.kontakt_id,
                                  'name', coalesce(nullif(k.firma, ''), nullif(trim(concat_ws(' ', k.vorname, k.nachname)), '')),
                                  'telefon', k.telefon, 'email', k.email)
                                  order by b.rolle, b.erstellt_am)
                              from public.projekt_beteiligte b join public.kontakte k on k.id = b.kontakt_id
                             where b.projekt_id = p.id and b.geloescht_am is null), '[]'),
    'ausgang', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'art', a.art, 'kanal', a.kanal, 'betreff', a.betreff, 'status', a.status,
                                  'erstellt_am', a.erstellt_am, 'gesendet_am', a.gesendet_am) order by a.erstellt_am desc)
                           from public.ausgangskorb a where a.projekt_id = p.id and a.geloescht_am is null and a.status <> 'verworfen'), '[]'),
    'verlauf', coalesce((select jsonb_agg(x.j order by x.zeit desc) from (
                  select a.zeitpunkt as zeit,
                         jsonb_build_object('quelle', 'aktivitaet', 'id', a.id, 'art', a.art, 'richtung', a.richtung, 'zeit', a.zeitpunkt,
                                            'text', a.text, 'ergebnis', a.ergebnis,
                                            'person', (select pe.name from public.personen pe where pe.id = a.person_id)) as j
                    from public.aktivitaeten a where a.projekt_id = p.id and a.geloescht_am is null
                  union all
                  select m.eingang_am,
                         jsonb_build_object('quelle', 'mail', 'id', m.id, 'art', 'mail', 'richtung', 'ein', 'zeit', m.eingang_am,
                                            'text', coalesce(m.zusammenfassung, m.betreff), 'betreff', m.betreff, 'person', m.von_name)
                    from public.posteingang m where m.projekt_id = p.id and m.geloescht_am is null
                  order by 1 desc limit 60) x), '[]')
  )
  from public.projekte p where p.id = p_id and p.geloescht_am is null
$$;

grant execute on function public.projekt_mangel_speichern(uuid, uuid, jsonb) to authenticated;
grant execute on function public.projekt_mangel_erledigen(uuid, boolean, text) to authenticated;
grant execute on function public.projekt_beteiligt_setzen(uuid, uuid, text, text) to authenticated;
grant execute on function public.projekt_beteiligt_entfernen(uuid) to authenticated;
