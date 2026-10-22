# Modul: Einkauf & Material

**Zweck:** Material je Projekt erfassen (Vorschlag aus Kalkulation oder Offerte), bei den Lieferanten bestellen
(Krannich, Solarmarkt, Tritec, PM Green u. a.), Liefertermine überwachen und den Wareneingang buchen. Eigenes
Lager nur in Bulle (Bestand, Reservierung je Projekt, Mindestmenge); Lagerorte sind Daten.

Freigegeben von Chris am 21.10.2026 (ERP-Lückenanalyse, Entscheid 0009), gebaut in Phase 9a (Entscheid 0019).

## Daten

- Besitzt: `projekt_material`, `bestellungen`, `bestellpositionen`, `lagerbestand`, `lagerbewegungen`, `lieferanten`.
- Liest: `projekte`, `kalkulationen`, `offerten`, `artikel`, `lieferantenpreise` (Recht `preise`), `lagerorte`.
- Sichten: `bestellungen_liste`, `projekt_material_stand`, `lager_uebersicht`.
- Abläufe (Datenbank): `projekt_material_vorschlagen`, `bestellvorschlag`, `lager_nachbestellen`,
  `bestellung_freigeben`, `bestellung_zuruecknehmen`, `bestellung_bestellt`, `bestellung_stornieren`,
  `wareneingang_buchen`, `lager_buchen`. Fehler als `einkauf.*`.

## Abhängigkeiten

- `src/services/ausgang.ts` und `src/components/shared/MailDialog.tsx`: Bestell-Mail über den Ausgangskorb.
- `src/services/fachfehler.ts`, `meldungen.ts`, `fehler.ts`.
- `pdf-lib` für das Bestell-PDF (erst beim Erstellen geladen).

## Ereignisse

- **sendet:** keine. Der Stand «bestellt» und der Fahrplan-Schritt «Material» im Projekt folgen in der Datenbank.
- **hört auf:** keine.

## Ordner

- `components/` – Seite mit vier Reitern, Bestell-Akte, Materialliste, Lager, Lieferanten, Startseiten-Karte
- `hooks/` – Daten laden (`useEinkauf`), Aktionen mit Fehlermeldung (`useAktion`)
- `services/` – Bestellungen, Material, Lager und Lieferanten, Bestell-PDF
- `lib/anzeige.ts` – Mengen anzeigen und lesen (mit Tests)
- `types.ts`, `schema.ts` (Lieferant), `index.ts`
