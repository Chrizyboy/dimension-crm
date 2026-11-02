# 0042 – Aufgaben vollständig

**Datum:** 02.11.2026 · **Stand:** umgesetzt · **Vorschau:** https://claude.ai/artifact/GhGbEPhVAapBWxjHVq76Le

## Ausgangslage

«Aufgaben» war eine flache Liste mit Haken (Titel, Datum, Person, Bezug als Tabellenname). Chris (2.11.2026): jedes
Modul muss seinen Zweck ganz erfüllen. Aufgaben ist der tägliche Arbeitsvorrat aller Rollen: Verkauf (Nachfassen),
Projektleitung (Netzbetreiber, Pronovo), Montage am Handy, Buchhaltung (MWST, Mahnungen) und Geschäftsleitung (Überblick).

## Entscheid

1. **Liste nach Fälligkeit gruppiert:** überfällig, heute, morgen, diese Woche, später, ohne Datum; wichtige oben.
2. **Schnelleingabe** oben (Taste N): «Offerte Baumann nachfassen morgen @AM !» erkennt Datum (heute, morgen,
   Wochentag, 12.11.), Person (Kurzzeichen oder Vorname) und «!» für wichtig, Deutsch und Französisch
   (`lib/schnelleingabe.ts`).
3. **Akte als Seitenpanel** (`?aufgabe=…`): Erledigen mit Notiz, Morgen / Nächste Woche, Weitergeben mit Notiz,
   Angaben direkt ändern, Bezug mit Namen, Teilschritte, Verlauf mit Kommentaren.
4. **Sichtbarkeit** (RLS, `einstellungen.aufgaben.sichtbarkeit`): «eigene» = eigene, von mir vergebene, nicht
   zugeteilte und vertretene; Geschäftsleitung (Recht `gl`, heute Administration) sieht alle. «alle» = alle sehen alle.
5. **Vertretung:** ist jemand heute abwesend, sieht die Stellvertretung aus `einstellungen.zustaendigkeiten` seine
   Aufgaben in der Ansicht «Vertretung»; die Person behält sie (`einstellungen.aufgaben.vertretung`).
6. **Glocke statt Mail:** beim Zuteilen/Weitergeben durch jemand anderen, beim Erledigen an die Person, die vergeben
   hat, bei Kommentaren an Zuständige, Vergebende und alle `@Kurzzeichen`, und morgens einmal pro Arbeitstag
   «heute fällig / überfällig» (`aufgaben_melden`, Zeitplan stündlich ab `erinnern_ab`).
7. **Notiz beim Erledigen** (`aufgabe_erledigen`) landet bei `notiz_in_verlauf` auch im Verlauf des Leads, der
   Offerte, des Projekts, Kunden, Grossprojekts, der Ausschreibung oder des Service-Falls.
8. **Wiederholung** (Woche, Monat, Quartal, Jahr): nach dem Erledigen legt die Datenbank genau eine nächste Aufgabe an
   (`vorgaenger_id`, eindeutig).
9. **Team-Sicht** (`aufgaben_team()`): je Person offen, überfällig, heute, erledigt in 7 Tagen, abwesend; Klick zeigt
   die Liste der Person zum Umverteilen.
10. **Herkunft** wird hergeleitet (Sicht `aufgaben_liste`): Automation, Monitor, Frist, System, selbst, vergeben;
    Anleger können `quelle` setzen (ki, posteingang).

## Offen

Die vier Fragen an Chris (Sichtbarkeit, Vertretung, Notiz im Verlauf, Wiederholung) sind mit der empfohlenen Antwort
gebaut. Jede Antwort B ist eine Einstellung in `einstellungen.aufgaben` und braucht keinen neuen Code, ausser
«keine Wiederholung» (Feld ausblenden). Angezeigt wird `personen.kurzzeichen` («LP»); `@LP` in Kommentaren und der
Schnelleingabe findet die Person über das Kurzzeichen, den technischen Schlüssel oder den Vornamen.
