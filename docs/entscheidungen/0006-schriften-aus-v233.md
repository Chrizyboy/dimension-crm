# 0006 – Schriften aus der Vorlage V233

**Kontext:** Die Vorlage V233 nutzt Schibsted Grotesk für Titel, Public Sans für Text und JetBrains Mono für Zahlen. Sie lädt die Schriften von Google Fonts, was in der Desktop-App ohne Internet nicht geht und Besucherdaten an Google schickt.

**Entscheid:** Dieselben drei Schriften, aber als Pakete (`@fontsource-variable/*`) direkt in der App. Zahlen in Tabellen und Beträgen nutzen `tabular-nums` (Klasse `.zahlen`), damit Ziffern sauber untereinander stehen.

**Folgen:** Das CRM sieht aus wie gewohnt, funktioniert offline und braucht keine Verbindung zu Google. Die App wird dadurch etwa 220 KB grösser (10 Schriftdateien, gemessen im Build), was bei einer Desktop-App keine Rolle spielt.
