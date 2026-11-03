# Modul: Anfragen & Leads (`sales`)

**Zweck:** Vom ersten Kontakt bis zur Auftragszusage: Leads erfassen und nachfassen, Pipeline, Termine planen (Tagesroute, Tour, Kalender), Regionen und der Lead-Monatsbericht.

**Stand:** Phase 6 gebaut, Phase 8: SMS-Erinnerung senden, Anfragen aus Outlook oder .eml holen, Termin und Kalender aus Outlook. Neu seit 2.11.2026 (Entscheid 0047): Startansicht «Zu tun» mit 15-Minuten-Uhr, Pipeline in sechs Schritten, Lead-Akte als ganze Seite (Dach, Richtpreis nur intern, Herkunft, nächster Schritt), Anruf-Ergebnis mit Rückruf/SMS-Entwurf, Verkaufssteuerung; Website-Anfragen kommen direkt (`docs/website-anfrage.md`).

## Daten

- liest `verkauf_geschaefte`, `plz_verzeichnis`, `kalender_eintraege`, `lead_einkauf`, `gespeicherte_ansichten`, `regionen`, `standorte`, `personen`, `aktivitaeten`, `dokumente`, `einstellungen` (`tourplanung`, `sms_erinnerung`, `verkauf`)
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
- `lib/` – reine Rechnungen mit Tests (Pipeline, Schritte, Zu tun, Arbeitszeit, Richtpreis, Steuerung, Route, Kalenderdatei, Planungstool, Bericht)
- `types.ts`, `schema.ts`, `index.ts`
