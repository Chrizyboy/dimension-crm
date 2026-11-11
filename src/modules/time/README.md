# Modul: Zeiterfassung

**Zweck:** Jede Person stempelt ihre Arbeitszeit, sieht Soll, Saldo und Ferienkonto und beantragt Abwesenheiten; die Zeit-Leitung (Chris, Loris) sieht alle und bewilligt. Entscheid 0059.

## Daten

- `zeiten` (gemeinsam mit «Baustelle & Rapporte»): Stempeln über `zeit_starten`/`zeit_stoppen`/`zeit_speichern`; Büro-Zeit auf den internen Posten `buero` (`einstellungen.baustelle.interne_posten`).
- `abwesenheiten` mit `status` (beantragt/bewilligt/abgelehnt): nur über `abwesenheit_speichern`, `abwesenheit_entscheiden`, `abwesenheit_zurueckziehen`; Trigger `stand` schützt den Stand.
- `zeitkonten`: Übertrag Ferien/Saldo je Person und Jahr, nur über `zeitkonto_setzen`.
- Lesen in einer Abfrage: `zeiterfassung(p_jahr, p_montag)`, Tage einer Person: `zeit_tage`.
- Rechnen nur in der Datenbank: `intern.zeit_tage`, `intern.zeit_konto`, Feiertage `intern.feiertage` (Ostern-Rechnung, Liste je Standort).
- Einstellungen `einstellungen.zeiterfassung` (nur Administration): `leitung` (Kürzel), `wochenstunden`, `ferientage`, `aktiv_seit`, `feiertage` je Standort. Eigenschaften der Arten (`bewilligung`, `soll`, `ferien`) in der Auswahlliste `abwesenheit`.

## Abhängigkeiten

`src/services/supabase`, `fachfehler`, `meldungen`, `fehler`; Bausteine aus `src/components/ui` und `shared`. Kein anderes Modul.

## Ereignisse

- **sendet:** keine (Glocken setzt die Datenbank).
- **hört auf:** keine.

## Ordner

- `components/` – Seite, Stempeluhr, Woche, Abwesenheiten, Kalender, Team
- `hooks/` – Abfragen (`useZeit`) und `useAktion`
- `services/` – Datenbank-Aufrufe
- `lib/` – Rechnen mit Tagen und Zeiten (Anzeige)
- `types.ts`, `schema.ts`, `index.ts`
