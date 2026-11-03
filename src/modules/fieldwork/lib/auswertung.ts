import type { Auswertung, FertigeBaustelle } from '../types'

/** Kennzahlen der GL-Auswertung aus der Antwort von `baustelle_auswertung` (in der App gerechnet, damit Zahl und Liste passen). */
export interface AuswertungZahlen {
  fertig: number
  abweichung: number | null
  hProKwp: number | null
  reiseAnteil: number | null
  gleicherTag: number | null
  visiert: number | null
}

const runden = (x: number, stellen = 1) => Math.round(x * 10 ** stellen) / 10 ** stellen

/** Abweichung Ist gegen Soll in Prozent (+12 = 12 % länger als geplant); null ohne Soll. */
export function abweichung(b: Pick<FertigeBaustelle, 'soll' | 'ist'>): number | null {
  if (!b.soll || b.ist == null) return null
  return Math.round((100 * (b.ist - b.soll)) / b.soll)
}

/** Stunden pro kWp einer PV-Baustelle; null ohne kWp. */
export function stundenProKwp(b: Pick<FertigeBaustelle, 'kwp' | 'ist'>): number | null {
  if (!b.kwp || b.ist == null) return null
  return runden(b.ist / b.kwp, 2)
}

/** Summen und Schnitte über alle fertigen Baustellen des Zeitraums. */
export function auswertungZahlen(a: Auswertung): AuswertungZahlen {
  const mitSoll = a.fertig.filter((b) => b.soll && b.ist != null)
  const soll = mitSoll.reduce((s, b) => s + (b.soll ?? 0), 0)
  const ist = mitSoll.reduce((s, b) => s + (b.ist ?? 0), 0)
  const pv = a.fertig.filter((b) => b.vorlage === 'pv' && b.kwp && b.ist != null)
  const kwp = pv.reduce((s, b) => s + (b.kwp ?? 0), 0)
  const total = a.stunden.arbeit + a.stunden.reise
  const r = a.rapporte.anzahl
  return {
    fertig: a.fertig.length,
    abweichung: soll ? Math.round((100 * (ist - soll)) / soll) : null,
    hProKwp: kwp ? runden(pv.reduce((s, b) => s + (b.ist ?? 0), 0) / kwp, 2) : null,
    reiseAnteil: total ? Math.round((100 * a.stunden.reise) / total) : null,
    gleicherTag: r ? Math.round((100 * a.rapporte.gleicher_tag) / r) : null,
    visiert: r ? Math.round((100 * a.rapporte.visiert) / r) : null,
  }
}

/** Ton für Ist gegenüber Soll: bis 100 % gut, bis 115 % Warnung, darüber kritisch. */
export function sollTon(ist: number | null, soll: number | null): 'ok' | 'warn' | 'bad' | 'primary' {
  if (!soll || ist == null) return 'primary'
  const q = ist / soll
  return q <= 1 ? 'ok' : q <= 1.15 ? 'warn' : 'bad'
}
