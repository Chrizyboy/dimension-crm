# Dateien aus Phase 15 – in einfachen Worten

## Messen

- **`scripts/messen/lighthouse.mjs`** (`npm run messen`) – Misst Tempo und Barrierefreiheit der Hauptseiten am PC und am Handy und schreibt eine Tabelle.

## Tempo

- **`src/i18n/index.ts`**, **`src/main.tsx`** – Nur die aktive Sprache wird geladen, die andere erst beim Wechsel.
- **`src/components/shared/ErstWennSichtbar.tsx`** – Lädt einen Teil der Seite erst, wenn er ins Bild scrollt (Karten auf «Mein Tag»).
- **`vite.config.ts`** – Schriften werden im HTML vorgeladen.

## Tastatur

- **`src/hooks/useTastenkuerzel.ts`**, **`src/lib/spruenge.ts`** – «?» für die Übersicht, «G» + Buchstabe für Sprünge.
- **`src/hooks/useTaste.ts`**, **`src/stores/kuerzel.ts`** – Kürzel einer Ansicht mit Text für die Übersicht.
- **`src/layouts/KuerzelHilfe.tsx`** – Dialog «Tastenkürzel».
- **`src/hooks/useBefehle.ts`**, **`src/layouts/Befehlspalette.tsx`** – Sprünge und «Fehler melden» in der Befehlspalette.

## Zustände und Barrierefreiheit

- **`src/components/shared/Zustaende.tsx`**, **`Datentabelle.tsx`** – Fehleranzeige mit «Nochmal», Details und «Fehler melden».
- **`src/components/ui/karte.tsx`**, **`AkteAbschnitt.tsx`**, **`auswahl.tsx`**, **`tabelle.tsx`** – Überschriften in richtiger Reihenfolge, Namen für Auswahlfelder, Tabellen per Tastatur scrollbar.
- Viele Bereiche – Überschriften, Namen leerer Spalten, Lesetext ab 12 px.

## Handbuch (`src/modules/knowledge/`)

- **`supabase/migrations/20261106000100_handbuch.sql`** – Ablegen nur Administration, Versionen, Meldungen mit Nummer und Glocke.
- **`supabase/tests/handbuch.test.sql`** – 20 Prüfungen: Rechte, Versionen, doppelter Titel, Papierkorb, Melden, nur eigene Meldungen, Antwort mit Glocke.
- **`components/Handbuch.tsx`** – Seite mit Reitern und «Fehler melden».
- **`Anleitung.tsx`**, **`Prozesse.tsx`**, **`ProzessZeile.tsx`**, **`ProzessDialog.tsx`**, **`Videos.tsx`**, **`VideoKarte.tsx`**, **`VideoDialog.tsx`**, **`VideoAbspielen.tsx`**, **`Meldungen.tsx`**, **`MeldungKarte.tsx`**, **`MeldungDialog.tsx`** – die Reiter.
- **`lib/handbuch.ts`** (+ Test), **`lib/video.ts`** – Versionen, Titel aus Dateinamen, Dauer und Vorschaubild.
- **`services/`**, **`hooks/useHandbuch.ts`**, **`types.ts`**, **`schema.ts`**.

## Tests

- **`e2e/handbuch.spec.ts`** – Prozess ablegen, neue Version, entfernen; Fehler melden und beantworten; Tastatur.
