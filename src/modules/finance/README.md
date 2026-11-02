# Modul: Finanzen

**Zweck:** Finanzen für Geschäftsleitung und Buchhaltung (Entscheid 0040): Cockpit, Lieferantenrechnungen mit
Freigabe, Zahllauf mit zweiter Person, Liquidität Woche für Woche, Projekte & Marge, Konten mit Kontoauszug, MWST und
Monatsabschluss. Je Gesellschaft (Muri GmbH, Bulle Sàrl) oder beide. Nur mit Recht `finanzen`.

Gebaut in Phase **10** nach dem Inventar der Vorlage V233 (Liquiditätsplanung), Entscheid 0009 (Nachkalkulation),
0021 und 0040.

## Reiter (`#/finance?reiter=…`, alte Namen führen weiter)

- **Cockpit** (`cockpit`): Geld auf den Konten, tiefster Stand, Debitoren, Kreditoren, nächste MWST; Wochenbalken
  mit Reserve; «Heute zu tun» (Skonto, Betreibung, Freigaben, Zahllauf, Kontostand alt, MWST); Kundenrechnungen nach
  Alter (gemahnt wird unter Rechnungen).
- **Lieferantenrechnungen** (`lieferanten`): wie früher «Zahlungen», dazu Prüfschritt als Filter und Akte je
  Rechnung (Vergleich mit Bestellung, Ablauf, Freigeben/Zu klären/Zurückhalten).
- **Zahllauf** (`zahllauf`): vorbereiten (Vorschlag), freigeben durch zweite Person, ausgeführt, verwerfen.
- **Liquidität** (`liquiditaet`): Wochen, Material je Baustelle, Fixkosten, erwartete Eingänge.
- **Projekte & Marge** (`marge`): Marge je Produkt, angefangene Arbeiten, Projekte Ist/Soll, Nachkalkulation.
- **Konten, MWST & Abschluss** (`abschluss`): Bankkonten mit camt.053, MWST je Periode, Monatsabschluss mit CSV,
  Einstellungen der Vorschau.

## Daten

- Besitzt: `kreditor_zahlungen` (mit `projekt_id`, `lieferant_id`, `abaninja_uuid`, `offen_rappen`, `bezahlt_am`,
  `firma_id`, `pruefung`, Skonto, `zahllauf_id`), `material_zahlungen`, `fixkosten`, `erwartete_eingaenge`,
  `finanz_einstellungen` (`vorlage.main`), `finanz_konten`, `konto_buchungen`, `zahllaeufe`, `mwst_abrechnungen`,
  `monatsabschluesse`.
- Funktionen: `kreditor_pruefung`, `zahllauf_*`, `kontoauszug_einlesen`, `mwst_schaetzung`, `marge_uebersicht`,
  `monatsabschluss_stand`; Sicht `finanz_projekt_firma`.
- Liest: `rechnungen_liste`, `offene_tranchen`, `rechnung_zahlungen` (nach dem Saldo-Datum), `projekte`,
  Funktion `nachkalkulation`.
- Die Vorschau rechnet die App (`lib/vorschau.ts`), weil Szenario, Anpassungen und Löhne live umschalten.

## Abhängigkeiten

- `src/services/supabase.ts`, `meldungen.ts`, `fehler.ts`
- `src/components/shared/`: `AkteAbschnitt`, `Filterchips`, `Seitenkopf`, `Zustaende`

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `components/` – Seite, Übersicht mit Wochenbalken, je Reiter eine Liste mit Dialog, Zahllauf, Karte für die Startseite
- `hooks/` – `useFinanzen` (auch Projekte, Nachkalkulation), `useAktion`
- `services/` – `finanzen` (Laden, Listen), `ablaeufe` (Freigabe, Zahllauf, Konten, MWST, Marge, Abschluss)
- `lib/` – Datum, Vorschau, Gesellschaft (`firma.ts`), Cockpit, camt.053, Marge, offene Posten (CSV), mit Tests
- `types.ts`, `schema.ts`, `index.ts`
