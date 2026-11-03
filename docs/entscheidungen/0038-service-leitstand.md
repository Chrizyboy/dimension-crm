# 0038 – Service & Garantie neu: Leitstand, Fall-Akte, Störungen von der Website (2.11.2026)

## Ausgangslage

Chris: «Service und Garantie gefällt mir gar nicht», das CRM sei zu einfach und solle für alle das Arbeitsgerät
werden. Der Fall war eine Liste mit kleinem Seitenpanel; Meldungen der Website kamen nur als Mail.

## Entscheid (Schritt 1)

- **Leitstand** statt Liste: Board nach Arbeitsschritt (Eingang, In Arbeit, Geplant, Teile, Erledigt), Karten mit
  Reaktionszeit (rot wenn überfällig), Kennzahlen oben, Schnellfilter (Meine, Überfällig, Anlage steht, Garantie,
  Website, Ohne Kunde), daneben die Liste.
- **Fall-Akte als ganze Seite** (`?fall=…`): Arbeitsschritte, Verlauf mit Art (Anruf, Mail, SMS, Notiz, Besuch),
  Kunde und Ort mit Ansprechperson vor Ort und Zugang, Anlage mit Garantie je Komponente, Checkliste je Kategorie,
  Einsatz, Rapporte mit Stunden, Kosten und Rechnung, frühere Fälle, Mails.
- **Reaktionszeit** je Auswirkung/Priorität, **Checklisten** und **Website-Zuordnung** sind Daten in
  `einstellungen.service` (nur Administration, Trigger `service_schuetzen`).
- **Website-Formular** → Edge Function `stoerung` (Server zu Server, Secret `STOERUNG_SCHLUESSEL`) →
  `service_aus_website`: Zuordnung über Projektnummer, Adresse, E-Mail, Telefon; Bestätigung über den
  Ausgangskorb mit Freigabe (Regel 6). Vertrag: `docs/website-stoerung.md`.

## Folgen

- Neue Spalten auf `service_faelle` (Quelle, Auswirkung, Reaktion bis, Ort, Vor Ort, Zugang, Komponente,
  Fehlercode, Checkliste, Meldung, Zuordnung); alte Fälle bleiben gültig.
- «Mein Tag» zeigt beim Service-Termin Ort, Vor Ort und Zugang.
- Schritt 2 folgt: Einsatzplanung im Zeitplan mit Team und Dauer, Anlage-Akte, Ablauf am Handy.
