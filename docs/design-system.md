# Design-System

Sichtbar in der App unter **Design-System** (`#/design`, unten in der Seitenleiste).

## Grundsätze

- **Ruhig und dicht:** Viel Information auf einem Bildschirm, wenig Dekoration. Weisse Flächen auf leicht bläulichem Grau.
- **Marke sofort erkennbar:** Seitenleiste immer Marineblau `#02224F`, Akzent Sonnen-Orange `#EF7C00` (beide aus dem Logo gemessen).
- **Zustände unabhängig von der Marke:** Grün = gut, Orange-Braun = Achtung, Rot = kritisch, Blau = Info. Orange wird nie für Fehler verwendet.
- **Alles mit der Tastatur:** Ctrl K öffnet die Befehlspalette, Ctrl B klappt die Seitenleiste ein. Jeder Knopf hat einen sichtbaren Fokus-Ring.
- **Zugänglich:** WCAG 2.1 AA, automatisch geprüft mit axe in Hell und Dunkel (`e2e/barrierefreiheit.spec.ts`).

## Tokens (`src/index.css`)

Komponenten nutzen nie feste Farbwerte, nur Tokens wie `bg-surface`, `text-muted-foreground`, `bg-primary`, `text-ok`, `bg-bad-soft`. Hell/Dunkel wechselt über die Klasse `.dark` auf `<html>`.

| Gruppe       | Tokens                                                                               |
| ------------ | ------------------------------------------------------------------------------------ |
| Flächen      | `background`, `surface`, `surface-2`, `muted`, `border`, `border-strong`             |
| Text         | `foreground`, `muted-foreground`                                                     |
| Aktionen     | `primary`, `primary-hover`, `accent`, `accent-soft`, `accent-ink`, `ring`            |
| Zustände     | `ok`, `warn`, `bad`, `info`, je mit `-soft`                                          |
| Seitenleiste | `sidebar`, `sidebar-foreground`, `sidebar-active`, `sidebar-muted`, `sidebar-border` |

Schriften: `font-display` (Schibsted Grotesk, Titel), `font-sans` (Public Sans, Text), `font-mono` (JetBrains Mono, Nummern). Beträge mit Klasse `zahlen`.

## Bausteine (`src/components/ui/`)

| Datei                                    | Inhalt                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `button.tsx`                             | Knopf in 6 Arten (primary, accent, secondary, ghost, danger, link), 4 Grössen, mit `laedt` |
| `input.tsx`, `feld.tsx`                  | Eingabefeld, Textfeld, `Feld` mit Beschriftung, Hinweis und Fehlermeldung                  |
| `auswahl.tsx`, `schalter.tsx`            | Auswahlliste, Kästchen, Schalter                                                           |
| `badge.tsx`, `karte.tsx`                 | Statusmarke, Karte mit Kopf                                                                |
| `dialog.tsx`                             | Dialog in der Mitte oder als Seitenblatt                                                   |
| `menue.tsx`, `tooltip.tsx`, `reiter.tsx` | Menü, Hinweis beim Darüberfahren, Reiter                                                   |
| `tabelle.tsx`                            | Tabelle, Zahlenspalten rechtsbündig                                                        |
| `diverses.tsx`                           | Skelett (Ladeanzeige), Tastenkürzel, Trenner, Avatar                                       |

Gemeinsame Bausteine in `src/components/shared/`: `Seitenkopf`, `Leerzustand`, `Fehlerzustand`, `Logo`, `ModulIcon`.

## Meldungen

- Kurze Rückmeldung: `melde('ok', { de, fr })` aus `src/services/meldungen.ts` (unten rechts, verschwindet von selbst).
- Wichtiges mit `bleibend: true` landet zusätzlich in der Glocke (Benachrichtigungen).

## Regeln für neue Oberflächen

1. Jede Seite beginnt mit `Seitenkopf`.
2. Jede Liste hat einen Leerzustand und einen Ladezustand (Skelett), jeder Datenzugriff einen Fehlerzustand mit «Nochmal versuchen».
3. Gefährliche Aktionen (löschen, senden) nutzen `variant="danger"` und einen Bestätigungsdialog.
4. Texte nur über `src/i18n/de.json` und `fr.json`.
