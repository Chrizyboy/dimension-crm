// Eingangsrechnung lesen (Chris 27.11.2026): Teile und Schema für die KI und die Prüfung ihrer Antwort. Die KI
// liefert nur Vorschläge; was nicht sicher auf der Rechnung steht, ist null. Gespeichert wird erst nach dem Klick.

import { daten, GRUNDREGELN } from './ki_rahmen.ts'
import { ganz, objekt, oderNull, text, zahl } from './ki_schema.ts'

export const SYSTEM_EINGANG = `${GRUNDREGELN}
Du liest Lieferantenrechnungen einer Schweizer Firma (Dimension Solaire) aus. Unbekannte Werte sind null. Rate nie.`

/** Was die KI zurückgibt (Beträge in Franken, die App rechnet in Rappen). */
export const EINGANG_SCHEMA = objekt({
  lieferant: oderNull(text),
  nummer: oderNull(text),
  datum: oderNull(text),
  faellig_am: oderNull(text),
  betrag: oderNull(zahl),
  mwst: oderNull(zahl),
  waehrung: oderNull(text),
  skonto_prozent: oderNull(zahl),
  skonto_tage: oderNull(ganz),
  iban: oderNull(text),
  referenz: oderNull(text),
  grund: oderNull(text),
  periode_von: oderNull(text),
  periode_bis: oderNull(text),
  bemerkung: oderNull(text),
})

/** Auftrag an die KI. */
export function eingangAuftrag(heute: string, firmen: string[]): string {
  return `Heute ist ${heute}. AUFGABE: Das ist eine Rechnung AN uns (${firmen.join(', ')}). Lies sie aus.
«lieferant»: wer die Rechnung stellt, wie im Briefkopf, ohne Abteilung (z. B. «Strassenverkehrsamt Kanton Aargau», «Krannich Solar AG»). Nie unsere eigene Firma.
«nummer»: Rechnungsnummer genau wie gedruckt (nicht Kundennummer, PIN oder Referenz).
«datum»: Rechnungsdatum, «faellig_am»: Fälligkeit/zahlbar bis, beide JJJJ-MM-TT. Steht nur «30 Tage netto», rechne vom Rechnungsdatum.
«betrag»: zu zahlender Gesamtbetrag inkl. MWST als Zahl (419.00). «mwst»: ausgewiesener MWST-Betrag, sonst null. «waehrung»: z. B. CHF, EUR.
«skonto_prozent» und «skonto_tage»: nur wenn ein Skonto angeboten wird (z. B. 2 % innert 10 Tagen), sonst null.
«iban»: IBAN oder QR-IBAN aus dem Zahlteil ohne Leerzeichen. «referenz»: QR-/ESR-Referenz aus dem Zahlteil, sonst null.
«grund»: worum es geht, sehr kurz für einen Dateinamen (2–4 Wörter, z. B. «KIA EV9», «Abo Internet», «Material 101481», «Prämie 2027»). Keine Sonderzeichen wie / \\ : _.
«periode_von»/«periode_bis»: Leistungs- oder Abrechnungsperiode, falls angegeben (z. B. «Verkehrssteuer 01.01.2027 - 31.12.2027», «Prämie 01.01.–31.03.2027», «Abo November 2026»), JJJJ-MM-TT; sonst null.
«bemerkung»: höchstens ein Satz zu Auffälligem (Mahnung, Gutschrift, neue Zahlungsfrist), sonst null.`
}

/** Teile für den KI-Aufruf: Datei, Firmennamen als Daten, Auftrag. */
export function eingangTeile<T>(datei: T, firmen: string[], heute: string) {
  return [
    datei,
    { art: 'text' as const, text: daten('eigene_firmen', firmen) },
    { art: 'text' as const, text: eingangAuftrag(heute, firmen) },
  ]
}

/** Geprüfter Vorschlag für das Formular (Rappen, Datumsformat, Längen). */
export interface EingangVorschlag {
  lieferant: string | null
  nummer: string | null
  datum: string | null
  faellig_am: string | null
  betrag_rappen: number | null
  mwst_rappen: number | null
  waehrung: string | null
  skonto_prozent: number | null
  skonto_bis: string | null
  iban: string | null
  referenz: string | null
  grund: string | null
  periode_von: string | null
  periode_bis: string | null
  bemerkung: string | null
}

const datumOk = (d: unknown) =>
  typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) ? d : null
const textOk = (t: unknown, n: number) => (typeof t === 'string' && t.trim() ? t.trim().slice(0, n) : null)
const rappen = (z: unknown) => (typeof z === 'number' && Number.isFinite(z) && z > 0 ? Math.round(z * 100) : null)

/** Tage zu einem Datum (JJJJ-MM-TT) zählen. */
function plusTage(d: string, n: number): string {
  const x = new Date(`${d}T12:00:00Z`)
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}

/** Antwort der KI prüfen: unplausible Werte werden null statt geraten. */
export function eingangPruefen(j: Record<string, unknown>): EingangVorschlag {
  const datum = datumOk(j.datum)
  const betrag = rappen(j.betrag)
  const mwst = rappen(j.mwst)
  const skonto =
    typeof j.skonto_prozent === 'number' && j.skonto_prozent > 0 && j.skonto_prozent < 20 ? j.skonto_prozent : null
  const tage = typeof j.skonto_tage === 'number' && j.skonto_tage > 0 && j.skonto_tage <= 120 ? j.skonto_tage : null
  const iban = typeof j.iban === 'string' ? j.iban.replace(/\s/g, '').toUpperCase() : ''
  let von = datumOk(j.periode_von)
  let bis = datumOk(j.periode_bis)
  if (!von || !bis || bis < von) {
    von = null
    bis = null
  }
  return {
    lieferant: textOk(j.lieferant, 120),
    nummer: textOk(j.nummer, 60),
    datum,
    faellig_am: datumOk(j.faellig_am),
    betrag_rappen: betrag,
    mwst_rappen: mwst !== null && betrag !== null && mwst < betrag ? mwst : null,
    waehrung: textOk(j.waehrung, 5)?.toUpperCase() ?? null,
    skonto_prozent: skonto,
    skonto_bis: skonto && tage && datum ? plusTage(datum, tage) : null,
    iban: /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban) ? iban : null,
    referenz: textOk(j.referenz, 40)?.replace(/\s/g, '') ?? null,
    grund:
      textOk(j.grund, 60)
        ?.replace(/[\\/:*?"<>|#%_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || null,
    periode_von: von,
    periode_bis: bis,
    bemerkung: textOk(j.bemerkung, 200),
  }
}
