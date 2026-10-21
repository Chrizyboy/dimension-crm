# Dateien aus Phase 5 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261024000000_rls_schneller.sql`** – Schreibt alle Zugriffsregeln so um, dass die Datenbank das Recht einmal pro Abfrage prüft statt für jede Zeile neu. Die Kundenliste lädt dadurch in 0.4 statt 27 Sekunden. Neue Tabellen bekommen die schnelle Form automatisch.
- **`…0100_kundenstand.sql`** – Die 16 Stände aus V233 (Lead neu … Dossier abgeschlossen) in 6 Gruppen als Auswahlliste, dazu die Kontaktergebnisse (nicht erreicht, Combox, Rückruf …) und die Nachfass-Frist von 14 Tagen. Die Funktion `kundenstand()` rechnet aus dem jüngsten Geschäft aus, wo ein Kunde steht.
- **`…0200_kunden_360.sql`** – Die Ansicht `kunden_uebersicht`: ein Kontakt pro Zeile mit Adresse, Stand, letztem Kontakt und dem Hinweis auf mögliche Dubletten. Dazu `moegliche_dubletten()` für die Prüfung beim Anlegen und Indizes, damit alles schnell bleibt.
- **`…0300_kunden_zeitachse.sql`** – `kunden_zeitachse()` sammelt Anrufe, Notizen, Anfrage, Termin, Offerten, Entscheide, Werkvertrag, Baubeginn, Service, Dokumente und Änderungen in einer Liste. `kontakt_export()` liefert alle Daten zu einer Person für eine Auskunft nach Datenschutzgesetz.
- **`supabase/tests/kunden.test.sql`** – 17 Prüfungen: Stand-Regeln, Dubletten bei gleicher Mail oder Telefon in anderer Schreibweise, Zeitachse, Export, Zugriff nur mit Login, schnelle Zugriffsregeln.
- **`supabase/tests/datenmodell.test.sql`** – Der Kundennummer-Test aus Phase 3 läuft jetzt in jeder Datenbank gleich und setzt den Zähler danach zurück.

## Gemeinsame Bausteine (für alle späteren Module)

- **`src/components/shared/Datentabelle.tsx`** – Die Tabelle für alle Listen: Klick auf den Spaltentitel sortiert, Klick oder Enter öffnet, Pfeiltasten springen von Zeile zu Zeile. Beim Laden erscheinen graue Platzhalter-Zeilen.
- **`src/components/shared/Zeitachse.tsx`** – Senkrechter Verlauf mit Monats-Überschriften, neuestes zuoberst. Wird später für Leads, Projekte und Service wiederverwendet.
- **`src/components/shared/Filterchips.tsx`** – Runde Filterknöpfe mit Anzahl (Stand, Art, Zeitachse).
- **`src/lib/tabelle.ts`** – Legt fest, was jede Tabelle kann (heute Sortieren) und welche Zusatzangaben eine Spalte haben darf.
- **`src/lib/kontakt.ts`** – Kundennummer «K0042», Telefonnummer in Ziffern, Adresse in einer Zeile und die Suche: alle Wörter müssen passen, Ziffern auch in der Telefonnummer («Bulle 079»).
- **`src/lib/formular.ts`** – Macht aus Prüffehlern übersetzte Texte pro Feld; vorher lag das in den Einstellungen.
- **`src/services/kontakte.ts`**, **`src/services/auswahl.ts`** – Lesen Kontakte und Auswahllisten aus der Datenbank, für Kunden, Adressbuch und Ctrl K gemeinsam.
- **`src/hooks/useKontakte.ts`**, **`useAuswahl.ts`**, **`useTaste.ts`**, **`useDrucken.ts`**, **`useKontaktBefehle.ts`** – Kontaktliste laden, Auswahllisten in der richtigen Sprache, Tastenkürzel wie `N` und `/`, Drucken eines Blatts, Kunden in der Befehlspalette.
- **`src/types/kontakt.ts`** – Die Form einer Kontaktzeile, wie alle Listen sie nutzen.
- **`src/index.css`** – Druck-Regeln: beim Drucken erscheint nur das Kundenblatt.

## Modul «Kunden» (`src/modules/customers/`)

- **`components/Kunden.tsx`** – Die Kundenliste mit Suche, Stand-Filter und Anzahl. Ein Klick öffnet die Akte.
- **`components/kundenSpalten.tsx`**, **`StandBadge.tsx`**, **`StandFilter.tsx`** – Spalten wie in V233 (Kd.-Nr., Name, PLZ, Ort, Kontakt, Stand, Zuletzt), der farbige Stand und die Gruppen-Filter.
- **`components/Kundenakte.tsx`** – Das Seitenpanel: Kopf, Reiter Übersicht · Zeitachse · Dokumente, dazu Papierkorb mit Rückfrage, Export und Kundenblatt.
- **`components/AkteKopf.tsx`** – Stand, Sprache, Werbesperre, Dublette und die häufigsten Knöpfe: anrufen, Mail, Kontakt erfassen, bearbeiten.
- **`components/AkteUebersicht.tsx`**, **`NaechsterSchritt.tsx`**, **`lib/naechsterSchritt.ts`** – «Was jetzt?» zuoberst (z. B. «Offerte 101444 vom 08.07.2024 nachfassen»), dann Kontaktdaten und Gebäude.
- **`components/GeschaeftKarten.tsx`**, **`Angaben.tsx`** – Alle Anfragen, Offerten, Werkverträge und Projekte mit allen Feldern aus V233; technische Angaben eingeklappt.
- **`components/AkteZeitachse.tsx`** – Der Verlauf mit Filtern (Kontakte, Geschäft, Dokumente, Änderungen).
- **`components/AkteDokumente.tsx`** – Dateien nach den Ordnern der Vorlage; öffnet SharePoint oder einen 5 Minuten gültigen Link.
- **`components/KontaktDialog.tsx`** – Kontakt anlegen oder ändern, mit Dublettenprüfung vor dem Speichern.
- **`components/AktivitaetDialog.tsx`** – Kontakt erfassen: Anruf, Mail, Besuch, Brief, Notiz oder SMS mit Ergebnis.
- **`components/ObjektDialog.tsx`** – Gebäude mit Adresse, Gebäudeart, Dachform, Eigentum und Verbrauch.
- **`components/Kundenblatt.tsx`** – Das Blatt für die Besichtigung wie in V233, zum Drucken oder als PDF.
- **`services/kundenakte.ts`**, **`hooks/useKunden.ts`**, **`lib/anzeige.ts`**, **`schema.ts`**, **`types.ts`** – Laden und Speichern, Prüfregeln, Anzeige von Datum, Betrag und Leistung.

## Modul «Adressbuch» (`src/modules/contacts/`)

- **`components/Adressbuch.tsx`**, **`adressbuchSpalten.tsx`** – Alle Kontakte mit Filter nach Art (Privat, Firma, Partner, Lieferant …) und der Papierkorb zum Wiederherstellen.

## Seiten und Befehlspalette

- **`src/app/customers.tsx`**, **`src/app/contacts.tsx`** – Die Seiten «Kunden» und «Adressbuch». Kunde und Reiter stehen in der Adresse, damit Zurück und Links funktionieren.
- **`src/layouts/Befehlspalette.tsx`**, **`src/hooks/useBefehle.ts`** – Ctrl K findet jetzt auch Kontakte nach Name, Ort, Mail, Telefon oder Nummer.

## Tests und Werkzeuge

- **`e2e/kunden.spec.ts`** – Browser-Ablauf mit echter lokaler Datenbank: Kunde anlegen, über Telefon finden, Kontakt erfassen, Dublette erkennen, Ctrl K, Papierkorb und wiederherstellen, dazu Barrierefreiheit mit echten Daten.
- **`e2e/hilfen.ts`** – Anmelden mit Code aus Mailpit, gemeinsam für alle Tests mit Datenbank.
- **`src/lib/kontakt.test.ts`**, **`naechsterSchritt.test.ts`**, **`Filterchips.test.tsx`** – Suche, «Was jetzt?» und Filterknöpfe.
- **`playwright.config.ts`**, **`.github/workflows/ci.yml`** – Der Kunden-Test läuft nach dem Anmelde-Test, auch in GitHub.
