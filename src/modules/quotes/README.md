# Modul: Offerten (`quotes`)

**Zweck:** Offerten ausarbeiten (Neue Offerten für den Innendienst), offerierte nachfassen und die Werte aus Eturnity übernehmen; von hier geht es zu «Auftrag erstellen».

**Stand:** Phase 7 gebaut, Phase 8: «Per Mail senden» über den Ausgangskorb (Text in der Sprache des Kunden).

## Daten

- liest `offerten_liste`, `offerten_eingang`, `eturnity_eingang`, `dokumente`, `aktivitaeten`, `einstellungen` (MWST)
- schreibt über `offerte_anlegen`, `offerte_status_setzen`, `offerte_version_erfassen`/`_entfernen`, `offerte_zurueck`, `offerte_entscheiden`, `offerte_werte_setzen`, `eturnity_zuordnen`
- `betrag_rappen` ist exkl. MWST. Details: `docs/datenmodell.md` (Phase 7), Entscheid 0015, `docs/eturnity.md`

## Abhängigkeiten

- `src/services/supabase`, `dokumente`, `meldungen`, `fehler`, `fachfehler`; `src/hooks/useMwst`, `useAuswahl`
- Zu Lead, Kunde, Werkvertrag und Kalkulation geht es über die Adresse (`/sales?lead=…`, `/workcontracts?auftrag=…`, `/pricing?ansicht=kalkulation&offerte=…`), nie per Import.

## Ereignisse

- **sendet:** keine (der Entscheid steht in der Datenbank und im Verlauf)
- **hört auf:** keine

## Ordner

- `components/` – Seite, Listen, Akte, Dialoge, PDF-Import
- `hooks/`, `services/` – Laden und Speichern
- `lib/` – PDF lesen, Eturnity-Werte, Nachfassen, Suche (mit Tests)
- `types.ts`, `index.ts`
