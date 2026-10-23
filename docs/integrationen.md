# Integrationen einrichten: Microsoft 365, AbaNinja, SMS (Phase 8)

Diese Anleitung ist für den Betrieb. Sie braucht keine Programmierkenntnisse, aber Zugang zu:
Microsoft 365 Admin (Entra ID), dem Supabase-Projekt (Dashboard), AbaNinja und ASPSMS.

**Grundregel:** Kein Schlüssel und kein Passwort kommt in die App, in Git, in einen Chat oder in eine Mail.
Alle Geheimnisse stehen nur in den **Supabase-Secrets** (Dashboard › Edge Functions › Secrets oder
`npx supabase secrets set NAME=wert`). Die App sieht nur, _ob_ ein Dienst eingerichtet ist.

Nach dem Einrichten: **Einstellungen › Verbindungen** öffnen und bei jedem Dienst «Jetzt testen» drücken.

---

## 1. Microsoft 365 (Mails, Kalender, Anfragen aus info@, SharePoint)

Jede Person verbindet ihr eigenes Konto (Entscheid vom 22.10.2026, `docs/entscheidungen/0016`). Das CRM
sendet dann aus ihrem Postfach und trägt Termine in ihren Kalender ein.

### 1.1 App bei Microsoft registrieren (einmal, Admin)

1. <https://entra.microsoft.com> › **Applications › App registrations › New registration**
2. Name: `Dimension CRM`. Kontotyp: **Nur Konten in diesem Organisationsverzeichnis**.
3. **Redirect URI**: Typ «Web», Adresse aus Einstellungen › Verbindungen («Rückruf-Adresse für Microsoft»),
   im echten Projekt `https://<projekt>.supabase.co/functions/v1/microsoft-rueckruf`.
4. Nach dem Anlegen notieren: **Application (client) ID** und **Directory (tenant) ID**.
5. **Certificates & secrets › New client secret** (24 Monate). Den _Wert_ sofort kopieren, er erscheint nur einmal.
   Im Kalender eintragen, wann er abläuft.
6. **API permissions › Add › Microsoft Graph › Delegated permissions**:
   `offline_access`, `openid`, `email`, `profile`, `User.Read`, `Mail.ReadWrite`, `Mail.Send`,
   `Mail.Read.Shared`, `Mail.Send.Shared`, `Calendars.ReadWrite`, `Sites.ReadWrite.All`.
   Danach **Grant admin consent for Dimension Solaire** drücken.

### 1.2 Secrets setzen

```bash
npx supabase secrets set MS_CLIENT_ID=<Application ID>
npx supabase secrets set MS_TENANT_ID=<Directory ID>
npx supabase secrets set MS_CLIENT_SECRET=<Wert des Client Secret>
# Schlüssel für die Verschlüsselung der Microsoft-Verbindungen (32 Zufallsbytes):
npx supabase secrets set VERBINDUNG_SCHLUESSEL=$(openssl rand -base64 32)
# Wohin Microsoft nach der Anmeldung zurückführt (Adresse der Web-App):
npx supabase secrets set APP_URL=https://<adresse-der-web-app>
```

Wird `VERBINDUNG_SCHLUESSEL` später gewechselt, müssen sich alle neu verbinden (das CRM zeigt «Neu verbinden»).

### 1.3 Postfach info@ und Team-Postfächer (Stellvertretung)

Anfragen von solar-guide.ch, der Landingpage und der Messe-App kommen in `info@dimension-solaire.ch`.
Das CRM liest sie mit dem Zugang einer verbundenen Person. Diese Person braucht Leserecht auf info@:
Exchange Admin Center › **Postfächer › info@ › Postfachberechtigungen › Vollzugriff** (oder «Lesen»).
Team-Postfächer (z. B. muri@, bulle@) genauso; sie werden in Einstellungen › Verbindungen eingetragen.

### 1.4 Jede Person verbindet sich

**Mein Konto › Microsoft 365 › Mit Microsoft verbinden.** Microsoft fragt nach dem Passwort und zeigt die
Berechtigungen; danach steht «Verbunden». Wer die Firma verlässt: dort «Trennen» oder in Entra ID das Konto sperren.

### 1.5 SharePoint-Ablage

Einstellungen › Verbindungen: Website `dimensionsolaire.sharepoint.com:/sites/Dimension-Solaire`,
Bibliothek `Administration`, Ordner `Direction Interne/CRM Backups/Kunden Backup`. Das CRM legt die Datei in
`K0123 Name/<Ordner wie V233, z. B. DEVIS - ANGEBOT>/` ab.

---

## 2. AbaNinja (Kunden und offene Rechnungen)

1. AbaNinja › **Einstellungen › API** (bzw. Entwickler) › neues Token erstellen. Kontonummer (Account-UUID) notieren.
2. Secrets:
   ```bash
   npx supabase secrets set ABANINJA_TOKEN=<Token>
   npx supabase secrets set ABANINJA_KONTO=<Account-UUID>
   ```
3. Einstellungen › Verbindungen › AbaNinja › «Jetzt testen».
4. **Anrede:** AbaNinja erwartet je nach Konto feste Werte. In Einstellungen › Verbindungen bei «Anrede Herr/Frau»
   die Werte eintragen, die AbaNinja beim Anlegen eines Kunden von Hand zeigt (Standard: `mr`, `mrs`, `unknown`).
   Beim ersten Kunden prüfen, ob Anrede und Kundennummer richtig ankommen.

Rechnungen sehen nur Personen mit dem Recht «Finanzen». Buchhaltung, Lohn und MWST bleiben in AbaNinja.

**Ab Phase 10:** Eine gestellte Rechnung geht mit «An AbaNinja» als Entwurf hinüber (Kunde, Positionen, Referenz =
Rechnungsnummer); die QR-Rechnung entsteht und wird in AbaNinja versendet. «Abgleich» (Seite Rechnungen) holt den
offenen Betrag jeder übergebenen Rechnung (Zahlung wird im CRM verbucht) und die Lieferantenrechnungen (Belege) in
die Finanzen; steht eine Projektnummer in der Referenz, wird der Beleg dem Projekt zugeordnet. Ändern, löschen und
bezahlen geschieht in AbaNinja selbst (die API bietet dafür nichts Verlässliches). Beim ersten echten Abgleich
prüfen, ob Beträge und Zuordnung stimmen.

---

## 3. SMS über ASPSMS (Erinnerung am Vortag)

1. ASPSMS-Konto › **Userkey** und **Passwort** (API).
2. Secrets:
   ```bash
   npx supabase secrets set ASPSMS_USERKEY=<Userkey>
   npx supabase secrets set ASPSMS_PASSWORT=<Passwort>
   ```
3. Absender `DimSolaire` (höchstens 11 Zeichen) in Einstellungen › Verbindungen; bei ASPSMS freischalten lassen.
4. «Jetzt testen» zeigt das Guthaben.

Die SMS-Liste in «Anfragen & Leads › SMS für morgen» sendet nur auf Knopfdruck. «Automatisch ab 16 Uhr» kann
nur die Administration einschalten (Regel 6: nach aussen nur mit Freigabe, ausser ausdrücklich automatisch).

---

## 4. Zeitplan (alles im Hintergrund)

Jede Minute sendet der Zeitplan freigegebene Mails und SMS; alle 5 Minuten holt er Anfragen, alle 15 Minuten
Kalender und Mail-Verlauf, nachts sichert er Dateien in SharePoint.

```bash
npx supabase secrets set ZEITPLAN_SCHLUESSEL=$(openssl rand -hex 24)
```

Dann im Supabase-Dashboard › **SQL Editor** (einmal, mit denselben Werten):

```sql
select vault.create_secret('https://<projekt>.supabase.co/functions/v1', 'crm_funktionen_url');
select vault.create_secret('<derselbe ZEITPLAN_SCHLUESSEL>', 'crm_zeitplan_schluessel');
```

Ob er läuft, zeigt Einstellungen › Verbindungen › «Hintergrund-Jobs».

---

## 5. Prüfen ohne echte Konten (für Entwicklung)

`npm run integrationen:pruefen` startet Ersatz-Server für Microsoft, AbaNinja und ASPSMS und prüft jeden
Ablauf (Anmelden, Kalender, Termin, Mail mit Anhang, Anfragen, .eml, SharePoint, SMS, AbaNinja, Zeitplan).
Das ersetzt **nicht** den Test mit echten Konten (oben, je «Jetzt testen» und ein echter Versand an sich selbst).

## 6. Wenn etwas nicht geht

| Meldung                             | Bedeutung                                  | Was tun                                                       |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Nicht eingerichtet                  | Secrets fehlen                             | Abschnitt 1.2, 2 oder 3                                       |
| Nicht verbunden / Neu verbinden     | Person hat (noch) keine gültige Verbindung | Mein Konto › Mit Microsoft verbinden                          |
| Kein Zugriff                        | Microsoft verweigert Postfach oder Ordner  | Stellvertretung (1.3) oder Admin-Zustimmung (1.1, Punkt 6)    |
| Dieses Konto gehört nicht zu dir    | Mit fremdem Microsoft-Konto angemeldet     | Im Browser bei Microsoft abmelden, neu verbinden              |
| Unklar, ob angekommen               | Versand brach ab                           | Im Postfach «Gesendete Elemente» prüfen, erst dann neu senden |
| AbaNinja lehnt den Zugang ab        | Token falsch oder abgelaufen               | Neues Token (Abschnitt 2)                                     |
| AbaNinja nimmt die Angaben nicht an | Anrede/Adresse passt nicht                 | Anrede-Werte prüfen (Abschnitt 2, Punkt 4)                    |
| SMS nicht angenommen (Code …)       | ASPSMS-Fehler, z. B. Guthaben              | Guthaben bei ASPSMS prüfen                                    |
