-- Phase 14, Teil 2: Kennzahlen (V233 Dashboard und Lead-Quellen; ERP-Punkte Auftragsbestand, Auslastung, Marge),
-- siehe Entscheid 0025. Die Datenbank liefert Einzelfakten statt fertiger Summen: Die App zählt sie nach Standort,
-- Person und Zeitraum und zeigt hinter jeder Zahl genau die Zeilen, aus denen sie entstanden ist.
-- Alles läuft mit den Rechten der lesenden Person (security invoker).

-- Einstellung: Kosten pro Lead je Quelle (V233 «Kosten / Lead», meta/kosten) und wer für die Auslastung zählt.
insert into public.einstellungen (schluessel, wert)
select 'kennzahlen', jsonb_build_object(
  'quellen_kosten_rappen', coalesce((
    select jsonb_object_agg(q.schluessel, round((k.value #>> '{}')::numeric * 100)::bigint)
      from public.einstellungen e, jsonb_each(e.wert -> 'src') k
      join public.auswahlwerte q on q.liste = 'quelle' and (q.eigenschaften -> 'vorlage') ? k.key
     where e.schluessel = 'vorlage.kosten' and jsonb_typeof(k.value) = 'number'), '{}'),
  'auslastung_rollen', '["montage"]'::jsonb,
  'tage_pro_woche', 5)
on conflict (schluessel) do nothing;

/**
 * Einzelfakten für die Kennzahlen im Zeitraum [von, bis]. Jede Zeile gehört zu genau einer Kennzahl
 * (`schluessel`); «aktuell»-Kennzahlen (offene Leads, offene Offerten, Baustellen, offene Zahlungen und Fälle)
 * gelten unabhängig vom Zeitraum. Standort und Person bestimmen die Spalten der Tabellen.
 * Beträge: Offerten exkl. MWST, Auftragswert = Vertragswert inkl. MWST (wie V233), Zahlungen wie im Zahlungsplan.
 */
create or replace function public.kennzahlen_fakten(p_von date, p_bis date)
returns table (schluessel text, art text, id uuid, datum date, standort text, person_id uuid,
               betrag_rappen bigint, quelle text, name text, nummer text, ort text, stand text)
language sql stable set search_path = '' as $$
  with
  heute as (select (now() at time zone 'Europe/Zurich')::date as d),
  lead as (
    -- Ohne Eingangsdatum zählt der Tag der Erfassung (sonst fiele der Lead aus jedem Zeitraum).
    select v.id, coalesce(v.eingang_am, (v.erstellt_am at time zone 'Europe/Zurich')::date) as eingang_am,
           (v.termin_am at time zone 'Europe/Zurich')::date as termin, v.wiedervorlage_am,
           s.kuerzel as standort, v.tour_person_id as person, coalesce(nullif(v.quelle, ''), 'ohne') as quelle,
           intern.kontaktname(k) as name, v.nummer, concat_ws(' ', o.plz, o.ort) as ort,
           intern.stand_verkaufschance(v) as stand, v.kontakt_id
      from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
      left join public.objekte o on o.id = v.objekt_id left join public.standorte s on s.id = v.standort_id
     where v.geloescht_am is null),
  off as (
    select o.id, o.angebot_am, o.entscheid_am, o.status, o.betrag_rappen, o.standort, o.verantwortlich_id as person,
           o.name, o.nummer, concat_ws(' ', o.plz, o.ort) as ort, o.stand, o.faellig_am, o.projekt_id,
           p.unterzeichnet_am, p.vertragswert_rappen
      from public.offerten_liste o left join public.projekte p on p.id = o.projekt_id and p.geloescht_am is null),
  proj as (
    select p.id, p.status, p.baubeginn, p.unterzeichnet_am, p.vertragswert_rappen, s.kuerzel as standort,
           p.verantwortlich_id as person, coalesce(intern.kontaktname(k), p.titel) as name, p.nummer,
           concat_ws(' ', ob.plz, ob.ort) as ort
      from public.projekte p left join public.kontakte k on k.id = p.kontakt_id
      left join public.objekte ob on ob.id = p.objekt_id left join public.standorte s on s.id = p.standort_id
     where p.geloescht_am is null),
  fall as (
    select f.id, f.status, f.garantie, (f.erstellt_am at time zone 'Europe/Zurich')::date as eroeffnet, f.erledigt_am,
           -- Importierte Fälle hängen nur am Kunden: dann zählt der Standort seines Gebäudes (PLZ-Regel).
           coalesce(s.kuerzel, (select public.standort_fuer_plz(o.plz) from public.objekte o
                                 where o.kontakt_id = f.kontakt_id and o.geloescht_am is null
                                 order by o.erstellt_am limit 1)) as standort,
           f.person_id as person, intern.kontaktname(k) as name, f.nummer, f.titel
      from public.service_faelle f join public.kontakte k on k.id = f.kontakt_id
      left join public.projekte p on p.id = f.projekt_id left join public.standorte s on s.id = p.standort_id
     where f.geloescht_am is null)
  -- Leads
  select 'leads_neu', 'lead', id, eingang_am, standort, person, null::bigint, quelle, name, nummer, ort, stand
    from lead where eingang_am between p_von and p_bis
  union all
  select 'leads_offen', 'lead', id, eingang_am, standort, person, null, quelle, name, nummer, ort, stand
    from lead where stand in ('lead_neu', 'lead_offen', 'lead_spaeter')
  union all
  select 'termine', 'lead', id, termin, standort, person, null, quelle, name, nummer, ort, stand
    from lead where termin between p_von and p_bis
  union all
  select 'kein_interesse', 'lead', id, eingang_am, standort, person, null, quelle, name, nummer, ort, stand
    from lead where stand = 'kein' and eingang_am between p_von and p_bis
  union all
  select 'wv_faellig', 'lead', id, wiedervorlage_am, standort, person, null, quelle, name, nummer, ort, stand
    from lead, heute where wiedervorlage_am <= heute.d and stand in ('lead_neu', 'lead_offen', 'lead_spaeter', 'nach_termin')
  -- Lead-Quellen: wie weit kamen die Leads des Zeitraums (V233 dashQuellen)?
  union all
  select 'quelle_termin', 'lead', l.id, l.eingang_am, l.standort, l.person, null, l.quelle, l.name, l.nummer, l.ort, l.stand
    from lead l where l.eingang_am between p_von and p_bis
     and (l.termin is not null or l.stand not in ('lead_neu', 'lead_offen', 'lead_spaeter', 'kein'))
  union all
  select 'quelle_offerte', 'lead', l.id, l.eingang_am, l.standort, l.person, null, l.quelle, l.name, l.nummer, l.ort, l.stand
    from lead l where l.eingang_am between p_von and p_bis
     and exists (select 1 from public.offerten o where o.verkaufschance_id = l.id and o.geloescht_am is null)
  union all
  select 'quelle_auftrag', 'lead', l.id, l.eingang_am, l.standort, l.person, a.wert, l.quelle, l.name, l.nummer, l.ort, l.stand
    from lead l
    join lateral (select sum(p.vertragswert_rappen)::bigint as wert from public.projekte p
                   where p.verkaufschance_id = l.id and p.geloescht_am is null) a on true
   where l.eingang_am between p_von and p_bis
     and exists (select 1 from public.projekte p where p.verkaufschance_id = l.id and p.geloescht_am is null)
  -- Offerten
  union all
  select 'gesendet', 'offerte', id, angebot_am, standort, person, betrag_rappen, null, name, nummer, ort, stand
    from off where angebot_am between p_von and p_bis
  union all
  select 'offen', 'offerte', id, angebot_am, standort, person, betrag_rappen, null, name, nummer, ort, stand
    from off where stand in ('offeriert', 'nachfassen', 'vertagt')
  union all
  select 'nf_faellig', 'offerte', id, faellig_am, standort, person, betrag_rappen, null, name, nummer, ort, stand
    from off, heute where stand = 'nachfassen' and faellig_am <= heute.d
  union all
  select 'angenommen', 'offerte', id, coalesce(unterzeichnet_am, entscheid_am, angebot_am), standort, person,
         coalesce(vertragswert_rappen, round(betrag_rappen * (1 + public.mwst_satz() / 100))::bigint), null, name, nummer, ort, stand
    from off where status = 'angenommen' and coalesce(unterzeichnet_am, entscheid_am, angebot_am) between p_von and p_bis
  union all
  select 'verloren', 'offerte', id, coalesce(entscheid_am, angebot_am), standort, person, betrag_rappen, null, name, nummer, ort, stand
    from off where status in ('verloren', 'archiviert') and coalesce(entscheid_am, angebot_am) between p_von and p_bis
  union all
  select 'bau', 'projekt', id, coalesce(baubeginn, unterzeichnet_am), standort, person, vertragswert_rappen, null, name, nummer, ort, status
    from proj where status = 'im_bau'
  -- Zahlungen aus dem Zahlungsplan
  union all
  select case when z.bezahlt_am is not null then 'zahlung_eingang'
              when z.faellig_am < (select d from heute) then 'zahlung_ueberfaellig' else 'zahlung_offen' end,
         'zahlung', p.id, coalesce(z.bezahlt_am, z.faellig_am), p.standort, p.person, z.betrag_rappen, null, p.name,
         p.nummer, z.bezeichnung, p.status
    from public.zahlungsplan z join proj p on p.id = z.projekt_id
   where z.geloescht_am is null and (z.bezahlt_am is null or z.bezahlt_am between p_von and p_bis)
  -- Service & Garantie
  union all
  select 'faelle_offen', 'fall', id, eroeffnet, standort, person, null, null, name, nummer, titel, status
    from fall where status <> 'erledigt'
  union all
  select 'faelle_neu', 'fall', id, eroeffnet, standort, person, null, null, name, nummer, titel, status
    from fall where eroeffnet between p_von and p_bis
  union all
  select 'faelle_garantie', 'fall', id, eroeffnet, standort, person, null, null, name, nummer, titel, status
    from fall where garantie and eroeffnet between p_von and p_bis
  union all
  select 'faelle_erledigt', 'fall', id, erledigt_am, standort, person, null, null, name, nummer, titel, status
    from fall where status = 'erledigt' and erledigt_am between p_von and p_bis
$$;
revoke execute on function public.kennzahlen_fakten(date, date) from public, anon;
grant execute on function public.kennzahlen_fakten(date, date) to authenticated;

/** Kosten pro Lead einer Quelle setzen (V233: jede Person darf; leer = keine Kosten). */
create or replace function public.kennzahlen_quellen_kosten(p_quelle text, p_rappen bigint) returns void
language plpgsql set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'kennzahlen.kein_recht';
  end if;
  if p_rappen is not null and (p_rappen < 0 or p_rappen > 10000000) then
    raise exception using errcode = 'P0001', message = 'kennzahlen.kosten_ungueltig';
  end if;
  update public.einstellungen
     set wert = jsonb_set(wert, '{quellen_kosten_rappen}',
                          case when p_rappen is null then coalesce(wert -> 'quellen_kosten_rappen', '{}') - p_quelle
                               else coalesce(wert -> 'quellen_kosten_rappen', '{}') || jsonb_build_object(p_quelle, p_rappen) end)
   where schluessel = 'kennzahlen';
end
$$;
revoke execute on function public.kennzahlen_quellen_kosten(text, bigint) from public, anon;
grant execute on function public.kennzahlen_quellen_kosten(text, bigint) to authenticated;

/** Werktage (Mo–Fr) zwischen zwei Daten, beide eingeschlossen. */
create or replace function intern.werktage(p_von date, p_bis date) returns int
language sql immutable set search_path = '' as $$
  select count(*)::int from generate_series(p_von, p_bis, interval '1 day') d where extract(isodow from d) < 6
$$;

/**
 * Kennzahlen für die Abwicklung (ERP-Lückenanalyse, Entscheid 0009):
 * - Auftragsbestand: unterschriebene Aufträge, die noch nicht fertig verrechnet sind (Vertragswert minus
 *   verrechnete Tranchen des Zahlungsplans), je Projekt.
 * - Auslastung: die nächsten 8 Wochen, je Woche und Person gebuchte Werktage (Einsätze) gegen verfügbare
 *   (Werktage minus Abwesenheiten). Es zählen die Rollen aus `einstellungen.kennzahlen.auslastung_rollen` und
 *   alle, die in der Zeit einen Einsatz haben. Einsätze ohne Personen (geplant, Subunternehmer) zählen separat.
 * - Marge je Projekt aus der Nachkalkulation, nur mit Recht `preise` oder `finanzen`: Projekte, die im
 *   Zeitraum unterschrieben wurden.
 */
create or replace function public.kennzahlen_betrieb(p_von date, p_bis date) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  heute date := (now() at time zone 'Europe/Zurich')::date;
  montag date := heute - (extract(isodow from heute)::int - 1);
  cfg jsonb := (select wert from public.einstellungen where schluessel = 'kennzahlen');
  r jsonb;
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'kennzahlen.kein_recht';
  end if;

  r := jsonb_build_object('auftragsbestand', coalesce((
    select jsonb_agg(x order by x ->> 'unterzeichnet_am' nulls last) from (
      select jsonb_build_object('id', p.id, 'nummer', p.nummer, 'name', coalesce(intern.kontaktname(k), p.titel),
                                'standort', s.kuerzel, 'status', p.status, 'person_id', p.verantwortlich_id,
                                'unterzeichnet_am', p.unterzeichnet_am, 'baubeginn', p.baubeginn,
                                'vertrag_rappen', coalesce(p.vertragswert_rappen, 0),
                                'verrechnet_rappen', coalesce(z.verrechnet, 0),
                                'bezahlt_rappen', coalesce(z.bezahlt, 0),
                                'rest_rappen', greatest(coalesce(p.vertragswert_rappen, 0) - coalesce(z.verrechnet, 0), 0)) as x
        from public.projekte p left join public.kontakte k on k.id = p.kontakt_id
        left join public.standorte s on s.id = p.standort_id
        left join lateral (select sum(betrag_rappen) filter (where rechnung_am is not null or bezahlt_am is not null) as verrechnet,
                                  sum(betrag_rappen) filter (where bezahlt_am is not null) as bezahlt
                             from public.zahlungsplan where projekt_id = p.id and geloescht_am is null) z on true
       where p.geloescht_am is null and p.status in ('auftrag', 'im_bau')) t), '[]'));

  r := r || jsonb_build_object('auslastung', (
    with wochen as (
      select w::date as von, (w + interval '4 days')::date as bis from generate_series(montag, montag + 7 * 7, interval '7 days') w),
    leute as (
      select p.id, p.name, p.kuerzel from public.personen p
       where p.aktiv and p.geloescht_am is null
         and (p.rolle in (select jsonb_array_elements_text(coalesce(cfg -> 'auslastung_rollen', '["montage"]')))
              or exists (select 1 from public.einsaetze e where e.geloescht_am is null and p.id = any (e.personen)
                          and e.von <= montag + 53 and coalesce(e.bis, e.von) >= montag))),
    zellen as (
      select w.von as woche, l.id as person,
             coalesce((select sum(intern.werktage(greatest(e.von, w.von), least(coalesce(e.bis, e.von), w.bis)))
                         from public.einsaetze e
                        where e.geloescht_am is null and l.id = any (e.personen)
                          and e.von <= w.bis and coalesce(e.bis, e.von) >= w.von), 0) as gebucht,
             coalesce((select sum(intern.werktage(greatest(a.von, w.von), least(a.bis, w.bis))
                                  * case when a.halbtag then 0.5 else 1 end)
                         from public.abwesenheiten_alle a
                        where a.person_id = l.id and a.von <= w.bis and a.bis >= w.von), 0) as abwesend
        from wochen w cross join leute l)
    select jsonb_build_object(
      'personen', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'kuerzel', l.kuerzel) order by l.name)
                              from leute l), '[]'),
      'wochen', coalesce((select jsonb_agg(jsonb_build_object(
                  'von', w.von, 'bis', w.bis, 'kw', extract(week from w.von)::int,
                  'zellen', coalesce((select jsonb_agg(jsonb_build_object('person', z.person, 'gebucht', z.gebucht,
                                                                          'abwesend', z.abwesend,
                                                                          'verfuegbar', greatest(5 - z.abwesend, 0)))
                                        from zellen z where z.woche = w.von), '[]'),
                  'ohne_personen', coalesce((select sum(intern.werktage(greatest(e.von, w.von), least(coalesce(e.bis, e.von), w.bis)))
                                               from public.einsaetze e
                                              where e.geloescht_am is null and cardinality(coalesce(e.personen, '{}')) = 0
                                                and e.von <= w.bis and coalesce(e.bis, e.von) >= w.von), 0))
                  order by w.von) from wochen w), '[]'))));

  if intern.hat_recht('preise') or intern.hat_recht('finanzen') then
    r := r || jsonb_build_object('marge', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nummer', p.nummer, 'name', coalesce(intern.kontaktname(k), p.titel),
                                          'standort', s.kuerzel, 'status', p.status, 'unterzeichnet_am', p.unterzeichnet_am,
                                          'nachkalkulation', public.nachkalkulation(p.id))
                       order by p.unterzeichnet_am desc)
        from public.projekte p left join public.kontakte k on k.id = p.kontakt_id
        left join public.standorte s on s.id = p.standort_id
       where p.geloescht_am is null and p.unterzeichnet_am between p_von and p_bis), '[]'));
  end if;
  return r;
end
$$;
revoke execute on function public.kennzahlen_betrieb(date, date) from public, anon;
grant execute on function public.kennzahlen_betrieb(date, date) to authenticated;
