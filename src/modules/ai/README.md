# Modul: KI-Assistent

**Zweck:** Texte mit KI schreiben, KI-Kosten sehen, den eigenen Schreibstil pflegen und (Administration) Modelle,
Tageslimit und Firmenstil einstellen. Dazu das Tagesbriefing «Dein Tag» auf der Startseite.

**Stand:** Phase 13 (Entscheid 0024). Einrichten im Betrieb: `docs/ki.md`.

Die übrigen KI-Funktionen sitzen dort, wo man arbeitet (Kunde, Lead, Offerte, Projekt, Service, Spesen, Luftbild,
Offerten-PDF, Marketing, Monatsbericht, Ausgangskorb, Automationen). Ihre Bausteine liegen deshalb nicht in diesem
Modul, sondern in `src/components/shared/ki/` und `src/services/ki.ts`.

## Daten

- liest `einstellungen.ki` (ändern nur `admin`), `ki_aufrufe` über `ki_kosten()`, `schreibstile` (eigener Stil)
- Tagesbriefing in `ki_ergebnisse` (art `briefing`), erstellt von der Edge Function `ki`

## Abhängigkeiten

- `src/services/ki.ts` (`rufeKi`, `useKiStatus`), `src/services/supabase.ts`, `src/services/integrationen.ts`
  (Fehlertexte)
- `src/components/shared/ki/` (`KiAssistent`, `KiHinweis`)

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `components/KiSeite.tsx` – Seite mit Reitern Assistent, Kosten, Mein Schreibstil, Einstellungen (`#/ai?ansicht=…`)
- `components/Assistent.tsx` – Karten je Textart (Nachfassen, Antwort, Termin …), öffnet den KI-Assistenten
- `components/Kosten.tsx` – heute gegen das Tageslimit, Monat nach Funktion, Person und Tag
- `components/Stil.tsx` – gelernte Regeln ansehen, ändern, zurücksetzen; Firmenstil lesen
- `components/Einstellungen.tsx` – Schalter, Limits, Modelle (nur mit Preis), Firmenstil DE/FR
- `components/Briefing.tsx` – Tagesbriefing (lazy auf der Startseite)
- `lib/kosten.ts` – Umrechnung Tausendstel-Rappen, Monatsgrenzen, Anteil am Limit (mit Test)
- `hooks/`, `services/`, `types.ts`, `schema.ts`, `index.ts`
