# 0052 – Termin-Link: Kunden buchen die Besichtigung auf dimension-solaire.ch (3.11.2026)

## Ausgangslage

Schritt 2 von «Anfragen & Leads» (Entscheid 0047): Termine für die Besichtigung wurden nur am Telefon vereinbart.
Wer nicht erreicht wird, wartet. Chris wählte am 3.11.2026 (Pop-up): Buchen «Auf dimension-solaire.ch».

## Entscheid

- Der Verkauf schickt aus der Lead-Akte einen persönlichen Link per SMS oder Mail («Termin-Link senden»). Die Nachricht
  liegt als Entwurf im Ausgangskorb und geht erst nach Freigabe (Regel 6).
- Die Seite liegt auf der Website (`/de/termin/`, `/fr/rendez-vous/`, `noindex`), damit der Kunde bei der bekannten
  Marke bleibt. Der Browser spricht nur mit dem eigenen Website-Server, der mit `ANFRAGE_SCHLUESSEL` an die Edge
  Function `termin` weiterleitet. Kein Supabase-Zugang im Browser, kein neues Geheimnis.
- Freie Zeiten rechnet die Datenbank aus Besuchszeiten, Outlook-Kalender, Abwesenheiten und Feiertagen; Werte als Daten
  in `einstellungen.verkauf.termin_link` (Regel 8). Buchen sperrt pro Verkäufer (Advisory Lock) und prüft noch einmal.
- Nach dem Buchen: Stand «Termin vereinbart» über `setze_stand`, Glocke an den Verkäufer, Link ungültig.
- Nur Vorname, Verkäufer, Ort und Zeiten gehen an die Website.

## Folgen

- Gebuchte Besichtigungen stehen wie andere Termine in der Planung und in «Mein Tag»; der Eintrag in Outlook bleibt
  der bestehende Knopf «In Outlook eintragen».
- Vertrag: `docs/website-anfrage.md`, Abschnitt Termin-Link. Website: `termin-proxy.mjs` im Repository der Website.
