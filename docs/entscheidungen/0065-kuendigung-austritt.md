# 0065 – Kündigung mit Austrittsdatum

Stand: 27.11.2026

## Ausgangslage

Chris (27.11.2026): «sobald jemand kündet muss man das auch da erfassen können und nach der Kündigungszeit erlischt
sein Zugang, die Daten sollen aber im CRM bleiben». Anlass: José hat gekündigt, Milaim übernimmt.

## Entscheid

- Kündigung erfasst nur die Administration unter Einstellungen › Personen (**Kündigung erfassen**): letzter
  Arbeitstag (`personen.austritt_am`) und optional Nachfolge (`personen.nachfolge_id`), über
  `person_austritt_setzen`. Das Datum ist dasselbe wie `personal_akten.austritt` (Abgleich in beide Richtungen).
- Bis und mit dem letzten Arbeitstag gilt alles wie bisher. Ab dem Tag danach liefert `intern.wirksame_rechte` keine
  Rechte mehr (sofort, ohne auf den Zeitplan zu warten).
- pg_cron `personen-austritt` (stündlich, `intern.austritte_vollziehen`) schaltet die Person aus (`aktiv = false`),
  beendet ihre Anmeldungen und gibt Offenes an die Nachfolge (`intern.zustaendigkeiten_uebertragen`): offene
  Offerten, laufende Projekte, offene Service-Fälle, offene Aufgaben, offene Mails, Grossprojekte, Kundenbetreuung,
  Vorgesetzt, künftige Einsätze, Kürzel/IDs in `einstellungen`. Abgeschlossenes bleibt bei der Person.
- Nichts wird gelöscht. Wieder einschalten geht wie bisher mit dem Schalter **Aktiv** (Kündigung vorher zurücknehmen).

## Folgen

Neue Tabellen mit einer «zuständigen Person» für offene Arbeit gehören in `intern.zustaendigkeiten_uebertragen`.
