# 0043 – Handbuch: ein Kapitel pro Bereich, Hilfe mit F1, Wege je Rolle (2.11.2026)

## Ausgangslage

Chris: Jedes Modul einzeln soll seinen Zweck erfüllen, das CRM wirke «nur nach Fassade». Das Handbuch hatte eine
kurze «Anleitung» pro Bereich (zwei, drei Sätze in den Sprachdateien), Prozesse, Videos, Erste Schritte und
Meldungen. Wer im Alltag nicht weiterwusste, musste den Bereich verlassen und suchen; zu vielen Bereichen gab es
keine Schritt-für-Schritt-Anleitung. Gleichzeitig bauen viele Threads die Bereiche um, das Handbuch veraltet sonst
sofort. Vorschau: https://claude.ai/artifact/6u5xDZ8uSpjUmSo4s6aYgZ

## Entscheid

- **Kapitel beim Modul:** Jeder Bereich trägt sein Kapitel selbst (`src/modules/<id>/handbuch.de.md` und
  `.fr.md`). Wer einen Bereich ändert, führt das Kapitel im selben Pull Request nach und setzt `stand`. Geladen
  wird erst beim Öffnen (`src/services/handbuchKapitel.ts`).
- **Fester Aufbau** (bewusst kein freies Markdown): Kopf mit `stand` und `rollen`, Titel, Einleitung, Abschnitte
  `wer`, `so` (Anleitungen als `###` mit nummerierten Schritten), `staende`, `automatisch`, `regeln`, `fragen`,
  `neu` (`- TT.MM.JJJJ: Text`). `**Knopf**` erscheint als Knopf-Beschriftung, Links als `kapitel:<id>#stelle`,
  `/route` oder Web-Adresse. Pflicht: `so`, `fragen`, `neu`.
- **Wächter-Test** `src/modules/knowledge/lib/kapitelVollstaendig.test.ts`: jedes Modul hat DE und FR, gleich
  gebaut (Abschnitte, Anleitungen, Anzahl Schritte), gültiger Stand, bekannte Rollen, gleiche «Neu»-Daten, nur
  Links auf bestehende Kapitel. Ein neues Modul ohne Kapitel lässt `npm test` scheitern; die Modul-Vorlage
  (`npm run modul:neu`) legt darum ein Gerüst an.
- **Hilfe am Ort:** F1 oder «?» in der Kopfzeile öffnet das Kapitel des aktuellen Bereichs als Seitenblatt, jede
  Anleitung klappt auf; «Ganzes Kapitel» führt ins Handbuch.
- **Handbuch-Reiter:** Für dich (Weg durch den Tag je Rolle, `inhalt/rollen.*.md`), Kapitel, Erste Schritte,
  Prozesse, Videos, Begriffe A–Z (`inhalt/begriffe.*.md`), Neu (alle «Neu»-Einträge, Zahl am Reiter für noch nicht
  Gesehenes, beim ersten Mal nur die letzten 7 Tage), Meldungen. Eine Suche durchsucht Kapitel, Begriffe,
  Prozesse und Videos und springt an die Stelle.
- **Prozesse und Videos einem Bereich zuordnen:** Spalte `handbuch_eintraege.bereich`, gesetzt nur über
  `handbuch_bereich_setzen` (Administration). Zugeordnete Unterlagen erscheinen in der Hilfe und am Ende des Kapitels.
- Rollen im Handbuch: Verkauf, Innendienst, Projektleitung, Montage, Buchhaltung, Geschäftsleitung, Administration;
  die Rolle der Person wählt den Weg vor (admin → Administration, monteur/ibn → Montage).

## Folgen

- Die alte «Anleitung» (`handbuch.anleitung.*` in den Sprachdateien) ist durch die Kapitel ersetzt; alte Links
  `ansicht=anleitung` zeigen auf «Kapitel».
- Texte im Kapitel nennen Knöpfe so, wie sie in der App heissen. Ändert sich eine Beschriftung, das Kapitel
  anpassen.
- Neue Rolle im Handbuch: Abschnitt in `inhalt/rollen.de.md`/`.fr.md` und Schlüssel in `ROLLEN` des Tests.
