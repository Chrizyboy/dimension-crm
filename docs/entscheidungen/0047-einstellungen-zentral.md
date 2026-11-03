# 0047 Einstellungen an einem Ort, ändern nur die Administration

Datum: 03.11.2026 · Entscheid von Chris (Pop-up-Karten im Thread «Einstellungen vollständig machen», Nachricht im Projekt-Chat)

## Ausgangslage

Einstellungen lagen verteilt: ein Teil unter Einstellungen (Reiter Personen, Rollen, Zuständigkeiten, Verbindungen,
Sicherung, Betrieb), der Rest als Reiter in den Modulen (Rechnungen, Posteingang, Automationen, Spesen, Assistent,
Helpdesk …). Auswahllisten und Regionen liessen sich nirgends pflegen, die PLZ-Regeln der Regionen wurden nicht
genutzt, gelöschte Datensätze konnte man nur im jeweiligen Modul suchen, und wer was geändert hat, war nicht
sichtbar. Ein paar Firmen-Einstellungen durften auch Nicht-Admins ändern (Recht «finanzen», Marketing-Vorlagen,
Kosten pro Lead).

## Entscheid

1. **Alles nach dem Neuentwurf bauen**, in Etappen (Karte «Ja, alles so bauen»).
2. **Alles zentral** (Karte): die Einstellungen der Module stehen auch unter Einstellungen, mit Suche über alle.
3. **Nur die Administration ändert Einstellungen** (Chris, 3.11.: «die die nicht admin sind sollen keine
   einstellungen vornehmen können ausser es betrifft sie selbst»). Eigenes (Profil, Sprache, Signatur, Schreibstil,
   eigene Ansichten, Unterschrift) bleibt bei der Person.

## Umsetzung (Etappe 1)

- Seite `#/settings?bereich=…` mit Gruppen Firma, Abläufe & Listen, System (später «Für mich»), Suche mit «/».
  Alte Adressen `?reiter=…` gehen weiter.
- Module melden ihre Bereiche als `einstellungen` in der `index.ts` (Typ `EinstellungsBereich` in
  `src/types/einstellungen.ts`); die Route `src/app/settings.tsx` setzt sie zusammen (Module importieren sich nie).
- Neu: Auswahllisten (Texte DE/FR, Farbe, Reihenfolge; nur bei freien Listen neu anlegen und ausblenden),
  Standorte & Regionen mit PLZ-Regeln (`region_fuer_plz`, Trigger `region_setzen` auf `objekte`, nur wenn leer),
  Änderungsprotokoll, Papierkorb über alle Fachtabellen (`papierkorb`, `papierkorb_wiederherstellen`, nur Admin).
- Schutz: Trigger `nur_admin` auf `einstellungen` (jeder Schlüssel nur Administration, Zeitplan und Automationen
  ausgenommen), `firmen` ändern nur Admin, `kennzahlen_quellen_kosten` nur Admin. In der App zeigt
  `NurAdministration` (`src/components/shared/`) Firmen-Einstellungen für alle anderen nur zum Lesen.

## Später

Etappe 2: «Für mich» (Profil, Darstellung, Benachrichtigungen, Abwesenheit & Vertretung, Signatur, Geräte),
Vorlagen & Texte, Projekt-Abläufe, Service & Wartung, Werkvertrag; Reiter in den Modulen durch einen Link
ersetzen. Etappe 3: Import/Export, Rollen-Matrix.
