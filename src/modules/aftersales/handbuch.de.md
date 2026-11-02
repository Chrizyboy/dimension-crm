---
stand: 2026-11-02
rollen: projektleitung, innendienst, montage, geschaeftsleitung
---

# Service & Garantie

Alles nach dem Bau: Störungen, Reklamationen, Garantiefälle beim Hersteller und Kontrollen. Der **Leitstand** zeigt jeden offenen Fall nach Arbeitsschritt und wie viel Zeit bis zur Reaktion bleibt. Im Reiter **Anlagen** stehen die Daten jeder gebauten Anlage mit Garantie und Komponenten.

## Wer arbeitet hier {#wer}

- **Innendienst**: nimmt Anrufe und Mails auf, erfasst den Fall, plant den Termin.
- **Projektleitung und Service-Verantwortliche**: Diagnose, Garantiefall beim Hersteller, Abschluss und Verrechnung.
- **Montage**: sieht den Einsatz am Handy und schreibt den [Rapport](kapitel:fieldwork).

## So geht's {#so}

### Einen neuen Fall erfassen

1. **Neuer Fall**, bei **Woher?** die Quelle wählen (Anruf, Mail …).
2. Kunde und Anlage wählen. Das CRM zeigt sofort, ob noch **Garantie** läuft.
3. **Wie schlimm?** setzen (zum Beispiel «Anlage steht»), dazu **Komponente**, **Fehlercode**, **Vor Ort**, **Zugang** und Fotos.
4. **Speichern**. Nummer (S001 …), Priorität, Reaktionszeit und Checkliste setzt das CRM.

### Einen Fall durcharbeiten

1. Im Leitstand die Karte anklicken. Die Fall-Akte öffnet als ganze Seite.
2. Oben die **Arbeitsschritte**: Eingang, Diagnose, Termin, Vor Ort, Teile / RMA, Erledigt, Verrechnet.
3. Unter **Verlauf** festhalten, was passiert: **Notiz**, **Anruf**, **Mail** oder **SMS**, dann **Festhalten**.
4. Die **Checkliste** abhaken; fehlt ein Punkt, **Eigenen Schritt hinzufügen**.
5. Im Leitstand lässt sich eine Karte auch per **Stand ändern** in die nächste Spalte schieben.

### Einen Garantiefall beim Hersteller führen

1. In der Fall-Akte **Garantiefall erfassen**: Hersteller, Komponente, Seriennummer, **RMA-Nummer**.
2. Den Stand nachführen, bis das Ersatzteil da ist; eine **Gutschrift** eintragen, wenn der Hersteller zahlt.

### Abschliessen und verrechnen

1. Ist der Einsatz vorbei, steht der Rapport unter **Rapporte und Verrechnung**.
2. Kostenpflichtig? **Rechnung erstellen** legt einen Entwurf in [Rechnungen](kapitel:invoices) an.
3. Fall auf **Erledigt** setzen. Kommt der Kunde wieder: **Wieder öffnen**.

### Eine Meldung von der Website bearbeiten

1. Schnellfilter **Website**. Das CRM hat Kunde und Anlage über Projektnummer, Adresse, Mail oder Telefon gesucht.
2. Nicht gefunden: Filter **Ohne Kunde**, Fall öffnen und Kunde wählen oder **Als neuen Kunden anlegen**.

### Anlagen pflegen

1. Reiter **Anlagen**, Filter **Kontrolle fällig** oder **Garantie läuft ab**.
2. Anlage öffnen: Inbetriebnahme, **Garantie bis**, **Nächste Kontrolle**, Monitoring-Link und Komponenten mit Seriennummer (**Komponente hinzufügen**).

## Stände {#staende}

- **Eingang**: neu, noch niemand dran.
- **In Arbeit**: Diagnose läuft.
- **Geplant**: Termin vor Ort steht.
- **Wartet auf Teile**: Ersatzteil oder RMA beim Hersteller.
- **Erledigt**: abgeschlossen; im Board 14 Tage sichtbar.
- Die Karte zeigt die Reaktionszeit: **noch …** oder **… zu spät**.

## Läuft automatisch {#automatisch}

- Projekt, Ort, Priorität, Reaktionszeit, Checkliste und Garantie ergänzt das CRM beim Speichern.
- Meldungen aus dem Störungsformular der Website werden zum Fall; der Kunde bekommt eine Bestätigung über den [Ausgangskorb](kapitel:outbox), Zuständige eine Glocke.
- Ein Fall kann direkt aus einer Mail im [Posteingang](kapitel:inbox) entstehen.
- Anlagen entstehen mit der Inbetriebnahme im [Projekt](kapitel:projects).
- Dringende und offene Fälle sowie Kontrollen in 30 Tagen stehen auf [Mein Tag](kapitel:today).

## Regeln {#regeln}

- Reaktionszeiten, Checklisten, Verantwortliche und Bestätigungstexte stellt nur die Administration ein.
- Was an den Kunden geht, läuft über den Ausgangskorb.

## Häufige Fragen {#fragen}

### Wie schnell müssen wir reagieren?

Das hängt von **Wie schlimm?** ab und steht auf der Karte als «Termin spätestens …». Die Zeiten legt die Administration fest.

### Der Kunde hat zwei Anlagen.

Beim Fall die richtige Anlage wählen. **Frühere Fälle** zeigt, was an dieser Anlage schon war.

## Neu {#neu}

- 02.11.2026: Leitstand als Board mit Reaktionszeit, Fall-Akte als ganze Seite mit Arbeitsschritten, Checkliste und Kosten; Meldungen aus dem Störungsformular der Website.
- 31.10.2026: Service-Fall direkt aus einer Mail im Posteingang.
- 22.10.2026: Garantiefall beim Hersteller im Service-Fall.
