// Reine Textregeln für Social Media (ohne Netz, darum auch in Node getestet): welcher Text gepostet wird und wie
// LinkedIn ihn braucht. Gleiche Regel wie intern.social_text in der Datenbank (Freigabe prüft denselben Text).

/** Netzwerke, auf die das CRM postet. */
export type Netzwerk = 'instagram' | 'facebook' | 'linkedin'

/** Was das CRM von einem Post zum Veröffentlichen braucht. */
export interface PostDaten {
  id: string
  netzwerke: Netzwerk[]
  sprache: string | null
  texte: Partial<Record<Netzwerk, { de?: string; fr?: string }>>
  bilder: string[]
  ergebnis: Partial<Record<Netzwerk, { ok?: boolean }>>
}

/** Text für ein Netzwerk: deutsch, französisch oder beide untereinander (Sprache «de_fr»). */
export function postText(p: Pick<PostDaten, 'sprache' | 'texte'>, n: Netzwerk): string {
  const t = p.texte[n] ?? {}
  const de = t.de?.trim() ?? ''
  const fr = t.fr?.trim() ?? ''
  if (p.sprache === 'fr') return fr
  if (p.sprache === 'de_fr') return de && fr ? `${de}\n\n${fr}` : ''
  return de
}

/**
 * LinkedIn liest den Text als «little text»: Sonderzeichen müssen mit \ maskiert werden, sonst wird der Post
 * abgelehnt oder abgeschnitten. Hashtags (#Wort) werden zu echten LinkedIn-Hashtags.
 */
export function linkedinText(text: string): string {
  const teile = text.split(/(#[\p{L}\p{N}_]+)/u)
  return teile
    .map((t, i) =>
      i % 2 === 1
        ? `{hashtag|\\#|${t.slice(1).replace(/_/g, '\\_')}}`
        : t.replace(/[\\|{}@[\]()<>#*_~]/g, (z) => `\\${z}`),
    )
    .join('')
}
