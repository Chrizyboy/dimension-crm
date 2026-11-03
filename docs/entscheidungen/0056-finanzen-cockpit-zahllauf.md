# 0056 – Finanzen für Geschäftsleitung und Buchhaltung: Cockpit, Zahllauf, Konten, MWST, Abschluss (2.11.2026)

## Ausgangslage

Chris: Finanzen wirke «nur nach Fassade». Das Modul war die Liquiditätsplanung der Vorlage V233 mit sieben Reitern
(Übersicht, Zahlungen, Material, Fixkosten, Eingänge, Bank, Nachkalkulation), ohne Trennung der Gesellschaften,
ohne Freigabe vor dem Zahlen und mit einem einzigen, von Hand eingetragenen Kontostand. Buchhaltung, Lohn und
MWST-Abrechnung bleiben in AbaNinja; Rechnungen stellen/mahnen und Spesen haben eigene Module.

Vorschau mit Beispieldaten: https://claude.ai/artifact/Agf1M2kQ7rAceG7FXDYEnq. Gebaut nach den Empfehlungen der
Fragen vom 2.11. (getrennt Muri/Bulle, Freigabe GL mit zweiter Person, bezahlen in AbaNinja/E-Banking, camt.053,
MWST effektiv quartalsweise, Budget später).

## Entscheid

- **Sechs Reiter:** Cockpit · Lieferantenrechnungen · Zahllauf · Liquidität (Wochen, Material, Fixkosten,
  Eingänge) · Projekte & Marge · Konten, MWST & Abschluss. Alte Adressen (`?reiter=zahlungen` …) führen weiter
  (`ALTE_REITER`).
- **Gesellschaft** (`firma_id`) an Lieferantenrechnungen, Material, Fixkosten und Eingängen, aus dem Projekt bzw.
  Standort vorbelegt. Oben wählt man Muri GmbH, Bulle Sàrl oder beide; Reserve je Gesellschaft
  (`finanz_einstellungen.reserve_je_firma`).
- **Prüfschritt** `kreditor_zahlungen.pruefung`: neue Rechnungen aus AbaNinja starten bei «freigabe»; das Visum der
  Projektleitung läuft über die Eingangsrechnungen (Modul Rechnungen). Wird eine Rechnung «geprüft», setzt der
  Trigger `vorbereiten` sie auf «bereit». «Zu klären» und «zurückhalten» nur mit Grund (`kreditor_pruefung`).
- **Zahllauf** je Gesellschaft und Konto: Buchhaltung bereitet vor (`zahllauf_anlegen`, Vorschlag mit Betreibung
  und Skonto zuerst, ohne Löhne), eine **zweite Person** gibt frei (`zahllauf_freigeben`, Fehler
  `finanzen.vier_augen`; wer freigeben darf, optional in `einstellungen.finanzen.zahllauf_freigabe`). Bezahlt wird
  in AbaNinja oder im E-Banking; die App löst keine Zahlung aus (Regel 6).
- **Konten** (`finanz_konten`) mit IBAN; Kontoauszug **camt.053** wird im Browser gelesen und mit
  `kontoauszug_einlesen` übernommen (keine Doppelten, Belastungen eines freigegebenen Zahllaufs → bezahlt).
- **MWST** effektive Methode: `mwst_schaetzung()` je Gesellschaft und Quartal (oder Semester,
  `einstellungen.finanzen.mwst_periode`), Saldosteuersatz möglich; der verbindliche Betrag aus AbaNinja
  (`mwst_abrechnungen`) ersetzt die Schätzung. Fällig 60 Tage nach Periodenende, fliesst in die Liquidität.
- **Marge** aller Projekte in einer Abfrage (`marge_uebersicht()`), je Produkt nur aus fertigen Projekten,
  «unter Soll» ab 5 Prozentpunkten, angefangene Arbeiten = Kosten laufender Projekte minus verrechnet
  (`lib/marge.ts`).
- **Monatsabschluss** (`monatsabschluss_stand`, `monatsabschluesse`): Liste mit Konten, Zuordnung, Gesellschaft,
  Freigaben, Spesen, Tranchen, Zeiten und letztem AbaNinja-Abgleich; Bestätigen auch mit offenen Punkten (werden
  gespeichert). Offene Posten als CSV.

## Folgen

- Budget je Jahr kommt später (eigener Schritt).
- Die alten Einstellungen der Vorschau (Wochen, Vorlauf, alter Kontostand) liegen unter «Konten, MWST & Abschluss».
- pgTAP: `supabase/tests/finanzen_ausbau.test.sql`.
