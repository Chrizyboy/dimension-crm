# Dateien aus Phase 6 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261025000000_plz_verzeichnis.sql`** – Alle Schweizer PLZ mit Ort, Kanton, Mittelpunkt und Höhe über Meer (aus V233, offene Daten von Post und swisstopo). Damit kennt das CRM ohne Internet-Dienst den Ort zur PLZ, die ungefähre Lage für Karte und Route und die Höhe fürs Terminblatt. Keine Kundendaten.
- **`…0100_verkauf_grundlagen.sql`** – Standort und Sprache aus der PLZ (Muri oder Bulle, mit Sensebezirk, Oberwallis und Berner Jura als Sonderfälle), Lead-Nummern L001 … von der Datenbank statt vom Browser, Personen mit Kundenterminen («Aussendienst»), Einstellungen für Fahrzeit und Elektroauto, weitere Auswahllisten (Erreichbarkeit, Finanzierung, Förderung, Zeitraum, Interesse).
- **`…0200_verkauf_pipeline.sql`** – Die Ansicht `verkauf_geschaefte`: ein «Geschäft» ist ein Lead mit seiner Offerte und seinem Projekt. Pipeline, Liste, Karte und Bericht lesen alle diese eine Ansicht, mit demselben Stand wie die Kundenakte.
- **`…0300_verkauf_ablaeufe.sql`** – Die Regeln aus V233 als Funktionen: `setze_stand` (Stand wechseln mit Pflichtangaben: Datum, Grund, Termin bei …), `lead_kontakt_erfassen` (Anruf mit Ergebnis setzt den Stand), `lead_anlegen` (Kontakt, Gebäude und Lead in einem Schritt).
- **`…0400_verkauf_tabellen.sql`** – Neue Tabellen: gespeicherte Ansichten, Kalendertermine (aus .ics/.csv, später Outlook), Lead-Einkauf pro Monat und Quelle für den Monatsbericht, die SMS-Vorlage für den Vortag.
- **`…0500_lead_nummer_frei.sql`** – Die Lead-Nummer wird nie doppelt vergeben, auch wenn der Import die alten Nummern L001 … schon mitgebracht hat (der Datenbank-Test hat diesen Fehler gefunden).
- **`…0600_leadbericht_anbieter.sql`** – Welche Quelle ein Anbieter mit gekauften Leads ist (heute solar-guide.ch), steht in der Auswahlliste; der Monatsbericht zeigt zusätzlich die PLZ.
- **`supabase/tests/verkauf.test.sql`** – 20 Prüfungen: Standort nach PLZ, Lead anlegen, Pflichtangaben beim Standwechsel, Kontakt mit Ergebnis «Termin», Kalender ersetzen ohne hartes Löschen, Monatsbericht.

## Gemeinsame Teile

- **`src/services/dokumente.ts`** – Öffnet eine Datei (SharePoint-Link oder 5 Minuten gültiger Link); vorher nur in der Kundenakte, jetzt auch für Leads.
- **`src/services/leadsuche.ts`**, **`src/hooks/useLeadBefehle.ts`** – Ctrl K findet Leads über die Nummer («L012»).
- **`src/hooks/useBefehle.ts`** – Neue Aktion «Neuen Lead erfassen» in Ctrl K.
- **`src/components/ui/auswahl.tsx`** – Lange Werte in Auswahlfeldern werden gekürzt statt umgebrochen (am Handy sprang sonst die Höhe).
- **`scripts/import/schritte/uebrige.mjs`** – Übernimmt aus V233 die gekauften Leads, Bericht-Texte und Meldungen des Lead-Monatsberichts.

## Modul «Anfragen & Leads» (`src/modules/sales/`)

**Seite und Ansichten**

- **`components/Verkauf.tsx`** – Die Seite mit den sieben Ansichten (Tasten 1–7), Knöpfen für SMS, Excel, Ordner und neuen Lead (Taste N).
- **`components/FilterLeiste.tsx`** – Suche (Taste /), Standort, Person, Quelle, Region.
- **`components/Pipeline.tsx`**, **`PipelineKarte.tsx`**, **`lib/spalten.ts`** – Kanban: Karten ziehen ändert den Stand; rot, wenn ein Lead seit 5 Tagen liegt; «…» ändert den Stand auch ohne Maus.
- **`components/StandWechselDialog.tsx`** – Fragt ab, was der neue Stand braucht (Datum, Grund, Termin und Person, «wirklich gesendet?»).
- **`components/LeadListe.tsx`**, **`LeadZeile.tsx`**, **`geschaeftSpalten.tsx`** – Liste in Abschnitten (Neu & offen, Termin, Nachfassen …) oder als Tabelle, Mehrfachauswahl mit Strg- und Shift-Klick.
- **`components/Sammelaenderung.tsx`**, **`AnsichtenMenue.tsx`** – Mehrere Leads auf einmal ändern; Filter als Ansicht speichern, für sich oder fürs Team.

**Lead-Akte**

- **`components/LeadAkte.tsx`**, **`AkteAbschnitt.tsx`**, **`LeadAngaben.tsx`** – Seitenpanel mit Kontakt, Objekt, Interesse, Termin; Felder speichern sofort.
- **`components/LeadBesichtigung.tsx`**, **`lib/besichtigung.ts`** – Besichtigung vor Ort (Fläche, Ausrichtung, Neigung, Material, Anschluss, Verbrauch).
- **`components/LeadVerlauf.tsx`** – Kontaktverlauf und Dateien.
- **`components/KontaktErfassenDialog.tsx`** – Anruf, Mail, SMS, Besuch oder Notiz mit Ergebnis; das Ergebnis setzt den Stand.
- **`components/LeadDialog.tsx`**, **`schema.ts`** – Neuer Lead: Ort, Standort und Sprache aus der PLZ, Dublettenprüfung, Telefon im Format +41.
- **`components/Terminblatt.tsx`**, **`TerminblattDialog.tsx`**, **`QrCode.tsx`**, **`lib/karte.ts`** – Terminblatt zum Drucken oder als PDF, mit Luftbild (einfügen, ziehen, antippen), Höhe ü. M. und QR-Code zu Google Maps.

**Planung**

- **`components/Tagesroute.tsx`**, **`RoutenAblauf.tsx`**, **`StartWahl.tsx`**, **`lib/route.ts`**, **`lib/ablauf.ts`**, **`lib/stopps.ts`** – Route pro Person und Tag: Start Zuhause/Muri/Bulle/andere Adresse, feste Termine und Kalender, Leads in der Nähe ergänzen, Fahrzeiten, Laden des Elektroautos, Google-Maps-Link.
- **`components/Tour.tsx`**, **`TourAuswahl.tsx`** – Tour aus Leads oder eingefügten Adressen, um feste Zeiten optimiert.
- **`components/Karte.tsx`** – Karte mit swisstopo-Kacheln, Punkte und Route.
- **`components/Wochenkalender.tsx`**, **`KalenderLaden.tsx`**, **`SlotPlanen.tsx`**, **`lib/kalenderdatei.ts`** – Woche pro Person mit Terminen, freien Lücken (Klick plant einen Lead ein) und Kalender aus .ics/.csv.
- **`components/Regionen.tsx`** – Kennzahlen, Termine der nächsten 14 Tage pro Region, offene Pipeline pro Region, Karte.

**Monatsbericht, Excel, SMS**

- **`components/Monatsbericht.tsx`**, **`BerichtKarte.tsx`**, **`BerichtDialog.tsx`**, **`BerichtDruck.tsx`**, **`lib/bericht.ts`**, **`lib/berichtZahlen.ts`**, **`hooks/useAnbieter.ts`** – Kennzahlen des Monats, pro Quelle erhalten gegen gekauft, eigene Leads getrennt, Bericht an den Anbieter mit Reklamation, Empfänger, PDF und «als gemeldet».
- **`components/ExcelImport.tsx`**, **`lib/planungstool.ts`** – Planungstool-Excel laden; nur neue Leads werden übernommen.
- **`components/OrdnerKnopf.tsx`**, **`hooks/useOrdner.ts`**, **`lib/ordner.ts`** – «Ordner verbinden»: das CRM lädt beim Zurückkehren den neuesten Kalender und meldet ein neueres Planungstool-Excel.
- **`components/SmsListe.tsx`** – SMS-Texte für die Termine von morgen, in der Sprache des Kunden, zum Kopieren.

**Daten und Rechnen**

- **`services/geschaefte.ts`**, **`leads.ts`**, **`planung.ts`**, **`bericht.ts`** – Laden und Speichern.
- **`hooks/useVerkauf.ts`**, **`useStartOrt.ts`** – Daten für die Ansichten.
- **`lib/geschaeft.ts`**, **`lib/fehler.ts`**, **`types.ts`** – Stand-Regeln, Filter, Summen, Fehlertexte.
- **`*.test.ts`** – Tests für Pipeline, Route, Stopps, Kalenderdateien, Planungstool, Bericht, Ordner.

## Browser-Tests

- **`e2e/verkauf.spec.ts`** – Lead mit N anlegen (Ort aus der PLZ), Kontakt «kein Interesse» erfassen, Lead in Ctrl K über die Nummer finden, Barrierefreiheit von Pipeline, Liste, Tagesroute, Kalender und Bericht in Hell und Dunkel.
