# Modul: Team & Ausweise

**Zweck:** Wer gehört zum Team und ist heute wo, wer darf was (Kurse und Ausweise, Pflicht je Rolle), welche Kurse
sind beantragt, bewilligt, angemeldet, was kosten sie, und die Personal-Akte. Jede Person pflegt ihre eigenen Ausweise
und beantragt Kurse, Vorgesetzte planen für ihre Mitarbeitenden, Recht «personal» (heute Administration) alles.

Gebaut in Phase **17** (ERP-Lückenanalyse), Entscheid 0028; Personal-Akte Entscheid 0040; Team, Kurse und
Anforderungen Entscheid 0041. Für alle sichtbar (`immer`).

## Ansicht (`#/staff?reiter=…&person=…&kurs=…`)

- **Team:** alle aktiven Personen nach Standort mit Funktion, Sprache, Telefon, Vorgesetzt und «Heute» (abwesend bis …,
  Kurs, Baustelle mit Ort, Service-Termin). Grund einer Abwesenheit nur für die Person selbst, Vorgesetzte, Recht
  «personal» oder «finanzen». Filter Standort, «Heute da», Handlungsbedarf; Suche.
- **Ausweise:** Vorschlag «Kurs für N planen» (gemeinsamer Kurs statt Einzeltermine), Übersicht Person × Ausweis:
  rot = Pflicht fehlt/abgelaufen, gelb = läuft in 60 Tagen ab, blau = Kurs gebucht; Fusszeile «gültig x von y».
- **Kurse:** Kennzahlen (geplant, Anträge, Kosten gegen Budget, Kurstage), Liste des Jahres mit Stand. Weg:
  beantragt › bewilligt › angemeldet (Datum, Tag als Abwesenheit «Weiterbildung» in der Einsatzplanung) › besucht
  (Ausweis mit «gültig bis» entsteht, Aufgabe «Bestätigung hochladen»). Weiterbildungsvereinbarung mit Rückzahlung.
- **Anforderungen:** Ausweis × Rolle mit Häkchen (Pflicht), Gültigkeit in Monaten, neue Art hinzufügen.
- **Person** als Seitenpanel: Kontakt zum Kopieren, Vorgesetzt, Heute; Reiter Ausweise, Kurse, Ausrüstung (aus
  Fahrzeuge & Geräte), Personal-Akte (Fristen, Anstellung, Lohn zur Info, Persönlich, Gespräche, Dokumente).

## Daten

- Besitzt: `qualifikationen` (+ `kurs_id`), `kurse` (ändern nur über `kurs_speichern`, `kurs_entscheiden`,
  `kurs_besucht`; lesen über `team_kurse()`, Kosten nur für Berechtigte), `personal_akten`, `personal_loehne`,
  `personal_gespraeche`, `personal_dokumente`, Speicher `personal` (Ordner = Person).
- Liest: `team_uebersicht()` (Personen, Vorgesetzt, Heute), `rollen`, `fahrzeuge`/`geraete` (Ausrüstung),
  Auswahllisten `qualifikation` (Gültigkeit, Pflicht je Rolle; ändern über `ausweis_anforderung_speichern`),
  `abwesenheit`, `personal_*`.
- Schreibt in fremde Tabellen nur über die Datenbank: `abwesenheiten` (Trigger `kurs_abwesenheiten`), `aufgaben`,
  `benachrichtigungen`.
- Einstellungen `einstellungen.team`: `bewilligung_grenze_rappen` (Vorgesetzte bis hier, darüber Recht «personal»),
  `budget_rappen` je Jahr, `vereinbarung_ab_rappen`.

## Abhängigkeiten

- `src/services/supabase.ts`, `meldungen.ts`, `fehler.ts`, `fachfehler.ts`, `src/hooks/useAuswahl.ts`, `src/lib/bild.ts`
- `src/components/shared/`: `AkteAbschnitt`, `Filterchips`, `Seitenkopf`, `Zustaende`

## Ereignisse

- **sendet:** keine (Glocke für Antrag, Bewilligung, Anmeldung und Absage schreibt die Datenbank; ablaufende Ausweise
  meldet `fristen_melden`, Personal-Fristen `personal_fristen_melden`)
- **hört auf:** keine

## Ordner

- `components/` – Seite mit Reitern, Team-Liste, Ausweis-Übersicht, Kurse, Anforderungen, Person mit Reitern, Dialoge
- `hooks/` – `useTeam` (Team, Ausweise, Kurse, Rollen, Ausrüstung, Akte), `useAktion`
- `services/` – `personal` (Ausweise, Dateien, Rollen, Ausrüstung), `kurse` (Team, Kurse, Anforderungen), `akte`
- `lib/` – `matrix`, `kurse` (geplant, Vorschläge, Kosten, Kurstage, Rückzahlung), `akte`, alle mit Tests
- `types.ts`, `schema.ts`, `index.ts`
