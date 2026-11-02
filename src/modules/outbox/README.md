# Modul: Ausgangskorb

**Zweck:** Alles, was das CRM nach aussen schicken will (Mails über Microsoft 365, SMS über ASPSMS), wartet hier, bis ein Mensch es geprüft und freigegeben hat (Regel 6).

**Stand:** Phase 8, Ausbau zur Werkbank 2.11.2026 (Entscheid 0041).

## Daten

- `ausgangskorb` (Migration `20261027000200_ausgangskorb.sql`): Kanal, Empfänger, Text, Anhänge, Stand (`wartet` → `freigegeben` → `wird_gesendet` → `gesendet` oder `fehler`; sonst `verworfen` mit Grund).
- Datenbank-Funktionen `ausgang_freigeben` (mit `p_sende_ab`, `p_warten_s`), `ausgang_zurueckholen`, `ausgang_planen`, `ausgang_verwerfen`, `ausgang_aendern`, `ausgang_zurueck`, `ausgang_als_gesendet`, `ausgang_ruecklauf`, `ausgang_absender_ich`. Geändert werden kann nur, was noch nicht unterwegs ist.
- Sicht `ausgang_ansicht`: Namen, `fuer_mich`, `darf_freigeben`, `antwort_am`. `ausgang_pruefen` (Prüfungen) und `ausgang_kontext` (Kunde, Lead, Offerte, Projekt, Rechnung, Verlauf).
- Wer welche Art freigibt: `einstellungen.ausgang_freigabe` (Art → Recht).
- Briefe (`kanal = brief`) sendet der Server nie: freigeben, drucken, «versendet», Rücklauf.
- Zeitplan `ausgang_erinnern`: Glocke nach vier Arbeitsstunden und bei Fehlern.
- Gesendet wird nur auf dem Server (Edge Function `ausgang`, jede Minute über `zeitplan`, oder sofort mit «Jetzt senden»). Die App sieht nie einen Schlüssel.
- `automatisch = true` heisst: eine Automation war ausdrücklich auf «automatisch» gestellt und hat ohne Freigabe gesendet.

## Abhängigkeiten

- `src/services/integrationen.ts` (`ausgangJetztSenden`, Fehlertexte der Server-Funktionen)
- `src/services/fachfehler.ts` (Fehlercodes `ausgang.*` aus der Datenbank)

## Ereignisse

- **sendet:** keine
- **hört auf:** keine. Andere Module legen Einträge über die Datenbank an (`ausgang_anlegen`), nicht über dieses Modul.

## Ordner

- `components/` – Werkbank (`Ausgangskorb`), `OrdnerLeiste`, `AusgangListe`, `AuswahlLeiste`, Akte (`AusgangDetail`, `MailInhalt`, `PruefKasten`, `DetailFuss`, `FehlerLoesung`), `WocheZahlen`, `HeuteKarte` (Mein Tag)
- `hooks/` – `useAusgang` (alle 15 s, solange etwas unterwegs ist), `useAusgangAktionen` (Freigabe mit Rückgängig), `useBreit`
- `services/` – Zugriff auf `ausgangskorb` und die RPCs
- `lib/anzeige.ts` – Ordner, Gruppen und Serien, Zeiten für «Später senden», Fehler-Lösung, Farben
- `types.ts`, `schema.ts`, `index.ts`
