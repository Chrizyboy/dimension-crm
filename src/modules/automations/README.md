# Modul: Automationen

**Zweck:** Die Administration stellt Abläufe «Wenn → Nur wenn → Dann» ein (z. B. neuer Lead → Aufgabe Erstkontakt), und sieht im Protokoll jeden Lauf mit allen Schritten.

**Stand:** Phase 12 gebaut. Nur mit Recht `admin` sichtbar (`meta.recht`). Entscheid 0023.

## Daten

- `automationen` (Regeln als Daten; 15 Vorlagen mit `vorlage`, eigene ohne), Papierkorb über `geloescht_am`.
- `automation_laeufe` (nur lesen; `protokoll` als Liste von Schritten), `einstellungen.automationen`.
- Funktionen: `automation_katalog()` + `automation_katalog_ausbau()` (Auslöser, Felder, Aktionen, Empfänger, Platzhalter), `automation_lauf_abbrechen`.
- Entscheid 0044: `automation_uebersicht`, `automation_kennzahlen`, `automation_geplant`, `automation_probelauf`, `automation_aenderungen`, `automation_lauf_stoppen/fortsetzen/verschieben/jetzt`, `automation_schritt_wiederholen`. Schutzregeln (Versandfenster, Kontakt-Pause, Feiertage) in `einstellungen.automationen`, je Automation `versandfenster`/`kontakt_pause_tage`.
- Der Motor selbst läuft in der Datenbank und im Zeitplan, nie in der App (siehe `docs/datenmodell.md`).

## Abhängigkeiten

`src/services/supabase.ts`, `src/services/fachfehler.ts` (Fehler-Schlüssel `automation.*`), `src/lib/ziel.ts` (Links zum Datensatz), gemeinsame Bausteine `Datentabelle`, `Filterchips`, `Zeitachse`. Für andere Bereiche: `src/services/automatik.ts` und `src/components/shared/automatik/` (Automatisch geplant in Akten, «Warum?» bei Aufgaben).

## Ereignisse

- **sendet:** keine (Signale entstehen in der Datenbank).
- **hört auf:** keine.

## Ordner

- `components/` – Übersicht, Liste nach Bereich, Geplant, Editor (Lesesatz, Bedingungen, Aktionen, Schutz, Probelauf, Änderungen), Protokoll, Lauf, Schutzregeln, Einstellungen
- `hooks/` – `useAutomationen`, `useKatalog`, `useLaeufe`, `useAutomationsEinstellungen`, `useAktion`
- `services/` – Laden, Speichern, Schalten, Papierkorb, Lauf beenden
- `lib/` – Anzeige-Hilfen (Werte, Platzhalter, Wartetage), Bereiche, Filter für Geplant, Wirkung, Feiertage und der Entwurf einer neuen Automation
- `types.ts` – fachliche Typen
- `index.ts` – das Einzige, was andere importieren dürfen
