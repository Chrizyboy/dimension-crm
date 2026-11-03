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

/** Sprache eines Kontos: Dimension Solaire hat bei Instagram und LinkedIn je ein deutsches und ein französisches. */
export type KontoSprache = 'de' | 'fr'

/** Welches Konto (Seiten-ID bzw. Organisation) je Netzwerk für Deutsch und Französisch gilt. */
export type Zuordnung = Partial<Record<Netzwerk, Partial<Record<KontoSprache, string>>>>

/** Ein Ziel beim Posten: Konto, Text und unter welchem Teil das Ergebnis steht (null = nur ein Konto). */
export interface PostZiel {
  konto: string
  text: string
  teil: KontoSprache | null
}

/**
 * Wohin ein Post auf einem Netzwerk geht. Deutsch nur ans deutsche Konto, Französisch nur ans französische.
 * «DE + FR» mit zwei Konten: jedes Konto bekommt den Text in seiner Sprache; mit nur einem Konto beide Texte
 * untereinander (wie bisher). Fehlt eine Zuordnung, gilt das erste Konto (`erstes`) bzw. das deutsche.
 */
export function postZiele(
  p: Pick<PostDaten, 'sprache' | 'texte'>,
  n: Netzwerk,
  zuordnung: Zuordnung,
  erstes: string | null,
): PostZiel[] {
  const de = zuordnung[n]?.de ?? erstes
  const fr = zuordnung[n]?.fr ?? de
  if (!de || !fr) return []
  if (p.sprache === 'fr') return [{ konto: fr, text: postText(p, n), teil: null }]
  if (p.sprache === 'de_fr' && de !== fr) {
    return [
      { konto: de, text: postText({ ...p, sprache: 'de' }, n), teil: 'de' },
      { konto: fr, text: postText({ ...p, sprache: 'fr' }, n), teil: 'fr' },
    ]
  }
  return [{ konto: de, text: postText(p, n), teil: null }]
}

/**
 * Vorschlag, welches Konto deutsch und welches französisch ist, nach dem Namen («GmbH», «Muri», «de» bzw.
 * «Sàrl», «Bulle», «fr»). Die Administration kann es danach in Marketing › Verbindungen ändern.
 */
export function sprachVorschlag(konten: { id: string; name: string }[]): Partial<Record<KontoSprache, string>> {
  const finde = (muster: RegExp) => konten.find((k) => muster.test(k.name))?.id
  const fr = finde(/s[àa]rl|bulle|fran[cç]|(^|[\s._-])fr($|[\s._-])/i)
  const de = finde(/gmbh|muri|deutsch|(^|[\s._-])(de|ch-de)($|[\s._-])/i) ?? konten.find((k) => k.id !== fr)?.id
  const erstes = konten[0]?.id
  if (!erstes) return {}
  return { de: de ?? fr ?? erstes, fr: fr ?? de ?? erstes }
}
