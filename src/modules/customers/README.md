# Modul: Kunden

**Zweck:** Kundenliste mit Stand und Suche sowie die 360°-Kundenakte: was jetzt zu tun ist, Kontaktdaten, Gebäude, alle Geschäfte, Zeitachse, Dokumente und das Kundenblatt zum Drucken.

**Stand:** Phase 5 gebaut, Phase 8: AbaNinja (verknüpfen, anlegen, offene Rechnungen), Mails aus Outlook in der Zeitachse, Dokumente nach SharePoint sichern.

## Daten

- liest: `kunden_uebersicht` (Ansicht), `kontakte`, `objekte`, `verkaufschancen`, `offerten`, `projekte`, `werkvertraege`, `dokumente`, `auswahlwerte`
- schreibt: `kontakte`, `objekte`, `aktivitaeten` (Kontakt erfassen), `kontakte.geloescht_am` (Papierkorb)
- Funktionen: `kundenstand()`, `kunden_zeitachse()`, `moegliche_dubletten()`, `kontakt_export()`

## Abhängigkeiten

- `src/services/kontakte.ts` (Liste, einzelner Kontakt, Schnellsuche), `src/services/auswahl.ts`
- `src/hooks/useKontakte.ts`, `useAuswahl.ts`, `useTaste.ts`, `useDrucken.ts`
- `src/components/shared/Datentabelle.tsx`, `Zeitachse.tsx`, `Filterchips.tsx`

## Ereignisse

- **sendet:** noch keine (ab Phase 6 z. B. `kunde.angelegt` für Leads)
- **hört auf:** noch keine

## Export (index.ts)

- `Kunden` – Seite mit Liste und offener Akte
- `Kundenakte` – das Seitenpanel, auch vom Adressbuch genutzt
- `KontaktDialog` – Kontakt anlegen oder ändern, mit Dublettenprüfung

## Tastatur

`N` neuer Kunde, `/` Suche, Pfeiltasten in der Liste, Enter öffnet, Esc schliesst, Ctrl+Enter speichert eine Notiz.
