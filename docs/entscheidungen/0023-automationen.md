# 0023 – Automationen: Regeln als Daten, Motor in der Datenbank, Freigabe als Standard

**Kontext:** In V233 liefen Automationen nur im offenen Browser-Fenster (Zeitgeber im Skript): War niemand
angemeldet, passierte nichts, und ein zweites offenes Fenster konnte doppelt auslösen. Es gab kein Protokoll, und
die Tabelle `tasks` existierte, war aber leer. Der Bau-Auftrag (3.3) verlangt einen Baukasten «Auslöser →
Bedingungen → Aktionen», den die Administration ohne Programmieren einstellt, mit zehn Vorlagen, dazu die
Statusmeldung an Kunden bei Meilensteinen (Entscheid 0009). Phase 12 wurde von Chris am 23.10.2026 mit «weiter»
gestartet.

**Entscheid:**

- **Regeln sind Daten** (Regel 8): Tabelle `automationen` mit Auslöser, Bedingungen (`feld`, `op`, `wert`) und einer
  Liste von Aktionen als JSON. Ändern darf nur die Administration; die App zeigt dafür einen Editor mit
  «1 Wenn – 2 Nur wenn – 3 Dann». Welche Auslöser, Felder, Aktionen, Empfänger und Platzhalter es gibt, liefert
  `automation_katalog()`, damit App und Datenbank dieselbe Liste kennen.
- **Der Motor läuft in der Datenbank**, nicht im Browser: Trigger auf Leads, Offerten, Projekten und Fahrplan-Schritten
  legen **Signale** an; Zeit-Auslöser (Termin gehabt, Wartung fällig, Rechnung überfällig, monatlich) findet
  `automationen_durchsehen`. Der Zeitplan (Edge Function, jede Minute) ruft `automationen_abarbeiten` auf: Signale
  verteilen, Läufe Schritt für Schritt weiterbringen, Wartezeiten einhalten. Ein Signal ist je Ereignis und
  Schlüssel eindeutig, ein Lauf je Automation und Signal: nichts löst doppelt aus.
- **Nur Neues löst aus:** Jede Automation merkt sich `aktiv_seit`. Beim ersten Durchsehen eines Zeit-Auslösers wird
  der Bestand als «Basis» markiert und nicht nachgeholt. Importierte Daten (mit `alt_id`, durch den Import-Schlüssel)
  geben kein Signal. So schreibt das CRM nach dem Umstieg nicht 700 Kunden auf einmal an.
- **Freigabe ist Standard** (Regel 6): Mail, SMS und Zahlungserinnerung landen bei «mit Freigabe» im Ausgangskorb
  und warten auf einen Menschen; nur bei «automatisch» gehen sie direkt raus. Alle elf Vorlagen stehen auf «mit
  Freigabe». Gesperrte Kontakte (Werbesperre) und Kontakte ohne Adresse werden übersprungen und so protokolliert.
- **Rechte:** Eine Automation handelt mit den Rechten der Person, die sie zuletzt gespeichert oder eingeschaltet hat
  (`ausfuehren_als`). Was nur mit Microsoft oder AbaNinja geht (Outlook-Termin, SharePoint-Ordner, AbaNinja-Kunde),
  hält den Lauf als «server» an; der Zeitplan erledigt es mit dem Zugang dieser Person und meldet zurück. Fehlt eine
  Verbindung, wird der Schritt übersprungen statt den Lauf zu blockieren.
- **Protokoll:** Jeder Lauf hat eine Zeitachse aller Schritte mit Ergebnis (ok, wartet, übersprungen, Fehler) und
  Link zum Datensatz. Liegt der Datensatz im Papierkorb oder ist die Automation ausgeschaltet, wird der Lauf
  abgebrochen. Die Administration kann einen Lauf von Hand beenden.
- **Aufgaben und Glocke:** Aufgaben (Modul «Aufgaben», `#/tasks`) und Benachrichtigungen (Tabelle
  `benachrichtigungen`, in der Glocke) kommen vom Server, je Person und in ihrer Sprache. Die Glocke fragt jede
  Minute nach.
- **Einstellungen** in `einstellungen.automationen` (Vorlauf Wartung, Karenz Rechnung, Tage nach dem Termin,
  Bewertungslink), ändern nur die Administration.

**Die elf Vorlagen:** Neuer Lead (Dubletten, Zuteilung Muri/Bulle nach PLZ, Erstkontakt 24 h), Termin vereinbart
(Outlook, Bestätigung, SMS am Vortag), Termin gehabt ohne Offerte, Offerte nachfassen (14 Tage), Auftrag (Ordner,
AbaNinja, Aufgaben), Baugesuch-Frist (30 Tage), IBN (Schlussrechnung als Entwurf, Pronovo, Bewertung, Wartungsvertrag anbieten), Wartung fällig, Rechnung überfällig
(Zahlungserinnerung, Mahnstufe erst nach dem Senden), monatliche Nachrüst-Zielgruppe, Meilenstein an Kunden.

**Folgen:** Automationen laufen auch nachts und ohne offenes Fenster. Neue Auslöser brauchen einen Eintrag im Katalog
und ein Signal (Trigger oder Durchsicht) in der Datenbank. Der Zeitplan muss im Betrieb jede Minute laufen
(`docs/integrationen.md`). Abgelehnt: Automationen im Browser (V233-Weg), ein externer Dienst wie Zapier oder Make
(Daten und Geheimnisse ausser Haus, Freigabe nicht im CRM).
