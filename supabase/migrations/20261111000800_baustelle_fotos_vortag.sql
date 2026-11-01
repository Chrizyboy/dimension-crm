-- Einsatzplanung & Rapporte (Modul-Prüfung 23A):
-- 1. Pflichtfotos je Rapport-Art (Service: vorher, nachher, Typenschild; Montage: Dach, Wechselrichter, Zähler).
--    Die Liste ist Daten in einstellungen.baustelle, die Kategorie steht am Dokument.
-- 2. «Stopp vergessen?»: läuft eine Zeit länger als eingestellt (Standard 10 Std.), bekommt die Person eine Glocke.
-- 3. Am Vortag ab 16:00: SMS an den Kunden für Montage und Service-Termin (über den Ausgangskorb, mit Freigabe).
-- 4. Service- oder Wartungs-Rapport abgeschlossen: Aufgabe «Rapport an Kunde senden» (PDF und Mail mit einem Klick).

alter table public.dokumente add column if not exists kategorie text;
comment on column public.dokumente.kategorie is 'Art des Fotos im Rapport (z. B. vorher, typenschild), für die Pflichtfotos.';

insert into public.einstellungen (schluessel, wert) values ('baustelle', $j${
  "stopp_vergessen_stunden": 10,
  "pflichtfotos": {
    "service": [{"schluessel": "vorher", "de": "Vorher", "fr": "Avant"},
                {"schluessel": "nachher", "de": "Nachher", "fr": "Après"},
                {"schluessel": "typenschild", "de": "Typenschild", "fr": "Plaque signalétique"}],
    "montage": [{"schluessel": "dach", "de": "Dach", "fr": "Toit"},
                {"schluessel": "wechselrichter", "de": "Wechselrichter", "fr": "Onduleur"},
                {"schluessel": "zaehler", "de": "Zähler", "fr": "Compteur"}],
    "wartung": [],
    "ibn": []
  }
}$j$)
on conflict (schluessel) do nothing;

alter table public.zeiten add column if not exists erinnert_am timestamptz;

/**
 * Durchsicht für den Zeitplan (stündlich): laufende Zeiten über der eingestellten Dauer melden, einmal je Zeit.
 * Nur intern (Glocke mit Popup an die Person selbst). Gibt die Zahl der Meldungen zurück.
 */
create or replace function public.zeiten_vergessen_melden() returns int
language plpgsql security definer set search_path = '' as $$
declare
  stunden numeric := coalesce(((select wert from public.einstellungen where schluessel = 'baustelle') ->> 'stopp_vergessen_stunden')::numeric, 10);
  n int;
begin
  with offen as (
    update public.zeiten z set erinnert_am = now()
     where z.stopp is null and z.geloescht_am is null and z.erinnert_am is null
       and z.start < now() - make_interval(secs => (stunden * 3600)::int)
    returning z.id, z.person_id, z.start
  ), glocke as (
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
    select o.person_id, 'warnung', 'Stopp vergessen?', 'Oubli d’arrêter le temps ?',
           'Deine Zeit läuft seit ' || to_char(o.start at time zone 'Europe/Zurich', 'DD.MM. HH24:MI') || ' Uhr. Bitte stoppen oder korrigieren.',
           'Ton temps tourne depuis le ' || to_char(o.start at time zone 'Europe/Zurich', 'DD.MM. HH24"h"MI') || '. Merci d’arrêter ou de corriger.',
           '/fieldwork?reiter=zeiten', true
      from offen o
    returning 1
  )
  select count(*) into n from glocke;
  return n;
end
$$;
revoke execute on function public.zeiten_vergessen_melden() from public, anon, authenticated;
grant execute on function public.zeiten_vergessen_melden() to service_role;

create or replace function intern.automationen_durchsehen(p_sofort boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
                           'bestellung.ohne_bestaetigung', 'bestellung.ueberfaellig', 'projekt.frist_ueberfaellig',
                           'projekt.material_faellig', 'einsatz.morgen', 'service.termin_morgen',
                           'zeit.monatlich'] loop
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
      -- Frist eines Schritts vorbei; Eingereichtes überwacht schon «Gesuch eingereicht» (wartet auf die Behörde).
      select 'projekte', f.projekt_id, f.projekt_id || ':' || f.schluessel || ':' || f.frist,
             jsonb_build_object('schritt', f.schluessel, 'schritt_de', f.name_de, 'schritt_fr', f.name_fr,
                                'phase', f.phase, 'frist', f.frist)
        from public.projekt_fahrplan f join public.projekte p on p.id = f.projekt_id
       where e = 'projekt.frist_ueberfaellig' and f.ueberfaellig and f.eingereicht_am is null
         and p.geloescht_am is null and p.status not in ('abgeschlossen', 'storniert')
      union all
      -- Material noch nicht bestellt, aber «bestellen bis» (Baubeginn minus Lieferfrist) erreicht.
      select 'projekte', p.id, p.id || ':material:' || p.baubeginn,
             jsonb_build_object('schritt', 'material', 'schritt_de', 'Material bestellen', 'schritt_fr', 'Commander le matériel',
                                'baubeginn', p.baubeginn)
        from public.projekte p
       where e = 'projekt.material_faellig' and p.geloescht_am is null and p.status not in ('abgeschlossen', 'storniert')
         and p.baubeginn is not null and coalesce(p.material_status, '') not in ('bestellt', 'lager')
         and p.baubeginn - coalesce(((select wert from public.einstellungen where schluessel = 'einkauf') ->> 'lieferfrist_tage')::int, 14) <= heute
         and p.baubeginn >= heute
      union all
      -- Montage morgen: ab 16:00 am Vortag (wie die SMS-Erinnerung der Verkaufstermine), einmal je Einsatz und Tag.
      select 'projekte', e2.projekt_id, e2.id || ':' || e2.von,
             jsonb_build_object('einsatz_id', e2.id, 'von', e2.von, 'schritt_de', 'Montage', 'schritt_fr', 'Montage')
        from public.einsaetze e2 join public.projekte p on p.id = e2.projekt_id
       where e = 'einsatz.morgen' and e2.geloescht_am is null and p.geloescht_am is null
         and p.status not in ('abgeschlossen', 'storniert') and e2.von = heute + 1
         and (now() at time zone 'Europe/Zurich')::time >= coalesce(
               (select (wert ->> 'uhrzeit')::time from public.einstellungen where schluessel = 'sms_erinnerung'), '16:00')
      union all
      select 'service_faelle', s.id, s.id || ':' || (s.termin_am at time zone 'Europe/Zurich')::date,
             jsonb_build_object('termin_am', s.termin_am)
        from public.service_faelle s
       where e = 'service.termin_morgen' and s.geloescht_am is null and s.status <> 'erledigt'
         and (s.termin_am at time zone 'Europe/Zurich')::date = heute + 1
         and (now() at time zone 'Europe/Zurich')::time >= coalesce(
               (select (wert ->> 'uhrzeit')::time from public.einstellungen where schluessel = 'sms_erinnerung'), '16:00')
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
$function$;

create or replace function public.automation_katalog()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
      jsonb_build_object('schluessel', 'projekt.frist_ueberfaellig', 'tabelle', 'projekte', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'projekt.material_faellig', 'tabelle', 'projekte', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'einsatz.morgen', 'tabelle', 'projekte', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'service.termin_morgen', 'tabelle', 'service_faelle', 'art', 'zeit'),
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
$function$;

insert into public.automationen (vorlage, reihenfolge, name_de, name_fr, beschreibung_de, beschreibung_fr, aktiv, ausloeser,
                                 bedingungen, aktionen) values
('montage_vortag', 220,
 'Montage morgen: SMS an den Kunden',
 'Montage demain : SMS au client',
 'Am Vortag ab 16:00 liegt für jede Montage eine kurze SMS an den Kunden bereit (Uhrzeit wie die SMS-Erinnerung).',
 'La veille dès 16h, un court SMS au client est prêt pour chaque montage (heure comme le rappel SMS).',
 true, 'einsatz.morgen', '[]', $j$[
  {"art": "sms", "absender": ["zustaendig", "rolle:projektleitung", "rolle:admin"],
   "text": {"de": "Dimension Solaire: Morgen sind wir für die Montage Ihrer Anlage bei Ihnen. Bei Fragen melden Sie sich gerne. Danke!",
            "fr": "Dimension Solaire : demain, nous serons chez vous pour le montage de votre installation. N’hésitez pas à nous contacter en cas de question. Merci !"}}
 ]$j$),
('service_vortag', 230,
 'Service-Termin morgen: SMS an den Kunden',
 'Intervention demain : SMS au client',
 'Am Vortag ab 16:00 liegt für jeden Service- oder Wartungstermin eine kurze SMS an den Kunden bereit.',
 'La veille dès 16h, un court SMS au client est prêt pour chaque intervention de service ou d’entretien.',
 true, 'service.termin_morgen', '[]', $j$[
  {"art": "sms", "absender": ["zustaendig", "rolle:innendienst", "rolle:admin"],
   "text": {"de": "Dimension Solaire: Morgen kommt unser Techniker zu Ihnen ({Fall}). Bei Verhinderung bitte kurz melden. Danke!",
            "fr": "Dimension Solaire : notre technicien passera chez vous demain ({Fall}). En cas d’empêchement, merci de nous prévenir."}}
 ]$j$),
('rapport_kunde', 240,
 'Rapport abgeschlossen: PDF an den Kunden',
 'Rapport clôturé : PDF au client',
 'Ist ein Service- oder Wartungs-Rapport abgeschlossen, bekommt der Innendienst eine Aufgabe, das Rapport-PDF zu senden (in der Akte «An Kunde senden»: PDF und Mail sind vorbereitet).',
 'Quand un rapport de service ou d’entretien est clôturé, le service interne reçoit une tâche pour envoyer le PDF (dans le dossier « Envoyer au client » : PDF et e-mail sont préparés).',
 true, 'rapport.abgeschlossen', '[{"feld": "rapport.art", "op": "in", "wert": ["service", "wartung"]}]', $j$[
  {"art": "aufgabe", "an": ["rolle:innendienst", "rolle:admin"], "faellig_tage": 1,
   "titel": {"de": "Rapport {Rapport} an den Kunden senden", "fr": "Envoyer le rapport {Rapport} au client"},
   "text": {"de": "{Name}: in der Akte «An Kunde senden».", "fr": "{Name} : dans le dossier « Envoyer au client »."}}
 ]$j$)
on conflict (vorlage) do nothing;
