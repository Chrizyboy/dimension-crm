# Modul: Spesen

**Zweck:** Jede Person erfasst ihre Spesen in wenigen Sekunden (Foto vom Beleg, die KI füllt Betrag, Datum, Kategorie,
MWST und Personen; oder Kilometer mit dem Privatauto) und sieht jederzeit, was geprüft ist und wann es ausbezahlt
wird. Die Buchhaltung prüft Beleg für Beleg mit Hinweisen, stellt Rückfragen oder lehnt ab, zahlt geprüfte Spesen in
einem Lauf aus (mit dem Lohn oder per Überweisung) und gibt die Abrechnung als PDF mit allen Belegen und als CSV mit
Konto und MWST weiter. Spesen mit Projekt fliessen in die Nachkalkulation.

Gebaut in Phase **10** nach dem Inventar der Vorlage V233 (Entscheid 0021), ausgebaut am 02.11.2026 (Entscheid 0040).

## Ablauf

`eingereicht` → (`rueckfrage` → `eingereicht`) → `geprueft` → `ausbezahlt`; Nebenausgänge `abgelehnt` (Buchhaltung, mit
Grund) und `storniert` («Zurückgezogen», von der Person bis zur Prüfung). Firmenkarte (`bezahlt_mit = firmenkarte`)
wird geprüft, aber nie ausbezahlt. Ausbezahlt, abgelehnt und zurückgezogen sind fest (Trigger).

## Ansichten (`#/expenses?ansicht=…`)

- **Meine Spesen** (`meine`, alle): Kacheln «wird ausbezahlt», «bei der Buchhaltung», Rückfragen, Jahr; Rückfrage
  beantworten (ändern und erneut einreichen), ändern und zurückziehen bis zur Prüfung, an die Buchhaltung mailen (V233).
- **Prüfen** (`pruefen`, Recht `finanzen`): Liste links, Beleg und Angaben rechts, Hinweise (doppelt, ohne Beleg,
  älter als die Frist, über dem Richtwert, Fremdwährung), «Geprüft», «Rückfrage», «Ablehnen», «Alle ohne Hinweis
  prüfen». Tasten J/K/P.
- **Auszahlen** (`auszahlen`, `finanzen`): geprüft je Person, Lauf erstellen (Datum, Art, Titel), frühere Läufe mit
  PDF und CSV. Jede Person bekommt eine Glocke.
- **Firmenkarte** (`karte`, `finanzen`): Kartenauszug als CSV einlesen (`lib/kartenauszug.ts`), Buchungen mit
  Firmenkarten-Spesen verbinden, Person je Kartenende, Belege nachfordern (Glocke), ohne Beleg erledigen mit Grund.
- **Alle Spesen** (`alle`, `finanzen`): Filter, Auswahl auszahlen, CSV.
- **Auswertung** (`auswertung`, `finanzen`): Jahr nach Monat, Kategorie, Person, Projekt; Anteil auf Projekten.
- **Regeln** (`kategorien`, `finanzen`): Mail der Buchhaltung, Kilometer-Ansatz, Einreichfrist, Standard der
  Auszahlung; Kategorien mit Konto, üblicher MWST, Richtwert und Beleg ab Betrag.
- **Handy / Monteur**: `SpesenSchnell` (grosser Knopf, Kilometer, Rückfragen, letzte Spesen mit Stand).

## Daten

- Besitzt: `spesen` (Sicht `spesen_liste` mit Projekt, Konto und `hinweise`), `spesen_auszahlungen` (Sicht
  `spesen_auszahlungen_liste`), Belege in `dokumente` (Ordner `spesen`, Bezug `spesen`).
- Besitzt auch: `firmenkarte_buchungen` (Sicht `firmenkarte_abgleich`), Abläufe `firmenkarte_einlesen`,
  `firmenkarte_verbinden`, `firmenkarte_person_setzen`, `firmenkarte_erledigen`, `firmenkarte_nachfordern`; eindeutig
  Passendes verbindet `intern.firmenkarte_zuordnen` (auch per Trigger, wenn die Spese nach dem Auszug kommt).
- Liest: `personen`, `projekte` (über `spesen_projekte()`), Einstellung `finanzen` (`spesen_kategorien`, `spesen`,
  `buchhaltung_email`).
- Abläufe: `spesen_geprueft`, `spesen_rueckfrage`, `spesen_ablehnen`, `spesen_auszahlung`, `spesen_auszahlen` (alt,
  bleibt), `spesen_stornieren`. Der Trigger `intern.spesen_pruefen` setzt Stand-Regeln, Kilometer-Betrag und MWST und
  führt den `verlauf`. Jede Person sieht nur ihre eigenen (RLS), `finanzen` sieht alle.
- `nachkalkulation` zählt geprüfte und ausbezahlte Spesen eines Projekts (exkl. MWST).

## Abhängigkeiten

- `src/services/supabase.ts`, `meldungen.ts`, `fehler.ts`, `fachfehler.ts`, `ki.ts` (Beleg lesen), `zahlteil.ts`
  (Text für PDF)
- `src/hooks/useFinanzEinstellungen.ts`, `src/lib/bild.ts`, `src/lib/datei.ts`, `pdf-lib` (erst beim Erstellen geladen)
- `src/components/shared/`: `AkteAbschnitt`, `Filterchips`, `MailDialog`, `Seitenkopf`, `Zustaende`

## Ereignisse

- **sendet:** keine (Glocken setzt die Datenbank)
- **hört auf:** keine

## Ordner

- `components/` – Seite mit Reitern, Erfassen, Prüfen, Auszahlen, Auswertung, Regeln, Meine, Handy-Karte, Startseiten-Karte
- `hooks/` – `useSpesen`, `useAuszahlungen`, `useSpesenProjekte`, `useAbrechnung`, `useAktion`, `useKategorieText`
- `services/` – `spesen` (Laden, Erfassen, Ändern, Beleg, Prüfen, Rückfrage, Ablehnen, Auszahlung), `firmenkarte`,
  `abrechnungPdf`
- `lib/` – Filter, Summen, Kilometer, MWST, CSV, Mail-Zeilen, Kartenauszug lesen (mit Tests)
