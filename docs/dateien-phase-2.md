# Dateien aus Phase 2 – in einfachen Worten

Neue und stark geänderte Dateien aus Phase 2 (Design-System), je mit zwei bis drei Sätzen.

## Farben und Schriften

- **`src/index.css`** – Alle Farben, Schriften, Rundungen und Animationen als Tokens für Hell und Dunkel. Marke aus dem Logo gemessen (Orange `#EF7C00`, Marineblau `#02224F`); Details in `docs/design-system.md`.
- **`index.html`, `vite.config.ts`** – Die Farbe der Handy-Statusleiste ist jetzt das Marineblau aus dem Logo.

## Bausteine (`src/components/ui/`)

- **`button.tsx`** – Der Knopf in sechs Arten und vier Grössen. Mit `laedt` zeigt er einen Drehkreis und ist gesperrt, damit niemand doppelt klickt.
- **`input.tsx`** – Eingabefeld und mehrzeiliges Textfeld im einheitlichen Stil. Fehlerhafte Felder bekommen einen roten Rand.
- **`feld.tsx`** – Beschriftung plus Feld plus Hinweis oder Fehlermeldung in einem. Bildschirmleser lesen den Hinweis automatisch mit vor.
- **`auswahl.tsx`** – Auswahlliste (z. B. Standort Muri/Bulle), mit Tastatur bedienbar. Basiert auf Radix, einer bewährten Bibliothek für zugängliche Bedienelemente.
- **`schalter.tsx`** – Kästchen zum Ankreuzen und Ein/Aus-Schalter.
- **`badge.tsx`** – Kleine Statusmarke wie «Offen» oder «Bezahlt», in sechs Tönen. Optional mit Punkt davor.
- **`karte.tsx`** – Weisse Karte mit Titel und Inhalt, der Grundbaustein für Kacheln und Bereiche.
- **`dialog.tsx`** – Fenster über der Seite, entweder in der Mitte oder als Blatt von rechts (für Details). Esc schliesst, der Fokus bleibt im Fenster.
- **`menue.tsx`** – Aufklappmenü, z. B. das Konto-Menü oben rechts. Gefährliche Einträge sind rot markiert.
- **`tooltip.tsx`** – Kurzer Hinweis beim Darüberfahren, mit Untertitel und Tastenkürzel. In der eingeklappten Seitenleiste zeigt er den Bereichsnamen.
- **`reiter.tsx`** – Reiter zum Umschalten innerhalb einer Seite (z. B. Übersicht / Dokumente / Verlauf).
- **`tabelle.tsx`** – Tabelle mit festem Kopf und rechtsbündigen Zahlenspalten. Die grosse Datentabelle mit Filtern folgt in Phase 3.
- **`diverses.tsx`** – Kleinteile: Ladeplatzhalter (Skelett), Tastenkürzel-Anzeige, Trennlinie und Avatar mit Initialen. Der Avatar hat pro Name immer dieselbe Farbe.

## Gemeinsame Bausteine (`src/components/shared/`)

- **`Seitenkopf.tsx`** – Titel, Beschreibung und Knöpfe oben auf jeder Seite. So sehen alle Seiten gleich aus.
- **`Zustaende.tsx`** – «Noch keine Einträge» und «Etwas ist schiefgelaufen» mit Knopf «Nochmal versuchen». Jede Liste nutzt diese, statt eine leere Fläche zu zeigen.
- **`Logo.tsx`** – Zeigt das richtige Logo je nach Sprache und Hintergrund (hell oder dunkel).

## App-Rahmen (`src/layouts/`)

- **`AppShell.tsx`** – Der Rahmen: Seitenleiste, Kopfzeile, Inhalt, Handy-Leiste, Befehlspalette und Meldungen. Mit «Zum Inhalt springen» für Tastatur-Nutzer.
- **`Seitenleiste.tsx`** – Marineblaue Navigation, mit Ctrl B auf Icons einklappbar. Unten der Link zum Design-System.
- **`Kopfzeile.tsx`** – Suche (öffnet die Befehlspalette), DE/FR-Umschalter, Glocke und Konto-Menü mit Darstellung und Sprache.
- **`Befehlspalette.tsx`** – Mit Ctrl K jeden Bereich und jede Aktion per Tastatur finden, auf Deutsch oder Französisch. In späteren Phasen sucht sie auch Kunden, Offerten und Projekte.
- **`Benachrichtigungen.tsx`** – Die Glocke mit ungelesenen Meldungen und die Liste dazu. Ein Klick führt direkt zur betroffenen Stelle.
- **`HandyNavigation.tsx`** – Leiste unten am Handy mit Mein Tag, Anfragen, Projekte, Aufgaben und «Mehr». «Mehr» öffnet die ganze Seitenleiste als Blatt.
- **`Startseite.tsx`** – Neu gestaltet mit Status-Kacheln, Bauplan und Beispielen der Schweizer Formate.
- **`ModulPlatzhalter.tsx`** – Seite für noch nicht gebaute Bereiche; zeigt jetzt auch den Untertitel und die geplante Phase.
- **`design/*.tsx`** – Die Design-System-Seite in Abschnitten: Bereiche und Namen, Farben, Schrift, Bedienung, Formular, Daten, Überlagerungen, Zustände. Hier sieht man jeden Baustein live.

## Seiten (`src/app/`)

- **`design.tsx`** – Adresse `#/design` für das Design-System.
- **`benachrichtigungen.tsx`** – Adresse `#/benachrichtigungen` mit allen Meldungen auf einer Seite.
- **`__root.tsx`** – Fängt jetzt Fehler ab und zeigt eine verständliche Fehlerseite statt einer weissen Fläche. Unbekannte Adressen zeigen «Diese Seite gibt es nicht».

## Logik

- **`src/hooks/useBefehle.ts`** – Liste aller Befehle für die Befehlspalette (Bereiche öffnen, Sprache, Darstellung …). Neue Module erscheinen automatisch.
- **`src/hooks/useTastenkuerzel.ts`** – Hört auf Ctrl K und Ctrl B (am Mac Cmd).
- **`src/lib/tastenkuerzel.ts`** – Erkennt Mac oder Windows und zeigt das passende Kürzel an.
- **`src/lib/format.ts`** – Neu: `formatRelativ` für «vor 5 Minuten» / «il y a 5 minutes»; ab 7 Tagen kommt das Datum.
- **`src/stores/ui.ts`** – Merkt sich zusätzlich, ob Befehlspalette und Handy-Menü offen sind (nur bis zum Neuladen).
- **`src/stores/benachrichtigungen.ts`** – Speichert die Meldungen der Glocke, höchstens 50. Ab Phase 3 kommen sie aus der Datenbank.
- **`src/services/meldungen.ts`** – Ein Befehl `melde(...)` für kurze Rückmeldungen unten rechts, optional zusätzlich in die Glocke.
- **`src/services/fehler.ts`** – Fehlerüberwachung mit Sentry, nur aktiv mit `VITE_SENTRY_DSN`. Sendet keine Personendaten (Entscheid 0007).
- **`src/types/modul.ts`, `src/modules/*/index.ts`** – Jeder Bereich hat jetzt einen eindeutigen Namen und einen Untertitel in DE und FR (Entscheid 0008).

## Tests

- **`e2e/bedienung.spec.ts`** – Prüft Befehlspalette, Benachrichtigungen, Design-Seite und Fehlermeldung bei falschem Betrag.
- **`e2e/barrierefreiheit.spec.ts`** – Prüft drei Seiten in Hell und Dunkel automatisch auf Zugänglichkeit (WCAG 2.1 AA).
- **`src/lib/navigation.test.ts`** – Neu: Kein Bereichsname doppelt, jeder hat einen Untertitel.
