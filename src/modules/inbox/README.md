# Modul: Posteingang

**Zweck:** Alle Mails, die hereinkommen (persönliche Postfächer und Team-Postfächer wie info@), an einem Ort: eingeordnet
nach Art, dem richtigen Kunden, Lead, Projekt, Service-Fall, Offerte, Rechnung oder Bestellung zugeordnet, mit
Antwortfrist in Arbeitszeit und Erinnerung, damit kein Kunde warten muss. Werbung und Interne gehen still weg.

Wunsch von Chris am 31.10.2026. Entscheid: `docs/entscheidungen/0031-posteingang.md`.

**Stand:** gebaut in Phase **18**.

## So läuft es

1. Der Zeitplan holt alle 5 Minuten Posteingang und Gesendete aller verbundenen Personen, Team-Postfächer einmal pro
   Lauf (Edge Function `zeitplan`, Job `posteingang`; «Jetzt abholen» über `microsoft` › `posteingang_abholen`).
2. Feste Regeln zuerst (eigene Domain = intern, newsletter@/noreply@ = Werbung, Formular-Anfragen werden Lead),
   dann ordnet die KI den Rest ein (Art, Sprache, dringend, Zusammenfassung, Nummern). Ohne KI: Regel-Rückfall.
3. Die Datenbank ordnet zu (Nummern, Absender), bestimmt Zuständige (Betreuer der Akte → Liste je Art und Sprache →
   Postfach), Stellvertretung bei Abwesenheit in Outlook, Frist und doppelte Frist.
4. Eine Antwort in «Gesendet» (gleiche Konversation oder an den Absender) oder über den Ausgangskorb erledigt die Mail
   und misst die Reaktionszeit in Arbeitszeit.
5. `posteingang_erinnern` (alle 5 Minuten): Vorwarnung, Frist überschritten, doppelte Frist an die Leitung, je einmal.

## Daten

- Besitzt: `posteingang`, Einstellung `posteingang` (nur Administration, Trigger `posteingang_einstellung_schuetzen`).
- Schreibt über Datenbank-Funktionen in: `benachrichtigungen`; Leads entstehen über `intern.mail_eingang`.
- Liest: `kontakte`, `verkaufschancen`, `offerten`, `projekte`, `rechnungen`, `bestellungen`, `service_faelle`,
  `kalender_eintraege` (Abwesenheit), `personen`.
- Ändern nur über `posteingang_setzen` (erledigt, ablegen, oeffnen, zuweisen, art, verknuepfen); kein direktes Update.

## Abhängigkeiten

- `src/services/supabase.ts`, `src/services/integrationen.ts` (`microsoft.posteingangAbholen`, `posteingangText`),
  `src/services/fachfehler.ts`, `src/services/meldungen.ts`, KI-Bausteine aus `src/components/shared/ki/`.
- Für «Lead anlegen» und «Service-Fall eröffnen» nutzen Anfragen & Leads und Service `src/services/posteingang.ts`
  (`mailVorlage`, `mailVolltext`, `mailVerknuepfen`); sie importieren dieses Modul nicht.

## Ereignisse

- **sendet:** keine. **hört auf:** keine (Antworten aus dem Ausgangskorb erkennt der Trigger `posteingang_beantwortet`).

## Ordner

- `components/` – Seite, Liste mit Kopfzahlen, Mail-Akte, Weitergeben, Kunde zuordnen, Reaktionszeit, Einstellungen,
  Karte für «Mein Tag»
- `hooks/` – Mails laden (`useMails`, `useText`), Änderungen mit Fehlermeldung (`useAktion`)
- `lib/` – Anzeige von Frist, Sortierung und Kopfzahlen (mit Tests)
- `services/` – Zugriff auf Supabase und die Server-Funktion
