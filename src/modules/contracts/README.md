# Modul: Wartungsverträge

**Zweck:** Verwaltet wiederkehrende Wartungen: welche Leistungen, wie oft, zu welchem Preis, wann die nächste fällig ist, und druckt den Vertrag in der Sprache des Kunden.

**Stand:** gebaut in Phase **9** (V233: Verträge, Leistungen WA_LEIST). Entscheid: `docs/entscheidungen/0018-projekte-service-wartung.md`.

## So läuft es

1. «Neuer Vertrag»: Kunde, Projekt, Vertragsbeginn, Laufzeit, Rhythmus, Preis pro Jahr inkl. MWST, Sprache, Leistungen (die üblichen sind vorgewählt). Nummer W001 … und erste Wartung (Start + Rhythmus) setzt die Datenbank.
2. Liste «Fällig in 30 Tagen» und die Startseiten-Karte zeigen, wer dran ist.
3. «Wartung erledigt» mit Datum und Notiz trägt die Wartung in den Verlauf ein und setzt die nächste.
4. «Vertrag als PDF»: A4 über den Druckdialog, Deutsch aus Muri, Französisch aus Bulle.

## Daten

- Besitzt: `wartungsvertraege`, Einstellung `wartung_leistungen` (Katalog).
- Liest: `kontakte`, `objekte`, `projekte`, `auswahlwerte` (Stand).
- Abläufe: `wartung_erledigt`; Nummer und erste Wartung setzt ein Trigger.

## Abhängigkeiten

- `src/services/supabase.ts`, `src/services/kontakte.ts` (über `KundeWahl`), `src/services/fachfehler.ts`, `src/services/meldungen.ts`, `src/hooks/useDrucken.ts`.

## Ereignisse

- **sendet:** keine.
- **hört auf:** keine.

## Ordner

- `components/` – Seite, Spalten, Akte, Dialoge, Druck, Startseiten-Karte
- `hooks/`, `services/`, `lib/` (Daten rechnen, Fälligkeit), `types.ts`, `schema.ts`, `index.ts`
