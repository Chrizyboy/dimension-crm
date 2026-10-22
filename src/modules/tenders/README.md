# Modul: Ausschreibungen

**Zweck:** Findet öffentliche Ausschreibungen, Baugesuche und Zuschläge rund um Muri und Bulle, sortiert sie automatisch in drei Spuren (Angebot, Akquise, Beobachten) und führt sie bis zur Offerte oder zum Anschreiben.

Konzept (von Chris am 21.10.2026 freigegeben): [Claude Doc](https://claude.ai/artifact/KkeHUwF5oaTugDwPyW3Tcm). Entscheid: `docs/entscheidungen/0017-ausschreibungs-monitor.md`.

**Stand:** gebaut in Phase **8b**. Im V233-Export gab es keine Treffer zu übernehmen (nur das Recht «tenders»).

## So läuft es

1. simap (06:52, 12:00, 17:00) und das Amtsblatt (06:52, Mo–Sa) werden gelesen; AG, LU, FR, VD, NE erfasst der Innendienst von Hand.
2. Die Datenbank bewertet (Stichworte, Fahrzeit), wählt die Spur, erkennt Doppelte und sperrt die Vergabestelle bis zum Zuschlag.
3. **Angebot:** Andy entscheidet «Teilnehmen» → Submissions-Offerte und drei Fristen im Kalender mit Erinnerungen.
4. **Akquise:** Entwurf an die richtige Firma → Andy bewilligt → Chris sendet → Lead «Angeschrieben», Wiedervorlage nach 5 Arbeitstagen, höchstens einmal nachfassen.
5. **Beobachten:** wartet auf Zuschlag, Planer, Baubewilligung oder Datum; sonst nach 6 Monaten archiviert.

## Daten

- Besitzt: `ausschreibungen`, `ausschreibung_kontakte`, `anschreiben`, `kontaktsperren`, `quellen_laeufe`, Einstellung `ausschreibungen`.
- Schreibt über Datenbank-Funktionen in: `kontakte`, `verkaufschancen` (Lead), `offerten` (Submission), `kalender_eintraege`, `aufgaben`, `aktivitaeten`, `ausgangskorb`.
- Liest: `standorte`, `plz_verzeichnis`, `personen`.

## Abhängigkeiten

- `src/services/supabase.ts` (Daten), `src/services/integrationen.ts` (`rufeFunktion('ausschreibungen', 'lesen')`, `ausgangJetztSenden`), `src/services/fachfehler.ts`, `src/services/meldungen.ts`, `src/stores/benachrichtigungen.ts` (Glocke).
- Andere Module werden nicht importiert: Lead, Offerte und Kalendereintrag entstehen in der Datenbank.

## Ereignisse

- **sendet:** keine (die Abläufe liegen in der Datenbank, die Listen der anderen Bereiche laden neu).
- **hört auf:** keine. Antworten erkennt ein Trigger auf `aktivitaeten` an der AS-Nummer im Betreff.

## Ordner

- `components/` – Seite, Liste, Akte, Freigabe in Serie, Quellen, Sperrliste, Regeln, Trichter, Startseiten-Karte
- `hooks/` – Daten laden (`useAusschreibungen`), Änderungen mit Fehlermeldung (`useAktion`)
- `services/` – Zugriff auf Supabase und die Server-Funktion
- `lib/` – Anzeige-Hilfen (Farben, Fristen) und welche Entscheide wann möglich sind
- `types.ts`, `schema.ts`, `index.ts`
