# Anmeldung einrichten

So kommt die Anmeldung vom lokalen Test in den echten Betrieb. Lokal ist alles schon in `supabase/config.toml` eingestellt.

## 1. Microsoft-Anmeldung (Entra ID)

1. [Microsoft Entra Admin Center](https://entra.microsoft.com) → _Anwendungen_ → _App-Registrierungen_ → _Neue Registrierung_.
2. Name «Dimension Work», Kontotyp «Nur Konten in diesem Organisationsverzeichnis».
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
- Absender: siehe Abschnitt 3a. Der eingebaute Versand von Supabase ist nur für Tests gedacht und stark begrenzt.
- _URL Configuration_: Site URL auf die Adresse der App setzen.

## 3a. Absender noreply@ über Microsoft 365 (Entscheid Chris 01.11.2026)

Codes und Einladungen gehen nicht über SMTP, sondern über die Edge Function `anmeldemail` (Send Email Hook) und
Microsoft Graph aus dem freigegebenen Postfach `noreply@dimension-solaire.ch`. Grund: SMTP mit Passwort sperrt
Microsoft Ende 2026, und ein freigegebenes Postfach hat kein Passwort. Die Vorlagen in `supabase/templates/` gelten
dann nur noch lokal (Mailpit); den Text im Betrieb baut `supabase/functions/_shared/anmeldemail.ts`.

1. Entra → App-Registrierung «Dimension Work» → _API-Berechtigungen_ → _Berechtigung hinzufügen_ → _Microsoft Graph_ →
   _Anwendungsberechtigungen_ → `Mail.Send` → _Administratorzustimmung erteilen_.
2. Empfohlen: die App in Exchange auf das Postfach noreply@ beschränken (RBAC für Anwendungen, Rolle
   «Application Mail.Send» mit Bereich nur noreply@). Sonst dürfte die App aus jedem Postfach senden.
3. Funktion hochladen (`npx supabase functions deploy anmeldemail`, macht auch `cloud-aktualisieren.ps1`).
4. Supabase-Dashboard → _Authentication_ → _Hooks_ → _Send Email_ → Typ _HTTPS_, URL
   `https://<projekt>.supabase.co/functions/v1/anmeldemail`, _Generate secret_. Das Geheimnis kopieren und unter
   _Edge Functions_ → _Secrets_ als `ANMELDEMAIL_HOOK_SECRET` speichern. Danach den Hook einschalten.
5. Test: auf der Anmeldeseite einen Code anfordern. Kommt keiner, Hook ausschalten (dann sendet wieder Supabase)
   und unter _Edge Functions_ → _anmeldemail_ → _Logs_ nachsehen.

Wichtig: Danach in der Cloud kein `supabase config push` mehr, sonst schaltet die lokale `config.toml` den Hook
wieder aus. Der Hook ist lokal bewusst aus, damit die Browser-Tests weiter Mailpit lesen.

## 4. Edge Function «einladen»

`npx supabase functions deploy einladen`. Sie liest `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY`, die Supabase selbst bereitstellt.

## 5. Desktop-App (Tauri)

Der Code per Mail funktioniert in der Desktop-App ohne Zusatz. «Mit Microsoft anmelden» läuft im Fenster der App
selbst: Microsoft und Supabase leiten zurück auf die App-Adresse `http://tauri.localhost/`. Dafür bei Supabase ›
Authentication › URL Configuration › Redirect URLs `http://tauri.localhost/**` eintragen (Phase 16, siehe
`docs/umzug.md`). Lokal steht die Adresse schon in `supabase/config.toml`.

## Testpersonen (nur lokal, aus `seed.sql`)

| Adresse                  | Rolle            | Sieht                                     |
| ------------------------ | ---------------- | ----------------------------------------- |
| `admin@test.local`       | Administration   | alles                                     |
| `verkauf@test.local`     | Verkauf          | 15 Bereiche, keine Finanzen/Einstellungen |
| `buchhaltung@test.local` | Buchhaltung (FR) | Finanzen, keine Leads                     |

Den Code liest man lokal in Mailpit: http://127.0.0.1:54324.
