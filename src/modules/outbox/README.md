# Modul: Ausgangskorb

**Zweck:** Alles, was das CRM nach aussen schicken will (Mails über Microsoft 365, SMS über ASPSMS), wartet hier, bis ein Mensch es geprüft und freigegeben hat (Regel 6).

**Stand:** Phase 8.

## Daten

- `ausgangskorb` (Migration `20261027000200_ausgangskorb.sql`): Kanal, Empfänger, Text, Anhänge, Stand (`wartet` → `freigegeben` → `wird_gesendet` → `gesendet` oder `fehler`; sonst `verworfen` mit Grund).
- Datenbank-Funktionen `ausgang_freigeben`, `ausgang_verwerfen`, `ausgang_aendern`. Geändert werden kann nur, was noch nicht unterwegs ist.
- Gesendet wird nur auf dem Server (Edge Function `ausgang`, jede Minute über `zeitplan`, oder sofort mit «Jetzt senden»). Die App sieht nie einen Schlüssel.
- `automatisch = true` heisst: eine Automation war ausdrücklich auf «automatisch» gestellt und hat ohne Freigabe gesendet.

## Abhängigkeiten

- `src/services/integrationen.ts` (`ausgangJetztSenden`, Fehlertexte der Server-Funktionen)
- `src/services/fachfehler.ts` (Fehlercodes `ausgang.*` aus der Datenbank)

## Ereignisse

- **sendet:** keine
- **hört auf:** keine. Andere Module legen Einträge über die Datenbank an (`ausgang_anlegen`), nicht über dieses Modul.

## Ordner

- `components/` – Liste (`Ausgangskorb`), Seitenblatt (`AusgangDetail`), Spalten
- `hooks/` – `useAusgang` (lädt alle 15 s neu, solange etwas unterwegs ist)
- `services/` – Zugriff auf `ausgangskorb` und die RPCs
- `lib/anzeige.ts` – Farben je Stand, Zeit, Vorschau-Text
- `types.ts`, `schema.ts`, `index.ts`
