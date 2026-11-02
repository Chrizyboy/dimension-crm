-- Wartungsverträge nach den Paketen der Website (Wunsch Chris 02.11.2026, «Wartungsverträge 2026» auf
-- dimension-solaire.ch, DE und FR): Essentiel, Comfort, Premium; Preis nach Anlagengrösse, exkl. MWST;
-- Bedingungen 3 Jahre + 1 Jahr automatisch, Kündigung 3 Monate vorher, Rechnung jährlich im Voraus.
-- Pakete, Preise und Texte sind Daten (Regel 8) in der Einstellung «wartung_pakete», nur Administration.

insert into public.einstellungen (schluessel, wert) values ('wartung_pakete', $json$
{
  "stand": "2026",
  "stufen_kwp": [20, 50, 100],
  "pakete": [
    {
      "id": "essentiel", "name": "Essentiel",
      "art": {"de": "Überwachen", "fr": "Surveiller"},
      "satz": {"de": "Wir behalten Ihre Anlage rund um die Uhr im Blick.", "fr": "Nous gardons un œil sur votre installation, 24 h sur 24."},
      "inspektion_monate": null, "messung": false, "rabatt_prozent": 0, "kleinreparatur_rappen": 0,
      "preise_rappen": [14900, 19900, 29000],
      "leistungen": [
        {"de": "Fernüberwachung 24/7 von Wechselrichter und Batteriespeicher über das Monitoring-Portal", "fr": "Surveillance à distance 24/7 de l’onduleur et de la batterie via le portail de monitoring"},
        {"de": "Störungsmeldung mit Erstdiagnose und Empfehlung innert 2 Werktagen", "fr": "Alerte de panne avec diagnostic et recommandation sous 2 jours ouvrables"},
        {"de": "Support per Telefon und E-Mail", "fr": "Support par téléphone et e-mail"},
        {"de": "Jährlicher Ertragsbericht", "fr": "Rapport de production annuel"},
        {"de": "Einsätze vor Ort nach Aufwand, Anfahrt verrechnet", "fr": "Interventions sur place facturées en régie, déplacement facturé"}
      ]
    },
    {
      "id": "comfort", "name": "Comfort", "empfohlen": true,
      "art": {"de": "Kontrollieren", "fr": "Contrôler"},
      "satz": {"de": "Überwachung plus regelmässige Kontrolle vor Ort.", "fr": "La surveillance, plus un contrôle régulier sur place."},
      "inspektion_monate": 24, "messung": false, "rabatt_prozent": 5, "kleinreparatur_rappen": 0,
      "preise_rappen": [34900, 44900, 65000],
      "leistungen": [
        {"de": "Fernüberwachung 24/7 von Wechselrichter und Batteriespeicher über das Monitoring-Portal", "fr": "Surveillance à distance 24/7 de l’onduleur et de la batterie via le portail de monitoring"},
        {"de": "Störungsmeldung mit Erstdiagnose und Empfehlung innert 2 Werktagen", "fr": "Alerte de panne avec diagnostic et recommandation sous 2 jours ouvrables"},
        {"de": "Support per Telefon und E-Mail", "fr": "Support par téléphone et e-mail"},
        {"de": "Jährlicher Ertragsbericht", "fr": "Rapport de production annuel"},
        {"de": "Überprüfung und Optimierung der Speicher-Einstellungen", "fr": "Contrôle et optimisation des réglages de la batterie"},
        {"de": "Inspektion vor Ort alle 2 Jahre", "fr": "Inspection sur place tous les 2 ans"},
        {"de": "Sichtkontrolle Module, Unterkonstruktion, Kabel und Steckverbinder", "fr": "Contrôle visuel modules, structure, câbles et connecteurs"},
        {"de": "Check Wechselrichter und Speicher, Fehlerspeicher, Firmware-Update", "fr": "Contrôle onduleur et batterie, journal d’erreurs, firmware"},
        {"de": "Kontrolle Überspannungsschutz, Anlagenschalter, Klemmstellen", "fr": "Contrôle protection surtensions, sectionneur, bornes"},
        {"de": "Reinigung der Lüfter und Filter am Wechselrichter", "fr": "Nettoyage des ventilateurs et filtres de l’onduleur"},
        {"de": "Wartungsprotokoll", "fr": "Protocole de maintenance"},
        {"de": "Einsätze vor Ort bei Störungen nach Aufwand, Anfahrt verrechnet", "fr": "Interventions sur place en cas de panne en régie, déplacement facturé"},
        {"de": "5 % Rabatt auf Regiearbeiten, Reinigung und Thermografie", "fr": "5 % de rabais sur travaux en régie, nettoyage et thermographie"}
      ]
    },
    {
      "id": "premium", "name": "Premium",
      "art": {"de": "Sorglos", "fr": "Sans souci"},
      "satz": {"de": "Volle Betreuung mit jährlicher Messung und Vorrang.", "fr": "Un suivi complet, avec mesures annuelles et priorité."},
      "inspektion_monate": 12, "messung": true, "rabatt_prozent": 10, "kleinreparatur_rappen": 10000,
      "preise_rappen": [54900, 69000, 95000],
      "leistungen": [
        {"de": "Fernüberwachung 24/7 von Wechselrichter und Batteriespeicher über das Monitoring-Portal", "fr": "Surveillance à distance 24/7 de l’onduleur et de la batterie via le portail de monitoring"},
        {"de": "Störungsmeldung mit Erstdiagnose und Empfehlung innert 1 Werktag", "fr": "Alerte de panne avec diagnostic et recommandation sous 1 jour ouvrable"},
        {"de": "Support per Telefon und E-Mail", "fr": "Support par téléphone et e-mail"},
        {"de": "Jährlicher Ertragsbericht", "fr": "Rapport de production annuel"},
        {"de": "Überprüfung und Optimierung der Speicher-Einstellungen", "fr": "Contrôle et optimisation des réglages de la batterie"},
        {"de": "Jährliche Inspektion vor Ort", "fr": "Inspection annuelle sur place"},
        {"de": "Sichtkontrolle Module, Unterkonstruktion, Kabel und Steckverbinder", "fr": "Contrôle visuel modules, structure, câbles et connecteurs"},
        {"de": "Check Wechselrichter und Speicher, Fehlerspeicher, Firmware-Update", "fr": "Contrôle onduleur et batterie, journal d’erreurs, firmware"},
        {"de": "Kontrolle Überspannungsschutz, Anlagenschalter, Klemmstellen", "fr": "Contrôle protection surtensions, sectionneur, bornes"},
        {"de": "Reinigung der Lüfter und Filter am Wechselrichter", "fr": "Nettoyage des ventilateurs et filtres de l’onduleur"},
        {"de": "Elektrische Messungen nach SN EN 62446-1 (Isolation, Uoc, Isc)", "fr": "Mesures électriques selon SN EN 62446-1 (isolation, Uoc, Isc)"},
        {"de": "Messprotokoll mit Vorjahresvergleich", "fr": "Protocole de mesure comparé à l’an passé"},
        {"de": "Einsatz vor Ort bei Störungen innert 2 Werktagen, Anfahrt inklusive", "fr": "Intervention sur place en cas de panne sous 2 jours ouvrables, déplacement inclus"},
        {"de": "Kleinreparaturen inkl. Material bis CHF 100 pro Jahr", "fr": "Petites réparations, matériel inclus, jusqu’à CHF 100 par an"},
        {"de": "10 % Rabatt auf Regiearbeiten, Reinigung und Thermografie", "fr": "10 % de rabais sur travaux en régie, nettoyage et thermographie"}
      ]
    }
  ],
  "zusatz": [
    {"id": "bestandsaufnahme", "de": "Bestandsaufnahme Fremdanlage (einmalig)", "fr": "État des lieux installation tierce (unique)", "rappen": 29000},
    {"id": "anlagecheck", "de": "Anlagecheck ohne Vertrag (einmalig, bis 20 kWp)", "fr": "Contrôle sans contrat (unique, jusqu’à 20 kWc)", "rappen": 49000},
    {"id": "thermografie", "de": "Thermografie der Module", "fr": "Thermographie des modules", "rappen": null},
    {"id": "reinigung", "de": "Professionelle Modulreinigung", "fr": "Nettoyage professionnel des modules", "rappen": null}
  ],
  "bedingungen": {
    "mindestlaufzeit_jahre": 3, "verlaengerung_jahre": 1, "kuendigung_monate": 3,
    "zahlungsfrist_tage": 30, "rechnung_vorlauf_tage": 30, "ankuendigung_tage": 14,
    "bestandsaufnahme_ab_jahren": 2
  },
  "texte": {
    "de": [
      {"titel": "Laufzeit und Kündigung", "text": "Mindestlaufzeit 3 Jahre ab Vertragsbeginn. Danach verlängert sich der Vertrag automatisch um jeweils 1 Jahr, sofern er nicht 3 Monate vor Ablauf schriftlich gekündigt wird."},
      {"titel": "Preise und Zahlung", "text": "Alle Preise in CHF, exkl. MWST. Die Rechnung wird jährlich im Voraus gestellt, zahlbar innert 30 Tagen. Preisanpassungen werden mindestens 3 Monate im Voraus angekündigt."},
      {"titel": "Fremdanlagen", "text": "Wir betreuen auch Anlagen anderer Installateure. Bei Fremdanlagen oder Anlagen älter als 2 Jahre ist vor Vertragsbeginn eine Bestandsaufnahme nötig."},
      {"titel": "Termine und Zugang", "text": "Inspektionen werden mindestens 2 Wochen im Voraus angekündigt. Der Kunde gewährt Zugang zu Wechselrichter, Speicher und Dach. Arbeiten am Dach erfolgen nur bei sicherem Zugang."},
      {"titel": "Nicht enthalten", "text": "Modulreinigung, Ersatz von Komponenten (z. B. Wechselrichter), Gerüst- und Dacharbeiten sowie Schäden durch Hagel, Sturm, Blitz, Vandalismus oder Eingriffe Dritter. Grössere Reparaturen werden vorab offeriert."},
      {"titel": "Garantie und Versicherung", "text": "Herstellergarantien bleiben unberührt; wir unterstützen Sie bei der Abwicklung. Elementarschäden sind über die Gebäude- oder Sachversicherung abzudecken."},
      {"titel": "Voraussetzung", "text": "Internetverbindung der Anlage (LAN/WLAN). Batteriespeicher inbegriffen."}
    ],
    "fr": [
      {"titel": "Durée et résiliation", "text": "Durée minimale de 3 ans dès le début du contrat. Le contrat se renouvelle ensuite tacitement d’année en année, sauf résiliation écrite 3 mois avant son échéance."},
      {"titel": "Prix et paiement", "text": "Tous les prix en CHF, hors TVA. La facture est établie annuellement à l’avance, payable à 30 jours. Toute adaptation de prix est annoncée au moins 3 mois à l’avance."},
      {"titel": "Installations tierces", "text": "Nous entretenons aussi les installations d’autres installateurs. Pour celles-ci, ou pour les installations de plus de 2 ans, un état des lieux est nécessaire avant le début du contrat."},
      {"titel": "Rendez-vous et accès", "text": "Les inspections sont annoncées au moins 2 semaines à l’avance. Le client garantit l’accès à l’onduleur, à la batterie et au toit. Les travaux sur le toit ne sont réalisés que si l’accès est sûr."},
      {"titel": "Non compris", "text": "Nettoyage des modules, remplacement de composants (p. ex. onduleur), échafaudages et travaux de toiture, ainsi que les dommages dus à la grêle, à la tempête, à la foudre, au vandalisme ou à l’intervention de tiers. Les réparations importantes font l’objet d’un devis préalable."},
      {"titel": "Garantie et assurance", "text": "Les garanties des fabricants restent inchangées ; nous vous accompagnons dans les démarches. Les dommages naturels doivent être couverts par l’assurance bâtiment ou choses."},
      {"titel": "Condition", "text": "Installation connectée à Internet (LAN/Wi-Fi). Batterie de stockage incluse."}
    ]
  }
}
$json$::jsonb) on conflict (schluessel) do nothing;

-- Pakete und Preise ändert nur die Administration (eigener Trigger, siehe 20261110001020).
create or replace function intern.wartung_einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'wartung_pakete' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'einstellungen.kein_recht';
  end if;
  return new;
end
$$;
create trigger wartung_schuetzen before insert or update on public.einstellungen
  for each row execute function intern.wartung_einstellung_schuetzen();

-- Neue Angaben am Vertrag: Paket, Anlage (wie im Auftragsformular der Website), Preis exkl. MWST,
-- Bestandsaufnahme, Kündigung und bis wann verrechnet ist.
alter table public.wartungsvertraege
  add column if not exists paket text,
  add column if not exists anlage_kwp numeric(8, 2),
  add column if not exists speicher_kwh numeric(8, 2),
  add column if not exists ibn_jahr int,
  add column if not exists wechselrichter text,
  add column if not exists anlage_ort text,
  add column if not exists fremdanlage boolean not null default false,
  add column if not exists preis_netto_rappen int,
  add column if not exists tarif_netto_rappen int,
  add column if not exists bestandsaufnahme text not null default 'keine'
    check (bestandsaufnahme in ('keine', 'verrechnen', 'verrechnet', 'erlassen')),
  add column if not exists gekuendigt_am date,
  add column if not exists gekuendigt_per date,
  add column if not exists verrechnet_bis date;
comment on column public.wartungsvertraege.paket is 'essentiel | comfort | premium aus einstellungen.wartung_pakete; null = alter Vertrag mit eigenen Leistungen.';
comment on column public.wartungsvertraege.preis_netto_rappen is 'Jahrespreis exkl. MWST in Rappen (Tarif der Website); preis_rappen ist daraus inkl. MWST.';
comment on column public.wartungsvertraege.tarif_netto_rappen is 'Tarif der Website beim Abschluss (exkl. MWST); weicht preis_netto_rappen ab, ist es ein Rabatt.';
comment on column public.wartungsvertraege.verrechnet_bis is 'Letzter Tag des Vertragsjahrs, für das schon eine Rechnung besteht.';

/** Stufe 0..2 nach Anlagengrösse (bis 20, 20–50, 50–100 kWp) oder null (darüber: auf Anfrage). */
create or replace function intern.wartung_stufe(p_kwp numeric) returns int
language sql stable security definer set search_path = '' as $$
  select (select min(i - 1)::int
            from jsonb_array_elements_text((select wert -> 'stufen_kwp' from public.einstellungen
                                             where schluessel = 'wartung_pakete')) with ordinality as s(bis, i)
           where coalesce(p_kwp, 0) <= s.bis::numeric)
$$;

/** Tarif eines Pakets für eine Anlagengrösse in Rappen exkl. MWST, null = auf Anfrage oder unbekannt. */
create or replace function public.wartung_tarif(p_paket text, p_kwp numeric) returns int
language sql stable security definer set search_path = '' as $$
  select (p.paket -> 'preise_rappen' ->> intern.wartung_stufe(p_kwp))::int
    from public.einstellungen e, jsonb_array_elements(e.wert -> 'pakete') as p(paket)
   where e.schluessel = 'wartung_pakete' and p.paket ->> 'id' = p_paket
$$;
grant execute on function public.wartung_tarif(text, numeric) to authenticated;

/**
 * Nummer, Paket-Regeln und Preis. Paket gesetzt: Rhythmus aus dem Paket (Essentiel ohne Inspektion), Tarif der
 * Website festhalten; der Preis ist der Tarif, ausser jemand gibt einen Rabattpreis ein (Entscheid Chris 1B:
 * Tarif als Vorschlag, Abweichung markiert). Preis inkl. MWST (preis_rappen, für Liste und alte Rechnungen)
 * folgt daraus, auf 5 Rappen gerundet.
 */
create or replace function intern.wartung_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_paket jsonb;
  v_tarif int;
begin
  if coalesce(new.nummer, '') = '' then
    new.nummer := 'W' || lpad(nextval('intern.wartung_nummer')::text, 3, '0');
  end if;
  if new.paket is not null then
    select p into v_paket from public.einstellungen e, jsonb_array_elements(e.wert -> 'pakete') p
     where e.schluessel = 'wartung_pakete' and p ->> 'id' = new.paket;
    if v_paket is null then raise exception using errcode = 'P0001', message = 'wartung.paket_unbekannt'; end if;
    new.rhythmus_monate := nullif(v_paket ->> 'inspektion_monate', '')::int;
    if tg_op = 'INSERT' or new.paket is distinct from old.paket or new.anlage_kwp is distinct from old.anlage_kwp then
      v_tarif := public.wartung_tarif(new.paket, new.anlage_kwp);
      new.tarif_netto_rappen := v_tarif;
      if new.preis_netto_rappen is null then new.preis_netto_rappen := v_tarif; end if;
      if tg_op = 'INSERT' or new.paket is distinct from old.paket then
        new.naechste_wartung := null;
      end if;
    end if;
    -- Rückdatierter Vertrag (z. B. aus dem alten CRM): frühere Vertragsjahre sind dort verrechnet, die erste
    -- Jahresrechnung gilt dem laufenden Vertragsjahr, damit der Zeitplan keine alten Jahre nachträgt.
    if new.start_am is not null and new.start_am < current_date and new.verrechnet_bis is null
       and (tg_op = 'INSERT' or old.paket is null) then
      new.verrechnet_bis := ((public.wartung_laeuft_bis(new.start_am, 1, current_date) + 1)
                             - interval '1 year')::date - 1;
    end if;
  end if;
  if new.preis_netto_rappen is not null then
    new.preis_rappen := public.runde_5_rappen(new.preis_netto_rappen * (1 + public.mwst_satz() / 100));
  end if;
  if new.naechste_wartung is null and new.start_am is not null and new.status = 'aktiv'
     and (new.paket is null or new.rhythmus_monate is not null) then
    new.naechste_wartung := (new.start_am + make_interval(months => coalesce(new.rhythmus_monate, 12)))::date;
  end if;
  if new.paket is not null and new.rhythmus_monate is null then new.naechste_wartung := null; end if;
  return new;
end
$$;

/** Wartung durchgeführt; ohne Rhythmus (Essentiel) gibt es keine nächste Inspektion. */
create or replace function public.wartung_erledigt(p_id uuid, p_am date default current_date, p_notiz text default null)
returns date
language plpgsql security invoker set search_path = '' as $$
declare
  v_naechste date;
begin
  update public.wartungsvertraege
     set letzte_wartung = p_am,
         naechste_wartung = case when paket is not null and rhythmus_monate is null then null
                                 else (p_am + make_interval(months => coalesce(rhythmus_monate, 12)))::date end,
         verlauf = verlauf || jsonb_build_array(jsonb_build_object('am', p_am, 'person_id', intern.meine_person_id(),
                                                                  'notiz', nullif(trim(p_notiz), '')))
   where id = p_id and geloescht_am is null and status = 'aktiv'
  returning naechste_wartung into v_naechste;
  if not found then raise exception using errcode = 'P0001', message = 'wartung.nicht_aktiv'; end if;
  return v_naechste;
end
$$;

/**
 * Ende des Vertragsjahrs, das am Stichtag läuft: Mindestlaufzeit, danach jeweils +1 Jahr (Bedingungen der
 * Website). Gekündigt: das Kündigungsdatum.
 */
create or replace function public.wartung_laeuft_bis(p_start date, p_jahre int, p_stichtag date default current_date)
returns date
language plpgsql immutable set search_path = '' as $$
declare
  v_ende date;
  v_n int := greatest(coalesce(p_jahre, 3), 1);
begin
  if p_start is null then return null; end if;
  v_ende := (p_start + make_interval(years => v_n))::date - 1;
  while v_ende < p_stichtag loop
    v_n := v_n + 1;
    v_ende := (p_start + make_interval(years => v_n))::date - 1;
  end loop;
  return v_ende;
end
$$;
grant execute on function public.wartung_laeuft_bis(date, int, date) to authenticated;

/**
 * Kündigung erfassen (Eingang am p_am): Der Vertrag endet am ersten Ablauf, der mindestens 3 Monate nach
 * dem Eingang liegt. Bis dahin bleiben Inspektionen und Rechnungen bestehen.
 */
create or replace function public.wartung_kuendigen(p_id uuid, p_am date default current_date) returns date
language plpgsql security invoker set search_path = '' as $$
declare
  w public.wartungsvertraege;
  v_monate int := coalesce((select (wert -> 'bedingungen' ->> 'kuendigung_monate')::int from public.einstellungen
                             where schluessel = 'wartung_pakete'), 3);
  v_per date;
begin
  select * into w from public.wartungsvertraege where id = p_id and geloescht_am is null for update;
  if not found or w.status <> 'aktiv' then raise exception using errcode = 'P0001', message = 'wartung.nicht_aktiv'; end if;
  v_per := public.wartung_laeuft_bis(w.start_am, w.laufzeit_jahre, (p_am + make_interval(months => v_monate))::date);
  update public.wartungsvertraege
     set status = 'gekuendigt', gekuendigt_am = p_am, gekuendigt_per = v_per,
         verlauf = verlauf || jsonb_build_array(jsonb_build_object('am', p_am, 'person_id', intern.meine_person_id(),
                    'notiz', 'Kündigung per ' || to_char(v_per, 'DD.MM.YYYY')))
   where id = p_id;
  return v_per;
end
$$;

/** Kündigung zurücknehmen (z. B. Kunde bleibt doch). */
create or replace function public.wartung_kuendigung_zuruecknehmen(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.wartungsvertraege
     set status = 'aktiv', gekuendigt_am = null, gekuendigt_per = null,
         verlauf = verlauf || jsonb_build_array(jsonb_build_object('am', current_date, 'person_id',
                    intern.meine_person_id(), 'notiz', 'Kündigung zurückgenommen'))
   where id = p_id and status = 'gekuendigt' and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'wartung.nicht_gekuendigt'; end if;
end
$$;

/**
 * Jahresrechnung (Entwurf) für das nächste noch nicht verrechnete Vertragsjahr: Preis exkl. MWST, beim ersten
 * Mal mit der Bestandsaufnahme. Gibt die Rechnung zurück oder null, wenn nichts zu verrechnen ist.
 */
create or replace function intern.wartung_rechnung_anlegen(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  w public.wartungsvertraege;
  v_cfg jsonb := (select wert from public.einstellungen where schluessel = 'wartung_pakete');
  v_von date;
  v_bis date;
  v_paket text;
  v_sprache text;
  v_pos jsonb;
  v_zusatz jsonb;
  v_id uuid;
begin
  select * into w from public.wartungsvertraege where id = p_id and geloescht_am is null for update;
  if not found or w.start_am is null or w.preis_netto_rappen is null then return null; end if;
  v_von := coalesce(w.verrechnet_bis + 1, w.start_am);
  if w.gekuendigt_per is not null and v_von > w.gekuendigt_per then return null; end if;
  v_bis := public.wartung_laeuft_bis(w.start_am, 1, v_von);
  v_sprache := coalesce(w.sprache, (select sprache from public.kontakte where id = w.kontakt_id), 'de');
  select coalesce(p ->> 'name', '') into v_paket from jsonb_array_elements(v_cfg -> 'pakete') p where p ->> 'id' = w.paket;
  v_pos := jsonb_build_array(jsonb_build_object(
    'text', case v_sprache when 'fr' then 'Contrat d''entretien ' else 'Wartungsvertrag ' end
            || coalesce(w.nummer, '') || coalesce(' ' || v_paket, '')
            || coalesce(' (' || trim(to_char(w.anlage_kwp, 'FM9990.0')) || case v_sprache when 'fr' then ' kWc)' else ' kWp)' end, '')
            || ', ' || to_char(v_von, 'DD.MM.YYYY') || '–' || to_char(v_bis, 'DD.MM.YYYY'),
    'menge', 1, 'einheit', 'Jahr', 'preis_rappen', greatest(w.preis_netto_rappen, coalesce(w.tarif_netto_rappen, 0)),
    'bezug', 'wartung', 'bezug_id', w.id));
  -- Rabatt sichtbar als eigene Zeile, damit der Kunde den Tarif der Website wiedererkennt.
  if coalesce(w.tarif_netto_rappen, 0) > w.preis_netto_rappen then
    v_pos := v_pos || jsonb_build_array(jsonb_build_object('text', case v_sprache when 'fr' then 'Rabais' else 'Rabatt' end,
               'menge', 1, 'einheit', 'pauschal', 'preis_rappen', w.preis_netto_rappen - w.tarif_netto_rappen,
               'bezug', 'wartung', 'bezug_id', w.id));
  end if;
  if w.bestandsaufnahme = 'verrechnen' then
    select z into v_zusatz from jsonb_array_elements(v_cfg -> 'zusatz') z where z ->> 'id' = 'bestandsaufnahme';
    if v_zusatz is not null then
      v_pos := v_pos || jsonb_build_array(jsonb_build_object('text', v_zusatz ->> v_sprache, 'menge', 1,
                 'einheit', 'pauschal', 'preis_rappen', (v_zusatz ->> 'rappen')::int, 'bezug', 'wartung', 'bezug_id', w.id));
    end if;
  end if;
  insert into public.rechnungen (art, kontakt_id, projekt_id, wartungsvertrag_id, firma_id, sprache, titel,
                                 inkl_mwst, mwst_satz, positionen)
  values ('wartung', w.kontakt_id, w.projekt_id, w.id, intern.firma_fuer(w.projekt_id, v_sprache), v_sprache,
          case v_sprache when 'fr' then 'Facture d''entretien ' else 'Wartungsrechnung ' end || coalesce(w.nummer, ''),
          false, public.mwst_satz(), v_pos)
  returning id into v_id;
  update public.wartungsvertraege
     set verrechnet_bis = v_bis,
         bestandsaufnahme = case when bestandsaufnahme = 'verrechnen' then 'verrechnet' else bestandsaufnahme end
   where id = w.id;
  return v_id;
end
$$;

/** «Jahresrechnung erstellen» von Hand (Recht finanzen). */
create or replace function public.wartung_rechnung_erstellen(p_id uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  v_id := intern.wartung_rechnung_anlegen(p_id);
  if v_id is null then raise exception using errcode = 'P0001', message = 'wartung.nichts_zu_verrechnen'; end if;
  return v_id;
end
$$;

/**
 * Zeitplan (täglich): Jahresrechnungen 30 Tage vor jedem Vertragsjahr als Entwurf (Entscheid Chris 2A), die
 * Buchhaltung stellt sie; gekündigte Verträge nach dem Ende auf «beendet». Gibt die Zahl der Rechnungen zurück.
 */
create or replace function public.wartung_jahreslauf() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_vorlauf int := coalesce((select (wert -> 'bedingungen' ->> 'rechnung_vorlauf_tage')::int from public.einstellungen
                              where schluessel = 'wartung_pakete'), 30);
  v_n int := 0;
  r record;
begin
  update public.wartungsvertraege set status = 'beendet', naechste_wartung = null
   where status = 'gekuendigt' and gekuendigt_per < current_date and geloescht_am is null;
  for r in
    select id from public.wartungsvertraege
     where geloescht_am is null and status in ('aktiv', 'gekuendigt') and paket is not null
       and start_am is not null and preis_netto_rappen is not null
       and coalesce(verrechnet_bis + 1, start_am) <= current_date + v_vorlauf
       and (gekuendigt_per is null or coalesce(verrechnet_bis + 1, start_am) <= gekuendigt_per)
  loop
    if intern.wartung_rechnung_anlegen(r.id) is not null then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end
$$;

revoke execute on function public.wartung_kuendigen(uuid, date) from public, anon;
revoke execute on function public.wartung_kuendigung_zuruecknehmen(uuid) from public, anon;
revoke execute on function public.wartung_rechnung_erstellen(uuid) from public, anon;
revoke execute on function public.wartung_jahreslauf() from public, anon, authenticated;
revoke execute on function intern.wartung_rechnung_anlegen(uuid) from public, anon, authenticated;
grant execute on function public.wartung_kuendigen(uuid, date) to authenticated;
grant execute on function public.wartung_kuendigung_zuruecknehmen(uuid) to authenticated;
grant execute on function public.wartung_rechnung_erstellen(uuid) to authenticated;
grant execute on function public.wartung_jahreslauf() to service_role;
