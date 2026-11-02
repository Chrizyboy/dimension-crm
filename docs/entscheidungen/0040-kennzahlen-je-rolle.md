# 0040 – Kennzahlen je Rolle: Ziele, Vergleich, Prognose, Monatsbericht

**Kontext:** Chris fand die Kennzahlen (Phase 14, Entscheid 0025) «nur Fassade»: eine Tabelle und fünf Kacheln, ohne
Ziel, ohne Vergleich, nichts zu Abwicklung, Finanzen oder Service. Am 2.11.2026 wurde jedes Modul einzeln neu
gedacht. Vorschau: https://claude.ai/artifact/8gHP3oNSP5XzF6AueSre8r. Fragen K1–K5 hat Chris alle mit A beantwortet.

**Entscheid:**

- **Sieben Reiter, Start je Rolle:** Überblick (Geschäftsleitung), Verkauf, Pipeline & Prognose, Abwicklung,
  Finanzen (nur Recht `finanzen`), Service & Wartung, alle Zahlen. Buchhaltung startet in Finanzen, Verkauf im
  Verkauf, Projektleitung und Montage in der Abwicklung.
- **K1 Ziele** je Jahr und Firma, gesamt, Umsatz und je Person, gesetzt von der Geschäftsleitung (`finanzen`) im
  Dialog «Ziele». Kürzere Zeiträume anteilig nach Tagen; fehlt ein Jahr, gibt es kein Ziel statt eines halben.
- **K2 Prognose** = Angebotswert × feste Wahrscheinlichkeit je Stand (offeriert 35 %, nachfassen 20 %, vertagt 10 %,
  älter als 90 Tage 5 %), einstellbar.
- **K3 Verkauf** sieht eigene Zahlen und die Rangliste aller. Filter «Person» für alle.
- **K4 Monatsbericht:** Am 1. kommt eine Glocke an alle mit `finanzen`; Klick öffnet die Kennzahlen und erstellt das
  PDF des Vormonats (Monat, Vorjahresmonat, Ziel). Keine Mail.
- **K5 Umsatz** = gestellte Rechnungen exkl. MWST (ohne Entwurf und Storno), Rechnungsdatum.
- **Vergleich** Vorjahr (Standard) oder Vorperiode; bei Dauern ist weniger besser.
- Weiter Detail-Zeilen wie 0025: neue Zahlen kommen aus `kennzahlen_zusatz`, damit `kennzahlen_fakten` (auch für
  «Mein Tag») unverändert bleibt. Jede Liste lässt sich als CSV herunterladen.

**Folgen:** Neue Kennzahl = Schlüssel in `kennzahlen_fakten`/`kennzahlen_zusatz` und Anzeige im Reiter. Die alten
Adressen `reiter=betrieb` führen auf «Abwicklung».
