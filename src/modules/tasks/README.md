# Modul: Aufgaben

**Zweck:** Jede Person sieht ihre offenen Aufgaben mit Fälligkeit, hakt sie ab und springt zum Datensatz; Aufgaben kommen von Automationen oder werden von Hand angelegt.

**Stand:** Phase 12 gebaut (in V233 gab es die Tabelle `tasks`, sie war aber leer).

## Daten

- `aufgaben` (Titel, Text, Person, fällig am, erledigt am, Bezug `bezug_tabelle`/`bezug_id`, `lauf_id` wenn von einer Automation), Papierkorb über `geloescht_am`.
- `personen` (nur lesen, für «zuweisen an»).

## Abhängigkeiten

`src/services/supabase.ts`, `src/services/meldungen.ts`, `src/services/fehler.ts`, `src/lib/ziel.ts`.

## Ereignisse

- **sendet:** keine.
- **hört auf:** keine.

## Ordner

- `components/` – Liste mit Filtern (Meine/Alle, Offen/Erledigt), neue Aufgabe
- `hooks/` – `useAufgaben`, `usePersonen`
- `services/` – Laden, Abhaken, Anlegen
- `lib/` – Fälligkeit (heute in Zürich, überfällig, bald)
- `types.ts`, `schema.ts` – Typen und Prüfregeln
- `index.ts` – das Einzige, was andere importieren dürfen
