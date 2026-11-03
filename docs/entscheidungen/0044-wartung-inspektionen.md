# 0044 – Wartung: Inspektionen planen, Kunden ohne Vertrag, Inspektion am Handy

Datum: 02.11.2026 · Stand: angenommen (Chris: «Ja, alles drei»)

## Ausgangslage

Die Pakete der Website (Entscheid 0037) waren abgebildet, aber die tägliche Arbeit fehlte: wer wann zur Inspektion
geht, dass der Kunde vorher Bescheid bekommt, welche eigenen Anlagen noch keinen Vertrag haben, und ein Protokoll am
Handy, das die Messwerte mit dem letzten Mal vergleicht («Messprotokoll mit Vorjahresvergleich» steht im Premium-Paket).

## Entscheid

1. **Termin auf dem Vertrag** (`termin_von`, `termin_bis`, `termin_person_id`) nur über `wartung_termin_setzen`.
   Nach «Inspektion erledigt» oder Vertragsende leert ein Trigger den Termin.
2. **Ankündigung 14 Tage vorher** (`wartung_pakete.ankuendigung_tage`): der Zeitplan (`wartung_ankuendigungen`,
   stündlich) legt eine Mail in der Sprache des Kunden in den Ausgangskorb, Stand «wartet», einmal pro Termin
   (Schlüssel). Freigabe per Klick. «Jetzt ankündigen» im Termin-Dialog tut dasselbe sofort.
3. **Kunden ohne Vertrag** aus der Sicht `wartung_ohne_vertrag`: Anlagen mit IBN ohne aktiven oder gekündigten
   Vertrag, passendes Paket (über 50 kWp Premium, sonst Comfort) mit Tarif. «Angebot senden» einzeln oder für alle
   markierten (Serie) über `wartung_angebot_senden`; der Klick ist die Freigabe, jede Mail mit eigenem Paket und Preis.
   Nicht zweimal am selben Tag (Schweizer Tag, nicht UTC). Verlauf in `wartung_angebote`, Stand offen/angenommen/
   abgelehnt; «Angenommen» öffnet «Neuer Vertrag».
4. **Inspektion am Handy:** geplante Inspektionen erscheinen in «Mein Tag» der Person (`mein_tag`, Typ `wartung`).
   «Wartung beginnen» legt einen Rapport der Art `wartung` mit Bezug auf den Vertrag an (Verrechnung «Vertrag»).
   Prüfpunkte in `wartung_pakete.pruefpunkte`; Messungen (`nur_messung`) nur bei Paketen mit `messung: true`.
   Daneben steht der Wert der letzten Inspektion, sonst des IBN-Protokolls (`wartung_vorjahr`); weicht ein Messwert
   mehr als `abweichung_prozent` (10 %) ab, ist er markiert. Das PDF zeigt beide Spalten. Abschluss wie bisher über
   `rapport_abschliessen`, das `wartung_erledigt` aufruft.

Alle Texte, Prüfpunkte, Fristen und Schwellen sind Einstellungen (`wartung_pakete`, nur Administration).

## Folgen

- Die Ankündigung braucht eine Mail-Adresse beim Kunden; ohne Mail bleibt der Termin ohne Ankündigung.
- Neue Prüfpunkte: Eintrag in `wartung_pakete.pruefpunkte`, kein Code.
- Browser-Test `projekte` prüft Vertrag und Wartung; die neuen Abläufe prüft `supabase/tests/wartung_inspektionen.test.sql`.
