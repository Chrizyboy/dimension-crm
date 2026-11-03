---
stand: 2026-11-03
rollen: buchhaltung, projektleitung, geschaeftsleitung
---

# Rechnungen

Rechnungen aus dem Zahlungsplan eines Projekts (Anzahlung, Montage, Schlussrechnung mit Nachträgen), aus Service-Rapporten, aus Wartungsverträgen oder frei. Hier wird gestellt, an AbaNinja übergeben oder per Mail mit QR-Zahlteil gesendet, Zahlungen erfasst und gemahnt.

## Wer arbeitet hier {#wer}

- **Buchhaltung (Recht Finanzen)**: stellen, Zahlungen, Mahnungen, Abgleich mit AbaNinja; Firmenangaben nur lesen.
- **Projektleitung**: sieht im Reiter **Zu verrechnen**, welche Tranche fällig ist, und legt Entwürfe an. Gibt das Erstvisum für Entwürfe ihrer Projekte.
- **Geschäftsleitung**: Übersicht über Offenes und Überfälliges.
- **Projektleitung und Verkauf**: sehen im Reiter **Meine Projekte** den Zahlungsstand ihrer Projekte (nur lesen). Die Projektleitung löst bei erreichtem Meilenstein **Verrechnen auslösen** aus und gibt das Erstvisum für Eingangsrechnungen.
- **Freigabe-Person Mahnlauf (Chris)**: gibt Erinnerungen und Mahnungen frei. Sonst geht nichts hinaus.

## So geht's {#so}

### Eine fällige Tranche verrechnen

1. Reiter **Zu verrechnen**. Oben stehen die **Tranchen aus dem Zahlungsplan**, fällige zuerst, darunter kostenpflichtige **Service-Rapporte**.
2. Bei der Zeile **Rechnung erstellen**. Der Entwurf übernimmt Kunde, Projekt, Betrag und Text.
3. Positionen prüfen, dann weiter wie unten «Eine Rechnung stellen und senden».

### Eine neue Rechnung von Hand

1. Reiter **Rechnungen**, **Neue Rechnung**, Kunde wählen.
2. **Vorlage** wählen: **Anzahlung (30 %)**, **Montage (60 %)**, **Schlussrechnung (Rest mit Nachträgen)**, **Gesamtbetrag (100 %)**, **Wartungsvertrag** oder **Freie Rechnung**.
3. **Entwurf anlegen**. Im Entwurf lassen sich Zeilen ändern und ergänzen.

### Das Erstvisum geben (Projektleitung)

1. Auf [Mein Tag](kapitel:today) die Karte **Rechnungen zum Visum** öffnen.
2. Rechnung anklicken: Positionen, Menge und Betrag prüfen.
3. Stimmt alles: **Erstvisum geben**. Sonst unter **Korrektur für die Buchhaltung** schreiben, was nicht stimmt, und **Korrektur melden**.
4. Die Buchhaltung bekommt eine Glocke und sieht im Entwurf, wer visiert hat.

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

### Verrechnen auslösen (Projektleitung)

1. Reiter **Meine Projekte**. Bei jeder Tranche steht, ob der Meilenstein erreicht ist.
2. Bei **Meilenstein erreicht** auf **Verrechnen auslösen** klicken. Erst jetzt entsteht der Entwurf.
3. Die Buchhaltung bekommt eine Glocke, prüft und stellt die Rechnung.

### Den Mahnlauf freigeben (montags)

1. Jeden Montag bereitet das CRM den Reiter **Mahnlauf** vor: Erinnerung, 1. bis 3. Mahnung oder übersprungen mit Grund (Mahnsperre, Zusage, schon im Ausgangskorb, Reklamation).
2. Die Freigabe-Person wählt die Zeilen (**Alle wählen**) und klickt **… freigeben**.
3. Mails gehen über den Ausgangskorb, für die Post öffnet sich das PDF zum Drucken.

### Eingangsrechnungen visieren

1. Reiter **Eingangsrechnungen**. Sie kommen mit dem **Abgleich AbaNinja** oder über **Rechnung erfassen**.
2. Die Projektleitung prüft gegen die Bestellung und klickt **Visum geben** oder **Ablehnen** mit Grund.
3. Ab CHF 5'000 oder ohne Bestellung braucht es zusätzlich das Visum der Geschäftsleitung. Danach steht sie auf **Zur Zahlung bereit**; bezahlt wird in AbaNinja.

### Rechnungsadresse, Mahnsperre, Zusage, Ausbuchen

1. Rechnung öffnen, **Angaben ändern**: abweichende Rechnungsadresse, Mail für Rechnungen, Referenz des Kunden, Versand.
2. Hat der Kunde in der [Kundenakte](kapitel:customers) eine Rechnungsadresse, Rechnungs-Mail oder Zahlungsfrist, übernimmt jede neue Rechnung sie automatisch.
3. **Mahnsperre** (mit Grund) oder **Zahlungszusage** halten den Mahnlauf an. **Ausbuchen** schliesst einen kleinen Rest (Rundung, Skonto, Kulanz, Verlust).

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

- Jeden Montag bereitet das CRM den Mahnlauf vor; hinaus geht er erst nach der Freigabe.
- Neue Rechnungen übernehmen Rechnungsadresse, Rechnungs-Mail und Zahlungsfrist des Kunden.

## Regeln {#regeln}

- Nummer, Fälligkeit, Zahlungsstand, Mahnstufen und Storno setzt nur das CRM, nie von Hand.
- Eine gestellte Rechnung wird nicht geändert, sondern storniert und neu erstellt.
- Gesendet wird nur über AbaNinja oder den Ausgangskorb mit Freigabe.
- Firmenangaben und Einstellungen ändert nur die Administration, auch unter Einstellungen › **Firmen & Bank**. Die Buchhaltung sieht sie zum Lesen.
- Erinnerungen und Mahnungen gibt nur die Freigabe-Person frei.
- Eingangsrechnungen: Erstvisum Projektleitung, Zweitvisum Geschäftsleitung ab CHF 5'000 oder ohne Bestellung.
- Verrechnen auslösen darf nur der zuständige Projektleiter, und erst wenn der Meilenstein erreicht ist.

## Häufige Fragen {#fragen}

### Der Kunde hat bezahlt, die Rechnung ist trotzdem offen.

**Abgleich AbaNinja** ausführen. Kommt nichts, die Zahlung von Hand erfassen.

### Die IBAN wird nicht angenommen.

Die Prüfziffer stimmt nicht. IBAN Ziffer für Ziffer mit dem Bankauszug vergleichen.

### Wie komme ich zu einer Liste für den Treuhänder?

Filter setzen und **Liste exportieren** (CSV).

## Neu {#neu}

- 03.11.2026: Rechnungsadresse, Rechnungs-Mail und Zahlungsfrist aus der Kundenakte gelten für neue Rechnungen.
- 03.11.2026: Übersicht, Mahnlauf mit Freigabe, Meine Projekte mit Verrechnen auslösen, Eingangsrechnungen mit Visum, Mahnsperre, Zusage und Ausbuchen.
- 03.11.2026: Von Hand erfasste Lieferantenrechnungen (noch nicht bezahlt) «In den Papierkorb», mit Rückfrage und «Rückgängig»; gestellte Rechnungen werden storniert. Zurückholen unter Papierkorb (Menü oben rechts).
- 03.11.2026: Erstvisum der Projektleitung vor dem Stellen.
- 03.11.2026: Firmenangaben und Einstellungen der Rechnungen ändert nur noch die Administration; auch unter Einstellungen › Firmen & Bank.
- 31.10.2026: Das Rechnungs-PDF wird auch für die Anzahlungsrechnung am Werkvertrag gebraucht.
- 31.10.2026: Suche und Detailfenster einheitlich wie in allen Bereichen.
- 22.10.2026: Rechnungen mit Zu verrechnen, Mahnen, Zahlungen und PDF mit QR-Zahlteil.
