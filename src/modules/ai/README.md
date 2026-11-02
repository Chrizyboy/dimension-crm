# Modul: Assistent (früher «KI-Assistent»)

**Zweck:** Fragen ans CRM in normaler Sprache stellen, fertige Aufträge je Rolle ausführen, Dokumente lesen lassen,
Texte entwerfen, den eigenen Verlauf und Schreibstil sehen, und sehen, wo die KI im CRM mitarbeitet und was sie
kostet. Die Administration stellt Modelle, Limits, Firmenstil ein und schaltet einzelne Funktionen aus.

**Stand:** Phase 13 (Entscheid 0024), Ausbau 2.11.2026 (Entscheid 0040). Einrichten im Betrieb: `docs/ki.md`.

Die übrigen KI-Funktionen sitzen dort, wo man arbeitet (Akten, Posteingang, Spesen, Marketing …). Ihre Bausteine
liegen in `src/components/shared/ki/` und `src/services/ki.ts`.

## Daten

- `ki_gespraeche` (eigene Gespräche, privat, 90 Tage), `ki_vorlagen` (Aufträge: Firma und eigene)
- `einstellungen.ki` (ändern nur `admin`, inkl. `aus`), `ki_aufrufe` über `ki_kosten()`, `schreibstile`
- Tagesbriefing in `ki_ergebnisse` (art `briefing`)
- Fragen ans CRM: Edge Function `ki` Aktion `frage` (Katalog in `supabase/functions/_shared/ki_fragen.ts`),
  Dokumente: Aktion `dokument`

## Abhängigkeiten

- `src/services/ki.ts`, `src/services/supabase.ts`, `src/services/integrationen.ts`
- `src/components/shared/ki/` (`KiAssistent`, `KiMailLesen`, `KiHinweis`)
- `src/stores/ui.ts` (`assistentOffen`), Ctrl J in `src/hooks/useTastenkuerzel.ts`, Knopf in `src/layouts/Kopfzeile.tsx`

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `components/KiSeite.tsx` – Reiter Fragen, Aufträge, Dokument lesen, Verlauf, Im CRM, Kosten, Schreibstil,
  Einstellungen (`#/ai?ansicht=…&gespraech=…`), dazu «Text schreiben» und «Mail lesen»
- `components/Fragen.tsx`, `Antwort.tsx` – Gespräch, Antwort mit Tabelle aus echten Werten, Vorschläge
- `components/AssistentFenster.tsx` – Ctrl J überall, Bezug aus der Adresse
- `components/Auftraege.tsx`, `Dokument.tsx`, `Verlauf.tsx`, `ImCrm.tsx`, `ZielLink.tsx`
- `components/Kosten.tsx`, `Stil.tsx`, `Einstellungen.tsx`, `Briefing.tsx` – wie bisher
- `lib/anzeige.ts` (Werte formatieren), `lib/kosten.ts`, `services/assistent.ts`, `services/ai.ts`
