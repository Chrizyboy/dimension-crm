# Dateien aus Phase 9 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261029000100_projekte_fahrplan.sql`** – Der Projekt-Fahrplan: die Schritte kommen aus der Ablauf-Vorlage des Produkts (PV, Speicher, Wallbox, Wärmepumpe), sechs Phasen von Auftrag bis Abschluss. Jeder Schritt ist entweder von Hand gesetzt oder ergibt sich aus anderen Daten (Vertrag, Zahlungsplan, Einsätze, Baustellen-Status, Material). Bewilligungen und die Checkliste Elektriker sind markierte Schritte im selben Fahrplan; die alten Häkchen der Vorlage werden mitgelesen. Hinweise je Schritt (DE/FR), Fristen (z. B. Pronovo 30 Tage nach der Abnahme). Sichten `projekt_fahrplan` und `projekt_stand`, Funktion `projekt_schritt_setzen`.
- **`…0200_projekte_bau.sql`** – Bauplanung: Auftrag in den Bau übernehmen (ohne Termin, mit Termin oder «schon gebaut»), zurück zu den Aufträgen und «Rückgängig» für den letzten Schritt. Einsätze mit Art (intern, extern, voraussichtlich), Personen und Subunternehmer. Zeitplan speichern; «IBN durchgeführt» schliesst das Projekt ab und legt die Anlage an. Abwesenheiten aus dem CRM und aus Outlook (nur Zeitraum, nie Betreff) in der Sicht `abwesenheiten_alle`.
- **`…0300_service_wartung.sql`** – Service-Fälle (S001 …) mit Kategorie, Priorität, Stand, Garantie und Verlauf; Wartungsverträge (W001 …) mit Start, Laufzeit, Rhythmus, Preis, Sprache und Leistungen. Der Leistungskatalog ist eine Einstellung (`wartung_leistungen`), die erste Wartung rechnet die Datenbank. Funktionen `service_notiz` und `wartung_erledigt`.
- **`…0400_anlagen_nachtragen.sql`** – Legt für alle schon abgeschlossenen Projekte die Anlage an (lokal 51), damit Service und Wartung sie finden.
- **`supabase/tests/projekte.test.sql`** – 35 Prüfungen: Phasen, automatische Schritte, Checkliste aus der Vorlage, Fristen und «überfällig», Material, Bau übernehmen, fixieren, rückgängig, Zeitplan, Anlage bei IBN, Service-Nummer und Verlauf, Wartung erledigt und gekündigt.

## Modul «Projekte & Montage» (`src/modules/projects/`)

- **`components/Projekte.tsx`** – Die Seite mit sechs Reitern: Baustellen, Zeitplan, Bewilligungen, Alle Projekte, Subunternehmer, Abwesenheiten.
- **`components/Baustellen.tsx`**, **`ProjektKarte.tsx`**, **`FahrplanBalken.tsx`**, **`BauDialog.tsx`** – Board je Standort (Muri, Bulle), darunter die Aufträge ohne Bautermin. «Bautermin» übernimmt einen Auftrag in den Bau, mit «Rückgängig» in der Meldung.
- **`components/Zeitplan.tsx`**, **`ZeitplanRaster.tsx`**, **`ZeitplanDialog.tsx`**, **`ZeitplanDruck.tsx`** – Gantt über 16 Wochen mit Kalenderwochen, Heute-Linie und Auslastung; Planung der Einsätze mit Warnung bei Abwesenheit; Drucken als A4 quer (oder PDF).
- **`components/Bewilligungen.tsx`**, **`SchrittDialog.tsx`** – Alle Projekte mal sechs Bewilligungs-Schritte, mit «zu spät» und «bald fällig».
- **`components/ProjektAkte.tsx`**, **`AkteUebersicht.tsx`**, **`AkteFahrplan.tsx`**, **`AkteZeitplan.tsx`**, **`AkteSubunternehmer.tsx`** – Die Akte eines Projekts als Seitenpanel: Angaben, Fahrplan mit Checkliste Elektriker, Zeitplan, Subunternehmer-Aufträge (Anfrage per Mail über den Ausgangskorb).
- **`components/GesuchDruck.tsx`** – Vorausgefüllte Datenblätter für TAG (Netzbetreiber), Meldung an die Gemeinde und Förderung.
- **`components/ProjektListe.tsx`**, **`projektSpalten.tsx`**, **`SubunternehmerListe.tsx`**, **`SubunternehmerDialog.tsx`**, **`SubauftragDialog.tsx`**, **`Abwesenheiten.tsx`**, **`HeuteKarte.tsx`**.
- **`services/`**, **`hooks/`**, **`lib/fahrplan.ts`**, **`lib/zeitplan.ts`** (mit Tests), **`lib/anzeige.ts`**, **`types.ts`**, **`schema.ts`**.

## Modul «Service & Garantie» (`src/modules/aftersales/`)

- **`components/Service.tsx`** – Seite mit den Reitern Fälle und Anlagen.
- **`components/FallListe.tsx`**, **`fallSpalten.tsx`**, **`FallDialog.tsx`**, **`FallAkte.tsx`** – Fälle mit Filter (offen, dringend, Garantie, erledigt, alle); neuer Fall mit Kunde und Anlage; Akte mit Stand, Priorität, Zuständig, Termin, Garantie, Verlauf mit Notizen, Anhängen und «Aufgabe erstellen».
- **`components/AnlagenListe.tsx`**, **`AnlageDialog.tsx`** – Anlage-Daten: IBN, Garantie, nächste Kontrolle, Leistung, Monitoring und Komponenten mit Seriennummer.
- **`components/HeuteKarte.tsx`**, **`services/service.ts`**, **`hooks/`**, **`lib/anzeige.ts`**, **`types.ts`**, **`schema.ts`**.

## Modul «Wartungsverträge» (`src/modules/contracts/`)

- **`components/Vertraege.tsx`**, **`vertragSpalten.tsx`** – Liste mit Filter (aktiv, fällig in 30 Tagen, alle) und Suche.
- **`components/VertragDialog.tsx`** – Vertrag anlegen oder ändern; Leistungen aus dem Katalog, die üblichen vorgewählt.
- **`components/VertragAkte.tsx`**, **`ErledigtDialog.tsx`**, **`VertragDruck.tsx`** – Akte mit Angaben, Leistungen und durchgeführten Wartungen; «Wartung erledigt» setzt die nächste; Vertrag als PDF in der Sprache des Kunden (DE aus Muri, FR aus Bulle).
- **`components/HeuteKarte.tsx`**, **`services/vertraege.ts`**, **`hooks/`**, **`lib/anzeige.ts`**, **`types.ts`**, **`schema.ts`**.

## Übrige Änderungen

- **`src/components/shared/KundeWahl.tsx`** – Kunden suchen und wählen (für Service und Wartung).
- **`src/app/projects.tsx`**, **`aftersales.tsx`**, **`contracts.tsx`** – Adressen wie `#/projects?projekt=…&akte=fahrplan`, `#/aftersales?fall=…`, `#/contracts?vertrag=…`.
- **`src/layouts/Startseite.tsx`** – Karten «Bau heute», «Service» und «Wartungen».
- **`src/modules/customers/components/GeschaeftKarten.tsx`** – Aus der Kundenakte direkt ins Projekt.
- **`e2e/projekte.spec.ts`** – Browser-Test: alle Reiter und die Akte ohne Verstösse, Service-Fall bis erledigt, Wartungsvertrag mit Wartung.
