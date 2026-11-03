---
stand: 2026-11-03
rollen: administration
---

# Einstellungen

Hier richtet die Administration das CRM ein: Personen und Rollen, wer neue Leads und Offerten bekommt, die Verbindungen zu Microsoft 365, AbaNinja und SMS, die Dateiablage in SharePoint, die Datensicherung und den Betrieb. Das eigene Konto (Angaben, Microsoft, Unterschrift) hat jede Person unter [Mein Konto](/konto).

## Wer arbeitet hier {#wer}

- **Administration**: alle Reiter, ändert alles.
- **Geschäftsleitung**: sieht alle Reiter, ändert nichts.
- **Alle**: [Mein Konto](/konto) über das Bild oben rechts.

## So geht's {#so}

### Eine neue Person einladen

1. Reiter **Personen**, **Person einladen**.
2. Name, E-Mail, **Rolle** und **Standort** eintragen, **Einladung senden**. Die Person meldet sich mit Microsoft oder einem Code per Mail an.
3. Kam nichts an: in der Zeile **Einladung nochmals senden**.

### Eine Person ohne Firmen-Mail aufnehmen (Link fürs Handy)

1. **Person einladen**, Name eintragen und **Ohne Mail: Link fürs Handy** einschalten.
2. **Rolle** und **Standort** wählen, **Registrier-Link erstellen**.
3. **Link kopieren** oder **Per WhatsApp** schicken. Die Person öffnet den Link am Handy, gibt ihre private Mail ein und meldet sich mit dem Code an.
4. Der Link gilt 14 Tage und nur einmal. Für einen neuen Link die Person öffnen, **Registrier-Link erstellen**.

### Rechte und sichtbare Bereiche festlegen

1. Reiter **Rollen**: je Rolle die **Rechte der Rolle** und die sichtbaren Bereiche.
2. Bei der Person unter **Zusätze**: **Zusatz Geschäftsleitung** (sieht alles inkl. Finanzen) und **Zusatz Administration** (richtet das System ein, sieht keine Finanzen und keine fremden Personal-Akten).
3. Für eine einzelne Person: Person öffnen, **Eigene Auswahl für diese Person**.
4. **Einfache Ansicht (nur Arbeitszeit und Spesen)** bei der Rolle: nur Arbeitszeit, Spesen und Plan. Die Montage arbeitet mit der normalen Ansicht, damit sie Rapporte, Service und Fahrzeuge erreicht.

### Zuständigkeiten einstellen

1. Reiter **Zuständigkeiten**.
2. Unter **Verkauf: neue Leads** Regeln nach **Sprache**, **Standort**, **Region** und **Produkt** mit **Regel hinzufügen**. Heute: Französisch an Filipe, Deutsch an Loris.
3. **Offerten erstellen**: wer neue Offerten bekommt (heute Andy).
4. **Stellvertretung bei Abwesenheit** je Person.

### Verbindungen prüfen

1. Reiter **Verbindungen**: Microsoft 365, AbaNinja und SMS mit **Eingerichtet** oder **Nicht eingerichtet**.
2. **Jetzt testen** prüft die Verbindung. **Wer ist mit Microsoft verbunden?** zeigt das Team.
3. Darunter **Hintergrund-Jobs** und **Letzte Aufrufe**, dazu die **Dateiablage in SharePoint** (Pfade und Ordner).

### Eine Datensicherung herunterladen oder zurückspielen

1. Reiter **Datensicherung**: automatisch um 12:00 und 16:00, zusätzlich **Jetzt sichern**.
2. **Herunterladen** gibt die Sicherung als Datei.
3. **Wiederherstellen** setzt auf diesen Stand zurück. Vorher sichert das CRM den heutigen Stand; was seither neu ist, kommt in den Papierkorb.

### Prüfen, ob alles bereit ist

1. Reiter **Betrieb**: **Bereit für das Team?** zeigt jeden Punkt grün, gelb oder rot mit dem nächsten Schritt.

### Das eigene Konto pflegen

1. [Mein Konto](/konto): Telefon, Arbeitstage, Startpunkt für Touren, Notfallkontakt.
2. **Mit Microsoft verbinden**, damit Mails aus dem eigenen Postfach gehen und Termine im eigenen Kalender landen.
3. **Meine Unterschrift**: **Zeichnen** oder Bild hochladen, für Werkverträge.

## Stände {#staende}

- Person: **Aktiv** oder eingeladen, mit **Zuletzt aktiv**.
- Verbindung: **Eingerichtet** / **Nicht eingerichtet**, letzter Test erfolgreich oder fehlgeschlagen.
- Betrieb: grün = bereit, gelb = sollte noch erledigt werden, rot = fehlt.

## Läuft automatisch {#automatisch}

- Neue Leads und Offerten teilt die Datenbank nach den Zuständigkeiten zu, nicht die App.
- Die Datensicherung läuft auf dem Server, auch wenn niemand angemeldet ist, und legt eine Kopie in SharePoint.
- Updates der Windows-App kommen von selbst; die Version steht in Mein Konto unter «Diese App».

## Regeln {#regeln}

- Nur die Administration sieht diesen Bereich.
- API-Schlüssel stehen nie im CRM, sondern als Geheimnis auf dem Server.
- Anmelden kann sich nur, wer als Person erfasst ist.
- Personen werden nicht gelöscht, sondern deaktiviert.

## Häufige Fragen {#fragen}

### Jemand sieht einen Bereich nicht.

Die Rolle oder die eigene Auswahl der Person zeigt ihn nicht. Unter **Rollen** oder bei der Person ergänzen.

### Die Verbindung zu Microsoft zeigt einen Fehler.

Die Person verbindet sich in Mein Konto mit **Neu verbinden**. Hilft das nicht, unter **Verbindungen** die **Letzte Aufrufe** ansehen.

## Neu {#neu}

- 03.11.2026: Zusätze Geschäftsleitung und Administration, Link fürs Handy für Personen ohne Firmen-Mail.
- 31.10.2026: Reiter Zuständigkeiten für Leads, Offerten und Stellvertretung.
- 31.10.2026: Dateiablage in SharePoint unter Verbindungen; eigene Unterschrift in Mein Konto.
- 31.10.2026: Rolle Monteur mit einfacher Ansicht.
- 26.10.2026: Datensicherung, Betrieb und automatische Updates der Windows-App.
