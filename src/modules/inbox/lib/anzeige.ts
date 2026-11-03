import type { Ansicht, Art, Mail } from '../types'

/** Farbe einer Marke (Badge-Ton). */
export type Ton = 'neutral' | 'marke' | 'ok' | 'warnung' | 'kritisch' | 'info'

/** Farbe je Art: Anfragen in der Markenfarbe, Störungen rot, Kunden blau, Lieferanten und Ämter grün. */
export const ART_TON: Record<Art, Ton> = {
  anfrage: 'marke',
  stoerung: 'kritisch',
  kunde: 'info',
  rechnung: 'info',
  lieferant: 'ok',
  amt: 'ok',
  monitor: 'neutral',
  sonstiges: 'neutral',
  intern: 'neutral',
  werbung: 'neutral',
  privat: 'neutral',
}

/** Dauer in Minuten lesbar: «45 Min.», «2 h 40», «3 Tage». */
export function dauer(min: number, sprache: 'de' | 'fr' = 'de'): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  if (m < 48 * 60) {
    const h = Math.floor(m / 60)
    const r = m % 60
    return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`
  }
  const t = Math.round(m / (24 * 60))
  return sprache === 'fr' ? `${t} jours` : `${t} Tage`
}

/** Wie eine Frist gerade steht: Ton und Text-Schlüssel mit Werten (i18n unter «posteingang.frist»). */
export interface FristInfo {
  ton: Ton
  schluessel: string
  werte: Record<string, string>
}

const zeit = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
const tag = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })

/**
 * Frist einer Mail für die Anzeige. Offen: überschritten (rot), bald fällig (orange, weniger als eine Stunde) oder
 * bis wann (grün). Erledigt: beantwortet nach (Arbeits-)Zeit, von Hand erledigt oder automatisch (Formular-Lead).
 */
export function fristInfo(m: Mail, sprache: 'de' | 'fr', jetzt = new Date()): FristInfo {
  if (m.stand === 'erledigt') {
    if (m.erledigt_grund === 'beantwortet')
      return m.reaktion_minuten != null
        ? { ton: 'ok', schluessel: 'beantwortetNach', werte: { dauer: dauer(m.reaktion_minuten, sprache) } }
        : { ton: 'ok', schluessel: 'beantwortet', werte: {} }
    return {
      ton: 'neutral',
      schluessel: m.erledigt_grund === 'automatisch' || m.erledigt_grund === 'archiv' ? m.erledigt_grund : 'erledigt',
      werte: {},
    }
  }
  if (m.stand === 'abgelegt') return { ton: 'neutral', schluessel: 'abgelegt', werte: {} }
  if (m.stand === 'neu') return { ton: 'neutral', schluessel: 'neu', werte: {} }
  if (!m.frist_am) return { ton: 'neutral', schluessel: 'info', werte: {} }
  const rest = (Date.parse(m.frist_am) - jetzt.getTime()) / 60_000
  if (rest < 0) {
    const offen = (jetzt.getTime() - Date.parse(m.eingang_am)) / 60_000
    return { ton: 'kritisch', schluessel: 'ueber', werte: { dauer: dauer(offen, sprache) } }
  }
  if (rest < 60) return { ton: 'warnung', schluessel: 'noch', werte: { dauer: dauer(rest, sprache) } }
  const heute = tag(jetzt.toISOString())
  const morgen = tag(new Date(jetzt.getTime() + 86_400_000).toISOString())
  const t = tag(m.frist_am)
  const schluessel = t === heute ? 'heute' : t === morgen ? 'morgen' : 'bis'
  return {
    ton: 'ok',
    schluessel,
    werte: {
      zeit: zeit(m.frist_am),
      datum: new Date(m.frist_am).toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich' }),
    },
  }
}

const OFFEN = new Set(['neu', 'offen', 'info'])

/** Ist die Mail gerade zurückgestellt (kommt später wieder)? */
export const istZurueck = (m: Pick<Mail, 'zurueck_am'>, jetzt = Date.now()) =>
  m.zurueck_am !== null && Date.parse(m.zurueck_am) > jetzt

/** Wer schaut: ich (Person) und ob ich Mails aus info@ verteile. */
export interface Betrachter {
  ich: string | null
  verteile: boolean
}

/**
 * Gehört die Mail in die Ansicht? «meine» = mir zugeteilt, offen und nicht zurückgestellt; «verteilen» = aus einem
 * Team-Postfach und noch nicht weitergegeben; «warten» = alle offenen im Team; «kunde» = wir warten auf meinen Kunden;
 * «zurueck» = von mir zurückgestellt.
 */
export function inAnsicht(m: Mail, a: Ansicht, b: Betrachter, jetzt = Date.now()): boolean {
  const offen = OFFEN.has(m.stand)
  switch (a) {
    case 'meine':
      return offen && m.zustaendig_id === b.ich && !istZurueck(m, jetzt)
    case 'verteilen':
      return b.verteile && offen && m.postfach_person_id === null && m.verteilt_am === null
    case 'warten':
      return m.stand === 'offen' && !istZurueck(m, jetzt)
    case 'kunde':
      return m.stand === 'erledigt' && m.warten_bis !== null && m.zustaendig_id === b.ich
    case 'zurueck':
      return offen && istZurueck(m, jetzt) && m.zustaendig_id === b.ich
    case 'erledigt':
      return m.stand === 'erledigt'
    case 'abgelegt':
      return m.stand === 'abgelegt'
    case 'aeltere':
      return false // eigene Abfrage (ladeAeltere)
  }
}

/** Gruppen der Liste nach Dringlichkeit. */
export const GRUPPEN = ['ueber', 'heute', 'spaeter', 'ohne'] as const
export type Gruppe = (typeof GRUPPEN)[number]

/** In welche Gruppe gehört eine offene Mail: über der Frist, heute fällig, später, ohne Frist (zur Kenntnis). */
export function gruppe(m: Mail, jetzt = new Date()): Gruppe {
  if (m.stand !== 'offen' || !m.frist_am) return 'ohne'
  const f = Date.parse(m.frist_am)
  if (f < jetzt.getTime()) return 'ueber'
  return tag(m.frist_am) === tag(jetzt.toISOString()) ? 'heute' : 'spaeter'
}

/** Ansichten mit Gruppen (die anderen sind nach Datum sortiert). */
export const MIT_GRUPPEN = new Set<Ansicht>(['meine', 'verteilen', 'warten'])

/** Sortierung: Offene nach Frist (die dringendste zuerst), alle anderen neueste zuerst. */
export function sortiere(liste: Mail[]): Mail[] {
  return [...liste].sort((a, b) => {
    const fa = a.stand === 'offen' && a.frist_am ? Date.parse(a.frist_am) : null
    const fb = b.stand === 'offen' && b.frist_am ? Date.parse(b.frist_am) : null
    if (fa !== null && fb !== null) return fa - fb
    if (fa !== null) return -1
    if (fb !== null) return 1
    return Date.parse(b.eingang_am) - Date.parse(a.eingang_am)
  })
}

/** Zahlen oben auf der Seite, aus derselben Liste wie die Ansichten (damit Zahl und Klick-Liste übereinstimmen). */
export function kopfzahlen(liste: Mail[], jetzt = new Date()) {
  const offen = liste.filter((m) => m.stand === 'offen')
  const ueber = offen.filter((m) => m.frist_am && Date.parse(m.frist_am) < jetzt.getTime())
  const heute = tag(jetzt.toISOString())
  const zeiten = liste.flatMap((m) =>
    m.erledigt_grund === 'beantwortet' && m.reaktion_minuten != null && m.erledigt_am && tag(m.erledigt_am) === heute
      ? [m.reaktion_minuten]
      : [],
  )
  return {
    warten: offen.length,
    ueber: ueber.length,
    mitteHeute: mitte(zeiten),
    abgelegt: liste.filter((m) => m.stand === 'abgelegt').length,
  }
}

/** Median einer Zahlenliste; null, wenn leer. */
export function mitte(zahlen: number[]): number | null {
  if (!zahlen.length) return null
  const s = [...zahlen].sort((a, b) => a - b)
  const i = Math.floor(s.length / 2)
  const oben = s[i] ?? 0
  return s.length % 2 ? oben : ((s[i - 1] ?? oben) + oben) / 2
}

/** Absender für die Anzeige: Name, sonst Adresse. */
export const absender = (m: Pick<Mail, 'von_name' | 'von_email'>) => m.von_name || m.von_email || '–'

/** Sprache für eine Antwort: Kunde, sonst Sprache der Mail (Deutsch, wenn unbekannt). */
export const antwortSprache = (m: Mail): 'de' | 'fr' => ((m.kontakt?.sprache ?? m.sprache) === 'fr' ? 'fr' : 'de')
