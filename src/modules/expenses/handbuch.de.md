---
stand: 2026-11-03
rollen: verkauf, innendienst, projektleitung, montage, buchhaltung
---

# Spesen

Spesen mit Foto oder PDF des Belegs erfassen, am Handy direkt mit der Kamera. Jede Person sieht ihre eigenen Spesen; die Buchhaltung sieht alle, zahlt aus und schickt sie mit Belegen an die Buchhaltung.

## Wer arbeitet hier {#wer}

- **Alle**: eigene Spesen erfassen und bei Bedarf stornieren.
- **Buchhaltung (Recht Finanzen)**: alle Spesen, auszahlen, an die Buchhaltung schicken; Kategorien nur lesen.

## So geht's {#so}

### Eine Spese erfassen

1. **Spese erfassen** (in der Monteur-Ansicht direkt auf der Startseite).
2. **Foto** des Belegs machen oder **Datei wählen**.
3. **Mit KI lesen** füllt Datum, Betrag und Zweck aus dem Beleg. Werte prüfen; bei Fremdwährung rechnet das CRM in CHF um.
4. **Kategorie wählen**, Zweck kurz beschreiben (zum Beispiel «Parkhaus Kundentermin Freiburg»), **Speichern**.

### Eine falsche Spese zurücknehmen

1. Bei der Zeile **Stornieren**, Grund angeben.
2. Die Spese bleibt mit dem Grund sichtbar, wird aber nicht ausbezahlt.

### Spesen auszahlen (Buchhaltung)

1. Ansicht **Alle Spesen**, Filter **Offen**. **Offen je Person** zeigt die Summe pro Person.
2. Zeilen wählen oder **Alle offenen wählen**.
3. **… an die Buchhaltung**: Mail mit Liste und Belegen liegt im [Ausgangskorb](kapitel:outbox).
4. Nach der Überweisung **… ausbezahlt**, **Ausbezahlt am** setzen.

### Kategorien pflegen (Administration)

1. Ansicht **Kategorien**: Namen auf Deutsch und Französisch, dazu die **Mail-Adresse der Buchhaltung**.

## Stände {#staende}

- **Offen**: erfasst, noch nicht ausbezahlt.
- **Ausbezahlt**: mit Datum, nicht mehr änderbar.
- **Storniert**: mit Grund, nicht mehr änderbar.

## Läuft automatisch {#automatisch}

- Fotos werden vor dem Hochladen verkleinert, damit es auch auf der Baustelle schnell geht.
- Offene Spesen stehen als Summe auf [Mein Tag](kapitel:today).

## Regeln {#regeln}

- Jede Person sieht nur ihre eigenen Spesen, die Buchhaltung alle.
- Storno statt Löschen. Ausbezahlt setzt nur die Buchhaltung.
- Die KI schlägt nur vor; gespeichert wird, was im Fenster steht.

## Häufige Fragen {#fragen}

### Ich habe keinen Beleg mehr.

Trotzdem erfassen und im Zweck notieren. Die Zeile steht dann mit **Ohne Beleg**.

### Ich habe eine Spese doppelt erfasst.

Eine davon **Stornieren**, Grund «doppelt».

## Neu {#neu}

- 03.11.2026: Kategorien und Regeln ändert nur noch die Administration; auch unter Einstellungen › Spesen-Kategorien.
- 31.10.2026: Spesen per Klick in der Monteur-Ansicht.
- 23.10.2026: Beleg mit KI lesen.
- 22.10.2026: Spesen mit Beleg, Meine und Alle, ausbezahlt, Storno, Mail an die Buchhaltung.
