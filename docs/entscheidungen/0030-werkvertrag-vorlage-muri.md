# 0030 – Werkvertrag nach Vorlage Muri, mit Anzahlungsrechnung

**Datum:** 31.10.2026 · **Entschieden von:** Chris

## Ausgangslage

Die Werkverträge für die Batterie-Kunden (Oktober 2026) wurden ausserhalb des CRM nach der Vorlage Muri erstellt
und gefielen Chris («perfekt»). Das CRM druckte bisher einen eigenen Vertrag mit 15 Abschnitten.

## Entscheid

- Der Werkvertrag im CRM folgt der Vorlage Muri: Seite 1 Parteien und Vertragsgegenstand mit Ankreuz-Optionen,
  Seite 2 Termine, Werklohn mit Zahlungsplan und Unterschriften, danach die AGB der Dimension Solaire (20 Punkte)
  zweispaltig. Deutsch und Französisch (getreue Übersetzung). Logo oben rechts auf jeder Seite.
- Für Dimension Solaire unterschreibt Chris Rosenberg; Unterzeichner, Ansprechperson, Kontakt und Adresse stehen in
  der Einstellung `werkvertrag` (nur Administration, in «Werkverträge › Einstellungen»). Telefon je Sprache: der
  deutsche Vertrag zeigt die Hauptnummer Muri, der französische die Hauptnummer Bulle (`telefon_de`/`telefon_fr`).
- Eigene Unterschrift: jede Person legt sie in «Mein Konto › Meine Unterschrift» ab (zeichnen oder Bild, als PNG
  im privaten Speicher `unterschriften`, Ordner = Person; nur die Person selbst liest und ändert sie). Beim Senden
  setzt «Mit meiner Unterschrift unterschreiben» das Bild in den Kasten und den eigenen Namen darunter
  (`src/services/unterschrift.ts`, für weitere Dokumente wiederverwendbar). Ohne Bild bleibt der Kasten leer.
- Das PDF entsteht in der App (`pdf-lib`), damit es als Datei an die Mail kann. Der alte Druck mit 15 Abschnitten
  fällt weg; Druck und PDF bleiben als Funktion («PDF ansehen»).
- Zahlungsbedingungen per Klick (Chris 31.10.2026): Standard normale Anlagen 40 / 30 / 30 (Unterzeichnung bzw.
  Administration, Material vor Beginn der Arbeiten, Inbetriebnahme), Batterien 70 / 30 (Material bei Unterzeichnung,
  Inbetriebnahme). Dazu 100 %, 55 / 45 (wie AGB 9.1), die bisherigen 50 / 30 / 20 und 80 / 20, eine eigene
  Anzahlung in CHF (Rest nach Inbetriebnahme) oder «Eigene Raten»: 1 bis 6 Raten mit freier Bezeichnung und
  Prozent, zusammen genau 100 % (`intern.eigene_tranchen`, in der App `eigeneTranchen`). Raten auf ganze Franken, die letzte nimmt den Rest
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
- Unterschriften liegen nur im privaten Speicher, nie im Repo.

## Nebenbei behoben

- Projekte aus «Auftrag erstellen» bekamen keine Ablauf-Vorlage und damit keinen Fahrplan. Jetzt Photovoltaik,
  bei Batterie ohne PV-Leistung Speicher-Nachrüstung (`intern.ablauf_fuer_offerte`); bestehende Projekte ohne
  Vorlage wurden nachgetragen.
