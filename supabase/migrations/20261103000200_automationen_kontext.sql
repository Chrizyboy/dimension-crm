-- Phase 12, Teil 2: Was eine Automation über ihren Bezug weiss (Kontext), an wen sie sich wendet (Empfänger)
-- und welche Auslöser und Aktionen es gibt (Katalog für die Oberfläche). Der Kontext wird bei jedem Schritt neu
-- gelesen, damit eine Prüfung nach dem Warten den aktuellen Stand sieht.

/**
 * Kontext eines Bezugs: Kontakt, zuständige Person, Standort, die Felder des Bezugs und die Platzhalter für Texte
 * (in der Sprache des Kunden). p_daten sind die Angaben des Signals (z. B. welcher Schritt erledigt wurde).
 */
create or replace function intern.automation_kontext(p_tabelle text, p_id uuid, p_daten jsonb default '{}')
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  k jsonb := '{}';
  z jsonb;
  b jsonb := '{}';
  kontakt uuid;
  zustaendig uuid;
  standort uuid;
  sprache text;
  titel text;
  ph jsonb;
  v public.verkaufschancen;
  o public.offerten;
  p public.projekte;
  r public.rechnungen;
  w public.wartungsvertraege;
  ob public.objekte;
  termin timestamp;
begin
  if p_tabelle = 'verkaufschancen' then
    select * into v from public.verkaufschancen where id = p_id;
    select * into ob from public.objekte where id = v.objekt_id;
    kontakt := v.kontakt_id; zustaendig := v.tour_person_id; standort := v.standort_id;
    titel := concat_ws(' · ', v.nummer, (select coalesce(nullif(concat_ws(' ', vorname, nachname), ''), firma)
                                           from public.kontakte where id = v.kontakt_id));
    termin := v.termin_am at time zone 'Europe/Zurich';
    b := jsonb_build_object('lead', jsonb_build_object(
      'nummer', v.nummer, 'quelle', v.quelle, 'stufe', v.stufe, 'stand', intern.stand_verkaufschance(v),
      'eingang_am', v.eingang_am, 'termin_am', termin::date, 'termin_vorbei', v.termin_am < now(),
      'interesse', to_jsonb(v.interesse), 'plz', ob.plz, 'ort', ob.ort, 'kanton', ob.kanton,
      'hat_offerte', exists (select 1 from public.offerten x where x.verkaufschance_id = v.id and x.geloescht_am is null),
      'geloescht', v.geloescht_am is not null));
  elsif p_tabelle = 'offerten' then
    select * into o from public.offerten where id = p_id;
    kontakt := o.kontakt_id; zustaendig := o.verantwortlich_id; standort := o.standort_id;
    titel := concat_ws(' · ', o.nummer, o.titel);
    b := jsonb_build_object('offerte', jsonb_build_object(
      'nummer', o.nummer, 'status', o.status, 'entscheid', o.entscheid, 'angebot_am', o.angebot_am,
      'tage_seit_angebot', v_heute - o.angebot_am, 'betrag_chf', round(o.betrag_rappen / 100.0, 2),
      'leistung_kwp', o.leistung_kwp, 'stand', intern.stand_offerte(o, false), 'nachfassen_am', o.nachfassen_am,
      'geloescht', o.geloescht_am is not null));
  elsif p_tabelle = 'projekte' then
    select * into p from public.projekte where id = p_id;
    kontakt := p.kontakt_id; zustaendig := p.verantwortlich_id; standort := p.standort_id;
    titel := concat_ws(' · ', p.nummer, p.titel);
    b := jsonb_build_object('projekt', jsonb_build_object(
      'nummer', p.nummer, 'titel', p.titel, 'status', p.status, 'bau_status', p.bau_status, 'baubeginn', p.baubeginn,
      'vertragswert_chf', round(p.vertragswert_rappen / 100.0, 2),
      'hat_zahlungsplan', exists (select 1 from public.zahlungsplan x where x.projekt_id = p.id and x.geloescht_am is null),
      'schritte', coalesce((select jsonb_object_agg(f.schluessel, f.stand) from public.projekt_fahrplan f
                             where f.projekt_id = p.id), '{}'),
      'schritt_stand', (select f.stand from public.projekt_fahrplan f
                         where f.projekt_id = p.id and f.schluessel = p_daten ->> 'schritt'),
      'geloescht', p.geloescht_am is not null));
  elsif p_tabelle = 'rechnungen' then
    select * into r from public.rechnungen where id = p_id;
    kontakt := r.kontakt_id;
    select verantwortlich_id, standort_id into zustaendig, standort from public.projekte where id = r.projekt_id;
    titel := concat_ws(' · ', coalesce(r.nummer, 'Entwurf'), r.titel);
    b := jsonb_build_object('rechnung', jsonb_build_object(
      'nummer', r.nummer, 'art', r.art, 'status', r.status, 'total_chf', round(r.total_rappen / 100.0, 2),
      'offen_chf', round((r.total_rappen - coalesce(r.bezahlt_rappen, 0)) / 100.0, 2), 'faellig_am', r.faellig_am,
      'tage_ueberfaellig', greatest(v_heute - r.faellig_am, 0), 'mahnstufe', r.mahnstufe, 'mahnfrist', r.mahnfrist,
      'geloescht', r.geloescht_am is not null));
  elsif p_tabelle = 'wartungsvertraege' then
    select * into w from public.wartungsvertraege where id = p_id;
    kontakt := w.kontakt_id;
    select standort_id into standort from public.projekte where id = w.projekt_id;
    titel := concat_ws(' · ', w.nummer, 'Wartung');
    b := jsonb_build_object('wartung', jsonb_build_object(
      'nummer', w.nummer, 'status', w.status, 'naechste_wartung', w.naechste_wartung,
      'tage_bis', w.naechste_wartung - v_heute, 'letzte_wartung', w.letzte_wartung,
      'geloescht', w.geloescht_am is not null));
  elsif p_tabelle = 'kontakte' then
    kontakt := p_id;
  end if;

  if kontakt is not null then
    k := coalesce(intern.automation_kontakt(kontakt), '{}');
    if titel is null then titel := k ->> 'name'; end if;
  end if;
  sprache := coalesce(k ->> 'sprache', 'de');
  z := intern.automation_person(zustaendig);

  ph := jsonb_build_object(
    'Anrede', intern.anrede_text(k ->> 'vorname', k ->> 'nachname', sprache),
    'Vorname', coalesce(k ->> 'vorname', ''), 'Nachname', coalesce(k ->> 'nachname', ''),
    'Name', coalesce(k ->> 'name', ''), 'Firma', coalesce(k ->> 'firma', ''), 'Ort', coalesce(k ->> 'ort', ''),
    'Kundennummer', coalesce(k ->> 'kundennummer', ''),
    'Absender', coalesce(z ->> 'name', ''),
    'Standort', coalesce((select s.name from public.standorte s where s.id = standort), ''),
    'Datum', intern.datum_text(v_heute),
    'Termin', coalesce(case when termin is not null then intern.datum_text(termin::date)
                         || case when sprache = 'fr' then ' à ' || to_char(termin, 'HH24"h"MI')
                                 else ' um ' || to_char(termin, 'HH24:MI') || ' Uhr' end end, ''),
    'Offerte', coalesce(o.nummer, ''),
    'Projekt', coalesce(p.nummer, ''),
    'Rechnung', coalesce(r.nummer, ''),
    'Betrag', coalesce(intern.chf_text(r.total_rappen - coalesce(r.bezahlt_rappen, 0)),
                       intern.chf_text(o.betrag_rappen), ''),
    'Fällig', coalesce(intern.datum_text(r.faellig_am), ''),
    'Wartung', coalesce(intern.datum_text(w.naechste_wartung), ''),
    'Mahnung', case when r.id is null then ''
                    when sprache = 'fr' then case r.mahnstufe when 0 then 'Rappel de paiement' when 1 then '2e rappel'
                                                              else 'Dernier rappel' end
                    else case r.mahnstufe when 0 then 'Zahlungserinnerung' when 1 then '2. Mahnung'
                                          else 'Letzte Mahnung' end end,
    'Bewertungslink', coalesce((select wert ->> 'bewertung_link' from public.einstellungen
                                 where schluessel = 'automationen'), ''),
    'Meilenstein', coalesce(intern.zweisprachig(jsonb_build_object('de', p_daten ->> 'schritt_de',
                                                                   'fr', p_daten ->> 'schritt_fr'), sprache), ''));

  return b || jsonb_build_object(
    'tabelle', p_tabelle, 'id', p_id, 'titel', titel, 'ziel', intern.automation_ziel(p_tabelle, p_id),
    'kontakt', k, 'zustaendig', coalesce(z, '{}'), 'sprache', sprache,
    'standort', coalesce((select jsonb_build_object('id', s.id, 'kuerzel', s.kuerzel, 'name', s.name)
                            from public.standorte s where s.id = standort), '{}'),
    'ereignis', coalesce(p_daten, '{}'), 'heute', v_heute, 'platzhalter', ph);
end
$$;

/**
 * Empfänger einer Aktion: Liste von Angaben, die erste mit mindestens einer aktiven Person gilt.
 * «zustaendig», «rolle:verkauf», «standort:verkauf» (Rolle am Standort des Bezugs), «person:<id>».
 */
create or replace function intern.automation_empfaenger(p_an jsonb, p_kontext jsonb) returns uuid[]
language plpgsql stable security definer set search_path = '' as $$
declare
  a text;
  ids uuid[];
begin
  for a in select jsonb_array_elements_text(case when jsonb_typeof(p_an) = 'array' then p_an
                                                 else jsonb_build_array(coalesce(p_an, '"zustaendig"')) end) loop
    if a = 'zustaendig' then
      ids := array_remove(array[nullif(p_kontext #>> '{zustaendig,id}', '')::uuid], null);
    elsif a like 'rolle:%' then
      select array_agg(id order by name) into ids from public.personen
       where rolle = substr(a, 7) and aktiv and geloescht_am is null;
    elsif a like 'standort:%' then
      select array_agg(id order by name) into ids from public.personen
       where rolle = substr(a, 10) and aktiv and geloescht_am is null
         and standort_id = nullif(p_kontext #>> '{standort,id}', '')::uuid;
    elsif a like 'person:%' then
      select array_agg(id) into ids from public.personen
       where id = substr(a, 8)::uuid and aktiv and geloescht_am is null;
    end if;
    if coalesce(cardinality(ids), 0) > 0 then return ids; end if;
  end loop;
  return '{}';
end
$$;

/**
 * Katalog für die Oberfläche: Auslöser (mit ihren Feldern für Bedingungen), Aktionen, Empfänger und Platzhalter.
 * Die Namen übersetzt die App (automationen.ereignis.<schluessel>); hier stehen nur die Schlüssel und Regeln.
 */
create or replace function public.automation_katalog() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'ereignisse', jsonb_build_array(
      jsonb_build_object('schluessel', 'lead.neu', 'tabelle', 'verkaufschancen', 'art', 'sofort'),
      jsonb_build_object('schluessel', 'lead.termin_vereinbart', 'tabelle', 'verkaufschancen', 'art', 'sofort'),
      jsonb_build_object('schluessel', 'lead.termin_gehabt', 'tabelle', 'verkaufschancen', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'offerte.gesendet', 'tabelle', 'offerten', 'art', 'sofort'),
      jsonb_build_object('schluessel', 'offerte.angenommen', 'tabelle', 'offerten', 'art', 'sofort'),
      jsonb_build_object('schluessel', 'auftrag.erstellt', 'tabelle', 'projekte', 'art', 'sofort'),
      jsonb_build_object('schluessel', 'projekt.gesuch_eingereicht', 'tabelle', 'projekte', 'art', 'sofort'),
      jsonb_build_object('schluessel', 'projekt.schritt_erledigt', 'tabelle', 'projekte', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'wartung.faellig', 'tabelle', 'wartungsvertraege', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'rechnung.ueberfaellig', 'tabelle', 'rechnungen', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'zeit.monatlich', 'tabelle', null, 'art', 'zeit')),
    'felder', jsonb_build_object(
      'verkaufschancen', jsonb_build_array('lead.quelle', 'lead.stufe', 'lead.stand', 'lead.interesse', 'lead.plz',
        'lead.kanton', 'lead.hat_offerte', 'standort.kuerzel', 'kontakt.sprache', 'kontakt.email', 'zustaendig.id'),
      'offerten', jsonb_build_array('offerte.status', 'offerte.entscheid', 'offerte.stand', 'offerte.tage_seit_angebot',
        'offerte.betrag_chf', 'offerte.leistung_kwp', 'standort.kuerzel', 'kontakt.sprache', 'kontakt.email'),
      'projekte', jsonb_build_array('projekt.status', 'projekt.bau_status', 'projekt.vertragswert_chf',
        'projekt.hat_zahlungsplan', 'projekt.schritt_stand', 'ereignis.schritt', 'ereignis.bewilligung', 'standort.kuerzel', 'kontakt.sprache',
        'kontakt.email', 'kontakt.hat_wartungsvertrag'),
      'rechnungen', jsonb_build_array('rechnung.art', 'rechnung.status', 'rechnung.offen_chf', 'rechnung.mahnstufe',
        'rechnung.tage_ueberfaellig', 'kontakt.sprache', 'kontakt.email'),
      'wartungsvertraege', jsonb_build_array('wartung.status', 'wartung.tage_bis', 'kontakt.sprache', 'kontakt.email'),
      'keine', jsonb_build_array()),
    'aktionen', jsonb_build_array(
      jsonb_build_object('art', 'aufgabe', 'nach_aussen', false),
      jsonb_build_object('art', 'benachrichtigung', 'nach_aussen', false),
      jsonb_build_object('art', 'mail', 'nach_aussen', true),
      jsonb_build_object('art', 'sms', 'nach_aussen', true),
      jsonb_build_object('art', 'warten', 'nach_aussen', false),
      jsonb_build_object('art', 'pruefen', 'nach_aussen', false),
      jsonb_build_object('art', 'dubletten', 'nach_aussen', false),
      jsonb_build_object('art', 'zuteilen', 'nach_aussen', false),
      jsonb_build_object('art', 'rechnung_entwurf', 'nach_aussen', false),
      jsonb_build_object('art', 'zahlungserinnerung', 'nach_aussen', true),
      jsonb_build_object('art', 'zielgruppe', 'nach_aussen', false),
      jsonb_build_object('art', 'outlook_termin', 'nach_aussen', false, 'server', true),
      jsonb_build_object('art', 'sharepoint_ordner', 'nach_aussen', false, 'server', true),
      jsonb_build_object('art', 'abaninja_kunde', 'nach_aussen', false, 'server', true)),
    'empfaenger', jsonb_build_array('zustaendig', 'standort:verkauf', 'rolle:verkauf', 'rolle:innendienst',
      'rolle:projektleitung', 'rolle:buchhaltung', 'rolle:montage', 'rolle:admin'),
    'platzhalter', jsonb_build_array('Anrede', 'Vorname', 'Nachname', 'Name', 'Firma', 'Ort', 'Kundennummer',
      'Absender', 'Standort', 'Datum', 'Termin', 'Offerte', 'Projekt', 'Rechnung', 'Betrag', 'Fällig', 'Mahnung',
      'Wartung', 'Meilenstein', 'Bewertungslink'),
    'operatoren', jsonb_build_array('=', '!=', '>', '>=', '<', '<=', 'enthaelt', 'in', 'leer', 'nicht_leer'),
    'zielgruppen', jsonb_build_array('ohne_batterie', 'ohne_wallbox', 'ohne_waermepumpe', 'alt'))
$$;
grant execute on function public.automation_katalog() to authenticated;
revoke execute on function public.automation_katalog() from anon;
