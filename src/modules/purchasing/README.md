# Modul: Einkauf & Material

**Zweck:** Material je Projekt erfassen (Vorschlag aus Kalkulation oder Offerte), bei den Lieferanten bestellen
(Krannich, Solarmarkt, Tritec, PM Green u. a.), Liefertermine überwachen und den Wareneingang buchen. Eigenes
Lager nur in Bulle (Bestand, Reservierung je Projekt, Mindestmenge); Lagerorte sind Daten.

Freigegeben von Chris am 21.10.2026 (ERP-Lückenanalyse, Entscheid 0009), gebaut in Phase 9a (Entscheid 0019),
vervollständigt am 2.11.2026 (Entscheid 0039): Leitstand, Bestellen je Lieferant (Sammelbestellung), Materialplan
mit «bestellen bis», Freigabegrenze, Auftragsbestätigung (KI liest Mail/PDF), Lieferung, Rechnungsabgleich.

## Daten

- Besitzt: `projekt_material`, `bestellungen`, `bestellpositionen`, `lagerbestand`, `lagerbewegungen`, `lieferanten`.
- Liest: `projekte`, `kalkulationen`, `offerten`, `artikel`, `lieferantenpreise` (Recht `preise`), `lagerorte`.
- Sichten: `bestellungen_liste` (mit `schritt`, `gefaehrdet`, `projekte`), `projekt_material_stand`, `lager_uebersicht`,
  `einkauf_bedarf` (Bedarf je Lieferant mit `bestellen_bis`), `materialplan` (Deckung je Projekt), `lieferanten_kennzahlen`.
- Einstellung `einkauf` (nur Administration): Freigabegrenze, wer freigibt, Puffer, Standard-Lieferzeit, Erinnerungen.
- Abläufe (Datenbank): `projekt_material_vorschlagen`, `bestellvorschlag`, `lager_nachbestellen`,
  `bestellung_freigeben`, `bestellung_zuruecknehmen`, `bestellung_bestellt`, `bestellung_stornieren`,
  `wareneingang_buchen`, `lager_buchen`, `sammelbestellung`, `bestellung_vorlegen`, `bestellung_ab_erfassen`,
  `bestellung_rechnungen`, `bestellung_rechnung`, `bestellung_mails`, `einkauf_melden` (Zeitplan, stündlich).
  Fehler als `einkauf.*`.

## Abhängigkeiten

- `src/services/ausgang.ts` und `src/components/shared/MailDialog.tsx`: Bestell-Mail über den Ausgangskorb.
- `src/services/fachfehler.ts`, `meldungen.ts`, `fehler.ts`.
- `pdf-lib` für das Bestell-PDF (erst beim Erstellen geladen).
- `src/services/ki.ts` (Aktion `auftragsbestaetigung`) und `src/services/posteingang.ts` (Mailtext der AB).
- `kreditor_zahlungen` (Finanzen, aus AbaNinja) für den Rechnungsabgleich.

## Ereignisse

- **sendet:** keine. Glocken (Freigabe, AB fehlt, Montage in Gefahr, bestellen bis) kommen aus der Datenbank. Der Stand «bestellt» und der Fahrplan-Schritt «Material» im Projekt folgen in der Datenbank.
- **hört auf:** keine.

## Ordner

- `components/` – Seite mit sechs Reitern (Leitstand, Materialplan, Bestellen, Bestellungen, Lager, Lieferanten),
  Bestell-Akte (Schritte, AB, Lieferung, Rechnung, Mails), Leitstand, Startseiten-Karte
- `hooks/` – Daten laden (`useEinkauf`), Aktionen mit Fehlermeldung (`useAktion`)
- `services/` – Bestellungen, Material, Lager und Lieferanten, Bestell-PDF
- `lib/anzeige.ts` – Mengen anzeigen und lesen (mit Tests); `lib/leitstand.ts` – Spalten und Kopfzahlen (mit Tests)
- `types.ts`, `schema.ts` (Lieferant), `index.ts`
