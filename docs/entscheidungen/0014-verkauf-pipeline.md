# 0014 – Verkauf: ein Geschäft pro Lead, Regeln in der Datenbank, Planung ohne Google

**Kontext:** Phase 6 baut «Anfragen & Leads» mit allen Funktionen aus V233: Leads, Pipeline, Tagesroute, Tour, Kalender, Regionen, Monatsbericht, Excel-Import, Terminblatt und SMS-Liste. In V233 lagen die Regeln (Pflichtfelder beim Statuswechsel, Standort nach PLZ, Nummern) im Browser, die Lage kam von Google.

**Entscheid:**

- **Ein «Geschäft» als Ansicht:** `verkauf_geschaefte` verbindet Lead, jüngste Offerte und Projekt. Offerten und Projekte ohne Lead aus V233 stehen als eigenes Geschäft da. Alle Ansichten und der Stand der Kundenakte lesen dieselbe Quelle.
- **Regeln als Funktionen:** Standwechsel, Kontakt erfassen und Lead anlegen sind Datenbank-Funktionen (`setze_stand`, `lead_kontakt_erfassen`, `lead_anlegen`). So gelten die V233-Regeln gleich für Kanban, Liste, Kalender, Import und später Automationen. Fehler kommen als Schlüssel (`stand.grund_fehlt`) und werden in der App übersetzt.
- **Nummern in der Datenbank:** Lead-Nummern zählt eine Sequenz; liegt sie hinter importierten Nummern, springt sie nach vorne.
- **PLZ-Verzeichnis statt Google:** Ort, Kanton, Lage und Höhe kommen aus einer Tabelle. Standort-Regeln (Kantone, PLZ-Bereiche) liegen in `einstellungen`. Fahrzeiten werden geschätzt (Luftlinie × Umwegfaktor, Tempo aus den Einstellungen); Google Routes folgt mit Phase 8, wenn der Schlüssel als Server-Geheimnis eingerichtet ist.
- **Karte mit swisstopo:** frei nutzbar, ohne Schlüssel, Daten aus der Schweiz. Punkte als SVG; die Zeichenfläche von Leaflet warf beim Schliessen Fehler.
- **Kalender aus Dateien:** bis Phase 8 werden Termine aus .ics/.csv geladen oder eingefügt, auf Wunsch automatisch aus einem verbundenen Ordner (wie V233). Neues Laden ersetzt die Termine im Zeitraum; alte kommen in den Papierkorb.
- **Monatsbericht:** Welche Quelle ein Anbieter ist, steht in der Auswahlliste (`eigenschaften.anbieter`). Text, PDF und «als gemeldet» gehen jetzt; das Senden aus Outlook kommt mit Phase 8 über den Ausgangskorb mit Freigabe (Regel 6).
- **Drucken statt PDF-Bibliothek:** Terminblatt und Bericht werden über den Druckdialog gedruckt oder als PDF gesichert, wie das Kundenblatt aus Phase 5.

**Folgen:** Outlook (Einladungen, Kalender), Mail- und SMS-Versand, automatischer Import von Landingpage und solar-guide.ch sowie Google-Fahrzeiten folgen in Phase 8; KI-Texte und Luftbild-Analyse in Phase 13. Die Plätze dafür sind vorbereitet.
