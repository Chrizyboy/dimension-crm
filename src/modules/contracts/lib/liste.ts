/** Filter und Kennzahlen der Vertragsliste (ohne React, darum testbar). */
import type { Filter, Vertrag } from '../types'
import { inTagen } from './anzeige'
import { kuendbarBis, laeuftBis } from './tarif'

/** Erster Tag des nächsten, noch nicht verrechneten Vertragsjahrs (= nächste Jahresrechnung) oder null. */
export function naechsteRechnung(v: Vertrag): string | null {
  if (!v.paket || !v.start_am || v.status === 'beendet') return null
  const von = v.verrechnet_bis ? inTagen(new Date(`${v.verrechnet_bis}T12:00:00`), 1) : v.start_am
  if (v.gekuendigt_per && von > v.gekuendigt_per) return null
  return von
}

/** Stichtag + n Monate als JJJJ-MM-TT. */
function plusMonate(iso: string, monate: number): string {
  const [j, m, t] = iso.split('-').map(Number)
  const d = new Date(j ?? 1970, (m ?? 1) - 1 + monate, t ?? 1)
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Laufzeit am Stichtag: `bis` = Ende des laufenden Vertragsjahrs, `per` = frühestes Ende bei einer Kündigung
 * heute (wie public.wartung_kuendigen) und `kuendbar` = letzter Tag dafür. Ist die Frist für das laufende Jahr
 * vorbei, gelten Ende und Frist des nächsten Jahrs. Gekündigt: nur das Ende.
 */
export function laufzeit(v: Vertrag, heute: string, kuendigungMonate: number) {
  if (v.gekuendigt_per) return { bis: v.gekuendigt_per, per: v.gekuendigt_per, kuendbar: null }
  const bis = laeuftBis(v.start_am, v.laufzeit_jahre, heute)
  const per = laeuftBis(v.start_am, v.laufzeit_jahre, plusMonate(heute, kuendigungMonate))
  return { bis, per, kuendbar: kuendbarBis(per, kuendigungMonate) }
}

/** Liste nach Filter. `heute` als JJJJ-MM-TT; Vorlauf der Rechnung und Kündigungsfrist aus den Bedingungen. */
export function filtere(
  liste: Vertrag[],
  filter: Filter,
  heute: string,
  { vorlauf = 30, kuendigung = 3 }: { vorlauf?: number; kuendigung?: number } = {},
): Vertrag[] {
  const d = new Date(`${heute}T12:00:00`)
  const in30 = inTagen(d, 30)
  return liste.filter((v) => {
    if (filter === 'alle') return true
    if (filter === 'gekuendigt') return v.status === 'gekuendigt'
    if (filter === 'rechnung') {
      const r = naechsteRechnung(v)
      return r != null && r <= inTagen(d, vorlauf)
    }
    if (v.status !== 'aktiv') return false
    if (filter === 'faellig') return v.naechste_wartung != null && v.naechste_wartung <= in30
    if (filter === 'kuendbar') {
      const k = laufzeit(v, heute, kuendigung).kuendbar
      return k != null && k >= heute && k <= inTagen(d, 90)
    }
    return true
  })
}

/** Kopfzahlen: aktive Verträge, wiederkehrend pro Jahr exkl. MWST, fällige Inspektionen (60 Tage), Rechnungen, gekündigte. */
export function kennzahlen(liste: Vertrag[], heute: string, vorlauf = 30) {
  const d = new Date(`${heute}T12:00:00`)
  const aktiv = liste.filter((v) => v.status === 'aktiv')
  return {
    aktiv: aktiv.length,
    wiederkehrend: aktiv.reduce((s, v) => s + (v.preis_netto_rappen ?? 0), 0),
    faellig: aktiv.filter((v) => v.naechste_wartung != null && v.naechste_wartung <= inTagen(d, 60)).length,
    rechnung: filtere(liste, 'rechnung', heute, { vorlauf }).length,
    gekuendigt: liste.filter((v) => v.status === 'gekuendigt').length,
  }
}
