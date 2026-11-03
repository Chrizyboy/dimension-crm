# Modul: Aufgaben

**Zweck:** Der Arbeitsvorrat jeder Person: was bis wann zu tun ist, gruppiert nach Fälligkeit, mit Akte
(Teilschritte, Verlauf, Weitergeben, Verschieben), Vertretung bei Abwesenheit und Team-Sicht für die
Geschäftsleitung. Aufgaben kommen von Hand, aus der Schnelleingabe, aus Automationen, Monitoren, Fristen und KI.

**Stand:** Phase 12 gebaut, vollständig ausgebaut am 02.11.2026 (Entscheid 0045).

## Daten

- `aufgaben` (Titel, Text, Person, fällig am, wichtig, Teilschritte, Wiederholung, erledigt am/von/Notiz, Bezug
  `bezug_tabelle`/`bezug_id`, `lauf_id`, `quelle`, `vorgaenger_id`), Papierkorb über `geloescht_am`.
- `aufgaben_kommentare` (Verlauf, `@Kurzzeichen` meldet in der Glocke).
- Sicht `aufgaben_liste` (mit Bezug-Name, Herkunft, Ersteller, Kommentaren, Vertretung), `aufgaben_team()`.
- `aufgabe_erledigen(id, notiz)`; `aufgaben_melden()` vom Zeitplan.
- Regeln in `einstellungen.aufgaben` (nur Administration): `sichtbarkeit`, `vertretung`, `notiz_in_verlauf`, `erinnern_ab`.
- `personen` (nur lesen, für «Für wen» und Kurzzeichen).

## Abhängigkeiten

`src/services/supabase.ts`, `src/services/meldungen.ts`, `src/services/fehler.ts`, `src/lib/ziel.ts`, `src/lib/rechte.ts`.

## Ereignisse

- **sendet:** keine (Glocken setzt die Datenbank).
- **hört auf:** keine.

## Ordner

- `components/` – Seite mit Ansichten, `Schnelleingabe`, `AufgabenListe`/`AufgabeZeile`, `AufgabeAkte` mit
  `AkteAktionen`, `TeilschritteBox`, `KommentarBox`, `TeamSicht`, `NeueAufgabe`; `NeueAufgabeKnopf` für Mein Tag
  und Akten anderer Bereiche (mit Bezug)
- `hooks/` – `useAufgaben`, `useAufgabe`, `useKommentare`, `useTeam`, `usePersonen`
- `services/` – Laden, Erledigen, Ändern, Kommentieren, Team
- `lib/` – Fälligkeit und Gruppen (Zürich), Schnelleingabe
- `types.ts`, `schema.ts` – Typen und Prüfregeln
- `index.ts` – das Einzige, was andere importieren dürfen
