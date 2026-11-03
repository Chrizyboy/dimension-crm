# Modul: Wartungsverträge

**Zweck:** Verkauft und betreut die Wartungsverträge nach den Paketen der Website (Essentiel, Comfort, Premium):
Anlage, Paket und Preis, Laufzeit und Kündigung, Inspektionen, Jahresrechnungen und der Vertrag als PDF in der
Sprache des Kunden.

**Stand:** gebaut in Phase **9** (V233: Verträge, Leistungen WA_LEIST), Pakete der Website seit 2.11.2026.
Entscheide: `docs/entscheidungen/0018-projekte-service-wartung.md`, `0037-wartung-pakete-website.md`,
`0044-wartung-inspektionen.md`.

## So läuft es

1. «Neuer Vertrag»: Kunde, Anlage (aus einer bestehenden Anlage vorgefüllt), Paket, Preis (Tarif nach kWp als
   Vorschlag, Rabatt möglich und markiert), Bestandsaufnahme bei Fremd- oder älteren Anlagen, Beginn, Sprache.
   Nummer W001 …, Rhythmus und erste Inspektion setzt die Datenbank.
2. Liste mit Kopfzahlen (aktiv, Inspektion fällig, Rechnung fällig, kündbar, gekündigt) und Filtern.
3. Akte: Laufzeit mit «kündbar bis», Angaben, Leistungen, Inspektionen, Rechnungen; Aktionen Inspektion erledigt,
   Bearbeiten, Kündigung erfassen/zurücknehmen, Jahresrechnung (Recht `finanzen`), PDF.
4. Jahresrechnungen legt der Zeitplan 30 Tage vor jedem Vertragsjahr als Entwurf an.
5. Reiter «Inspektionen»: fällige (90 Tage) und geplante Inspektionen; «Termin planen» setzt Tag, Zeit und Person.
   Die Ankündigung an den Kunden legt der Zeitplan 14 Tage vorher in den Ausgangskorb (Freigabe per Klick).
   Die Inspektion erscheint am Handy der Person in «Mein Tag» (Modul Baustelle, Rapport-Art `wartung`, Prüfpunkte
   nach Paket mit Vorjahreswerten).
6. Reiter «Ohne Vertrag»: eigene Anlagen ohne Vertrag mit passendem Paket und Preis; Angebot einzeln oder als Serie,
   Stand angenommen/abgelehnt.

## Daten

- Besitzt: `wartungsvertraege`, `wartung_angebote`, Sicht `wartung_ohne_vertrag`, Einstellungen `wartung_pakete` (Pakete, Preise, Bedingungen) und
  `wartung_leistungen` (alte Leistungen).
- Liest: `kontakte`, `objekte`, `projekte`, `anlagen`, `komponenten`, `rechnungen`, `auswahlwerte` (Stand).
- Abläufe: `wartung_erledigt`, `wartung_tarif`, `wartung_laeuft_bis`, `wartung_kuendigen`,
  `wartung_kuendigung_zuruecknehmen`, `wartung_rechnung_erstellen`, `wartung_jahreslauf` (Zeitplan),
  `wartung_termin_setzen`, `wartung_ankuendigen`, `wartung_ankuendigungen` (Zeitplan), `wartung_angebot_senden`,
  `wartung_angebot_stand`, `wartung_vorjahr` (Handy).

## Abhängigkeiten

- `src/services/supabase.ts`, `src/services/kontakte.ts` (über `KundeWahl`), `src/services/fachfehler.ts`,
  `src/services/meldungen.ts`, `src/hooks/useDrucken.ts`, `src/hooks/useMwst.ts`.

## Ereignisse

- **sendet:** keine.
- **hört auf:** keine.

## Ordner

- `components/` – Seite, Kopfzahlen, Spalten, Akte, Dialoge (Vertrag, Paket, Preis, Anlage, Kündigung), Druck
- `hooks/`, `services/`, `lib/` (Tarif, Laufzeit, Liste, Fälligkeit), `types.ts`, `schema.ts`, `index.ts`
