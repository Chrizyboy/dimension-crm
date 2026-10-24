# Dateien aus Phase 13 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261104000100_ki_grundlagen.sql`** – Einstellung `ki` (Modelle, Preise, Tageslimit, Firmenstil DE/FR aus V233; ändern nur die Administration), Kostenprotokoll `ki_aufrufe` (ohne Inhalte), gespeicherte Ergebnisse `ki_ergebnisse` (Zusammenfassung, Lead-Bewertung, Briefing, Luftbild), Schreibstil je Person, Budget-Prüfung und Kosten-Auswertung, Ausgangskorb merkt sich KI-Aufträge.
- **`…0200_ki_kontext.sql`** – Was die KI über einen Kunden, Lead, eine Offerte, ein Projekt oder einen Service-Fall erfährt (mit den Rechten der Person), Daten fürs Tagesbriefing, passende Kunden zu einer Mail, Abschlussquoten für die Lead-Bewertung.
- **`…0300_ki_automation.sql`** – Mail-Schritt einer Automation kann «Text mit KI schreiben»; Warteschlange für den Zeitplan; «Offerte nachfassen» schreibt mit KI (weiter mit Freigabe).
- **`supabase/tests/ki.test.sql`** – 24 Prüfungen: Einstellung nur Administration, Tages- und Personenlimit, ausgeschaltet, Kostenprotokoll nur vom Server und nur eigene sichtbar, Briefing und Stil nur für sich, Kontext ohne Rechnungen ohne Recht, KI-Entwurf ersetzt nur unveränderten Text.
- **`src/types/datenbank.ts`** – Typen neu aus der Datenbank erzeugt.

## Server (`supabase/functions/`)

- **`_shared/claude.ts`** – Aufruf der Claude API ohne SDK: Anfrage, Ersatzmodell, Zwischenspeicher, Kosten, Fehler.
- **`_shared/ki_rahmen.ts`** – Ablauf jedes KI-Aufrufs: eingerichtet? eingeschaltet? Limit? Modell wählen, fragen, Kosten protokollieren. Fremde Inhalte als `<daten>`-Blöcke.
- **`_shared/ki_texte.ts`**, **`ki_lesen.ts`**, **`ki_bewerten.ts`**, **`ki_schema.ts`** – Systemtexte und Antwort-Schemas: Entwürfe, Marketing, Mails, Notizen, Belege, Offerten-PDF, Luftbild, Zusammenfassung, Bewertung, Briefing.
- **`_shared/ki_automation.ts`** – KI-Entwürfe für Mails aus Automationen.
- **`ki/index.ts`**, **`texte.ts`**, **`lesen.ts`**, **`bewerten.ts`**, **`hilfe.ts`** – Die Edge Function `ki` mit einer Aktion je Funktion.
- **`_shared/ki.test.ts`**, **`ki/hilfe.test.ts`** – Tests für Anfrage, Kosten, Fehler und Hilfen.
- **`zeitplan/index.ts`** – Neuer Job «ki» jede Minute (nur mit Schlüssel).
- **`config.toml`**, **`tsconfig.functions.json`** – Function `ki` angemeldet.

## Prüfung ohne echten Schlüssel

- **`scripts/ki/ersatz-claude.mjs`** – Ersatz-Server für die Claude API mit erfundenen Antworten.
- **`scripts/ki/pruefen.mjs`** – `npm run ki:pruefen`: 44 Prüfungen gegen die lokale Supabase (Kopfzeilen, Modelle, Ersatzmodell, Limit, Kosten, Rechte, fremde Inhalte, alle Funktionen, Zeitplan).
- **`e2e/ki.spec.ts`** – Browser-Test: KI-Seite ohne Verstösse, Assistent mit Überarbeiten bis zur Mail, Mail lesen bis zum Lead, Spesenbeleg lesen.

## Gemeinsame Bausteine

- **`src/services/ki.ts`** – Einziger Weg der App zur KI: Aufruf, Status, Ergebnisse, Datei vorbereiten, Aufgabe anlegen.
- **`src/components/shared/ki/`** – `KiAssistent` (Entwurf mit Kürzer/Persönlicher/Förmlicher/Einfacher und eigenem Wunsch, weiter ins Mail-Fenster), `KiKnopf`, `KiHinweis`, `KiZusammenfassung`, `KiLeadBewertung`, `KiMailLesen`, `KiNotiz`, `KiWunschZeile`, `KiAkteAbschnitt`.
- **`src/hooks/useDiktat.ts`** – Diktieren über die Spracherkennung des Browsers.
- **`src/components/shared/MailDialog.tsx`** – meldet, wenn die Mail vorbereitet ist (dann lernt der Stil).

## KI in den Modulen

- **Kunde, Projekt, Service, Offerte** – Abschnitt «KI» in der Akte: Zusammenfassung und Text schreiben.
- **Verkauf** – Lead-Bewertung und Zusammenfassung in der Lead-Akte; «Mail mit KI lesen» unter «Anfragen holen» ergibt einen vorausgefüllten Lead; Notiz ordnen beim Kontakt erfassen; Luftbild-Analyse im Terminblatt mit «Vorschlag übernehmen»; Monatsbericht-Text.
- **Kontakte** – Notiz ordnen bei der Aktivität.
- **Offerten-PDF** – KI liest ein PDF, wenn die normale Erkennung zu wenig findet.
- **Spesen** – «Mit KI lesen» füllt Datum, Betrag, Kategorie und Zweck aus dem Beleg.
- **Marketing** – Social-Post, Newsletter und Serien-Mail mit KI schreiben oder überarbeiten.
- **Ausgangskorb** – Hinweis «KI-Entwurf» und «Vorlagentext verwenden».
- **Automationen** – Schalter «Text mit KI schreiben» im Mail-Schritt.

## Modul «KI-Assistent» (`src/modules/ai/`)

- **`components/KiSeite.tsx`**, **`Assistent.tsx`**, **`Kosten.tsx`**, **`Stil.tsx`**, **`Einstellungen.tsx`**, **`Briefing.tsx`** – Seite mit vier Reitern und Tagesbriefing «Dein Tag».
- **`lib/kosten.ts`** (mit Test), **`services/`**, **`hooks/`**, **`types.ts`**, **`schema.ts`**, **`index.ts`**, **`README.md`**.

## Übrige Änderungen

- **`src/app/ai.tsx`**, **`src/routeTree.gen.ts`** – Adresse `#/ai?ansicht=…`.
- **`src/layouts/Startseite.tsx`** – Tagesbriefing oben.
- **`src/i18n/de.json`**, **`fr.json`** – Texte DE/FR.
- **`docs/ki.md`**, **`docs/entscheidungen/0024-ki-funktionen.md`**, **`docs/datenmodell.md`**, **`.env.example`**, **`CLAUDE.md`**, **`src/lib/bauplan.ts`** – Anleitung, Entscheid, Datenmodell, Stand.
