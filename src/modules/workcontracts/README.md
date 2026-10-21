# Modul: Werkverträge

**Zweck:** Erstellt aus der angenommenen Offerte den Werkvertrag (Sprache, Firma GmbH oder Sàrl, Zahlungskonditionen wie 50/30/20 oder 80/20), versendet ihn nach Freigabe und hält die Unterschrift fest. Daraus entstehen Zahlungsplan und Projekt.

Auf Wunsch von Chris (21.10.2026: «Werkverträge fehlen»). In V233 war der Werkvertrag nur ein Feld am Projekt.

**Stand:** Platzhalter – wird in Phase **7** gebaut.

## Daten

`werkvertraege` (besitzt), liest `offerten`, `projekte`, `kontakte`, `dokumente`, `firmen`.

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
