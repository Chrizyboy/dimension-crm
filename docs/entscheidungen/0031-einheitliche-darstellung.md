# 0031 Einheitliche Darstellung aller Bereiche

Datum: 31.10.2026 · Auftrag: Chris («die Darstellung in den Modulen ist zusammengewürfelt, es soll einheitlich sein,
was auf eine Zeile gehört, bleibt auf einer Zeile»)

## Ausgangslage

Bestandsaufnahme aller 27 Bereiche am PC und am Handy (Bilder unter `darstellung/bestandsaufnahme/` in den
Projektdateien). Gefunden: Suchfeld mal links, mal rechts, jedes Mal anders breit; Filter mal mit, mal ohne Zahl;
am Handy Reiter und Knöpfe auf zwei bis drei Zeilen umgebrochen; Listen mal auf weisser Fläche, mal ohne;
Namen über drei, vier Zeilen, Zusatzangaben abgeschnitten; Detailfenster in acht Breiten (32 bis 46 rem) und
Angaben in drei verschiedenen Darstellungen; Zahlen mal in Schreibmaschinenschrift, mal normal.

## Entscheid

Farben, Seitenleiste, Schriften und alle Inhalte bleiben. Neu gibt es für jede wiederkehrende Form genau einen Baustein:

| Form                | Baustein                                   | Regel                                                                                                |
| ------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Seitenkopf          | `Seitenkopf` + `Knopfleiste`               | Hauptaktion zuletzt. Am Handy nur sie offen, der Rest unter «Mehr» (Chris, Frage 2 A).               |
| Reiter, Ansichten   | `ReiterListe`, `reiterListeKlasse`         | Immer eine Zeile, am Handy seitlich wischen (Chris, Frage 1 A).                                      |
| Filter              | `Filterchips`                              | Am Handy eine Zeile zum Wischen, am PC dürfen sie umbrechen.                                         |
| Suche und Filter    | `Werkzeugleiste`, `Suchfeld`               | Suche oben links (18 rem, Lupe), Zahl oder Export oben rechts, Filter darunter.                      |
| Liste               | `Datentabelle`                             | Immer auf weisser Fläche mit Rahmen.                                                                 |
| Listenzellen        | `NameZelle`, `DatumZelle`, `BetragZelle` … | Name höchstens zwei Zeilen, darunter genau eine Zeile; Datum, Betrag, Nummer, Status brechen nie um. |
| Detailfenster       | `DialogInhalt art="seite"` mit `breite`    | Nur «normal» (40 rem) und «breit» (48 rem).                                                          |
| Knöpfe in der Akte  | `Knopfleiste haupt="erste"`                | Am Handy die erste Aktion offen, der Rest unter «Mehr».                                              |
| Angaben in der Akte | `Angabe` (`AkteAbschnitt`)                 | Beschriftung links, Wert rechts, untereinander; auch in der Kundenakte.                              |

Die Regel aus PR #23 («Reiter brechen um») ist damit ersetzt; «Namen höchstens zwei Zeilen, am Handy Nummer/Ort
in der Zeile darunter» gilt weiter.

## Folgen

Neue Listen und Akten nutzen nur diese Bausteine. Eigene Suchfelder, feste Breiten an Seitenblättern
(`md:w-[…]`) und eigene Reiterleisten gibt es nicht mehr.
