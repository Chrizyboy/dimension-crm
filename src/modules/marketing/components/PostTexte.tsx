import { useTranslation } from 'react-i18next'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { rufeKi } from '@/services/ki'
import { postHinweise, postText, sprachenVon, ZEICHEN_MAX } from '../lib/texte'
import type { MarketingVorlagen, Netzwerk, SocialPost, Sprache } from '../types'
import { KiWunschZeile } from '@/components/shared/ki/KiWunschZeile'

/**
 * Texte je Netzwerk und Sprache, mit Zeichenzähler (Instagram 2200) und Hinweisen nach den Regeln aus den
 * Vorlagen (Hashtags, Emojis, Bild). «Mit KI schreiben» (V233 smWrite) füllt alle Netzwerke und Sprachen.
 */
export function PostTexte({
  post,
  regeln,
  fest,
  onTexte,
}: {
  post: Pick<SocialPost, 'netzwerke' | 'sprache' | 'texte' | 'bilder' | 'thema' | 'idee'>
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
      <KiWunschZeile
        fest={fest}
        hatText={post.netzwerke.some((n) => Object.values(post.texte[n] ?? {}).some(Boolean))}
        onSchreiben={async (wunsch) => {
          const bisher = post.netzwerke.some((n) => Object.values(post.texte[n] ?? {}).some(Boolean))
            ? post.texte
            : null
          const r = await rufeKi<{ texte: SocialPost['texte'] }>('social', {
            netzwerke: post.netzwerke,
            sprache: post.sprache ?? 'de',
            thema: [post.thema, post.idee].filter(Boolean).join('\n') || wunsch,
            wunsch,
            bisher,
          })
          onTexte({ ...post.texte, ...r.texte })
        }}
      />
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
