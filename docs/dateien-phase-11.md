# Dateien aus Phase 11 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261102000100_marketing_grundlagen.sql`** – Jeder Kontakt bekommt einen geheimen Abmelde-Schlüssel. Kampagnen, Newsletter und Social-Posts bekommen Stand, Freigabe, Termin und Ergebnis je Netzwerk. Neue Server-Tabellen für die Verbindungen zu Meta, LinkedIn und Canva (Token verschlüsselt). Einstellung `marketing` mit den Texten aus V233. Sicht `marketing_zielgruppe`: ein Kontakt pro Zeile mit Gruppe, Kanton, Standort, Anlage, Werbesperre und Versandgrund.
- **`…0200_marketing_ablaeufe.sql`** – Serien-Mail und Newsletter in den Ausgangskorb (ohne Gesperrte und Doppelte, nie zweimal), Aktionen vermerken, Werbesperre und Einwilligung, Newsletter-Empfänger nach Zielgruppe, Post freigeben, zurückziehen, erledigt; für den Server: abmelden, Posts zum Veröffentlichen holen, Ergebnis eintragen, Verbindungen speichern.
- **`supabase/tests/marketing.test.sql`** – 30 Prüfungen: Zielgruppe, Rechte, Versand ohne Gesperrte und Doppelte, Abmelden, Einwilligung, Newsletter-Empfänger, Freigabe mit Textlänge und Instagram-Bild, nur verbundene Netzwerke, CI-Stil nur Administration, Tokens unsichtbar.
- **`src/types/datenbank.ts`** – Typen neu aus der Datenbank erzeugt.

## Server (`supabase/functions/`)

- **`social/index.ts`** – Status, Verbinden und Trennen (nur Administration), Canva-Design anlegen und Bild holen, «Jetzt veröffentlichen».
- **`social-rueckruf/index.ts`** – Hierher kommt man nach der Anmeldung bei Meta, LinkedIn oder Canva zurück; danach zurück ins CRM.
- **`abmelden/index.ts`** – Der Abmelde-Link aus jeder Mail: setzt «Keine Werbung» und bestätigt auf Deutsch oder Französisch.
- **`_shared/social_konten.ts`** – Anmelden mit Zustand (und PKCE bei Canva), Tokens verschlüsseln, erneuern, «neu verbinden» merken.
- **`_shared/posten.ts`** – Posten auf Facebook-Seite, Instagram und LinkedIn-Firmenseite mit Bild; nie zweimal pro Netzwerk.
- **`_shared/social_text.ts`** (mit Test) – Text je Netzwerk und Sprache zusammensetzen, LinkedIn-Sonderzeichen maskieren.
- **`_shared/canva.ts`** – Leeres Design im Format, Export als JPG in die Ablage.
- **`_shared/funktion.ts`** (mit Test) – Fehler aus Phase 8 behoben: Aktionen mit Recht «basis» gingen nur für Admins.
- **`_shared/datenbank.ts`** – Datei hochladen und kurzlebige Adresse für Instagram/Facebook.
- **`zeitplan/index.ts`** – Neuer Job «social»: freigegebene Posts zur geplanten Zeit.
- **`config.toml`**, **`tsconfig.functions.json`** – Neue Funktionen eingetragen.

## Prüfung ohne echte Konten

- **`scripts/marketing/ersatz-social.mjs`**, **`pruefen.mjs`**, **`package.json`** (`npm run marketing:pruefen`) – Ersatz-Server für Meta, LinkedIn und Canva; 40 Prüfungen vom Verbinden bis zum Abmelde-Link.

## Modul «Marketing» (`src/modules/marketing/`)

- **`components/Marketing.tsx`** – Seite mit vier Reitern.
- **`components/Anschreiben.tsx`**, **`ZielFilterLeiste.tsx`**, **`ZielTabelle.tsx`**, **`ZielAktionen.tsx`**, **`LetzteAktionen.tsx`** – Zielgruppe filtern, auswählen, pro Kontakt Werbesperre und Einwilligung, Letzte Aktionen.
- **`components/SerienDialog.tsx`** – Serienbrief (PDF) und Serien-E-Mail mit Texten je Sprache, Platzhaltern und Vorschau.
- **`components/Social.tsx`**, **`Verbindungen.tsx`**, **`PostEditor.tsx`**, **`PostTexte.tsx`**, **`PostBild.tsx`**, **`PostQuelle.tsx`** – Verbindungen, Liste der Posts, Post bearbeiten mit Prüfhinweisen, Bild, Freigabe.
- **`components/NewsletterSeite.tsx`**, **`NewsletterEditor.tsx`** – Kennzahlen, Liste, Thema → Zielgruppe → Text → Prüfung → Senden.
- **`components/Vorlagen.tsx`** – Texte, Themen, Regeln je Netzwerk, CI-Stil.
- **`services/marketing.ts`**, **`services/social.ts`** – Laden und Abläufe.
- **`lib/zielgruppe.ts`**, **`texte.ts`**, **`serienbrief.ts`**, **`anlage.ts`** (mit Tests in `marketing.test.ts`) – Filter, Platzhalter, Textprüfung, PDF.
- **`hooks/`**, **`types.ts`**, **`index.ts`**, **`README.md`**.

## Übrige Änderungen

- **`src/app/marketing.tsx`**, **`src/routeTree.gen.ts`** – Adresse `#/marketing?ansicht=…` und Meldung nach dem Verbinden.
- **`src/services/integrationen.ts`** – App ruft die Funktion `social` auf.
- **`src/i18n/de.json`**, **`fr.json`** – Texte für Marketing und Fehlermeldungen.
- **`e2e/marketing.spec.ts`**, **`playwright.config.ts`** – Browser-Test: Reiter ohne Verstösse, Kontakt mit Einwilligung per Serien-Mail anschreiben, abmelden und wieder anmelden, Post und Newsletter als Entwurf.
- **`docs/marketing.md`** (Anleitung), **`docs/entscheidungen/0022-marketing-social-newsletter.md`**, **`docs/datenmodell.md`**, **`.env.example`**, **`CLAUDE.md`**, **`src/lib/bauplan.ts`**.
