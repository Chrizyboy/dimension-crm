-- Automationen kennen neu Service-Fälle, Rapporte und Bestellungen (Modul-Prüfung 3.3, 3.5, 3.6, Chris 1.11.2026).
-- Auslöser: service.neu, service.erledigt, rapport.abgeschlossen, bestellung.ohne_bestaetigung,
-- bestellung.ueberfaellig, bestellung.teilgeliefert. «Rechnungsentwurf» geht auch aus Rapport und Wartungsvertrag.
-- Die vier Funktionen sind vollständige Fassungen der letzten Stände (Phase 12) mit den Ergänzungen; neue
-- Fassungen später bitte von hier aus weiterführen.

create or replace function intern.automation_ziel(p_tabelle text, p_id uuid) returns text
language sql immutable set search_path = '' as $$
  select case p_tabelle
    when 'verkaufschancen' then '/sales?lead=' || p_id
    when 'offerten' then '/quotes?offerte=' || p_id
    when 'projekte' then '/projects?projekt=' || p_id
    when 'rechnungen' then '/invoices?rechnung=' || p_id
    when 'wartungsvertraege' then '/aftersales?reiter=wartung'
    when 'kontakte' then '/customers?kunde=' || p_id
    when 'ausgangskorb' then '/outbox?eintrag=' || p_id
    when 'aufgaben' then '/tasks'
    when 'service_faelle' then '/aftersales?fall=' || p_id
    when 'rapporte' then '/fieldwork?reiter=rapporte&rapport=' || p_id
    when 'bestellungen' then '/purchasing?bestellung=' || p_id
  end
$$;

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
  sf public.service_faelle;
  ra public.rapporte;
  be public.bestellungen;
  li public.lieferanten;
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
  elsif p_tabelle = 'service_faelle' then
    select * into sf from public.service_faelle where id = p_id;
    kontakt := sf.kontakt_id; zustaendig := sf.person_id;
    select pp.standort_id into standort from public.projekte pp where pp.id = sf.projekt_id;
    titel := concat_ws(' · ', sf.nummer, sf.titel);
    b := jsonb_build_object('service', jsonb_build_object(
      'nummer', sf.nummer, 'titel', sf.titel, 'kategorie', sf.kategorie, 'prioritaet', sf.prioritaet,
      'status', sf.status, 'garantie', coalesce(sf.garantie, false), 'erledigt_am', sf.erledigt_am,
      'geloescht', sf.geloescht_am is not null));
  elsif p_tabelle = 'rapporte' then
    select * into ra from public.rapporte where id = p_id;
    select coalesce(f.kontakt_id, pp.kontakt_id, wv.kontakt_id), coalesce(f.person_id, ra.person_id), pp.standort_id
      into kontakt, zustaendig, standort
      from (select 1) x
      left join public.service_faelle f on f.id = ra.service_fall_id
      left join public.projekte pp on pp.id = coalesce(ra.projekt_id, f.projekt_id)
      left join public.wartungsvertraege wv on wv.id = ra.wartungsvertrag_id;
    titel := concat_ws(' · ', nullif(ra.nummer, ''), 'Rapport');
    b := jsonb_build_object('rapport', jsonb_build_object(
      'nummer', ra.nummer, 'art', ra.art, 'verrechnung', ra.verrechnung, 'datum', ra.datum,
      'abgeschlossen', ra.abgeschlossen_am is not null, 'geloescht', ra.geloescht_am is not null));
  elsif p_tabelle = 'bestellungen' then
    select * into be from public.bestellungen where id = p_id;
    select * into li from public.lieferanten where id = be.lieferant_id;
    kontakt := li.kontakt_id; zustaendig := be.freigegeben_von;
    select pp.standort_id into standort from public.projekte pp where pp.id = be.projekt_id;
    titel := concat_ws(' · ', be.nummer, li.name);
    b := jsonb_build_object('bestellung', jsonb_build_object(
      'nummer', be.nummer, 'status', be.status, 'lieferant', li.name, 'bestellt_am', be.bestellt_am,
      'liefertermin', be.liefertermin, 'tage_seit_bestellt', v_heute - be.bestellt_am,
      'tage_ueberfaellig', greatest(v_heute - be.liefertermin, 0), 'geloescht', be.geloescht_am is not null));
  elsif p_tabelle = 'kontakte' then
    kontakt := p_id;
  end if;

  if kontakt is not null then
    k := coalesce(intern.automation_kontakt(kontakt), '{}');
    if titel is null then titel := k ->> 'name'; end if;
  end if;
  if p_tabelle = 'bestellungen' then
    k := k || jsonb_strip_nulls(jsonb_build_object('email', nullif(trim(li.email_bestellung), ''), 'sprache', li.sprache,
                                                   'name', coalesce(k ->> 'name', li.name), 'firma', coalesce(k ->> 'firma', li.name)));
    if titel is null then titel := li.name; end if;
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
    'Projekt', coalesce(p.nummer, (select pp.nummer from public.projekte pp
                                    where pp.id = coalesce(sf.projekt_id, ra.projekt_id, be.projekt_id)), ''),
    'Fall', coalesce(sf.nummer, ''),
    'Falltitel', coalesce(sf.titel, ''),
    'Rapport', coalesce(nullif(ra.nummer, ''), ''),
    'Bestellung', coalesce(be.nummer, ''),
    'Liefertermin', coalesce(intern.datum_text(be.liefertermin), ''),
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
      jsonb_build_object('schluessel', 'service.neu', 'tabelle', 'service_faelle', 'art', 'sofort'),
      jsonb_build_object('schluessel', 'service.erledigt', 'tabelle', 'service_faelle', 'art', 'sofort'),
      jsonb_build_object('schluessel', 'rapport.abgeschlossen', 'tabelle', 'rapporte', 'art', 'sofort'),
      jsonb_build_object('schluessel', 'bestellung.ohne_bestaetigung', 'tabelle', 'bestellungen', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'bestellung.ueberfaellig', 'tabelle', 'bestellungen', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'bestellung.teilgeliefert', 'tabelle', 'bestellungen', 'art', 'sofort'),
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
      'service_faelle', jsonb_build_array('service.kategorie', 'service.prioritaet', 'service.status', 'service.garantie',
        'kontakt.sprache', 'kontakt.email', 'kontakt.telefon'),
      'rapporte', jsonb_build_array('rapport.art', 'rapport.verrechnung', 'kontakt.sprache', 'kontakt.email'),
      'bestellungen', jsonb_build_array('bestellung.status', 'bestellung.lieferant', 'bestellung.tage_seit_bestellt',
        'bestellung.tage_ueberfaellig'),
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
      'Wartung', 'Meilenstein', 'Bewertungslink', 'Fall', 'Falltitel', 'Rapport', 'Bestellung', 'Liefertermin'),
    'operatoren', jsonb_build_array('=', '!=', '>', '>=', '<', '<=', 'enthaelt', 'in', 'leer', 'nicht_leer'),
    'zielgruppen', jsonb_build_array('ohne_batterie', 'ohne_wallbox', 'ohne_waermepumpe', 'alt'))
$$;

create or replace function intern.automation_aktion(a public.automationen, l public.automation_laeufe, nr int,
                                                    x jsonb, ctx jsonb, p_als uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  art text := x ->> 'art';
  ids uuid[];
  n int;
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  v_id uuid;
  v_plz text;
  v_std uuid;
begin
  if art in ('aufgabe', 'benachrichtigung', 'dubletten', 'zielgruppe') then
    ids := intern.automation_empfaenger(coalesce(x -> 'an', '["zustaendig"]'), ctx);
    if coalesce(cardinality(ids), 0) = 0 then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'kein_empfaenger');
    end if;
  end if;

  if art = 'aufgabe' then
    insert into public.aufgaben (titel, text, faellig_am, person_id, bezug_tabelle, bezug_id, lauf_id)
    select intern.automation_text(intern.zweisprachig(x -> 'titel', coalesce(p.sprache, 'de')), ctx),
           nullif(intern.automation_text(intern.zweisprachig(x -> 'text', coalesce(p.sprache, 'de')), ctx), ''),
           v_heute + coalesce((x ->> 'faellig_tage')::int, 0), p.id, l.tabelle, l.bezug_id, l.id
      from public.personen p where p.id = any (ids);
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'aufgabe',
                              'werte', jsonb_build_object('an', intern.personen_namen(ids)), 'ziel', '/tasks');

  elsif art = 'benachrichtigung' then
    n := intern.automation_melden(ids, x ->> 'stufe', x -> 'titel', x -> 'text', ctx, ctx ->> 'ziel', l.id);
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'benachrichtigt',
                              'werte', jsonb_build_object('an', intern.personen_namen(ids)));

  elsif art in ('mail', 'sms', 'zahlungserinnerung') then
    return intern.automation_nach_aussen(a, l, nr, x, ctx, p_als);

  elsif art = 'dubletten' then
    select count(*) into n from public.moegliche_dubletten(ctx #>> '{kontakt,name}', ctx #>> '{kontakt,email}',
                                                          ctx #>> '{kontakt,telefon}', (ctx #>> '{kontakt,id}')::uuid);
    if n = 0 then return jsonb_build_object('ergebnis', 'ok', 'meldung', 'keine_dublette'); end if;
    perform intern.automation_melden(ids, 'warnung',
      jsonb_build_object('de', 'Mögliche Dublette: {Name}', 'fr', 'Doublon possible : {Name}'),
      jsonb_build_object('de', n || ' ähnliche Kontakte gefunden. Bitte prüfen und zusammenführen.',
                         'fr', n || ' contacts similaires trouvés. Merci de vérifier et fusionner.'),
      ctx, intern.automation_ziel('kontakte', (ctx #>> '{kontakt,id}')::uuid), l.id);
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'dublette', 'werte', jsonb_build_object('anzahl', n),
                              'ziel', intern.automation_ziel('kontakte', (ctx #>> '{kontakt,id}')::uuid));

  elsif art = 'zuteilen' then
    if l.tabelle <> 'verkaufschancen' then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'nur_leads');
    end if;
    if nullif(ctx #>> '{standort,id}', '') is not null then
      return jsonb_build_object('ergebnis', 'ok', 'meldung', 'schon_zugeteilt', 'werte', jsonb_build_object('standort', ctx #>> '{standort,name}'));
    end if;
    v_plz := ctx #>> '{lead,plz}';
    select s.id into v_std from public.standorte s where s.kuerzel = public.standort_fuer_plz(v_plz) and s.geloescht_am is null;
    if v_std is null then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'keine_plz');
    end if;
    update public.verkaufschancen set standort_id = v_std where id = l.bezug_id;
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'zugeteilt',
                              'werte', jsonb_build_object('standort', (select name from public.standorte where id = v_std)));

  elsif art = 'rechnung_entwurf' and l.tabelle in ('rapporte', 'wartungsvertraege') then
    if l.tabelle = 'rapporte' and coalesce(ctx #>> '{rapport,verrechnung}', '') <> 'kostenpflichtig' then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'nicht_verrechenbar');
    end if;
    begin
      v_id := public.rechnung_entwurf(case when l.tabelle = 'rapporte' then jsonb_build_object('rapport_id', l.bezug_id)
                                           else jsonb_build_object('wartungsvertrag_id', l.bezug_id) end);
    exception when others then
      if sqlerrm in ('finanzen.schon_verrechnet', 'finanzen.rapport_nicht_verrechenbar') then
        return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', replace(sqlerrm, 'finanzen.', ''));
      end if;
      raise;
    end;
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'rechnung_entwurf',
                              'ziel', intern.automation_ziel('rechnungen', v_id));

  elsif art = 'rechnung_entwurf' then
    select z.id into v_id from public.zahlungsplan z
     where z.projekt_id = coalesce(case when l.tabelle = 'projekte' then l.bezug_id end,
                                   (select r.projekt_id from public.rechnungen r where r.id = l.bezug_id))
       and z.geloescht_am is null
       and not exists (select 1 from public.rechnungen r where r.zahlungsplan_id = z.id and r.geloescht_am is null
                                                         and r.status <> 'storniert')
     order by case when x ->> 'tranche' = 'letzte' then 0 end,
              case when x ->> 'tranche' = 'letzte' then z.faellig_am end desc nulls first,
              case when x ->> 'tranche' = 'letzte' then z.betrag_rappen end,
              z.faellig_am nulls last, z.betrag_rappen desc
     limit 1;
    if v_id is null then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'keine_tranche');
    end if;
    v_id := public.rechnung_entwurf(jsonb_build_object('zahlungsplan_id', v_id));
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'rechnung_entwurf',
                              'ziel', intern.automation_ziel('rechnungen', v_id));

  elsif art = 'zielgruppe' then
    select count(*) into n from public.marketing_zielgruppe z
     where z.gruppe = 'kunde' and not z.werbesperre
       and case x ->> 'merkmal'
             when 'ohne_batterie' then not coalesce(z.batterie, false)
             when 'ohne_wallbox' then not coalesce(z.wallbox, false)
             when 'ohne_waermepumpe' then not coalesce(z.waermepumpe, false)
             when 'alt' then z.anlage_seit <= v_heute - interval '3 years'
             else false end;
    if n = 0 then return jsonb_build_object('ergebnis', 'ok', 'meldung', 'zielgruppe_leer'); end if;
    perform intern.automation_melden(ids, 'info', x -> 'titel',
      jsonb_build_object('de', n || ' Kunden passen. Zielgruppe öffnen und anschreiben.',
                         'fr', n || ' clients correspondent. Ouvrir le groupe cible et écrire.'),
      ctx, '/marketing?ansicht=anschreiben&anlage=' || (x ->> 'merkmal'), l.id);
    return jsonb_build_object('ergebnis', 'ok', 'meldung', 'zielgruppe',
                              'werte', jsonb_build_object('anzahl', n, 'an', intern.personen_namen(ids)),
                              'ziel', '/marketing?ansicht=anschreiben&anlage=' || (x ->> 'merkmal'));
  end if;
  raise exception using errcode = 'P0001', message = 'automation.aktion_unbekannt';
end
$$;


-- Bestellung: Auftragsbestätigung des Lieferanten erhalten (von Hand oder später aus dem Posteingang).
alter table public.bestellungen add column if not exists bestaetigt_am date;
comment on column public.bestellungen.bestaetigt_am is 'Auftragsbestätigung (AB) des Lieferanten erhalten am; ohne AB nach 3 Tagen fragt die Automation nach.';

/** Signale aus Service-Fällen: neu (nicht beim Import) und erledigt (bei jedem Abschluss einmal pro Tag). */
create or replace function intern.signal_service_fall() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.geloescht_am is not null or intern.automation_import(new.alt_id) then return new; end if;
  if tg_op = 'INSERT' then
    perform intern.automation_signal('service.neu', 'service_faelle', new.id, new.id::text);
  end if;
  if new.status = 'erledigt' and (tg_op = 'INSERT' or old.status is distinct from 'erledigt') then
    perform intern.automation_signal('service.erledigt', 'service_faelle', new.id, new.id || ':' || coalesce(new.erledigt_am, current_date));
  end if;
  return new;
end
$$;
create trigger automation_signal after insert or update of status on public.service_faelle
  for each row execute function intern.signal_service_fall();

/** Signal, sobald ein Rapport abgeschlossen ist (auch nach einem Funkloch nur einmal). */
create or replace function intern.signal_rapport() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.geloescht_am is null and new.abgeschlossen_am is not null and old.abgeschlossen_am is null then
    perform intern.automation_signal('rapport.abgeschlossen', 'rapporte', new.id, new.id::text);
  end if;
  return new;
end
$$;
create trigger automation_signal after update of abgeschlossen_am on public.rapporte
  for each row execute function intern.signal_rapport();

/** Signal bei einer Teillieferung (pro Tag höchstens einmal je Bestellung). */
create or replace function intern.signal_bestellung() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.geloescht_am is null and new.status = 'teilgeliefert' and old.status is distinct from new.status then
    perform intern.automation_signal('bestellung.teilgeliefert', 'bestellungen', new.id, new.id || ':' || current_date);
  end if;
  return new;
end
$$;
create trigger automation_signal after update of status on public.bestellungen
  for each row execute function intern.signal_bestellung();

create or replace function intern.automationen_durchsehen(p_sofort boolean default false) returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select wert from public.einstellungen where schluessel = 'automationen'), '{}');
  heute date := (now() at time zone 'Europe/Zurich')::date;
  e text;
  basis boolean;
  n int := 0;
  r record;
begin
  if not p_sofort and exists (select 1 from intern.automation_durchsicht where ereignis = '*'
                                 and zuletzt_am > now() - interval '10 minutes') then
    return 0;
  end if;
  insert into intern.automation_durchsicht (ereignis) values ('*')
  on conflict (ereignis) do update set zuletzt_am = now();

  foreach e in array array['lead.termin_gehabt', 'projekt.schritt_erledigt', 'wartung.faellig', 'rechnung.ueberfaellig',
                           'bestellung.ohne_bestaetigung', 'bestellung.ueberfaellig', 'zeit.monatlich'] loop
    basis := not exists (select 1 from intern.automation_durchsicht where ereignis = e);
    for r in
      select 'verkaufschancen' as tabelle, v.id, v.id || ':' || to_char(v.termin_am at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI') as schluessel,
             jsonb_build_object('termin_am', v.termin_am) as daten
        from public.verkaufschancen v
       where e = 'lead.termin_gehabt' and v.geloescht_am is null and v.stufe = 'termin_vereinbart'
         and v.termin_am < now()
         and v.termin_am > now() - make_interval(days => coalesce((cfg ->> 'termin_gehabt_tage')::int, 30))
      union all
      select 'projekte', f.projekt_id, f.projekt_id || ':' || f.schluessel,
             jsonb_build_object('schritt', f.schluessel, 'schritt_de', f.name_de, 'schritt_fr', f.name_fr,
                                'phase', f.phase, 'bewilligung', f.bewilligung)
        from public.projekt_fahrplan f
       where e = 'projekt.schritt_erledigt' and f.stand = 'erledigt'
      union all
      select 'wartungsvertraege', w.id, w.id || ':' || w.naechste_wartung, jsonb_build_object('naechste_wartung', w.naechste_wartung)
        from public.wartungsvertraege w
       where e = 'wartung.faellig' and w.geloescht_am is null and w.status = 'aktiv' and w.naechste_wartung is not null
         and w.naechste_wartung <= heute + coalesce((cfg ->> 'wartung_vorlauf_tage')::int, 30)
      union all
      select 'rechnungen', x.id, x.id || ':' || x.mahnstufe, jsonb_build_object('mahnstufe', x.mahnstufe)
        from public.rechnungen x
       where e = 'rechnung.ueberfaellig' and x.geloescht_am is null and x.status in ('gestellt', 'teilbezahlt')
         and x.faellig_am < heute - coalesce((cfg ->> 'rechnung_karenz_tage')::int, 5)
         and (x.mahnfrist is null or x.mahnfrist < heute) and x.mahnstufe < 3
         and x.total_rappen - coalesce(x.bezahlt_rappen, 0) > 0
      union all
      select 'bestellungen', b.id, b.id::text, jsonb_build_object('bestellt_am', b.bestellt_am)
        from public.bestellungen b
       where e = 'bestellung.ohne_bestaetigung' and b.geloescht_am is null and b.status = 'bestellt'
         and b.bestaetigt_am is null and b.bestellt_am <= heute - coalesce((cfg ->> 'bestellung_bestaetigung_tage')::int, 3)
      union all
      select 'bestellungen', b.id, b.id || ':' || b.liefertermin, jsonb_build_object('liefertermin', b.liefertermin)
        from public.bestellungen b
       where e = 'bestellung.ueberfaellig' and b.geloescht_am is null and b.status in ('bestellt', 'teilgeliefert')
         and b.liefertermin < heute
      union all
      select null, null, to_char(heute, 'YYYY-MM'), jsonb_build_object('monat', to_char(heute, 'YYYY-MM'))
       where e = 'zeit.monatlich'
    loop
      if intern.automation_signal(e, r.tabelle, r.id, r.schluessel, r.daten, basis) and not basis then n := n + 1; end if;
    end loop;
    insert into intern.automation_durchsicht (ereignis) values (e)
    on conflict (ereignis) do update set zuletzt_am = now();
  end loop;
  return n;
end
$$;

-- Neue mitgelieferte Automationen (alle eingeschaltet, mit Freigabe: Mails warten im Ausgangskorb).
insert into public.automationen (vorlage, reihenfolge, name_de, name_fr, beschreibung_de, beschreibung_fr, aktiv, ausloeser,
                                 bedingungen, aktionen) values
('service_neu', 120,
 'Neuer Service-Fall: Eingangsbestätigung',
 'Nouveau cas de service : accusé de réception',
 'Sobald ein Service-Fall erfasst ist (nicht bei Wartungen), liegt eine Eingangsbestätigung mit der Fallnummer an den Kunden bereit.',
 'Dès qu’un cas de service est saisi (sauf entretiens), un accusé de réception avec le numéro du cas est prêt pour le client.',
 true, 'service.neu', '[{"feld": "service.kategorie", "op": "!=", "wert": "wartung"}]', $j$[
  {"art": "mail", "absender": ["zustaendig", "rolle:innendienst", "rolle:admin"],
   "betreff": {"de": "Ihre Meldung {Fall}: {Falltitel}", "fr": "Votre annonce {Fall} : {Falltitel}"},
   "text": {"de": "{Anrede}\n\nVielen Dank für Ihre Meldung. Wir haben sie unter der Nummer {Fall} erfasst und melden uns so rasch wie möglich bei Ihnen.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nMerci pour votre annonce. Nous l’avons enregistrée sous le numéro {Fall} et vous recontactons dans les meilleurs délais.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}}
 ]$j$),
('service_erledigt', 130,
 'Service-Fall erledigt: Abschluss an den Kunden',
 'Cas de service terminé : clôture au client',
 'Ist ein Service-Fall erledigt (nicht bei Wartungen), liegt eine kurze Abschlussmeldung an den Kunden bereit.',
 'Quand un cas de service est terminé (sauf entretiens), un bref message de clôture au client est prêt.',
 true, 'service.erledigt', '[{"feld": "service.kategorie", "op": "!=", "wert": "wartung"}]', $j$[
  {"art": "mail", "absender": ["zustaendig", "rolle:innendienst", "rolle:admin"],
   "betreff": {"de": "Ihre Meldung {Fall} ist erledigt", "fr": "Votre annonce {Fall} est traitée"},
   "text": {"de": "{Anrede}\n\nIhre Meldung «{Falltitel}» ({Fall}) ist erledigt. Sollte noch etwas nicht stimmen, antworten Sie einfach auf diese Mail.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nVotre annonce « {Falltitel} » ({Fall}) est traitée. Si quelque chose ne fonctionne pas encore, répondez simplement à cet e-mail.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}}
 ]$j$),
('rapport_rechnung', 140,
 'Rapport nach Aufwand: Rechnungsentwurf',
 'Rapport payant : brouillon de facture',
 'Ist ein Service- oder Wartungs-Rapport «kostenpflichtig» abgeschlossen, entsteht ein Rechnungsentwurf mit Stunden, Material und Nachträgen, und die Buchhaltung bekommt eine Meldung.',
 'Quand un rapport de service ou d’entretien « payant » est clôturé, un brouillon de facture avec heures, matériel et suppléments est créé et la comptabilité est avertie.',
 true, 'rapport.abgeschlossen', '[{"feld": "rapport.verrechnung", "op": "=", "wert": "kostenpflichtig"}]', $j$[
  {"art": "rechnung_entwurf"},
  {"art": "benachrichtigung", "an": ["rolle:buchhaltung", "rolle:admin"],
   "titel": {"de": "Rechnungsentwurf aus Rapport {Rapport}", "fr": "Brouillon de facture du rapport {Rapport}"},
   "text": {"de": "{Name}: bitte prüfen und stellen.", "fr": "{Name} : merci de vérifier et d’émettre."}}
 ]$j$),
('bestellung_bestaetigung', 150,
 'Bestellung ohne Auftragsbestätigung: nachfragen',
 'Commande sans confirmation : relancer',
 'Ist eine Bestellung seit 3 Tagen bestellt und keine Auftragsbestätigung eingetragen, liegt eine Nachfrage an den Lieferanten bereit.',
 'Si une commande est passée depuis 3 jours sans confirmation saisie, une relance au fournisseur est prête.',
 true, 'bestellung.ohne_bestaetigung', '[]', $j$[
  {"art": "mail", "absender": ["zustaendig", "rolle:innendienst", "rolle:admin"],
   "betreff": {"de": "Bestellung {Bestellung}: Auftragsbestätigung", "fr": "Commande {Bestellung} : confirmation de commande"},
   "text": {"de": "Guten Tag\n\nZu unserer Bestellung {Bestellung} haben wir noch keine Auftragsbestätigung erhalten. Dürfen wir Sie um die Bestätigung mit Liefertermin bitten?\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "Bonjour\n\nNous n’avons pas encore reçu de confirmation pour notre commande {Bestellung}. Pourriez-vous nous l’envoyer avec la date de livraison ?\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}}
 ]$j$),
('bestellung_ueberfaellig', 160,
 'Lieferung überfällig: nachfragen und melden',
 'Livraison en retard : relancer et avertir',
 'Ist der Liefertermin einer Bestellung vorbei und nicht alles geliefert, liegt eine Nachfrage an den Lieferanten bereit und die zuständige Person bekommt eine Meldung.',
 'Si la date de livraison est dépassée et que tout n’est pas livré, une relance au fournisseur est prête et la personne responsable est avertie.',
 true, 'bestellung.ueberfaellig', '[]', $j$[
  {"art": "benachrichtigung", "stufe": "warnung", "an": ["zustaendig", "rolle:innendienst", "rolle:admin"],
   "titel": {"de": "Lieferung überfällig: {Bestellung}", "fr": "Livraison en retard : {Bestellung}"},
   "text": {"de": "{Name}, Liefertermin {Liefertermin}. Betrifft Projekt {Projekt}.", "fr": "{Name}, livraison prévue le {Liefertermin}. Projet {Projekt}."}},
  {"art": "mail", "absender": ["zustaendig", "rolle:innendienst", "rolle:admin"],
   "betreff": {"de": "Bestellung {Bestellung}: Liefertermin", "fr": "Commande {Bestellung} : date de livraison"},
   "text": {"de": "Guten Tag\n\nDie Lieferung zu unserer Bestellung {Bestellung} war auf den {Liefertermin} vorgesehen und ist noch nicht vollständig bei uns. Bitte teilen Sie uns den neuen Liefertermin mit.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "Bonjour\n\nLa livraison de notre commande {Bestellung} était prévue le {Liefertermin} et n’est pas encore complète. Merci de nous indiquer la nouvelle date de livraison.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}}
 ]$j$),
('bestellung_teillieferung', 170,
 'Teillieferung: Rest nachfragen',
 'Livraison partielle : relancer le solde',
 'Wird bei einer Bestellung nur ein Teil geliefert, liegt eine Nachfrage zum Rest an den Lieferanten bereit.',
 'Si une commande n’est livrée qu’en partie, une relance pour le solde est prête pour le fournisseur.',
 true, 'bestellung.teilgeliefert', '[]', $j$[
  {"art": "mail", "absender": ["zustaendig", "rolle:innendienst", "rolle:admin"],
   "betreff": {"de": "Bestellung {Bestellung}: offene Positionen", "fr": "Commande {Bestellung} : positions en suspens"},
   "text": {"de": "Guten Tag\n\nZu unserer Bestellung {Bestellung} haben wir eine Teillieferung erhalten. Wann dürfen wir mit dem Rest rechnen?\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "Bonjour\n\nNous avons reçu une livraison partielle pour notre commande {Bestellung}. Quand pouvons-nous compter sur le solde ?\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}}
 ]$j$)
on conflict (vorlage) do nothing;

-- Die internen Funktionen ruft nur die Datenbank selbst auf (Trigger, Zeitplan), nie die App.
do $$
declare
  f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'intern' and (p.proname like 'automation%' or p.proname like 'signal_%')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end
$$;
