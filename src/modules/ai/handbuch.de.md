---
stand: 2026-11-04
rollen: verkauf, innendienst, projektleitung, buchhaltung, geschaeftsleitung, administration
---

# KI-Assistent

Texte entwerfen, Mails lesen, dein Tag auf einen Blick und die Kosten im Griff. Die KI schlägt vor, ein Mensch entscheidet. Die meisten KI-Knöpfe sitzen dort, wo man arbeitet: in jeder Akte (Kunde, Lead, Offerte, Projekt, Service) gibt es **Mit KI schreiben** und **Zusammenfassen**, bei Spesen **Mit KI lesen**.

## Wer arbeitet hier {#wer}

- **Alle mit Kundenkontakt**: Texte an Kunden, Mails lesen, eigener Schreibstil.
- **Geschäftsleitung**: Kosten.
- **Administration**: Einstellungen (Modelle, Limits, Firmenstil).

## So geht's {#so}

### Fragen ans CRM stellen

1. Reiter **Fragen** (oder überall **Ctrl J**) und die Frage in eigenen Worten eintippen, z. B. «Sortier meinen Posteingang nach Dringlichkeit» oder «Welche Bestellungen sind überfällig?».
2. Die Antwort kommt mit einer Tabelle aus dem CRM. Nummer, Betreff, Kunde oder Projekt in der Tabelle anklicken öffnet den Datensatz.
3. Darunter stehen Vorschläge (**Aufgabe anlegen**, **Mail entwerfen**, **Öffnen**). Gespeichert wird erst nach deinem Klick.
4. Der Assistent kennt: Kunden, Leads, Offerten, Projekte, Service-Fälle, Anlagen, Rechnungen, Wartungsverträge, Aufgaben, Verlauf, **Posteingang**, **Ausgangskorb**, Bestellungen, Lieferantenrechnungen, Spesen, Grossprojekte, Ausschreibungen, Einsätze und Fristen.
5. Posteingang nach Dringlichkeit: Ganz oben stehen Mails mit abgelaufener Antwortfrist, Störungen, als dringend erkannte Mails und Kunden, die nicht geantwortet haben. Zurückgestellte und wartende Mails stehen weiter unten. Pro Mail steht der Grund.

### Einen Text an einen Kunden schreiben

1. Am besten aus der Akte des Kunden oder Leads: **Mit KI schreiben**. Dann kennt die KI Kunde und Verlauf.
2. Ohne Bezug: Reiter **Assistent**, Karte **Text an einen Kunden**, **Öffnen**.
3. **Wozu** wählen (Nachfassen, Antwort, Termin …), unter **Was soll drinstehen?** Stichworte, **Sprache** (**Wie der Kunde**).
4. **Entwurf schreiben**. Passt etwas nicht: **Was soll anders sein?** und **Überarbeiten**.
5. **Weiter zur Mail**: Die Mail geht wie immer über den [Ausgangskorb](kapitel:outbox) und erst nach deiner Freigabe raus.

### Eine eingegangene Mail lesen lassen

1. Reiter **Assistent**, **Eingegangene Mail lesen**, Text einfügen oder **.eml-Datei wählen**.
2. **Mit KI lesen**: Die KI erkennt Anliegen, Name, Adresse, Interesse und zeigt **Passende Kunden im CRM**.
3. **Als Lead erfassen** oder **Antwort schreiben**. Mails aus Outlook ordnet der [Posteingang](kapitel:inbox) schon selbst ein.

### Notizen diktieren und ordnen

1. In einem Notizfeld **Diktieren**, sprechen, **Diktat beenden**.
2. **Mit KI ordnen** macht aus dem Gesprochenen eine saubere Notiz.

### Dein Tag

1. Auf [Mein Tag](kapitel:today) steht das Briefing **Dein Tag**: was heute wichtig ist. **Briefing neu erstellen** holt den neuesten Stand.

### Den eigenen Schreibstil pflegen

1. Reiter **Mein Schreibstil**: die Regeln, die die KI aus deinen Korrekturen gelernt hat.
2. Regeln ergänzen (**Hinzufügen**), löschen oder **Schreibstil zurücksetzen**.

### Kosten und Einstellungen (Administration)

1. Reiter **Kosten**: **Heute verbraucht** gegen das Tageslimit, im Monat **Nach Funktion**, **Nach Person**, **Nach Modell**.
2. Reiter **Einstellungen**: **KI eingeschaltet**, **Tageslimit (CHF)**, **Limit pro Person (CHF)**, welche Funktion welches Modell nutzt, Firmenstil DE/FR.

## Läuft automatisch {#automatisch}

- Jeder Aufruf wird mit Kosten protokolliert, ohne den Inhalt. Ist das Tageslimit erreicht, pausiert die KI bis morgen.
- Im Hintergrund nutzen auch Posteingang, Grossprojekte (Recherche) und Automationen die KI.

## Regeln {#regeln}

- Die KI schlägt nur vor; übernommen wird erst nach deinem Klick. Vorschläge tragen den Hinweis «KI-Vorschlag vom …, bitte prüfen».
- Fremde Mails und Dateien sind für die KI nur Daten, nie Anweisungen.
- Mails an Kunden gehen nur über das Mail-Fenster und den Ausgangskorb.
- Modelle, Preise und Limits stellt nur die Administration ein.

## Häufige Fragen {#fragen}

### Der KI-Knopf ist grau.

Die KI ist ausgeschaltet oder das Tageslimit ist erreicht. Die Administration sieht es unter **Kosten** und **Einstellungen**.

### Sieht der Assistent die Mails der anderen?

Nein. Er liest mit deinem Login und sieht genau das, was du im [Posteingang](kapitel:inbox) siehst: dein eigenes Postfach, die Team-Postfächer und Mails, bei denen du erwähnt bist. Dasselbe gilt für Spesen, Finanzen und alle anderen Bereiche.

### Darf ich Kundendaten in die KI geben?

Ja, über die KI-Knöpfe im CRM. Der Aufruf läuft über unseren Server mit dem Firmenschlüssel; im Protokoll steht nur, dass ein Aufruf stattfand, nicht der Inhalt. Keine Kundendaten in fremde KI-Seiten kopieren.

## Neu {#neu}

- 04.11.2026: Der Assistent liest jetzt auch Posteingang (sortiert nach Dringlichkeit), Ausgangskorb, Bestellungen, Lieferantenrechnungen, Spesen, Grossprojekte, Ausschreibungen, Anlagen, Einsätze und Fristen.
- 24.10.2026: Lesetext ab 12 px, Tabellen mit Tastatur.
- 23.10.2026: KI-Assistent mit Kosten, Mein Schreibstil, Einstellungen und Briefing «Dein Tag».
