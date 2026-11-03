# Modul: Adressbuch

**Zweck:** Alle Geschäftspartner an einem Ort (Netzbetreiber, Lieferanten, Hersteller, Subunternehmer, Gemeinden,
Planer, Elektriker, Vermittler), je mit ganzer Seite: Ansprechpersonen, Steckbrief je Rolle, Nachweise, offene
Netzgesuche, Bestellungen, Aufträge mit Bewertung, vermittelte Kunden, Dokumente und Verlauf. Kunden nur mit
«Auch Kunden zeigen». Hier liegt auch der Papierkorb für alle Kontakte.

**Stand:** Neu gebaut 03.11.2026, Entscheid 0049.

## Daten

- liest: `adressbuch_uebersicht`, `partner_akte()`, `partner_dubletten()`, `netzbetreiber_stand()`,
  `auswahlwerte` (`partnerrolle`, `partnernachweis`), `einstellungen.adressbuch`, Kunden über `src/services/kontakte.ts`
- schreibt: `kontakte`, `kontakt_rollen`, `partner_angaben`, `partner_nachweise`, `kontakt_zugehoerigkeiten`
  (über `src/services/zugehoerigkeiten.ts`), `aktivitaeten`, `dokumente` (Speicher `dokumente`, Ordner `partner/<id>`),
  Bewertung auf `subunternehmer_auftraege`
- Edge Function `adressbuch`: `uid_suche` (alle), `netzbetreiber_einlesen` (nur Administration)

## Abhängigkeiten

- `src/services/integrationen.ts` (`rufeFunktion`), `src/services/zugehoerigkeiten.ts`, `src/hooks/useKontakte.ts`
- `src/components/shared/Datentabelle.tsx`, `Filterchips.tsx`
- Die Route `src/app/contacts.tsx` setzt Liste, Partnerseite und Dialog zusammen; Kunden öffnen in `#/customers`.

## Ereignisse

- keine. Fristen der Nachweise (`partner_fristen_melden`) und die Provision laufen in der Datenbank.

## Export (index.ts)

- `Adressbuch` – Liste mit Suche, Rollen-Filter, Kennzahlen, «Auch Kunden zeigen» und Papierkorb
- `PartnerSeite` – ganze Seite eines Partners (`?kontakt=…`)
- `NeuerPartner` – Dialog «Neuer Eintrag» mit UID-Register und Warnung vor Doppelten
