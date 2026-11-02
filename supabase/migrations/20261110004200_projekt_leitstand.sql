-- Projekte neu (2.11.2026, Entscheid 0039): Leitstand und Projekt-Akte als ganze Seite.
-- Keine neuen Tabellen: alles, was ein Projekt betrifft, liegt schon in anderen Bereichen (Material, Einsätze,
-- Zahlungsplan, Rechnungen, Nachträge, Rapporte, Mails, Verlauf). Die Akte holt es in einer Abfrage, der Leitstand
-- bekommt je Projekt die Signale, die zeigen, worauf es wartet.

/** Signale je laufendem Projekt für Karten, Kennzahlen und «Meine Woche». */
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
       (select count(*) from public.nachtraege n where n.projekt_id = p.id and n.geloescht_am is null and n.status = 'offen')::int as nachtraege_offen
  from public.projekte p
 where p.geloescht_am is null and p.status in ('auftrag', 'im_bau');

grant select on public.projekt_signale to authenticated;

/**
 * Alles zu einem Projekt für die Akte in einer Abfrage: Einsätze mit Personen, Material je Position, Bestellungen,
 * Zahlungsplan mit Rechnung, Rechnungen, Nachträge, Rapporte mit Stunden, Subunternehmer, Verlauf und Mails.
 * Läuft mit den Rechten der Person (RLS): wer Rechnungen nicht sehen darf, bekommt sie nicht.
 */
create or replace function public.projekt_akte(p_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'verkauf', (select pe.name from public.verkaufschancen v join public.personen pe on pe.id = v.tour_person_id
                 where v.id = p.verkaufschance_id),
    'einsaetze', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'art', e.art, 'von', e.von, 'bis', e.bis, 'notiz', e.notiz,
                                  'personen', (select coalesce(jsonb_agg(pe.kuerzel order by pe.kuerzel), '[]') from public.personen pe where pe.id = any (e.personen)),
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

grant execute on function public.projekt_akte(uuid) to authenticated;

/** Notiz, Anruf oder Mail-Vermerk im Verlauf eines Projekts (beim Kunden des Projekts mit abgelegt). */
create or replace function public.projekt_vermerken(p_projekt uuid, p_art text, p_text text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_kontakt uuid;
begin
  if nullif(trim(p_text), '') is null then raise exception using errcode = 'P0001', message = 'projekte.text_fehlt'; end if;
  if p_art not in ('notiz', 'anruf', 'mail', 'besuch', 'sms') then raise exception using errcode = 'P0001', message = 'projekte.art_unbekannt'; end if;
  select kontakt_id into v_kontakt from public.projekte where id = p_projekt and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  insert into public.aktivitaeten (art, text, person_id, kontakt_id, projekt_id)
  values (p_art, trim(p_text), intern.meine_person_id(), v_kontakt, p_projekt)
  returning id into v_id;
  return v_id;
end
$$;

grant execute on function public.projekt_vermerken(uuid, text, text) to authenticated;
