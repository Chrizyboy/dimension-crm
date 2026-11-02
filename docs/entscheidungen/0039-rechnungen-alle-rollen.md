# 0039 – Rechnungen für alle Rollen

Datum: 2.11.2026 · Entschieden von Chris (Thread «Rechnungen vollständig machen», Fragen 1–5 per Pop-up)

## Ausgangslage

Das Modul Rechnungen war nur für die Buchhaltung (Recht `finanzen`) da. Projektleitung und Verkauf sahen nicht,
ob ihre Kunden bezahlt haben; Mahnen ging nur einzeln; Lieferantenrechnungen lagen ohne Visum in den Finanzen.

## Entscheide

1. **Eingangsrechnungen mit Visum im Modul Rechnungen** (1A). Buchhaltung bleibt in AbaNinja; das CRM sammelt das
   Visum. Erstvisum durch die Projektleitung des Projekts.
2. **Zweitvisum der Geschäftsleitung ab CHF 5'000 oder ohne Bestellung** (2A), Vier-Augen (nicht dieselbe Person).
   Betrag und GL-Personen in `einstellungen.finanzen.eingang`.
3. **Projektleitung und Verkauf sehen den Zahlungsstand ihrer Projekte**, nur lesen (3A). Rolle bekommt den
   Bereich `invoices`; ohne `finanzen` nur die Reiter «Meine Projekte» und «Eingangsrechnungen».
4. **Mahnlauf jeden Montag, freigeben nur Chris** (4A). Person in `einstellungen.finanzen.mahnlauf.freigabe_person_ids`.
   Ein Trigger auf dem Ausgangskorb erzwingt das auch für Automationen (sie legen zur Freigabe ab).
5. **Verrechnen bei Meilenstein, ausgelöst durch den zuständigen Projektleiter.** Erst sein Klick legt den Entwurf
   an; die Buchhaltung prüft und stellt.

## Folgen

- Mahnstufe per Mail zählt erst beim Senden (Trigger `mahnung_gesendet`), per Post sofort. Vorher zählte das
  Mahnen in der Akte die Stufe doppelt (einmal beim Setzen, einmal beim Senden).
- Erste Stufe ist eine freundliche Zahlungserinnerung (Art `zahlungserinnerung`), danach 1.–3. Mahnung.
- Ausgebuchtes zählt wie bezahlt (Rechnung erledigt); gebucht wird in AbaNinja.
