# 0037 – Wartungsverträge nach den Paketen der Website (2.11.2026)

## Ausgangslage

«Neuer Vertrag» bot freie Häkchen für Leistungen, einen frei getippten Preis inkl. MWST und einen frei gewählten
Rhythmus. Die Website (www.dimension-solaire.ch, «Wartungsverträge 2026», DE/FR) verkauft aber drei feste Pakete
mit Preisen nach Anlagengrösse und klaren Bedingungen. Chris: «Wartungsverträge anhand der Auswahl auf unserer
Webseite».

## Entscheid

- **Pakete als Daten** in `einstellungen.wartung_pakete` (Regel 8, nur Administration ändert): Essentiel,
  Comfort (empfohlen), Premium mit Leistungen DE/FR wörtlich von der Website, Preisen exkl. MWST je Stufe
  (≤ 20, 20–50, 50–100 kWp; darüber auf Anfrage), Inspektion (keine / alle 24 / alle 12 Monate), Rabatt auf
  Zusatzarbeiten und Kleinreparatur-Budget. Dazu Zusatzleistungen (Bestandsaufnahme CHF 290, Anlage-Check
  CHF 490) und die Bedingungen (3 Jahre Mindestlaufzeit, danach +1 Jahr, Kündigung 3 Monate vor Ablauf,
  Zahlung 30 Tage, Bestandsaufnahme bei Fremdanlagen oder Anlagen ab 2 Jahren).
- **Preis (Chris 1B):** Der Tarif wird vorgeschlagen und kann für einen Rabatt geändert werden. Der Vertrag
  speichert Preis und Tarif exkl. MWST; eine Abweichung ist in Liste, Akte, PDF und Rechnung sichtbar (eigene
  Zeile «Rabatt»/«Rabais»). `preis_rappen` (inkl. MWST, 5 Rappen gerundet) bleibt für ältere Abläufe.
- **Jahresrechnung (Chris 2A):** Der Zeitplan (`wartung_jahreslauf`, alle 12 Stunden) legt 30 Tage vor jedem
  Vertragsjahr eine Rechnung als **Entwurf** an; die Buchhaltung stellt sie. `verrechnet_bis` verhindert
  doppelte Rechnungen. Von Hand: «Jahresrechnung» in der Akte (Recht `finanzen`).
- **Kündigung** über `wartung_kuendigen` auf das Ende des laufenden Vertragsjahrs (gleich gerechnet wie
  `src/modules/contracts/lib/tarif.ts`), zurücknehmen möglich; nach dem Ende stellt der Zeitplan auf «beendet».
- Anlage (kWp, Speicher, IBN-Jahr, Wechselrichter, Ort, Fremdanlage) steht im Vertrag und wird aus einer
  bestehenden Anlage des Kunden vorgefüllt.

## Folgen

- Alte Verträge ohne Paket behalten Leistungen, Rhythmus und Preis; sie bekommen keine automatische Rechnung.
- Ändert die Website Preise, passt die Administration `wartung_pakete` an; laufende Verträge behalten ihren Preis.
- Offen (nächster Schritt): Inspektionen planen mit Ankündigung, Liste «Ohne Vertrag», Inspektion am Handy mit
  Messwerten, Editor «Pakete & Preise» in den Einstellungen.
