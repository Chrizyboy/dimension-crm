# Dateien aus Phase 16 – in einfachen Worten

## Desktop-App und Updates

- **`src-tauri/tauri.conf.json`**, **`Cargo.toml`**, **`src/lib.rs`**, **`capabilities/default.json`** – Die Desktop-App kann Updates holen, installieren und neu starten; Installation pro Person ohne Administratorrechte.
- **`src/services/aktualisierung.ts`**, **`src/stores/aktualisierung.ts`**, **`src/hooks/useUpdatePruefung.ts`** – Sucht 15 Sekunden nach dem Start und alle 6 Stunden nach einer neuen Version.
- **`src/layouts/Aktualisierung.tsx`** – Knopf «Update» oben rechts und das Fenster «Neue Version».
- **`src/modules/settings/components/AppKarte.tsx`** – «Diese App» in Mein Konto: Version, nach Updates suchen, mit Windows starten, Download-Link im Browser.
- **`docs/versionen.md`** – Was in jeder Version neu ist; erscheint im Fenster «Neue Version».

## Veröffentlichen

- **`.github/workflows/veroeffentlichen.yml`** – «Neue Version veröffentlichen»: baut den Windows-Installer, legt ihn als Release ab und stellt die Web-App online.
- **`scripts/veroeffentlichen/vorbereiten.mjs`** (+ Test) – Prüft vorher Version, Versionstext und Einstellungen und schreibt die Release-Einstellungen.
- **`docs/installation.md`** – Einmal einrichten (Schlüssel, GitHub), veröffentlichen, am PC und am Handy installieren.

## Datensicherung

- **`supabase/migrations/20261107000100_datensicherung.sql`** – Tabelle `sicherungen`, privater Speicher, Zeiten als Einstellung, Funktionen zum Sichern, Aufräumen und Wiederherstellen.
- **`supabase/functions/sicherung/`**, **`_shared/sicherung.ts`** (+ Test) – Sichern (gepackt, Kopie in SharePoint) und Wiederherstellen; vom Zeitplan um 12:00 und 16:00 und von Hand.
- **`supabase/functions/zeitplan/index.ts`** – Startet die Sicherung zur richtigen Zeit.
- **`supabase/tests/sicherung.test.sql`** – 21 Prüfungen: Rechte, Termine, Sperre, Aufräumen, Einspielen ohne Verlust.
- **`scripts/sicherung/pruefen.mjs`** (`npm run sicherung:pruefen`) – Sichert, ändert, stellt wieder her und vergleicht gegen die lokale Datenbank.
- **`src/modules/settings/components/Datensicherung.tsx`**, **`WiederherstellenDialog.tsx`**, **`lib/sicherung.ts`**, **`services/sicherung.ts`** – Reiter «Datensicherung»: Liste, «Jetzt sichern», herunterladen, wiederherstellen mit Bestätigung.

## Umzug in die Cloud

- **`scripts/umzug/umzug.mjs`** (+ Test, `npm run umzug`) – Prüft das Cloud-Projekt, lädt Datenbank und Server-Funktionen hoch, zeigt die Tresor-Einträge und übernimmt die Daten aus V233.
- **`docs/umzug.md`** – Die acht Schritte mit Stichtag und Weg zurück.
- **`supabase/migrations/20261107000200_betrieb.sql`**, **`supabase/tests/betrieb.test.sql`** – `betrieb_stand()`: was im Projekt schon eingerichtet ist (nur Administration).
- **`src/modules/settings/components/Betrieb.tsx`**, **`lib/betrieb.ts`** (+ Test) – Reiter «Betrieb»: «Bereit für das Team?» mit grün, gelb, rot und dem nächsten Schritt.

## Kurzanleitung

- **`src/modules/knowledge/components/ErsteSchritte.tsx`** – Handbuch › «Erste Schritte» (DE/FR), druckbar auf eine A4-Seite. Text in `handbuch.start` der Sprachdateien.

## Tests und Entscheid

- **`e2e/betrieb.spec.ts`** – Browser-Test: sichern, Wiederherstellen nur mit Bestätigung, Betrieb, Diese App, Erste Schritte, Verkauf sieht nichts davon.
- **`docs/entscheidungen/0027-installation-updates-sicherung-umzug.md`** – Warum es so gebaut ist.
