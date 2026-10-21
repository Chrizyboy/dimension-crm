# Anmeldung einrichten

So kommt die Anmeldung vom lokalen Test in den echten Betrieb. Lokal ist alles schon in `supabase/config.toml` eingestellt.

## 1. Microsoft-Anmeldung (Entra ID)

1. [Microsoft Entra Admin Center](https://entra.microsoft.com) → _Anwendungen_ → _App-Registrierungen_ → _Neue Registrierung_.
2. Name «Dimension CRM», Kontotyp «Nur Konten in diesem Organisationsverzeichnis».
3. Umleitungs-URI (Web): `https://<projekt>.supabase.co/auth/v1/callback`.
4. _Zertifikate & Geheimnisse_ → neuer geheimer Clientschlüssel. Wert sofort kopieren.
5. Supabase-Dashboard → _Authentication_ → _Sign In / Providers_ → _Azure_: Client-ID, Geheimnis und als URL `https://login.microsoftonline.com/<tenant-id>` eintragen, einschalten.
6. Lokal (optional): die drei Werte als `SUPABASE_AUTH_EXTERNAL_AZURE_*` in `.env` (siehe `.env.example`) und in `config.toml` `enabled = true`.

Der Microsoft-Knopf erscheint von selbst, sobald der Anbieter eingeschaltet ist. Das Geheimnis liegt nur bei Supabase, nie in der App oder in Git.

## 2. Anmelde-Hook

Dashboard → _Authentication_ → _Hooks_ → _Before User Created_ → Postgres-Funktion `intern.vor_konto_anlage`. Ohne diesen Hook könnte sich jede Adresse ein Konto anlegen.

## 3. Mail-Vorlagen

Dashboard → _Authentication_ → _Emails_:

- _Magic Link_ und _Confirm signup_: Inhalt aus `supabase/templates/anmeldecode.html` (zeigt den Code).
- _Invite user_: Inhalt aus `supabase/templates/einladung.html`.
- _SMTP_: eigener Absender (z. B. `crm@dimension-solaire.ch` über Microsoft 365). Der eingebaute Versand von Supabase ist nur für Tests gedacht und stark begrenzt.
- _URL Configuration_: Site URL auf die Adresse der App setzen.

## 4. Edge Function «einladen»

`npx supabase functions deploy einladen`. Sie liest `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY`, die Supabase selbst bereitstellt.

## 5. Desktop-App (Tauri)

Der Code per Mail funktioniert in der Desktop-App ohne Zusatz. Für Microsoft öffnet die App das Anmeldefenster im System-Browser. Die Rückkehr in die App (eigenes URL-Schema) wird in Phase 16 (Installation) eingerichtet. Bis dahin: Code per Mail.

## Testpersonen (nur lokal, aus `seed.sql`)

| Adresse                  | Rolle            | Sieht                                     |
| ------------------------ | ---------------- | ----------------------------------------- |
| `admin@test.local`       | Administration   | alles                                     |
| `verkauf@test.local`     | Verkauf          | 15 Bereiche, keine Finanzen/Einstellungen |
| `buchhaltung@test.local` | Buchhaltung (FR) | Finanzen, keine Leads                     |

Den Code liest man lokal in Mailpit: http://127.0.0.1:54324.
