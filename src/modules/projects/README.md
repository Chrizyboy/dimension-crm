# Modul: Projekte & Montage

**Zweck:** Führt jeden unterschriebenen Auftrag über Bewilligungen, Vorbereitung und Montage bis zur Inbetriebnahme und zum Abschluss; plant die Baustellen je Standort und Woche.

**Stand:** gebaut in Phase **9** (V233: Projekt-Ablauf V108, Bewilligungen V48, Checkliste Elektriker, Bauplanung V126/V127/V134, Gantt mit PDF). Entscheid: `docs/entscheidungen/0018-projekte-service-wartung.md`.

## So läuft es

1. Ein Auftrag (Werkvertrag) erscheint unter «Aufträge ohne Bautermin». «Bautermin» übernimmt ihn in den Bau: ohne Datum (ausstehend), mit Datum (fixiert, Einsatz Team intern) oder in der Vergangenheit (gilt als gebaut). Jede Übernahme lässt sich rückgängig machen.
2. Der **Fahrplan** zeigt sechs Phasen. Bewilligungen (Gemeinde, Netzbetreiber, IA, SiNa, Abnahme, Pronovo) und die Checkliste Elektriker sind markierte Schritte darin. Automatische Schritte folgen aus Vertrag, Einsätzen und Zahlungsplan.
3. Im **Zeitplan** werden Einsätze geplant (intern, extern mit Subunternehmer, voraussichtlich), mit Personen und Warnung bei Abwesenheit. «IBN durchgeführt» schliesst das Projekt ab und legt die Anlage an.
4. Gesuche (TAG, Gemeinde, Förderung) als vorausgefüllte Datenblätter aus der Akte.

## Daten

- Liest/schreibt: `projekte`, `projekt_schritte`, `einsaetze`, `abwesenheiten`, `subunternehmer`, `subunternehmer_auftraege`; Sichten `projekt_fahrplan`, `projekt_stand`, `abwesenheiten_alle`.
- Liest: `ablauf_schritte`, `standorte`, `personen`, `zahlungsplan` (über die Sichten), `kontakte`, `objekte`, `offerten`.
- Abläufe in der Datenbank: `projekt_schritt_setzen`, `projekt_bau_planen`, `projekt_bau_zuruecknehmen`, `projekt_bau_rueckgaengig`, `projekt_zeitplan_speichern`.

## Abhängigkeiten

- `src/services/supabase.ts`, `src/services/fachfehler.ts`, `src/services/meldungen.ts` (Rückgängig in der Meldung), `src/components/shared/MailDialog.tsx` (Anfrage an Subunternehmer über den Ausgangskorb), `src/hooks/useDrucken.ts`.
- Andere Module werden nicht importiert; die Anlage für Service und Wartung entsteht in der Datenbank.

## Ereignisse

- **sendet:** keine.
- **hört auf:** keine.

## Ordner

- `components/` – Seite, Board, Zeitplan, Bewilligungen, Akte, Subunternehmer, Abwesenheiten, Drucke, Startseiten-Karte
- `hooks/` – Daten laden (`useProjekte`), Änderungen mit Fehlermeldung (`useAktion`)
- `services/` – Projekte, Planung, Subunternehmer
- `lib/` – Fahrplan-Anzeige, Wochen und Auslastung (mit Tests)
- `types.ts`, `schema.ts`, `index.ts`
