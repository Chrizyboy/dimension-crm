-- Zwei Google-Bewertungslinks (Chris, 1.11.2026): Deutschschweiz und Romandie. Welcher gilt, entscheidet die Sprache
-- des Kunden: Französisch → Romandie, sonst Deutschschweiz. Die Links sind öffentlich (kein Geheimnis).

update public.einstellungen
   set wert = wert || jsonb_build_object(
         'bewertung_link', coalesce(nullif(wert ->> 'bewertung_link', ''), 'https://g.page/r/CSr4lcSzxVyZECE/review'),
         'bewertung_link_fr', coalesce(nullif(wert ->> 'bewertung_link_fr', ''), 'https://g.page/r/CX32aDHYJBP4EAE/review'))
 where schluessel = 'automationen';

/** Bewertungslink in der Sprache des Kunden: eigener Link je Sprache (`bewertung_link_fr`), sonst `bewertung_link`. */
create or replace function intern.bewertung_link(p_sprache text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(trim(e.wert ->> ('bewertung_link_' || coalesce(p_sprache, 'de'))), ''),
                  nullif(trim(e.wert ->> 'bewertung_link'), ''))
    from public.einstellungen e where e.schluessel = 'automationen'
$$;
grant execute on function intern.bewertung_link(text) to authenticated;

CREATE OR REPLACE FUNCTION intern.automation_kontext(p_tabelle text, p_id uuid, p_daten jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    'Bewertungslink', coalesce(intern.bewertung_link(sprache), ''),
    'Meilenstein', coalesce(intern.zweisprachig(jsonb_build_object('de', p_daten ->> 'schritt_de',
                                                                   'fr', p_daten ->> 'schritt_fr'), sprache), ''));

  return b || jsonb_build_object(
    'tabelle', p_tabelle, 'id', p_id, 'titel', titel, 'ziel', intern.automation_ziel(p_tabelle, p_id),
    'kontakt', k, 'zustaendig', coalesce(z, '{}'), 'sprache', sprache,
    'standort', coalesce((select jsonb_build_object('id', s.id, 'kuerzel', s.kuerzel, 'name', s.name)
                            from public.standorte s where s.id = standort), '{}'),
    'ereignis', coalesce(p_daten, '{}'), 'heute', v_heute, 'platzhalter', ph);
end
$function$;

CREATE OR REPLACE FUNCTION public.bewertung_senden(p_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  b public.bewertungsanfragen;
  k public.kontakte;
  e jsonb := coalesce((select wert from public.einstellungen where schluessel = 'empfehlung'), '{}');
  link text;
  spr text;
  v_empf text := '';
  v_id uuid;
  ich uuid := intern.meine_person_id();
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'empfehlung.kein_recht'; end if;
  select * into b from public.bewertungsanfragen where id = p_id and geloescht_am is null for update;
  if not found or b.status <> 'bereit' then raise exception using errcode = 'P0001', message = 'empfehlung.nicht_bereit'; end if;
  select * into k from public.kontakte where id = b.kontakt_id;
  if coalesce(k.werbesperre, false) then raise exception using errcode = 'P0001', message = 'empfehlung.werbesperre'; end if;
  if k.email is null then raise exception using errcode = 'P0001', message = 'ausgang.empfaenger_fehlt'; end if;
  spr := coalesce(k.sprache, 'de');
  link := intern.bewertung_link(spr);
  if link is null then raise exception using errcode = 'P0001', message = 'empfehlung.kein_bewertungslink'; end if;
  if exists (select 1 from public.projekte where id = b.projekt_id and unterzeichnet_am is not null) then
    v_empf := intern.empfehlung_text(e #>> array['mail', spr, 'empfehlung'], jsonb_build_object(
      'Gutschrift', intern.chf_text(coalesce((e ->> 'gutschrift_rappen')::bigint, 0)),
      'Empfehlungslink', replace(coalesce(e ->> 'link', ''), '{Code}', public.empfehlungs_code(k.id))));
  end if;
  v_id := public.ausgang_anlegen(jsonb_build_object(
    'art', 'bewertung', 'an', k.email, 'sprache', spr, 'kontakt_id', k.id, 'projekt_id', b.projekt_id,
    'bezug_tabelle', 'bewertungsanfragen', 'bezug_id', b.id, 'schluessel', 'bewertung:' || b.id, 'freigeben', true,
    'betreff', e #>> array['mail', spr, 'betreff'],
    'text', intern.empfehlung_text(e #>> array['mail', spr, 'text'], jsonb_build_object(
      'Anrede', intern.anrede_text(k.vorname, k.nachname, spr), 'Bewertungslink', link, 'Empfehlung', v_empf,
      'Absender', coalesce((select name from public.personen where id = ich), '')))));
  update public.bewertungsanfragen set status = 'gesendet', ausgang_id = v_id, entschieden_von = ich, entschieden_am = now()
   where id = p_id;
  return v_id;
end
$function$;
