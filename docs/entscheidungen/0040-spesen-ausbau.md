# 0040 – Spesen vollständig: Prüfen, Rückfrage, Kilometer, Firmenkarte, Auszahlungsläufe (2.11.2026)

## Ausgangslage

Chris: Jedes Modul muss seinen Zweck ganz erfüllen, das CRM fühle sich «nur nach Fassade» an. Spesen kannten nur
«eingereicht → ausbezahlt» oder «storniert»; die Buchhaltung hatte keinen Prüfschritt, keine Rückfrage, keine
Kilometer, keine Firmenkarte, kein Projekt und keine MWST. Neuentwurf als Vorschau:
https://claude.ai/artifact/FrRrrRnxUQxQYUYwN9UCoz

## Entscheid

- **Ablauf** eingereicht → geprüft → ausbezahlt, dazu **Rückfrage** (Person ändert und reicht erneut ein) und
  **Ablehnen** mit Grund (beides mit Glocke). «Stornieren» heisst für die Person jetzt «Zurückziehen». Jeder Schritt
  steht im `verlauf` der Spese. Regeln im Trigger `intern.spesen_pruefen`, nicht in der App.
- **Wer prüft:** Recht `finanzen` (Buchhaltung), Chris/Andy sehen alles über dasselbe Recht.
- **Kilometer** mit Privatauto als eigene Art: km × Ansatz (Standard CHF 0.70, `einstellungen.finanzen.spesen`),
  Betrag rechnet die Datenbank.
- **Firmenkarte:** wird erfasst und geprüft (Beleg, MWST, Projekt), aber nie ausbezahlt.
- **Projekt** je Spese, zählt in der Nachkalkulation (exkl. MWST, ab «geprüft»).
- **MWST** je Spese (KI liest Satz und Betrag vom Beleg), Konto je Kategorie, CSV mit Konto und MWST für AbaNinja.
- **Hinweise** für die Prüfung rechnet die Sicht `spesen_liste`: doppelt, ohne Beleg (ab Betrag der Kategorie),
  älter als die Einreichfrist (Standard 60 Tage), über dem Richtwert, Fremdwährung.
- **Auszahlung als Lauf** (`spesen_auszahlungen`, mit dem Lohn oder Überweisung, Standard Lohn); Abrechnung als PDF
  mit allen Belegen, jede Person bekommt eine Glocke.
- Kategorien bekommen Art, Konto, MWST, Richtwert, Beleg ab Betrag; bestehende Werte bleiben, Kilometer und
  Kundenessen kommen dazu.

## Folgen

- Alte Spesen behalten ihren Stand; `spesen_auszahlen` bleibt für alte Aufrufe und erstellt intern einen Lauf.
- Import und Wiederherstellen (ohne angemeldete Person) umgehen die Stand-Regeln des Triggers.
- Später (Schritt 2): Abgleich mit dem Firmenkarten-Auszug, Zahlungsdatei pain.001, Erfassen ohne Netz am Handy,
  Erinnerung am Monatsende.
