# 0028 – Fahrzeuge, Geräte und Personal-Akte

**Kontext:** Die ERP-Lückenanalyse (von Chris am 21.10.2026 freigegeben) verlangt als Phase 17 «Fahrzeuge mit MFK und
Service, Prüftermine Messgeräte und Absturzsicherung, Kurse und Ausweise (wer darf was), Personal-Akte». V233 kannte
das nicht (nur Termine im Kalender). Lohn, Verträge und Sozialversicherungen bleiben in AbaNinja (Entscheid 0009).
Phase 17 wurde von Chris am 26.10.2026 mit «weiter» gestartet.

**Entscheid:**

- **Zwei Bereiche:** «Fahrzeuge & Geräte» (`fleet`, Abwicklung; für Montage, Projektleitung, Innendienst und
  Administration) und «Team & Ausweise» (`staff`, Verwaltung, für alle sichtbar). So findet die Montage am Handy ihr
  Material, und jede Person ihre eigenen Ausweise und ihre Akte.
- **Fristen auf dem Objekt, Verlauf als Einträge:** Fahrzeug und Gerät tragen die nächste MFK, den nächsten Service
  (nach Datum und Kilometern) bzw. die nächste Prüfung. Jede MFK, jeder Service, jede Prüfung, jeder Schaden und jeder
  Kilometerstand ist ein Eintrag, geschrieben nur über `ressource_eintrag_erfassen`; die Funktion setzt die nächste
  Frist, den Kilometerstand und den Zustand. Die MFK verlangt das Datum vom Fahrzeugausweis (das Intervall wechselt mit
  dem Alter), Service und Prüfung rechnen aus dem Intervall, wenn nichts angegeben ist. Die ID kommt aus der App: ein
  zweiter Klick am Handy legt nichts doppelt an.
- **Übergaben im Verlauf:** «Übergeben» an eine Person, in ein Fahrzeug (Geräte) oder ins Lager; vorher → nachher
  steht im Verlauf. Ein Schaden setzt das Gerät auf «defekt» und meldet sich in der Glocke der Administration.
- **Konfiguration als Daten:** Geräte-Arten mit Prüfintervall, Eintrag-Arten und Kurse/Ausweise mit Gültigkeit und
  «Pflicht für Rolle» (z. B. Absturzsicherung für die Montage) sind Auswahllisten; Service-Intervall (12 Monate /
  20'000 km) und Vorlauf der Erinnerungen (30 Tage, Ausweise 60 Tage) in `einstellungen.ressourcen`.
- **Erinnerung ohne Automationen-Motor:** Die Sicht `fristen` sammelt MFK, Service, Prüfungen und ablaufende Ausweise
  (der neuste je Person und Art zählt). `fristen_melden` läuft stündlich im Zeitplan und gibt einmal pro Frist eine
  Aufgabe und eine Glocke: an die zugeteilte Person, sonst an die Administration; Ausweise an die Person und die
  Administration. Es geht nichts nach aussen, darum keine Freigabe nötig (Regel 6).
- **Personal-Akte privat:** Nur die Administration und die Person selbst sehen sie (RLS). Die Person füllt
  Notfallkontakt, private Nummer, Geburtsdatum und Grössen; Eintritt, Austritt, Pensum und die Notiz bleiben der
  Administration (Trigger), die Notiz sieht die Person nicht (Sicht `personal_akten_sicht`). Kursbestätigungen und
  Ausweis-Kopien liegen im privaten Speicher `personal`, Ordner = Person. Kein Lohn im CRM.
- **Später, nur nach Ja:** Warnung in der Einsatzplanung, wenn eine Person ohne Pflicht-Ausweis eingeplant wird;
  Fahrzeug-Belegung im Kalender; Handy-Warteschlange (offline) auch für Einträge.

**Folgen:** Neue Fachtabellen `fahrzeuge`, `geraete`, `ressourcen_eintraege`, `qualifikationen`, `personal_akten`
sind automatisch in der Datensicherung. Neue Fristen-Arten: Zeile in der Sicht `fristen` und Text in
`fuhrpark.fristen.art`.
