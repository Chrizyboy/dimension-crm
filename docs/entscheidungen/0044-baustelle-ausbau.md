# 0044 – Baustelle & Rapporte vollständig: Montage, Projektleitung, GL (2.11.2026)

## Ausgangslage

Phase 9b (Entscheid 0020) brachte einen Rapport für alles, Zeiten und Nachträge, auch ohne Netz. Für eine echte
Montage fehlte viel: wer arbeitet heute mit, was ist schon gemacht, welche Fotos braucht es, Seriennummern, wie
meldet das Team ein Problem, und die Projektleitung sah ihre Baustellen nirgends zusammen. Chris: «nur Fassade».
Neuentwurf mit acht Ansichten (Handy, PC, GL) und vier Fragen, gebaut nach den Empfehlungen.

## Entscheid

- **Unterschrift** nur bei der Abnahme (Montage fertig) und für Nachträge. Ein normaler Tagesrapport geht ohne.
  Bei der Abnahme können Vorbehalte erfasst werden; jeder wird eine Aufgabe «Abnahme mit Vorbehalt».
- **Teamzeit**: die Teamleitung stempelt fürs ganze Team (`zeit_team_starten`/`zeit_team_stoppen`, gleiche
  Uhrzeit, eine Zeile pro Person, wiederholbar mit IDs vom Handy). Erlaubt für das Team des Einsatzes und die
  Projektleitung. Pause wird nach Arbeitsgesetz vorgeschlagen.
- **Sicherheits-Check** ist Pflicht vor dem Teamstart; die Punkte stehen in `einstellungen.baustelle.sicherheit`.
- **Arbeitsschritte und Pflichtfotos** je Projektart (PV, Speicher, Wallbox, Wärmepumpe) als Daten in
  `einstellungen.baustelle` (nur Administration). Der Rapport speichert die heute erledigten Schritte, daraus
  entstehen Fortschritt und – wenn leer – der Text «Arbeiten».
- **Soll-Stunden** nach Faustregel aus `einstellungen.baustelle.soll` (h pro kWp je Dach, Speicher, Pauschalen),
  pro Projekt änderbar (`baustelle_soll_setzen`, Recht `preise`).
- **Seriennummern** scannen (Barcode/QR über den Browser) oder abtippen; beim IBN-Rapport gehen sie in die Anlage.
- **Meldungen** von der Baustelle (`baustellen_meldungen`, `meldung_erfassen`): Aufgabe und Glocke für die
  Projektleitung, «Baustelle steht» als dringend; erledigen mit Notiz (`meldung_erledigen`).
- **Projektleitung**: «Baustellen heute» (`baustellen_heute`, wer hat gestempelt, Fortschritt, Soll/Ist,
  fehlende Rapporte), Baustellen-Akte mit Bautagebuch (`baustelle_akte`), Rapporte visieren oder Rückfrage
  (`rapport_visieren`), Wochenblatt der Zeiten (`zeiten_wochenblatt`, Bestätigen über `zeiten_woche_bestaetigen`).
- **GL**: Auswertung (`baustelle_auswertung`) mit Ist gegen Soll, Stunden pro kWp, Reiseanteil, Nachträgen,
  Meldungen und Rapport-Treue. Kennzahlen rechnet die App (`lib/auswertung.ts`), damit Zahl und Liste passen.
- **Mappe** (`baustellen_mappe`) wird am Handy abgelegt und geht ohne Netz: Anlage, Dach, Pläne, Kontakte,
  Material zum Abhaken beim Laden.

## Folgen

- Die Leitungs-Reiter sieht nur, wer das Recht `preise` hat; Monteure starten weiter bei «Mein Tag».
- `mein_tag` bleibt unverändert; die Zusätze je Einsatz kommen aus `baustellen_infos`.
- Neue Abläufe am Handy bleiben wiederholbare Datenbank-Funktionen mit ID vom Handy (Regel aus Entscheid 0020).
