import type { Projekt } from '../types'

/** Was eine Baustelle aufhält; Reihenfolge = Wichtigkeit auf der Karte. */
export type Blocker = 'bewilligung' | 'material' | 'frist'

/** Standard-Lieferfrist, wenn in den Einstellungen Einkauf nichts steht (gleich wie in der Datenbank). */
export const LIEFERFRIST_STANDARD = 14

/** Datum als JJJJ-MM-TT in Ortszeit (ohne Umweg über UTC, sonst kippt es nachts um einen Tag). */
function tag(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** «Material bestellen bis»: Baubeginn minus Lieferfrist (null ohne Baubeginn). */
export function materialBis(baubeginn: string | null, lieferfristTage: number): string | null {
  if (!baubeginn) return null
  const d = new Date(`${baubeginn}T12:00:00`)
  d.setDate(d.getDate() - lieferfristTage)
  return tag(d)
}

/**
 * Blocker einer Baustelle: Bewilligung über der Frist, Material nicht bestellt, obwohl «bestellen bis» erreicht ist,
 * oder sonst ein Schritt über der Frist. Gleiche Regeln wie die Automationen auf dem Server, damit Karte und Glocke
 * übereinstimmen.
 */
export function blockerVon(
  p: Pick<Projekt, 'stand' | 'material_status' | 'baubeginn' | 'status'>,
  lieferfristTage = LIEFERFRIST_STANDARD,
  heute = new Date(),
): Blocker[] {
  const b: Blocker[] = []
  if (p.status === 'abgeschlossen') return b
  if (p.stand && p.stand.bewilligungen_spaet > 0) b.push('bewilligung')
  const bis = materialBis(p.baubeginn, lieferfristTage)
  const h = tag(heute)
  if (bis && p.material_status !== 'bestellt' && p.material_status !== 'lager' && bis <= h && (p.baubeginn ?? '') >= h)
    b.push('material')
  if (p.stand?.spaet && !b.includes('bewilligung')) b.push('frist')
  return b
}
