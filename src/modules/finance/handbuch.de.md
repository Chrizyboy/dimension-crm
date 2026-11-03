---
stand: 2026-11-03
rollen: buchhaltung, geschaeftsleitung
---

# Finanzen

Finanzen für Geschäftsleitung und Buchhaltung: was auf den Konten ist, wer uns und wem wir schulden, welche Lieferantenrechnungen zur Zahlung bereit sind, der Zahllauf mit zweiter Person, die Liquidität Woche für Woche, die Marge der Projekte sowie Konten, MWST und Monatsabschluss. Oben wählst du **Dimension Solaire GmbH**, **Dimension Solaire Sàrl** oder **Beide**. Nur mit Recht **Finanzen** sichtbar.

## Wer arbeitet hier {#wer}

- **Buchhaltung**: Lieferantenrechnungen freigeben, Zahllauf vorbereiten, Kontoauszug einlesen, MWST eintragen, Monat abschliessen.
- **Geschäftsleitung**: Cockpit, Zahllauf freigeben, Projekte & Marge.

## So geht's {#so}

### Den Tag beginnen

1. Reiter **Cockpit**: oben Geld auf den Konten, tiefster Stand, was Kunden uns und was wir Lieferanten schulden, nächste MWST.
2. **Heute zu tun** zeigt Skonto, drohende Betreibungen, Freigaben, wartende Zahlläufe, alte Kontostände und fällige MWST. **Öffnen** springt in den richtigen Reiter.
3. **Kundenrechnungen nach Alter** zeigt, was überfällig ist. Gemahnt wird unter [Rechnungen](kapitel:invoices).

### Lieferantenrechnungen prüfen

1. Reiter **Lieferantenrechnungen**, Filter **Zur Freigabe**.
2. Auf den Namen klicken: die Akte zeigt Betrag, Skonto, IBAN und den Vergleich mit der Bestellung.
3. **Freigeben**, **Zu klären** oder **Zurückhalten** (die letzten beiden mit Grund). Rechnungen mit Visum aus den Eingangsrechnungen sind schon **Zahlbereit**.

### Einen Zahllauf machen

1. Reiter **Zahllauf**, **Zahllauf vorbereiten**: Gesellschaft, **Belastetes Konto** und **Ausführen am** wählen.
2. Das CRM schlägt zahlbereite Rechnungen vor, Betreibung und Skonto zuerst. Unten stehen Summe, **Kontostand danach** und **Skonto gespart**.
3. **… zur Freigabe geben**. Eine zweite Person aus der Geschäftsleitung bekommt eine Glocke und klickt **Freigeben**.
4. Zahlungen in AbaNinja oder im E-Banking auslösen, dann **Im E-Banking ausgeführt**.

### Kontoauszug einlesen

1. Im E-Banking den Auszug als camt.053 (XML) herunterladen.
2. Reiter **Konten, MWST & Abschluss**, **Kontoauszug einlesen**, Datei wählen.
3. Das CRM findet das Konto über die IBAN, übernimmt neue Buchungen und erkennt Zahlungen aus einem freigegebenen Zahllauf als bezahlt.

### Den Monat abschliessen

1. Unter **Monatsabschluss** den Monat wählen.
2. Die Liste zeigt, was noch offen ist: Kontostände, Zuordnung, Gesellschaft, Freigaben, Spesen, Tranchen, Arbeitszeiten.
3. **Monat abschliessen**, auch mit offenen Punkten (sie werden mitgespeichert). **Offene Posten (CSV)** für den Treuhänder.

## Stände {#staende}

- Lieferantenrechnung: **Zur Freigabe**, **Zahlbereit**, **Zu klären**, **Zurückgehalten**, im Zahllauf, bezahlt.
- Zahllauf: **Zur Freigabe**, **Freigegeben**, **Ausgeführt**, **Verworfen**.
- MWST: **Schätzung**, **AbaNinja** (verbindlich eingetragen), **Bezahlt**.

## Läuft automatisch {#automatisch}

- Neue Lieferantenrechnungen aus AbaNinja kommen mit Gesellschaft (aus dem Projekt) und passender Bestellung herein.
- Ist eine Eingangsrechnung visiert, wird die Zahlung hier zahlbereit.
- Die MWST wird je Quartal aus Rechnungen und Lieferantenrechnungen geschätzt und fliesst in die Liquidität.
- Marge je Produkt und angefangene Arbeiten rechnet das CRM aus allen Projekten.

## Regeln {#regeln}

- Wer einen Zahllauf vorbereitet, darf ihn nicht selbst freigeben.
- Die App löst keine Zahlung aus; bezahlt wird in AbaNinja oder im E-Banking.
- Buchhaltung, Lohn und MWST-Abrechnung bleiben in AbaNinja. Nichts wird gelöscht.

## Häufige Fragen {#fragen}

### Das Cockpit zeigt einen viel zu tiefen Stand.

Meist ist ein Kontostand alt. Kontoauszug einlesen oder beim Konto den Stand eintragen.

### Ich will die Löhne nicht am Bildschirm zeigen.

Oben **Löhne verbergen**. Die Summe bleibt in der Rechnung, nur die Zeilen sind ausgeblendet.

## Neu {#neu}

- 03.11.2026: Neu aufgebaut: Cockpit, Lieferantenrechnungen mit Freigabe, Zahllauf mit zweiter Person, Konten mit Kontoauszug, MWST-Schätzung, Projekte & Marge, Monatsabschluss, Wahl der Gesellschaft.
- 03.11.2026: Zahlungen: mehrere Kategorien zugleich anklicken; **Aus Excel, ungeprüft** schränkt zusätzlich ein.
- 26.10.2026: Spalten am Handy zusammengelegt, Namen zweizeilig.
- 22.10.2026: Finanzen mit Liquidität Woche für Woche, Zahllauf und Nachkalkulation.
