# Modul: Automationen

**Zweck:** Die Administration stellt Abläufe «Wenn → Nur wenn → Dann» ein (z. B. neuer Lead → Aufgabe Erstkontakt), und sieht im Protokoll jeden Lauf mit allen Schritten.

**Stand:** Phase 12 gebaut. Nur mit Recht `admin` sichtbar (`meta.recht`). Entscheid 0023.

## Daten

- `automationen` (Regeln als Daten; elf Vorlagen mit `vorlage`, eigene ohne), Papierkorb über `geloescht_am`.
- `automation_laeufe` (nur lesen; `protokoll` als Liste von Schritten), `einstellungen.automationen`.
- Funktionen: `automation_katalog()` (Auslöser, Felder, Aktionen, Empfänger, Platzhalter), `automation_lauf_abbrechen`.
- Der Motor selbst läuft in der Datenbank und im Zeitplan, nie in der App (siehe `docs/datenmodell.md`).

## Abhängigkeiten

`src/services/supabase.ts`, `src/services/fachfehler.ts` (Fehler-Schlüssel `automation.*`), `src/lib/ziel.ts` (Links zum Datensatz), gemeinsame Bausteine `Datentabelle`, `Filterchips`, `Zeitachse`.

## Ereignisse

- **sendet:** keine (Signale entstehen in der Datenbank).
- **hört auf:** keine.

## Ordner

- `components/` – Liste, Editor (Bedingungen, Aktionen, Empfänger, Texte DE/FR), Protokoll, Lauf, Einstellungen
- `hooks/` – `useAutomationen`, `useKatalog`, `useLaeufe`, `useAutomationsEinstellungen`, `useAktion`
- `services/` – Laden, Speichern, Schalten, Papierkorb, Lauf beenden
- `lib/` – Anzeige-Hilfen (Werte, Platzhalter, Wartetage) und der Entwurf einer neuen Automation
- `types.ts` – fachliche Typen
- `index.ts` – das Einzige, was andere importieren dürfen
