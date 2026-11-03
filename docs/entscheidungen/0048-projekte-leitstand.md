# 0048 – Projekte neu: Leitstand, Meine Woche, Projekt-Akte als ganze Seite (2.11.2026)

## Ausgangslage

Chris: Das CRM fühlt sich «nur nach Fassade an», jedes Modul muss seinen Zweck ganz erfüllen. Projekte zeigte ein
Board je Standort und eine kleine Akte als Seitenpanel mit vier Reitern. Material, Einsätze, Tranchen, Rechnungen,
Nachträge, Rapporte und Mails eines Projekts lagen zwar in der Datenbank, aber in anderen Bereichen. Die
Projektleitung (Andy, José) musste für jede Frage «wie steht das Projekt?» vier Seiten öffnen.

Entwurf mit Beispieldaten: https://claude.ai/artifact/GXLAokpEoDtBmnpGXxNss8

## Entscheid (Schritt 1, ohne neue Tabellen)

- **Leitstand** statt Board je Standort: Spalten nach Phase (Auftrag, Bewilligungen, Vorbereitung, Montage, IBN,
  Abschluss). Jede Karte zeigt, was blockiert oder fehlt (Material vor dem Bau, Bewilligung überfällig, Zahlung
  überfällig, ohne Bautermin, Tranche fällig) und den nächsten Schritt. Blockierte stehen oben, linker Rand rot.
  Kennzahlen oben setzen den Filter; Standort ist ein Filter statt einer Spalte. Liste als zweite Ansicht.
- **Meine Woche** für die Projektleitung: offene Fahrplan-Schritte mit Frist bis Ende nächster Woche und was
  blockiert, quer über die eigenen Projekte (`projekte.verantwortlich_id`), dazu die Einsätze der Woche.
- **Projekt-Akte als ganze Seite** (`#/projects?projekt=…`), wie die Fall-Akte im Service (0038): Kopf mit
  Zuständigen und Blockern, Phasen-Leiste, links Kunde/Baustelle/Anlage/Bauplanung, Mitte «Jetzt zu tun» (offene
  Schritte nach Frist, Haken = erledigt) und Verlauf (Notiz, Anruf, Mail, Besuch; Mails aus dem Posteingang;
  Rapporte), rechts Termine, Material je Position, Geld (Vertrag, Nachträge, Tranchen mit Rechnung) und
  Nachkalkulation (nur mit Recht Preise oder Finanzen). Fahrplan, Zeitplan, Subunternehmer bleiben als Reiter.
- Datenbank: Sicht `projekt_signale`, Funktion `projekt_akte(id)` (eine Abfrage, RLS der Person),
  `projekt_vermerken(projekt, art, text)` schreibt in `aktivitaeten` (erscheint auch beim Kunden).

## Folgen

- Der Reiter «Baustellen» entfällt; seine Aufgaben übernimmt der Leitstand (Filter Standort und «Ohne Bautermin»,
  Bautermin als Hauptknopf der Akte). Alte Adressen mit `reiter=baustellen` öffnen den Leitstand.
- Schritt 2 nach Chris' Antworten: Kunde bei Meilensteinen informieren, Mängelliste je Projekt, Beteiligte
  (Elektriker, Gerüst, Netzbetreiber) als Kontakte mit Rolle; danach GL-Übersicht und Baustellen-Mappe am Handy.

## Nachtrag: Blocker aus dem Reiter «Baustellen»

Die Blocker «Material nicht bestellt» (Baubeginn minus Lieferfrist aus `einstellungen.einkauf`) und «Frist vorbei» aus `lib/blocker.ts` erscheinen jetzt als Hinweise auf den Leitstand-Karten, in «Meine Woche» und in der Akte. So bleiben Karte und Glocke gleich, auch ohne den alten Reiter.

## Schritt 2 (3.11.2026, Antworten von Chris auf die drei Fragen)

- **Mängel und Restarbeiten** sind eine eigene Liste je Projekt (`projekt_maengel`), geändert nur über `projekt_mangel_speichern` (wiederholbar mit ID aus der App, auch fürs Handy) und `projekt_mangel_erledigen`. Solange etwas offen ist, lässt sich der Schritt «Übergabe» nicht abschliessen (Trigger `uebergabe_ohne_maengel`, Fehler `projekte.maengel_offen`). Automatische Abläufe (IBN-Rapport setzt das Projekt auf abgeschlossen) bleiben unberührt; ein abgeschlossenes Projekt mit offenen Mängeln bleibt im Leitstand.
- **Beteiligte** (Elektriker, Gerüstbau, Netzbetreiber, Architekt …) sind Kontakte aus dem Adressbuch mit Rolle (`projekt_beteiligte`, Rollen als Auswahlliste `projekt_rolle`). Die alten Textfelder Elektriker/Architekt bleiben (V233), bis die Daten übertragen sind.
- **Kunde bei Meilensteinen informieren**: läuft über die bestehende Automation «meilenstein_kunde» (Vertrag, Bautermin, Montage, IBN, Abnahme), Standard «mit Freigabe» im Ausgangskorb. Die Akte zeigt im Verlauf, was dazu wartet oder gesendet wurde; nichts geht ohne Freigabe hinaus (Regel 6).
