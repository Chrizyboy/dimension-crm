# 0059 – Zeiterfassung und Abwesenheiten für alle (11.11.2026)

## Ausgangslage

Chris: «Baue ein Zeiterfassungssystem ins CRM ein. Loris und Chris sollen den Überblick über alle Mitarbeitenden
haben, der Rest soll einfach seine eigenen sehen. Urlaub und andere Abwesenheiten sollen auch darüber gemanagt
werden.» Bisher gab es Zeiten nur in «Baustelle & Rapporte» (Montage, jede Zeit mit Ziel, Prüfen und Lohn-Export)
und Abwesenheiten ohne Antrag unter «Projekte & Montage». Ein Saldo rechnete ohne Feiertage, Ferien gab es nicht.

## Entscheid

- **Ein Bereich «Zeiterfassung»** (`src/modules/time`, Gruppe Betrieb, für alle sichtbar) mit den Reitern Meine Zeit,
  Abwesenheiten und (nur Zeit-Leitung) Team. Keine zweite Zeiten-Tabelle: gestempelt wird in `zeiten` wie in
  «Baustelle»; Büro stempelt auf den neuen internen Posten «Büro». Montage stempelt Baustelle/Service weiter dort.
- **Zeit-Leitung als Daten**: `einstellungen.zeiterfassung.leitung` (Kürzel, Standard `chris`, `loris`), geprüft mit
  `intern.zeit_leitung()`. Sie sieht alle Zeiten, Abwesenheiten und Konten und bewilligt. Alle anderen sehen nur sich
  selbst; «personal» (GL, Buchhaltung) und direkte Vorgesetzte behalten ihre bisherigen Rechte.
- **Abwesenheiten mit Stand** beantragt → bewilligt/abgelehnt, nur über `abwesenheit_speichern`/`_entscheiden`/
  `_zurueckziehen`; der Trigger `stand` setzt «beantragt» für alle ohne Leitung. Ablehnen nur mit Grund, Glocke in
  beide Richtungen. Krank und Unfall gelten sofort und melden die Leitung. Welche Art eine Bewilligung braucht, als
  Soll zählt oder Ferien verbraucht, sind Eigenschaften der Auswahlliste `abwesenheit` (bewilligung, soll, ferien).
  Lesen der Tabelle nur noch eigene, Leitung, «personal», «planung» und Vorgesetzte.
- **Rechnen nur in der Datenbank** (`intern.zeit_tage`, `intern.zeit_konto`): Soll = Wochenstunden der Personal-Akte
  (sonst Standard × Pensum) / 5, Mo–Fr ohne Feiertage des Standorts (Ostern gerechnet, Liste je Standort in den
  Einstellungen), ab `aktiv_seit` und Eintritt. Ferienanspruch anteilig ab Eintritt plus Übertrag (`zeitkonten`).
  Das Wochenblatt in «Baustelle» nutzt denselben Saldo.

## Folgen

- Planer, die unter «Projekte & Montage» Abwesenheiten erfassen, gehen über denselben Ablauf (Antrag an die Leitung).
- Im Betrieb Übertrag (Restferien, Überstunden) je Person unter Team › Stift eintragen.
- Offen: Lohn-Export bleibt in «Baustelle»; Fragen an Chris (Büro stempelt? Krank ohne Bewilligung?) als Karten
  gestellt, gebaut mit den Empfehlungen.
