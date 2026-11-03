---
stand: 2026-11-02
rollen: administration
---

# Automationen

Wenn etwas passiert, erledigt das CRM die nächsten Schritte: Aufgaben, Meldungen, Entwürfe. Jede Automation folgt dem Muster **Wenn** (Auslöser) → **Nur wenn** (Bedingungen) → **Dann** (Aktionen der Reihe nach). Im **Protokoll** steht jeder Lauf mit allen Schritten.

## Wer arbeitet hier {#wer}

- **Administration**: legt Automationen an, schaltet sie ein und aus, schaut ins Protokoll.
- **Alle anderen** merken es an Aufgaben, der Glocke und Entwürfen im [Ausgangskorb](kapitel:outbox).

## So geht's {#so}

### Eine Automation anlegen

1. **Neue Automation**, Name und Beschreibung auf Deutsch und Französisch.
2. Unter **Wenn** den **Auslöser** wählen, zum Beispiel **Neuer Lead**, **Offerte gesendet**, **Rechnung überfällig**, **Wartung fällig** oder **Jeden Monat**.
3. Unter **Nur wenn** mit **Bedingung hinzufügen** eingrenzen, zum Beispiel «Standort (MU/BU) ist BU». Ohne Bedingung läuft sie bei jedem Ereignis.
4. Unter **Dann** mit **Aktion hinzufügen** die Schritte setzen: **Aufgabe erstellen**, **Benachrichtigen**, **Warten**, **Prüfen, ob noch nötig**, **Mail an den Kunden**, **SMS an den Kunden**, **Rechnungsentwurf**, **Zahlungserinnerung** und weitere. Reihenfolge mit **Nach oben** / **Nach unten**.
5. Bei Mail und SMS kann **KI schreibt den Text** eingeschaltet werden: Stil der Firma, Sprache des Kunden.
6. Speichern und einschalten.

### Eine Vorlage nutzen

1. In der Liste stehen elf Vorlagen (zum Beispiel neuer Lead → Aufgabe Erstkontakt). Öffnen, anpassen, einschalten.

### Im Protokoll nachsehen

1. Ansicht **Protokoll**, Filter **Offen**, **Fertig**, **Übersprungen** oder **Fehler**.
2. Lauf öffnen: jeder Schritt mit Ergebnis. **Datensatz öffnen** springt zum Lead, zur Offerte oder Rechnung.
3. Wartet ein Lauf und ist nicht mehr nötig: **Lauf beenden**.

### Einstellungen

1. Ansicht **Einstellungen**: **Termine zurückschauen (Tage)**, **Wartung: Vorlauf (Tage)**, **Rechnung: Karenzfrist (Tage)** und der **Link für Bewertungen** (Platzhalter `{Bewertungslink}`).

## Stände {#staende}

- Automation: eingeschaltet oder **Ausgeschaltet**; Versand **Mit Freigabe** oder **Automatisch**.
- Lauf: **Läuft**, **Wartet**, **Auf dem Server**, **Fertig**, **Übersprungen**, **Fehler**, **Abgebrochen**.

## Läuft automatisch {#automatisch}

- Der Motor läuft auf dem Server jede Minute, auch wenn niemand das CRM offen hat.
- Nur Neues löst aus: was vor dem Einschalten passiert ist oder aus der Übernahme stammt, zählt nicht.
- Aufgaben erscheinen unter [Aufgaben](kapitel:tasks) und auf [Mein Tag](kapitel:today).

## Regeln {#regeln}

- Mails, SMS und Mahnungen gehen nie von selbst hinaus: Sie landen als Entwurf im Ausgangskorb und warten auf einen Klick. Nur wer eine Automation ausdrücklich auf **Automatisch** stellt, verzichtet darauf.
- Nur die Administration sieht und ändert Automationen.
- Gelöschte Automationen kommen in den Papierkorb.

## Häufige Fragen {#fragen}

### Die Automation hat nicht ausgelöst.

Im **Protokoll** nachsehen. Steht nichts da, passte die Bedingung nicht oder das Ereignis war vor dem Einschalten. **Übersprungen** heisst: **Prüfen, ob noch nötig** hat festgestellt, dass es nichts mehr zu tun gibt.

### Ich brauche einen Auslöser, den es nicht gibt.

Neue Auslöser baut die Entwicklung in der Datenbank. Über **Fehler melden** im [Handbuch](kapitel:knowledge) beschreiben, was passieren soll.

## Neu {#neu}

- 24.10.2026: Fehler in der Liste mit «Nochmals versuchen» und «Fehler melden».
- 23.10.2026: KI schreibt Mail- und SMS-Texte in der Sprache des Kunden.
- 23.10.2026: Automationen mit Protokoll; Aufgaben und Glocke kommen vom Server.
