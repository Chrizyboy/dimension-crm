# Modul: Spesen

**Zweck:** Spesen mit Foto oder PDF des Belegs erfassen (am Handy direkt mit der Kamera), die eigenen sehen und
stornieren; die Buchhaltung sieht alle, setzt «ausbezahlt am/von», schickt eine Auswahl mit Belegen an die
Buchhaltung und exportiert CSV.

Gebaut in Phase **10** nach dem Inventar der Vorlage V233, Entscheid 0021.

## Ansichten (`#/expenses?ansicht=…`)

- **Meine** (`meine`): eigene Spesen, «Spese erfassen», Storno mit Grund (statt Löschen).
- **Alle** (`alle`, nur Recht `finanzen`): alle Personen, Filter nach Person, Kategorie und Stand, offene Summe je
  Person, Auswahl auszahlen, an die Buchhaltung mailen (Ausgangskorb), CSV.
- **Kategorien** (`kategorien`, nur Recht `finanzen`): Liste DE/FR in der Einstellung `finanzen.spesen_kategorien`.

## Daten

- Besitzt: `spesen` (Sicht `spesen_liste`), Belege in `dokumente` (Ordner `spesen`, Bezug `spesen`).
- Liest: `personen`, Einstellung `finanzen` (Kategorien, Mail der Buchhaltung).
- Abläufe: `spesen_stornieren`, `spesen_auszahlen`. Der Trigger `intern.spesen_pruefen` macht ausbezahlte und
  stornierte Spesen fest. Jede Person sieht nur ihre eigenen (RLS), `finanzen` sieht alle.

## Abhängigkeiten

- `src/services/supabase.ts`, `meldungen.ts`, `fehler.ts`, `fachfehler.ts`
- `src/hooks/useFinanzEinstellungen.ts`, `src/lib/bild.ts` (Foto verkleinern), `src/lib/datei.ts`
- `src/components/shared/`: `AkteAbschnitt`, `Filterchips`, `MailDialog`, `Seitenkopf`, `Zustaende`

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `components/` – Seite, Tabelle, Erfassen, Storno, Auszahlen, An Buchhaltung, Kategorien, Karte für die Startseite
- `hooks/` – `useSpesen`, `useAktion`, `useKategorieText`
- `services/` – `spesen` (Laden, Erfassen, Beleg hochladen, Storno, Auszahlen, Mail vermerken)
- `lib/` – Filter, Summen, CSV, Mail-Zeilen (mit Tests)
- `types.ts`, `schema.ts`, `index.ts`
