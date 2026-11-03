# 0047 – Anfragen & Leads neu: Zu tun, 15-Minuten-Uhr, Lead-Akte, Website direkt (2.11.2026)

## Ausgangslage

Chris: das CRM fühle sich «nur nach Fassade» an, jedes Modul müsse seinen Zweck ganz erfüllen. Im Verkauf fehlte
die Antwort auf «wen rufe ich jetzt an?»; Website-Anfragen kamen nur als Mail; niemand sah, wie schnell angerufen
wird. Vorschau: https://claude.ai/artifact/C4z4PAedJHwCSrcttMrakH

## Entscheide von Chris (Pop-up-Karten, 2.11.2026)

1. Alles in zwei Schritten. Schritt 1: Zu tun, Lead-Akte als Seite, Anruf-Ergebnis, 6 Schritte, Website direkt,
   Dach/Richtpreis, Nachfassen, Verkaufssteuerung. Schritt 2: Termin-Link, Planung zusammengelegt, Besichtigung am Handy.
2. Eingangsbestätigung an Website-Kunden automatisch: das macht die Website schon, das CRM schickt keine zweite.
3. Nach 15 Minuten ohne Anruf Erinnerung an den Verkäufer, nach 2 Stunden an Chris (in der Arbeitszeit).
4. Richtpreis **nur intern**, nie an den Kunden. «Will zuerst einen Preis» bestellt die Offerte bei Andy ohne Besuch.
5. Nachfass-Mails an Tag 3, 10 und 21 als Entwurf; der Verkäufer gibt frei (Regel 6).

## Umsetzung

- `einstellungen.verkauf`: Minuten, Arbeitszeit, Feiertage, Nachfass-Tage, Wiedervorlage, Richtpreis-Stufen, SMS-Text
  nach «nicht erreicht» (Regel 8). App rechnet die Arbeitsminuten gleich wie die Datenbank (`lib/arbeitszeit.ts`).
- Erstkontakt: Trigger `erstkontakt` auf `aktivitaeten` setzt `verkaufschancen.erstkontakt_am`; Zeitplan
  `leads_erstkontakt_melden` (alle 5 Min.) gibt je Lead einmal Glocke an Verkäufer bzw. Geschäftsleitung.
- Website: Edge Function `anfrage` → `lead_aus_website` (Vertrag `docs/website-anfrage.md`).
- Dach: Zeitplan `leadsDachAnreichern` → `lead_dach_speichern` (sonnendach.ch, Gebäuderegister).
- Anruf-Ergebnis in `lead_kontakt_erfassen`: nicht erreicht/Combox mit Datum → Rückruf, SMS-Entwurf im Ausgangskorb;
  will_preis → Offerte ohne Besuch; kein Interesse/ungültig → Grund und Wiedervorlage.
- App: Startansicht «Zu tun» (Jetzt/Heute/Woche), Pipeline in sechs Schritten (Unterstände auf der Karte),
  Lead-Akte als ganze Seite wie die Fall-Akte im Service, Ansicht «Steuerung» für die Geschäftsleitung (Tempo,
  Quoten je Verkäufer und Quelle, Verlustgründe). Alle bisherigen Ansichten bleiben (Regel 1).

## Folgen

- Übernommene Leads aus V233 (`alt_id`) zählen nicht für die Uhr und das Tempo.
- Kosten pro Lead bleiben in den Kennzahlen (Entscheid 0025).
