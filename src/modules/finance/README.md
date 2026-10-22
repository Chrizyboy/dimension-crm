# Modul: Finanzen

**Zweck:** Liquidität Woche für Woche (Bank-Saldo, offene Zahlungen nach Priorität bis Betreibung, Material je
Baustelle, Fixkosten, Eingänge mit Wahrscheinlichkeit, offene Rechnungen und Tranchen), Zahllauf und
Nachkalkulation je Projekt. Nur mit Recht `finanzen`.

Gebaut in Phase **10** nach dem Inventar der Vorlage V233 (Liquiditätsplanung) und Entscheid 0009
(Nachkalkulation, Lieferantenrechnungen je Projekt), Entscheid 0021.

## Reiter (`#/finance?reiter=…`)

- **Übersicht** (`uebersicht`): Kacheln (Kontostand, tiefster Stand, Woche unter Reserve), Warnungen, Szenario
  realistisch/pessimistisch/optimistisch, Balken je Woche, Woche aufklappen mit allen Bewegungen; Löhne ein-/ausblenden.
- **Zahlungen** (`zahlungen`): Lieferanten- und andere Zahlungen nach Priorität, Kategorie, «ungeprüft», Suche;
  bezahlt, Datum planen, Zahllauf-Vorschlag bis zum Kontostand minus Reserve.
- **Material** (`material`): Material je Baustelle mit Positionen und Zahlungsdatum.
- **Fixkosten** (`fixkosten`): Miete, Löhne, Versicherungen … mit Rhythmus und Tag; je Monat bezahlt oder verschoben.
- **Eingänge** (`eingaenge`): erwartete Eingänge mit Wahrscheinlichkeit (sicher, wahrscheinlich, unsicher).
- **Bank** (`bank`): Kontostand mit Datum, Verlauf, Wochen, Vorlauf, Reserve, MWST-Rückstellung.
- **Nachkalkulation** (`nachkalkulation`): je Projekt Soll (Kalkulation) gegen Ist (Material, Lieferantenrechnungen,
  Stunden, Nachträge, verrechnet), Belege einem Projekt zuordnen.

## Daten

- Besitzt: `kreditor_zahlungen` (mit `projekt_id`, `lieferant_id`, `abaninja_uuid`, `offen_rappen`, `bezahlt_am`),
  `material_zahlungen`, `fixkosten`, `erwartete_eingaenge`, `finanz_einstellungen` (`vorlage.main`).
- Liest: `rechnungen_liste`, `offene_tranchen`, `rechnung_zahlungen` (nach dem Saldo-Datum), `projekte`,
  Funktion `nachkalkulation`.
- Die Vorschau rechnet die App (`lib/vorschau.ts`), weil Szenario, Anpassungen und Löhne live umschalten.

## Abhängigkeiten

- `src/services/supabase.ts`, `meldungen.ts`, `fehler.ts`
- `src/components/shared/`: `AkteAbschnitt`, `Filterchips`, `Seitenkopf`, `Zustaende`

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `components/` – Seite, Übersicht mit Wochenbalken, je Reiter eine Liste mit Dialog, Zahllauf, Karte für die Startseite
- `hooks/` – `useFinanzen` (auch Projekte, Nachkalkulation), `useAktion`
- `services/` – `finanzen`
- `lib/` – Datum (Kalenderwoche, Fixtermine), Vorschau (Bewegungen, Szenarien, Saldo, Zahllauf), mit Tests
- `types.ts`, `schema.ts`, `index.ts`
