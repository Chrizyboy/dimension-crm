---
stand: 2026-11-02
rollen: projektleitung, innendienst, geschaeftsleitung
---

# Einkauf & Material

Material je Projekt erfassen, bei den Lieferanten bestellen (Krannich, Solarmarkt, Tritec, PM Green und andere), Liefertermine überwachen und den Wareneingang buchen. Das eigene Lager ist in Bulle: Bestand, Reservierung je Projekt und Mindestmengen.

## Wer arbeitet hier {#wer}

- **Projektleitung**: Materialliste je Projekt, Bestellvorschlag, Wareneingang.
- **Mit Recht Preise**: sieht Einkaufspreise, gibt Bestellungen frei.
- **Lager Bulle**: bucht Eingänge, Entnahmen und Inventur.

## So geht's {#so}

### Die Materialliste eines Projekts erstellen

1. Reiter **Material je Projekt**, Projekt wählen.
2. **Vorschlagen** übernimmt die Liste aus der Kalkulation oder der Offerte. Zeilen anpassen oder ergänzen.
3. Je Zeile zeigt das CRM, was **Da**, **Unterwegs** oder **Fehlt** ist.

### Bestellen

1. In der Materialliste **Bestellvorschlag**: das CRM gruppiert fehlendes Material nach Lieferant.
2. Bestellung öffnen, Positionen prüfen, **Freigeben** (Recht Preise).
3. **Per Mail bestellen**: Bestell-PDF und Mail liegen im [Ausgangskorb](kapitel:outbox). Mit dem Senden gilt die Bestellung als bestellt.
4. Telefonisch oder im Webshop bestellt: **Ohne Mail bestellt**.

### Wareneingang buchen

1. Bestellung öffnen, **Wareneingang**, gelieferte Menge und Datum eintragen.
2. **Wareneingang buchen**. Ware fürs Lager wird für das Projekt reserviert; Ware direkt auf die Baustelle zählt beim Projekt.

### Material aus dem Lager nehmen

1. In der Materialliste bei der Zeile **… aus dem Lager reservieren** oder **… an die Baustelle ausgeben**.
2. Ohne Bestellung: Reiter **Lager**, **Lager buchen** mit Eingang, Entnahme, Korrektur oder Inventur.

### Nachbestellen fürs Lager

1. Reiter **Lager**, Filter **Unter Mindestmenge**.
2. **Nachbestellen** erstellt die Bestellungen.

### Lieferanten pflegen

1. Reiter **Lieferanten**: Bestell-Adresse, Kontakt, Lieferzeit.

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

## Regeln {#regeln}

- Bestellungen und Einkaufspreise nur mit Recht **Preise**.
- Die Bestell-Mail geht nur für freigegebene Bestellungen.

## Häufige Fragen {#fragen}

### Beim Lieferanten fehlt die Bestell-Adresse.

Unter **Lieferanten** eintragen oder in der Mail von Hand eingeben.

### Der Bestand stimmt nicht.

**Lager buchen**, Art **Inventur**, gezählten Bestand eintragen. Die Korrektur bleibt in den Lagerbewegungen sichtbar.

## Neu {#neu}

- 31.10.2026: Suche und Detailfenster einheitlich wie in allen Bereichen.
