-- Projekte & Montage (Modul-Prüfung 22A): nichts bleibt liegen. Zwei neue Zeit-Auslöser: Frist eines Fahrplan-Schritts
-- vorbei (z. B. Pronovo 30 Tage nach der Abnahme) und Material noch nicht bestellt, obwohl «bestellen bis» erreicht ist.
-- Dazu Vorlagen: Glocke und Aufgabe für beides, Übergabe (Monitoring und Dokumentation) nach der IBN als Aufgabe und,
-- wenn erledigt, eine Mail mit Freigabe an den Kunden. Nachfragen bei Gemeinde/Netzbetreiber deckt «Gesuch eingereicht».

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
                           'projekt.material_faellig', 'zeit.monatlich'] loop
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
('projekt_frist', 180,
 'Frist im Fahrplan überschritten: melden',
 'Délai du planning dépassé : avertir',
 'Ist die Frist eines Fahrplan-Schritts vorbei (z. B. Pronovo 30 Tage nach der Abnahme) und der Schritt nicht erledigt, bekommt die Projektleitung eine Aufgabe und eine Glocke. Eingereichte Gesuche überwacht «Gesuch eingereicht».',
 'Si le délai d’une étape du planning est dépassé (p. ex. Pronovo 30 jours après la réception) sans qu’elle soit faite, la direction de projet reçoit une tâche et une notification. Les demandes déposées sont suivies par « Demande déposée ».',
 true, 'projekt.frist_ueberfaellig', '[]', $j$[
  {"art": "aufgabe", "an": ["zustaendig", "rolle:projektleitung", "rolle:admin"], "faellig_tage": 0,
   "titel": {"de": "Frist vorbei: {Meilenstein} ({Projekt})", "fr": "Délai dépassé : {Meilenstein} ({Projekt})"},
   "text": {"de": "{Name}, {Ort}", "fr": "{Name}, {Ort}"}},
  {"art": "benachrichtigung", "stufe": "warnung", "an": ["zustaendig", "rolle:projektleitung", "rolle:admin"],
   "titel": {"de": "Frist vorbei: {Meilenstein}", "fr": "Délai dépassé : {Meilenstein}"},
   "text": {"de": "{Projekt} · {Name}", "fr": "{Projekt} · {Name}"}}
 ]$j$),
('projekt_material', 190,
 'Material nicht bestellt: Einkauf erinnern',
 'Matériel non commandé : rappeler aux achats',
 'Ist «bestellen bis» erreicht (Baubeginn minus Lieferfrist aus den Einstellungen Einkauf) und das Material noch nicht bestellt, bekommen Einkauf und Projektleitung eine Aufgabe und eine Glocke.',
 'Quand la date « commander avant » est atteinte (début des travaux moins le délai de livraison) et que le matériel n’est pas commandé, les achats et la direction de projet reçoivent une tâche et une notification.',
 true, 'projekt.material_faellig', '[]', $j$[
  {"art": "aufgabe", "an": ["rolle:innendienst", "rolle:projektleitung", "rolle:admin"], "faellig_tage": 0,
   "titel": {"de": "Material bestellen: {Projekt}", "fr": "Commander le matériel : {Projekt}"},
   "text": {"de": "{Name}, {Ort}: Baubeginn rückt näher, Material ist noch nicht bestellt (Einkauf › Zu bestellen).",
            "fr": "{Name}, {Ort} : le début des travaux approche, le matériel n’est pas commandé (Achats › À commander)."}},
  {"art": "benachrichtigung", "stufe": "warnung", "an": ["rolle:innendienst", "rolle:projektleitung", "rolle:admin"],
   "titel": {"de": "Material noch nicht bestellt: {Projekt}", "fr": "Matériel pas encore commandé : {Projekt}"},
   "text": {"de": "{Name}, {Ort}", "fr": "{Name}, {Ort}"}}
 ]$j$),
('projekt_uebergabe', 200,
 'Nach der IBN: Übergabe vorbereiten',
 'Après la MES : préparer la remise',
 'Ist die IBN erledigt und die Übergabe (Monitoring und Dokumentation) noch offen, bekommt die Projektleitung eine Aufgabe mit 5 Tagen Frist.',
 'Quand la MES est faite et la remise (monitoring et documentation) encore ouverte, la direction de projet reçoit une tâche à 5 jours.',
 true, 'projekt.schritt_erledigt', '[{"feld": "ereignis.schritt", "op": "=", "wert": "ibn"}]', $j$[
  {"art": "pruefen", "bedingungen": [{"feld": "projekt.schritte.uebergabe", "op": "!=", "wert": "erledigt"}]},
  {"art": "aufgabe", "an": ["zustaendig", "rolle:projektleitung", "rolle:admin"], "faellig_tage": 5,
   "titel": {"de": "Übergabe: Monitoring einrichten und Dokumentation senden ({Projekt})",
             "fr": "Remise : installer le monitoring et envoyer la documentation ({Projekt})"},
   "text": {"de": "Pläne, Datenblätter, Garantien und Seriennummern (Anlage), Zugang Monitoring.",
            "fr": "Plans, fiches techniques, garanties et numéros de série (installation), accès au monitoring."}}
 ]$j$),
('projekt_uebergabe_kunde', 210,
 'Übergabe erledigt: Unterlagen an den Kunden',
 'Remise faite : documents au client',
 'Ist der Schritt «Monitoring eingerichtet & Dokumentation übergeben» erledigt, liegt eine Abschluss-Mail an den Kunden bereit (Monitoring, Unterlagen aufbewahren, Wartung).',
 'Quand l’étape « Monitoring installé & documentation remise » est faite, un e-mail de clôture au client est prêt (monitoring, conserver les documents, maintenance).',
 true, 'projekt.schritt_erledigt', '[{"feld": "ereignis.schritt", "op": "=", "wert": "uebergabe"}]', $j$[
  {"art": "mail", "absender": ["zustaendig", "rolle:projektleitung", "rolle:admin"],
   "betreff": {"de": "Ihre Anlage {Projekt}: Unterlagen und Monitoring", "fr": "Votre installation {Projekt} : documents et monitoring"},
   "text": {"de": "{Anrede}\n\nIhre Anlage ist in Betrieb und die Dokumentation übergeben. Den Ertrag sehen Sie jederzeit im Monitoring. Bitte bewahren Sie die Unterlagen (Pläne, Datenblätter, Garantien) gut auf, sie sind bei einem Garantiefall wichtig. Für Wartung und Service sind wir gerne weiter für Sie da.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nVotre installation est en service et la documentation vous a été remise. Vous pouvez suivre la production à tout moment dans le monitoring. Merci de conserver soigneusement les documents (plans, fiches techniques, garanties), ils sont importants en cas de garantie. Pour l’entretien et le service, nous restons à votre disposition.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}}
 ]$j$)
on conflict (vorlage) do nothing;
