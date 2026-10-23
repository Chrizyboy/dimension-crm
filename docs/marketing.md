# Marketing einrichten: Facebook, Instagram, LinkedIn, Canva, Abmelde-Link (Phase 11)

Diese Anleitung ist für den Betrieb. Sie braucht keine Programmierkenntnisse, aber Zugang zu: der Facebook-Seite
und dem Instagram-Geschäftskonto von Dimension Solaire (als Admin), der LinkedIn-Firmenseite (als Super-Admin),
dem Canva-Team und dem Supabase-Projekt (Dashboard).

**Grundregel:** Kein Schlüssel und kein Passwort kommt in die App, in Git, in einen Chat oder in eine Mail.
Alle Geheimnisse stehen nur in den **Supabase-Secrets** (Dashboard › Edge Functions › Secrets oder
`npx supabase secrets set NAME=wert`). Die App sieht nur, _ob_ ein Dienst eingerichtet und verbunden ist.

**Was ohne Einrichtung schon geht:** Kunden anschreiben (Serienbrief als PDF, Serien-Mail über das eigene
Outlook aus Phase 8, Adressliste als CSV), Newsletter, Vorlagen und Post-Entwürfe. Facebook, Instagram,
LinkedIn und Canva braucht es nur, damit das CRM selbst postet bzw. Bilder aus Canva holt.

Voraussetzung aus Phase 8: `VERBINDUNG_SCHLUESSEL` (verschlüsselt die Verbindungen) und `APP_URL` sind gesetzt,
der Zeitplan läuft (docs/integrationen.md, Abschnitt 4). Der Zeitplan veröffentlicht freigegebene Posts zur
geplanten Zeit, sobald Meta oder LinkedIn eingerichtet ist.

Rückruf-Adresse für alle drei Dienste (beim Anbieter als «Redirect URI» eintragen):
`https://<projekt>.supabase.co/functions/v1/social-rueckruf`

---

## 1. Facebook-Seite und Instagram (Meta)

Ein Konto für die ganze Firma: verbunden wird einmal durch eine Person mit Admin-Recht im CRM.

### 1.1 App bei Meta anlegen (einmal)

1. Instagram-Konto in den Einstellungen auf **Geschäftskonto** stellen und mit der Facebook-Seite verknüpfen
   (Instagram › Einstellungen › Konto › Mit Facebook-Seite verbinden).
2. https://developers.facebook.com › **Meine Apps** › **App erstellen** › Typ **Business**, Name z. B.
   «Dimension CRM», Business-Portfolio von Dimension Solaire wählen.
3. Produkt **Facebook Login for Business** hinzufügen. Unter Einstellungen › **Gültige OAuth-Redirect-URIs** die
   Rückruf-Adresse von oben eintragen.
4. Unter App-Einstellungen › Allgemein **App-ID** und **App-Geheimcode** kopieren (nur für Schritt 1.2).
5. Berechtigungen: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`,
   `instagram_content_publish`, `business_management`. Solange nur Personen mit einer Rolle in der App verbinden,
   reicht «Standard Access». Für den Betrieb die App auf **Live** stellen; Meta verlangt dafür je nach Fall eine
   Business-Verifizierung oder App-Prüfung.

### 1.2 Secrets setzen

```
npx supabase secrets set META_APP_ID=… META_APP_SECRET=…
# freiwillig, wenn das Konto mehrere Seiten verwaltet:
npx supabase secrets set META_SEITE_ID=<ID der Seite Dimension Solaire>
```

### 1.3 Verbinden

CRM › **Marketing** › **Social Media** › Karte «Facebook und Instagram» › **Verbinden**. Bei Meta anmelden, die
Seite Dimension Solaire und das Instagram-Konto auswählen, zustimmen. Danach steht dort «Verbunden» mit dem
Seitennamen. Der Seiten-Zugang läuft nicht ab, solange niemand das Passwort ändert oder die App entfernt; sonst
zeigt die Karte «Neu verbinden».

## 2. LinkedIn-Firmenseite

1. https://www.linkedin.com/developers › **Create app**, als Firmenseite «Dimension Solaire» wählen. Die Seite
   muss die App bestätigen (Super-Admin bekommt eine Anfrage).
2. Reiter **Products**: **Community Management API** beantragen (LinkedIn prüft den Antrag, das kann einige Tage
   dauern). Ohne dieses Produkt darf keine App auf eine Firmenseite posten.
3. Reiter **Auth**: Rückruf-Adresse unter «Authorized redirect URLs» eintragen; **Client ID** und **Client
   Secret** kopieren.
4. Secrets:

```
npx supabase secrets set LINKEDIN_CLIENT_ID=… LINKEDIN_CLIENT_SECRET=…
# freiwillig, wenn die Person mehrere Firmenseiten verwaltet:
npx supabase secrets set LINKEDIN_ORGANISATION=urn:li:organization:<Nummer>
```

5. CRM › Marketing › Social Media › «LinkedIn-Firmenseite» › **Verbinden** (als Super-Admin der Firmenseite).
   Der Zugang gilt 60 Tage und wird automatisch verlängert; nach einem Jahr will LinkedIn eine neue Anmeldung
   («Neu verbinden»).

## 3. Canva (Bilder mit dem Markenkit)

1. https://www.canva.com/developers › **Integrations** › **Create an integration**. Canva erlaubt eigene
   Integrationen je nach Abo als «private» (Canva Enterprise) oder als «public» mit Prüfung durch Canva.
2. Scopes: `design:content:read`, `design:content:write`, `design:meta:read`, `asset:read`, `asset:write`,
   `brandtemplate:meta:read`. Rückruf-Adresse von oben eintragen. **Client ID** und **Client Secret** kopieren.
3. Secrets: `npx supabase secrets set CANVA_CLIENT_ID=… CANVA_CLIENT_SECRET=…`
4. CRM › Marketing › Social Media › «Canva» › **Verbinden**.

Im Post: **In Canva gestalten** legt ein leeres Design im gewählten Format an (Quadrat, Hochformat, Story,
Querformat) und öffnet es in Canva. Dort mit dem Markenkit gestalten, dann im CRM **Bild aus Canva übernehmen**:
das Bild kommt als JPG in die Ablage (Ordner «marketing»). Ohne Canva-Verbindung: in Canva herunterladen und als
**Eigenes Foto** hochladen; das geht immer.

## 4. Abmelde-Link und Werbesperre

Jede Serien-Mail und jeder Newsletter hat unten einen persönlichen Abmelde-Link
(`…/functions/v1/abmelden?s=<Schlüssel>`). Wer ihn öffnet, ist sofort abgemeldet (Werbesperre) und sieht eine
kurze Bestätigung auf Deutsch oder Französisch. Der Link braucht keine Anmeldung und verrät nichts über die Person.

- Von Hand: Marketing › Kunden anschreiben › «…» in der Zeile › **Keine Werbung mehr** (oder in der Kundenakte
  der Schalter «Werbesperre»). Rückgängig mit **Werbung wieder erlauben**.
- Newsletter bekommt nur, wer **Kunde** ist (mindestens ein Auftrag) oder eine **Einwilligung** mit Datum und
  Nachweis hat («…» › **Einwilligung erfassen**). So verlangt es das Datenschutzgesetz (revDSG) und das UWG.

## 5. Prüfen ohne echte Konten (für Entwicklung)

`npm run marketing:pruefen` startet Ersatz-Server für Meta, LinkedIn und Canva und prüft jeden Ablauf (Verbinden
mit Zustand und PKCE, Post mit und ohne Bild auf Facebook, Instagram und LinkedIn, Wiederholen nur der
fehlgeschlagenen Netzwerke, abgelaufene Zugänge, Canva-Design und Export, Abmelde-Link, Rechte). Das ersetzt
**nicht** den Test mit echten Konten: nach dem Einrichten einen Post «nur LinkedIn» mit dem Text «Test» auf
einen Termin in 5 Minuten freigeben, prüfen, ob er erscheint, und ihn danach im Netzwerk löschen.

## 6. Wenn etwas nicht geht

| Meldung                                 | Bedeutung                                         | Was tun                                                  |
| --------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| Auf dem Server noch nicht eingerichtet  | Secrets fehlen                                    | Abschnitt 1.2, 2 oder 3                                  |
| Neu verbinden                           | Zugang abgelaufen oder entzogen                   | Karte «Neu verbinden», danach den Post erneut freigeben  |
| Keine Seite gefunden                    | Das Konto verwaltet keine Seite / Firmenseite     | Mit dem Konto verbinden, das Admin der Seite ist         |
| Kein Instagram-Geschäftskonto           | Instagram nicht mit der Facebook-Seite verknüpft  | Abschnitt 1.1, Punkt 1                                   |
| Instagram braucht ein Bild              | Instagram postet nur mit Bild                     | Bild anhängen oder Instagram abwählen                    |
| Keine Antwort: bitte im Netzwerk prüfen | Verbindung brach ab, Post evtl. trotzdem sichtbar | Im Netzwerk nachsehen, erst dann «Jetzt veröffentlichen» |
| Meta / LinkedIn hat den Post abgelehnt  | Text oder Bild verletzt eine Regel des Netzwerks  | Text kürzen, Bild prüfen (JPG/PNG, unter 8 MB)           |
