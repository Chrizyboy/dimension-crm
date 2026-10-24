import { rufeKi } from '@/services/ki'
import type { Sprache } from '../types'

type Texte = Record<Sprache, { betreff: string; text: string }>

/** Hat ein Text mehr als die leere Anrede-Zeile? Dann überarbeitet die KI statt neu zu schreiben. */
const hatInhalt = (t: { text: string }) => t.text.replace('{Anrede}', '').trim().length > 0

/**
 * Serien-Mail, Serienbrief oder Newsletter mit KI (V233 aiSend «marketing», nlAi) in den gewählten Sprachen.
 * Gibt die Texte zurück; die übrigen Sprachen bleiben, wie sie sind.
 */
export async function marketingMitKi(
  art: 'mail' | 'brief' | 'newsletter',
  sprachen: readonly Sprache[],
  wunsch: string,
  texte: Texte,
): Promise<Texte> {
  const bisher = Object.fromEntries(sprachen.filter((s) => hatInhalt(texte[s])).map((s) => [s, texte[s]]))
  const r = await rufeKi<{ texte: Partial<Texte> }>('marketing_text', { art, sprachen, wunsch, bisher })
  const neu = { ...texte }
  for (const s of sprachen) {
    const x = r.texte[s]
    if (x?.text) neu[s] = { betreff: x.betreff || texte[s].betreff, text: x.text }
  }
  return neu
}

/** Ob schon etwas dasteht (für den Knopf «Überarbeiten»). */
export function textDa(texte: Texte, sprachen: readonly Sprache[]): boolean {
  return sprachen.some((s) => hatInhalt(texte[s]))
}
