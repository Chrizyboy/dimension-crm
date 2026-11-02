# Modul: Kennzahlen

**Zweck:** Wie läuft es, für jede Rolle? Sieben Reiter: Überblick (Geschäftsleitung), Verkauf (eigene Zahlen und Rangliste), Pipeline & Prognose, Abwicklung (Projektleitung, Montage), Finanzen (nur Recht `finanzen`), Service & Wartung und alle Zahlen (Tabelle wie V233 nach Standort und Person). Jede Zahl mit Vergleich (Vorjahr oder Vorperiode) und, wo eines erfasst ist, Ziel; jede Zahl zeigt per Klick ihre Einträge (auch als CSV).

**Stand:** Neuentwurf 2.11.2026, Entscheid 0040 (`#/dashboard?reiter=…&zeitraum=…&vergleich=…&bereich=…&person=…&bericht=JJJJ-MM`). Startreiter je Rolle aus `lib/rolle.ts`.

## Daten

- `kennzahlen_fakten(von, bis)`: Grundzeilen (Leads, Offerten, Zahlungen, Fälle), gezählt in `lib/auswertung.ts`.
- `kennzahlen_zusatz(von, bis)`: Zusatzzeilen mit `kwp`, `tage`, `zusatz` (Aufträge mit Produkten, Dauern, Verlustgründe, IBN, Projekte, Umsatz exkl. MWST, Zahlungen, offene Rechnungen, Service-Fälle mit Reaktion, Wartungsverträge). `useZeilen` hängt beide zusammen.
- `kennzahlen_betrieb(von, bis)`: Auftragsbestand, Auslastung, Marge (nur `preise`/`finanzen`).
- `einstellungen.kennzahlen`: `ziele` je Jahr (Firma, gesamt, Umsatz, Personen, Rappen), `wahrscheinlichkeit` je Stand, `alt_tage`, `richtwerte`, Kosten pro Lead. Ändern nur über `kennzahlen_einstellungen_setzen` (Recht `finanzen`).
- Monatsbericht: Glocke am 1. vom Zeitplan (`kennzahlen_monatsbericht_melden`), PDF in der App (`services/monatsbericht.ts`, pdf-lib erst beim Erstellen).

## Rechnen

- Ziele anteilig nach Tagen (`lib/ziele.ts`), kein Ziel, wenn ein Jahr fehlt.
- Prognose = offene Offerten × Wahrscheinlichkeit je Stand (`lib/verkauf.ts`, `pipelineNachStand`).
- «Was jetzt zählt» sind feste Regeln über dieselben Zeilen (`lib/hinweise.ts`).

## Abhängigkeiten

- `src/services/supabase.ts`, `src/services/fachfehler.ts`, `src/lib/rechte.ts`, `src/lib/format.ts`, `src/lib/datei.ts`.

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Neue Kennzahl

Schlüssel in `kennzahlen_fakten` oder `kennzahlen_zusatz` (neue Migration), dann im passenden Reiter (`components/reiter/`) oder als Zeile in `GRUPPEN` (`lib/auswertung.ts`), Text in DE und FR.
