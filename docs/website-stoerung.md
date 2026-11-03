# Störungsformular der Website → Service-Fall

Das Formular «Störung melden» auf dimension-solaire.ch (DE und FR, Anker `#stoerung`, z. B.
`/fr/service-entretien/#stoerung`) legt direkt einen Fall in **Service & Garantie** an. Entscheid 0038.

## Weg der Meldung

```
Browser → Website-Backend (/api/lead/, type=service) → Edge Function «stoerung» → service_aus_website()
```

Der Browser ruft die Edge Function **nie** direkt auf: der Schlüssel liegt nur im Backend der Website.

## Aufruf

- `POST https://<projekt>.supabase.co/functions/v1/stoerung`
- Kopf `x-stoerung-schluessel: <STOERUNG_SCHLUESSEL>` (gleicher Wert als Supabase-Secret und im Backend der Website)
- Optional Kopf `Idempotency-Key: <uuid>`: dieselbe Meldung zweimal gibt keinen zweiten Fall.
- Körper JSON (auch `application/x-www-form-urlencoded` oder `multipart/form-data`), höchstens 64 kB.

| Feld                            | Pflicht | Inhalt                                                           |
| ------------------------------- | ------- | ---------------------------------------------------------------- |
| `name`                          | ja      | Vor- und Nachname                                                |
| `email`                         | ja      | E-Mail                                                           |
| `phone`                         | ja      | Telefon, mindestens 9 Ziffern                                    |
| `address`                       | ja      | Adresse der Anlage («Strasse Nr, PLZ Ort»)                       |
| `project`                       | nein    | Projektnummer, falls bekannt                                     |
| `problem`                       | ja      | Art der Störung, Text der gewählten Option (DE oder FR)          |
| `message`                       | nein    | Beschreibung                                                     |
| `consent`                       | ja      | `true` / `"on"`                                                  |
| `consentText`, `consentVersion` | nein    | Wortlaut und Fassung der Einwilligung (wird mitgespeichert)      |
| `lang`                          | nein    | `de` oder `fr` (Sprache der Eingangsbestätigung)                 |
| `page`                          | nein    | Seite, von der gesendet wurde                                    |
| `website`                       | nein    | Honeypot: gefüllt = Spam (die Website filtert Spam schon selbst) |

## Antworten

| Status | Körper                                                   | Bedeutung                            |
| ------ | -------------------------------------------------------- | ------------------------------------ |
| 200    | `{ ok: true, nummer: "S042", doppelt: false }`           | Fall angelegt (oder schon vorhanden) |
| 200    | `{ ok: true, verworfen: true }`                          | Spam, still verworfen                |
| 400    | `{ ok: false, fehler: "unvollstaendig", felder: [...] }` | Pflichtfelder fehlen                 |
| 401    | `{ ok: false, fehler: "schluessel" }`                    | Schlüssel falsch                     |
| 503    | `{ ok: false, fehler: "nicht_eingerichtet" }`            | Secret `STOERUNG_SCHLUESSEL` fehlt   |

## Was im CRM passiert

1. Kunde und Anlage zuordnen, in dieser Reihenfolge: **Projektnummer**, **Adresse** (PLZ + Strasse), E-Mail,
   Telefon. Ohne Treffer steht der Fall im Leitstand unter «Ohne Kunde» mit Knopf «Kunde aus Meldung anlegen».
2. Art der Störung → Kategorie, Auswirkung und Komponente über `einstellungen.service.website_stoerungen`
   (z. B. «Anlage produziert nicht» = steht, Priorität hoch). Reaktionszeit und Checkliste setzt die Datenbank.
3. Glocke für die verantwortliche Person (`einstellungen.service.verantwortlich_id`, sonst Administration).
4. Eingangsbestätigung an den Kunden im Ausgangskorb, Standard **mit Freigabe** (`bestaetigung: "automatisch"`
   schickt sie ohne Klick).

## Einrichten

1. Schlüssel erzeugen (`openssl rand -hex 32`) und als Secret setzen: `npx supabase secrets set STOERUNG_SCHLUESSEL=…`
2. `npx supabase functions deploy stoerung --no-verify-jwt` (läuft ohne Supabase-Login).
3. Auf dem Webserver (Infomaniak-Panel oder `.env` neben `server.mjs`) `STOERUNG_URL` und `STOERUNG_SCHLUESSEL` setzen
   und die Website neu starten. Die Weiterleitung steckt im Repository `dimension-solaire-website`
   (`stoerungAnCrm` im Lead-Handler, Lead-ID als Idempotency-Key); Mails an info@ laufen unverändert weiter.
4. Probe: Formular mit Projektnummer eines Testprojekts senden → Fall im Leitstand, Glocke, Mail im Ausgangskorb.
