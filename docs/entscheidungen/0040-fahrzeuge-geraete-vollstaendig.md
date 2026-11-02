# 0040 – Fahrzeuge & Geräte vollständig: Akte, Belegung, Schäden, Kosten, QR-Etiketten (2.11.2026)

## Ausgangslage

Chris: Jedes Modul muss seinen Zweck allein erfüllen; das CRM fühle sich sonst «nur nach Fassade» an. Fahrzeuge &
Geräte (Phase 17, Entscheid 0028) kannte MFK, Service, Prüfung und Übergabe, aber kein Leasing, keine Versicherung,
keine Kosten, keine Belegung und keine Bearbeitung von Schäden. Neuentwurf mit realistischen Daten:
https://claude.ai/artifact/3vk5SRJiTGVPnXp7gLSxFL

## Entscheid

- **Zu erledigen** als erster Reiter: überfällige und baldige Fristen, Service nach Kilometern, offene Schäden,
  doppelt verplante Fahrzeuge/Geräte, fehlender Kilometerstand im Monat, lange ausgeliehene Geräte; daneben «Heute
  unterwegs». Gerechnet in der App (`lib/erledigen.ts`) aus den gleichen Abfragen wie die Listen.
- **Fahrzeug-Akte als ganze Seite** (`?fahrzeug=…`): Fristen (MFK, Service, Reifen, Vignette, Leasing-Ende),
  Angaben aus dem Fahrzeugausweis, Leasing mit Kilometer-Prognose gegen die Vertragslimite, Versicherung und
  Steuern, Kosten im Jahr, Schäden, Belegung, Geräte an Bord, Dokumente (Speicher `fuhrpark`), Verlauf.
  Fahrzeugarten sind die Auswahlliste `fahrzeugart`.
- **Eintrag-Arten** neu: Tanken (Betrag, Liter, km), Reifenwechsel, Vignette (bis 31.01. Folgejahr), Kosten. Tanken
  und Kosten brauchen einen Betrag. Alles weiter nur über `ressource_eintrag_erfassen`.
- **Schäden mit Stand** (offen, in Arbeit, erledigt) über `ressource_schaden_setzen`; erledigt setzt das Gerät
  wieder in Ordnung. Fotos direkt aus dem Eintrag.
- **Belegung** (Sicht `ressourcen_belegung`): Fahrzeug folgt dem Team (Einsatz einer Person mit fest zugeteiltem
  Fahrzeug), von Hand reservieren oder ersetzen über `ressource_reservieren` (wiederholbar mit ID),
  Werkstatt-Termine. Wochenplan Mo–Fr mit Doppelbelegung rot.
- **Ausleihe** mit «zurück bis» (`ressource_uebergeben(..., p_zurueck_bis)`), Frist «ausleihe» in `fristen`.
  Warnung, wenn der Person der nötige Führerausweis fehlt.
- **Kosten** (`fuhrpark_kosten(jahr)`, nur Recht `finanzen`): Leasing, Treibstoff, Unterhalt, Versicherung und
  Steuer, Übriges, CHF pro km, Privatanteil 0,9 % pro Monat (`einstellungen.ressourcen.privatanteil_prozent_monat`).
- **Kilometer monatlich**: Zeitplan-Job `fuhrpark_km` → `fuhrpark_km_erinnern` (einmal pro Fahrzeug und Monat an die
  fest zugeteilte Person, Glocke öffnet gleich «Kilometerstand eintragen»). Abschalten: `km_monatlich: false`.
- **QR-Etiketten** (PDF, 3 × 8 pro A4-Bogen): der Code öffnet am Handy die Akte; dort «Nehme ich» und «Zurück ins
  Lager» mit einem Klick. Aus der Desktop-App gedruckte Etiketten zeigen auf die Web-App.

## Offen

- Import der Tankkarten-Abrechnung (CSV) folgt, sobald klar ist, welche Tankkarte im Einsatz ist.
- Antworten auf die Fragen 1–5 im Thread; gebaut ist jeweils die empfohlene Variante.
