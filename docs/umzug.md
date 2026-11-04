# Umzug in die Cloud

So kommt das CRM vom Test auf dem eigenen PC in den echten Betrieb für das ganze Team. Was schon erledigt ist,
zeigt das CRM selbst unter **Einstellungen › Betrieb** (grün = erledigt, gelb = offen, rot = fehlt).

Schlüssel und Passwörter trägst du immer selbst ein: im Supabase-Dashboard, bei GitHub oder im eigenen
Terminal. Nie in einen Chat, eine Mail oder eine Datei im Projekt.

## Überblick

| Schritt | Was                                            | Wer    | Dauer   |
| ------- | ---------------------------------------------- | ------ | ------- |
| 1       | Supabase-Projekt in Europa anlegen             | Chris  | 10 Min. |
| 2       | Datenbank und Server-Funktionen hochladen      | Skript | 10 Min. |
| 3       | Secrets setzen                                 | Chris  | 20 Min. |
| 4       | Zeitplan einschalten (Tresor)                  | Chris  | 5 Min.  |
| 5       | Probe-Umzug der Daten, prüfen                  | Skript | 15 Min. |
| 6       | Anmeldung, Microsoft, AbaNinja, SMS            | Chris  | 1 Std.  |
| 7       | App veröffentlichen (docs/installation.md)     | Chris  | 30 Min. |
| 8       | Stichtag: letzter Export, Umzug, Team legt los | alle   | ½ Tag   |

## 1. Projekt anlegen

1. [supabase.com](https://supabase.com) › **New project**. Organisation «Dimension Solaire».
2. Name `dimension-crm`, **Region: Central EU (Frankfurt)** oder **Zurich**, falls angeboten. Ein starkes
   Datenbank-Passwort erzeugen und im Passwort-Manager speichern.
3. **Plan Pro** (USD 25 pro Monat). Der Gratis-Plan pausiert das Projekt nach einer Woche ohne Nutzung und hat
   keine täglichen Sicherungen von Supabase. Unsere eigene Datensicherung (12:00 und 16:00, Kopie in
   SharePoint) kommt zusätzlich dazu.
4. Auf dem PC im Projektordner:
   ```bash
   npx supabase login
   npx supabase link        # das neue Projekt wählen, Datenbank-Passwort eingeben
   npm run umzug -- pruefen
   ```

## 2. Datenbank und Server-Funktionen

```bash
npm run umzug -- datenbank     # legt alle Tabellen, Regeln und Funktionen an (fragt einmal nach)
npm run umzug -- funktionen    # lädt die Server-Funktionen hoch
```

Danach im Dashboard › **Authentication › Hooks › Before User Created** die Funktion
`intern.vor_konto_anlage` wählen. Ohne diesen Hook könnte sich jede Adresse anmelden.

## 3. Secrets

Dashboard › **Edge Functions › Secrets** (oder `npx supabase secrets set NAME=wert` im eigenen Terminal).

Pflicht:

| Name                    | Wert                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| `ZEITPLAN_SCHLUESSEL`   | Zufallswert, z. B. aus dem Passwort-Manager (48 Zeichen)                |
| `VERBINDUNG_SCHLUESSEL` | Zufallswert, 32 Bytes Base64 (`openssl rand -base64 32`)                |
| `APP_URL`               | Adresse der Web-App, z. B. `https://chrizyboy.github.io/dimension-crm/` |

Die Dienste (Microsoft, AbaNinja, SMS, KI, Social Media) kommen in Schritt 6. `npm run umzug -- pruefen`
zeigt, was noch fehlt, und warnt, falls versehentlich eine Test-Adresse (`…_URL`) gesetzt ist.

## 4. Zeitplan einschalten

```bash
npm run umzug -- tresor
```

zeigt die zwei Einträge für Dashboard › **Integrations › Vault**. Danach laufen Senden, Abgleich und
Datensicherung jede Minute. Kontrolle: Einstellungen › Betrieb › «Zeitplan» wird grün.

## 5. Daten übernehmen (Probe)

1. Im bisherigen CRM (V233) den Export «Für Web-App» machen (ZIP).
2. Aus den Projektdateien (Library, Ordner `datenabgleich`) zwei Dateien in einen eigenen Ordner ausserhalb des
   Repos legen, z. B. `C:\Umzug\`: `sharepoint-adjudications.json` (Ordnerliste aus SharePoint: gewonnen ist nur,
   was in Adjudications liegt) und `korrekturen.json` (vertauschte Nummern, Aufträge nur in SharePoint,
   Vertragsdaten). Beide enthalten Kundennamen: nie ins Repo oder weitergeben. Ohne sie bricht der Schritt ab.
3. Im eigenen Terminal, nur für diesen Aufruf (Werte aus Dashboard › **Project Settings › API**):
   ```bash
   SUPABASE_URL=https://<projekt>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service_role> npm run umzug -- daten "CRM bisher.zip" --ablage C:\Umzug\sharepoint-adjudications.json --korrekturen C:\Umzug\korrekturen.json
   ```
   Unter Windows (PowerShell) zuerst `$env:SUPABASE_URL="…"` und `$env:SUPABASE_SERVICE_ROLE_KEY="…"`, dann
   `npm run umzug -- daten "CRM bisher.zip" --ablage … --korrekturen …`. Terminal danach schliessen.
4. `umzug-bericht.md` öffnen: Jede Sammlung muss «stimmt» zeigen (wie beim lokalen Import: 32 von 32).
5. Abgleich mit denselben Dateien (gleiches Terminal):
   `npm run import:abgleich -- "CRM bisher.zip" --ablage … --korrekturen …`. Erwartet sind nur die bekannten
   Abweichungen aus falschen Daten im alten CRM (`abgleich-bericht.md`).
6. Einmal anmelden und stichprobenweise prüfen: drei Kunden, drei Offerten, ein Projekt mit Fahrplan.

Der Import ist wiederholbar: Ein zweiter Lauf aktualisiert, statt zu verdoppeln. Darum ist der Probe-Umzug
gefahrlos, und am Stichtag läuft derselbe Befehl nochmals mit dem neusten Export. **Was im neuen CRM schon von
Hand geändert, in den Papierkorb gelegt oder wiederhergestellt wurde, bleibt so** (laut Änderungsprotokoll mit
Person). Diese Datensätze stehen im Bericht unter «Hinweise»; wurden sie auch im alten CRM noch geändert, dort
nachschauen und von Hand nachtragen. Nur mit `--ueberschreiben` gewinnt das alte CRM. Von Hand neu Erfasstes
bleibt immer.

## 6. Dienste

- Anmeldung mit Microsoft und Mail-Vorlagen: `docs/anmeldung.md`. **Wichtig:** eigener SMTP-Versand
  (Dashboard › Authentication › SMTP), sonst kommen Anmeldecodes nur wenige Male pro Stunde an.
- Für die Desktop-App bei Authentication › **URL Configuration › Redirect URLs** zusätzlich
  `http://tauri.localhost/**` eintragen, sonst funktioniert «Mit Microsoft anmelden» nur im Browser.
- Microsoft 365, AbaNinja, SMS: `docs/integrationen.md`. KI: `docs/ki.md`. Social Media: `docs/marketing.md`.
  Eturnity: `docs/eturnity.md`.

## 7. App veröffentlichen

`docs/installation.md`: Update-Schlüssel erzeugen, GitHub einrichten, «Neue Version veröffentlichen».

## 8. Stichtag

Am besten Freitagabend bis Montagmorgen.

1. **Freitag 17:00:** Im Team ankündigen: ab jetzt nichts mehr im alten CRM erfassen.
2. Letzten Export aus V233 machen. V233 bleibt 30 Tage zum Nachschauen offen, aber nur noch lesen.
3. Ordnerliste aus SharePoint neu lesen lassen (neue Aufträge seit dem letzten Stand), dann
   `npm run umzug -- daten "<neuer Export>.zip" --ablage … --korrekturen …` und den Abgleich wie in Schritt 5.
   Zählbericht und «Hinweise» (von Hand Geändertes) prüfen.
4. Einstellungen › Betrieb: alles grün? Einstellungen › Datensicherung › «Jetzt sichern».
5. Im Reiter «Personen» allen eine Rolle geben (die 5 importierten Personen stehen noch auf «Mitarbeit») und
   Einladungen senden.
6. **Montag:** Team installiert die App (Kurzanleitung im Handbuch › «Erste Schritte») und meldet sich an.
   Fehler über «Fehler melden»; sie erscheinen in deiner Glocke.

## Zurück, falls etwas schiefgeht

- Bis zum Stichtag arbeitet das Team im alten CRM; der Probe-Umzug ändert dort nichts.
- Nach dem Stichtag: Einstellungen › Datensicherung › «Wiederherstellen» auf einen früheren Stand, oder im
  Notfall wieder V233 (Daten seit dem Stichtag müssten dort von Hand nachgetragen werden).
