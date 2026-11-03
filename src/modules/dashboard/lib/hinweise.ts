import type { Fakt, KennzahlenEinstellungen } from '../types'
import { summe } from './auswertung'
import { reaktionQuote, ueberfaellig } from './betrieb'
import { mittelTage, pipelineNachStand, von } from './verkauf'

/** Ein Hinweis «Was auffällt»: Text `kz.hinweis.<id>` mit Werten, Klick zeigt die Zeilen dahinter. */
export interface Hinweis {
  id: string
  ton: 'kritisch' | 'warnung' | 'ok' | 'info'
  werte: Record<string, string | number>
  fakten: Fakt[]
}

/**
 * Was auffällt: feste Regeln über dieselben Zeilen wie die Zahlen, damit jeder Hinweis nachprüfbar ist.
 * Reihenfolge: zuerst Kritisches, dann Warnungen, dann Gutes. Höchstens `max` Einträge.
 */
export function hinweise(
  fakten: readonly Fakt[],
  e: KennzahlenEinstellungen,
  heute: string,
  zielAnteil: number | null,
  max = 6,
): Hinweis[] {
  const liste: Hinweis[] = []

  // Nachfassen fällig je Standort (der grösste Rückstand zuerst).
  for (const s of ['muri', 'bulle'] as const) {
    const nf = von(fakten, 'nf_faellig').filter((f) => f.standort === s)
    if (nf.length >= 5)
      liste.push({ id: 'nachfassen', ton: 'warnung', werte: { standort: s, n: nf.length }, fakten: nf })
  }

  const alt = pipelineNachStand(von(fakten, 'offen'), e, heute).find((p) => p.id === 'alt')
  if (alt && alt.fakten.length >= 5) {
    liste.push({
      id: 'alt',
      ton: 'warnung',
      werte: { n: alt.fakten.length, tage: e.alt_tage, wert: alt.wert },
      fakten: alt.fakten,
    })
  }

  // Quellen mit vielen Leads und keinem Auftrag.
  const auftragQuellen = new Set(von(fakten, 'quelle_auftrag').map((f) => f.quelle ?? 'ohne'))
  const proQuelle = new Map<string, Fakt[]>()
  for (const f of von(fakten, 'leads_neu'))
    proQuelle.set(f.quelle ?? 'ohne', [...(proQuelle.get(f.quelle ?? 'ohne') ?? []), f])
  for (const [q, leads] of proQuelle) {
    if (q !== 'ohne' && leads.length >= 10 && !auftragQuellen.has(q)) {
      liste.push({ id: 'quelle', ton: 'warnung', werte: { quelle: q, n: leads.length }, fakten: leads })
    }
  }

  const ibn = von(fakten, 'ibn')
  const tageIbn = mittelTage(ibn)
  if (tageIbn !== null && tageIbn > e.richtwerte.unterschrift_ibn_tage) {
    liste.push({
      id: 'ibn',
      ton: 'warnung',
      werte: { tage: tageIbn, richtwert: e.richtwerte.unterschrift_ibn_tage },
      fakten: ibn,
    })
  }

  const reaktion = reaktionQuote(von(fakten, 'fall_neu'))
  if (reaktion.prozent !== null && reaktion.prozent < e.richtwerte.reaktion_prozent) {
    liste.push({
      id: 'reaktion',
      ton: 'warnung',
      werte: { prozent: reaktion.prozent, richtwert: e.richtwerte.reaktion_prozent },
      fakten: reaktion.fakten,
    })
  }

  const ueber = ueberfaellig(von(fakten, 'rechnung_offen'))
  if (ueber.length)
    liste.push({ id: 'ueberfaellig', ton: 'kritisch', werte: { n: ueber.length, wert: summe(ueber) }, fakten: ueber })

  if (zielAnteil !== null) {
    const auftraege = von(fakten, 'angenommen')
    if (zielAnteil < 90)
      liste.push({ id: 'zielKnapp', ton: 'kritisch', werte: { prozent: zielAnteil }, fakten: auftraege })
    else if (zielAnteil >= 100)
      liste.push({ id: 'zielOk', ton: 'ok', werte: { prozent: zielAnteil }, fakten: auftraege })
  }

  const rang = { kritisch: 0, warnung: 1, info: 2, ok: 3 }
  return liste.sort((a, b) => rang[a.ton] - rang[b.ton]).slice(0, max)
}
