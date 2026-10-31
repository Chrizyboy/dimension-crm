# Dimension Work

Das neue CRM/ERP von Dimension Solaire: Windows-App fürs Büro, PWA fürs Handy, Daten sicher in Supabase (Frankfurt).

## Schnellstart

Voraussetzungen: [Node.js 22](https://nodejs.org), für die Desktop-App zusätzlich [Rust](https://rustup.rs) und unter Windows die [WebView2/Build-Tools](https://v2.tauri.app/start/prerequisites/), für die lokale Datenbank [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
npm install
npm run dev          # Browser: http://localhost:1420
npm run app:dev      # Desktop-Fenster
```

Lokale Datenbank (optional, braucht Docker):

```bash
npm run db:start     # zeigt am Schluss API_URL und ANON_KEY an
cp .env.example .env.local   # die beiden Werte eintragen
npm run db:test
```

Alles prüfen:

```bash
npm run check        # Lint, Typen, Tests, Build
npm run test:e2e     # Browser-Tests Desktop + Handy
```

## Weiterlesen

- [CLAUDE.md](CLAUDE.md): Aufbau, Regeln, Befehle, «So fügst du ein Modul hinzu»
- [docs/architektur.md](docs/architektur.md): wie die Teile zusammenspielen
- [docs/entscheidungen/](docs/entscheidungen/): warum etwas so gebaut ist
- [docs/dateien-phase-1.md](docs/dateien-phase-1.md): jede Datei aus Phase 1 in einfachen Worten
