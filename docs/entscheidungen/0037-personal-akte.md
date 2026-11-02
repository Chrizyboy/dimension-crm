# 0037 – Personal-Akte vollständig

**Datum:** 02.11.2026 · **Entschieden von:** Chris

## Ausgangslage

Die Personal-Akte unter «Team & Ausweise» hatte nur Notfallkontakt, Telefon privat, Geburtsdatum, Grössen, Eintritt
und eine Notiz. Es fehlten die/der Vorgesetzte und alle Angaben zum Arbeitsvertrag.

## Entscheid

- **Anstellung:** Vorgesetzt, Funktion, Vertragsart (Auswahlliste `personal_vertragsart`), befristet bis, Eintritt,
  Probezeit bis (Vorschlag Eintritt + 3 Monate), Pensum, Stunden pro Woche, Ferientage, Kündigungsfrist, Vertrag
  unterschrieben, Austritt mit Grund. Ändern nur Recht «personal».
- **Lohn zur Info (1B):** abgerechnet wird weiter in AbaNinja; Lohnart, Betrag und 12/13 Löhne stehen mit Verlauf
  in `personal_loehne`, nur für Recht «personal» (GL und Buchhaltung).
- **Persönlich (2B):** Privatadresse, Telefon und Mail privat, Nationalität, Bewilligung mit Ablauf
  (`personal_bewilligung`), Zivilstand, AHV-Nummer (Prüfziffer), IBAN (Prüfsumme), Notfallkontakt mit Beziehung,
  Grössen Oberteil/Hose/Schuhe. Füllt die Person selbst, Recht «personal» auch.
- **Vorgesetzte (3A):** sehen Anstellung (ohne Lohn), Gespräche, nicht vertrauliche Dokumente und den
  Notfallkontakt, nichts Privates. Gelesen wird über `personal_akte(p_person)`, die nur liefert, was die Person
  sehen darf; die Tabelle selbst lesen nur Recht «personal» und die Person. `intern.ist_vorgesetzt()` nutzt der
  Rollen-Schritt auch für Arbeitszeiten und Abwesenheiten.
- **Gespräche (4A):** Datum, Art, Notiz, nächstes Gespräch (`personal_gespraech_speichern`), erfassen Recht
  «personal» und Vorgesetzte, lesen auch die Person selbst.
- **Dokumente:** im Speicher `personal` (Ordner = Person), Arten als Auswahlliste; «vertraulich» (Vertrag, Nachtrag,
  Lohn) sehen Vorgesetzte nicht und legt nur Recht «personal» ab.
- **Fristen:** Probezeit-Ende, Ende der Befristung, Ablauf der Bewilligung und nächstes Gespräch meldet der Zeitplan
  stündlich (`personal_fristen_melden`) einmal als Aufgabe und Glocke an Recht «personal» und die/den Vorgesetzte/n,
  die Bewilligung auch an die Person. Vorlauf `einstellungen.ressourcen.vorlauf_personal_tage` (30) bzw.
  `vorlauf_ausweis_tage` (60).
- **Ausrüstung:** Fahrzeuge und Geräte, die der Person zugeteilt sind, erscheinen in der Akte (nur lesen).

## Recht «personal»

Bis zum Rollen-Schritt (Modul-Prüfung) gilt «admin» als jedes Recht, also auch «personal». Der Rollen-Schritt
nimmt «personal» in die Liste der Rechte auf, gibt es GL und Buchhaltung und nimmt es der Administration ohne GL.
Datenbank und App fragen schon heute nur nach «personal».
