# Dateien aus Phase 8 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261027000100_integrationen.sql`** – Welche Dienste eingerichtet sind (`integrationen`), die Microsoft-Verbindung jeder Person (`intern.microsoft_verbindungen`, Token nur verschlüsselt und nur für den Server lesbar) und das Protokoll jedes Aufrufs (`integrations_protokoll`).
- **`…0200_ausgangskorb.sql`** – Der Ausgangskorb: jede Mail und SMS wartet hier, bis ein Mensch sie freigibt. Funktionen `ausgang_anlegen`, `ausgang_freigeben`, `ausgang_verwerfen`, `ausgang_aendern`.
- **`…0300_sms_erinnerung.sql`** – «SMS für morgen» aus der Datenbank (`sms_erinnerungen`), Text aus der Vorlage, Schalter «automatisch» nur für die Administration.
- **`…0400_integrationen_server.sql`** – Zeitplan (pg_cron) für Senden, Anfragen holen, Kalender, Mail-Verlauf und nächtliche Sicherung; `zeitplan_laeufe()` zeigt, was wann lief.
- **`…0500_mails_aus_outlook.sql`** – Anfragen aus info@ werden Leads (ohne Doppelte), Mails aus Outlook erscheinen in der Zeitachse des Kunden, Termine im Kalender, Dateien bekommen einen SharePoint-Link.
- **`…0600_integrationen_herkunft.sql`** – Herkunftsspalten wie bei allen Fachtabellen.
- **`supabase/tests/integrationen.test.sql`** – 24 Prüfungen: Freigabe vor dem Senden, verwerfen mit Grund, wer was sehen darf, Token unsichtbar, SMS-Liste.

## Server-Funktionen (`supabase/functions/`)

- **`microsoft/`** – Verbinden, testen, trennen, Kalender laden, Termin eintragen/absagen, Anfragen holen, .eml einlesen, Mails abgleichen, Dateien nach SharePoint.
- **`microsoft-rueckruf/`** – Hierhin führt Microsoft nach der Anmeldung zurück; speichert die Verbindung verschlüsselt.
- **`ausgang/`** – Sendet freigegebene Mails (aus dem eigenen Postfach) und SMS (ASPSMS).
- **`abaninja/`** – Kunde suchen, verknüpfen, anlegen, nachführen; offene Rechnungen lesen.
- **`verbindungen/`** – Ob ein Dienst eingerichtet ist (nur ja/nein) und «Jetzt testen».
- **`zeitplan/`** – Wird vom Zeitplan der Datenbank aufgerufen und erledigt die Hintergrund-Jobs.
- **`_shared/`** – Gemeinsame Bausteine: Microsoft-Anmeldung (`microsoft.ts`), Outlook (`outlook.ts`, `termin.ts`), Anfragen erkennen (`anfrage.ts`, `abgleich.ts`), SharePoint, ASPSMS, AbaNinja, Verschlüsselung (`krypto.ts`), Versand. Mit Tests (`anfrage.test.ts`, `bausteine.test.ts`).

## Gemeinsame Teile in der App

- **`src/services/integrationen.ts`** – Ruft die Server-Funktionen auf und übersetzt deren kurze Fehlercodes in verständliche Meldungen.
- **`src/services/ausgang.ts`**, **`src/components/shared/MailDialog.tsx`** – Mail vorbereiten (Text, Anhänge) und «In den Ausgangskorb» oder gleich «Senden».
- **`src/lib/format.ts`** – neu `formatDatumZeit`.

## Modul «Ausgangskorb» (`src/modules/outbox/`) – neu

- **`components/Ausgangskorb.tsx`**, **`ausgangSpalten.tsx`** – Liste mit Filter (offen, gesendet, verworfen, alle).
- **`components/AusgangDetail.tsx`** – Ein Eintrag: lesen, ändern, freigeben und senden, oder «Nicht senden» mit Grund.
- **`services/ausgang.ts`**, **`hooks/useAusgang.ts`**, **`lib/anzeige.ts`**, **`schema.ts`**, **`types.ts`**.

## Einstellungen (`src/modules/settings/`)

- **`components/MicrosoftKarte.tsx`** – In «Mein Konto»: mit Microsoft verbinden, testen, trennen.
- **`components/Verbindungen.tsx`**, **`VerbindungenEinstellungen.tsx`**, **`VerbindungenProtokoll.tsx`** – Neuer Reiter «Verbindungen»: Stand der drei Dienste, «Jetzt testen», Postfächer, SharePoint-Ordner, SMS-Absender, AbaNinja-Anrede, Hintergrund-Jobs und die letzten Aufrufe.
- **`services/verbindungen.ts`**, **`hooks/useVerbindungen.ts`**.

## Weitere Module

- **Anfragen & Leads:** `SmsListe.tsx` (senden, einzeln oder alle, automatisch ab 16 Uhr), `AnfragenKnopf.tsx` (aus Outlook holen, .eml einlesen), `OutlookTermin.tsx` (Termin in Outlook mit Einladung), `KalenderLaden.tsx` (eigener Kalender aus Outlook), `services/sms.ts`.
- **Kunden:** `AkteAbaninja.tsx` (AbaNinja in der Kundenakte), `OutlookMailsKnopf.tsx`, Sicherung nach SharePoint in `AkteDokumente.tsx`.
- **Offerten, Werkverträge:** «Per Mail senden» in `OffertAkte.tsx` und `VertragAkte.tsx`, Text in der Sprache des Kunden.

## Prüfen ohne echte Konten

- **`scripts/integrationen/ersatz-dienste.mjs`** – Kleine Ersatz-Server, die sich wie Microsoft, AbaNinja und ASPSMS verhalten.
- **`scripts/integrationen/pruefen.mjs`** – `npm run integrationen:pruefen`: spielt jeden Ablauf durch (44 Prüfungen).

## Tests

- **Browser:** `e2e/integrationen.spec.ts` (Ausgangskorb freigeben und verwerfen, Verbindungen, SMS-Liste), `barrierefreiheit.spec.ts` um den Ausgangskorb ergänzt.

## Doku

- **`docs/integrationen.md`** (Einrichten im Betrieb), **`docs/entscheidungen/0016-integrationen.md`**, `.env.example`, Modul-READMEs.
