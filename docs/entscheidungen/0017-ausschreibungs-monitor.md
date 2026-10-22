# 0017 – Ausschreibungs-Monitor: drei Spuren, Andy bewilligt, Chris sendet

**Kontext:** Öffentliche Ausschreibungen (simap) und Baugesuche (Amtsblätter) sind die günstigste Quelle für
Aufträge, aber von Hand kaum zu verfolgen. Das Konzept hat Chris am 21.10.2026 freigegeben
([Claude Doc](https://claude.ai/artifact/KkeHUwF5oaTugDwPyW3Tcm)). In V233 gab es dazu nur das Recht «tenders»,
im Export keine Treffer.

**Entscheid:**

- **Drei Spuren, gesetzt durch die Art der Meldung:** Ausschreibung → **Angebot** (wir offerieren selbst),
  Baugesuch und Zuschlag → **Akquise** (die richtige Firma anschreiben), Vorankündigung, Planermandat,
  Elektro-Gesamtlos → **Beobachten** (warten auf Zuschlag, Planer, Baubewilligung oder ein Datum; ohne Auslöser
  nach 6 Monaten archiviert). Ein Zuschlag zu einem bekannten Dossier schaltet die Spur um.
- **Vier Augen vor jedem Anschreiben:** Das CRM schreibt den Entwurf, Andy bewilligt (Vertretung Chris), Chris
  sendet (Vertretung Loris). Wer das ist, steht in den Regeln (Kürzel) und ist ohne Code änderbar. Die
  Administration darf immer, damit nichts an einer Abwesenheit hängt.
- **Lead erst beim Senden:** Vorher ist es nur ein Dossier; nach dem Senden «Angeschrieben» mit Wiedervorlage nach
  5 Arbeitstagen. Höchstens einmal nachfassen.
- **Harte Regeln in der Datenbank, nicht in der App:** Mail nur an Firmen, Gemeinden und Behörden; Privatpersonen
  nur Brief oder Anruf. Die Vergabestelle ist bis zum Zuschlag für alle Bereiche gesperrt (Fragen nur über das
  simap-Forum). Eine zentrale Sperrliste, die der Ausgangskorb bei jeder Mail prüft. Jeder Kontakt braucht eine
  Quelle. Signatur und Abmelde-Satz sind fest.
- **Quellen:** simap und amtsblattportal.ch über ihre öffentlichen Lese-Schnittstellen (ohne Schlüssel), simap um
  06:52, 12:00 und 17:00, das Amtsblatt um 06:52 (Mo–Sa). AG, LU, FR, VD und NE haben kein lesbares Portal:
  dort erfasst der Innendienst von Hand, danach gleicher Ablauf. Bleibt eine Quelle 2 Tage still, gibt es Alarm.
- **Externe Texte sind Daten (Regel 7):** Titel und Beschreibungen werden gespeichert und durchsucht, nie
  ausgeführt; Links aus Quellen öffnen nur, wenn sie mit http(s) beginnen.

**Folgen:** Die Felder des Amtsblatt-XML sind aus der Dokumentation übernommen und müssen mit echten
Publikationen bestätigt werden (in der Cloud-Sandbox sind beide Quellen gesperrt; geprüft mit Ersatz-Servern,
`npm run ausschreibungen:pruefen`). Die tägliche Zusammenfassung erscheint auf der Startseite und in der Glocke; per Mail ist sie nur als Schalter (`zusammenfassung_mail`) angelegt und noch nicht gebaut.
