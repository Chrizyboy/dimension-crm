-- Mein Tag, Automationen, Kennzahlen (Modul-Prüfung 27A):
--  * «Wartet auf deine Freigabe»: Liste `freigaben` in heute_fuer_mich (Ausgangskorb in meinem Namen).
--  * Glocke an die Administration, wenn eine Automation mit Fehler endet (einmal pro Automation und Tag).
--  * Erinnerung an alte Freigaben (werktags ab 08:00, einmal pro Tag) und «Woche in Zahlen» am Montag.
--  * Kennzahlen «Abwicklung»: IBN, Dauer Vertrag bis IBN, überfällige Fristen, Material zu spät, Dauer Service-Fall,
--    mit Zielen in einstellungen.kennzahlen.ziele.

update public.einstellungen
   set wert = '{"freigabe_erinnern_tage": 2, "woche_in_zahlen": {"an": ["rolle:admin"], "uhrzeit": "07:30"}}'::jsonb || wert
 where schluessel = 'automationen';
update public.einstellungen
   set wert = jsonb_build_object('ziele', jsonb_build_object('dauer_vertrag_ibn', 90, 'fristen_ueberfaellig', 0,
                                                             'material_spaet', 0, 'faelle_dauer', 10)) || wert
 where schluessel = 'kennzahlen';

CREATE OR REPLACE FUNCTION public.heute_fuer_mich()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  ich uuid := intern.meine_person_id();
  ich_auth uuid := auth.uid();
  admin boolean := intern.hat_recht('admin');
  heute date := (now() at time zone 'Europe/Zurich')::date;
  mein_standort uuid;
  r jsonb;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'tag.kein_recht';
  end if;
  select p.standort_id into mein_standort from public.personen p where p.id = ich;

  r := jsonb_build_object('heute', heute, 'person', (select jsonb_build_object('id', p.id, 'name', p.name)
                                                      from public.personen p where p.id = ich));

  -- Termine heute und morgen: Besichtigungen, Service, Einsätze auf der Baustelle, eigener Kalender (Outlook).
  r := r || jsonb_build_object('termine', intern.tag_liste(coalesce((
    select jsonb_agg(t.z order by t.datum, t.zeit nulls first) from (
      select (v.termin_am at time zone 'Europe/Zurich')::date as datum, to_char(v.termin_am at time zone 'Europe/Zurich', 'HH24:MI') as zeit,
             intern.tag_zeile('besichtigung', (v.termin_am at time zone 'Europe/Zurich')::date,
                              to_char(v.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), intern.kontaktname(k),
                              concat_ws(', ', o.strasse, concat_ws(' ', o.plz, o.ort)), k.telefon, 'verkaufschancen', v.id) as z
        from public.verkaufschancen v join public.kontakte k on k.id = v.kontakt_id
        left join public.objekte o on o.id = v.objekt_id
       where v.geloescht_am is null and v.tour_person_id = ich
         and (v.termin_am at time zone 'Europe/Zurich')::date between heute and heute + 1
      union all
      select (s.termin_am at time zone 'Europe/Zurich')::date, to_char(s.termin_am at time zone 'Europe/Zurich', 'HH24:MI'),
             intern.tag_zeile('service', (s.termin_am at time zone 'Europe/Zurich')::date,
                              to_char(s.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), intern.kontaktname(k),
                              concat_ws(' · ', s.nummer, s.titel), k.telefon, 'service_faelle', s.id)
        from public.service_faelle s join public.kontakte k on k.id = s.kontakt_id
       where s.geloescht_am is null and s.person_id = ich and s.status <> 'erledigt'
         and (s.termin_am at time zone 'Europe/Zurich')::date between heute and heute + 1
      union all
      select greatest(e.von, heute), null,
             intern.tag_zeile('einsatz', greatest(e.von, heute), null, concat_ws(' · ', p.nummer, p.titel),
                              concat_ws(', ', o.strasse, concat_ws(' ', o.plz, o.ort)), null, 'projekte', p.id)
        from public.einsaetze e join public.projekte p on p.id = e.projekt_id
        left join public.objekte o on o.id = p.objekt_id
       where e.geloescht_am is null and ich = any (e.personen)
         and e.von <= heute + 1 and coalesce(e.bis, e.von) >= heute
      union all
      select (c.beginn at time zone 'Europe/Zurich')::date,
             case when c.ganztags then null else to_char(c.beginn at time zone 'Europe/Zurich', 'HH24:MI') end,
             intern.tag_zeile('kalender', (c.beginn at time zone 'Europe/Zurich')::date,
                              case when c.ganztags then null else to_char(c.beginn at time zone 'Europe/Zurich', 'HH24:MI') end,
                              coalesce(nullif(c.betreff, ''), 'Termin'), c.ort, null, null, null)
        from public.kalender_eintraege c
       where c.geloescht_am is null and c.person_id = ich and c.quelle is distinct from 'crm'
         and (c.beginn at time zone 'Europe/Zurich')::date between heute and heute + 1
    ) t), '[]'), 30));

  -- Aufgaben: für mich (fällig bis in 7 Tagen oder ohne Datum) und von mir an andere vergeben.
  r := r || jsonb_build_object(
    'aufgaben', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('aufgabe', a.faellig_am, null, a.titel, a.text, null, a.bezug_tabelle, a.bezug_id,
                                        jsonb_build_object('aufgabe_id', a.id, 'ueberfaellig', a.faellig_am < heute))
                       order by a.faellig_am nulls last, a.erstellt_am)
        from public.aufgaben a
       where a.geloescht_am is null and a.erledigt_am is null and a.person_id = ich
         and (a.faellig_am is null or a.faellig_am <= heute + 7)), '[]'), 30),
    'vergeben', intern.tag_liste(coalesce((
      -- Zuletzt Vergebenes zuerst: «Was habe ich eben delegiert?»
      select jsonb_agg(intern.tag_zeile('aufgabe', a.faellig_am, null, a.titel, p.name, null, a.bezug_tabelle, a.bezug_id,
                                        jsonb_build_object('aufgabe_id', a.id, 'ueberfaellig', a.faellig_am < heute))
                       order by a.erstellt_am desc)
        from public.aufgaben a left join public.personen p on p.id = a.person_id
       where a.geloescht_am is null and a.erledigt_am is null and a.erstellt_von = ich_auth
         and a.person_id is distinct from ich), '[]')));

  -- Verkauf: Offerten nachfassen (meine; ohne Zuständige sieht sie die Administration), neue Leads, Wiedervorlagen.
  r := r || jsonb_build_object(
    'nachfassen', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('nachfassen', o.faellig_am, null, o.name, concat_ws(' · ', o.nummer, o.standort),
                                        o.telefon, 'offerten', o.id, jsonb_build_object('betrag_rappen', o.betrag_rappen))
                       order by o.faellig_am nulls last)
        from public.offerten_liste o
       where o.stand = 'nachfassen' and o.faellig_am <= heute
         and (o.verantwortlich_id = ich or (o.verantwortlich_id is null and admin))), '[]')),
    'neue_leads', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('lead', g.eingang_am, null, g.name, concat_ws(' · ', g.lead_nummer, concat_ws(' ', g.plz, g.ort),
                                                  coalesce((select a.text_de from public.auswahlwerte a
                                                             where a.liste = 'quelle' and a.schluessel = g.quelle), g.quelle)),
                                        g.telefon, 'verkaufschancen', g.verkaufschance_id)
                       order by g.eingang_am)
        from public.verkauf_geschaefte g
       where g.stand = 'lead_neu' and g.verkaufschance_id is not null
         and (g.person_id = ich or (g.person_id is null and (admin or exists (
               select 1 from public.standorte s where s.id = mein_standort and s.kuerzel = g.standort))))), '[]')),
    'wiedervorlagen', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('wiedervorlage', g.wiedervorlage_am, null, g.name,
                                        concat_ws(' · ', g.lead_nummer, g.wiedervorlage_grund), g.telefon,
                                        'verkaufschancen', g.verkaufschance_id)
                       order by g.wiedervorlage_am)
        from public.verkauf_geschaefte g
       where g.wiedervorlage_am <= heute and g.gruppe = 'lead' and g.verkaufschance_id is not null
         and (g.person_id = ich or (g.person_id is null and admin))), '[]')));

  -- Abwicklung: Fristen im Fahrplan (überfällig oder in 7 Tagen), Zahlungen (fällig in 7 Tagen), Service, Kontrollen.
  r := r || jsonb_build_object(
    'fristen', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('frist', f.frist, null, concat_ws(' · ', p.nummer, p.titel), f.name_de, null,
                                        'projekte', p.id, jsonb_build_object('name_fr', f.name_fr, 'ueberfaellig', f.ueberfaellig,
                                                                             'bewilligung', f.bewilligung))
                       order by f.frist)
        from public.projekt_fahrplan f join public.projekte p on p.id = f.projekt_id
       where p.geloescht_am is null and (f.ueberfaellig or f.bald)
         and (p.verantwortlich_id = ich or (p.verantwortlich_id is null and admin))), '[]')),
    'zahlungen', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('zahlung', z.faellig_am, null, coalesce(intern.kontaktname(k), p.titel),
                                        concat_ws(' · ', p.nummer, z.bezeichnung), null, 'projekte', p.id,
                                        jsonb_build_object('betrag_rappen', z.betrag_rappen, 'ueberfaellig', z.faellig_am < heute))
                       order by z.faellig_am)
        from public.zahlungsplan z join public.projekte p on p.id = z.projekt_id
        left join public.kontakte k on k.id = p.kontakt_id
       where z.geloescht_am is null and p.geloescht_am is null and z.bezahlt_am is null and z.faellig_am <= heute + 7
         and (p.verantwortlich_id = ich or intern.hat_recht('finanzen'))), '[]')),
    'service', intern.tag_liste(coalesce((
      select jsonb_agg(intern.tag_zeile('fall', (s.termin_am at time zone 'Europe/Zurich')::date, null, intern.kontaktname(k),
                                        concat_ws(' · ', s.nummer, s.titel), k.telefon, 'service_faelle', s.id,
                                        jsonb_build_object('prioritaet', s.prioritaet, 'status', s.status))
                       order by case s.prioritaet when 'hoch' then 0 when 'normal' then 1 else 2 end, s.termin_am nulls last)
        from public.service_faelle s join public.kontakte k on k.id = s.kontakt_id
       where s.geloescht_am is null and s.status <> 'erledigt'
         and (s.person_id = ich or (s.person_id is null and admin))), '[]')),
    'kontrollen', intern.tag_liste(coalesce((
      select jsonb_agg(x.z order by x.datum) from (
        select a.naechste_kontrolle as datum,
               intern.tag_zeile('kontrolle', a.naechste_kontrolle, null, coalesce(intern.kontaktname(k), p.titel),
                                concat_ws(' · ', p.nummer, o.ort), k.telefon, 'projekte', p.id,
                                jsonb_build_object('ueberfaellig', a.naechste_kontrolle < heute)) as z
          from public.anlagen a join public.projekte p on p.id = a.projekt_id
          left join public.kontakte k on k.id = p.kontakt_id left join public.objekte o on o.id = a.objekt_id
         where a.geloescht_am is null and a.naechste_kontrolle <= heute + 30
           and (p.verantwortlich_id = ich or (p.verantwortlich_id is null and admin))
        union all
        select w.naechste_wartung,
               intern.tag_zeile('wartung', w.naechste_wartung, null, intern.kontaktname(k), w.nummer, k.telefon,
                                'wartungsvertraege', w.id, jsonb_build_object('ueberfaellig', w.naechste_wartung < heute))
          from public.wartungsvertraege w join public.kontakte k on k.id = w.kontakt_id
          left join public.projekte p on p.id = w.projekt_id
         where w.geloescht_am is null and w.status = 'aktiv' and w.naechste_wartung <= heute + 30
           and (p.verantwortlich_id = ich or (p.verantwortlich_id is null and admin))
      ) x), '[]')));
  -- Ausgangskorb (Modul-Prüfung 27A): was in meinem Namen auf Freigabe wartet (ohne Absender: Administration).
  r := r || jsonb_build_object('freigaben', intern.tag_liste(coalesce((
    select jsonb_agg(intern.tag_zeile('freigabe', (a.erstellt_am at time zone 'Europe/Zurich')::date, null,
                                      coalesce(nullif(a.betreff, ''), left(a.text, 60), a.an), a.an, null,
                                      'ausgangskorb', a.id,
                                      jsonb_build_object('ueberfaellig', a.erstellt_am < now() - make_interval(days => coalesce(
                                        ((select e.wert from public.einstellungen e where e.schluessel = 'automationen')
                                          ->> 'freigabe_erinnern_tage')::int, 2)),
                                                         'status', a.status))
                     order by a.erstellt_am)
      from public.ausgangskorb a
     where a.geloescht_am is null and a.status in ('wartet', 'fehler')
       and (a.absender_person_id = ich or (a.absender_person_id is null and admin))), '[]'), 30));
  return r;
end
$function$

;

/** Endet ein Lauf mit Fehler, bekommt die Administration eine Glocke (pro Automation höchstens einmal am Tag). */
create or replace function intern.automation_fehler_melden() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  a public.automationen;
  tag_beginn timestamptz := date_trunc('day', now() at time zone 'Europe/Zurich') at time zone 'Europe/Zurich';
begin
  if new.stand <> 'fehler' or old.stand = 'fehler' then return new; end if;
  if exists (select 1 from public.benachrichtigungen b join public.automation_laeufe l on l.id = b.lauf_id
              where l.automation_id = new.automation_id and b.titel_de like 'Automation mit Fehler:%'
                and b.erstellt_am >= tag_beginn) then
    return new;
  end if;
  select * into a from public.automationen where id = new.automation_id;
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, lauf_id)
  select x, 'warnung', 'Automation mit Fehler: ' || a.name_de, 'Automatisation en erreur : ' || a.name_fr,
         concat_ws(' · ', nullif(new.titel, ''), 'Im Protokoll steht, was nicht ging.'),
         concat_ws(' · ', nullif(new.titel, ''), 'Le journal indique ce qui n’a pas fonctionné.'),
         '/automations?ansicht=protokoll&automation=' || a.id, new.id
    from unnest(intern.automation_empfaenger('["rolle:admin"]'::jsonb, '{}'::jsonb)) x;
  return new;
end
$$;
create trigger fehler_melden after update of stand on public.automation_laeufe
  for each row execute function intern.automation_fehler_melden();

/**
 * Erinnerungen aus dem Zeitplan (stündlich): werktags ab 08:00 an alle mit Freigaben, die länger als
 * `automationen.freigabe_erinnern_tage` warten; montags ab `woche_in_zahlen.uhrzeit` die «Woche in Zahlen».
 * Nur Glocke, keine Mail. Gibt die Zahl der Erinnerungen zurück; `p_jetzt` nur für Tests.
 */
create or replace function public.tag_erinnern(p_jetzt timestamptz default now()) returns int
language plpgsql security definer set search_path = '' as $$
declare
  jetzt timestamp := p_jetzt at time zone 'Europe/Zurich';
  heute date := jetzt::date;
  e jsonb := coalesce((select wert from public.einstellungen where schluessel = 'automationen'), '{}');
  tage int := coalesce((e ->> 'freigabe_erinnern_tage')::int, 2);
  n int := 0;
  v_von date := date_trunc('week', jetzt)::date - 7;
  v_bis date := date_trunc('week', jetzt)::date - 1;
  z record;
begin
  if extract(isodow from jetzt) <= 5 and jetzt::time >= '08:00' and tage > 0 then
    for z in
      select coalesce(a.absender_person_id, x) as person, count(*) as anzahl
        from public.ausgangskorb a
        left join lateral unnest(case when a.absender_person_id is null
                                      then intern.automation_empfaenger('["rolle:admin"]'::jsonb, '{}'::jsonb) end) x on true
       where a.geloescht_am is null and a.status in ('wartet', 'fehler') and a.erstellt_am < p_jetzt - make_interval(days => tage)
       group by 1
    loop
      continue when z.person is null or exists (
        select 1 from public.benachrichtigungen b where b.person_id = z.person and b.titel_de like 'Freigaben warten:%'
           and b.erstellt_am >= heute::timestamp at time zone 'Europe/Zurich');
      insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
      values (z.person, 'warnung', 'Freigaben warten: ' || z.anzahl, 'Validations en attente : ' || z.anzahl,
              'Seit mehr als ' || tage || ' Tagen im Ausgangskorb. Freigeben oder verwerfen.',
              'Depuis plus de ' || tage || ' jours dans la boîte d’envoi. Valider ou rejeter.', '/outbox');
      n := n + 1;
    end loop;
  end if;

  if extract(isodow from jetzt) = 1 and jetzt::time >= coalesce((e #>> '{woche_in_zahlen,uhrzeit}')::time, '07:30')
     and not exists (select 1 from public.benachrichtigungen b where b.titel_de like 'Woche in Zahlen:%'
                       and b.erstellt_am >= date_trunc('week', jetzt) at time zone 'Europe/Zurich') then
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    select x, 'info', 'Woche in Zahlen: ' || to_char(v_von, 'DD.MM.') || '–' || to_char(v_bis, 'DD.MM.YYYY'),
           'Semaine en chiffres : ' || to_char(v_von, 'DD.MM.') || '–' || to_char(v_bis, 'DD.MM.YYYY'),
           'Leads ' || k.leads || ' · Offerten ' || k.offerten || ' (' || intern.chf_text(k.offerten_rp) || ') · Aufträge '
             || k.auftraege || ' (' || intern.chf_text(k.auftraege_rp) || ') · IBN ' || k.ibn || ' · Zahlungseingang '
             || intern.chf_text(k.eingang_rp) || ' · Service-Fälle ' || k.faelle,
           'Leads ' || k.leads || ' · Offres ' || k.offerten || ' (' || intern.chf_text(k.offerten_rp) || ') · Commandes '
             || k.auftraege || ' (' || intern.chf_text(k.auftraege_rp) || ') · MES ' || k.ibn || ' · Encaissements '
             || intern.chf_text(k.eingang_rp) || ' · Cas SAV ' || k.faelle,
           '/dashboard'
      from (select count(*) filter (where f.schluessel = 'leads_neu') as leads,
                   count(*) filter (where f.schluessel = 'gesendet') as offerten,
                   coalesce(sum(f.betrag_rappen) filter (where f.schluessel = 'gesendet'), 0)::bigint as offerten_rp,
                   count(*) filter (where f.schluessel = 'angenommen') as auftraege,
                   coalesce(sum(f.betrag_rappen) filter (where f.schluessel = 'angenommen'), 0)::bigint as auftraege_rp,
                   count(*) filter (where f.schluessel = 'ibn') as ibn,
                   coalesce(sum(f.betrag_rappen) filter (where f.schluessel = 'zahlung_eingang'), 0)::bigint as eingang_rp,
                   count(*) filter (where f.schluessel = 'faelle_neu') as faelle
              from public.kennzahlen_fakten(v_von, v_bis) f) k,
           unnest(intern.automation_empfaenger(coalesce(e #> '{woche_in_zahlen,an}', '["rolle:admin"]'), '{}'::jsonb)) x;
    n := n + 1;
  end if;
  return n;
end
$$;

-- Kennzahlen: die bisherigen Fakten bleiben unverändert (intern), die öffentliche Funktion hängt die Abwicklung
-- an und liefert dazu die Dauer in Tagen (Spalte `tage`, nur bei den neuen Zeilen gesetzt).
alter function public.kennzahlen_fakten(date, date) set schema intern;
alter function intern.kennzahlen_fakten(date, date) rename to kennzahlen_fakten_grund;

/**
 * Einzelfakten für die Kennzahlen (siehe intern.kennzahlen_fakten_grund) plus Abwicklung: `ibn` (IBN im Zeitraum,
 * tage = Vertrag bis IBN), `fristen_ueberfaellig` und `material_spaet` (aktuell, tage = wie lange schon) und
 * `faelle_dauer` (erledigte Fälle, tage = eröffnet bis erledigt). Rechte der lesenden Person (security invoker).
 */
create function public.kennzahlen_fakten(p_von date, p_bis date)
returns table (schluessel text, art text, id uuid, datum date, standort text, person_id uuid,
               betrag_rappen bigint, quelle text, name text, nummer text, ort text, stand text, tage int)
language sql stable set search_path = '' as $$
  with
  heute as (select (now() at time zone 'Europe/Zurich')::date as d),
  frist as (select coalesce(((select wert from public.einstellungen where schluessel = 'einkauf') ->> 'lieferfrist_tage')::int, 14) as t),
  proj as (
    select p.id, p.status, p.baubeginn, p.unterzeichnet_am, p.vertragswert_rappen, p.material_status,
           s.kuerzel as standort, p.verantwortlich_id as person, coalesce(intern.kontaktname(k), p.titel) as name,
           p.nummer, concat_ws(' ', ob.plz, ob.ort) as ort
      from public.projekte p left join public.kontakte k on k.id = p.kontakt_id
      left join public.objekte ob on ob.id = p.objekt_id left join public.standorte s on s.id = p.standort_id
     where p.geloescht_am is null)
  select g.*, null::int from intern.kennzahlen_fakten_grund(p_von, p_bis) g
  union all
  select 'ibn', 'projekt', p.id, f.erledigt_am, p.standort, p.person, p.vertragswert_rappen, null, p.name, p.nummer,
         p.ort, p.status, f.erledigt_am - p.unterzeichnet_am
    from proj p join public.projekt_fahrplan f on f.projekt_id = p.id and f.schluessel = 'ibn'
   where f.erledigt_am between p_von and p_bis
  union all
  select 'fristen_ueberfaellig', 'projekt', p.id, f.frist, p.standort, p.person, null, null, p.name, p.nummer,
         f.name_de, p.status, heute.d - f.frist
    from proj p join public.projekt_fahrplan f on f.projekt_id = p.id, heute
   where f.ueberfaellig and f.eingereicht_am is null and p.status not in ('abgeschlossen', 'storniert')
  union all
  select 'material_spaet', 'projekt', p.id, p.baubeginn - frist.t, p.standort, p.person, null, null, p.name, p.nummer,
         p.ort, p.status, heute.d - (p.baubeginn - frist.t)
    from proj p, heute, frist
   where p.status not in ('abgeschlossen', 'storniert') and p.material_status is distinct from 'bestellt'
     and p.material_status is distinct from 'lager' and p.baubeginn >= heute.d and p.baubeginn - frist.t < heute.d
  union all
  select 'faelle_dauer', 'fall', f.id, f.erledigt_am, coalesce(s.kuerzel, (
           select public.standort_fuer_plz(o.plz) from public.objekte o
            where o.kontakt_id = f.kontakt_id and o.geloescht_am is null order by o.erstellt_am limit 1)),
         f.person_id, null, null, intern.kontaktname(k), f.nummer, f.titel, f.status,
         f.erledigt_am - (f.erstellt_am at time zone 'Europe/Zurich')::date
    from public.service_faelle f join public.kontakte k on k.id = f.kontakt_id
    left join public.projekte pr on pr.id = f.projekt_id left join public.standorte s on s.id = pr.standort_id
   where f.geloescht_am is null and f.status = 'erledigt' and f.erledigt_am between p_von and p_bis
$$;

revoke execute on function public.kennzahlen_fakten(date, date) from public, anon;
grant execute on function public.kennzahlen_fakten(date, date) to authenticated;
revoke execute on function intern.kennzahlen_fakten_grund(date, date) from public, anon;
revoke execute on function intern.automation_fehler_melden() from public, anon, authenticated;
revoke execute on function public.tag_erinnern(timestamptz) from public, anon, authenticated;
grant execute on function public.tag_erinnern(timestamptz) to service_role;
