# Installation und Updates

Die Desktop-App für Windows kommt aus GitHub: «Neue Version veröffentlichen» baut sie, legt sie als Release ab
und stellt gleichzeitig die Web-App fürs Handy online. Installierte Apps holen neue Versionen selbst und
installieren sie nach einem Klick (Knopf «Update» oben rechts). Entscheid: `docs/entscheidungen/0027`.

## Einmal einrichten (Administration)

### 1. Update-Schlüssel erzeugen

Updates sind signiert: Die App installiert nur, was mit unserem Schlüssel unterschrieben ist. Auf dem eigenen PC
im Projektordner:

```bash
npx tauri signer generate -w dimension-crm-update.key
```

Ein Passwort wählen. Es entstehen zwei Dateien: `dimension-crm-update.key` (geheim) und
`dimension-crm-update.key.pub` (öffentlich). Beide **nicht** ins Projekt legen, sondern in den
Passwort-Manager. Geht der geheime Schlüssel verloren, bekommen installierte Apps keine Updates mehr und müssen
einmal neu installiert werden.

### 2. GitHub einstellen

Repository › **Settings › Secrets and variables › Actions**:

| Art      | Name                                 | Wert                                      |
| -------- | ------------------------------------ | ----------------------------------------- |
| Secret   | `TAURI_SIGNING_PRIVATE_KEY`          | Inhalt von `dimension-crm-update.key`     |
| Secret   | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Passwort aus Schritt 1                    |
| Variable | `TAURI_UPDATER_PUBKEY`               | Inhalt von `dimension-crm-update.key.pub` |
| Variable | `VITE_SUPABASE_URL`                  | `https://<projekt>.supabase.co`           |
| Variable | `VITE_SUPABASE_ANON_KEY`             | «anon public» aus Project Settings › API  |
| Variable | `VITE_SENTRY_DSN`                    | freiwillig (Fehlerüberwachung)            |

Die Variablen sind öffentlich (sie stehen in jeder App); geschützt sind die Daten durch die Anmeldung und die
Regeln in der Datenbank.

Repository › **Settings › Pages › Source: GitHub Actions**. Damit wird die Web-App unter
`https://chrizyboy.github.io/dimension-crm/` erreichbar. Diese Adresse als `APP_URL` (Supabase-Secret) und bei
Supabase › Authentication › URL Configuration als Site URL eintragen.

### Eigene Adresse `work.dimension-solaire.ch`

1. Beim Anbieter der Domain `dimension-solaire.ch` einen DNS-Eintrag anlegen: Typ **CNAME**, Name **work**,
   Ziel **chrizyboy.github.io** (mit oder ohne Punkt am Ende, je nach Anbieter).
2. GitHub › Repository › **Settings › Pages › Custom domain**: `work.dimension-solaire.ch` eintragen, «Save».
   Warten, bis der DNS-Check grün ist, dann **Enforce HTTPS** einschalten (das Zertifikat kann bis 1 Stunde
   brauchen). Eine `CNAME`-Datei im Repository braucht es nicht, weil Pages über die Action veröffentlicht.
3. Supabase › Authentication › URL Configuration: **Site URL** `https://work.dimension-solaire.ch`, bei
   **Redirect URLs** `https://work.dimension-solaire.ch/**` ergänzen (die alte github.io-Adresse darf bleiben).
4. Supabase › Edge Functions › Secrets: `APP_URL` auf `https://work.dimension-solaire.ch` setzen.

Die alte Adresse `chrizyboy.github.io/dimension-crm` leitet GitHub danach von selbst auf die neue um. Microsoft
(Entra) ist nicht betroffen: Die Rücksprünge gehen an Supabase, nicht an die Web-App.

### Download-Seite für das Team

Unter `…/download/` (z. B. `https://work.dimension-solaire.ch/download/`) liegt eine einfache Seite DE/FR mit
dem Knopf «Für Windows herunterladen» (holt immer den Installer der neusten Version), dem Link für das Handy und
der Anleitung unten. Quelle: `public/download/`. Diesen Link an die Mitarbeitenden schicken statt den Link auf
GitHub.

## Neue Version veröffentlichen

1. In `docs/versionen.md` oben einen Abschnitt `## <neue Version>` mit 2–4 Zeilen für das Team schreiben.
2. In `package.json` die `version` erhöhen (z. B. `0.16.0` → `0.16.1` für Korrekturen, `0.17.0` für Neues).
3. Beides in `main` bringen (Pull Request).
4. GitHub › **Actions › Neue Version veröffentlichen › Run workflow**. Nach etwa 20 Minuten liegt die Version
   unter **Releases**, und die Web-App ist aktualisiert.

Fehlt eine Einstellung, bricht der Lauf am Anfang mit einer klaren Meldung ab. Eine Version gibt es nur einmal:
Wer zweimal mit derselben Nummer startet, bekommt die Meldung «Version gibt es schon».

## Am PC installieren

1. Die Download-Seite (`…/download/`, siehe oben) öffnen und «Für Windows herunterladen» klicken, oder unter
   [Releases](https://github.com/Chrizyboy/dimension-crm/releases/latest) `Dimension Work_<version>_x64-setup.exe`
   herunterladen. Datei starten. Keine Administratorrechte nötig.
2. Windows zeigt eventuell «Der Computer wurde durch Windows geschützt» (die App ist noch nicht mit einem
   Firmenzertifikat signiert): **Weitere Informationen › Trotzdem ausführen**. Das kommt nur bei der ersten
   Installation; Updates laufen danach ohne Rückfrage.
3. Anmelden mit der eigenen Mail-Adresse (Code per Mail) oder mit Microsoft.
4. In «Mein Konto › Diese App» lässt sich einschalten, dass das CRM mit Windows startet.

Für die Verteilung über Intune oder ein Skript gibt es zusätzlich das MSI:
`msiexec /i "Dimension Work_<version>_x64_de-DE.msi" /qn` (installiert für alle Personen am PC; Updates
brauchen dann Administratorrechte, deshalb für Einzel-PCs lieber die `setup.exe`).

## Am Handy

Die Web-App im Browser öffnen (Adresse aus `APP_URL`), anmelden und zum Startbildschirm hinzufügen:
iPhone: Safari › Teilen › «Zum Home-Bildschirm». Android: Chrome › ⋮ › «App installieren». Neue Versionen
lädt die Web-App beim nächsten Öffnen selbst.

## Code-Signatur (später, freiwillig)

Ohne Zertifikat warnt Windows bei der ersten Installation (siehe oben). Mit einem Zertifikat für die Firma
verschwindet die Warnung. Möglichkeiten: Microsoft «Trusted Signing» (Azure, monatlich; Verfügbarkeit für
Schweizer Firmen vorher prüfen) oder ein OV-Zertifikat (z. B. Certum, Sectigo; jährlich, mit USB-Schlüssel oder
Cloud-Signatur). Das ist ein eigener Schritt, wenn ihr ihn wollt; die Updates sind schon jetzt signiert.
