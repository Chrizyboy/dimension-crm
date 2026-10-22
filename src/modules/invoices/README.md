# Modul: Rechnungen

**Zweck:** Rechnungen aus dem Zahlungsplan, als Schlussrechnung mit Nachträgen, aus Service-Rapporten,
Wartungsverträgen oder frei erstellen, stellen, als Entwurf an AbaNinja geben oder als PDF mit QR-Zahlteil per
Mail senden, Zahlungen erfassen und mahnen (Stufe 1–3). Dazu die Firmenangaben je Standort.

Freigegeben von Chris am 21.10.2026 (ERP-Lückenanalyse, Entscheid 0009), gebaut in Phase **10**, Entscheid 0021.

## Reiter (`#/invoices?reiter=…&rechnung=…`)

- **Rechnungen** (`rechnungen`): Liste mit Filter offen, überfällig, Entwürfe, bezahlt, alle; Suche; CSV-Export;
  «Neue Rechnung» (Kunde, dann Tranche, Projekt, Wartungsvertrag oder frei); «Abgleich AbaNinja».
  Die Akte ist ein Seitenpanel.
- **Zu verrechnen** (`verrechnen`): Tranchen ohne Rechnung (fällige zuerst) und kostenpflichtige Rapporte.
- **Firmenangaben** (`firmen`): Name, Adresse, MWST-Nr., IBAN, Bank, Kontakt, Zahlungsfrist je Standort.
  Ändern nur mit Recht `finanzen`.

## Daten

- Besitzt: `rechnungen`, `rechnung_zahlungen` (Sichten `rechnungen_liste`, `offene_tranchen`,
  `offene_service_rapporte`), Spalten `firmen.iban`, `bank`, `telefon`, `email`, `zahlungsfrist_tage`.
- Liest: `kontakte`, `objekte` (Adresse), `projekte`, `zahlungsplan`, `nachtraege`, `rapporte`,
  `wartungsvertraege`, Einstellung `finanzen` (Stundensatz, Mahnfrist).
- Abläufe nur über Datenbank-Funktionen: `rechnung_entwurf`, `rechnung_speichern`, `rechnung_stellen`
  (Nummer R2026-001, Fälligkeit), `rechnung_stornieren`, `rechnung_mahnen`, `abaninja_abgleich_anwenden`.
  Der Zahlungsstand (teilbezahlt, bezahlt, Zahlungsplan bezahlt) rechnet der Trigger auf `rechnung_zahlungen`.

## Nach aussen

- **AbaNinja:** gestellte Rechnung als Entwurf übergeben, Abgleich holt Zahlungen und Lieferantenrechnungen
  (Edge Function `abaninja`, über `src/services/integrationen.ts`). Senden, Buchen und Löschen geschieht in AbaNinja.
- **Mail:** PDF (Rechnung oder Mahnung) wird bei der Rechnung abgelegt und geht nur über den Ausgangskorb.

## Abhängigkeiten

- `src/services/supabase.ts`, `integrationen.ts`, `meldungen.ts`, `fehler.ts`, `fachfehler.ts`
- `src/hooks/useFinanzEinstellungen.ts`, `src/lib/datei.ts`
- `src/components/shared/`: `Datentabelle`, `Filterchips`, `AkteAbschnitt`, `MailDialog`, `KundeWahl`, `Seitenkopf`, `Zustaende`
- `pdf-lib` (erst beim Erstellen eines PDFs geladen)

## Ereignisse

- **sendet:** keine
- **hört auf:** keine (Zahlungsplan und Projekt-Fahrplan erfahren die Zahlung über die Datenbank)

## Ordner

- `components/` – Seite, Liste, Zu verrechnen, Akte mit Positionen, Dialoge (Neue Rechnung, Zahlung, Mahnen,
  Storno, Senden), Firmenangaben
- `hooks/` – `useRechnungen`, `useAktion`
- `services/` – `rechnungen` (Datenzugriff), `rechnungPdf`, `zahlteil` (QR-Zahlteil)
- `lib/` – Beträge, Fälligkeit, Mahnbarkeit, CSV, QR-Daten nach Swiss Payment Standard (mit Tests)
- `types.ts`, `schema.ts`, `index.ts`
