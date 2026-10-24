# Dateien aus Phase 14 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261105000100_mein_tag.sql`** – `heute_fuer_mich()`: alles, was heute für die angemeldete Person ansteht (Termine heute und morgen, Aufgaben für mich und von mir vergeben, Nachfassen, neue Anfragen, Wiedervorlagen, Fristen, Zahlungen, Service, Kontrollen und Wartungen).
- **`…0200_kennzahlen.sql`** – Einstellung `kennzahlen` (Kosten pro Lead, Rollen für die Auslastung), `kennzahlen_fakten` (jede gezählte Sache als Zeile), `kennzahlen_quellen_kosten`, `kennzahlen_betrieb` (Auftragsbestand, Auslastung, Marge).
- **`supabase/tests/mein_tag_kennzahlen.test.sql`** – 25 Prüfungen: nichts anonym, Termine mit Schweizer Zeit, Aufgaben für mich und vergeben, Nachfassen nur eigene, Leads am eigenen Standort, Zahlungen, Service, Kontrollen, Kennzahlen mit Standort und Betrag, Lead-Quelle bis zur Offerte, Kosten ändern, Auftragsbestand, Auslastung, Marge nur mit Recht.
- **`src/types/datenbank.ts`** – Typen neu erzeugt.

## Mein Tag (`src/modules/today/`)

- **`components/MeinTag.tsx`** – Die Seite: Begrüssung, Datum, Anzahl offener Punkte, Karten.
- **`components/TagKarte.tsx`**, **`TagZeile.tsx`** – Karte mit Anzahl und Zeilen; Klick öffnet den Datensatz, Telefon ruft an, Aufgaben abhaken.
- **`components/TagesMail.tsx`** – «Übersicht per Mail an mich» mit Text zum Prüfen, über den Ausgangskorb.
- **`lib/tag.ts`** (+ Test) – Begrüssung, Mail-Text, Zählen.
- **`services/meinTag.ts`**, **`hooks/useMeinTag.ts`**, **`types.ts`**, **`schema.ts`**.

## Kennzahlen (`src/modules/dashboard/`)

- **`components/Kennzahlen.tsx`** – Seite mit Zeitraum, Firma und Reitern; Auswahl in der Adresse.
- **`Kacheln.tsx`**, **`KennzahlTabelle.tsx`**, **`OffertenBalken.tsx`**, **`Quellen.tsx`** – Reiter Verkauf.
- **`Pipeline.tsx`** – Offene Geschäfte nach Standort und Kanton.
- **`Betrieb.tsx`**, **`Auftragsbestand.tsx`**, **`AuslastungTabelle.tsx`**, **`Marge.tsx`** – Reiter Aufträge und Auslastung.
- **`DetailDialog.tsx`** – Was hinter einer Zahl steht, mit Total.
- **`lib/auswertung.ts`**, **`lib/zeitraum.ts`**, **`lib/format.ts`** (+ Test) – Zählen, Quote, Lead-Quellen, Zeiträume, Kalenderwochen.
- **`services/kennzahlen.ts`**, **`hooks/useKennzahlen.ts`**, **`types.ts`**, **`schema.ts`**.

## Übrige

- **`src/layouts/Startseite.tsx`** – Startseite = Mein Tag plus KI-Briefing, Ausschreibungen und Karten der Bereiche.
- **`src/layouts/Systemstatus.tsx`** – Systemstatus und Bauplan, eingeklappt, nur Administration.
- **`src/app/index.tsx`**, **`today.tsx`**, **`dashboard.tsx`**, **`tasks.tsx`** – Adressen (`/` → `/today`, Kennzahlen mit Reiter/Zeitraum/Firma, Aufgaben `?wer=vergeben`).
- **`src/modules/tasks/`** – Filter «Von mir vergeben», Knopf «+ Aufgabe» für Mein Tag.
- **`src/lib/ziel.ts`** – Service-Fälle öffnen.
- **`src/index.css`** – Zwei Diagrammfarben (Muri, Bulle), geprüft für Hell und Dunkel.
- **`src/i18n/de.json`**, **`fr.json`** – Texte `tag.*` und `kz.*`.
- **`e2e/heute.spec.ts`** – Browser-Test Mein Tag und Kennzahlen; `e2e/grundgeruest.spec.ts` angepasst.
- **`docs/entscheidungen/0025-mein-tag-und-kennzahlen.md`**, **`docs/datenmodell.md`**, READMEs, `CLAUDE.md`, Bauplan.
