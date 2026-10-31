# Modul: Werkverträge (`workcontracts`)

**Zweck:** Aus der angenommenen Offerte den Auftrag erstellen (Projekt, Zahlungsplan, Werkvertrag), Zahlungsbedingung per Klick wählen (Standard 40/30/30, Batterien 70/30, 100 %, eigene Anzahlung in CHF, eigene Raten mit Bezeichnung und Prozent …), den Vertrag nach Vorlage Muri (DE/FR, AGB zweispaltig) als PDF erstellen, mit der Anzahlungsrechnung an den Kunden senden und Versand, Unterschrift oder Storno festhalten.

**Stand:** Phase 7 gebaut, Phase 8: Mail über den Ausgangskorb. 31.10.2026: Vorlage Muri, Zahlungsbedingungen per Klick, Anzahlungsrechnung (Entscheid 0031). Eigene Unterschrift der sendenden Person (Mein Konto, `src/services/unterschrift.ts`) im Kasten Dimension Solaire.

## Daten

- liest `werkvertraege_liste` (mit `angaben` und `anzahlung`), `offerten_liste`, `standorte`, Auswahlliste `zahlungskondition`, `einstellungen` (MWST, `werkvertrag`)
- schreibt über `auftrag_erstellen` (mit `kondition`, `anzahlung_rappen`, `raten`, `angaben`), `werkvertrag_status`, `werkvertrag_anzahlungsrechnung`; Zahlungsplan über `zahlungsplan_vorschlag` (ganze Franken)
- legt das Vertrags-PDF in `dokumente` ab (`werkvertraege/<id>/…`), Einstellung `werkvertrag` ändert nur die Administration
- `betrag_rappen` ist inkl. MWST. Details: `docs/datenmodell.md` (Phase 7), Entscheide 0011 und 0015

## Abhängigkeiten

- `src/services/supabase`, `meldungen`, `fehler`, `fachfehler`, `rechnungsdaten`, `rechnungPdf` (Anzahlungsrechnung); `src/hooks/useMwst`, `useAuswahl`; `src/components/shared/MailDialog`; `pdf-lib` (erst beim Erstellen geladen)
- Zur Offerte geht es über die Adresse (`/quotes?offerte=…`).

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `components/` – Liste, Akte, Auftrag-Dialog (Zahlung, Angaben im Vertrag), Senden, Status, Einstellungen
- `hooks/`, `services/` – Laden und Speichern
- `lib/` – Vertragsinhalt und AGB (DE/FR), Zahlungsplan (mit Tests), Status
- `services/vertragPdf.ts` – PDF nach Vorlage Muri
- `types.ts`, `index.ts`
