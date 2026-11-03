# Modul: Ausschreibungen

**Zweck:** Findet öffentliche Ausschreibungen, Baugesuche und Zuschläge rund um Muri und Bulle, sortiert sie automatisch in drei Spuren (Angebot, Akquise, Beobachten) und führt sie bis zur Offerte oder zum Anschreiben.

Konzept (von Chris am 21.10.2026 freigegeben): [Claude Doc](https://claude.ai/artifact/KkeHUwF5oaTugDwPyW3Tcm). Entscheid: `docs/entscheidungen/0017-ausschreibungs-monitor.md`.

**Stand:** gebaut in Phase **8b**, am 02.11.2026 vollständig gemacht (Entscheid `0047`: Go/No-Go, Eckdaten, Checkliste,
Vier-Augen-Prüfung, Öffnungsprotokoll, Zuschlag → Projekt, Fristen-Agenda, Nachweise, Referenzen, Auswertung, KI-Erfassung).
Im V233-Export gab es keine Treffer zu übernehmen (nur das Recht «tenders»).

## So läuft es

1. simap (06:52, 12:00, 17:00) und das Amtsblatt (06:52, Mo–Sa) werden gelesen; AG, LU, FR, VD, NE erfasst der Innendienst von Hand.
2. Die Datenbank bewertet (Stichworte, Fahrzeit), wählt die Spur, erkennt Doppelte und sperrt die Vergabestelle bis zum Zuschlag.
3. **Angebot:** Go/No-Go-Vorschlag (0–100) → Andy entscheidet «Teilnehmen» (oder «Nicht teilnehmen» mit Grund) → Submissions-Offerte, Fristen im Kalender, Eckdaten und Kriterien, Checkliste → ab CHF 100'000 prüft eine zweite Person → «Eingereicht» mit Betrag → Öffnungsprotokoll → Zuschlag (Projekt entsteht) oder Absage (Gewinner, Beschwerdefrist).
4. **Akquise:** Entwurf an die richtige Firma → Andy bewilligt → Chris sendet → Lead «Angeschrieben», Wiedervorlage nach 5 Arbeitstagen, höchstens einmal nachfassen.
5. **Beobachten:** wartet auf Zuschlag, Planer, Baubewilligung oder Datum; sonst nach 6 Monaten archiviert.

## Daten

- Besitzt: `ausschreibungen`, `ausschreibung_kontakte`, `anschreiben`, `kontaktsperren`, `quellen_laeufe`, `ausschreibung_angebote` (Öffnungsprotokoll), `firmen_nachweise` (Speicher `nachweise`), `submission_referenzen`, Einstellung `ausschreibungen`.
- Schreibt über Datenbank-Funktionen in: `kontakte`, `verkaufschancen` (Lead), `offerten` (Submission), `projekte` (Zuschlag über `auftrag_erstellen`), `kalender_eintraege`, `aufgaben`, `aktivitaeten`, `ausgangskorb`.
- Liest: `standorte`, `plz_verzeichnis`, `personen`.

## Abhängigkeiten

- `src/services/supabase.ts` (Daten), `src/services/integrationen.ts` (`rufeFunktion('ausschreibungen', 'lesen')`, `ausgangJetztSenden`), `src/services/fachfehler.ts`, `src/services/meldungen.ts`, `src/stores/benachrichtigungen.ts` (Glocke).
- Andere Module werden nicht importiert: Lead, Offerte und Kalendereintrag entstehen in der Datenbank.

## Ereignisse

- **sendet:** keine (die Abläufe liegen in der Datenbank, die Listen der anderen Bereiche laden neu).
- **hört auf:** keine. Antworten erkennt ein Trigger auf `aktivitaeten` an der AS-Nummer im Betreff.

## Ordner

- `components/` – Seite, Leitstand (Board), Fristen, Nachweise und Referenzen, Auswertung, Freigabe in Serie, Quellen, Sperrliste, Regeln, Trichter, Startseiten-Karte
- `components/akte/` – Akte als Seite: Kopf, Schritte, Eckdaten, Kriterien, Fristen, Go/No-Go, Kalkulation, Checkliste, Öffnungsprotokoll, Verlauf
- `hooks/` – Daten laden (`useAusschreibungen`), Änderungen mit Fehlermeldung (`useAktion`)
- `services/` – Zugriff auf Supabase und die Server-Funktion
- `lib/` – Anzeige-Hilfen, Board-Spalten, Fristenplan (Arbeitstage rückwärts), Arbeitsschritte, welche Entscheide wann möglich sind
- `types.ts`, `schema.ts`, `index.ts`
