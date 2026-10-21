# Dateien aus Phase 3 – in einfachen Worten

## Datenbank (`supabase/migrations/`)

- **`20261022000100_organisation.sql`** – Mitarbeitende, Firmen, Standorte, Lager, Touren, Auswahllisten und Einstellungen. Dazu die zwei wichtigsten Hilfen: `hat_recht` prüft, ob jemand etwas sehen darf, und `richte_fachtabelle_ein` gibt jeder Tabelle Papierkorb, Protokoll und Zugriffsregeln.
- **`…0200_kunden_verkauf.sql`** – Kontakte, Objekte (Liegenschaften), Verkaufschancen, Zeitachse, Aufgaben, Dokumente und SharePoint-Ordner. Die Kundennummer läuft automatisch weiter.
- **`…0300_offerten_preise.sql`** – Preisliste, Lieferanten, Einkaufspreise (nur mit Recht «preise»), Preisvorlagen, Kalkulationen und Offerten.
- **`…0400_projekte_service.sql`** – Ablauf-Vorlagen je Produkt, Projekte mit Ablauf-Schritten und Einsätzen, Anlagen, Zahlungsplan, Service-Fälle, Wartungsverträge und interne Rückmeldungen.
- **`…0450_werkvertraege.sql`** – Werkverträge als eigener Datensatz mit Firma, Sprache, Konditionen, Status und PDF (dein Hinweis).
- **`…0500_einkauf_baustelle.sql`** – Die freigegebene ERP-Erweiterung: Subunternehmer, Bestellungen, Lager mit Bewegungen, Rapporte, Zeiterfassung, Abwesenheiten, Nachträge und Ausschreibungen.
- **`…0600_finanzen_marketing.sql`** – Spesen, Finanzen & Liquidität (nur mit Recht «finanzen»), Marketing, Schreibstile, Signaturen und das Handbuch.
- **`…0700_system_import.sql`** – Ausgangskorb, Einladungen, altes Protokoll, Importläufe und Abgleichsliste sowie der private Dateispeicher. Ausserdem schreiben die Trigger leere Änderungen nicht mehr ins Protokoll.
- **`…0800_konfiguration.sql`** – Die Startwerte als Daten: zwei Firmen, zwei Standorte, Lager Bulle, neun Touren, alle Auswahllisten, die vier Lieferanten und die Abläufe. Der PV-Ablauf hat 20 Schritte wie in V233.
- **`supabase/tests/datenmodell.test.sql`** – 17 automatische Prüfungen. Jede Tabelle hat Papierkorb, Protokoll und Zugriffsregeln, niemand kann hart löschen, Finanzen sind ohne Recht unsichtbar, und die Kundennummer läuft korrekt weiter.

## Import (`scripts/import/`)

- **`import-vorlage.mjs`** – Der Befehl `npm run import:vorlage`. Er liest das ZIP, führt die Schritte der Reihe nach aus und schreibt den Zählbericht. Er läuft nur gegen die lokale Datenbank, ausser man gibt beim Umzug ausdrücklich `--umzug` an.
- **`lesen.mjs`** – Öffnet das ZIP oder einen entpackten Ordner und gibt Daten und Dateien heraus.
- **`umwandeln.mjs`** – Kleine Helfer für die uneinheitlichen alten Werte: Beträge in Rappen, Datum, Schweizer Ortszeit, Sprache, Namen, Adressen.
- **`zuordner.mjs`** – Übersetzt alte Texte wie «Kunde kein Interesse» in die neuen Auswahlwerte. Unbekannte Werte meldet er, statt sie still zu verlieren.
- **`schreiber.mjs`** – Schreibt in die Datenbank und führt die Abgleichsliste alt → neu. Ein zweiter Lauf aktualisiert statt zu verdoppeln.
- **`bericht.mjs`** – Vergleicht pro Sammlung die Anzahl im Export mit der Anzahl im CRM und schreibt `import-bericht.md` (nur Zahlen, keine Kundendaten).
- **`schritte/*.mjs`** – Ein Schritt pro Bereich: Organisation, Preise, Kunden, Verkauf, Offerten/Projekte/Werkverträge, Dokumente, Finanzen und der Rest.
- **`umwandeln.test.mjs`, `zuordnung.test.mjs`** – 15 Tests für die Helfer und den Zählbericht, mit erfundenen Beispieldaten.

## App

- **`src/types/datenbank.ts`** – Automatisch erzeugte Beschreibung aller Tabellen für TypeScript (`npm run db:typen`). So merkt der Editor sofort, wenn ein Spaltenname falsch geschrieben ist.
- **`src/services/supabase.ts`** – Die Verbindung kennt jetzt diese Typen.
- **`src/modules/workcontracts/`** – Neuer Bereich «Werkverträge» unter Verkauf (Oberfläche folgt in Phase 7).
- **`tsconfig.scripts.json`** – Lässt TypeScript auch die Import-Skripte prüfen.
- **`docs/datenmodell.md`** – Übersicht aller Tabellen, wer sie sehen darf und woher die alten Daten kommen.
