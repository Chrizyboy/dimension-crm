# 0033 – Posteingang mit Antwortfristen

**Kontext:** Chris wünschte am 31.10.2026 einen Bereich, der alle eingehenden Mails «richtig organisiert und die
wichtigen Dinge ins CRM zieht», für bessere Administration und Reaktionszeit: «die Kunden dürfen nicht im Stich
gelassen oder warten gelassen werden». Konzept mit Vorschau am 31.10.2026, Chris sagte «ja».

**Entscheid:**

- **Eigener Bereich «Posteingang»** (`inbox`, Gruppe Übersicht, Phase 18) gleich nach «Mein Tag», mit Ansichten
  «Wartet auf uns», «Alle offenen», «Meine», «Erledigt», «Werbung & Intern», Reitern Reaktionszeit und Einstellungen.
  Mail-Akte als Seitenpanel (`#/inbox?mail=…`), Karte «Wartet auf Antwort» auf «Mein Tag».
- **Quelle Outlook über Microsoft Graph**, wie Phase 8: persönliche Postfächer mit der Verbindung der Person, Team-
  Postfächer (`postfach_anfragen`, `team_postfaecher`) über Stellvertretung; fehlt der Zugriff, wird das Postfach
  übersprungen. Beginn mit dem ersten Lauf (`aktiv_seit`), nie mehr als 3 Tage zurück; kein Import alter Mails.
  Gespeichert werden Kopf, Vorschau (400 Zeichen) und Link; der ganze Text wird nur beim Öffnen aus Outlook geholt.
- **Sichtbarkeit:** Team-Postfächer sieht das Team, persönliche Mails nur die Person selbst und wem sie zugeteilt sind.
- **Einordnen:** feste Regeln vor der KI (eigene Domain, Newsletter-Absender, Formular-Anfragen). Die KI (Funktion
  `posteingang`, Stufe «schnell», Mail nur als `<daten>`) liefert Art, Sprache, dringend, Antwort nötig,
  Zusammenfassung und Nummern. Ohne Schlüssel oder über dem Tageslimit gilt ein Regel-Rückfall («Ohne KI», Art prüfen).
- **Fristen in Arbeitszeit** (Mo–Fr 07:30–17:30, Feiertage ausgenommen) je Art: Störung 2 h, neue Anfrage 4 h, Kunde,
  Rechnung 10 h (1 Arbeitstag), Amt 20 h; Lieferant, Ausschreibung, Sonstiges ohne Frist; dringend höchstens wie Störung.
  Erinnerung einmal je Stufe in der Glocke: Vorwarnung (30 Min.), überschritten, doppelte Frist an die Leitung
  (`eskalation`, sonst Administration). Keine Mail.
- **Zuständig** (Chris 1.11.2026: «jeder bearbeitet seine eigenen Mails»): Mails im persönlichen Postfach gehören der
  Person selbst. Mails aus Team-Postfächern (info@) verteilen Davis oder Chris (`verteilen`); zuständig ist die erste
  anwesende, die Glocke bekommen alle, die verteilen; sie geben die Mail mit «Weitergeben» weiter. Keine automatische
  Zuteilung nach Sprache. Steht jemand in Outlook oder im CRM auf «abwesend», geht die Mail an die Stellvertretung.
  Glocke bei doppelter Frist: Chris und Loris (`eskalation`). Migration 20261110001100.
- **Erledigt** durch eine Antwort in «Gesendet» (gleiche Konversation oder an den Absender), über den Ausgangskorb
  (Trigger) oder von Hand; Reaktionszeit in Arbeitsminuten für die Auswertung (Mitte, Anteil in der Frist).
- **Nichts geht ungefragt hinaus:** «Antworten» öffnet den KI-Entwurf im Mail-Fenster, gesendet wird erst nach Klick.
- Einstellungen in `einstellungen.posteingang`, ändern nur Administration (eigener Trigger, ersetzt
  `intern.einstellung_schuetzen` nicht).

**Folgen:** Die Kürzel in `verteilen` und `eskalation` (davis, chris, loris) müssen zu den Personen passen; sonst unter
Posteingang › Einstellungen ankreuzen. Ohne
Microsoft-Verbindung einer Person bleiben ihre persönlichen Mails draussen; Team-Postfächer brauchen die Berechtigung
in Exchange.
