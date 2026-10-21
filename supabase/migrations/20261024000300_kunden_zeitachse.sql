-- Phase 5, Teil 3: die Zeitachse der Kundenakte und der Datenexport pro Person (revDSG).

/**
 * Alles, was mit einem Kontakt geschehen ist, chronologisch: Kontakte (Anruf, Mail, Notiz …),
 * Anfrage, Termin, Offerten, Entscheide, Werkvertrag, Baubeginn, Service, Dokumente und Änderungen.
 * `art` ist ein Schlüssel, den die Oberfläche übersetzt; `daten` trägt die Einzelheiten.
 */
create or replace function public.kunden_zeitachse(p_kontakt uuid)
returns table (zeitpunkt timestamptz, art text, text text, daten jsonb, bezug_tabelle text, bezug_id uuid, wer text)
language sql stable security invoker set search_path = '' as $$
  with geschaefte as (
    select 'verkaufschancen'::text as tabelle, v.id from public.verkaufschancen v where v.kontakt_id = p_kontakt and v.geloescht_am is null
    union all select 'offerten', o.id from public.offerten o where o.kontakt_id = p_kontakt and o.geloescht_am is null
    union all select 'projekte', p.id from public.projekte p where p.kontakt_id = p_kontakt and p.geloescht_am is null
    union all select 'werkvertraege', w.id from public.werkvertraege w where w.kontakt_id = p_kontakt and w.geloescht_am is null
    union all select 'kontakte', p_kontakt
  )
  select * from (
    select a.zeitpunkt, 'aktivitaet:' || a.art, coalesce(a.text, ''),
           jsonb_build_object('richtung', a.richtung, 'ergebnis', a.ergebnis, 'aenderungen', a.details -> 'aenderungen'),
           'aktivitaeten', a.id, coalesce(pe.name, a.details ->> 'erfasst_von')
      from public.aktivitaeten a
      left join public.personen pe on pe.id = a.person_id
     where a.kontakt_id = p_kontakt and a.geloescht_am is null
    union all
    select v.eingang_am::timestamptz + interval '12 hours', 'anfrage', coalesce(v.kommentar_kunde, ''),
           jsonb_build_object('nummer', v.nummer, 'quelle', v.quelle), 'verkaufschancen', v.id, v.zustaendig
      from public.verkaufschancen v
     where v.kontakt_id = p_kontakt and v.geloescht_am is null and v.eingang_am is not null
    union all
    select v.termin_am, 'termin', '', jsonb_build_object('nummer', v.nummer, 'dauer', v.termin_dauer_min),
           'verkaufschancen', v.id, v.zustaendig
      from public.verkaufschancen v
     where v.kontakt_id = p_kontakt and v.geloescht_am is null and v.termin_am is not null
    union all
    -- Offerten ohne Angebotsdatum sind noch in Arbeit; sie stehen dann beim Erstelldatum.
    select coalesce(o.angebot_am::timestamptz + interval '12 hours', o.erstellt_am), 'offerte', coalesce(o.titel, ''),
           jsonb_build_object('nummer', o.nummer, 'betrag_rappen', o.betrag_rappen, 'kwp', o.leistung_kwp),
           'offerten', o.id, null
      from public.offerten o
     where o.kontakt_id = p_kontakt and o.geloescht_am is null
    union all
    select o.entscheid_am::timestamptz + interval '12 hours', 'entscheid', coalesce(o.vertagt_grund, ''),
           jsonb_build_object('nummer', o.nummer, 'entscheid', o.entscheid), 'offerten', o.id, o.entscheid_von
      from public.offerten o
     where o.kontakt_id = p_kontakt and o.geloescht_am is null and o.entscheid_am is not null
    union all
    select w.unterschrieben_am::timestamptz + interval '12 hours', 'werkvertrag', coalesce(w.notiz, ''),
           jsonb_build_object('nummer', w.nummer, 'betrag_rappen', w.betrag_rappen), 'werkvertraege', w.id, null
      from public.werkvertraege w
     where w.kontakt_id = p_kontakt and w.geloescht_am is null and w.unterschrieben_am is not null
    union all
    select p.baubeginn::timestamptz + interval '7 hours', 'baubeginn', coalesce(p.titel, ''),
           jsonb_build_object('nummer', p.nummer), 'projekte', p.id, null
      from public.projekte p
     where p.kontakt_id = p_kontakt and p.geloescht_am is null and p.baubeginn is not null
    union all
    select s.erstellt_am, 'service', coalesce(s.titel, ''),
           jsonb_build_object('nummer', s.nummer, 'status', s.status), 'service_faelle', s.id, null
      from public.service_faelle s
     where s.kontakt_id = p_kontakt and s.geloescht_am is null
    union all
    select coalesce(d.hochgeladen_am, d.erstellt_am), 'dokument', d.name,
           jsonb_build_object('ordner', d.ordner, 'mime', d.mime_typ), 'dokumente', d.id, d.hochgeladen_von
      from public.dokumente d
      join geschaefte g on g.tabelle = d.bezug_tabelle and g.id = d.bezug_id
     where d.geloescht_am is null
    union all
    -- Änderungen an den Stammdaten: welche Felder sich geändert haben, ohne technische Felder.
    select l.zeitpunkt, 'aenderung:' || l.aktion, '',
           jsonb_build_object('tabelle', l.tabelle, 'felder', (
             select jsonb_agg(n.key order by n.key) from jsonb_each(coalesce(l.nachher, '{}')) n
              where n.value is distinct from (l.vorher -> n.key)
                and n.key not in ('geaendert_am', 'erstellt_am', 'erstellt_von', 'alt_daten', 'id'))),
           l.tabelle, l.datensatz, pe.name
      from public.aenderungsprotokoll l
      left join public.personen pe on pe.auth_user_id = l.benutzer
     where l.aktion <> 'erstellt'
       and ((l.tabelle = 'kontakte' and l.datensatz = p_kontakt)
         or (l.tabelle = 'objekte' and l.datensatz in (select x.id from public.objekte x where x.kontakt_id = p_kontakt)))
  ) z (zeitpunkt, art, text, daten, bezug_tabelle, bezug_id, wer)
  where z.zeitpunkt is not null
  order by z.zeitpunkt desc
  limit 500
$$;
revoke execute on function public.kunden_zeitachse(uuid) from public, anon;
grant execute on function public.kunden_zeitachse(uuid) to authenticated;

/**
 * Alle Daten zu einer Person als JSON (Auskunftsrecht nach revDSG). Enthält nur, was die
 * aufrufende Person auch sonst sehen darf. Dateien sind als Verweis dabei, nicht als Inhalt.
 */
create or replace function public.kontakt_export(p_kontakt uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'erstellt', now(),
    'kontakt', (select to_jsonb(k) - 'alt_daten' from public.kontakte k where k.id = p_kontakt),
    'objekte', (select coalesce(jsonb_agg(to_jsonb(x) - 'alt_daten'), '[]') from public.objekte x where x.kontakt_id = p_kontakt),
    'verkaufschancen', (select coalesce(jsonb_agg(to_jsonb(x) - 'alt_daten'), '[]') from public.verkaufschancen x where x.kontakt_id = p_kontakt),
    'offerten', (select coalesce(jsonb_agg(to_jsonb(x) - 'alt_daten'), '[]') from public.offerten x where x.kontakt_id = p_kontakt),
    'werkvertraege', (select coalesce(jsonb_agg(to_jsonb(x) - 'alt_daten'), '[]') from public.werkvertraege x where x.kontakt_id = p_kontakt),
    'projekte', (select coalesce(jsonb_agg(to_jsonb(x) - 'alt_daten'), '[]') from public.projekte x where x.kontakt_id = p_kontakt),
    'service_faelle', (select coalesce(jsonb_agg(to_jsonb(x) - 'alt_daten'), '[]') from public.service_faelle x where x.kontakt_id = p_kontakt),
    'aktivitaeten', (select coalesce(jsonb_agg(to_jsonb(x) - 'alt_daten'), '[]') from public.aktivitaeten x where x.kontakt_id = p_kontakt),
    'dokumente', (select coalesce(jsonb_agg(jsonb_build_object('name', z.daten, 'datum', z.zeitpunkt)), '[]')
                    from (select t.text as daten, t.zeitpunkt from public.kunden_zeitachse(p_kontakt) t where t.art = 'dokument') z)
  )
$$;
revoke execute on function public.kontakt_export(uuid) from public, anon;
grant execute on function public.kontakt_export(uuid) to authenticated;

update public.app_info set wert = '4' where schluessel = 'schema_version';
update public.app_info set wert = '5' where schluessel = 'phase';
