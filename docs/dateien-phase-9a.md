# Dateien aus Phase 9a – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261030000100_einkauf_grundlagen.sql`** – Neue Tabelle `projekt_material` (Materialliste je Projekt). Bestellungen bekommen Nummern B0001 …, einen festen Satz an Ständen und sind nur mit Recht «Preise» sichtbar (Einkaufspreise). Positionen lassen sich nur im Entwurf ändern, das Total rechnet die Datenbank. Lieferanten bekommen Sprache und Telefon. Sichten für Bestellungen, Lager und Materialliste.
- **`…0200_einkauf_ablaeufe.sql`** – Materialliste vorschlagen (aus der Kalkulation, sonst aus der Offerte), Bestellvorschlag (zuerst Lager reservieren, dann Entwurf beim günstigsten Lieferanten), Lager nachbestellen unter der Mindestmenge. Der Fahrplan-Schritt «Material» folgt der Materialliste.
- **`…0300_einkauf_bestellung_lager.sql`** – Freigeben, Freigabe zurücknehmen, ohne Mail bestellt, stornieren, Wareneingang (auch in Teilen) und Lagerbuchungen. Die Bestell-Mail entsteht nur für freigegebene Bestellungen; ist sie gesendet, gilt die Bestellung als bestellt.
- **`supabase/tests/einkauf.test.sql`** – 31 Prüfungen: Vorschläge, Lager zuerst, günstigster Lieferant, nichts doppelt, Mail erst nach Freigabe, gesendet = bestellt, Teillieferung, Reservierung, Entnahme, Inventur, Nachbestellen, Recht «Preise».

## Modul «Einkauf & Material» (`src/modules/purchasing/`)

- **`components/Einkauf.tsx`** – Die Seite mit vier Reitern: Bestellungen, Material je Projekt, Lager, Lieferanten.
- **`components/Bestellungen.tsx`**, **`bestellSpalten.tsx`**, **`NeueBestellungDialog.tsx`** – Liste mit Filtern (offen, freizugeben, überfällig, geliefert, alle), Suche und «Neue Bestellung».
- **`components/BestellAkte.tsx`**, **`BestellAngaben.tsx`**, **`Positionen.tsx`**, **`ArtikelWahl.tsx`** – Die Akte einer Bestellung: Angaben mit Liefertermin und Notiz, Positionen (im Entwurf änderbar, Artikel aus der Preisliste mit dem Preis des Lieferanten), Knöpfe je Stand.
- **`components/BestellungSenden.tsx`**, **`PdfAnsehen.tsx`**, **`services/bestellPdf.ts`** – Bestellung als PDF in der Sprache des Lieferanten, abgelegt bei der Bestellung, und die vorausgefüllte Mail über den Ausgangskorb.
- **`components/WareneingangDialog.tsx`**, **`StornoDialog.tsx`** – Wareneingang mit Teillieferungen; Stornieren mit Grund.
- **`components/MaterialProjekte.tsx`**, **`MaterialAkte.tsx`**, **`MaterialTabelle.tsx`**, **`MaterialZeileDialog.tsx`** – Offene Projekte mit dem Stand ihrer Materialliste; die Liste mit «da», «unterwegs», «fehlt», Vorschlag und Bestellvorschlag; reservieren, an die Baustelle ausgeben, freigeben.
- **`components/Lager.tsx`**, **`LagerBuchenDialog.tsx`** – Lager Bulle mit Bestand, reserviert, frei, unterwegs und Mindestmenge; buchen und nachbestellen.
- **`components/Lieferanten.tsx`**, **`LieferantDialog.tsx`** – Bestell-Mail, Kundennummer, Sprache, aktiv.
- **`components/HeuteKarte.tsx`** – Karte «Einkauf» auf der Startseite.
- **`services/`**, **`hooks/`**, **`lib/anzeige.ts`** (mit Tests), **`types.ts`**, **`schema.ts`**.

## Übrige Änderungen

- **`src/app/purchasing.tsx`** – Adresse `#/purchasing?reiter=material&projekt=…` und `#/purchasing?bestellung=…`.
- **`src/modules/projects/components/AkteFahrplan.tsx`** – Beim Schritt «Material» ein Link zur Materialliste.
- **`src/components/shared/MailDialog.tsx`**, **`src/services/ausgang.ts`** – Eigener Hinweistext und Schlüssel gegen doppelte Mails.
- **`src/layouts/Startseite.tsx`** – Vierte Karte «Einkauf».
- **`e2e/einkauf.spec.ts`** – Browser-Test: alle Reiter ohne Verstösse, Lieferant anlegen, Bestellung bis Wareneingang, Bestellung per Mail in den Ausgangskorb und stornieren.
- **`package.json`** – `pdf-lib` für das Bestell-PDF.
