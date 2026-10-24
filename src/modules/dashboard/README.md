# Modul: Kennzahlen

**Zweck:** Wie läuft es? Verkauf (Kacheln, Tabelle nach Standort und Person, gesendete Offerten, Lead-Quellen mit Kosten), offene Pipeline pro Region, Auftragsbestand, Auslastung Montage und Marge je Projekt (V233 Dashboard, ERP 0009). Jede Zahl zeigt per Klick ihre Einträge.

**Stand:** Phase 14 (`#/dashboard?reiter=…&zeitraum=…&bereich=…`).

## Daten

- `kennzahlen_fakten(von, bis)`: jede gezählte Sache als Zeile; gezählt und summiert in `lib/auswertung.ts`.
- `kennzahlen_betrieb(von, bis)`: Auftragsbestand, Auslastung, Marge (nur mit Recht `preise` oder `finanzen`).
- `verkauf_geschaefte` (Pipeline), `einstellungen.kennzahlen` (Kosten pro Lead; ändern über `kennzahlen_quellen_kosten`), `auswahlwerte` (Namen der Quellen), `personen`.

## Abhängigkeiten

- `src/services/supabase.ts`, `src/lib/ziel.ts`, `src/lib/format.ts`.

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Neue Kennzahl

Schlüssel in `kennzahlen_fakten` (neue Migration) und eine Zeile in `GRUPPEN` (`lib/auswertung.ts`) plus Text `kz.zeile.<id>` in DE und FR.
