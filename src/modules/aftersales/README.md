# Modul: Service & Garantie

**Zweck:** Erfasst Störungen, Reklamationen, Garantiefälle und Kontrollen nach dem Bau und hält die Daten jeder gebauten Anlage fest.

**Stand:** gebaut in Phase **9** (V233: Service V49), neu als Leitstand mit Fall-Akte am 2.11.2026. Entscheide: `docs/entscheidungen/0018-projekte-service-wartung.md`, `0038-service-leitstand.md`.

## So läuft es

1. **Leitstand:** Board nach Arbeitsschritt (Eingang, In Arbeit, Geplant, Teile, Erledigt) oder Liste, Kennzahlen, Schnellfilter. Karten zeigen Reaktionszeit, Auswirkung, Garantie und Quelle.
2. **«Neuer Fall»:** Quelle (Anruf, Mail …), Kunde, Anlage mit Garantie-Hinweis, Auswirkung, Komponente, Fehlercode, Vor Ort, Zugang, Termin, Fotos. Nummer S001 …, Reaktionszeit und Checkliste setzt die Datenbank.
3. **Fall-Akte** (ganze Seite, `?fall=…`): Arbeitsschritte, Verlauf mit Art, Kunde/Ort, Anlage mit Garantie je Komponente, Checkliste, Einsatz, Rapporte und Kosten mit «Rechnung erstellen», frühere Fälle, Mails, Anhänge.
4. **Website:** Störungsformular → Edge Function `stoerung` → `service_aus_website` (Zuordnung Projektnummer/Adresse/Mail/Telefon, Glocke, Bestätigung im Ausgangskorb). Siehe `docs/website-stoerung.md`.
5. Reiter «Anlagen»: IBN, Garantie, nächste Kontrolle, Monitoring und Komponenten mit Seriennummer. Anlagen entstehen mit der IBN im Projekt.

## Daten

- Besitzt: `service_faelle`, `anlagen`; Einstellungen `einstellungen.service` (Reaktionszeiten, Checklisten, Website-Zuordnung, Verantwortlich, Bestätigung; nur Administration).
- Schreibt: `aufgaben` (Bezug `service_faelle`), `dokumente` und Speicher `dokumente/service/<fall>/…`, `ausgang` (Bestätigung), `benachrichtigungen`.
- Liest: `kontakte`, `objekte`, `projekte`, `personen`, `rapporte`, `zeiten`, `rechnungen`, `posteingang`, `wartungsvertraege`, `auswahlwerte`.
- Abläufe: `service_notiz`, `service_eintrag`, `service_checkliste(_dazu)`, `service_zuordnen`, `service_kunde_aus_meldung`, `service_akte`, `service_leitstand`, `service_aus_website` (nur Server); Trigger `ergaenzen` setzt Projekt, Ort, Priorität, Reaktionszeit, Checkliste, Garantie.

## Abhängigkeiten

- RPC `rechnung_entwurf` (Rechnung aus Rapport), `src/services/supabase.ts`, `src/services/kontakte.ts` (über `KundeWahl`), `src/services/dokumente.ts`, `src/services/fachfehler.ts`, `src/services/meldungen.ts`.

## Ereignisse

- **sendet:** keine.
- **hört auf:** keine.

## Ordner

- `components/` – Leitstand (Board, Karten, Zahlen), Fall-Seite mit Boxen, Dialoge, Anlagen, Startseiten-Karte
- `hooks/`, `services/`, `lib/` (Fälligkeit, Reaktionszeit, Garantie, Schritte), `types.ts`, `schema.ts`, `index.ts`
