# 0061 – Nur Besprochenes zeigen

Stand: 27.11.2026

## Ausgangslage

Chris (27.11.2026): «es hat einige funktionen die so nie besprochen wurden, setze das um, was wir besprochen haben in
diesem oder im alten crm.» Mehrere Ausbauten (Entscheide 0041, 0045, 0046, 0057) waren auf Empfehlung gebaut, ohne
ausdrückliches Ja von Chris.

## Entscheid (je Bereich von Chris gewählt)

- **Finanzen**: Zahllauf, Kontoauszug (camt.053), MWST-Schätzung und Monatsabschluss ausgeblendet. Konten und
  Kontostand stehen unter Liquidität (für den Stand je Gesellschaft).
- **Ausgangskorb**: Serien (`SERIEN_AN`) und Brief-Rücklauf ausgeblendet; Später senden, 10 s Rückgängig und
  «Zurück an» bleiben.
- **Aufgaben**: wie V234, ohne Wiederholung, Teilschritte, Kommentare und Team-Sicht (`AUFGABEN_ZUSAETZE`).
- **Offerten**: Varianten, Rabatt-/Marge-Freigabe (`einstellungen.offerten.freigabe.aktiv = false`) und automatische
  Chance ausgeblendet (`OFFERTEN_ZUSAETZE`); Chance nur von Hand.
- **Einkauf**: Lagerplatz, Inventur in einem Durchgang, Rüstliste, Rückgabe und Reklamationen ausgeblendet
  (`EINKAUF_ZUSAETZE`). Die Lagerbuchung mit Art «Inventur» aus Phase 9a bleibt.
- **Baustelle** und **Team & Ausweise**: alles bleibt.

## Folgen

- Ausblenden statt löschen: Tabellen, Funktionen und Daten bleiben. Ein Schalter je Bereich (`lib/zusaetze.ts`)
  holt alles zurück.
- Neue Funktionen nur mit ausdrücklichem Ja von Chris oder aus V233/V234.
