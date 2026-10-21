# 0012 – Anmeldung per Microsoft oder Code per E-Mail, Rollen als Daten

**Kontext:** Phase 0 legte fest: «SSO als Standard, Passwort als Ausnahme». Chris wählte am 21.10.2026 für alle ohne Microsoft-Konto den **Code per E-Mail** statt eines Passworts. V233 hatte feste Register-Rechte pro Person (`REG_PERMS`) und eine Rolle als Text.

**Entscheid:**

- **Anmeldung:** Microsoft-Firmenkonto (Entra ID), sobald es in Supabase eingeschaltet ist. Sonst ein 6-stelliger Code per Mail, 10 Minuten gültig. Es gibt keine Passwörter, also auch kein «Passwort vergessen».
- **Nur erfasste Personen:** Der Hook `intern.vor_konto_anlage` lässt ein Konto nur für aktive Personen aus `personen` zu. Fremde Adressen bekommen eine verständliche Absage (403), auch wenn sie den Code-Knopf drücken.
- **Rollen als Daten:** Die Tabelle `rollen` hält Name (DE/FR), Rechte und sichtbare Bereiche. Die Administration ändert sie in Einstellungen → Rollen, ohne Code (CLAUDE.md Regel 8). Eine Person kann Zusatzrechte und eine eigene Bereichsauswahl haben.
- **Zwei Ebenen:** Die _Rechte_ (`basis`, `preise`, `finanzen`, `admin`) schützt die Datenbank mit RLS. Die _Bereiche_ blenden nur Menüpunkte aus, damit die Seitenleiste übersichtlich bleibt. Wer Daten wirklich nicht sehen darf, braucht dafür ein Recht, nicht nur einen ausgeblendeten Bereich.
- **Selbstschutz:** Rolle, Rechte und Bereiche ändert nur die Administration. «Mein Konto» erlaubt nur die Profilfelder aus V233 (`aendere_mein_konto`). Die letzte Admin-Person kann sich nicht aussperren.
- **Einladung:** Die Edge Function `einladen` legt die Person an und schickt die Mail. Sie braucht den geheimen Schlüssel, darum läuft sie auf dem Server und prüft vorher, ob die aufrufende Person Admin ist.
- **Leichte Seiten:** Modul-Seiten werden erst beim Öffnen geladen (`lazy`), damit die Navigation schnell bleibt.

**Folgen:** Das Änderungsprotokoll zeigt Einträge nur noch, wenn man die Tabelle selbst lesen darf (vorher sah jede Person auch Finanz-Änderungen). Der Import übernimmt die V233-Register als Bereiche; Mitarbeitende ohne passende Rolle landen in «Noch zuordnen» und sehen nur Heute, Aufgaben und Handbuch, bis die Administration eine Rolle setzt.
