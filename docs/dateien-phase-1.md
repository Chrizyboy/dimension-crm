# Dateien aus Phase 1 – in einfachen Worten

Jede Datei, die in Phase 1 entstanden ist, mit zwei bis drei Sätzen dazu, wofür sie da ist.

## Projekt-Einstellungen

- **`package.json`** – Die Stückliste des Projekts: welche Bibliotheken in welcher Version gebraucht werden und welche Befehle es gibt (`npm run dev`, `npm run check` …). Alle Versionen sind exakt festgehalten, damit jeder Computer dasselbe installiert.
- **`package-lock.json`** – Von npm erzeugte, genaue Liste aller installierten Pakete samt Unterpaketen. Nie von Hand bearbeiten; sie sorgt dafür, dass die Installation überall identisch ist.
- **`.npmrc`** – Zwei npm-Einstellungen: Versionen exakt speichern und bekannte, harmlose Peer-Konflikte nicht als Fehler behandeln (siehe Entscheid 0004).
- **`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`** – Regeln für TypeScript, also wie streng der Code auf Fehler geprüft wird. Wir nutzen die strengste Stufe, damit viele Fehler schon beim Schreiben auffallen statt erst beim Kunden.
- **`vite.config.ts`** – Einstellungen für Vite, das Werkzeug, das aus dem Code die fertige App baut. Hier sind Routen, Tailwind, die Handy-App (PWA) und die Test-Einstellungen eingehängt.
- **`eslint.config.js`** – Regeln für die automatische Code-Prüfung. Sie meldet z. B. unsichere Typen oder wenn ein Modul ein anderes direkt importiert.
- **`.prettierrc.json`, `.prettierignore`** – Einheitliche Formatierung (Einrückung, Anführungszeichen, Zeilenlänge). So sieht jede Datei gleich aus, egal wer sie geschrieben hat.
- **`.gitignore`** – Liste der Dateien, die nie ins Git kommen, z. B. `.env.local` mit Schlüsseln, gebaute Dateien und Testberichte.
- **`.env.example`** – Vorlage für die lokalen Einstellungen (Supabase-Adresse und öffentlicher Schlüssel). Man kopiert sie nach `.env.local` und trägt die eigenen Werte ein; echte Geheimnisse gehören nie hier hinein.
- **`index.html`** – Die Startseite, in die React die ganze App einsetzt. Enthält Titel, Icon und Farbe für die Handy-Ansicht.
- **`app-icon.png`** – Das Original-Icon in 1024×1024. Daraus erzeugt `npx tauri icon` alle Windows-Icon-Grössen.

## Oberfläche (`src/`)

- **`main.tsx`** – Der Startpunkt der App. Richtet Router, Daten-Cache und Übersetzungen ein und zeigt dann die Oberfläche an.
- **`index.css`** – Farben, Schriften und Abstände als «Tokens» für Hell und Dunkel (Sonnen-Orange `#ef7d0e`, Navy `#0b2545`). In Phase 2 wird daraus das vollständige Design-System.
- **`vite-env.d.ts`** – Erklärt TypeScript, welche Umgebungswerte es gibt (z. B. die App-Version). Nur technisch nötig.
- **`routeTree.gen.ts`** – Wird automatisch aus den Dateien in `src/app/` erzeugt und listet alle Seiten. Nie von Hand ändern.
- **`app/__root.tsx`** – Der äussere Rahmen jeder Seite; legt den App-Rahmen (Seitenleiste, Kopfzeile) um den Inhalt. Hier landen später auch globale Dinge wie die Befehlspalette.
- **`app/index.tsx`** – Die Startseite (`#/`). Zeigt aktuell den Systemstatus und den Bauplan.
- **`app/$modul.tsx`** – Eine Seite für jedes Modul (`#/sales`, `#/quotes` …). Gibt es die Adresse nicht, kommt «nicht gefunden» statt einer leeren Seite.
- **`layouts/AppShell.tsx`** – Der Rahmen mit Seitenleiste links und Kopfzeile oben. Am Handy ist die Seitenleiste ausgeblendet; die Handy-Navigation kommt in Phase 2.
- **`layouts/Seitenleiste.tsx`** – Die linke Navigation mit allen 18 Modulen in den Gruppen der Vorlage (Übersicht, Verkauf, Abwicklung, Verwaltung, Weitere).
- **`layouts/Kopfzeile.tsx`** – Die obere Leiste: Seitenleiste ein/aus, Suchfeld (wird in Phase 2 die Befehlspalette mit Ctrl K), Sprache DE/FR, Hell/Dunkel/System.
- **`layouts/Startseite.tsx`** – Übersicht für Phase 1: Version, Plattform, Datenbank-Status, Anzahl Module, Bauplan und Beispiele der Schweizer Formate.
- **`layouts/ModulPlatzhalter.tsx`** (+ Test) – Leerer Zustand für Module, die noch nicht gebaut sind, mit der geplanten Phase. Der Test prüft Deutsch und Französisch.
- **`components/ui/button.tsx`** – Der Basis-Knopf in mehreren Varianten (Standard, Umriss, Geist, Icon). Alle Knöpfe der App bauen darauf auf.
- **`components/shared/ModulIcon.tsx`** – Zeigt das passende Icon zu einem Modul anhand seines Namens. So muss kein Modul die Icon-Bibliothek selbst kennen.
- **`hooks/useOberflaeche.ts`** – Setzt Sprache und Hell/Dunkel auf der ganzen Seite um, auch «System» (folgt der Windows-Einstellung).
- **`stores/ui.ts`** – Merkt sich Sprache, Darstellung und ob die Seitenleiste eingeklappt ist, auch nach einem Neustart.
- **`i18n/de.json`, `i18n/fr.json`, `i18n/index.ts`** (+ Test) – Alle Texte der Oberfläche auf Deutsch und Französisch. Der Test schlägt fehl, wenn in einer Sprache ein Text fehlt.
- **`lib/format.ts`** (+ Test) – Schweizer Formate: `CHF 12'500.00`, Rundung auf 5 Rappen, `21.10.2026`, `+41 76 123 45 67`. Beträge werden intern als Rappen gespeichert, damit nie Rundungsfehler entstehen.
- **`lib/navigation.ts`** (+ Test) – Die einzige Stelle, die alle Module kennt und daraus die Seitenleiste baut. Ein neues Modul wird hier mit einer Zeile eingetragen.
- **`lib/bauplan.ts`** – Die Phasen 0–16 mit ihrem Stand, für die Anzeige auf der Startseite.
- **`lib/plattform.ts`** – Erkennt, ob die App als Windows-App oder im Browser/Handy läuft. Manche Funktionen (z. B. Autostart) gibt es nur in der Desktop-App.
- **`lib/utils.ts`** – Kleine Hilfsfunktion `cn`, um CSS-Klassen sauber zusammenzusetzen.
- **`services/supabase.ts`** – Die Verbindung zur Datenbank. Ist keine konfiguriert, zeigt die App «noch nicht verbunden» statt abzustürzen.
- **`services/ereignisse.ts`** (+ Test) – Der Ereignis-Bus: Module melden «Offerte angenommen», andere reagieren darauf, ohne sich zu kennen. Alle Ereignisse stehen in einem Katalog, Tippfehler fallen sofort auf.
- **`types/modul.ts`** – Beschreibt, was jedes Modul angeben muss (Titel DE/FR, Pfad, Icon, Gruppe, Phase).
- **`test/setup.ts`** – Bereitet jeden Test vor (Übersetzungen laden, zusätzliche Prüf-Befehle).

## Module (`src/modules/`)

- **18 Ordner** (`today`, `dashboard`, `tasks`, `sales`, `quotes`, `customers`, `contacts`, `marketing`, `projects`, `contracts`, `invoices`, `aftersales`, `finance`, `expenses`, `automations`, `settings`, `knowledge`, `ai`) – Je ein Fachbereich mit `index.ts`, `types.ts`, `schema.ts`, `README.md` und Unterordnern. Sie sind noch leer und werden ab Phase 5 einzeln gebaut.

## Vorlage und Skripte

- **`docs/modul-vorlage/`** – Die Kopiervorlage für ein neues Modul mit Platzhaltern. Das Skript ersetzt die Platzhalter automatisch.
- **`scripts/neues-modul.mjs`** – Legt mit einem Befehl ein neues Modul aus der Vorlage an (`npm run modul:neu -- lager "Lager" "Stock" package abwicklung 17`).
- **`scripts/check-module-grenzen.mjs`** – Prüft bei jedem `npm run lint`, dass kein Modul ein anderes direkt importiert. So bleibt das CRM auch nach Jahren erweiterbar.

## Desktop-App (`src-tauri/`)

- **`tauri.conf.json`** – Name, Fenstergrösse (1440×900, mindestens 1024×640), Sicherheitsregeln (CSP) und Installer-Einstellungen (MSI und EXE, Deutsch und Französisch).
- **`Cargo.toml`, `Cargo.lock`, `build.rs`** – Stückliste und Bauanleitung für den Rust-Teil. Rust ist die schlanke Hülle um die Oberfläche; Geschäftslogik liegt nicht hier.
- **`src/lib.rs`, `src/main.rs`** – Startet das Fenster und die Zusatzfunktionen: nur ein Fenster gleichzeitig, Fenstergrösse merken, Autostart, Windows-Benachrichtigungen.
- **`capabilities/default.json`** – Was die Oberfläche in Windows darf (Fenster, Benachrichtigungen, Autostart). Alles andere ist gesperrt.
- **`gen/schemas/`** – Von Tauri erzeugte Beschreibungen der Berechtigungen. Nicht von Hand ändern.
- **`icons/`** – Alle Icon-Grössen für Windows, erzeugt aus `app-icon.png`.

## Datenbank (`supabase/`)

- **`config.toml`** – Einstellungen der lokalen Supabase (Ports, Anmelde-Adressen der App).
- **`migrations/20261021000000_grundlagen.sql`** – Erste Datenbank-Änderung: Änderungsprotokoll (wer, was, wann, vorher/nachher), Papierkorb-Logik, App-Info und eine Gesundheitsprüfung. Die Fachtabellen folgen in Phase 3.
- **`functions/health/index.ts`** – Erste Server-Funktion; prüft, ob Server und Datenbank laufen. Sie ist die Vorlage für alle späteren Integrationen (Zeitlimit, klare Fehlermeldung, keine Geheimnisse im Log).
- **`tests/grundlagen.test.sql`** – Sechs Datenbank-Tests: Protokoll schreibt jede Aktion richtig, Papierkorb und Wiederherstellen werden erkannt, Unangemeldete sehen nichts.
- **`seed.sql`** – Testdaten für die lokale Datenbank. Echte Kundendaten kommen nie hier hinein.

## Tests und Automatik

- **`playwright.config.ts`** – Einstellungen für die Browser-Tests: jede Prüfung läuft einmal als Desktop (1440×900) und einmal als Handy (Pixel 7).
- **`e2e/grundgeruest.spec.ts`** – Die Browser-Tests: Startseite, Sprachwechsel bleibt gespeichert, Dunkelmodus, unbekannte Adresse, alle 18 Module erreichbar.
- **`.github/workflows/ci.yml`** – GitHub prüft bei jeder Änderung automatisch Format, Code, Typen, Tests, Build, Browser-Tests und Datenbank und baut den Windows-Installer zum Herunterladen.

## Dokumentation

- **`CLAUDE.md`** – Anleitung für Claude Code: Aufbau, Regeln, Befehle und «So fügst du ein Modul hinzu». Damit kann das CRM später sicher erweitert werden.
- **`README.md`** – Schnellstart für Menschen: installieren, starten, prüfen.
- **`docs/architektur.md`** – Wie Desktop-App, Handy-App und Supabase zusammenspielen und wo welche Logik liegt.
- **`docs/entscheidungen/0001–0005`** – Kurze Notizen zu wichtigen Entscheiden (Kontext, Entscheid, Folgen).
