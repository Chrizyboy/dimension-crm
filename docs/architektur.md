# Architektur

## Überblick

```
Windows-App (Tauri 2)  ─┐
                        ├─ React-Oberfläche (Vite) ── Supabase (Frankfurt)
Handy / Browser (PWA)  ─┘                              ├─ Postgres mit RLS (Daten + Rechte)
                                                       ├─ Auth (Microsoft-Anmeldung, Phase 4)
                                                       ├─ Storage (Dokumente, Fotos)
                                                       └─ Edge Functions + pg_cron (Server-Jobs,
                                                          Integrationen, alle Geheimnisse)
```

- **Eine Oberfläche, zwei Hüllen.** Derselbe React-Code läuft im Tauri-Fenster und als PWA. `src/lib/plattform.ts` sagt, wo wir gerade sind.
- **Keine Geheimnisse im Client.** Die App kennt nur die öffentliche Supabase-Adresse und den anon-Schlüssel. Was jemand sieht, regelt Row Level Security in der Datenbank. Alles mit API-Schlüsseln (AbaNinja, Microsoft Graph, Claude, SMS, Meta, LinkedIn) läuft in Edge Functions.
- **Hintergrundjobs auf dem Server.** Erinnerungen, Abgleiche und Automationen laufen über pg_cron + Edge Functions, nicht mehr im offenen Browserfenster wie in V233.

## Datenmodell (Ziel, ab Phase 3)

`Kontakt → Objekt (Gebäude) → Verkaufschance → Offerte (Versionen) → Projekt → Anlage`

Jede Fachtabelle hat `id uuid`, `erstellt_am`, `geaendert_am`, `geloescht_am` (Papierkorb) und die Trigger aus `supabase/migrations/20261021000000_grundlagen.sql`. Beträge in Rappen (`bigint`).

## Module

Ein Ordner pro Fachbereich unter `src/modules/`. Jedes Modul exportiert über `index.ts` seine `meta` (Titel DE/FR, Pfad, Icon, Gruppe, Phase) und später seine Seiten. Module sprechen nicht direkt miteinander:

- **Gemeinsame Dienste** in `src/services/` (Datenbank, später Benachrichtigungen, Dokumente).
- **Ereignisse** über `sende('offerte.angenommen', …)` und `hoere(…)` aus `src/services/ereignisse.ts`. Der Katalog aller Ereignisse steht dort als Typ, damit Tippfehler nicht kompilieren.

## Routen

TanStack Router, dateibasiert in `src/app/`. `$modul.tsx` zeigt jedes Modul über seine id an (`#/sales`). Hash-Adressen, damit die Desktop-App ohne Webserver funktioniert.

## Qualität

ESLint (strikt, mit Typinformationen) + Modul-Grenzen-Prüfung, Prettier, TypeScript strikt, Vitest, Playwright (Desktop + Handy), pgTAP für die Datenbank. GitHub Actions prüft jeden Pull Request und baut den Windows-Installer.
