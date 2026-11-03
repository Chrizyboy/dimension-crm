---
stand: 2026-11-02
rollen: innendienst, verkauf, geschaeftsleitung
---

# Offerten

Hier wird aus einem Lead eine Offerte: der Innendienst arbeitet sie aus, der Aussendienst prüft, der Kunde erhält sie, und danach wird nachgefasst, bis er zu- oder absagt. Bei Zusage geht es mit **Auftrag erstellen** zum Werkvertrag. Geplant wird in Eturnity, die Werte kommen per PDF ins CRM.

## Wer arbeitet hier {#wer}

- **Innendienst**: arbeitet neue Offerten aus (Standard Andy, Chris unterstützt).
- **Verkauf**: prüft, fasst nach und hält den Entscheid fest.
- **Geschäftsleitung**: Übersicht Muri und Bulle.

## So geht's {#so}

### Den Arbeitsvorrat lesen

1. **Offerten** öffnet mit dem **Arbeitsvorrat**: jede Offerte als Karte in ihrer Phase, von «Zu offerieren» bis «Gewonnen».
2. Rote und orange Hinweise zuerst: überfällig (Termin länger als 5 Arbeitstage her), Nachfassen fällig, Freigabe nötig, Rückfrage.
3. Karte anklicken: die Offerte öffnet als ganze Seite mit Schritten, Varianten, Unterlagen und dem nächsten Schritt.

### Eine neue Offerte ausarbeiten

1. Reiter **Neue Offerten** öffnen. Dort stehen alle Leads mit Stand «Offerte in Arbeit».
2. Zeile anklicken und **Bearbeiten** wählen. Die anderen sehen jetzt «In Bearbeitung von …».
3. Anlage in Eturnity planen und das PDF unter **PDF der Offerte** hineinziehen. Datum, Betrag, kWp und Batterie füllen sich selbst.
4. Fehlt eine Angabe vom Aussendienst: **Rückfrage** mit der Frage unter **Was fehlt noch?**.
5. Fertig: **Zur Prüfung** an den Aussendienst.

### Die Offerte senden

1. Nach dem Okay die Offerte öffnen und **Per Mail senden** wählen. Der Text ist in der Sprache des Kunden.
2. Die Mail liegt im [Ausgangskorb](kapitel:outbox) und geht nach deiner Freigabe raus.
3. Wurde sie anders verschickt (Post, persönlich): **Versendet** setzen.

### Nachfassen

1. Reiter **Nachfassen** oder Karte mit «Nachfassen fällig»: oben steht, was heute fällig ist.
2. Kunde anrufen. Nicht erreicht: **Nicht erreicht**, in 2 Arbeitstagen kommt die Offerte wieder.
3. Erreicht: **Ergebnis** wählen (vergleicht, interessiert, neue Version, später, Ja, Nein). Das nächste Nachfassen setzt das CRM nach Plan (Tag 3, 10, 21, 30 nach dem Senden). Bei **Ja** geht es direkt zum Werkvertrag.
4. Mit **Mit KI schreiben** entsteht bei Bedarf eine Nachfass-Mail, die du prüfst und freigibst.

### Den Entscheid festhalten

1. Offerte öffnen, **Entscheid**.
2. **Gewonnen**: weiter mit **Auftrag erstellen** im Kapitel [Werkverträge](kapitel:workcontracts).
3. **Verloren**: Grund der Absage wählen. **Vertagt**: Grund und neues Datum.

### Eine überarbeitete Version erfassen

1. Offerte öffnen, **Neue Version**, neues PDF hineinziehen und kurz notieren, was geändert wurde.
2. Alle Versionen bleiben unter **Versionen** sichtbar.

### Eturnity-Meldungen zuordnen

1. Reiter **PDF-Import**: PDFs und Meldungen aus Eturnity, die noch keiner Offerte zugeordnet sind.
2. Offerte wählen und zuordnen.

## Stände {#staende}

- **Neu**: zur Offerte freigegeben, noch niemand dran.
- **In Bearbeitung**: jemand im Innendienst arbeitet daran.
- **Rückfrage**: es fehlt eine Angabe vom Aussendienst.
- **Zur Prüfung**: fertig, der Aussendienst schaut drüber.
- **Offeriert**: beim Kunden. Die Offerte wandert nach Muri bzw. Bulle, das erste Nachfassen ist 3 Tage nach dem Senden.

## Läuft automatisch {#automatisch}

- Wer die Offerte bekommt, regelt Einstellungen › Zuständigkeiten.
- Der Ordner in SharePoint wird angelegt und bei Zusage oder Absage verschoben.
- Fällige Nachfass-Termine erscheinen auf Mein Tag.

## Regeln {#regeln}

- Ab 5 % Rabatt oder unter 18 % Marge braucht die Offerte vor dem Senden eine **Freigabe** (Chris oder Administration).
- Eine Offerte kann mehrere **Varianten** haben (z. B. mit und ohne Batterie). Die gewählte Variante bestimmt den Betrag.
- Die **Chance** rechnet das CRM aus der Phase; von Hand überschreiben geht, leer setzt sie wieder auf automatisch.

- Der Betrag der Offerte ist **exkl. MWST**. Werkvertrag und Vertragswert sind inkl.
- Einkaufspreise, Marge und Kalkulation sieht nur, wer das Recht **Preise** hat.

## Häufige Fragen {#fragen}

### Das Eturnity-PDF füllt nichts aus.

Nur PDFs aus Eturnity werden gelesen. Bei anderen PDFs die Werte von Hand eintragen.

### Wie komme ich zur Kalkulation?

In der Offerte **Kalkulation** wählen. Sie öffnet sich im Kapitel [Preise](kapitel:pricing).

## Neu {#neu}

- 03.11.2026: Arbeitsvorrat als Startansicht, Offerte als ganze Seite, Nachfassen mit Ergebnis nach Plan, Varianten, Freigabe und Chance.

- 31.10.2026: Offerten-Ordner in SharePoint werden selbst angelegt und verschoben.
