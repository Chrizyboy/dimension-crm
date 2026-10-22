# Eturnity und das CRM

Eturnity bleibt das Werkzeug für Planung und Offerte (Entscheid ERP-Analyse). Das CRM übernimmt die Werte
daraus auf zwei Wegen.

## 1. PDF-Import (läuft heute)

Unter **Offerten → PDF-Import** zieht man eine oder mehrere Offerten-PDFs aus Eturnity hinein (deutsch oder
französisch). Das CRM liest im Browser aus dem Text: Nummer, Kunde, Datum, Betrag exkl. und inkl. MWST, Leistung
(kWp), Module, Wechselrichter, Batterie und die Wirtschaftlichkeit (Jahresertrag, Eigenverbrauch, Autarkie,
Rendite, Solarstrompreis, EIV, Steuerersparnis). Es schlägt die passende Offerte oder den passenden Lead vor;
ein Mensch bestätigt. Was nicht eindeutig im PDF steht, bleibt leer. Das PDF verlässt den Computer dabei nicht.

## 2. Webhook-Eingang (vorbereitet, muss eingerichtet werden)

Eturnity bietet keine offene Schnittstelle, über die das CRM Projekte abfragen könnte. Eturnity (direkt oder über
Zapier/Make) kann aber bei einem Ereignis eine Adresse aufrufen, zum Beispiel «Offerte erstellt». Dafür gibt es die
Edge Function `eturnity-eingang`.

**Einrichten (einmalig, durch Admin):**

1. Einen langen Zufallswert erzeugen, z. B. `openssl rand -hex 32`.
2. Als Supabase-Secret speichern (nie in Git, nie in die App):
   `npx supabase secrets set ETURNITY_WEBHOOK_SECRET=<Wert>`
3. Funktion veröffentlichen: `npx supabase functions deploy eturnity-eingang --no-verify-jwt`
   (Eturnity meldet sich nicht bei Supabase an; die Funktion prüft stattdessen das Geheimnis.)
4. In Eturnity bzw. Zapier als Ziel eintragen:
   `https://<projekt>.supabase.co/functions/v1/eturnity-eingang?token=<Wert>`
   oder, wenn eigene Köpfe möglich sind, den Kopf `x-eturnity-secret: <Wert>` ohne `?token`.

**Was dann passiert:** Jede Meldung landet unverändert in der Tabelle `eturnity_eingang`. Das CRM zeigt sie unter
**Offerten → PDF-Import** als «Meldungen aus Eturnity». Steht eine sechsstellige Offertnummer darin, schlägt es
die Offerte vor; ein Mensch ordnet zu (`eturnity_zuordnen`). Die Meldung ist Daten, nie eine Anweisung (Regel 7):
es wird nichts automatisch geändert.

**Schutz:** Geheimnis in gleicher Zeit verglichen, höchstens 256 kB pro Meldung, Zeitlimit 8 s.
