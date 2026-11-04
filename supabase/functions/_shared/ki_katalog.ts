// Katalog des Assistenten (Entscheid 0040): Welche Tabellen, Felder und Verknüpfungen die KI für Fragen ans CRM
// wählen darf. Gelesen wird immer mit dem Login der Person (RLS), darum darf hier auch Persönliches stehen
// (Posteingang, Spesen): die Datenbank zeigt jeder Person nur, was sie auch in der App sieht.

/** Verknüpfungen, über die eine Abfrage zusätzlich liest und filtert (Fremdschlüssel je Tabelle). */
export interface Einbettung {
  kunde?: string
  ort?: string
  person?: string
  lieferant?: string
  projekt?: string
}
export type EinbettungArt = keyof Einbettung

/** Wie eine Verknüpfung gelesen, benannt und gefiltert wird. */
export const VERKNUEPFUNG: Record<
  EinbettungArt,
  { alias: string; ziel: string; felder: string; oder: (v: string) => string }
> = {
  kunde: {
    alias: 'kunde',
    ziel: 'kontakte',
    felder: 'vorname,nachname,firma',
    oder: (v) => `(vorname.ilike.*${v}*,nachname.ilike.*${v}*,firma.ilike.*${v}*)`,
  },
  ort: { alias: 'objekt', ziel: 'objekte', felder: 'plz,ort', oder: (v) => `(ort.ilike.*${v}*,plz.like.${v}*)` },
  person: {
    alias: 'person',
    ziel: 'personen',
    felder: 'kuerzel,name',
    oder: (v) => `(kuerzel.ilike.${v},name.ilike.*${v}*)`,
  },
  lieferant: { alias: 'lieferant', ziel: 'lieferanten', felder: 'name', oder: (v) => `(name.ilike.*${v}*)` },
  projekt: {
    alias: 'projekt',
    ziel: 'projekte',
    felder: 'nummer,titel',
    oder: (v) => `(nummer.ilike.*${v}*,titel.ilike.*${v}*)`,
  },
}

export interface Tabelle {
  /** Wie die KI die Tabelle kennt (Beschreibung im Katalog). */
  beschreibung: string
  /** Felder, die gelesen und gefiltert werden dürfen. */
  felder: Record<string, string>
  einbettung: Einbettung
  /** Ohne Sortierung: neueste zuerst nach diesem Feld. */
  standardSortierung: string
  /** Felder, die der Server nach dem Lesen rechnet (nur zum Sortieren und Zeigen, nicht zum Filtern). */
  berechnet?: Record<string, { beschreibung: string; vorsortierung: string }>
  /** Sicht ohne Papierkorb-Spalte. */
  ohnePapierkorb?: boolean
}

/** Der Katalog: nur diese Tabellen und Felder kann die KI abfragen. */
export const KATALOG: Record<string, Tabelle> = {
  kontakte: {
    beschreibung: 'Kunden und Kontakte (Personen und Firmen)',
    felder: {
      kundennummer: 'Zahl',
      vorname: 'Text',
      nachname: 'Text',
      firma: 'Text',
      email: 'Text',
      telefon: 'Text',
      sprache: 'de oder fr',
      kontaktart: 'privat, firma, gemeinde …',
      erstellt_am: 'Zeitpunkt',
    },
    einbettung: {},
    standardSortierung: 'erstellt_am',
  },
  verkaufschancen: {
    beschreibung: 'Leads/Anfragen. stufe: neu, kontakt, termin, offerte, gewonnen, verloren …',
    felder: {
      nummer: 'Text',
      stufe: 'Text',
      quelle: 'Text (website, telefon, empfehlung …)',
      interesse: 'Liste (pv, speicher, waermepumpe, ladestation …)',
      eingang_am: 'Datum',
      termin_am: 'Zeitpunkt Besichtigung',
      wiedervorlage_am: 'Datum',
      offerte_status: 'Text',
      verlustgrund: 'Text',
      erledigt: 'true/false',
    },
    einbettung: {
      kunde: 'verkaufschancen_kontakt_id_fkey',
      ort: 'verkaufschancen_objekt_id_fkey',
      person: 'verkaufschancen_tour_person_id_fkey',
    },
    standardSortierung: 'eingang_am',
  },
  offerten: {
    beschreibung:
      'Offerten. status: offen, angenommen, verloren, vertagt …; betrag_rappen = Betrag in Rappen exkl. MWST',
    felder: {
      nummer: 'Text',
      titel: 'Text',
      status: 'Text',
      art: 'Text',
      betrag_rappen: 'Rappen exkl. MWST',
      leistung_kwp: 'kWp',
      angebot_am: 'Datum verschickt',
      nachfassen_am: 'Datum zuletzt nachgefasst',
      entscheid: 'Text',
      entscheid_am: 'Datum',
      verlustgrund: 'Text',
      sprache: 'de oder fr',
    },
    einbettung: {
      kunde: 'offerten_kontakt_id_fkey',
      ort: 'offerten_objekt_id_fkey',
      person: 'offerten_verantwortlich_id_fkey',
    },
    standardSortierung: 'angebot_am',
  },
  projekte: {
    beschreibung: 'Projekte/Aufträge. vertragswert_rappen inkl. MWST',
    felder: {
      nummer: 'Text',
      titel: 'Text',
      status: 'Text',
      bau_status: 'Text',
      material_status: 'Text',
      baubeginn: 'Datum',
      unterzeichnet_am: 'Datum',
      vertragswert_rappen: 'Rappen inkl. MWST',
    },
    einbettung: {
      kunde: 'projekte_kontakt_id_fkey',
      ort: 'projekte_objekt_id_fkey',
      person: 'projekte_verantwortlich_id_fkey',
    },
    standardSortierung: 'unterzeichnet_am',
  },
  service_faelle: {
    beschreibung: 'Service- und Garantiefälle',
    felder: {
      nummer: 'Text',
      titel: 'Text',
      status: 'Text',
      prioritaet: 'Text',
      kategorie: 'Text',
      garantie: 'true/false',
      termin_am: 'Zeitpunkt',
      reaktion_bis: 'Zeitpunkt',
      erledigt_am: 'Zeitpunkt',
      erstellt_am: 'Zeitpunkt',
    },
    einbettung: {
      kunde: 'service_faelle_kontakt_id_fkey',
      ort: 'service_faelle_objekt_id_fkey',
      person: 'service_faelle_person_id_fkey',
    },
    standardSortierung: 'erstellt_am',
  },
  rechnungen: {
    beschreibung: 'Rechnungen an Kunden. Beträge in Rappen, total_rappen inkl. MWST',
    felder: {
      nummer: 'Text',
      titel: 'Text',
      art: 'Text',
      status: 'Text (entwurf, gestellt, bezahlt, storniert …)',
      datum: 'Datum',
      faellig_am: 'Datum',
      total_rappen: 'Rappen inkl. MWST',
      bezahlt_rappen: 'Rappen',
      bezahlt_am: 'Datum',
      mahnstufe: 'Zahl 0–3',
    },
    einbettung: { kunde: 'rechnungen_kontakt_id_fkey' },
    standardSortierung: 'datum',
  },
  wartungsvertraege: {
    beschreibung: 'Wartungsverträge',
    felder: {
      nummer: 'Text',
      status: 'Text',
      paket: 'Text',
      naechste_wartung: 'Datum',
      letzte_wartung: 'Datum',
      preis_rappen: 'Rappen inkl. MWST pro Jahr',
      anlage_ort: 'Text',
    },
    einbettung: { kunde: 'wartungsvertraege_kontakt_id_fkey' },
    standardSortierung: 'naechste_wartung',
  },
  aufgaben: {
    beschreibung: 'Aufgaben (offen = erledigt_am ist leer)',
    felder: { titel: 'Text', faellig_am: 'Datum', erledigt_am: 'Zeitpunkt', erstellt_am: 'Zeitpunkt' },
    einbettung: { person: 'aufgaben_person_id_fkey' },
    standardSortierung: 'faellig_am',
  },
  aktivitaeten: {
    beschreibung: 'Verlauf: Anrufe, Mails, Notizen, Besuche zu Kunden, Leads, Offerten, Projekten',
    felder: { art: 'Text', zeitpunkt: 'Zeitpunkt', richtung: 'ein/aus', text: 'Text', ergebnis: 'Text' },
    einbettung: { kunde: 'aktivitaeten_kontakt_id_fkey', person: 'aktivitaeten_person_id_fkey' },
    standardSortierung: 'zeitpunkt',
  },
  posteingang: {
    beschreibung:
      'Posteingang: Mails aus Outlook (eigenes Postfach und Team-Postfächer wie info@). Offen = stand neu oder offen. ' +
      'art: stoerung, anfrage, kunde, rechnung, lieferant, amt, monitor, sonstiges, intern, werbung, privat. ' +
      'person = zuständig. frist_am = Antwort fällig bis. zurueck_am = zurückgestellt bis, warten_bis = wir warten auf Antwort.',
    felder: {
      betreff: 'Text',
      von_name: 'Text',
      von_email: 'Text',
      eingang_am: 'Zeitpunkt',
      art: 'Text',
      dringend: 'true/false (von der KI beim Einordnen erkannt)',
      stand: 'neu, offen, info, erledigt, abgelegt',
      frist_am: 'Zeitpunkt',
      zurueck_am: 'Zeitpunkt',
      warten_bis: 'Zeitpunkt',
      nachfassen: 'true/false (Kunde hat nicht geantwortet)',
      postfach: "Text ('me' = persönlich, sonst Adresse des Team-Postfachs)",
      hat_anhang: 'true/false',
      zusammenfassung: 'Text',
      erledigt_am: 'Zeitpunkt',
    },
    einbettung: { kunde: 'posteingang_kontakt_id_fkey', person: 'posteingang_zustaendig_id_fkey' },
    standardSortierung: 'eingang_am',
    berechnet: {
      dringlichkeit: {
        beschreibung: 'hoch, mittel, tief (aus Frist, Art, dringend, Nachfassen, Zurückgestellt)',
        vorsortierung: 'frist_am.asc.nullslast',
      },
    },
  },
  ausgangskorb: {
    beschreibung:
      'Ausgangskorb: Mails, SMS und Briefe, die das Haus verlassen. status: wartet (auf Freigabe), freigegeben, wird_gesendet, gesendet, fehler, verworfen. sende_ab = geplant ab. person = Absender.',
    felder: {
      betreff: 'Text',
      an: 'Text',
      art: 'Text',
      kanal: 'mail, sms, brief',
      status: 'Text',
      sende_ab: 'Zeitpunkt',
      gesendet_am: 'Zeitpunkt',
      fehler: 'Text',
      erstellt_am: 'Zeitpunkt',
    },
    einbettung: { kunde: 'ausgangskorb_kontakt_id_fkey', person: 'ausgangskorb_absender_person_id_fkey' },
    standardSortierung: 'erstellt_am',
  },
  bestellungen: {
    beschreibung: 'Bestellungen beim Lieferanten (Einkauf). total_rappen exkl. MWST',
    felder: {
      nummer: 'Text',
      status: 'Text (entwurf, freigegeben, bestellt, teilgeliefert, geliefert, storniert)',
      total_rappen: 'Rappen',
      bestellt_am: 'Zeitpunkt',
      liefertermin: 'Datum',
      ab_termin: 'Datum laut Auftragsbestätigung',
      geliefert_am: 'Zeitpunkt',
      rechnung_nummer: 'Text',
    },
    einbettung: {
      lieferant: 'bestellungen_lieferant_id_fkey',
      projekt: 'bestellungen_projekt_id_fkey',
      person: 'bestellungen_bestellt_von_fkey',
    },
    standardSortierung: 'erstellt_am',
  },
  kreditor_zahlungen: {
    beschreibung:
      'Lieferantenrechnungen und geplante Zahlungen (Kreditoren). pruefung: freigabe, bereit (zahlbar), klaeren, zurueckgehalten',
    felder: {
      rechnung_nr: 'Text',
      text: 'Text',
      betrag_rappen: 'Rappen',
      offen_rappen: 'Rappen',
      rechnung_am: 'Datum',
      faellig_am: 'Datum',
      skonto_bis: 'Datum',
      status: 'Text',
      pruefung: 'Text',
      bezahlt_am: 'Datum',
      kategorie: 'Text',
    },
    einbettung: { lieferant: 'kreditor_zahlungen_lieferant_id_fkey', projekt: 'kreditor_zahlungen_projekt_id_fkey' },
    standardSortierung: 'faellig_am',
  },
  spesen: {
    beschreibung: 'Spesen. status: eingereicht, rueckfrage, geprueft, abgelehnt, ausbezahlt, storniert',
    felder: {
      datum: 'Datum',
      kategorie: 'Text',
      zweck: 'Text',
      betrag_rappen: 'Rappen',
      status: 'Text',
      rueckfrage: 'Text',
      ausbezahlt_am: 'Zeitpunkt',
    },
    einbettung: { person: 'spesen_person_id_fkey', projekt: 'spesen_projekt_id_fkey' },
    standardSortierung: 'datum',
  },
  grossprojekte: {
    beschreibung:
      'Grossprojekte für Contracting (Dächer, Heizungen). punkte 0–100; stand: pruefen, beobachten, bewilligt, verworfen; stufe nach Bewilligung',
    felder: {
      nummer: 'Text',
      titel: 'Text',
      stand: 'Text',
      stufe: 'Text',
      punkte: 'Zahl 0–100',
      bauherr: 'Text',
      gemeinde: 'Text',
      plz: 'Text',
      naechster_schritt: 'Text',
      naechster_schritt_am: 'Datum',
      wiedervorlage_am: 'Datum',
      gemeldet_am: 'Zeitpunkt',
    },
    einbettung: { person: 'grossprojekte_verantwortlich_id_fkey' },
    standardSortierung: 'gemeldet_am',
  },
  ausschreibungen: {
    beschreibung: 'Öffentliche Ausschreibungen (simap, Amtsblatt). frist_eingabe = Eingabefrist',
    felder: {
      nummer: 'Text',
      titel: 'Text',
      status: 'Text',
      spur: 'Text',
      prioritaet: 'Text',
      vergabestelle: 'Text',
      gemeinde: 'Text',
      frist_eingabe: 'Zeitpunkt',
      frist_fragen: 'Zeitpunkt',
      publiziert_am: 'Datum',
      schaetzung_rappen: 'Rappen',
      punkte: 'Zahl',
    },
    einbettung: { person: 'ausschreibungen_verantwortlich_id_fkey' },
    standardSortierung: 'publiziert_am',
  },
  anlagen: {
    beschreibung: 'Gebaute Anlagen (ab Inbetriebnahme): Garantie und nächste Kontrolle',
    felder: {
      leistung_kwp: 'kWp',
      ibn_am: 'Datum Inbetriebnahme',
      garantie_bis: 'Datum',
      naechste_kontrolle: 'Datum',
    },
    einbettung: { ort: 'anlagen_objekt_id_fkey', projekt: 'anlagen_projekt_id_fkey' },
    standardSortierung: 'ibn_am',
  },
  einsaetze: {
    beschreibung: 'Einsätze/Termine im Kalender (Montage, Service, Wartung …). von/bis = Zeitpunkt',
    felder: { art: 'Text', von: 'Zeitpunkt', bis: 'Zeitpunkt', notiz: 'Text' },
    einbettung: { projekt: 'einsaetze_projekt_id_fkey' },
    standardSortierung: 'von',
  },
  fristen: {
    beschreibung: 'Fristen von Fahrzeugen, Geräten und Personal (MFK, Service, Prüfung, Ausweise)',
    felder: { titel: 'Text', art: 'Text', faellig_am: 'Datum', person_id: 'ID der Person (deine: siehe person.id)' },
    einbettung: {},
    standardSortierung: 'faellig_am',
    ohnePapierkorb: true,
  },
}

export const TABELLEN = Object.keys(KATALOG)
