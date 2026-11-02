# Modul: Team & Ausweise

**Zweck:** Übersicht «wer darf was» (Kurse und Ausweise aller Personen, Pflicht je Rolle) und die Personal-Akte.
Jede Person pflegt ihre eigenen Ausweise und ihre Akte, die Administration alle.

Gebaut in Phase **17** (ERP-Lückenanalyse), Entscheid 0028. Für alle sichtbar (`immer`).

## Ansicht (`#/staff?person=…`)

- Übersicht als Tabelle Person × Ausweis: «fehlt» (Pflicht für die Rolle), gelb (läuft in 60 Tagen ab), rot
  (abgelaufen). Filter «Handlungsbedarf». «Meine Akte» öffnet die eigene Person.
- Person als Seitenpanel: Kurse und Ausweise mit Bestätigung (Foto/PDF) und die Personal-Akte (Entscheid 0040):
  Fristen als Marken oben, Anstellung, Lohn zur Info, Persönlich, Arbeitskleider und Ausrüstung, Gespräche,
  Dokumente, Notiz. Was erscheint, liefert `personal_akte()` je nach Sicht: Recht «personal» alles, die Person
  selbst ohne Lohn und Notiz, Vorgesetzte nur Anstellung, Gespräche, nicht vertrauliche Dokumente und Notfall.

## Daten

- Besitzt: `qualifikationen` (lesen alle, ändern Administration oder die Person), `personal_akten` (Recht
  «personal» und die Person; die App liest über `personal_akte()`), `personal_loehne` (nur Recht «personal»),
  `personal_gespraeche` (über `personal_gespraech_speichern`), `personal_dokumente`, Speicher `personal`
  (Ordner = Person).
- Auswahllisten: `personal_vertragsart`, `personal_bewilligung`, `personal_zivilstand`, `personal_gespraech`,
  `personal_dokument` (Eigenschaft `vertraulich`).
- Liest: `personen` mit `rollen`, Auswahlliste `qualifikation` (Gültigkeit, Pflicht je Rolle).

## Abhängigkeiten

- `src/services/supabase.ts`, `meldungen.ts`, `fehler.ts`, `fachfehler.ts`, `src/hooks/useAuswahl.ts`, `src/lib/bild.ts`
- `src/components/shared/`: `AkteAbschnitt`, `Filterchips`, `Seitenkopf`, `Zustaende`

## Ereignisse

- **sendet:** keine (ablaufende Ausweise meldet `fristen_melden`, Probezeit, Befristung, Bewilligung und Gespräch
  `personal_fristen_melden` in der Datenbank)
- **hört auf:** keine

## Ordner

- `components/` – Seite, Übersicht, Person, Dialoge Ausweis und Akte
- `hooks/` – `useTeam`, `useAktion`
- `services/` – `personal` (Team, Ausweise, Dateien), `akte` (Akte, Lohn, Gespräch, Dokument)
- `lib/` – `matrix` (gültiger Ausweis, Stand, Vorschlag «gültig bis»), `akte` (AHV, IBAN, Probezeit, Fristen),
  beide mit Tests
- `types.ts`, `schema.ts`, `index.ts`
