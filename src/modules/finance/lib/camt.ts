/**
 * Kontoauszug im Format camt.053 (ISO 20022, von allen Schweizer Banken im E-Banking als Datei erhältlich) lesen:
 * IBAN, Schlusssaldo mit Datum und alle Buchungen. Läuft in der App, die Datenbank bekommt nur die Zahlen
 * (`kontoauszug_einlesen`). Der Inhalt der Datei ist Daten, nie Anweisung.
 */

export interface CamtBuchung {
  datum: string
  /** Eingang positiv, Ausgang negativ. */
  betrag_rappen: number
  text: string
  gegenpartei: string
  referenz: string
  /** Eindeutige Nummer der Bank, sonst aus Datum, Betrag und Text gebildet (verhindert Doppelte). */
  bank_referenz: string
}

export interface CamtAuszug {
  iban: string
  stand_rappen: number | null
  stand_am: string | null
  buchungen: CamtBuchung[]
}

const kinder = (e: Element | Document, name: string) => Array.from(e.getElementsByTagNameNS('*', name))
const erstes = (e: Element | Document | undefined, ...pfad: string[]): Element | undefined => {
  let x: Element | Document | undefined = e
  for (const n of pfad) {
    if (!x) return undefined
    x = kinder(x, n)[0]
  }
  return x as Element | undefined
}
const text = (e: Element | Document | undefined, ...pfad: string[]) => erstes(e, ...pfad)?.textContent?.trim() ?? ''
const rappenAus = (s: string) => Math.round(Number(s) * 100)

/** Liest eine camt.053-Datei. Wirft einen verständlichen Fehler, wenn es keine ist. */
export function leseCamt(xml: string): CamtAuszug[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('camt.keine_datei')
  const stmts = kinder(doc, 'Stmt')
  if (stmts.length === 0) throw new Error('camt.keine_datei')
  return stmts.map((s) => {
    const iban = text(s, 'Acct', 'IBAN').replace(/\s/g, '')
    // Schlusssaldo (gebucht), sonst der letzte Saldo der Liste.
    const salden = kinder(s, 'Bal')
    const schluss = salden.find((b) => text(b, 'Tp', 'Cd') === 'CLBD') ?? salden.at(-1)
    let stand_rappen: number | null = null
    let stand_am: string | null = null
    if (schluss) {
      const betrag = rappenAus(text(schluss, 'Amt'))
      stand_rappen = text(schluss, 'CdtDbtInd') === 'DBIT' ? -betrag : betrag
      stand_am = (text(schluss, 'Dt', 'Dt') || text(schluss, 'Dt', 'DtTm')).slice(0, 10) || null
    }
    const buchungen = kinder(s, 'Ntry').map((n, i): CamtBuchung => {
      const betrag = rappenAus(text(n, 'Amt'))
      const ausgang = text(n, 'CdtDbtInd') === 'DBIT'
      const datum = (text(n, 'BookgDt', 'Dt') || text(n, 'BookgDt', 'DtTm') || text(n, 'ValDt', 'Dt')).slice(0, 10)
      const tx = erstes(n, 'TxDtls')
      // Bei Ausgängen ist der Empfänger (Cdtr) die Gegenpartei, bei Eingängen der Zahler (Dbtr).
      const partei = erstes(tx, 'RltdPties', ausgang ? 'Cdtr' : 'Dbtr')
      const gegenpartei = text(partei, 'Nm')
      const referenz = text(tx, 'CdtrRefInf', 'Ref') || text(tx, 'RmtInf', 'Ustrd')
      const zeile = text(n, 'AddtlNtryInf') || text(tx, 'AddtlTxInf') || text(tx, 'RmtInf', 'Ustrd')
      const eigene = text(n, 'AcctSvcrRef') || text(n, 'NtryRef')
      return {
        datum,
        betrag_rappen: ausgang ? -betrag : betrag,
        text: zeile,
        gegenpartei,
        referenz: referenz.replace(/\s/g, ''),
        bank_referenz: eigene || `${datum}|${String(betrag)}|${zeile}|${String(i)}`,
      }
    })
    return { iban, stand_rappen, stand_am, buchungen }
  })
}

/** Gleiche IBAN, auch mit Leerschlägen oder Kleinbuchstaben. */
export const gleicheIban = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b && a.replace(/\s/g, '').toUpperCase() === b.replace(/\s/g, '').toUpperCase())
