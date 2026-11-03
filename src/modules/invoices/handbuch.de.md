---
stand: 2026-11-02
rollen: buchhaltung, projektleitung, geschaeftsleitung
---

# Rechnungen

Rechnungen aus dem Zahlungsplan eines Projekts (Anzahlung, Montage, Schlussrechnung mit Nachträgen), aus Service-Rapporten, aus Wartungsverträgen oder frei. Hier wird gestellt, an AbaNinja übergeben oder per Mail mit QR-Zahlteil gesendet, Zahlungen erfasst und gemahnt.

## Wer arbeitet hier {#wer}

- **Buchhaltung (Recht Finanzen)**: stellen, Zahlungen, Mahnungen, Abgleich mit AbaNinja, Firmenangaben.
- **Projektleitung**: sieht im Reiter **Zu verrechnen**, welche Tranche fällig ist, und legt Entwürfe an.
- **Geschäftsleitung**: Übersicht über Offenes und Überfälliges.

## So geht's {#so}

### Eine fällige Tranche verrechnen

1. Reiter **Zu verrechnen**. Oben stehen die **Tranchen aus dem Zahlungsplan**, fällige zuerst, darunter kostenpflichtige **Service-Rapporte**.
2. Bei der Zeile **Rechnung erstellen**. Der Entwurf übernimmt Kunde, Projekt, Betrag und Text.
3. Positionen prüfen, dann weiter wie unten «Eine Rechnung stellen und senden».

### Eine neue Rechnung von Hand

1. Reiter **Rechnungen**, **Neue Rechnung**, Kunde wählen.
2. **Vorlage** wählen: **Anzahlung (30 %)**, **Montage (60 %)**, **Schlussrechnung (Rest mit Nachträgen)**, **Gesamtbetrag (100 %)**, **Wartungsvertrag** oder **Freie Rechnung**.
3. **Entwurf anlegen**. Im Entwurf lassen sich Zeilen ändern und ergänzen.

### Eine Rechnung stellen und senden

1. Entwurf öffnen, **Stellen**. Erst jetzt bekommt sie die Nummer (R2026-001 …) und das Fälligkeitsdatum. Danach ist sie fest.
2. Normaler Weg: **An AbaNinja**. Die Rechnung liegt dort als Entwurf mit QR-Rechnung, versendet wird aus AbaNinja.
3. Rückfall: **Per Mail**. Das PDF mit QR-Zahlteil liegt mit der Mail im [Ausgangskorb](kapitel:outbox) und geht erst nach Freigabe raus.

### Eine Zahlung erfassen

1. Meistens nichts zu tun: **Abgleich AbaNinja** holt die Zahlungen und setzt den Stand.
2. Von Hand: Rechnung öffnen, **Zahlung erfassen**, Betrag und **Eingang am**.
3. Teilzahlung? Der Rest bleibt offen, Stand **Teilbezahlt**.

### Mahnen

1. Filter **Überfällig**, Rechnung öffnen, **Mahnen**.
2. Stufe und neue Frist prüfen, **Vorschau** ansehen, **… Mahnung setzen**.
3. Die Mahnung als PDF per Mail über den Ausgangskorb schicken.

### Eine Rechnung stornieren

1. Gestellte Rechnung öffnen, **Stornieren**, Grund angeben. Sie bleibt mit dem Grund sichtbar.
2. Ein Entwurf wird mit **Entwurf löschen** in den Papierkorb gelegt.

### Firmenangaben pflegen

1. Reiter **Firmen & Einstellungen**: Adresse, MWST-Nr., IBAN, Bank und Zahlungsfrist je Standort (Muri GmbH, Bulle Sàrl).
2. Dort auch **Mahnfrist (Tage)** und **Stundensatz Service** für Rechnungen aus dem Rapport.

## Stände {#staende}

- **Entwurf**: noch änderbar, ohne Nummer.
- **Gestellt**: Nummer und Fälligkeit stehen, Inhalt ist fest.
- **Teilbezahlt**: ein Teil ist bezahlt.
- **Bezahlt**: vollständig bezahlt. Die Tranche im Zahlungsplan gilt als bezahlt.
- **Storniert**: fällt weg, der Grund steht dabei.
- **Überfällig** und **1. bis 3. Mahnung** stehen zusätzlich als Hinweis.

## Läuft automatisch {#automatisch}

- Mit der Zahlung setzt das CRM den Zahlungsplan und den Fahrplan im [Projekt](kapitel:projects).
- Jahresrechnungen der [Wartungsverträge](kapitel:contracts) entstehen 30 Tage vorher als Entwurf.
- Die Anzahlungsrechnung kann direkt am [Werkvertrag](kapitel:workcontracts) entstehen.

## Regeln {#regeln}

- Nummer, Fälligkeit, Zahlungsstand, Mahnstufen und Storno setzt nur das CRM, nie von Hand.
- Eine gestellte Rechnung wird nicht geändert, sondern storniert und neu erstellt.
- Gesendet wird nur über AbaNinja oder den Ausgangskorb mit Freigabe.
- Firmenangaben und Einstellungen ändern nur Personen mit Recht Finanzen.

## Häufige Fragen {#fragen}

### Der Kunde hat bezahlt, die Rechnung ist trotzdem offen.

**Abgleich AbaNinja** ausführen. Kommt nichts, die Zahlung von Hand erfassen.

### Die IBAN wird nicht angenommen.

Die Prüfziffer stimmt nicht. IBAN Ziffer für Ziffer mit dem Bankauszug vergleichen.

### Wie komme ich zu einer Liste für den Treuhänder?

Filter setzen und **Liste exportieren** (CSV).

## Neu {#neu}

- 31.10.2026: Das Rechnungs-PDF wird auch für die Anzahlungsrechnung am Werkvertrag gebraucht.
- 31.10.2026: Suche und Detailfenster einheitlich wie in allen Bereichen.
- 22.10.2026: Rechnungen mit Zu verrechnen, Mahnen, Zahlungen und PDF mit QR-Zahlteil.
