# 0032 Zuständigkeiten und automatische Lead-Zuteilung

Stand: 31.10.2026, Chris: Filipe macht den Verkauf für alles Französischsprachige, Loris für alles
Deutschsprachige; Offerten macht Andy, Chris unterstützt; alles muss änderbar sein. Vorher gewählt:
Zuteilung nach Region, Sprache und Produkt mit Stellvertretung bei Abwesenheit.

## Entscheid

- Einstellung `einstellungen.zustaendigkeiten` (nur Administration, Reiter Einstellungen › Zuständigkeiten):
  Regeln für den Verkauf (Sprache, Standort, Region, Produkt → Person), Person für Offerten, Stellvertretung.
- Ein neuer Lead ohne Person bekommt sie beim Anlegen (Trigger `zuteilen`), also auch Webseiten-, Mail- und
  Messe-Leads. Damit gehen Aufgabe «Erstkontakt» und Glocke der Automation «Neuer Lead» direkt an sie.
- Genauere Regeln gelten zuerst (die App sortiert beim Speichern nach Anzahl Bedingungen).
- Neue Offerten gehen an die Person für Offerten (`intern.offerte_verantwortlich`), eine mitgegebene Person
  geht vor. Die bisherige Regel `offerte_verantwortlich` (Bulle, Richtofferte) bleibt als Rückfall.
- Abwesend laut `abwesenheiten` (ganzer Tag) → Stellvertretung, wenn diese da ist.
- Pro Lead («Termin bei») und pro Offerte («Zuständig») bleibt die Person änderbar; der Import der Vorlage
  behält seine Zuteilung.
- Grossprojekte (Ansprechperson Chris) regelt der Bereich Grossprojekte selbst (`einstellungen.grossprojekte`).

## Nachtrag 19.11.2026: Zuteilung wieder wie in der Vorlage

Chris: «Die Zuteilung soll nach dem Prinzip vom alten CRM erfolgen. Aftersales-Fälle alle an Andy, er wählt den
Mitarbeiter.» Die Vorlage V234 teilte so zu, und so gilt es jetzt wieder (Migration `zuteilung_wie_vorlage`):

- **Leads** nach dem Standort der PLZ (`standort_regeln`, Sprachgrenze wie `computeErst`): Bulle → Filipe, Muri →
  Loris. Die Sprache des Kontakts gilt nur noch ohne Adresse (z. B. Posteingang).
- **Offerten** (`intern.offerte_verantwortlich`, wie `fuAuto`): Bulle → Verkauf Bulle; Richtofferte ohne Termin →
  `zustaendigkeiten.offerten` (Andy, Innendienst); sonst wer vor Ort war; sonst Verkauf des Standorts. Vorher gingen
  alle neuen Offerten an Andy, und damit auch die Projekte, die die Person der Offerte übernehmen.
- **Service-Fälle**: jeder neue Fall geht an `zustaendigkeiten.service` (Andy, sonst `service.verantwortlich_id`,
  bei Abwesenheit die Stellvertretung), `zugeteilt_am` bleibt leer, bis er über `service_zuteilen` den Mitarbeiter
  wählt (Verlauf, Glocke). Wählt der Verteiler beim Anlegen selbst, gilt der Fall als zugeteilt.
- **Ausschreibungen**: `ausschreibungen.innendienst` und `senden_vertretung` von Loris auf Andy (Chris: «AS können
  nicht bei Loris sein»).
- Bestehende Daten: korrigiert nur, was eine Regel gesetzt hat und niemand von Hand geändert hat (Änderungsprotokoll);
  offene Service-Fälle ohne geplanten Einsatz gehen zu Andy. Jede Korrektur steht in `zuteilung_korrekturen`,
  zurück über `zuteilung_korrektur_rueckgaengig()` (Einstellungen › Zuständigkeiten).
