import type { Artikel, Baustein, BausteinZeile, KalkPosition, Leistung } from '../types'
import { anlageDerVariante, mengeAusRegel, neuerSchluessel, positionAusArtikel } from './kalkulation'

/** Position aus einer Leistung: Kosten als EK, fester Verkaufspreis, Name in der Sprache der Person. */
export function positionAusLeistung(l: Leistung, menge: number, sprache: 'de' | 'fr'): KalkPosition {
  return {
    key: neuerSchluessel(),
    artikelId: null,
    artikelnummer: '',
    name: sprache === 'fr' ? l.nameFr : l.nameDe,
    kategorie: 'dienstleistungen',
    gruppe: '',
    wp: null,
    einheit: l.einheit,
    menge,
    ekRappen: l.kostenRappen ?? 0,
    marge: 0,
    skonto: 0,
    preisRappen: l.verkaufRappen,
    leistung: l.schluessel,
  }
}

/** Stückzahlen ganz, Stunden und kWp mit einer Stelle. */
function ganz(einheit: string): boolean {
  return !/std|h\b|kwp|m\b|pauschal/i.test(einheit)
}

/**
 * Positionen eines Bausteins: «wahl»-Zeilen mit dem gewählten Artikel (ohne Wahl fallen sie weg), Mengen nach
 * Regel aus der Anlage der Variante (bestehende Module plus die Module dieses Bausteins). `mengen` überschreibt
 * die feste Menge einer Zeile (z. B. Anzahl Module). Gleiche Leistung/Artikel in der Variante → Menge dazuzählen.
 */
export function bausteinPositionen(
  b: Pick<Baustein, 'zeilen'>,
  p: {
    wahl: Record<number, string | undefined>
    mengen: Record<number, number | undefined>
    artikel: readonly Artikel[]
    leistungen: readonly Leistung[]
    bestehend: readonly KalkPosition[]
    variante: string | null
    sprache: 'de' | 'fr'
  },
): KalkPosition[] {
  const neu: KalkPosition[] = []
  const zeilen = b.zeilen.map((z, i) => ({ z, i }))
  // Zuerst Artikel mit fester Menge (Module, Wechselrichter), dann die Zeilen mit Regel.
  const reihenfolge = [...zeilen.filter((x) => x.z.regel === 'fest'), ...zeilen.filter((x) => x.z.regel !== 'fest')]
  for (const { z, i } of reihenfolge) {
    const anlage = anlageDerVariante([...p.bestehend, ...neu], p.variante)
    const regel = { regel: z.regel, faktor: p.mengen[i] ?? z.faktor }
    const pos = position(z, i, p)
    if (!pos) continue
    const menge = mengeAusRegel(regel, anlage, ganz(pos.einheit))
    if (menge <= 0) continue
    neu.push({
      ...pos,
      menge,
      ...(z.regel !== 'fest' ? { regel } : {}),
      ...(p.variante ? { varianten: [p.variante] } : {}),
    })
  }
  return neu
}

function position(
  z: BausteinZeile,
  i: number,
  p: { wahl: Record<number, string | undefined>; artikel: readonly Artikel[]; leistungen: readonly Leistung[]; sprache: 'de' | 'fr' },
): KalkPosition | null {
  if (z.art === 'leistung') {
    const l = p.leistungen.find((x) => x.schluessel === z.leistung)
    return l ? positionAusLeistung(l, 0, p.sprache) : null
  }
  const id = z.art === 'artikel' ? z.artikel_id : p.wahl[i]
  const a = id ? p.artikel.find((x) => x.id === id) : undefined
  return a ? positionAusArtikel(a, 0) : null
}
