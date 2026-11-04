// Dringlichkeit einer Mail für den Assistenten («sortier meinen Posteingang nach Dringlichkeit»). Der Server rechnet
// sie aus den Werten, die der Posteingang schon kennt (Frist in Arbeitszeit, Art, «dringend» der Einordnung,
// Nachfassen, Zurückgestellt), damit die Reihenfolge nachvollziehbar ist und nicht vom Sprachmodell geraten wird.

type Zeile = Record<string, unknown>

/** Gewicht je Art: Störung vor Anfrage vor Kunde; Werbung/Privat/Intern nach hinten. */
const ART: Record<string, number> = {
  stoerung: 30,
  anfrage: 20,
  kunde: 15,
  rechnung: 10,
  amt: 10,
  lieferant: 5,
  monitor: 0,
  sonstiges: 0,
  intern: -15,
  werbung: -30,
  privat: -30,
}

const zeit = (w: unknown): number | null => {
  if (typeof w !== 'string' || !w) return null
  const t = Date.parse(w)
  return Number.isNaN(t) ? null : t
}

/** Punkte, Stufe und Gründe (kurz, deutsch) einer Mail. Erledigte und abgelegte Mails sind immer «tief». */
export function mailDringlichkeit(z: Zeile, jetzt: Date): { punkte: number; stufe: string; gruende: string[] } {
  const gruende: string[] = []
  if (z.stand === 'erledigt' || z.stand === 'abgelegt') return { punkte: 0, stufe: 'tief', gruende: ['erledigt'] }
  const n = jetzt.getTime()
  let p = 0
  if (z.dringend === true) {
    p += 40
    gruende.push('als dringend erkannt')
  }
  const art = typeof z.art === 'string' ? z.art : ''
  p += ART[art] ?? 0
  if ((ART[art] ?? 0) >= 15) gruende.push(art === 'stoerung' ? 'Störung' : art === 'anfrage' ? 'Anfrage' : 'Kunde')
  const frist = zeit(z.frist_am)
  if (frist !== null) {
    const stunden = (frist - n) / 3_600_000
    if (stunden < 0) {
      p += 45
      gruende.push('Antwortfrist vorbei')
    } else if (stunden <= 4) {
      p += 30
      gruende.push('Frist in wenigen Stunden')
    } else if (stunden <= 24) {
      p += 15
      gruende.push('Frist heute/morgen')
    }
  }
  if (z.nachfassen === true) {
    p += 15
    gruende.push('Kunde hat nicht geantwortet')
  }
  if (z.stand === 'neu') p += 5
  const zurueck = zeit(z.zurueck_am)
  if (zurueck !== null && zurueck > n) {
    p -= 40
    gruende.push('zurückgestellt')
  }
  const warten = zeit(z.warten_bis)
  if (warten !== null && warten > n) {
    p -= 25
    gruende.push('wartet auf Antwort')
  }
  if (z.stand === 'info') p -= 20
  const punkte = Math.max(0, Math.min(100, p))
  return { punkte, stufe: punkte >= 50 ? 'hoch' : punkte >= 25 ? 'mittel' : 'tief', gruende }
}

/**
 * Berechnete Felder ergänzen (heute nur «dringlichkeit» im Posteingang) und, wenn danach sortiert werden soll,
 * die Zeilen danach ordnen. Bei gleicher Dringlichkeit bleibt die Reihenfolge der Datenbank (Frist zuerst).
 */
export function ergaenze(tabelle: string, zeilen: Zeile[], sortierung: string | null, jetzt: Date): Zeile[] {
  if (tabelle !== 'posteingang') return zeilen
  const mit = zeilen.map((z) => {
    const d = mailDringlichkeit(z, jetzt)
    return { ...z, dringlichkeit: d.stufe, dringlichkeit_punkte: d.punkte, dringlichkeit_gruende: d.gruende }
  })
  if (sortierung !== 'dringlichkeit') return mit
  return mit
    .map((z, i) => ({ z, i }))
    .sort((a, b) => b.z.dringlichkeit_punkte - a.z.dringlichkeit_punkte || a.i - b.i)
    .map((x) => x.z)
}
