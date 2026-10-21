# 0015 – Offerten, Preise und Werkverträge: Regeln in der Datenbank, Einkauf nur mit Recht

**Kontext:** Phase 7 baut Offerten (Neue Offerten, Muri, Bulle, Nachfassen, PDF-Import), Werkverträge
(«Auftrag erstellen», Zahlungsplan, Vertrag) und Preise (Preisliste, Archiv, Kundenansicht, Kalkulation,
Excel-Import) mit allen Funktionen aus V233. In V233 lagen Nummern, Status und Zahlungsplan im Browser, und jede
Person mit Zugang sah die Einkaufspreise.

**Entscheid:**

- **Abläufe als Funktionen:** Offertnummer pro Standort, Status der Neuen Offerten, Versionen, «Zurück zur
  Offerte», Entscheid beim Nachfassen, Werte setzen, Auftrag erstellen und Werkvertrag-Status sind
  Datenbank-Funktionen. Fehler kommen als Schlüssel und werden in der App übersetzt.
- **Fachfehler an einer Stelle:** `src/services/fachfehler.ts` übersetzt die Schlüssel für alle Module
  (vorher eine eigene Datei im Verkauf).
- **Einkauf nur mit Recht «preise»:** `artikel` und `kalkulationen` lesen und schreiben nur Personen mit diesem
  Recht. Alle anderen sehen die Sicht `preisliste` mit Verkaufspreis und Datenblättern, aber ohne Einkauf und Marge
  (daraus liesse sich der Einkauf zurückrechnen). Rollen mit «Offerten» bekommen den Bereich «Preise» dazu und
  sehen dort die Kundenansicht.
- **Betrag der Offerte exkl. MWST:** «In Offerte übernehmen» schreibt den Nettobetrag (nach Rabatt, exkl. MWST),
  so wie Eturnity und die Listen ihn führen. V233 schrieb dort das Total inkl. MWST; der Werkvertrag und der
  Vertragswert im Projekt sind inkl. MWST. Der MWST-Satz kommt aus den Einstellungen (`mwst_satz()`), auf
  5 Rappen gerundet.
- **Zahlungskonditionen als Daten:** Auswahlliste `zahlungskondition` mit Tranchen (Anteil, Text DE/FR, Fälligkeit).
  Der Zahlungsplan rundet jede Tranche auf 5 Rappen; die letzte nimmt den Rest.
- **Vertragstext im Code, Sprache des Vertrags:** Die 15 Abschnitte des Werkvertrags aus V233 liegen in
  `workcontracts/lib/werkvertragAbschnitte.ts` (fester Wortlaut) und `werkvertragText.ts` (Abschnitte mit Werten), DE/FR, gedruckt über den Druckdialog wie das Kundenblatt. Änderungen am
  Vertragstext sind juristisch und laufen über einen Pull Request.
- **«Bereits verbaut» (V233):** Die Offerte gilt ab dem Baudatum als angenommen, mit Notiz; es öffnet sich kein
  Auftrag. Den Projekt-Abschluss dazu bringt Phase 9.
- **Unternehmer im Werkvertrag:** Hat ein importierter Vertrag keine Firma, gilt die Firma seines Standorts.
- **Eturnity:** PDF-Import im Browser und ein Webhook-Eingang mit Geheimnis (siehe `docs/eturnity.md`). Eine
  Abfrage-Schnittstelle bietet Eturnity nicht an.

**Folgen:** Versand von Offerte und Vertrag per Mail kommt mit Phase 8 über den Ausgangskorb mit Freigabe; digitale
Unterschrift (z. B. Skribble) ist ein offener Vorschlag. Projekte aus «Auftrag erstellen» werden in Phase 9
weitergeführt.
