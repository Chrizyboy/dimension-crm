# 0054 – Rollen: Geschäftsleitung und Administration als Zusätze

**Datum:** 03.11.2026 · **Entschieden von:** Chris (Abhak-Liste vom 02.11.2026)

## Ausgangslage

Bisher war «Administration» eine Rolle, die alles sah und alles änderte. Chris wollte eine Geschäftsleitung, die
alles sieht (auch Finanzen), aber das System nicht ändert, und eine Administration, die nicht alle Details sieht.

## Entscheid

- **Zusätze statt Rollen:** Jede Person hat eine Rolle im Geschäft (Verkauf, Innendienst, Projektleitung, Montage,
  Buchhaltung). «Geschäftsleitung» (Recht `gl`) und «Administration» (Recht `admin`) kommen dazu.
  GL: Chris, Andy, Erich. Administration: Chris, Loris.
- **GL (42A, 43A):** arbeitet im Alltag normal, sieht alle Bereiche und Finanzen. `intern.wirksame_rechte()` macht
  aus `gl` die Rechte preise, finanzen, planung, personal, marge, visum. Einstellungen sieht die GL nur (Hinweis,
  kein «Einladen»); ändern braucht `admin`.
- **Administration (41A):** nur System (Personen, Rollen, Verbindungen, Sicherung). `admin` gibt keine Finanzen,
  keine Einkaufspreise, keine Marge und keine fremden Personal-Akten mehr.
- **Neue Rechte:** `personal` (Personal-Akten, alle Zeiten), `marge` (Kennzahlen mit Marge, Nachkalkulation),
  `visum` (Erstvisum). Rolle «Monteur» geht in «Montage» auf.
- **Zeiten:** alle nur GL und Buchhaltung (personal/finanzen); direkte Vorgesetzte (`personal_akten.vorgesetzt_id`)
  sehen die Zeiten ihrer Mitarbeitenden (`meine_mitarbeitenden()`) und erfassen deren Abwesenheiten
  (`darf_abwesenheit_erfassen`).
- **Posteingang:** eigenes Postfach und Team-Postfächer (info@), nie das Postfach anderer, auch nicht GL und
  Administration. Mails aus persönlichen Postfächern bleiben `sichtbar = 'person'`, auch wenn sie einem Kunden
  zugeordnet sind (Trigger `pe_nur_eigenes_postfach`). Wer in einer Notiz erwähnt wird, darf genau diese Mail lesen.
- **Erstvisum:** Die Projektleitung prüft Rechnungsentwürfe ihrer Projekte ohne Finanzdetails
  (`rechnungen_zum_visum`, `rechnung_visieren`), die Buchhaltung bekommt eine Glocke und gibt frei.
- **Registrier-Link fürs Handy:** Einstellungen › Benutzer › «Ohne Mail: Link fürs Handy» (`person_mit_link_anlegen`,
  `registrier_link_erstellen`). Chris schickt den Link per WhatsApp; die Person gibt ihre private Mail ein und meldet
  sich mit dem Code an. Gültig 14 Tage, einmal.

## Folgen

- Die alte Rolle «admin» bleibt als «Gesamtzugriff (alt)» mit `{gl,admin}`, damit niemand ausgesperrt wird.
- Die Abhak-Liste liegt in `/mnt/project-files/rollen/auswahl-2026-11-02.json` (Projekt-Ablage, nicht in Git).
