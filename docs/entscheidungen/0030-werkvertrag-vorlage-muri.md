# 0030 – Werkvertrag nach Vorlage Muri, mit Anzahlungsrechnung

**Datum:** 31.10.2026 · **Entschieden von:** Chris

## Ausgangslage

Die Werkverträge für die Batterie-Kunden (Oktober 2026) wurden ausserhalb des CRM nach der Vorlage Muri erstellt
und gefielen Chris («perfekt»). Das CRM druckte bisher einen eigenen Vertrag mit 15 Abschnitten.

## Entscheid

- Der Werkvertrag im CRM folgt der Vorlage Muri: Seite 1 Parteien und Vertragsgegenstand mit Ankreuz-Optionen,
  Seite 2 Termine, Werklohn mit Zahlungsplan und Unterschriften, danach die AGB der Dimension Solaire (20 Punkte)
  zweispaltig. Deutsch und Französisch (getreue Übersetzung). Logo oben rechts auf jeder Seite.
- Für Dimension Solaire unterschreibt Erich Rosenberg; Unterzeichner, Ansprechperson, Kontakt und Adresse stehen in
  der Einstellung `werkvertrag` (nur Administration, in «Werkverträge › Einstellungen»).
- Das PDF entsteht in der App (`pdf-lib`), damit es als Datei an die Mail kann. Der alte Druck mit 15 Abschnitten
  fällt weg; Druck und PDF bleiben als Funktion («PDF ansehen»).
- Zahlungsbedingungen per Klick: 70 / 30, 100 %, 55 / 45 (wie AGB 9.1), die bisherigen 50 / 30 / 20 und 80 / 20,
  oder eine eigene Anzahlung in CHF (Rest nach Inbetriebnahme). Raten auf ganze Franken, die letzte nimmt den Rest
  (Chris, 27.10.2026). Neue Vorlagen sind Einträge der Auswahlliste `zahlungskondition`, kein Code.
- «An Kunden senden» legt Vertrag und Anzahlungsrechnung (erste Rate, mit QR-Zahlteil) in eine Mail. Die Rechnung
  wird erst beim Vorbereiten gestellt und nur mit Recht `finanzen`; ist die Rate schon in AbaNinja verrechnet,
  entsteht keine zweite. Gesendet wird nur über den Ausgangskorb (Regel 6).
- Damit Module sich nicht importieren, liegen Laden, PDF und Ablage der Rechnung in `src/services/` (`rechnungsdaten`,
  `rechnungPdf`, `zahlteil`), Typen in `src/types/rechnung.ts`, QR-Hilfen in `src/lib/rechnung.ts`.

## Offen

- AGB 15.5 verlangt die Anzeige verdeckter Mängel «innert 7 Kalendertagen»; seit 1.1.2026 gilt für Bauwerke eine
  Rügefrist von mindestens 60 Tagen (Art. 367 Abs. 1bis, 370 Abs. 4 OR), kürzere Fristen sind unwirksam. Wortlaut
  vorerst unverändert wie in der Vorlage, Chris entscheidet.
- Bild der Unterschrift von Erich fehlt; das Feld bleibt leer (Name darunter). Ein Bild gehört nie ins Repo.
