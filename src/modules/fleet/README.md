# Modul: Fahrzeuge & Geräte

**Zweck:** Fahrzeuge mit MFK, Service und Kilometerstand, Geräte (Absturzsicherungen, Leitern, Messgeräte …) mit
Prüftermin und wer sie gerade hat, und alle Fristen an einem Ort. Am Handy: Eintrag erfassen und übergeben.

Gebaut in Phase **17** (ERP-Lückenanalyse), Entscheid 0028; vollständig gemacht mit Entscheid 0042.

## Ansichten (`#/fleet?ansicht=…`)

- **Zu erledigen** (Standard, `erledigen`): Fristen, Service nach km, Schäden, Doppelbelegung, fehlende km, lange
  Ausleihen; daneben «Heute unterwegs».
- **Fahrzeuge** (`fahrzeuge`), Akte als ganze Seite mit `?fahrzeug=<id>` (`&km=1` öffnet «Kilometerstand»):
  Fristen, Angaben, Leasing mit Prognose, Versicherung, Kosten, Schäden, Belegung, Geräte an Bord, Dokumente, Verlauf.
- **Geräte** (`geraete`), Akte mit `?geraet=<id>`: Zustand, Prüfung, wo und seit wann, zurück bis, Kauf/Garantie,
  Schäden, Belegung, Dokumente, Verlauf; «Nehme ich» / «Zurück ins Lager» nach dem Scannen des QR-Etiketts.
- **Belegung** (`belegung`): Wochenplan Fahrzeuge oder Geräte, Reservieren, Werkstatt, Doppelbelegung rot.
- **Fristen** (`fristen`): MFK, Service, Prüfungen, Reifen, Vignette, Leasing, Ausleihe, Ausweise.
- **Kosten** (`kosten`, nur Recht `finanzen`): pro Fahrzeug und Jahr, CHF/km, Privatanteil.

## Daten

- Besitzt: `fahrzeuge`, `geraete`, `ressourcen_eintraege`, `ressourcen_reservierungen`, Speicher `fuhrpark`
  (schreiben nur über `ressource_eintrag_erfassen`, `ressource_uebergeben`, `ressource_schaden_setzen`,
  `ressource_reservieren`, `ressource_reservierung_aufheben`).
- Liest: Sicht `ressourcen_belegung` (Einsätze aus dem Zeitplan), `fuhrpark_kosten(jahr)`.
- Liest: Sicht `fristen` (auch Ausweise aus «Team & Ausweise»), `personen`, `standorte`, Auswahllisten `geraeteart`,
  `ressourcen_eintrag`, `qualifikation`; Einstellung `ressourcen` (Intervalle, Vorlauf) wirkt in der Datenbank.
- Erinnerung: `fristen_melden` (Zeitplan, stündlich) → Aufgaben und Glocke; `fuhrpark_km_erinnern` einmal pro Monat.

## Abhängigkeiten

- `src/services/supabase.ts`, `meldungen.ts`, `fehler.ts`, `fachfehler.ts`, `src/hooks/useAuswahl.ts`
- `src/components/shared/`: `AkteAbschnitt`, `Datentabelle`, `Filterchips`, `Seitenkopf`, `Zeitachse`, `Zustaende`

## Ereignisse

- **sendet:** keine (Schaden und Fristen melden sich über die Datenbank in der Glocke)
- **hört auf:** keine

## Ordner

- `components/` – Seite, Listen, Akten, Dialoge, Karte «Fristen» für Mein Tag
- `hooks/` – `useRessourcen` (Laden, Namen), `useAktion`
- `services/` – `ressourcen`, `belegung`, `kosten`, `dateien`, `ausweise`, `etikettenPdf`
- `lib/` – `fristen`, `erledigen`, `belegung`, `leasing`, `kosten`, `fahrzeugFelder`, `etikett` (mit Tests)
- `types.ts`, `schema.ts`, `index.ts`
