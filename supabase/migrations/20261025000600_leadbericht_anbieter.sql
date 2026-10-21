-- Phase 6: Lead-Monatsbericht wie V175. Gekaufte Leads (Anbieter wie solar-guide.ch) und eigene Leads
-- (Direktkontakt, Empfehlung, Webseite …) werden getrennt gezeigt; nur Anbieter bekommen «gekauft»
-- und einen Bericht. Welche Quelle ein Anbieter ist, steht als Daten in der Auswahlliste.

update public.auswahlwerte
   set eigenschaften = coalesce(eigenschaften, '{}') || '{"anbieter": true}'
 where liste = 'quelle' and schluessel = 'solar_guide';

-- Im Bericht steht pro Lead «PLZ Ort» (V233 lbReportText); dafür liefert die Funktion auch die PLZ.
create or replace function public.lead_monatsbericht(p_monat date)
returns table (quelle text, erhalten int, in_bearbeitung int, termin int, offeriert int, kein_interesse int,
               gruende jsonb, leads jsonb)
language sql stable security invoker set search_path = '' as $$
  with l as (
    select coalesce(g.quelle, 'ohne') as q, g.*
      from public.verkauf_geschaefte g
     where g.verkaufschance_id is not null
       and g.eingang_am >= date_trunc('month', p_monat)::date
       and g.eingang_am < (date_trunc('month', p_monat) + interval '1 month')::date
  )
  select l.q, count(*)::int,
         count(*) filter (where l.stand in ('lead_neu', 'lead_offen', 'lead_spaeter', 'offerte', 'pruefung'))::int,
         count(*) filter (where l.stand in ('termin', 'nach_termin'))::int,
         count(*) filter (where l.gruppe in ('offeriert', 'auftrag', 'verbaut') or l.stand = 'verloren')::int,
         count(*) filter (where l.stand = 'kein')::int,
         coalesce(jsonb_agg(jsonb_build_object('grund', l.verlustgrund)) filter (where l.stand = 'kein'), '[]'),
         jsonb_agg(jsonb_build_object('id', l.id, 'nummer', l.lead_nummer, 'name', l.name, 'plz', l.plz, 'ort', l.ort,
           'eingang_am', l.eingang_am, 'stand', l.stand, 'grund', l.verlustgrund) order by l.eingang_am, l.lead_nummer)
    from l group by l.q order by count(*) desc
$$;
