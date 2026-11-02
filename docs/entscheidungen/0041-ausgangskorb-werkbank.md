# 0041 – Ausgangskorb als Werkbank (2.11.2026)

## Ausgangslage

Chris: Das CRM fühle sich «nur nach Fassade an», jedes Modul soll seinen Zweck ganz erfüllen. Der Ausgangskorb war
eine Tabelle mit Seitenblatt: alle sahen alles, nur einzeln freigeben, kein Kunde und keine Offerte daneben, Fehler
nur als «Fehler», geplante Zeit (`sende_ab`) ohne Oberfläche, Briefe (Kanal `brief`) nie verwendbar.
Entwurf mit erfundenen Daten: https://claude.ai/artifact/XNa75MjMUyusosN2EDnrsa

## Entscheid

- **Werkbank** in drei Spalten: Ordner (Für mich zur Freigabe, Fehler, Zurückgeschickt, Ganzes Team, Geplant,
  Wird gesendet, Gesendet, Nicht gesendet), Liste nach Dringlichkeit, rechts die Nachricht so, wie sie der Empfänger
  bekommt. Unter 1280 px öffnet die Nachricht als Seitenpanel. Ordner und Eintrag stehen in der Adresse
  (`#/outbox?ordner=fehler&eintrag=…`). Tastatur: J/K, F, V, E.
- **Für mich / darf freigeben** rechnet die Datenbank (`intern.ausgang_fuer_mich`, `intern.ausgang_darf`, Sicht
  `ausgang_ansicht`): Arten mit Recht aus `einstellungen.ausgang_freigabe` (Mahnung, Zahlungserinnerung → finanzen,
  Bestellung → preise, Newsletter, Serien-Mail → admin), sonst Absender oder Stellvertretung. Erzwungen wird es vom
  Trigger aus PR #45 (`intern.ausgang_freigabe_pruefen`); dieselbe Regel, damit Anzeige und Sperre übereinstimmen.
- **Prüfungen vor dem Senden** (`ausgang_pruefen`): Outlook des Absenders verbunden, Werbesperre, Sprache des Kunden,
  Anhänge vorhanden, gleiche Art kürzlich gesendet, SMS-Länge, geplante Zeit vorbei, fehlendes Recht. Nur Hinweise.
- **Zusammenhang** (`ausgang_kontext`): Kunde, Lead, Offerte, Projekt, Rechnung, letzte sechs Nachrichten.
- **Mehrere auf einmal**, **Serien** (ab drei gleichen wartenden: gleiche Kampagne oder gleiche Art am selben Tag).
- **Später senden** (heute 17:00, morgen 08:00, Montag 08:00, eigene Zeit) über `sende_ab`.
- **Rückgängig 10 Sekunden** (`rueckgaengig_bis`): `ausgang_holen` sendet erst danach; `ausgang_zurueckholen`.
- **Zurück an …** mit Notiz und Glocke statt still ändern (`ausgang_zurueck`).
- **Fehler mit Lösung**: Microsoft abgelaufen (neu verbinden oder aus meinem Outlook, `ausgang_absender_ich`),
  SMS-Dienst, unklar ob angekommen (in Outlook prüfen, `ausgang_als_gesendet`), nochmals senden.
- **Briefe** als Kanal: freigeben = zum Drucken, «Gedruckt und versendet», Rücklauf (`ausgang_ruecklauf`). Der Server
  sendet nie Briefe.
- **Glocke**, wenn etwas vier Arbeitsstunden wartet (nach einem Arbeitstag auch an die Stellvertretung) oder ein
  Fehler auftritt: `ausgang_erinnern`, Job `ausgang_erinnern` im Zeitplan alle 15 Minuten.
- Karte **«Wartet auf deine Freigabe»** auf «Mein Tag», nur wenn etwas offen ist. Kennzahlen der Woche über «Gesendet».

## Folgen

- Migration `20261113000100_ausgangskorb_ausbau.sql`; `ausgang_freigeben` hat zwei neue, freiwillige Parameter
  (`p_sende_ab`, `p_warten_s`), alte Aufrufe gehen weiter.
- Zeitplan muss neu verteilt werden (`npx supabase functions deploy zeitplan`), sonst fehlt nur die Erinnerung.
- Offen (Fragen an Chris): Umfang, Rechte-Matrix, 10 oder 30 Sekunden, Briefe; gebaut nach den Empfehlungen.
