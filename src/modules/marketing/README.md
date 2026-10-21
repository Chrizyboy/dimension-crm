# Modul: Marketing

**Zweck:** _(ein Satz, was dieses Modul für die Benutzer:innen erledigt)_

**Stand:** Platzhalter – wird in Phase 11 gebaut.

## Daten

_(Tabellen in Supabase, die dieses Modul besitzt oder liest)_

## Abhängigkeiten

_(Welche gemeinsamen Dienste aus `src/services/` genutzt werden. Andere Module werden nie direkt importiert.)_

## Ereignisse

- **sendet:** _(z.B. `offerte.angenommen`)_
- **hört auf:** _(z.B. `lead.erstellt`)_

## Ordner

- `components/` – Oberflächen-Bausteine nur für dieses Modul
- `hooks/` – React-Hooks (Daten laden, Zustand)
- `services/` – Zugriff auf Supabase und Server-Funktionen
- `types.ts` – fachliche Typen
- `schema.ts` – Prüfregeln (Zod)
- `index.ts` – das Einzige, was andere importieren dürfen
