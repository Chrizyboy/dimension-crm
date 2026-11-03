---
stand: 2026-11-03
rollen: projektleitung, innendienst, geschaeftsleitung
---

# Einkauf & Material

Material je Projekt erfassen, bei den Lieferanten bestellen (Krannich, Solarmarkt, Tritec, PM Green und andere), Liefertermine überwachen und den Wareneingang buchen. Das eigene Lager ist in Bulle: Bestand, Reservierung je Projekt und Mindestmengen.

## Wer arbeitet hier {#wer}

- **Projektleitung**: Materialliste je Projekt, Bestellvorschlag, Wareneingang.
- **Mit Recht Preise**: sieht Einkaufspreise, gibt Bestellungen frei.
- **Lager Bulle**: bucht Eingänge, rüstet für die Baustellen, nimmt Rückgaben an und macht die Inventur.

## So geht's {#so}

### Der Leitstand

Startansicht des Einkaufs. Oben die Kopfzahlen (zu bestellen, wartet auf Freigabe, ohne Auftragsbestätigung, Montagen in Gefahr), darunter jede Bestellung in ihrem Schritt: Freigabe, Bestätigung offen, unterwegs, teilweise da, Rechnung prüfen. **Rot** heisst: die Ware kommt nach der Montage oder ist noch nicht bestellt. Ein Klick auf eine Karte öffnet die Bestellung.

### Die Materialliste eines Projekts erstellen

1. Reiter **Materialplan**, Projekt wählen. Der Materialplan zeigt je Baustelle die Deckung in Prozent und «bestellen bis».
2. **Vorschlagen** übernimmt die Liste aus der Kalkulation oder der Offerte. Zeilen anpassen oder ergänzen.
3. Je Zeile zeigt das CRM, was **Da**, **Unterwegs** oder **Fehlt** ist.

### Bestellen

1. Reiter **Bestellen**: alles, was Baustellen und Lager brauchen, je Lieferant, mit «bestellen bis» (Baubeginn minus Lieferzeit und Puffer, in Arbeitstagen), Frachtfrei-Grenze und Mindestbestellwert.
2. **Entwurf anlegen** (oder für alle Lieferanten): Freies im Lager wird zuerst reserviert, der Rest kommt in einen Entwurf, auf Verpackungseinheiten gerundet. Liegen mehrere Entwürfe eines Lieferanten ans Lager, fasst **Entwürfe zusammenfassen** sie zu einer Sammelbestellung zusammen.
3. Bestellung öffnen, Positionen prüfen, **Freigeben** (Recht Preise). Über der Freigabegrenze: **Zur Freigabe vorlegen**, die Geschäftsleitung bekommt eine Glocke und gibt frei.
4. **Per Mail bestellen**: Bestell-PDF und Mail liegen im [Ausgangskorb](kapitel:outbox). Mit dem Senden gilt die Bestellung als bestellt.
5. Telefonisch oder im Webshop bestellt: **Ohne Mail bestellt**. Bei Lieferanten mit Webshop öffnet **Webshop öffnen** die Seite.

### Auftragsbestätigung prüfen

1. Bestellung öffnen, Abschnitt **Bestätigung und Lieferung**, **AB erfassen**.
2. Die KI liest die AB aus einer Mail im Posteingang oder aus einem PDF vor (**PDF lesen**). Nummer, Termin, Mengen und Preise prüfen, **Speichern**.
3. Abweichungen bei Menge oder Preis sind markiert. Der bestätigte Termin wird zum Liefertermin.
4. Nur kurz bestätigt, ohne Details: **AB erhalten** bei den Angaben. Kommt nichts: **Nachgefragt** vermerken.
5. Tracking, Hinweis zur Anlieferung und Kontakt vor Ort im selben Abschnitt.

### Wareneingang buchen

1. Bestellung öffnen, **Wareneingang**, gelieferte Menge, Datum und Lieferschein-Nr. eintragen. Seriennummern auf Wunsch mit **Seriennummern erfassen**.
2. **Wareneingang buchen**. Ware fürs Lager wird für das Projekt reserviert; Ware direkt auf die Baustelle zählt beim Projekt.

### Lieferantenrechnung prüfen

1. Nach der Lieferung in der Bestellung, Abschnitt **Lieferantenrechnung**: das CRM schlägt passende Rechnungen aus AbaNinja vor, mit dem erwarteten Betrag.
2. Rechnung wählen, **Als geprüft markieren**. Weicht sie deutlich ab (mehr als CHF 50 oder 1 %), braucht es eine Notiz (z. B. Fracht). Die Rechnung gilt dann auch in den Finanzen als geprüft.

### Material aus dem Lager nehmen

1. In der Materialliste bei der Zeile **… aus dem Lager reservieren** oder **… an die Baustelle ausgeben**.
2. Ohne Bestellung: Reiter **Lager**, **Lager buchen** mit Eingang, Entnahme, Korrektur oder Inventur.

### Für eine Baustelle rüsten

1. Materialliste des Projekts öffnen, **Rüstliste**. Sie zeigt nach Lagerplatz, was noch aus dem Lager an die Baustelle geht.
2. Menge je Zeile prüfen, **Drucken** und im Lager abhaken.
3. **… Positionen ausgeben** bucht die Entnahmen, zuerst aus der Reservierung des Projekts.

### Rückgabe von der Baustelle

1. Materialliste des Projekts, bei der Zeile im Menü **Rückgabe ins Lager**.
2. Menge eintragen, **Zurück ins Lager**. Der Bestand steigt, die Entnahme des Projekts sinkt.

### Lagerplatz und Inventur

1. Reiter **Lager**, Artikel anklicken, **Lagerplatz** eintragen (z. B. A-03).
2. **Inventur**: Liste nach Lagerplatz, gezählten Bestand eintragen. Leere Felder bleiben, wie sie sind.
3. **… Abweichungen buchen** bucht nur, was abweicht, mit der Notiz «Inventur».

### Reklamation beim Lieferanten

1. Bestellung öffnen, Abschnitt **Reklamationen**, **Reklamation erfassen**: Position, Grund (defekt, falsche Ware, fehlt, zu viel), Menge und Beschreibung.
2. Beim Lieferanten wie gewohnt per Telefon oder Mail melden, dann **Beim Lieferanten gemeldet**.
3. Ist es gelöst: **Erledigt** mit Lösung (Gutschrift, Ersatz geliefert, zurückgeschickt) und Antwort des Lieferanten.

### Nachbestellen fürs Lager

1. Reiter **Lager**, Filter **Unter Mindestmenge**.
2. **Nachbestellen** erstellt die Bestellungen.

### Lieferanten pflegen

1. Reiter **Lieferanten**: Bestell-Adresse, Kontakt und Konditionen (Lieferzeit, Fracht, frachtfrei ab, Mindestbestellwert, Zahlungsziel, Skonto, Bestellweg).
2. Die Liste zeigt je Lieferant den Einkauf der letzten 12 Monate, die Pünktlichkeit und die tatsächliche Lieferzeit.

## Stände {#staende}

- **Entwurf**: Bestellung wird zusammengestellt.
- **Freigegeben**: darf bestellt werden.
- **Bestellt**: Mail ist gesendet oder ohne Mail bestellt.
- **Teilweise geliefert / Geliefert**: Wareneingang gebucht.
- **Lieferung überfällig**: der Liefertermin ist vorbei.
- **Storniert**: fällt weg.

## Läuft automatisch {#automatisch}

- Mit «Bestellt» und dem Wareneingang setzt das CRM den Material-Stand im Projekt-Fahrplan.
- Der Bestand ändert sich nur über Wareneingang und Lagerbuchungen, nie direkt.
- Stündlich eine Glocke, wenn eine Auftragsbestätigung ausbleibt, eine Montage in Gefahr ist oder «bestellen bis» erreicht ist.

## Regeln {#regeln}

- Bestellungen und Einkaufspreise nur mit Recht **Preise**.
- Die Bestell-Mail geht nur für freigegebene Bestellungen.
- Über der Freigabegrenze (Standard CHF 5'000) geben nur die eingestellten Personen frei. Grenze und Personen ändert nur die Administration.
- Zurück ins Lager kommt höchstens, was für das Projekt ausgegeben wurde.
- Eine Reklamation ist erst erledigt, wenn eine Lösung gewählt ist.

## Häufige Fragen {#fragen}

### Beim Lieferanten fehlt die Bestell-Adresse.

Unter **Lieferanten** eintragen oder in der Mail von Hand eingeben.

### Der Bestand stimmt nicht.

Reiter **Lager**, **Inventur**, gezählten Bestand eintragen. Nur Abweichungen werden gebucht; die Korrektur bleibt in den Lagerbewegungen sichtbar.

## Neu {#neu}

- 03.11.2026: Lagerplatz, Rüstliste mit Druck, Rückgabe von der Baustelle, Inventur in einem Durchgang, Reklamationen beim Lieferanten.
- 02.11.2026: Leitstand, Bestellen je Lieferant mit Sammelbestellung, Materialplan, Freigabegrenze, Auftragsbestätigung mit KI, Lieferantenrechnung prüfen, Konditionen der Lieferanten.
- 31.10.2026: Suche und Detailfenster einheitlich wie in allen Bereichen.
