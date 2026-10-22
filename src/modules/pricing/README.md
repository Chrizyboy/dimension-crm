# Modul: Preise (`pricing`)

**Zweck:** Preisliste pflegen (Einkauf, Marge, Skonto, Lieferanten, Datenblätter, Archiv), eine Preisliste für Kunden drucken und Anlagen kalkulieren, bis zur Übernahme in die Offerte.

**Stand:** Phase 7 gebaut.

## Daten

- mit Recht `preise`: `artikel`, `lieferantenpreise`, `lieferanten`, `kalkulationen`, `preisvorlagen`, `preisvorlage_positionen`
- ohne Recht: nur die Sicht `preisliste` (Verkaufspreis, Datenblätter)
- schreibt über `artikel_preis_setzen`, `artikel_archivieren`, `preise_importieren`, `offerte_werte_setzen` (Quelle «kalkulation», Betrag exkl. MWST)
- Datenblätter im Speicher `dokumente` unter `artikel/<id>/…`. Details: `docs/datenmodell.md` (Phase 7), Entscheid 0015

## Abhängigkeiten

- `src/services/supabase`, `meldungen`, `fehler`, `fachfehler`, `dokumente`; `src/hooks/useMwst`, `useDrucken`
- Die Offerte öffnet die Kalkulation über die Adresse (`/pricing?ansicht=kalkulation&offerte=…`), nie per Import.

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `components/` – Preisliste, Artikel-Akte, Kundenansicht, Kalkulation, Excel-Import, Druck
- `hooks/`, `services/` – Laden und Speichern
- `lib/` – Kalkulation, Prozent, VK-Excel (mit Tests)
- `types.ts`, `index.ts`
