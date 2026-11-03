# Modul: Handbuch

**Zweck:** Ein ganzes Kapitel zu jedem Bereich, Hilfe mit F1 im Bereich, ein Weg durch den Tag je Rolle, Begriffe A–Z, «Neu», die Prozesse der Firma mit Versionen, Erklärvideos und «Fehler melden» (V233 Helpdesk). Entscheid 0043.

**Stand:** Phase 15, Kapitel seit 2.11.2026 (`#/knowledge?ansicht=fuerdich|kapitel|start|prozesse|videos|begriffe|neu|meldungen&kapitel=<bereich>&stelle=<anker>&meldung=…&neu=<bereich>`; alt `anleitung` → `kapitel`).

## Daten

- `handbuch_eintraege` (Prozesse und Videos; ändern nur über `handbuch_speichern`, `handbuch_entfernen`, nur Administration).
- `rueckmeldungen` (Meldungen; anlegen über `rueckmeldung_melden`, antworten über `rueckmeldung_beantworten`; Einschätzung, Entscheid «Erledige es»/«Nicht» und Abschluss über `helpdesk_*` und `rueckmeldung_entscheiden`, siehe `docs/helpdesk.md`).
- `dokumente` und Bucket `dokumente` (Dateien unter `handbuch/`).
- `handbuch_eintraege.bereich`: Prozess oder Video gehört zu einem Bereich (nur über `handbuch_bereich_setzen`, Administration).
- Kapitel liegen nicht in der Datenbank, sondern bei jedem Modul (`src/modules/<id>/handbuch.<sprache>.md`), geladen über `src/services/handbuchKapitel.ts`. Wege je Rolle und Begriffe in `inhalt/`.

## Abhängigkeiten

- `src/services/supabase.ts`, `src/services/fachfehler.ts`, `src/services/meldungen.ts`, `src/hooks/useSichtbareModule.ts`.

## Ereignisse

- **sendet:** keine (Glocke kommt vom Server)
- **hört auf:** keine

## Hinweise

- Kapitel-Aufbau und Regeln: `lib/kapitel.ts` (Leser) und Entscheid 0043. Der Test `lib/kapitelVollstaendig.test.ts` prüft alle Module.
- Hilfe im Bereich: `HilfePanel` (F1 oder «?» in der Kopfzeile, `src/layouts/HilfeKnopf.tsx`).
- Zahl am Reiter «Neu»: zuletzt gesehenes Datum in `localStorage` (`handbuch.neuGesehen`), nur Bequemlichkeit.

- «Fehler melden» erreicht man auch über die Befehlspalette und jede Fehleranzeige; der Bereich steht in `neu`.
- Neue Prozess-Version: die alte Datei bleibt unter «Frühere Versionen» (höchstens 20).
- «Erste Schritte» (Phase 16) ist die Schulungs-Kurzanleitung; der Text steht in `handbuch.start` der Sprachdateien (DE/FR gleich aufgebaut) und lässt sich auf eine A4-Seite drucken.
- Helpdesk mit Freigabe (31.10.2026): Claude prüft jede Meldung über die Edge Function `helpdesk`, die entscheidende Person (Einstellung `helpdesk`, wählbar oben in «Meldungen») bekommt SMS, Glocke und Windows-Pop-up und entscheidet mit einem Knopf. Die Einschätzung sieht nur die Administration. Entscheid 0030.
