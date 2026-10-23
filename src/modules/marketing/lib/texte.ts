import type { Netzwerk, PostSprache, Sprache, SocialPost } from '../types'

/** Höchstlänge je Netzwerk (Zeichen), gleich wie social_freigeben in der Datenbank. */
export const ZEICHEN_MAX: Record<Netzwerk, number> = { instagram: 2200, facebook: 5000, linkedin: 3000 }

/** Sprachen, für die ein Post Text braucht. */
export function sprachenVon(s: PostSprache | null): Sprache[] {
  return s === 'fr' ? ['fr'] : s === 'de_fr' ? ['de', 'fr'] : ['de']
}

/** Text, der tatsächlich gepostet wird (wie postText auf dem Server). */
export function postText(p: Pick<SocialPost, 'sprache' | 'texte'>, n: Netzwerk): string {
  const t = p.texte[n] ?? {}
  const de = t.de?.trim() ?? ''
  const fr = t.fr?.trim() ?? ''
  if (p.sprache === 'fr') return fr
  if (p.sprache === 'de_fr') return de && fr ? `${de}\n\n${fr}` : ''
  return de
}

/** Anzahl Hashtags im Text. */
export const hashtags = (text: string) => (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).length

/** Wörter im Text (ohne Platzhalter-Klammern). */
export const woerter = (text: string) =>
  (text.replace(/[{}]/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length

/** Was vor dem Senden eines Newsletters auffällt (V179 «Prüfung»): Schlüssel für die Übersetzung. */
export function newsletterPruefen(
  texte: Partial<Record<Sprache, { betreff: string; text: string }>>,
  sprachen: readonly Sprache[],
  maxWoerter: number,
): { schluessel: string; sprache: Sprache; wert?: number; schwer: boolean }[] {
  const hinweise: { schluessel: string; sprache: Sprache; wert?: number; schwer: boolean }[] = []
  for (const s of sprachen) {
    const t = texte[s]
    if (!t?.betreff.trim()) hinweise.push({ schluessel: 'betreffFehlt', sprache: s, schwer: true })
    if (!t?.text.trim()) {
      hinweise.push({ schluessel: 'textFehlt', sprache: s, schwer: true })
      continue
    }
    const w = woerter(t.text)
    if (w > maxWoerter) hinweise.push({ schluessel: 'zuLang', sprache: s, wert: w, schwer: false })
    if (!t.text.includes('{Anrede}')) hinweise.push({ schluessel: 'ohneAnrede', sprache: s, schwer: false })
    if (/…|\.\.\./.test(t.text)) hinweise.push({ schluessel: 'platzhalterText', sprache: s, schwer: false })
  }
  return hinweise
}

/** Hinweise zu einem Post nach den Regeln (V233: Instagram 8–12 Hashtags, LinkedIn höchstens 3, ohne Emojis). */
export function postHinweise(p: Pick<SocialPost, 'sprache' | 'texte' | 'netzwerke' | 'bilder'>) {
  const h: { netzwerk: Netzwerk; schluessel: string; wert?: number }[] = []
  for (const n of p.netzwerke) {
    const text = postText(p, n)
    if (!text) {
      h.push({ netzwerk: n, schluessel: 'textFehlt' })
      continue
    }
    if (text.length > ZEICHEN_MAX[n]) h.push({ netzwerk: n, schluessel: 'zuLang', wert: ZEICHEN_MAX[n] })
    const tags = hashtags(text)
    if (n === 'instagram' && (tags < 8 || tags > 12))
      h.push({ netzwerk: n, schluessel: 'hashtagsInstagram', wert: tags })
    if (n === 'linkedin' && tags > 3) h.push({ netzwerk: n, schluessel: 'hashtagsLinkedin', wert: tags })
    if (n === 'linkedin' && /\p{Extended_Pictographic}/u.test(text))
      h.push({ netzwerk: n, schluessel: 'emojisLinkedin' })
    if (n === 'instagram' && p.bilder.length === 0) h.push({ netzwerk: n, schluessel: 'bildFehlt' })
  }
  return h
}

/**
 * i18n-Schlüssel (mit Rückfall) für den Fehler eines Netzwerks: zuerst der Social-eigene Text, dann der allgemeine
 * Integrations-Text, zuletzt «Fehler (code)». Für `t(schluessel, { code })`.
 */
export function postFehlerSchluessel(code: string | undefined): string[] {
  const c = code ?? 'intern'
  return [`marketing.post.fehlerText.${c}`, `integration.fehler.${c}`, 'marketing.post.fehlerCode']
}
