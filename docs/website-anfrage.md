# Anfragen der Website → Lead

Die Formulare auf dimension-solaire.ch (DE und FR) legen direkt einen Lead in **Anfragen & Leads** an, statt nur eine
Mail an info@ zu schicken. Ab dem Eingang läuft die 15-Minuten-Uhr. Entscheid 0039.

## Weg der Anfrage

```
Browser → Website-Backend (/api/lead/) → Edge Function «anfrage» → lead_aus_website() → anfrage_uebernehmen()
```

Der Browser ruft die Edge Function **nie** direkt auf: der Schlüssel liegt nur im Backend der Website. Die
Eingangsbestätigung an den Kunden schickt die Website selbst (Chris 2.11.2026, 2A); das CRM schickt keine zweite.

## Aufruf

- `POST https://<projekt>.supabase.co/functions/v1/anfrage`
- Kopf `x-anfrage-schluessel: <ANFRAGE_SCHLUESSEL>` (gleicher Wert als Supabase-Secret und im Backend der Website)
- Körper JSON, höchstens 64 kB: `{ id, type, receivedAt, data }`, also die gespeicherte Anfrage der Website ohne
  Dateien, Rechner-Bericht und Einwilligungstext.

| Feld         | Inhalt                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | Referenz der Website (`DS-…`), wird zur Kennung `web:DS-…`: dieselbe Anfrage gibt nie zwei Leads                                                    |
| `type`       | `offerte`, `rueckruf`, `kontakt` (nur mit `data.callback`), `report-email` (nur mit `data.followup`)                                                |
| `receivedAt` | Eingang (ISO)                                                                                                                                       |
| `data`       | Felder des Formulars: Name, E-Mail, Telefon, Adresse, Interesse, Gebäude, Eigentum, Zeitpunkt, Zeitfenster, Verbrauch, Dachfläche, Seite, `utm_*` … |

Zuordnung (`supabase/functions/_shared/webanfrage.ts`, mit Tests): Interesse pv/speicher/wp/ladestation → pv,
batterie, waermepumpe, wallbox; Gebäude efh/mfh → Einfamilien-/Mehrfamilienhaus; Zeitpunkt sofort/3m → bis 3 Monate;
alles Weitere als Zeilen in der internen Notiz. Herkunft (Seite, Kampagne, Kontaktwunsch) steht in
`verkaufschancen.herkunft`, Dachfläche und Ertrag der Website in `objekte.dach.website`, Verbrauch in
`objekte.verbrauch_kwh`.

## Antworten

| Status | Körper                                                      | Bedeutung                              |
| ------ | ----------------------------------------------------------- | -------------------------------------- |
| 200    | `{ ok: true, lead: true, nummer: "L123", ergebnis: "neu" }` | Lead angelegt (`schon`: war schon da)  |
| 200    | `{ ok: true, lead: false, grund: "kein_rueckruf" }`         | Kein Lead (z. B. Kontakt ohne Rückruf) |
| 400    | `{ ok: false, fehler: "unvollstaendig", felder: [...] }`    | Referenz oder E-Mail/Telefon fehlt     |
| 401    | `{ ok: false, fehler: "schluessel" }`                       | Schlüssel falsch                       |
| 503    | `{ ok: false, fehler: "nicht_eingerichtet" }`               | Secret `ANFRAGE_SCHLUESSEL` fehlt      |

## Was im CRM danach passiert

1. Doppelte erkennt `anfrage_uebernehmen` (Kontakt schon da → «Erneute Anfrage» am bestehenden Lead). Liest der
   Posteingang die Mail an info@ später noch ein, gibt es keinen zweiten Lead.
2. Zuteilung nach Sprache, Standort und Region (`einstellungen.zustaendigkeiten`, Entscheid 0032).
3. Der Zeitplan holt alle 5 Minuten Dach und Gebäude von sonnendach.ch und dem Gebäuderegister
   (`objekte.dach.sonnendach`); daraus rechnet die Lead-Akte den Richtpreis (nur intern).
4. Nach 15 Arbeitsminuten ohne Anruf, Mail oder SMS: Glocke an den Verkäufer; nach 2 Stunden an `eskalation_an`
   (Chris). Werte in `einstellungen.verkauf`.

## Einrichten

1. Schlüssel erzeugen (`openssl rand -hex 32`) und als Secret setzen: `npx supabase secrets set ANFRAGE_SCHLUESSEL=…`
2. `npx supabase functions deploy anfrage --no-verify-jwt` und `npx supabase functions deploy zeitplan`.
3. Auf dem Webserver (Infomaniak-Panel oder `.env` neben `server.mjs`) `ANFRAGE_URL` und `ANFRAGE_SCHLUESSEL` setzen
   und die Website neu starten. Die Weiterleitung steckt im Repository `dimension-solaire-website` (`anfrageAnCrm` im
   Lead-Handler); Mails an info@ laufen unverändert weiter.
4. Probe: Rückruf-Formular mit eigener Nummer senden → Lead unter «Zu tun», Glocke nach 15 Minuten.
