import { rundeAuf5Rappen } from '@/lib/format'
import type { Artikel, KalkPosition, Kalkulation, MengenRegel, PreisRegeln, Preisvorlage } from '../types'

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

/**
 * Werte einer Position (V233 pcLine): VK = EK × (1 + Marge), Preis = VK × (1 + Skonto).
 * Leistungen haben einen festen Preis (`preisRappen`), EK ist dort der Kostensatz. Gleich wie `intern.kalk_summe`.
 */
export function zeile(p: KalkPosition) {
  const vk = p.preisRappen ?? p.ekRappen * (1 + p.marge)
  const preis = p.preisRappen ?? vk * (1 + p.skonto)
  return { vk, preis, total: preis * p.menge, ekTotal: p.ekRappen * p.menge, skontoTotal: (preis - vk) * p.menge }
}

/** Gilt die Position in dieser Variante? Ohne Variante oder ohne Einschränkung immer. */
export function inVariante(p: KalkPosition, variante: string | null | undefined): boolean {
  return !variante || !p.varianten || p.varianten.length === 0 || p.varianten.includes(variante)
}

/** Positionen der gewählten Variante. */
export function positionenDerVariante(k: Pick<Kalkulation, 'positionen' | 'variante'>): KalkPosition[] {
  return k.positionen.filter((p) => inVariante(p, k.variante))
}

/**
 * Zahlen einer Kalkulation in Rappen (V233 pcSum). Rabatt 0–100 %, MWST-Satz in Prozent.
 * Mit Varianten zählen nur die Positionen der gewählten Variante.
 */
export function summe(k: Pick<Kalkulation, 'positionen' | 'rabattProzent' | 'variante'>, mwstSatz: number) {
  const positionen = positionenDerVariante(k)
  let ek = 0
  let brutto = 0
  let skonto = 0
  let wp = 0
  let module = 0
  for (const p of positionen) {
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
    positionenDerVariante(k)
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
    if (!a || p.preisRappen !== undefined) return p
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

/** Module und kWp einer Variante (für Mengen-Regeln). */
export function anlageDerVariante(positionen: readonly KalkPosition[], variante: string | null | undefined) {
  let module = 0
  let wp = 0
  for (const p of positionen) {
    if (!p.wp || !inVariante(p, variante)) continue
    module += p.menge
    wp += p.wp * p.menge
  }
  return { module, kwp: wp / 1000 }
}

/** Menge nach Regel: fest, je Modul oder je kWp; Stunden und Mengen auf eine Stelle gerundet, Stück ganz. */
export function mengeAusRegel(r: MengenRegel, anlage: { module: number; kwp: number }, ganz: boolean): number {
  const roh =
    r.regel === 'je_modul' ? anlage.module * r.faktor : r.regel === 'je_kwp' ? anlage.kwp * r.faktor : r.faktor
  return ganz ? Math.ceil(roh - 1e-9) : Math.round(roh * 10) / 10
}

/** «Mengen neu rechnen»: Positionen mit Regel folgen der aktuellen Anlage (Module, kWp) ihrer Variante. */
export function mengenNeu(k: Pick<Kalkulation, 'positionen' | 'varianten'>): [KalkPosition[], number] {
  let n = 0
  const varianten = k.varianten?.length ? k.varianten.map((v) => v.id) : [null]
  const neu = k.positionen.map((p) => {
    if (!p.regel || p.regel.regel === 'fest') return p
    const v = p.varianten?.length ? p.varianten[0] : varianten[0]
    const menge = mengeAusRegel(p.regel, anlageDerVariante(k.positionen, v), p.einheit === 'Stk' || p.einheit === 'Set')
    if (menge === p.menge) return p
    n++
    return { ...p, menge }
  })
  return [neu, n]
}

/** Gründe für eine Freigabe (wie `kalkulation_freigabe_pruefen`): Rabatt, Deckungsbeitrag, Marge einer Position. */
export function freigabeGruende(
  k: Pick<Kalkulation, 'positionen' | 'rabattProzent' | 'variante'>,
  regeln: PreisRegeln | undefined,
  mwstSatz: number,
): ('rabatt' | 'db' | 'marge')[] {
  if (!regeln?.kategorien) return []
  const g: ('rabatt' | 'db' | 'marge')[] = []
  if (k.rabattProzent > (regeln.rabatt_frei_prozent ?? 100)) g.push('rabatt')
  const s = summe(k, mwstSatz)
  if (s.netto > 0 && s.dbProzent < (regeln.mindest_db_prozent ?? 0)) g.push('db')
  const kat = regeln.kategorien
  if (
    positionenDerVariante(k).some(
      (p) => p.artikelId && p.preisRappen === undefined && p.marge < (kat[p.kategorie]?.mindest ?? 0),
    )
  )
    g.push('marge')
  return g
}

/** Geschätzte Förderung (Pronovo EIV) in Rappen aus den Regeln; ohne Regel oder kWp 0. */
export function foerderung(kwp: number, f: PreisRegeln['foerderung']): number {
  if (!f || kwp <= 0) return 0
  const bis = Math.min(kwp, f.bis_kwp)
  const darueber = Math.max(0, kwp - f.bis_kwp)
  return Math.round(f.grund_rappen + bis * f.je_kwp_rappen + darueber * f.je_kwp_darueber_rappen)
}
