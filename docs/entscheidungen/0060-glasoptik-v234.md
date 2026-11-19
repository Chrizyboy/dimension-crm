# 0060 – Glasoptik wie V234 (19.11.2026)

## Ausgangslage

Chris hat die Vorlage als «V234» weiterentwickelt (V233 plus neue Glasoptik) und möchte, dass Dimension Work alle
Funktionen daraus hat, gleich funktioniert und genauso aussieht. Ein Abgleich zeigte: fast jede Funktion ist schon da,
der grösste Unterschied ist das Aussehen. Darum kommt zuerst die Optik (Etappe 1), danach Startansichten und Namen
(Etappe 2), Bedienung wie Rechtsklick und PC/Handy-Umschalter (Etappe 3) und Rechte pro Bereich und Person (Etappe 4).

## Entscheid

- **Wand und Glas:** Hintergrund ist ein weicher Farbverlauf (`--wand`), Flächen sind Milchglas (`--glas`,
  `--glas-unschaerfe`, `--glas-rand`, `--glas-schatten`). Die Tokens `surface`, `muted` und `border` sind halb
  durchsichtig, damit alle bestehenden Ansichten ohne Umbau mitziehen.
- **Unschärfe nur auf grossen Flächen** (Klasse `glas`: Karten, Reiterleiste, Seitenleiste, Kopf-Knöpfe, schwebende
  Fenster und Menüs). Listen (`liste-glas`) und Zeilen bekommen helles Glas ohne Unschärfe, sonst ruckelt das Scrollen
  langer Listen in der Windows-App. Schwebendes (`bg-surface` mit `shadow-pop` oder `fixed`) wird fast deckend.
- **Seitenleiste schwebend** mit 14 px Abstand und runden Ecken, Marineblau-Glas, aktiver Bereich als helle Pille mit
  orangem Icon. Unten die **Apps** aus V234 (Website, Eturnity, AbaNinja, Leads-Landingpage, Akquise, Messe) in
  `src/lib/apps.ts`.
- **Kopf ohne Fläche:** Suche als Glas-Pille, runde Glas-Knöpfe für Hilfe, **Vollbild** (F11, in der Windows-App
  über das Tauri-Fenster) und **Aktualisieren** (lädt alle Daten der Ansicht neu, Eingaben bleiben), Glocke und ein
  oranger Kreis mit dem Kurzzeichen.
- **Reiter als Segment-Pille**, Hauptknopf orange mit Verlauf. Abweichung von V234: Schrift auf Orange ist fast
  schwarz statt weiss, weil Weiss auf Orange nur rund 3:1 Kontrast hat (Regel: mindestens 6:1).
- **Schrift:** Systemschrift wie V234 (Segoe UI Variable unter Windows, SF Pro am Mac), Public Sans bleibt Rückfall.
  Titel 28 px, sehr fett. Rundungen 12/16/20 px.

## Folgen

Neue Ansichten nehmen weiter nur Tokens und Bausteine; wer eine grosse Fläche baut, nimmt `Karte` (Glas) statt eigener
Rahmen. Glas nie auf Elemente legen, die pro Zeile vorkommen.
