# Modul: Einkauf & Material

**Zweck:** Bestellt das Material aus der Eturnity-Stückliste bei den Lieferanten (Krannich, Solarmarkt, Tritec, PM Green u.a.), überwacht Liefertermine und bucht den Wareneingang. Eigenes Lager nur in Bulle (Bestand, Reservierung je Projekt); Lagerorte sind Daten.

Freigegeben von Chris am 21.10.2026 (ERP-Lückenanalyse, https://claude.ai/artifact/Q54YPWZzgtFQSSS6PHUnmq).

**Stand:** Platzhalter – wird in Phase **9a** gebaut.

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
