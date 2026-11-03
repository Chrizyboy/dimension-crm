---
stand: 2026-11-03
rollen: innendienst, verkauf, buchhaltung, geschaeftsleitung
---

# Wartungsverträge

Wartungsverträge nach den drei Paketen der Website: **Essentiel**, **Comfort** (empfohlen) und **Premium**. Hier wird der Vertrag erfasst, die Inspektion festgehalten, gekündigt und die Jahresrechnung vorbereitet. Den Vertrag gibt es als PDF in der Sprache des Kunden.

## Wer arbeitet hier {#wer}

- **Innendienst und Verkauf**: neue Verträge erfassen, PDF an den Kunden, Kündigungen.
- **Montage und Service**: Inspektion erledigt eintragen.
- **Buchhaltung (Recht Finanzen)**: Jahresrechnungen stellen.

## So geht's {#so}

### Einen neuen Vertrag erfassen

1. **Neuer Vertrag**, Kunde wählen.
2. Anlage wählen: Leistung, Speicher, Inbetriebnahme und Wechselrichter werden aus der bestehenden Anlage übernommen. Ohne Anlage im CRM: **Von Hand erfassen**. Nicht von uns gebaut: **Fremdanlage** ankreuzen.
3. **Paket** wählen. Der Preis pro Jahr exkl. MWST kommt als Tarif nach kWp-Stufe. Ein tieferer Preis ist möglich und wird als **Rabatt** angezeigt.
4. Bei Fremdanlagen und Anlagen ab 2 Jahren erscheint **Bestandsaufnahme nötig**: **Verrechnen** oder **Erlassen**.
5. **Vertragsbeginn** und **Sprache des Vertrags** setzen, **Speichern**. Nummer (W001 …), Rhythmus und erste Inspektion setzt das CRM.
6. In der Akte **Vertrag als PDF**, ausdrucken oder per Mail schicken und unterschreiben lassen.

### Eine Inspektion eintragen

1. Vertrag öffnen, **Wartung erledigt**.
2. **Durchgeführt am** und kurz, was gemacht wurde. Die nächste Inspektion rechnet das CRM aus dem Paket.

### Eine Inspektion planen

1. Reiter **Inspektionen**: fällige Inspektionen der nächsten 90 Tage ohne Termin, mit **Geplant** die schon geplanten.
2. **Termin planen**: Tag, Von, Bis und wer geht. **Speichern**.
3. 14 Tage vorher liegt die Ankündigung an den Kunden im [Ausgangskorb](kapitel:outbox). Erst nach deiner Freigabe geht sie hinaus. Sofort: im Termin **Jetzt ankündigen**.
4. Die Inspektion erscheint am Handy der Person in [Baustelle](kapitel:fieldwork) unter «Mein Tag».

### Kunden ohne Vertrag ein Angebot schicken

1. Reiter **Ohne Vertrag**: eigene Anlagen nach der Inbetriebnahme ohne laufenden Vertrag, mit passendem Paket und Preis.
2. **Angebot senden** für einen Kunden, oder mehrere ankreuzen und **An … Kunden senden**. Der Klick ist die Freigabe, die Mail geht in der Sprache des Kunden.
3. Antwort des Kunden: **Angenommen** öffnet «Neuer Vertrag», sonst **Abgelehnt**. Filter **Nachfassen** zeigt offene Angebote nach 14 Tagen.

### Eine Kündigung erfassen

1. Vertrag öffnen, **Kündigung erfassen**, Datum des Eingangs eintragen.
2. Das CRM zeigt, wann der Vertrag endet (Ende des laufenden Vertragsjahrs). Bis dahin läuft er normal.
3. Irrtum oder Kunde bleibt doch: **Kündigung zurücknehmen**.

### Eine Jahresrechnung von Hand erstellen

1. Vertrag öffnen, **Jahresrechnung erstellen** (nur mit Recht Finanzen).
2. Die Rechnung entsteht als Entwurf in [Rechnungen](kapitel:invoices) und wird dort gestellt.

## Stände {#staende}

- **Aktiv**: läuft, Inspektionen und Rechnungen kommen.
- **Kündbar in 90 Tagen**: die Kündigungsfrist (3 Monate vor Ablauf) naht.
- **Gekündigt**: läuft bis **Endet am** aus.
- **Beendet**: nach dem Ende, setzt das CRM selbst.

## Läuft automatisch {#automatisch}

- 30 Tage vor jedem Vertragsjahr legt das CRM die Jahresrechnung als Entwurf an. «verrechnet bis» verhindert doppelte Rechnungen.
- 14 Tage vor einem geplanten Termin legt das CRM die Ankündigung an den Kunden in den Ausgangskorb (wartet auf Freigabe). Nach «Wartung erledigt» ist der Termin wieder leer.
- Fällige Wartungen der nächsten 30 Tage stehen auf [Mein Tag](kapitel:today).
- Nach Ablauf der Mindestlaufzeit (3 Jahre) verlängert sich der Vertrag um je 1 Jahr.

## Regeln {#regeln}

- Pakete, Preise und Bedingungen ändert nur die Administration. Laufende Verträge behalten ihren Preis.
- Preise in Liste und Akte sind exkl. MWST, das PDF zeigt auch das Total inkl. MWST.
- Ältere Verträge ohne Paket behalten ihre Leistungen und bekommen keine automatische Rechnung.

## Häufige Fragen {#fragen}

### Die Anlage ist grösser als 100 kWp.

Das Paket zeigt «auf Anfrage». Preis selbst eintragen, er erscheint dann als Abweichung vom Tarif.

### Warum steht beim Vertrag «Rabatt»?

Der Preis ist tiefer als der Tarif des Pakets. Das ist gewollt sichtbar, auch im PDF und auf der Rechnung.

### Die Jahresrechnung ist nicht gekommen.

Nur Verträge mit Paket bekommen sie automatisch. Bei älteren Verträgen **Jahresrechnung erstellen** von Hand.

## Neu {#neu}

- 03.11.2026: «In den Papierkorb» für Wartungsverträge (unten in der Akte), mit Rückfrage und «Rückgängig». Zurückholen unter Papierkorb (Menü oben rechts).
- 03.11.2026: Inspektionen planen mit Ankündigung 14 Tage vorher, Reiter «Ohne Vertrag» mit Angebot einzeln oder als Serie, Inspektion am Handy mit Werten vom letzten Mal.
- 02.11.2026: Verträge nach den Paketen der Website, Tarif nach kWp mit sichtbarem Rabatt, Kündigung mit «kündbar bis», Jahresrechnung automatisch als Entwurf.
- 31.10.2026: Suche und Detailfenster einheitlich wie in allen Bereichen.
