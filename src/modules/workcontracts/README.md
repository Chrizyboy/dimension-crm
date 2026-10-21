# Modul: Werkverträge (`workcontracts`)

**Zweck:** Aus der angenommenen Offerte den Auftrag erstellen (Projekt, Zahlungsplan, Werkvertrag), den Vertrag in der Sprache des Kunden drucken und Versand, Unterschrift oder Storno festhalten.

**Stand:** Phase 7 gebaut. Versand per Mail folgt in Phase 8, digitale Unterschrift ist ein offener Vorschlag.

## Daten

- liest `werkvertraege_liste`, `offerten_liste`, `standorte`, Auswahlliste `zahlungskondition`, `einstellungen` (MWST)
- schreibt über `auftrag_erstellen`, `werkvertrag_status`; Zahlungsplan über `zahlungsplan_berechnen`
- `betrag_rappen` ist inkl. MWST. Details: `docs/datenmodell.md` (Phase 7), Entscheide 0011 und 0015

## Abhängigkeiten

- `src/services/supabase`, `meldungen`, `fehler`, `fachfehler`; `src/hooks/useMwst`, `useAuswahl`, `useDrucken`
- Zur Offerte geht es über die Adresse (`/quotes?offerte=…`).

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `components/` – Liste, Akte, Auftrag-Dialog, Status-Dialog, Druck
- `hooks/`, `services/` – Laden und Speichern
- `lib/` – Vertragstext (DE/FR), Zahlungsplan (mit Tests), Status
- `types.ts`, `index.ts`
