# 0036 – Filter mit Häkchen, überall gleich (2.11.2026)

## Ausgangslage

In «Anfragen & Leads» liessen Person, Quelle und Region nur einen Wert oder «alle» zu, die Pipeline zeigte immer
alle offenen Spalten. Chris: «hier muss überall einfacher filtern lassen … möglicherweise will man nur 2–3 davon
anzeigen oder eben nicht».

## Entscheid

- Neuer Baustein `MehrfachFilter` (`src/components/shared/`): Knopf mit Aufklappfeld, Häkchen wie in Excel.
  Leer heisst «alle»; wer bei «alle» ein Häkchen wegnimmt, sieht alle ausser diesem («Alle ausser Nina»).
  «nur» neben einem Eintrag wählt genau diesen. Ab 8 Einträgen ein Suchfeld. Regeln rein in `mehrfachAuswahl.ts`.
- Sind wieder alle angehakt, wird daraus «alle», damit neue Personen oder Quellen später von selbst dabei sind.
- **Pipeline:** Knopf «Spalten: 6 von 6» mit Anzahl je Schritt blendet Schritte aus. «Aus» (verloren) und alte
  Aufträge kommen weiter über den Schalter «Abgeschlossene zeigen» (seit den sechs Schritten vom 02.11.2026).
- **Gemerkt** je Person (`useGemerkterFilter`, Speicher `dimension-filter` im Gerät, wie Sprache und Darstellung):
  Filter sind Gewohnheit, keine Geschäftsdaten, darum keine Tabelle. Die Suche beginnt jedes Mal leer.
- Übertragen auf Arbeitszeiten (Person), Zeitplan am Handy (Person) und Zahlungen
  (Kategorien als Mehrfach-Chips, «ungeprüft» schränkt zusätzlich ein). Der neue Posteingang (03.11.2026)
  hat keinen Art-Filter mehr, dort entfiel die Umstellung. Der neue Posteingang (03.11.2026)
  hat keinen Art-Filter mehr, dort entfiel die Umstellung.
- Einzelwahl bleibt, wo es um eine Sicht geht (Offen/Erledigt, Zeitraum, Szenario) oder um gespeicherte
  Zielgruppen (Newsletter-Segment).
