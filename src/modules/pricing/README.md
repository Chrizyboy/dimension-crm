# Modul: Preise (`pricing`)

**Zweck:** Preisliste pflegen (Einkauf, Marge, Skonto, Lieferanten, Datenblätter, Lager, Garantie, Archiv), Preislisten aus Eturnity und von Lieferanten einlesen und vergleichen, eine Preisliste und einen Richtpreis für Kunden geben und Anlagen mit Bausteinen, Leistungen und Varianten kalkulieren, mit Freigabe bis zur Übernahme in die Offerte.

**Stand:** Phase 7 gebaut, vollständig gemacht 2.11.2026 (Entscheid 0040).

## Daten

- mit Recht `preise`: `artikel`, `lieferantenpreise`, `lieferanten`, `kalkulationen`, `preisvorlagen`, `preisvorlage_positionen`, `preisverlauf`, `preis_importe`, `leistungen`, `kalk_bausteine`
- Regeln in `einstellungen.preise` (lesen `preise_regeln()`, ändern `preise_regeln_setzen` nur wer freigibt); Leistungen für alle über die Sicht `leistungen_liste` (Kosten nur mit `preise`)
- Einlesen: `preis_import_anlegen` (nur vergleichen), `preis_import_uebernehmen`, `preis_import_verwerfen`; Freigabe: `kalkulation_freigabe_pruefen`, `_anfragen`, `kalkulation_freigeben`, `kalkulation_in_offerte`; dazu `artikel_preise_mehrfach`, `artikel_verwendung`, `richtpreis`
- ohne Recht: nur die Sicht `preisliste` (Verkaufspreis, Datenblätter)
- schreibt über `artikel_preis_setzen`, `artikel_archivieren`, `preise_importieren`, `offerte_werte_setzen` (Quelle «kalkulation», Betrag exkl. MWST)
- Datenblätter im Speicher `dokumente` unter `artikel/<id>/…`. Details: `docs/datenmodell.md` (Phase 7), Entscheid 0015

## Abhängigkeiten

- `src/services/supabase`, `meldungen`, `fehler`, `fachfehler`, `dokumente`; `src/hooks/useMwst`, `useDrucken`
- Die Offerte öffnet die Kalkulation über die Adresse (`/pricing?ansicht=kalkulation&offerte=…`), nie per Import.

## Ereignisse

- **sendet:** keine
- **hört auf:** keine
- Glocke (`benachrichtigungen`) bei Freigabe-Anfrage und -Entscheid kommt aus der Datenbank, Ziel `/pricing?ansicht=kalkulation&kalkulation=…`

## Ordner

- `components/` – Preisliste, Artikel-Akte, Kundenansicht mit Richtpreis, Kalkulation (Varianten, Bausteine, Freigabe), Preisänderungen, Leistungen & Regeln, Excel-Import, Druck
- `hooks/`, `services/` – Laden und Speichern
- `lib/` – Kalkulation, Bausteine, Preisdatei, Hinweise, Prozent, VK-Excel (mit Tests)
- `types.ts`, `index.ts`
