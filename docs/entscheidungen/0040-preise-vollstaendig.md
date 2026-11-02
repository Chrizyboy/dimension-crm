# 0040 – Preise vollständig: Eturnity und Lieferanten einlesen, Kalkulation mit Bausteinen, Freigabe (2.11.2026)

## Ausgangslage

Chris: jedes Modul muss seinen Zweck ganz erfüllen, das CRM sei sonst «nur Fassade». «Preise» war eine Liste mit
Einkauf und Marge, ein Excel-Import und eine Kalkulation mit Artikeln und wenigen freien Positionen.

## Entscheid

- **P1 Eturnity ist die Preisquelle** («dort ist es automatisch»). Zuerst wird der Komponenten-Export als Datei
  eingelesen, später über die API, sobald Eturnity einen Schlüssel gibt (P1b «zuerst A, später B»).
- **P2 Jede Lieferanten-Datei einlesen** (Krannich, Solarmarkt, Tritec …, Excel oder CSV): Spalten werden erkannt,
  die Zuordnung je Quelle gemerkt. `preis_import_anlegen` vergleicht nur und legt das Ergebnis ab (alt/neu, neue
  Artikel, nicht mehr geliefert, betroffene offene Offerten); geändert wird erst mit `preis_import_uebernehmen`
  unter «Preisänderungen». Jede Änderung von EK, Marge, Skonto steht in `preisverlauf` mit Quelle und Person.
- **P3 Kalkulation mit Bausteinen, Varianten A/B/C und Leistungen.** Leistungen & Pauschalen (`leistungen`) haben
  Kosten und festen Verkaufspreis; Bausteine (`kalk_bausteine`) sind Zeilen mit Regel fest/je Modul/je kWp.
  Grosse PV-Offerten bleiben in Eturnity.
- **P4 Freigabe:** Rabatt über `rabatt_frei_prozent` (8 %) oder Deckungsbeitrag unter `mindest_db_prozent` (15 %)
  oder eine Position unter der Mindestmarge der Kategorie braucht die Freigabe (Glocke an die Personen in
  `freigabe_person_ids`, sonst Administration). `kalkulation_in_offerte` prüft das in der Datenbank.
- Regeln, Grenzen und Förderung (Pronovo-Schätzung) stehen in `einstellungen.preise`; ändern nur, wer freigibt.
- **Richtpreis** für alle Rollen in «Für Kunden»: Spanne aus eigenen Offerten ähnlicher Grösse (`richtpreis`).

## Folgen

- Die Geschäftsleitungs-Rolle gibt es noch nicht als Rolle; wer freigibt, wird unter «Leistungen & Regeln» gewählt.
- Der Pronovo-Tarif ist eine Schätzung und jährlich zu prüfen.
- Stundensätze in `einstellungen.finanzen` (Rapport-Rechnung) bleiben; die Leistungen gelten für die Kalkulation.
