# Modul: Rechnungen

**Zweck:** Rechnungen aus dem Zahlungsplan, als Schlussrechnung mit Nachträgen, aus Service-Rapporten,
Wartungsverträgen oder frei erstellen, stellen, als Entwurf an AbaNinja geben oder als PDF mit QR-Zahlteil per
Mail senden, Zahlungen erfassen und mahnen (Stufe 1–3). Dazu die Firmenangaben je Standort.

Freigegeben von Chris am 21.10.2026 (ERP-Lückenanalyse, Entscheid 0009), gebaut in Phase **10**, Entscheid 0021.
Ausgebaut für alle Rollen am 2.11.2026 (Entscheid 0040): Übersicht, Mahnlauf mit Freigabe, «Verrechnen auslösen»
durch die Projektleitung, Zahlungsstand für Projektleitung und Verkauf, Eingangsrechnungen mit Visum.

## Reiter (`#/invoices?reiter=…&rechnung=…&eingang=…`)

Mit Recht `finanzen` alle Reiter (Start «Übersicht»), sonst nur «Meine Projekte» (Start) und «Eingangsrechnungen».

- **Übersicht** (`uebersicht`): offen, überfällig, erwartet in 30 Tagen, gestellt im Monat, Meilensteine ohne
  Rechnung, Ø Tage bis zur Zahlung; «Heute zu tun» (jede Zeile führt in die gefilterte Liste), Altersstruktur,
  offen je Standort, grösste Überfällige (`rechnungen_uebersicht`).
- **Rechnungen** (`rechnungen`): Liste mit Filter offen, überfällig, gemahnt, nicht versendet, Mahnsperre,
  Entwürfe, bezahlt, alle; Suche; CSV-Export; «Neue Rechnung»; «Abgleich AbaNinja». Akte als Seitenpanel mit
  Schritten, Angaben (abweichende Rechnungsadresse, Referenz des Kunden, Versand Mail/Post), Mahnsperre,
  Zahlungszusage, Ausbuchen (Rundung, Skonto, Kulanz, Verlust) und Verlauf mit Notiz/Anruf.
- **Zu verrechnen** (`verrechnen`): Tranchen ohne Rechnung mit Meilenstein (IBN, Montage, Vertrag, Baubeginn,
  Datum) und wer auslöst, dazu kostenpflichtige Rapporte.
- **Mahnlauf** (`mahnlauf`): jeden Montag (Zeitplan `rechnungen-mahnlauf`, Glocke an die Freigabe-Person)
  Erinnerung → 1.–3. Mahnung → Betreibung prüfen, Übersprungenes mit Grund (Minimum, Sperre, Zusage, schon
  unterwegs, Reklamation). Nur die Freigabe-Person (`einstellungen.finanzen.mahnlauf.freigabe_person_ids`, Chris)
  gibt frei; ein Trigger auf dem Ausgangskorb lässt sonst niemanden Mahnungen freigeben. Per Mail zählt die
  Stufe erst beim Senden, per Post sofort (`rechnung_mahnen`).
- **Eingangsrechnungen** (`eingang`): Lieferantenrechnungen aus dem Abgleich (`kreditor_zahlungen`) oder von
  Hand, Erstvisum der Projektleitung, Zweitvisum der GL ab `einstellungen.finanzen.eingang.visum_gl_ab_rappen` oder
  ohne Bestellung (Vier-Augen), Vergleich mit der Bestellung, «bereit» = in AbaNinja zahlen.
- **Meine Projekte** (`projekte`): Zahlungsstand der eigenen Projekte (nur lesen); bei erreichtem Meilenstein
  «Verrechnen auslösen» für den zuständigen Projektleiter (`tranche_verrechnen`, legt den Entwurf an, Glocke an
  die Buchhaltung).
- **Firmenangaben** (`firmen`): Name, Adresse, MWST-Nr., IBAN, Bank, Kontakt, Zahlungsfrist je Standort.
  Ändern nur mit Recht `finanzen`.

## Daten

- Besitzt: `rechnungen`, `rechnung_zahlungen`, `rechnung_ereignisse`, `eingangsrechnungen` (Sichten
  `eingangsrechnungen_liste`, `rechnungen_liste`, `offene_tranchen`,
  `offene_service_rapporte`), Spalten `firmen.iban`, `bank`, `telefon`, `email`, `zahlungsfrist_tage`.
- Liest: `kontakte`, `objekte` (Adresse), `projekte`, `zahlungsplan`, `nachtraege`, `rapporte`,
  `wartungsvertraege`, Einstellung `finanzen` (Stundensatz, Mahnfrist).
- Abläufe nur über Datenbank-Funktionen: `rechnung_entwurf`, `rechnung_speichern`, `rechnung_stellen`
  (Nummer R2026-001, Fälligkeit), `rechnung_stornieren`, `rechnung_mahnen`, `abaninja_abgleich_anwenden`,
  `rechnung_angaben`, `rechnung_mahnsperre`, `rechnung_zusage`, `rechnung_notiz`, `rechnung_ausbuchen`,
  `rechnung_verlauf`, `mahnlauf_vorschlag`, `mahnung_darf_freigeben`, `tranche_verrechnen`,
  `zahlungsstand_projekte`, `eingang_speichern`, `eingang_visieren`, `eingang_bezahlt`, `eingang_vergleich`.
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
- `services/` – `rechnungen` (Datenzugriff), `akte` (Angaben, Sperre, Verlauf), `mahnlauf` (Übersicht,
  Zahlungsstand), `mahnungSenden` (Mahnlauf ausführen), `eingang` (Eingangsrechnungen)
- `lib/` – Beträge, Fälligkeit, Mahnbarkeit, CSV, QR-Daten nach Swiss Payment Standard (mit Tests)
- `types.ts`, `schema.ts`, `index.ts`
