# 0041 – Offerten vollständig: Arbeitsvorrat, Nachfassen nach Plan, Varianten, Freigabe

**Datum:** 2.11.2026 · **Stand:** angenommen (Schritt 1)

## Ausgangslage

Offerten entstehen in Eturnity, gehören aber immer ins CRM. Die bisherige Ansicht war eine Liste je Standort mit
Seitenpanel; wer was als Nächstes tun muss, war nicht sichtbar («nur Fassade»). Andy macht die Offerten, Chris
unterstützt und gibt frei, Loris und Filipe fassen nach.

## Entscheid

1. **Arbeitsvorrat als Startansicht:** ein Board mit den Phasen Zu offerieren → In Planung → Prüfen → Offeriert →
   Verhandlung → Gewonnen (14 Tage). Leads im Eingang und Offerten stehen auf derselben Fläche. Kopfzahlen: offen
   offeriert, gewichtet mit Chance, überfällig (Termin länger als `ziel_arbeitstage` her), heute nachzufassen,
   Ø Termin bis Offerte, Quote 90 Tage. Die bisherigen Reiter (Neue Offerten, Muri, Bulle, Nachfassen, PDF-Import)
   bleiben (Regel 1).
2. **Offert-Akte als ganze Seite** (`?offerte=…`, wie die Fall-Akte im Service, Entscheid 0038): Schritte vom Termin
   bis zum Werkvertrag, Kunde, Unterlagen, Versionen, Varianten, Werte aus dem PDF, KI, Verlauf, nächster Schritt,
   Chance.
3. **Nachfassen nach Plan:** beim Senden setzt die Datenbank Gültigkeit und das erste Nachfassen (Plan
   `[3, 10, 21, 30]` Tage). Jedes Gespräch wird mit Ergebnis erfasst (`offerte_nachfassen`): nicht erreicht (in
   2 Arbeitstagen nochmals), vergleicht/interessiert (Verhandlung, nächster Plan-Tag), neue Version, später (vertagt),
   ruht, Ja (gewonnen → Werkvertrag), Nein (Grund aus `verlustgrund_offerte`). Jedes Ergebnis steht im Verlauf.
4. **Varianten in einer Offerte** (z. B. A ohne, B mit Batterie). Die gewählte Variante bestimmt Betrag und Leistung.
5. **Freigabe** vor dem Senden, wenn der Rabatt ab `freigabe.rabatt_ab` (5 %) oder die Marge unter
   `freigabe.marge_unter` (18 %) liegt; freigeben darf die Administration oder wer in `freigabe.durch` steht. Ohne
   Freigabe verweigert die Datenbank das Senden (`offerte.freigabe_fehlt`).
6. **Chance** automatisch aus der Phase, von Hand überschreibbar (leer = wieder automatisch).

Alle Werte in `einstellungen.offerten` (nur Administration). Regeln liegen in der Datenbank
(`intern.stand_offerte`, Trigger `offerte_vor_senden`), nicht in der App.

## Offen (Schritt 2)

Eingang aus Eturnity mit Abweichungen und Stückliste, Auswertung (Verlustgründe, Quote je Person), Handy-Ansicht.
Die drei Fragen (Varianten, Freigabe-Regel, Chance) sind nach Empfehlung A gebaut, bis Chris anders entscheidet.
