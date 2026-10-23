# Dateien aus Phase 10 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261101000100_finanzen_grundlagen.sql`** – Firmen bekommen IBAN, Bank, Telefon, Mail und Zahlungsfrist. Neue Tabellen `rechnungen` (Entwurf, gestellt, teilbezahlt, bezahlt, storniert; Positionen, MWST, Mahnstufe, AbaNinja) und `rechnung_zahlungen`; jede Zahlung rechnet den Stand der Rechnung und des Zahlungsplans nach. Lieferantenrechnungen bekommen Projekt, Lieferant, offen und bezahlt am. Spesen: jede Person sieht nur ihre eigenen, ausbezahlte und stornierte sind fest. Einstellung `finanzen` (Stundensätze, Mahnfrist, Mail der Buchhaltung, Spesen-Kategorien).
- **`…0200_rechnungen_ablaeufe.sql`** – Entwurf aus Tranche, Schlussrechnung mit Nachträgen, Rapport, Wartungsvertrag oder frei; speichern, stellen (Nummer R2026-001 und Fälligkeit), stornieren, mahnen (Stufe 1–3 mit Frist); Abgleich mit AbaNinja anwenden; Nachkalkulation je Projekt; Spesen stornieren und auszahlen; Sichten `rechnungen_liste` und `offene_tranchen`.
- **`…0300_finanzen_sichten.sql`** – Sichten «kostenpflichtige Rapporte ohne Rechnung» und `spesen_liste`; die Einstellung `finanzen` ändert nur, wer das Recht `finanzen` hat.
- **`supabase/tests/finanzen.test.sql`** – 43 Prüfungen: Rechte, Entwurf aus Tranche und Rapport, Nummern, fest nach dem Stellen, Teil- und Vollzahlung, Mahnstufen, Storno, Abgleich, Nachkalkulation, Spesen, Firmenangaben und IBAN.
- **`src/types/datenbank.ts`** – Typen neu aus der Datenbank erzeugt.

## AbaNinja (`supabase/functions/`)

- **`_shared/abaninja.ts`**, **`abaninja/index.ts`** – Rechnung als Entwurf in AbaNinja anlegen; Abgleich liest Rechnungen (Zahlungen) und Lieferantenrechnungen (Belege). Schlüssel nur auf dem Server.
- **`_shared/bausteine.test.ts`**, **`scripts/integrationen/ersatz-dienste.mjs`**, **`pruefen.mjs`** – Prüfung gegen einen Ersatz-Server, weil AbaNinja in der Cloud-Sandbox gesperrt ist.
- **`src/services/integrationen.ts`** – App ruft Übergabe und Abgleich auf.

## Modul «Rechnungen» (`src/modules/invoices/`)

- **`components/Rechnungen.tsx`**, **`RechnungListe.tsx`**, **`rechnungSpalten.tsx`**, **`status.ts`** – Seite mit drei Reitern, Liste mit Filtern, CSV und Abgleich.
- **`components/ZuVerrechnen.tsx`** – Tranchen und Rapporte, die noch keine Rechnung haben.
- **`components/NeueRechnungDialog.tsx`** – Neue Rechnung für einen Kunden: Tranche, Schlussrechnung, Wartung oder frei.
- **`components/RechnungAkte.tsx`**, **`PositionenEditor.tsx`** – Die Rechnung: Angaben, Positionen (im Entwurf bearbeitbar), Zahlungen und Knöpfe je Stand.
- **`components/ZahlungDialog.tsx`**, **`MahnenDialog.tsx`**, **`StornoDialog.tsx`**, **`RechnungSenden.tsx`** – Zahlung erfassen, mahnen, stornieren, PDF per Mail (Ausgangskorb).
- **`components/Firmen.tsx`** – Firmenangaben je Standort mit IBAN-Prüfung.
- **`services/rechnungen.ts`**, **`rechnungPdf.ts`**, **`zahlteil.ts`** – Laden und Abläufe, PDF mit QR-Zahlteil.
- **`lib/rechnung.ts`**, **`lib/qr.ts`** (mit Tests) – Beträge, Fälligkeit, Mahnbarkeit, CSV, QR-Daten.
- **`hooks/`**, **`types.ts`**, **`schema.ts`**, **`index.ts`**.

## Modul «Spesen» (`src/modules/expenses/`)

- **`components/Spesen.tsx`**, **`SpesenTabelle.tsx`** – Meine, Alle (Buchhaltung) und Kategorien.
- **`components/SpeseErfassen.tsx`** – Spese mit Foto (Handykamera) oder PDF des Belegs.
- **`components/SpeseStorno.tsx`**, **`AuszahlenDialog.tsx`**, **`AnBuchhaltung.tsx`**, **`Kategorien.tsx`** – Storno statt Löschen, ausbezahlt am/von, Mail mit Belegen an die Buchhaltung, Kategorien DE/FR.
- **`components/HeuteKarte.tsx`** – Karte «Spesen» auf der Startseite.
- **`services/spesen.ts`**, **`lib/spesen.ts`** (mit Tests), **`hooks/`**, **`types.ts`**, **`schema.ts`**, **`index.ts`**.

## Modul «Finanzen» (`src/modules/finance/`)

- **`components/Finanzen.tsx`**, **`Uebersicht.tsx`**, **`Wochenbalken.tsx`**, **`BewegungZeile.tsx`** – Liquidität Woche für Woche mit Szenarien und Warnungen.
- **`components/Zahlungen.tsx`**, **`ZahlungDialog.tsx`**, **`ZahllaufDialog.tsx`**, **`DatumDialog.tsx`** – Zahlungen nach Priorität, Zahllauf, bezahlt, verschieben.
- **`components/Material.tsx`**, **`MaterialDialog.tsx`**, **`Fixkosten.tsx`**, **`FixkostenDialog.tsx`**, **`Eingaenge.tsx`**, **`EingangDialog.tsx`**, **`EintragDialog.tsx`**, **`AnpassenDialog.tsx`**, **`Fenster.tsx`** – Material je Baustelle, Fixkosten, erwartete Eingänge, Anpassungen einzelner Termine.
- **`components/Bank.tsx`** – Kontostand und Einstellungen der Vorschau.
- **`components/Nachkalkulation.tsx`** – Soll gegen Ist je Projekt.
- **`components/HeuteKarte.tsx`** – Karte «Finanzen» auf der Startseite.
- **`services/finanzen.ts`**, **`lib/datum.ts`**, **`lib/vorschau.ts`** (mit Tests), **`hooks/`**, **`types.ts`**, **`index.ts`**.

## Übrige Änderungen

- **`src/lib/bild.ts`** (aus der Baustelle verschoben), **`src/lib/datei.ts`** – Foto verkleinern und Datei herunterladen, jetzt für alle Module.
- **`src/hooks/useFinanzEinstellungen.ts`** – Einstellung `finanzen` mit Standardwerten.
- **`src/app/invoices.tsx`**, **`expenses.tsx`**, **`finance.tsx`**, **`src/routeTree.gen.ts`** – Adressen mit Reiter und offener Rechnung.
- **`src/layouts/Startseite.tsx`** – Karten «Finanzen» und «Spesen».
- **`src/i18n/de.json`**, **`fr.json`** – Texte für Rechnungen, Spesen und Finanzen.
- **`e2e/finanzen.spec.ts`**, **`playwright.config.ts`** – Browser-Test: freie Rechnung bis bezahlt, Spese mit Beleg bis ausbezahlt, Finanzen mit Barrierefreiheit, Verkauf sieht keine Finanzen.
- **`docs/entscheidungen/0021-rechnungen-spesen-finanzen.md`**, **`docs/datenmodell.md`**, **`docs/integrationen.md`**, **`CLAUDE.md`**, **`src/lib/bauplan.ts`**, Modul-READMEs.
