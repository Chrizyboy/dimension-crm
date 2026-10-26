# Modul: Handbuch

**Zweck:** Anleitung zu jedem Bereich, die Prozesse der Firma mit Versionen, Erklärvideos und «Fehler melden» an die Administration (V233 Helpdesk).

**Stand:** Phase 15 (`#/knowledge?ansicht=anleitung|prozesse|videos|meldungen&meldung=…&neu=<bereich>`).

## Daten

- `handbuch_eintraege` (Prozesse und Videos; ändern nur über `handbuch_speichern`, `handbuch_entfernen`, nur Administration).
- `rueckmeldungen` (Meldungen; anlegen über `rueckmeldung_melden`, antworten über `rueckmeldung_beantworten`).
- `dokumente` und Bucket `dokumente` (Dateien unter `handbuch/`).

## Abhängigkeiten

- `src/services/supabase.ts`, `src/services/fachfehler.ts`, `src/services/meldungen.ts`, `src/hooks/useSichtbareModule.ts`.

## Ereignisse

- **sendet:** keine (Glocke kommt vom Server)
- **hört auf:** keine

## Hinweise

- «Fehler melden» erreicht man auch über die Befehlspalette und jede Fehleranzeige; der Bereich steht in `neu`.
- Neue Prozess-Version: die alte Datei bleibt unter «Frühere Versionen» (höchstens 20).
- «Erste Schritte» (Phase 16) ist die Schulungs-Kurzanleitung; der Text steht in `handbuch.start` der Sprachdateien (DE/FR gleich aufgebaut) und lässt sich auf eine A4-Seite drucken.
