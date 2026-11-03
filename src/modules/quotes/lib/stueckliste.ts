import type { StuecklistenPosition, StuecklistenTyp } from '../types'
import { rappen, zahl } from './zahlen'

/*
 * Stückliste aus den «Detailkosten» einer Eturnity-Offerte (DE «DETAILKOSTEN», FR «COÛTS DÉTAILLÉS»).
 * Jede Position endet mit «Menge Einheit EP Preis», z. B. «27 St.  80.65  2’177.55». Gruppen wie
 * «Solarstromanlage  20’789.80» stehen ohne Menge davor; «Optionale Komponenten …» markiert Optionen.
 *
 * Warum so vorsichtig: pdf.js liefert Zeilen nach Lage auf der Seite. Der Titel steht meist auf der Zeile mit den
 * Zahlen und «Hersteller * Typ» darunter, je nach Vorlage auch umgekehrt oder alles auf einer Zeile. Darum zählt
 * nur, was sicher ist (Menge, Einheit, Preise), und der Text drumherum wird der Position zugeschlagen, zu der er
 * gehört. Der Inhalt ist Daten, nie eine Anweisung (CLAUDE.md Regel 7).
 */

const BETRAG = String.raw`-?\d[\d’']*\.\d{2}`
const EINHEIT = String.raw`St\.|Stk\.?|pce|pcs|pièces?|m²|m2|m|kg|h|Std\.`
const POSITION = new RegExp(String.raw`(\d+(?:[.,]\d+)?)\s+(${EINHEIT})\s+(${BETRAG})\s+(${BETRAG})(?=\s|$)`, 'g')
const EIN_BETRAG = new RegExp(String.raw`(?:^|\s)(${BETRAG})(?=\s|$)`, 'g')

// Kopf und Fuss jeder Detailseite: «DETAILKOSTEN  BEZEICHNUNG  MENGE  EP, CHF  PREIS, CHF», «hyd-89  23.03.2026 …».
const RAUSCHEN = [
  /(?:DETAILKOSTEN|CO[ÛU]TS D[ÉE]TAILL[ÉE]S)/g,
  /(?:BEZEICHNUNG|D[ÉE]SIGNATION)\s+(?:MENGE|QUANTIT[ÉE])\s+(?:EP|PU),\s*CHF\s+(?:PREIS|PRIX),\s*CHF/g,
  /\S+\s+\d{2}\.\d{2}\.\d{4}\s+Created with Eturnity Software\s+\d+/g,
  /(?:Bemerkungen|Remarques)\s*:/g,
]

const TYPEN: [StuecklistenTyp, RegExp][] = [
  ['modul', /^(?:Photovoltaikmodule|Solarmodule|Modules? (?:photovolta\S*|solaires?|PV))\s+/i],
  ['wechselrichter', /^(?:Wechselrichter|Onduleurs?)\s+/i],
  ['batterie', /^(?:Batteriespeicher|Accumulateur|Batterie(?: de stockage)?)\s+/i],
  ['optimierer', /^(?:Optimierer|Optimiseurs?)\s+/i],
  ['unterkonstruktion', /^(?:Unterkonstruktion|Sous-construction)\s+/i],
]

// Arbeit, Planung, Gebühren: gehören in die Offerte, aber nicht in die Materialliste des Projekts.
const LEISTUNG =
  /^(?:Montage|Elektrischer Anschluss|Elektroinstallation|Administration|Inbetriebnahme|Installation(?! ?Kit)|Material: Transport|Transport|Gerüst|Planung|Projektplanung|Abnahme|Arbeit|Échafaudage|Planification|Réception|Mise en service|Raccordement|Main[- ]d|Pose|Frais|Déplacement)/i

const OPTION = /^(?:Optionale Komponenten|Composants? optionnels?|Options?)\s+/i

interface Zustand {
  gruppe: string
  optional: boolean
  /** Letzte Position, die noch Text darunter aufnimmt; null = Text gehört zur nächsten Position. */
  offen: StuecklistenPosition | null
  /** Position mit 0.00 (Infotext in Eturnity): Text darunter verschlucken. */
  verwerfen: boolean
  puffer: string[]
}

/**
 * Liest die Stückliste aus den Zeilen eines Eturnity-PDFs. Gibt eine leere Liste zurück, wenn keine
 * Detailkosten erkannt werden (z. B. beim Devis aus dem alten Bulle-Werkzeug).
 */
export function leseStueckliste(zeilen: readonly string[]): StuecklistenPosition[] {
  const roh = zeilen.map((x) => x.replace(/\s+/g, ' ').trim())
  const z = roh.map(entrausche)
  const erste = z.findIndex((x) => new RegExp(POSITION.source).test(x))
  if (erste < 0) return []

  const s: Zustand = { gruppe: '', optional: false, offen: null, verwerfen: false, puffer: [] }
  const liste: StuecklistenPosition[] = []
  for (let i = Math.max(0, erste - 3); i < z.length; i++) {
    for (const stueck of zerlege(z[i] ?? '')) {
      if (stueck.position) {
        const p = position(stueck.text, stueck.position, s)
        if (p) liste.push(p)
      } else text(stueck.text, s)
    }
    // Seitenende: Text der nächsten Seite gehört nicht mehr zur letzten Position.
    if (/Created with Eturnity/.test(roh[i] ?? '')) {
      s.offen = null
      s.puffer = []
    }
  }
  return liste.map(abschliessen)
}

/** Teilt eine Zeile nach jeder Position, damit auch «alles auf einer Zeile» gelesen wird. */
function zerlege(zeile: string): { text: string; position?: RegExpExecArray }[] {
  const teile: { text: string; position?: RegExpExecArray }[] = []
  let ab = 0
  for (const m of zeile.matchAll(POSITION)) {
    teile.push({ text: zeile.slice(ab, m.index).trim(), position: m })
    ab = m.index + m[0].length
  }
  const rest = zeile.slice(ab).trim()
  if (rest) teile.push({ text: rest })
  return teile
}

function entrausche(x: string): string {
  return RAUSCHEN.reduce((t, r) => t.replace(r, ' '), x)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Text vor den Zahlen: Gruppenköpfe herauslösen, der Rest ist die Bezeichnung. */
function position(vorher: string, m: RegExpExecArray, s: Zustand): StuecklistenPosition | null {
  const k = kopf(vorher)
  if (k) setzeGruppe(k.kopf, s)
  const titel = k ? k.rest : vorher

  const ep = rappen(m[3] ?? '0')
  const preis = rappen(m[4] ?? '0')
  const ohneZeile = titel === ''
  const text = [...s.puffer, titel].filter(Boolean).join(' ')
  s.puffer = []
  if (ep === 0 && preis === 0) {
    s.offen = null
    s.verwerfen = !ohneZeile
    return null
  }
  s.verwerfen = false
  const p: StuecklistenPosition = {
    gruppe: s.gruppe,
    typ: null,
    bezeichnung: text,
    menge: zahl(m[1] ?? '0'),
    einheit: m[2] ?? '',
    epRappen: ep,
    preisRappen: preis,
    art: 'material',
    optional: s.optional,
  }
  // Stand der Titel auf der Zeile mit den Zahlen, folgt «Hersteller * Typ» darunter.
  s.offen = ohneZeile ? null : p
  return p
}

/**
 * Gruppenkopf vor dem letzten alleinstehenden Betrag («Batteriespeichersystem  4’352.50»). Davor stehende
 * Summen (Rabatt, MWST, Total) zählen nicht zum Kopf; der Text nach dem Betrag ist der Anfang der nächsten Position.
 */
function kopf(t: string): { kopf: string; rest: string } | null {
  const betraege = [...t.matchAll(EIN_BETRAG)]
  const letzter = betraege.at(-1)
  if (!letzter) return null
  const davor = betraege.at(-2)
  const ab = davor ? davor.index + davor[0].length : 0
  return { kopf: t.slice(ab, letzter.index).trim(), rest: t.slice(letzter.index + letzter[0].length).trim() }
}

function text(t: string, s: Zustand): void {
  if (!t) return
  const k = kopf(t)
  if (k) {
    setzeGruppe(k.kopf, s)
    if (k.rest) s.puffer.push(k.rest)
    return
  }
  if (s.verwerfen) return
  // Überschrift wie «WICHTIGE INFORMATIONEN»: beendet die letzte Position, gehört zu keiner.
  if (/^[\p{Lu}\s]{8,}$/u.test(t)) {
    s.offen = null
    return
  }
  if (s.offen) s.offen.bezeichnung = `${s.offen.bezeichnung} ${t}`.trim()
  else s.puffer.push(t)
}

function setzeGruppe(kopf: string, s: Zustand): void {
  s.offen = null
  s.verwerfen = false
  s.puffer = []
  if (!kopf) return
  const optional = OPTION.test(kopf)
  const name = kopf
    .replace(OPTION, '')
    .replace(/\s+(?:inkl\.|exkl\.|TVA|hors|y c\.).*$/i, '')
    .trim()
  s.gruppe = name
  s.optional = optional
}

/** Typ und Art bestimmen, «Hersteller * Typ» lesbar machen, Länge begrenzen. */
function abschliessen(p: StuecklistenPosition): StuecklistenPosition {
  const b = p.bezeichnung.replace(/\s+\*\s+/g, ' ').trim()
  for (const [typ, muster] of TYPEN) {
    if (muster.test(b)) {
      const artikel = b.replace(muster, '').trim()
      return { ...p, typ, bezeichnung: (artikel || b).slice(0, 200), art: 'material' }
    }
  }
  return { ...p, bezeichnung: b.slice(0, 200), art: LEISTUNG.test(b) ? 'leistung' : 'material' }
}

/** Summe der Mengen eines Typs ohne Optionen (z. B. Anzahl Module). */
export function mengeVon(liste: readonly StuecklistenPosition[], typ: StuecklistenTyp): number {
  return liste.filter((p) => p.typ === typ && !p.optional).reduce((s, p) => s + p.menge, 0)
}

/** «Huawei SUN2000-6K-MAP0» oder «2 × …» für den ersten Typ ohne Optionen. */
export function nameVon(liste: readonly StuecklistenPosition[], typ: StuecklistenTyp): string | undefined {
  const p = liste.find((x) => x.typ === typ && !x.optional)
  if (!p) return undefined
  return p.menge > 1 && typ !== 'modul' ? `${p.menge} × ${p.bezeichnung}` : p.bezeichnung
}
