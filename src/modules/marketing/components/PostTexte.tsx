import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { postHinweise, postText, sprachenVon, ZEICHEN_MAX } from '../lib/texte'
import type { MarketingVorlagen, Netzwerk, SocialPost, Sprache } from '../types'

/**
 * Texte je Netzwerk und Sprache, mit Zeichenzähler (Instagram 2200) und Hinweisen nach den Regeln aus den
 * Vorlagen (Hashtags, Emojis, Bild). Texte mit KI kommen mit dem Assistenten (Phase 13).
 */
export function PostTexte({
  post,
  regeln,
  fest,
  onTexte,
}: {
  post: Pick<SocialPost, 'netzwerke' | 'sprache' | 'texte' | 'bilder'>
  regeln: MarketingVorlagen['social']['regeln']
  fest: boolean
  onTexte: (t: SocialPost['texte']) => void
}) {
  const { t } = useTranslation()
  const hinweise = postHinweise(post)
  const setze = (n: Netzwerk, s: Sprache, wert: string) => {
    onTexte({ ...post.texte, [n]: { ...post.texte[n], [s]: wert } })
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Sparkles className="size-3.5" aria-hidden="true" />
        {t('marketing.kiSpaeter')}
      </p>
      {post.netzwerke.map((n) => {
        const laenge = postText(post, n).length
        return (
          <section key={n} className="flex flex-col gap-2" aria-label={t(`marketing.netzwerk.${n}`)}>
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold">{t(`marketing.netzwerk.${n}`)}</h4>
              <span className={`zahlen text-xs ${laenge > ZEICHEN_MAX[n] ? 'text-bad' : 'text-muted-foreground'}`}>
                {t('marketing.post.zeichen', { anzahl: laenge, max: ZEICHEN_MAX[n] })}
              </span>
            </div>
            {regeln[n] && <p className="text-muted-foreground text-xs">{regeln[n]}</p>}
            {sprachenVon(post.sprache).map((s) => (
              <Feld key={s} id={`text-${n}-${s}`} label={t(`marketing.sprache.${s}`)}>
                <Textarea
                  id={`text-${n}-${s}`}
                  rows={5}
                  readOnly={fest}
                  value={post.texte[n]?.[s] ?? ''}
                  onChange={(e) => {
                    setze(n, s, e.target.value)
                  }}
                />
              </Feld>
            ))}
            {hinweise
              .filter((h) => h.netzwerk === n)
              .map((h) => (
                <p key={h.schluessel} className="text-warn text-xs">
                  {t(`marketing.post.hinweis.${h.schluessel}`, { wert: h.wert })}
                </p>
              ))}
          </section>
        )
      })}
    </div>
  )
}
