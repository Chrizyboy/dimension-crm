# Modul: Fahrzeuge & Geräte

**Zweck:** Fahrzeuge mit MFK, Service und Kilometerstand, Geräte (Absturzsicherungen, Leitern, Messgeräte …) mit
Prüftermin und wer sie gerade hat, und alle Fristen an einem Ort. Am Handy: Eintrag erfassen und übergeben.

Gebaut in Phase **17** (ERP-Lückenanalyse), Entscheid 0028.

## Ansichten (`#/fleet?ansicht=…`)

- **Fahrzeuge** (Standard), Akte mit `?fahrzeug=<id>`: Fristen, Angaben, Geräte an Bord, Verlauf.
- **Geräte** (`geraete`), Akte mit `?geraet=<id>`: Zustand, nächste Prüfung, wo es ist, Verlauf.
- **Fristen** (`fristen`): MFK, Service, Prüfungen und ablaufende Ausweise (30 / 90 Tage / alle).

## Daten

- Besitzt: `fahrzeuge`, `geraete`, `ressourcen_eintraege` (schreiben nur über `ressource_eintrag_erfassen` und
  `ressource_uebergeben`).
- Liest: Sicht `fristen` (auch Ausweise aus «Team & Ausweise»), `personen`, `standorte`, Auswahllisten `geraeteart`,
  `ressourcen_eintrag`, `qualifikation`; Einstellung `ressourcen` (Intervalle, Vorlauf) wirkt in der Datenbank.
- Erinnerung: `fristen_melden` (Zeitplan, stündlich) → Aufgaben und Glocke.

## Abhängigkeiten

- `src/services/supabase.ts`, `meldungen.ts`, `fehler.ts`, `fachfehler.ts`, `src/hooks/useAuswahl.ts`
- `src/components/shared/`: `AkteAbschnitt`, `Datentabelle`, `Filterchips`, `Seitenkopf`, `Zeitachse`, `Zustaende`

## Ereignisse

- **sendet:** keine (Schaden und Fristen melden sich über die Datenbank in der Glocke)
- **hört auf:** keine

## Ordner

- `components/` – Seite, Listen, Akten, Dialoge, Karte «Fristen» für Mein Tag
- `hooks/` – `useRessourcen` (Laden, Namen), `useAktion`
- `services/` – `ressourcen`
- `lib/` – `fristen` (Stand einer Frist, mit Tests)
- `types.ts`, `schema.ts`, `index.ts`
