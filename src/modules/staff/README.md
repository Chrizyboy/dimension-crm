# Modul: Team & Ausweise

**Zweck:** Übersicht «wer darf was» (Kurse und Ausweise aller Personen, Pflicht je Rolle) und die Personal-Akte.
Jede Person pflegt ihre eigenen Ausweise und ihre Akte, die Administration alle.

Gebaut in Phase **17** (ERP-Lückenanalyse), Entscheid 0028. Für alle sichtbar (`immer`).

## Ansicht (`#/staff?person=…`)

- Übersicht als Tabelle Person × Ausweis: «fehlt» (Pflicht für die Rolle), gelb (läuft in 60 Tagen ab), rot
  (abgelaufen). Filter «Handlungsbedarf». «Meine Akte» öffnet die eigene Person.
- Person als Seitenpanel: Kurse und Ausweise mit Bestätigung (Foto/PDF), Personal-Akte (nur Administration und die
  Person selbst, sonst ein Hinweis).

## Daten

- Besitzt: `qualifikationen` (lesen alle, ändern Administration oder die Person), `personal_akten` (nur
  Administration und die Person; die App liest `personal_akten_sicht`), Speicher `personal` (Ordner = Person).
- Liest: `personen` mit `rollen`, Auswahlliste `qualifikation` (Gültigkeit, Pflicht je Rolle).

## Abhängigkeiten

- `src/services/supabase.ts`, `meldungen.ts`, `fehler.ts`, `fachfehler.ts`, `src/hooks/useAuswahl.ts`, `src/lib/bild.ts`
- `src/components/shared/`: `AkteAbschnitt`, `Filterchips`, `Seitenkopf`, `Zustaende`

## Ereignisse

- **sendet:** keine (ablaufende Ausweise meldet `fristen_melden` in der Datenbank)
- **hört auf:** keine

## Ordner

- `components/` – Seite, Übersicht, Person, Dialoge Ausweis und Akte
- `hooks/` – `useTeam`, `useAktion`
- `services/` – `personal`
- `lib/` – `matrix` (gültiger Ausweis, Stand, Vorschlag «gültig bis», mit Tests)
- `types.ts`, `schema.ts`, `index.ts`
