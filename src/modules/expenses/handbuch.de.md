---
stand: 2026-11-03
rollen: verkauf, innendienst, projektleitung, montage, buchhaltung
---

# Spesen

Spesen in Sekunden erfassen: Foto vom Beleg, die KI füllt Betrag, Datum, Kategorie und MWST, oder Kilometer mit dem Privatauto. Die Buchhaltung prüft jede Spese, zahlt geprüfte mit dem Lohn aus und gleicht die Firmenkarte mit dem Kartenauszug ab.

## Wer arbeitet hier {#wer}

- **Alle**: eigene Spesen erfassen, bis zur Prüfung ändern oder zurückziehen, Rückfragen beantworten.
- **Buchhaltung (Recht Finanzen)**: prüfen, Rückfrage stellen, ablehnen, auszahlen, Firmenkarte abgleichen, Auswertung und Regeln.

## So geht's {#so}

### Eine Spese erfassen

1. **Spese erfassen** (in der Monteur-Ansicht direkt auf der Startseite).
2. **Foto** des Belegs machen oder **Datei wählen**. Die KI liest Betrag, Datum, Kategorie, MWST und Anzahl Personen; mit **Mit KI lesen** nochmals lesen.
3. **Bezahlt mit**: **Eigenes Geld** oder **Firmenkarte**. Bei Bedarf **Projekt** wählen.
4. Zweck kurz beschreiben (zum Beispiel «Parkhaus Kundentermin Freiburg»), **Speichern** oder **Speichern und nächste**.

### Kilometer mit dem Privatauto

1. **Kilometer erfassen**.
2. Strecke und Kilometer eintragen. Der Betrag (Kilometer × Ansatz) wird gerechnet.
3. **Speichern**.

### Eine Rückfrage beantworten

1. In **Meine Spesen** steht die Frage der Buchhaltung oben, dazu kommt eine Glocke.
2. **Beantworten**: Spese ändern (zum Beispiel Beleg ersetzen, Notiz ergänzen).
3. **Speichern**. Die Spese geht zurück an die Buchhaltung.

### Spesen prüfen (Buchhaltung)

1. Reiter **Prüfen**: links die Liste, rechts Beleg und Angaben mit Hinweisen.
2. **Geprüft**, **Rückfrage** (mit Frage) oder **Ablehnen** (mit Grund). Tasten J/K blättern, P prüft.
3. Was keinen Hinweis hat: **Alle ohne Hinweis prüfen**.

### Spesen auszahlen (Buchhaltung)

1. Reiter **Auszahlen**: geprüfte Spesen mit eigenem Geld je Person.
2. Personen wählen, **Auszahlung erstellen**, Datum und Art (**Mit dem Lohn** oder **Überweisung**).
3. **Abrechnung PDF** mit allen Belegen für die Lohnbuchhaltung. Jede Person bekommt eine Glocke.

### Firmenkarte abgleichen (Buchhaltung)

1. Reiter **Firmenkarte**, **Auszug einlesen**: CSV aus dem E-Banking oder dem Kartenportal.
2. Passt genau eine Firmenkarten-Spese (gleicher Betrag, ±3 Tage), ist die Buchung schon verbunden. Sonst bei **Karte von** die Person wählen und **Mit Spese verbinden**.
3. Fehlt der Beleg: **Belege nachfordern**, die Person bekommt eine Glocke. Sobald sie die Spese erfasst, verbindet sich die Buchung selbst.
4. Ohne Beleg in Ordnung (Abo, Gebühr, privat): **Ohne Beleg**, Grund angeben, **Erledigen**.

### Regeln pflegen (Buchhaltung)

1. Reiter **Regeln**: Mail der Buchhaltung, Kilometer-Ansatz, Frist zum Einreichen, Standard der Auszahlung.
2. Kategorien mit Konto, üblicher MWST, Richtwert und «Beleg ab». **Speichern**.

## Stände {#staende}

- **Eingereicht**: liegt bei der Buchhaltung, noch änderbar.
- **Rückfrage**: die Buchhaltung braucht etwas von dir.
- **Geprüft**: in Ordnung, wird mit dem nächsten Lauf ausbezahlt (Firmenkarte: nur Beleg, keine Auszahlung).
- **Ausbezahlt**: mit Datum und Art, fest.
- **Abgelehnt** und **Zurückgezogen**: mit Grund sichtbar, fest.
- Firmenkarte: **Ohne Beleg**, **Verbunden**, **Erledigt**.

## Läuft automatisch {#automatisch}

- Fotos werden vor dem Hochladen verkleinert, damit es auch auf der Baustelle schnell geht.
- Kilometer-Betrag und MWST rechnet die Datenbank.
- Hinweise beim Prüfen: doppelt, ohne Beleg, zu spät eingereicht, über dem Richtwert, Fremdwährung.
- Spesen mit Projekt zählen in der Nachkalkulation des [Projekts](kapitel:projects).
- Rückfragen, Spesen zum Prüfen und zum Auszahlen stehen auf [Mein Tag](kapitel:today).

## Regeln {#regeln}

- Jede Person sieht nur ihre eigenen Spesen, die Buchhaltung alle.
- Zurückziehen statt Löschen. Prüfen, ablehnen und auszahlen nur die Buchhaltung.
- Firmenkarte wird nie ausbezahlt. Eine Kartenbuchung gehört zu genau einer Spese.
- Die KI schlägt nur vor; gespeichert wird, was im Fenster steht.

## Häufige Fragen {#fragen}

### Ich habe keinen Beleg mehr.

Trotzdem erfassen und im Zweck notieren. Die Buchhaltung sieht den Hinweis **Ohne Beleg** und entscheidet.

### Ich habe eine Spese doppelt erfasst.

Eine davon **Zurückziehen**, Grund «doppelt». Nach der Prüfung meldest du dich bei der Buchhaltung.

### Der Kartenauszug wird nicht gelesen.

Als CSV herunterladen, nicht als PDF. Die Kopfzeile braucht ein Datum und einen Betrag; Zeilen wie Total oder Saldo werden übersprungen.

## Neu {#neu}

- 03.11.2026: Firmenkarte mit dem Kartenauszug abgleichen, fehlende Belege nachfordern.
- 02.11.2026: Prüfen mit Rückfrage und Ablehnen, Kilometer, Firmenkarte, Projekt, MWST, Auszahlung als Lauf mit Abrechnung PDF, Auswertung und Regeln.
- 31.10.2026: Spesen per Klick in der Monteur-Ansicht.
- 23.10.2026: Beleg mit KI lesen.
- 22.10.2026: Spesen mit Beleg, Meine und Alle, ausbezahlt, Storno, Mail an die Buchhaltung.
