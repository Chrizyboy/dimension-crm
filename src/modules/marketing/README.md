# Modul: Marketing

**Zweck:** Werbung planen und messen: Kampagnen mit Ziel, Budget und Ergebnis, Messen mit Lead-Erfassung am
Handy, Kunden gezielt anschreiben, Social-Media-Posts und Newsletter, Fotos und Werbemittel. Zeigt, woher die
Aufträge kommen und was ein Lead kostet. Alles, was nach aussen geht, gibt eine Person mit einem Klick frei.

Gebaut in Phase **11** nach dem Inventar der Vorlage V233 (Marketing, Social Media, Newsletter), Entscheid 0022;
vollständig gemacht am 2.11.2026, Entscheid 0056.
Einrichten der Dienste: `docs/marketing.md`.

## Reiter (`#/marketing?ansicht=…`, offene Kampagne `&kampagne=<id>`)

- **Übersicht** (Standard): «Heute zu tun» je Rolle, nächste 14 Tage, eigene Leads aus Marketing, «Woher kommen
  die Aufträge?», Budget je Kanal und «Kosten zuordnen» (nur Finanzen).
- **Kalender**: Posts, Newsletter, Serien-Mails, Messen, Kampagnen-Ende, Thema des Monats.
- **Kampagnen** / **Messen & Events**: Liste mit Leads gegen Ziel, Aufträgen, Kosten pro Lead; Akte mit Ergebnis
  (Trichter, Versände mit Öffnungen/Klicks, Leads, Rechnungen), bei Messen Standdienst, Checkliste, «Lead am
  Stand erfassen» (offline) und Dankes-Mail; Angaben mit Kennzeichen.
- **Mediathek**: Fotos aus Rapporten (Erlaubnis, Titelbild), Werbemittel mit Bestand.

- **Kunden anschreiben** (`anschreiben`): Zielgruppe mit Suche und Filtern (Gruppe, Kanton, Sprache, Standort,
  Mail oder Post, Anlage ohne Batterie/Wallbox/Wärmepumpe oder älter als 3 Jahre, Abgemeldete); Auswahl;
  Serienbrief (PDF), Serien-E-Mail (Ausgangskorb, mit Abmelde-Link), Adressliste (CSV); pro Kontakt «Keine Werbung
  mehr», «Werbung wieder erlauben», «Einwilligung erfassen»; Letzte Aktionen.
- **Social Media** (`social`): Verbindungen (Meta, LinkedIn, Canva), Board Ideen → Entwurf → Zur Freigabe →
  Geplant → Veröffentlicht; ohne Verbindung «von Hand» posten und Links eintragen.
  Post: Thema, Idee, Quelle (eigenes Thema, verbaute Anlage ohne Namen, Tipp), Netzwerke, Sprache, Texte je
  Netzwerk mit Prüfhinweisen, Bild (eigenes Foto oder Canva), Datum/Zeit, Freigeben und planen, Jetzt
  veröffentlichen, Zurückziehen, Als erledigt ablegen, Papierkorb.
- **Newsletter** (`newsletter`): Kennzahlen (Adressen mit Versandgrund, Abgemeldete), Liste, Editor (Thema →
  Zielgruppe → Text → Prüfung → Senden), «Als Vorlage verwenden».
- **Vorlagen** (`vorlagen`): Absender, Ort, Brief- und Mailtexte DE/FR, Abmelde-Satz, Wörter pro Newsletter,
  Themen, Regeln je Netzwerk, CI-Stil (nur Administration).

Nach der Anmeldung bei Meta, LinkedIn oder Canva kommt man auf `#/marketing?ansicht=social&verbunden=…&ergebnis=…`
zurück und sieht eine Meldung.

## Daten

- Besitzt: `marketing_kampagnen`, `marketing_zielgruppen`, `werbemittel`, `marketing_ereignisse`, `kampagnen`
  (Versand-Verlauf), `newsletter`, `newsletter_empfaenger`, `social_posts`, Einstellung `marketing`.
- Liest: Sicht `marketing_zielgruppe`, `dokumente` (Ordner «marketing»), `anlagen` (Referenz-Anlagen ohne Namen),
  Funktionen `newsletter_empfaenger_fuer`, `social_verbindungen`.
- Schreibt nur über Funktionen: `marketing_senden`, `marketing_vermerken`, `marketing_sperre`,
  `marketing_einwilligung`, `social_freigeben`, `social_zurueckziehen`, `social_erledigt`, `social_zur_freigabe`,
  `social_gepostet`, `messe_lead_erfassen`, `marketing_kosten_zuordnen`, `foto_werbung_setzen`, `foto_titel_setzen`.
- Zahlen: `kampagnen_zahlen`, `marketing_quellen`, `marketing_budget`, `versand_ergebnisse`, `mediathek_fotos`.
- Ändert fremde Spalten: `verkaufschancen.kampagne_id`, `kreditor_zahlungen.kampagne_id/marketing_kanal`.

## Abhängigkeiten

- `src/services/supabase.ts`, `src/services/integrationen.ts` (Edge Function `social`), `src/services/meldungen.ts`,
  `src/services/fehler.ts`, `src/services/fachfehler.ts`.
- Edge Functions: `social` (Status, Verbinden, Canva, Jetzt veröffentlichen), `social-rueckruf`, `abmelden`,
  `zeitplan` (Jobs `social`, `social_von_hand`, `heizung`), `ausgang` (Versand der Mails, Phase 8, mit Zähler),
  `zaehler` (Öffnungen und Klicks).
- `src/lib/datei.ts` (Herunterladen), `src/lib/bild.ts` (Foto verkleinern, JPEG), `pdf-lib` (erst beim Erstellen).

## Ereignisse

- **sendet:** keine.
- **hört auf:** keine. Versendete Mails trägt die Edge Function `ausgang` als Aktivität beim Kontakt ein.

## Ordner

- `components/` – Seite, Reiter, Dialoge
- `hooks/` – Daten laden (`useMarketing`), Aktion mit Meldung (`useAktion`)
- `services/` – `marketing.ts` (Zielgruppe, Versand, Newsletter, Vorlagen), `social.ts` (Posts, Verbindungen, Canva)
- `lib/` – Filter, Platzhalter, Textprüfung, Serienbrief-PDF (mit Tests)
- `types.ts`, `schema.ts`, `index.ts`
