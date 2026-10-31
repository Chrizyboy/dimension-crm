# Modul: Grossprojekte (Contracting-Monitor)

**Zweck:** Findet Gebäude und Bauvorhaben, bei denen sich PV- oder Wärme-Contracting lohnen kann (grosse Dächer,
Gewerbe, Industrie, Gemeinden, Überbauungen, alte Öl- und Gasheizungen), bewertet sie mit 0 bis 100 Punkten, schätzt
Grösse, Investition und Contracting-Preis und führt sie bis zum Lead. Alles bleibt im CRM, keine Mail.

Wunsch von Chris am 30.10.2026. Entscheid: `docs/entscheidungen/0029-grossprojekte-contracting.md`.

**Stand:** gebaut in Phase **8c**.

## So läuft es

1. Jede Meldung von simap und dem Amtsblatt (Ausschreibungs-Monitor) wird auch hier geprüft; dazu von Hand erfasst.
   Dazu die **Dachsuche**: stündlich einige Gebiete um Muri und Bulle, grosse Gebäude mit viel Verbrauch aus dem
   Gebäuderegister, Dach von sonnendach.ch; aufgenommen wird nur, was genug Punkte hat (Nachtrag in Entscheid 0029).
2. Der Server holt mit Adresse oder Parzelle Dach (sonnendach.ch) und Heizung (Gebäuderegister), sofort nach dem
   Erfassen und sonst stündlich.
3. Die Datenbank rechnet Punkte und Schätzung bei jedem Speichern neu (`intern.gp_bewerten`).
4. Starke Treffer meldet die Glocke einmal; die Karte auf «Mein Tag» zeigt die besten.
5. Andy bewilligt (Lead entsteht), beobachtet (Wiedervorlage) oder verwirft (mit Grund).

## Daten

- Besitzt: `grossprojekte`, Einstellung `grossprojekte` (mit `suche`), Fortschritt der Dachsuche in
  `intern.gp_suchkacheln`, Verlauf in `aktivitaeten.grossprojekt_id`.
- Schreibt über Datenbank-Funktionen in: `verkaufschancen` und `kontakte` (`lead_anlegen`), `benachrichtigungen`.
- Liest: `standorte`, `plz_verzeichnis`, `ausschreibungen` (Verknüpfung zum Dossier).

## Abhängigkeiten

- `src/services/supabase.ts` (Daten), `src/services/integrationen.ts` (`rufeFunktion('grossprojekte', 'anreichern')`),
  `src/services/fachfehler.ts`, `src/services/meldungen.ts`.
- Andere Module werden nicht importiert: Lead und Glocke entstehen in der Datenbank.

## Ereignisse

- **sendet:** keine. **hört auf:** keine (Treffer kommen über `ausschreibung_einlesen` in der Datenbank).

## Ordner

- `components/` – Seite, Liste, Akte, Punkte und Schätzung, Erfassen, Entscheid, Annahmen, Stand der Dachsuche,
  Karte für «Mein Tag»
- `hooks/` – Daten laden (`useGrossprojekte`), Änderungen mit Fehlermeldung (`useAktion`)
- `services/` – Zugriff auf Supabase und die Server-Funktion
- `lib/` – Anzeige-Hilfen (Stufen, Grösse, Adresse, Kartenlink)
- `types.ts`, `schema.ts`, `index.ts`
