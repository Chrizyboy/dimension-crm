# 0039 – Service & Garantie Schritt 2: Einsatz mit Team, Anlage-Akte, Ablauf am Handy (2.11.2026)

## Ausgangslage

Schritt 1 (Entscheid 0038) brachte Leitstand, Fall-Akte und Website-Formular. Offen blieben: wer geht wann wie lange
hin (bisher nur «Zuständig» und «Termin»), eine Akte je Anlage über alle Fälle hinweg und was der Monteur vor Ort
am Handy sieht und erledigt.

## Entscheid

- **Einsatz planen** im Fall: Termin, Dauer (1–8 h), wer leitet und wer mitkommt (`service_faelle.team`,
  `dauer_minuten`). Gespeichert nur über `service_einsatz` (setzt Stand «Termin», Verlauf mit Kürzeln; ohne Termin
  zurück in Bearbeitung). Der Dialog warnt bei Abwesenheit, Baustelle oder anderem Service-Termin am selben Tag,
  verbietet aber nichts.
- **Zeitplan** liest die Sicht `service_termine`: Service-Termine erscheinen in der Team-Sicht bei jeder
  eingeteilten Person, in der Baustellen-Sicht als eigene Zeile und am Handy als Karte; Klick öffnet den Fall.
  Konflikt, wenn jemand abwesend oder fest auf einer Baustelle eingeteilt ist.
- **Anlage-Akte** als ganze Seite (`#/aftersales?anlage=…`), eine Abfrage `anlage_akte()`: Kunde, Betrieb,
  Komponenten mit Seriennummer und Garantie, alle Service-Fälle, Rapporte (Service, Wartung, IBN), Dokumente,
  Wartungsvertrag, offene Garantiefälle beim Hersteller. «Neuer Fall» übernimmt Anlage und Kunde.
- **Handy** («Mein Tag» zeigt Service-Termine für Leitung und Team): Auswirkung, Komponente, Fehlercode, Dauer,
  Ansprechperson mit Anruf, Zugang, Anlage mit Monitoring-Link, Seriennummer ändern (`service_seriennummer`, alte
  Nummer bleibt im Verlauf), Checkliste abhaken (`service_checkliste`), «Vor Ort angekommen»
  (`service_eintrag_handy`, wiederholbar mit ID vom Handy). Alles über die Warteschlange, also auch ohne Netz.

## Folgen

- Neue Abläufe am Handy bleiben wiederholbare Datenbank-Funktionen mit ID vom Handy (Regel aus Entscheid 0020).
- Die Felder «Zuständig» und «Termin» stehen nicht mehr in der Box «Einsatz», sondern im Dialog «Einsatz planen».
