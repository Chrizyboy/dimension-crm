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
