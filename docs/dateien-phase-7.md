# Dateien aus Phase 7 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261026000100_offerten_ablaeufe.sql`** – Die Offert-Regeln aus V233 als Funktionen: Offertnummer pro Standort (`naechste_offertnummer`), Offerte anlegen, Status der «Neuen Offerten» (in Bearbeitung, Rückfrage, zur Prüfung, versendet), Versionen erfassen und entfernen, «Zurück zur Offerte», Entscheid beim Nachfassen und Werte setzen (aus PDF oder Kalkulation, wahlweise nur leere Felder). Dazu der MWST-Satz aus den Einstellungen (`mwst_satz()`).
- **`…0200_offerten_listen.sql`** – Die Sichten `offerten_liste` (Muri, Bulle, Nachfassen) und `offerten_eingang` (Neue Offerten). Stand und Nachfass-Datum werden an einer Stelle gerechnet.
- **`…0300_preise.sql`** – Einkaufspreise, Marge und Kalkulationen nur mit dem Recht «preise». Alle anderen lesen die Sicht `preisliste` (Verkaufspreis, Datenblätter). Funktionen: Preis setzen, Artikel archivieren mit Grund und Nachfolger, Excel-Import mit Prüflauf. Rollen mit «Offerten» bekommen den Bereich «Preise».
- **`…0400_auftrag_werkvertrag.sql`** – «Auftrag erstellen»: aus der angenommenen Offerte entstehen Projekt, Zahlungsplan und Werkvertrag in einem Schritt. Zahlungskonditionen als Auswahlliste (Normal 50/30/20 …), Rundung auf 5 Rappen, Werkvertrag-Status, Sicht `werkvertraege_liste` (Firma notfalls über den Standort).
- **`…0500_eturnity_eingang.sql`** – Tabelle für Meldungen aus Eturnity und `eturnity_zuordnen`.
- **`supabase/functions/eturnity-eingang/`** – Nimmt Meldungen von Eturnity/Zapier an, prüft das Geheimnis und legt sie ab. Anleitung: `docs/eturnity.md`.
- **`supabase/tests/offerten.test.sql`** – 34 Prüfungen: Nummernkreise, Status mit Pflichtangaben, Versionen, Entscheid, Auftrag mit Zahlungsplan, Firma im Werkvertrag, Rechte auf Einkaufspreise und Bereich «Preise».

## Gemeinsame Teile

- **`src/services/fachfehler.ts`** – Übersetzt Fehler-Schlüssel aus der Datenbank (`offerte.*`, `stand.*` …) für alle Module; ersetzt die eigene Datei im Verkauf.
- **`src/hooks/useMwst.ts`** – MWST-Satz aus den Einstellungen und `mitMwst()` (auf 5 Rappen gerundet).
- **`src/services/meldungen.ts`** – Meldungen können jetzt einen Knopf «Rückgängig» tragen.
- **`src/components/shared/AkteAbschnitt.tsx`** – Abschnitt einer Akte; vorher nur im Verkauf, jetzt für Leads, Offerten, Verträge und Artikel.
- **`package.json`** – `pdfjs-dist` zum Lesen der Eturnity-PDFs im Browser (wird erst beim ersten Gebrauch geladen).

## Modul «Offerten» (`src/modules/quotes/`)

- **`components/Offerten.tsx`** – Die Seite mit den Reitern Neue Offerten, Offerten Muri, Offerten Bulle, Nachfassen, PDF-Import und einer Suche über alle Reiter.
- **`components/EingangListe.tsx`**, **`EingangAkte.tsx`**, **`EingangStatusDialog.tsx`**, **`lib/status.ts`** – Neue Offerten für den Innendienst: wer daran arbeitet, Rückfrage, zur Prüfung, versendet.
- **`components/OffertListe.tsx`**, **`OffertStand.tsx`** – Offerten Muri und Bulle mit Stand und Filter.
- **`components/Nachfassen.tsx`**, **`EntscheidDialog.tsx`**, **`lib/nachfassen.ts`** – Nachfassen 14 Tage nach dem Angebot; Angenommen, Vertagt (mit Datum und Grund), Verloren, Bereits verbaut, nochmals nachfassen; auch für mehrere auf einmal.
- **`components/OffertAkte.tsx`**, **`OffertAngaben.tsx`**, **`OffertVerlauf.tsx`**, **`OffertVersionen.tsx`** – Seitenpanel der Offerte mit Werten, Versionen, Dokumenten und Verlauf.
- **`components/VersionDialog.tsx`**, **`ZurueckDialog.tsx`** – Überarbeitete Version erfassen; zurück zur Offerte mit Begründung.
- **`components/PdfImport.tsx`**, **`PdfWerteAbschnitt.tsx`**, **`FeldWert.tsx`**, **`lib/pdfText.ts`**, **`lib/pdfZeilen.ts`**, **`lib/eturnity.ts`**, **`lib/pdfImport.ts`**, **`lib/pdfUebernahme.ts`** – Eturnity-PDFs lesen (DE/FR), Werte vergleichen und übernehmen, mehrere PDFs auf einmal.
- **`components/WirtschaftlichkeitKarte.tsx`** – Jahresertrag, Eigenverbrauch, Autarkie, Rendite, Solarstrompreis und Förderung aus Eturnity.
- **`components/EturnityMeldungen.tsx`** – Meldungen aus dem Webhook zuordnen.
- **`services/offerten.ts`**, **`hooks/useOfferten.ts`**, **`lib/suche.ts`** – Laden, Speichern, Suche.

## Modul «Werkverträge» (`src/modules/workcontracts/`)

- **`components/Werkvertraege.tsx`**, **`VertragListe.tsx`**, **`lib/status.ts`** – Liste mit Filter nach Status und Suche.
- **`components/AuftragDialog.tsx`** – «Auftrag erstellen»: Standort, Sprache, Zahlungskondition, Vertragswert inkl. MWST, Datum, Vorschau des Zahlungsplans.
- **`components/VertragAkte.tsx`**, **`StatusDialog.tsx`**, **`Zahlungsplan.tsx`** – Seitenpanel: drucken, versendet, unterschrieben (mit Datum), stornieren (mit Grund), wieder aktivieren.
- **`components/WerkvertragDruck.tsx`**, **`lib/werkvertragAbschnitte.ts`**, **`lib/werkvertragText.ts`** – Der Vertrag mit den 15 Abschnitten aus V233, in der Sprache des Vertrags, mit Logo und Unterschriftszeilen.
- **`lib/zahlungsplan.ts`** – Tranchen auf 5 Rappen gerundet, die letzte nimmt den Rest.
- **`services/werkvertraege.ts`**, **`hooks/useWerkvertraege.ts`** – Laden und Speichern.

## Modul «Preise» (`src/modules/pricing/`)

- **`components/Preise.tsx`** – Reiter Preisliste, Archiv, Für Kunden, Kalkulation; ohne Recht «preise» nur «Für Kunden».
- **`components/PreisListe.tsx`**, **`PreisFeld.tsx`**, **`ArchivDialog.tsx`** – Preise direkt in der Tabelle ändern (EK, Marge, Skonto), archivieren mit Grund und Nachfolger, wiederherstellen.
- **`components/ArtikelAkte.tsx`**, **`ArtikelDatenblaetter.tsx`**, **`DatenblattLink.tsx`**, **`ArtikelLieferanten.tsx`**, **`ArtikelMasse.tsx`**, **`lib/datenblatt.ts`** – Artikel mit Datenblättern DE/FR, Preisen pro Lieferant und Massen.
- **`components/ExcelImportDialog.tsx`**, **`lib/vkExcel.ts`** – Die VK-Berechnung (Excel) wie in V233 einlesen, erst prüfen, dann übernehmen.
- **`components/Kundenansicht.tsx`**, **`PreislisteDruck.tsx`** – Preisliste für Kunden, exkl. oder inkl. MWST, zum Drucken.
- **`components/Kalkulation.tsx`**, **`Katalog.tsx`**, **`KalkBlatt.tsx`**, **`KalkPositionen.tsx`**, **`KalkSummen.tsx`**, **`UebernahmeHinweis.tsx`**, **`KalkulationDruck.tsx`**, **`GespeicherteKalkulationen.tsx`**, **`lib/kalkulation.ts`**, **`lib/prozent.ts`** – Kalkulation: Artikel und freie Positionen, Rabatt, Deckungsbeitrag, Preis pro kWp, Vorlagen, speichern, in die Offerte übernehmen, PDF intern.
- **`services/preise.ts`**, **`services/kalkulationen.ts`**, **`hooks/usePreise.ts`** – Laden und Speichern.

## Tests

- **Unit:** `quotes/lib/eturnity.test.ts`, `nachfassen.test.ts`, `workcontracts/lib/zahlungsplan.test.ts`, `pricing/lib/kalkulation.test.ts`, `vkExcel.test.ts`, `prozent.test.ts`.
- **Browser:** `e2e/offerten.spec.ts` (Offerten und Werkverträge ohne Verstösse, Kalkulation rechnen und speichern, Verkauf sieht nur die Kundenansicht), `barrierefreiheit.spec.ts` um die drei Seiten ergänzt.

## Doku

- **`docs/entscheidungen/0015-offerten-preise-werkvertrag.md`**, **`docs/eturnity.md`**, **`docs/datenmodell.md`** (Phase 7), Modul-READMEs.
