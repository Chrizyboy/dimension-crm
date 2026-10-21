# Modul: Anfragen & Leads (`sales`)

**Zweck:** Vom ersten Kontakt bis zur Auftragszusage: Leads erfassen und nachfassen, Pipeline, Termine planen (Tagesroute, Tour, Kalender), Regionen und der Lead-Monatsbericht.

**Stand:** Phase 6 gebaut. Outlook, Mail/SMS-Versand und automatische Lead-Importe folgen in Phase 8, KI-Texte in Phase 13.

## Daten

- liest `verkauf_geschaefte`, `plz_verzeichnis`, `kalender_eintraege`, `lead_einkauf`, `gespeicherte_ansichten`, `regionen`, `standorte`, `personen`, `aktivitaeten`, `dokumente`, `einstellungen` (`tourplanung`, `sms_erinnerung`)
- schreibt über `setze_stand`, `lead_kontakt_erfassen`, `lead_anlegen`, `kalender_ersetzen` sowie direkt `verkaufschancen` (Angaben), `lead_einkauf`, `gespeicherte_ansichten`
- Details: `docs/datenmodell.md` (Phase 6), Entscheid 0014

## Abhängigkeiten

- `src/services/supabase`, `dokumente`, `meldungen`, `fehler`, `kontakte` (Dubletten), `auswahl`
- `src/stores/anmeldung` (wer bin ich), `src/hooks/useAuswahl`, `useTaste`, `useDrucken`
- Zur Kundenakte geht es über die Adresse (`/customers?kunde=…`), nie per Import.

## Ereignisse

- **sendet:** keine (ab Phase 7: `offerte.angenommen`)
- **hört auf:** keine

## Ordner

- `components/` – Seite, Ansichten, Akte, Dialoge
- `hooks/` – Daten laden, Ordner, Startort
- `services/` – Supabase-Zugriff
- `lib/` – reine Rechnungen mit Tests (Pipeline, Route, Kalenderdatei, Planungstool, Bericht)
- `types.ts`, `schema.ts`, `index.ts`
