# Modul: Mein Tag

**Zweck:** Zeigt jeder Person beim Öffnen, was heute ansteht: Termine heute und morgen, Aufgaben (für mich und von mir vergeben), Offerten nachfassen, neue Anfragen, Wiedervorlagen, Fristen, Zahlungen, Service-Fälle, Kontrollen und Wartungen (V233 «Heute»).

**Stand:** Phase 14, ausgebaut 2.11.2026 (Entscheid 0050): Verschieben je Zeile, Gründe, Freigaben, Wochenziele,
Team heute, Wetter auf den Baustellen (MeteoSwiss). Startseite der App (`#/today`, `/` leitet um).

## Daten

- Liest: `heute_fuer_mich()` (eine Abfrage für die ganze Seite, mit den Rechten der Person, inkl. Freigaben und
  Ziele), `team_heute()` (wer ist wo, ohne Grund), `wetter_baustellen()` (meine Einsätze mit Prognose,
  vom Zeitplan-Job `wetter` gefüllt), für «Ziele festlegen» `personen` und `einstellungen.kennzahlen`.
- Schreibt: `aufgaben.erledigt_am/_von` beim Abhaken; `tag_verschieben` (Aufgabe neu fällig, sonst
  `tag_verschoben`); `kennzahlen_ziele_setzen` (nur Administration); Mail «Übersicht» über `ausgang_anlegen`
  (Ausgangskorb, Klick = Freigabe).

## Abhängigkeiten

- `src/services/ausgang.ts` (Mail), `src/services/supabase.ts`, `src/lib/ziel.ts` (wohin ein Klick führt).
- Die Startseite (`src/layouts/Startseite.tsx`) setzt KI-Briefing, Ausschreibungen, «+ Aufgabe» und die Karten der Bereiche über die Slots `aktionen`, `oben`, `unten` dazu.

## Ereignisse

- **sendet:** keine
- **hört auf:** keine (lädt alle 2 Minuten neu; Abhaken und neue Aufgaben laden sofort neu)
