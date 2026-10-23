# Dateien aus Phase 12 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261103000100_automationen_grundlagen.sql`** – Tabellen für Automationen (Auslöser, Bedingungen, Aktionen, «mit Freigabe» oder «automatisch»), Signale, Läufe mit Protokoll und Benachrichtigungen je Person. Aufgaben merken sich den Lauf. Einstellung `automationen`. Hilfen für Beträge, Daten, Platzhalter und Anrede in beiden Sprachen.
- **`…0200_automationen_kontext.sql`** – Was eine Automation über einen Lead, eine Offerte, ein Projekt, eine Rechnung oder einen Wartungsvertrag weiss (Felder für Bedingungen und Platzhalter), wer Empfänger ist, und der Katalog für die App.
- **`…0300_automationen_ausfuehren.sql`** – Der Motor: Signale verteilen, Läufe Schritt für Schritt abarbeiten (Aufgabe, Glocke, Mail, SMS, Warten, Prüfen, Dubletten, Zuteilen, Rechnungsentwurf, Zahlungserinnerung, Zielgruppe), Mails und SMS über den Ausgangskorb, Server-Schritte für Outlook, SharePoint und AbaNinja. Mahnstufe steigt erst nach dem Senden. Glocke: gelesen und ausblenden.
- **`…0400_automationen_signale.sql`** – Trigger, die bei neuen Leads, Terminen, Offerten, Aufträgen, Baugesuchen und erledigten Fahrplan-Schritten ein Signal geben (nicht beim Import), und die tägliche Durchsicht für Zeit-Auslöser.
- **`…0500_automationen_vorlagen.sql`** – Die elf mitgelieferten Automationen mit Texten DE/FR, alle «mit Freigabe».
- **`…0600_automationen_oberflaeche.sql`** – Lauf von Hand beenden; die Einstellung `automationen` ändert nur die Administration.
- **`supabase/tests/automationen.test.sql`** – 40 Prüfungen: Katalog und Vorlagen, Rechte, Prüfregeln, Signale (nicht beim Import), Warten, Aufgabe und Glocke in der Sprache der Person, Mail im Ausgangskorb, Server-Schritte, Bedingungen, Werbesperre, «automatisch», Papierkorb, ausgeschaltet, Mahnstufe.
- **`src/types/datenbank.ts`** – Typen neu aus der Datenbank erzeugt.

## Server (`supabase/functions/`)

- **`_shared/automation_server.ts`** – Outlook-Termin eintragen, SharePoint-Kundenordner anlegen, Kunde in AbaNinja anlegen; fehlt eine Verbindung, wird der Schritt übersprungen.
- **`zeitplan/index.ts`** – Neuer Job «automationen» jede Minute.

## Prüfung ohne echte Konten

- **`scripts/integrationen/ersatz-dienste.mjs`**, **`pruefen.mjs`** – Ersatz-Server kann jetzt Ordner anlegen; neue Prüfung: Auftrag → Ordner mit Unterordnern, AbaNinja-Kunde, Aufgabe, Outlook-Termin für den Lead.

## Modul «Automationen» (`src/modules/automations/`, nur Administration)

- **`components/Automationen.tsx`** – Seite mit drei Reitern: Automationen, Protokoll, Einstellungen.
- **`components/AutomationsListe.tsx`** – Karten mit Schalter, Ablauf als Kette, Freigabe/Automatisch und Anzahl Läufe.
- **`components/AutomationEditor.tsx`**, **`BedingungenEditor.tsx`**, **`AktionenEditor.tsx`**, **`AktionFelder.tsx`**, **`EmpfaengerWahl.tsx`**, **`ZweisprachigFeld.tsx`** – Automation bearbeiten: Wenn, Nur wenn, Dann; Texte DE/FR mit Warnung bei unbekannten Platzhaltern; Papierkorb.
- **`components/Protokoll.tsx`**, **`LaufDetail.tsx`**, **`ZielLink.tsx`** – Alle Läufe mit Filter, Zeitachse je Lauf, Link zum Datensatz, Lauf beenden.
- **`components/Einstellungen.tsx`** – Vorlauf, Karenz, Rückschau für vorbei gegangene Termine, Bewertungslink.
- **`components/symbole.ts`**, **`texte.ts`**, **`lib/anzeige.ts`** (mit Test), **`lib/entwurf.ts`** – Symbole, Texte fürs Protokoll, Hilfen für die Anzeige.
- **`services/`**, **`hooks/`**, **`types.ts`**, **`index.ts`**, **`README.md`**.

## Modul «Aufgaben» (`src/modules/tasks/`)

- **`components/Aufgaben.tsx`**, **`NeueAufgabe.tsx`** – Meine oder alle Aufgaben, offen oder erledigt, abhaken, Fälligkeit, Link zum Datensatz; neue Aufgabe von Hand.
- **`lib/faelligkeit.ts`** (mit Test), **`schema.ts`**, **`services/`**, **`hooks/`**, **`types.ts`**, **`index.ts`**, **`README.md`**.

## Übrige Änderungen

- **`src/app/automations.tsx`**, **`src/app/tasks.tsx`**, **`src/routeTree.gen.ts`** – Adressen `#/automations?ansicht=…` und `#/tasks`.
- **`src/services/benachrichtigungen.ts`**, **`src/hooks/useBenachrichtigungsListe.ts`**, **`src/stores/benachrichtigungen.ts`**, **`src/layouts/Benachrichtigungen.tsx`**, **`src/app/benachrichtigungen.tsx`** – Die Glocke zeigt Meldungen vom Server und vom Gerät zusammen.
- **`src/lib/ziel.ts`** (mit Test) – Link zu einem Datensatz in der App.
- **`src/app/marketing.tsx`**, **`src/modules/marketing/components/Marketing.tsx`**, **`Anschreiben.tsx`** – Die Aufgabe «Nachrüsten» öffnet «Kunden anschreiben» mit der passenden Zielgruppe.
- **`src/i18n/de.json`**, **`fr.json`** – Texte für Automationen, Aufgaben und Fehlermeldungen.
- **`e2e/automationen.spec.ts`**, **`playwright.config.ts`** – Browser-Test: Reiter ohne Verstösse, eigene Automation anlegen, ausschalten und in den Papierkorb, Verkauf sieht nichts, Aufgabe anlegen und abhaken.
- **`docs/entscheidungen/0023-automationen.md`**, **`docs/datenmodell.md`**, **`CLAUDE.md`**, **`src/lib/bauplan.ts`**.
