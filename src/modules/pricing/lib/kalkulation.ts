import { rundeAuf5Rappen } from '@/lib/format'
import type { Artikel, KalkPosition, Kalkulation, Preisvorlage } from '../types'

/** Freie Positionen ohne Artikel (V233 PC_FREI), Name in beiden Sprachen und Einheit. */
export const FREIE_POSITIONEN = [
  { de: 'Montage', fr: 'Montage', einheit: 'Std.' },
  { de: 'Elektroinstallation', fr: 'Installation électrique', einheit: 'Std.' },
  { de: 'Gerüst', fr: 'Échafaudage', einheit: 'pauschal' },
  { de: 'Planung & Bewilligung', fr: 'Planification & autorisation', einheit: 'pauschal' },
  { de: 'Transport & Entsorgung', fr: 'Transport & élimination', einheit: 'pauschal' },
  { de: 'Eigene Position', fr: 'Position libre', einheit: 'Stk' },
] as const

/** Kurze, eindeutige Kennung einer Position (nur für die Oberfläche). */
export function neuerSchluessel(): string {
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Position aus einem Artikel der Preisliste (Marge und Skonto wie dort, sonst 25 % / 1.5 %). */
export function positionAusArtikel(a: Artikel, menge = 1): KalkPosition {
  return {
    key: neuerSchluessel(),
    artikelId: a.id,
    artikelnummer: a.artikelnummer ?? '',
    name: a.name,
    kategorie: a.kategorie,
    gruppe: a.gruppe ?? '',
    wp: a.leistungW,
    einheit: a.einheit,
    menge,
    ekRappen: a.ekRappen ?? 0,
    marge: a.marge ?? 0.25,
    skonto: a.skonto ?? 0.015,
  }
}

/** Werte einer Position (V233 pcLine): VK = EK × (1 + Marge), Preis = VK × (1 + Skonto). */
export function zeile(p: KalkPosition) {
  const vk = p.ekRappen * (1 + p.marge)
  const preis = vk * (1 + p.skonto)
  return { vk, preis, total: preis * p.menge, ekTotal: p.ekRappen * p.menge, skontoTotal: (preis - vk) * p.menge }
}

/** Zahlen einer Kalkulation in Rappen (V233 pcSum). Rabatt 0–100 %, MWST-Satz in Prozent. */
export function summe(k: Pick<Kalkulation, 'positionen' | 'rabattProzent'>, mwstSatz: number) {
  let ek = 0
  let brutto = 0
  let skonto = 0
  let wp = 0
  let module = 0
  for (const p of k.positionen) {
    const z = zeile(p)
    ek += z.ekTotal
    brutto += z.total
    skonto += z.skontoTotal
    if (p.wp) {
      wp += p.wp * p.menge
      module += p.menge
    }
  }
  const rabatt = Math.min(100, Math.max(0, k.rabattProzent)) / 100
  const rabattBetrag = Math.round(brutto * rabatt)
  const netto = Math.round(brutto) - rabattBetrag
  const mwst = Math.round((netto * mwstSatz) / 100)
  const kwp = Math.round(wp / 10) / 100
  const db = netto - Math.round(ek)
  return {
    ek: Math.round(ek),
    brutto: Math.round(brutto),
    skonto: Math.round(skonto),
    rabattBetrag,
    netto,
    db,
    dbProzent: netto ? (db / netto) * 100 : 0,
    mwst,
    total: rundeAuf5Rappen(netto + mwst),
    kwp,
    module,
    proKwp: kwp ? Math.round(netto / kwp) : 0,
  }
}

/** Farbe des Deckungsbeitrags: ab 20 % gut, ab 12 % knapp, darunter kritisch. */
export function dbTon(prozent: number): 'ok' | 'warnung' | 'kritisch' {
  return prozent >= 20 ? 'ok' : prozent >= 12 ? 'warnung' : 'kritisch'
}

/**
 * Werte für «In Offerte übernehmen»: Betrag exkl. MWST (so steht er in den Offerten), kWp, Module und die
 * Namen von Wechselrichtern und Batterien, z. B. «2× SUN2000-10KTL».
 */
export function werteFuerOfferte(k: Kalkulation, mwstSatz: number) {
  const s = summe(k, mwstSatz)
  const namen = (kategorie: string) =>
    k.positionen
      .filter((p) => p.kategorie === kategorie && p.menge)
      .map((p) => `${p.menge > 1 ? `${p.menge}× ` : ''}${p.name}`)
      .join(', ')
  return {
    betrag_rappen: s.netto,
    ...(s.kwp ? { leistung_kwp: s.kwp } : {}),
    ...(s.module ? { anzahl_module: s.module } : {}),
    ...(namen('wechselrichter') ? { wechselrichter: namen('wechselrichter') } : {}),
    ...(namen('batteriespeicher') ? { batterie: namen('batteriespeicher') } : {}),
  }
}

/** Positionen auf die aktuelle Preisliste setzen (V233 pcRefreshPrices); liefert die Zahl der geänderten. */
export function aktualisierePreise(
  positionen: readonly KalkPosition[],
  artikel: readonly Artikel[],
): [KalkPosition[], number] {
  let n = 0
  const neu = positionen.map((p) => {
    const a = p.artikelId ? artikel.find((x) => x.id === p.artikelId) : undefined
    if (!a) return p
    const ek = a.ekRappen ?? 0
    const marge = a.marge ?? p.marge
    const skonto = a.skonto ?? p.skonto
    if (ek === p.ekRappen && marge === p.marge && skonto === p.skonto) return p
    n++
    return { ...p, ekRappen: ek, marge, skonto, wp: a.leistungW, name: a.name }
  })
  return [neu, n]
}

/**
 * Vorlage ins Blatt laden (V233 pcLoadTpl): gleiche Artikel erhöhen die Menge, neue kommen dazu.
 * Liefert die Positionen und wie viele Artikel der Vorlage nicht mehr in der Preisliste sind.
 */
export function mitVorlage(
  positionen: readonly KalkPosition[],
  v: Preisvorlage,
  artikel: readonly Artikel[],
): [KalkPosition[], number] {
  let neu = [...positionen]
  let fehlt = 0
  for (const q of v.positionen) {
    const a = artikel.find((x) => x.id === q.artikelId)
    if (!a) {
      fehlt++
      continue
    }
    const da = neu.find((p) => p.artikelId === a.id)
    neu = da
      ? neu.map((p) => (p === da ? { ...p, menge: p.menge + q.menge } : p))
      : [...neu, positionAusArtikel(a, q.menge)]
  }
  return [neu, fehlt]
}
