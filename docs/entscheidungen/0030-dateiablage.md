# 0030 Automatische Dateiablage in SharePoint

Stand: 31.10.2026, Chris «ja bauen» (Thread «Alle Module von Dimension Work prüfen»).

## Ausgangslage

Die Firmenablage liegt in SharePoint, Website «Dimension-Solaire», Bibliothek «Public». In Bulle legt die
Verkaufsperson den Ordner einer Offerte von Hand unter `BULLE/Devis - offre - Calculation/D <Jahr>` an
(«101687 - Name à Ort» mit zehn Unterordnern) und verschiebt ihn bei Auftrag von Hand nach
`BULLE/Adjudications/A <Jahr>`, verlorene nach `BULLE/Archives -Perdus`. Muri hat `1. ADJUDICATION - AUFTRÄGE`
und `2. DEVIS - OFFERTE`. Das kostet Zeit und wird nicht überall gleich gemacht.

## Entscheid

- Die Struktur bleibt. Dimension Work übernimmt nur die Handgriffe: Ordner anlegen (mit Unterordnern),
  bei Annahme zu den Aufträgen und bei Verlust ins Archiv verschieben, Dateien aus dem CRM einordnen.
- Muri und Bulle bekommen dieselben Unterordner mit zweisprachigen Namen.
- Alles ist Konfiguration in `einstellungen.ablage` (nur Administration): Ein/Aus, Bibliothek, Ordnername,
  Pfade je Standort mit `{jahr}`, Unterordner und welcher Dokument-Ordner wohin gehört.
- Eingeschaltet ab dem Start am Montag 2.11.2026 (Chris: «Alles ab Montag»): `aktiv_seit` = 2.11.2026, nur für
  Offerten ab dann und nie für Übernommenes aus der Vorlage (`alt_id`); alte Ordner bleiben, wie sie sind.
- Microsoft-Verbindung der Person `person` (Standard Chris), sonst der ersten verbundenen Person.
- Regeln in der Datenbank (`ablage_ordner`, Trigger auf `offerten.entscheid` und `projekte`), die Arbeit mit
  Microsoft im Zeitplan alle 5 Minuten (`_shared/ablage.ts`) mit der Verbindung der ersten verbundenen Person.
- Verschieben über die SharePoint-ID: Wer den Ordner in SharePoint umbenennt, stört die Ablage nicht. Pfad und
  Link der Dateien darin ziehen mit (`ablage_ergebnis`).
- Dateien einer Offerte oder eines Projekts gehen in diesen Ordner statt ins Kunden-Backup.
- Ein Projekt hält den Ordner bei den Aufträgen, auch wenn der Entscheid der Offerte später ändert.
- Fehler (z. B. kein Zugriff, Ziel schon belegt) stehen am Ordner und in der Einstellungskarte; nach einer
  Stunde versucht es der Zeitplan wieder.

## Offen

- Pfade Muri aus der echten Ablage übernommen (Offerten `2. DEVIS - OFFERTE/Kundentermin/Vor-Ort-Termin/<Jahr>`,
  Archiv `…/Kundentermin/Archiv`, Aufträge `1. ADJUDICATION - AUFTRÄGE/<Jahr>`); mit dem Team in Muri gegenprüfen.
- Mail-Anhänge automatisch einordnen kommt mit dem Posteingang.
