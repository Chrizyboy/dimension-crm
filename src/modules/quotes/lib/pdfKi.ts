import { rufeKi } from '@/services/ki'
import type { PdfWerte } from '../types'

/** Antwort der KI für ein Offerten-PDF (Zahlen in Franken). */
export interface KiOfferte {
  nummer: string | null
  datum: string | null
  sprache: 'de' | 'fr' | null
  kunde: { vorname: string | null; nachname: string | null; firma: string | null }
  betrag_exkl: number | null
  kwp: number | null
  module: number | null
  wechselrichter: string | null
  batterie: string | null
  batterie_kwh: number | null
}

/** Fehlt Nummer oder Betrag, haben die festen Regeln das PDF nicht verstanden (kein Eturnity-Format). */
export function brauchtKi(w: PdfWerte): boolean {
  return !w.nummer || !w.betragRappen
}

/**
 * Ergänzt nur, was die festen Regeln nicht fanden (V233 oiAi, offAiParse). Was die Regeln lesen, gilt; die KI
 * füllt Lücken. Die Person sieht alles in der Liste, bevor sie «Ausführen» drückt.
 */
export function ergaenzeMitKi(w: PdfWerte, k: KiOfferte): PdfWerte {
  const kunde = [k.kunde.vorname, k.kunde.nachname].filter(Boolean).join(' ') || k.kunde.firma || undefined
  const datum = k.datum && /^\d{4}-\d{2}-\d{2}$/.test(k.datum) ? k.datum : undefined
  return {
    ...w,
    nummer: w.nummer || k.nummer || undefined,
    datum: w.datum || datum,
    kunde: w.kunde || kunde,
    sprache: w.sprache ?? k.sprache ?? undefined,
    betragRappen: w.betragRappen ?? (k.betrag_exkl ? Math.round(k.betrag_exkl * 100) : undefined),
    kwp: w.kwp ?? k.kwp ?? undefined,
    anzahlModule: w.anzahlModule ?? k.module ?? undefined,
    wechselrichter: w.wechselrichter || k.wechselrichter || undefined,
    batterie: w.batterie || k.batterie || undefined,
    batterieKwh: w.batterieKwh ?? k.batterie_kwh ?? undefined,
  } as PdfWerte
}

/** Liest den Text eines PDFs mit der KI. */
export async function leseMitKi(zeilen: string[]): Promise<KiOfferte> {
  const r = await rufeKi<{ werte: KiOfferte }>('offerte_pdf', { text: zeilen.join('\n').slice(0, 14_000) })
  return r.werte
}
