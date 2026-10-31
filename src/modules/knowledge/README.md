# Modul: Handbuch

**Zweck:** Anleitung zu jedem Bereich, die Prozesse der Firma mit Versionen, Erklärvideos und «Fehler melden» an die Administration (V233 Helpdesk).

**Stand:** Phase 15 (`#/knowledge?ansicht=anleitung|prozesse|videos|meldungen&meldung=…&neu=<bereich>`).

## Daten

- `handbuch_eintraege` (Prozesse und Videos; ändern nur über `handbuch_speichern`, `handbuch_entfernen`, nur Administration).
- `rueckmeldungen` (Meldungen; anlegen über `rueckmeldung_melden`, antworten über `rueckmeldung_beantworten`; Einschätzung, Entscheid «Erledige es»/«Nicht» und Abschluss über `helpdesk_*` und `rueckmeldung_entscheiden`, siehe `docs/helpdesk.md`).
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
- Helpdesk mit Freigabe (31.10.2026): Claude prüft jede Meldung über die Edge Function `helpdesk`, die entscheidende Person (Einstellung `helpdesk`, wählbar oben in «Meldungen») bekommt SMS, Glocke und Windows-Pop-up und entscheidet mit einem Knopf. Die Einschätzung sieht nur die Administration. Entscheid 0030.
