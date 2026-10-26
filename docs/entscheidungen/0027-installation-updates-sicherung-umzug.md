# 0027 – Installation, Updates, Datensicherung und Umzug

**Kontext:** Der Bau-Auftrag verlangt für Phase 16 «Installer, Auto-Update, Backup, Umzug der Live-Daten,
Schulungs-Kurzanleitung», Ergebnis: «Team kann installieren und arbeiten». V233 hatte einen Backup-Knopf mit
täglicher Sicherung um 12:00 und 16:00 (Regel 1). Phase 16 wurde von Chris am 26.10.2026 mit «weiter» gestartet.

**Entscheid:**

- **Veröffentlichen aus GitHub:** Ein Klick auf «Neue Version veröffentlichen» (GitHub Actions) baut den
  Windows-Installer (NSIS `setup.exe`, dazu MSI für Intune), legt ihn als Release ab und stellt dieselbe Version als
  Web-App auf GitHub Pages (Handy, PWA). Die Versionsnummer kommt aus `package.json`, der Text für das Team aus
  `docs/versionen.md`; fehlt eines davon oder gibt es die Version schon, bricht der Lauf ab.
- **Auto-Update signiert:** Tauri-Updater mit eigenem Schlüsselpaar. Der private Schlüssel liegt nur als GitHub-Secret,
  der öffentliche als Variable; die App installiert nur Signiertes. Die App prüft 15 Sekunden nach dem Start und alle
  6 Stunden, zeigt oben «Update» und installiert erst nach Klick (nie mitten in der Arbeit). Installation pro Person
  ohne Administratorrechte, damit Updates ohne Rückfrage laufen.
- **Keine Code-Signatur vorerst:** Windows warnt beim ersten Installieren. Ein Firmenzertifikat ist ein späterer,
  freiwilliger Schritt (docs/installation.md).
- **Datensicherung eigen, zusätzlich zu Supabase:** Wie V233 um 12:00 und 16:00 (Zeiten als Daten in
  `einstellungen.sicherung`), vom Zeitplan auf dem Server, nie im Browser. Eine Sicherung = alle Fachtabellen als
  JSON, gepackt (gzip) im privaten Speicher `sicherungen`, Kopie in SharePoint (Direction Interne › CRM Backups).
  Automatische bleiben 14 Tage, von Hand 90 Tage. Fehlschlag meldet die Glocke der Administration.
- **Wiederherstellen ohne Datenverlust:** Nur Administration, nur mit Bestätigung. Zuerst wird der jetzige Stand
  gesichert (so ist auch das Wiederherstellen umkehrbar), dann in einer Transaktion: geänderte Zeilen bekommen die
  alten Werte, fehlende kommen zurück, seither neue gehen in den Papierkorb (Regel 5, nie hart löschen).
  Fach-Trigger und Automationen schweigen dabei. Nie zurückgesetzt werden Personen, Rollen, Einladungen,
  Ausgangskorb, Posts, Verbindungen und Protokolle: Was hinausging, bleibt hinausgegangen.
- **Umzug geführt:** `npm run umzug` (prüfen, datenbank, funktionen, tresor, daten) und `docs/umzug.md` mit
  Stichtag-Plan. Das Skript liest Schlüssel nur aus der Umgebung und gibt sie nie aus; Tresor-Einträge über die
  Dashboard-Seite statt SQL (sonst stünde der Schlüssel im Verlauf). Einstellungen › Betrieb zeigt grün/gelb/rot,
  was im Cloud-Projekt noch fehlt (`betrieb_stand()`, nur Administration).
- **Kurzanleitung im Handbuch:** «Erste Schritte» (DE/FR) als Reiter, druckbar auf eine A4-Seite, statt eines
  separaten Dokuments, damit sie mit der App zusammen aktuell bleibt.

**Folgen:** Jede neue Fachtabelle ist automatisch in der Sicherung (Liste aus der Datenbank); Tabellen, die nie
zurückgesetzt werden dürfen, kommen in `intern.sicherung_nie_zurueck()`. Jede neue Version braucht einen Abschnitt in
`docs/versionen.md`. Neue Pflicht-Secrets gehören in `PFLICHT` von `scripts/umzug/umzug.mjs` und in den Betrieb-Reiter.
