# Modul: Ausschreibungen

**Zweck:** Findet öffentliche Ausschreibungen, Baugesuche und Zuschläge rund um Muri und Bulle, sortiert sie automatisch in drei Spuren (Angebot, Akquise, Beobachten) und führt sie bis zur Offerte oder zum Anschreiben.

Konzept (von Chris am 21.10.2026 freigegeben): [Claude Doc](https://claude.ai/artifact/KkeHUwF5oaTugDwPyW3Tcm), [Vorschau](https://claude.ai/artifact/Vu6P9kgftbY6fHYhGCaAPx).
Voraussetzungen: Kunden (Phase 5), Verkauf (6), Offerten (7), Mailversand über Microsoft 365 und Server-Jobs (8). Die Treffer aus V233 werden beim Bau übernommen; die Tabelle «Ausschreibungen» wird schon im Datenmodell (Phase 3) angelegt.

**Stand:** Platzhalter – wird in Phase **8b** gebaut.

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
