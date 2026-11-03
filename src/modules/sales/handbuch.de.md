---
stand: 2026-11-03
rollen: verkauf, geschaeftsleitung
---

# Anfragen & Leads

Vom ersten Kontakt bis zur Zusage: Leads erfassen und anrufen, Termine vereinbaren und planen, nachfassen und zur Offerte weitergeben. Dazu Tagesroute, Tour, Kalender, Regionen und der Monatsbericht für die Lead-Anbieter.

## Wer arbeitet hier {#wer}

- **Verkauf**: Filipe alles Französischsprachige, Loris alles Deutschsprachige (Standard aus Einstellungen › Zuständigkeiten, pro Lead änderbar).
- **Innendienst**: übernimmt Leads mit Stand «Zur Offerte» im Kapitel [Offerten](kapitel:quotes).
- **Geschäftsleitung**: sieht alle Leads und die Pipeline.

## So geht's {#so}

### Einen neuen Lead erfassen

1. **Neu** (oder Taste **N**), Name, Telefon, Adresse mit PLZ, Sprache und Quelle eintragen.
2. Gibt es die Person schon, schlägt das CRM den bestehenden Kontakt vor: diesen nehmen, damit keine Doppelten entstehen.
3. **Speichern**. Ort, Region und Lage kommen von selbst aus der PLZ; die zuständige Person teilt die Datenbank zu.

### Einen Lead anrufen und den Kontakt erfassen

1. Lead öffnen, **Kontakt erfassen**.
2. Ergebnis wählen: erreicht, nicht erreicht, Rückruf vereinbart, kein Interesse (mit Grund).
3. Bei «später» ein Datum unter **Wann wieder melden** setzen. Der Lead kommt dann als Wiedervorlage auf [Mein Tag](kapitel:today).

### Einen Termin vereinbaren

1. Lead öffnen, **Termin vereinbaren**, Datum, Uhrzeit, Dauer und Person wählen.
2. Der Termin erscheint im Kalender, auf der Tagesroute und, mit Microsoft-Verbindung, in Outlook.
3. **Terminblatt** druckt alle Angaben für unterwegs.

### Nach der Besichtigung zur Offerte geben

1. Lead öffnen, Abschnitt **Besichtigung**: Dachfläche, Ausrichtung, Neigung, Dachmaterial, Hausanschluss, Verbrauch und Besonderheiten eintragen.
2. Stand auf **Offerte in Arbeit** setzen. Der Lead erscheint beim Innendienst unter «Neue Offerten».
3. Ohne Besichtigung geht **Richtofferte**: der Innendienst offeriert nach Angaben am Telefon.

### Mehrere Leads auf einmal ändern

1. In **Leads** die Kästchen der Zeilen anklicken.
2. Unten Stand, Person oder Region für alle gewählten setzen.

### Den Tag oder eine Tour planen

1. **Tagesroute**: Tag wählen, Start (Zuhause oder andere Adresse). Das CRM ordnet die Termine und zeigt Fahrzeiten.
2. **Tour planen**: Leads ohne Termin in einer Gegend wählen oder Adressen einfügen, das CRM schlägt die Reihenfolge vor.
3. **Kalender**: freie Zeiten sind grün, ein Klick plant einen Lead ein; Termine lassen sich ziehen.

### Erinnerungs-SMS für morgen

1. **SMS für morgen**: alle Termine von morgen mit Text in der Sprache des Kunden.
2. Prüfen und **Senden**. Die SMS geht über den [Ausgangskorb](kapitel:outbox), jeder Termin bekommt höchstens eine.

### Monatsbericht an den Lead-Anbieter

1. **Monatsbericht**, Monat wählen.
2. Pro Quelle steht, was aus jedem Lead wurde. **Bericht an den Anbieter** erstellt den Text dazu.

## Stände {#staende}

- **Lead neu**: noch kein Kontakt.
- **Lead offen**: Kontakt war, es geht weiter.
- **Später kontaktieren**: mit Datum, kommt als Wiedervorlage zurück.
- **Termin vereinbart**: Besichtigung steht.
- **Termin gehabt – wie weiter?**: nach dem Termin entscheiden.
- **Offerte in Arbeit / Offerte zur Prüfung**: beim Innendienst.
- **Offeriert / Nachfassen fällig / Entscheid vertagt**: beim Kunden.
- **Angenommen – Bau planen**, **In Bau**, **Verbaut**, **Dossier abgeschlossen**: weiter im Kapitel [Projekte & Montage](kapitel:projects).
- **Verloren** und **Kein Interesse**: immer mit Grund.

## Läuft automatisch {#automatisch}

- Wer einen neuen Lead bekommt, regeln die Zuständigkeiten (Sprache, Standort, Region, Produkt). Bei Abwesenheit geht er an die Vertretung.
- Anfragen von der Website und aus dem Posteingang werden selbst zu Leads.
- Stände nach der Offerte (Offeriert, Nachfassen fällig, Angenommen, In Bau) setzt das CRM selbst. Von Hand geht das nicht.

## Regeln {#regeln}

- «Verloren» und «Kein Interesse» brauchen einen Grund, «Später» ein Datum in der Zukunft.
- Personen mit **Keine Werbung** bekommen keine Serien-Mails und keinen Newsletter.

## Häufige Fragen {#fragen}

### Warum kann ich den Stand nicht auf «Offeriert» ziehen?

Diesen Stand setzt das CRM, sobald die Offerte versendet ist. So stimmt die Pipeline immer mit den Offerten überein.

### Die Karte ist grau.

Die Karte kommt von swisstopo. Ist sie gesperrt oder offline, bleibt sie grau; Route und Lage funktionieren trotzdem.

### Wie speichere ich meine Filter?

Person, Quelle, Region und Spalten merkt sich das CRM für dich von selbst. Für mehrere feste Ansichten: **Gespeicherte Ansichten**, **Aktuelle Ansicht speichern**. Mit **Für das ganze Team sichtbar** sehen sie alle.

## Neu {#neu}

- 03.11.2026: Person, Quelle und Region mit Häkchen (mehrere, **nur**, «Alle ausser …»); Knopf **Spalten** blendet Spalten der Pipeline ein und aus (ersetzt «Abgeschlossene zeigen»). Die Auswahl bleibt gemerkt.
- 01.11.2026: Lead direkt aus einer Mail im Posteingang anlegen.
- 31.10.2026: Neue Leads und Offerten verteilt das CRM nach Einstellungen › Zuständigkeiten.
