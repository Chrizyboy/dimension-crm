# Modul: Posteingang

**Zweck:** Alle Mails, die hereinkommen (persönliche Postfächer und Team-Postfächer wie info@), an einem Ort: eingeordnet
nach Art, dem richtigen Kunden, Lead, Projekt, Service-Fall, Offerte, Rechnung oder Bestellung zugeordnet, mit
Antwortfrist in Arbeitszeit und Erinnerung, damit kein Kunde warten muss. Werbung und Interne gehen still weg.

Wunsch von Chris am 31.10.2026. Entscheid: `docs/entscheidungen/0033-posteingang.md`.

**Stand:** gebaut in Phase **18**, Arbeitsplatz für alle Rollen seit 2.11.2026.

## So läuft es

1. Der Zeitplan holt alle 5 Minuten Posteingang und Gesendete aller verbundenen Personen, Team-Postfächer einmal pro
   Lauf (Edge Function `zeitplan`, Job `posteingang`; «Jetzt abholen» über `microsoft` › `posteingang_abholen`).
2. Feste Regeln zuerst (eigene Domain = intern, newsletter@/noreply@ = Werbung, Formular-Anfragen werden Lead),
   dann ordnet die KI den Rest ein (Art, Sprache, dringend, Zusammenfassung, Nummern). Ohne KI: Regel-Rückfall.
3. Die Datenbank ordnet zu (Nummern, Absender) und bestimmt Zuständige: eigenes Postfach = die Person selbst,
   Team-Postfach (info@) = wer verteilt (`verteilen`, Davis/Chris). Dazu Stellvertretung bei Abwesenheit, Frist und
   doppelte Frist.
4. Eine Antwort in «Gesendet» (gleiche Konversation oder an den Absender) oder über den Ausgangskorb erledigt die Mail
   und misst die Reaktionszeit in Arbeitszeit.
5. `posteingang_erinnern` (alle 5 Minuten): zuerst Wiedervorlage (`intern.pe_wiedervorlage`: Zurückgestellte kommen
   zurück, wo der Kunde bis `warten_bis` nicht geantwortet hat, ist die Mail wieder offen mit «Nachfassen»), dann
   Vorwarnung, Frist überschritten, doppelte Frist an die Leitung, je einmal.

## Arbeitsplatz (2.11.2026)

- Links Ansichten: Für mich (Standard), Zu verteilen (nur wer verteilt), Warten auf Kunde, Zurückgestellt, Alle
  offenen, Erledigt, Werbung & Intern, Ältere. Liste gruppiert nach Dringlichkeit; ab 1280 px Mail rechts daneben,
  sonst als Seitenpanel. Mehrfachauswahl (Erledigt, Ablegen, Zurückstellen, Weitergeben), Kürzel J/K/E/R/W/X und «/».
- In der Mail: Kurzfassung, «Nächster Schritt» je Art (Lead, Service-Fall, Zahlung erfassen, Liefertermin,
  Rechnung, Offerte, Projekt, Nachfassen), Zuordnung auch über eine Nummer, ganze Unterhaltung und Anhänge aus Outlook
  (öffnen oder in die Akte ablegen), interne Notizen mit @Kürzel (Glocke).
- Erledigt, «auf Kunde warten» (von Hand oder automatisch nach der Antwort, Einstellung `warten`, nur einmal),
  Zurückstellen bis Nachmittag/morgen/Montag/Woche, Aufgabe daraus, Regel für den Absender.
- Reiter Team (Zahlen je Person, nur Geschäftsleitung), Absender-Regeln, Reaktionszeit, Einstellungen (inkl. Warten und
  Vorschlag beim Verteilen je Art).

## Daten

- Besitzt: `posteingang`, `posteingang_notizen`, `posteingang_regeln`, Einstellung `posteingang` (nur Administration,
  Trigger `posteingang_einstellung_schuetzen`).
- Schreibt über Datenbank-Funktionen in: `benachrichtigungen`; Leads entstehen über `intern.mail_eingang`.
- Liest: `kontakte`, `verkaufschancen`, `offerten`, `projekte`, `rechnungen`, `bestellungen`, `service_faelle`,
  `kalender_eintraege` (Abwesenheit), `personen`.
- Schreibt über Funktionen auch: `kreditor_zahlungen` (`posteingang_zahlung_erfassen`, Recht `finanzen`),
  `bestellungen.liefertermin` (`posteingang_liefertermin`, Recht `preise`), `aufgaben` (`posteingang_aufgabe`),
  `dokumente` (Anhang ablegen über `microsoft` › `posteingang_anhang_ablegen`).
- Ändern nur über `posteingang_setzen` (erledigt, ablegen, oeffnen, zuweisen, art, verknuepfen, nummer, zurueck,
  zurueck_holen, warten, warten_ende), Notizen über `posteingang_notiz`, Regeln über `posteingang_regel_*`.

## Abhängigkeiten

- `src/services/supabase.ts`, `src/services/integrationen.ts` (`microsoft.posteingangAbholen`, `posteingangText`),
  `src/services/fachfehler.ts`, `src/services/meldungen.ts`, KI-Bausteine aus `src/components/shared/ki/`.
- Für «Lead anlegen» und «Service-Fall eröffnen» nutzen Anfragen & Leads und Service `src/services/posteingang.ts`
  (`mailVorlage`, `mailVolltext`, `mailVerknuepfen`); sie importieren dieses Modul nicht.

## Ereignisse

- **sendet:** keine. **hört auf:** keine (Antworten aus dem Ausgangskorb erkennt der Trigger `posteingang_beantwortet`).

## Ordner

- `components/` – Seite, Arbeitsplatz (Ansichten, Liste, Mail-Bereich mit Kästen und Aktionen), Dialoge (Weitergeben,
  Kunde/Nummer, Aufgabe, Regel, Zahlung, Liefertermin), Team, Absender-Regeln, Reaktionszeit, Einstellungen, «Mein Tag»
- `hooks/` – Mails laden (`useMails`, `useText`, `useBetrachter`), Arbeitsplatz (`useArbeit`), `useAktion`, `useBreit`
- `lib/` – Ansichten, Gruppen, Frist, nächster Schritt, Zeiten fürs Zurückstellen (mit Tests)
- `services/` – Zugriff auf Supabase und die Server-Funktion
