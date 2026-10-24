# Modul: Mein Tag

**Zweck:** Zeigt jeder Person beim Öffnen, was heute ansteht: Termine heute und morgen, Aufgaben (für mich und von mir vergeben), Offerten nachfassen, neue Anfragen, Wiedervorlagen, Fristen, Zahlungen, Service-Fälle, Kontrollen und Wartungen (V233 «Heute»).

**Stand:** Phase 14. Startseite der App (`#/today`, `/` leitet um).

## Daten

- Liest nur: `heute_fuer_mich()` (eine Abfrage für die ganze Seite, mit den Rechten der Person).
- Schreibt: `aufgaben.erledigt_am/_von` beim Abhaken; Mail «Übersicht» über `ausgang_anlegen` (Ausgangskorb, Klick = Freigabe).

## Abhängigkeiten

- `src/services/ausgang.ts` (Mail), `src/services/supabase.ts`, `src/lib/ziel.ts` (wohin ein Klick führt).
- Die Startseite (`src/layouts/Startseite.tsx`) setzt KI-Briefing, Ausschreibungen, «+ Aufgabe» und die Karten der Bereiche über die Slots `aktionen`, `oben`, `unten` dazu.

## Ereignisse

- **sendet:** keine
- **hört auf:** keine (lädt alle 2 Minuten neu; Abhaken und neue Aufgaben laden sofort neu)
