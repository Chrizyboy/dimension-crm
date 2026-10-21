# 0005 – Änderungsprotokoll und Papierkorb in der Datenbank

**Kontext:** Bau-Auftrag Kap. 5: nichts hart löschen, vollständiges Protokoll (wer, was, wann, vorher/nachher). In V233 passierte das teilweise nur in der Oberfläche.

**Entscheid:** Ein Datenbank-Trigger `intern.protokolliere` schreibt jede Änderung in `public.aenderungsprotokoll`. Löschen heisst `geloescht_am` setzen. Der Trigger erkennt Papierkorb und Wiederherstellen automatisch.

**Folgen:** Das Protokoll ist lückenlos, auch wenn später ein Skript oder eine Edge Function Daten ändert. Jede neue Fachtabelle muss die Trigger anhängen (steht in CLAUDE.md und wird in Phase 3 per Test geprüft).
