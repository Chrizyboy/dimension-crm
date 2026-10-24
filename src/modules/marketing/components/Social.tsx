import { CalendarClock, Plus, Share2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatumZeit } from '@/lib/format'
import { usePosts } from '../hooks/useMarketing'
import { postFehlerSchluessel, postText } from '../lib/texte'
import type { PostStatus, SocialPost } from '../types'
import { PostEditor } from './PostEditor'
import { Verbindungen } from './Verbindungen'

const TON: Record<PostStatus, 'neutral' | 'info' | 'ok' | 'kritisch'> = {
  entwurf: 'neutral',
  geplant: 'info',
  wird_veroeffentlicht: 'info',
  veroeffentlicht: 'ok',
  fehler: 'kritisch',
  erledigt: 'neutral',
}

/** Posts nach Thema gruppiert (V233 «Entwürfe» und «Vergangene»). */
function nachThema(liste: SocialPost[]): [string, SocialPost[]][] {
  const m = new Map<string, SocialPost[]>()
  for (const p of liste) m.set(p.thema ?? '', [...(m.get(p.thema ?? '') ?? []), p])
  return [...m.entries()]
}

/**
 * Social Media (V233, Entscheid 0022): Posts für Instagram, Facebook und LinkedIn entwerfen, freigeben und zur
 * geplanten Zeit direkt veröffentlichen. Oben die Verbindungen, dann Offene (Entwürfe, geplant, Fehler) und Vergangene.
 */
export function Social() {
  const { t } = useTranslation()
  const posts = usePosts()
  const [offen, setOffen] = useState<SocialPost | 'neu' | null>(null)
  if (posts.error) return <Fehlerzustand details={String(posts.error)} onNochmal={() => void posts.refetch()} />
  const alle = posts.data ?? []
  const aktiv = alle.filter((p) => !['veroeffentlicht', 'erledigt'].includes(p.status))
  const vergangen = alle.filter((p) => ['veroeffentlicht', 'erledigt'].includes(p.status))

  const zeile = (p: SocialPost) => (
    <li key={p.id}>
      <button
        type="button"
        onClick={() => {
          setOffen(p)
        }}
        className="hover:bg-muted focus-visible:ring-ring flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left outline-none focus-visible:ring-2"
      >
        <span className="flex flex-wrap items-center gap-2">
          <Badge ton={TON[p.status]}>{t(`marketing.post.status.${p.status}`)}</Badge>
          {p.netzwerke.map((n) => (
            <Badge key={n} ton="neutral">
              {t(`marketing.netzwerk.${n}`)}
            </Badge>
          ))}
          {(p.geplant_am ?? p.veroeffentlicht_am) && (
            <span className="text-muted-foreground zahlen flex items-center gap-1 text-xs">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {formatDatumZeit(p.veroeffentlicht_am ?? p.geplant_am)}
            </span>
          )}
        </span>
        {p.status === 'fehler' &&
          Object.entries(p.ergebnis)
            .filter(([, e]) => !e.ok)
            .map(([n, e]) => (
              <span key={n} className="text-bad text-xs">
                {t(`marketing.netzwerk.${n}`)}: {t(postFehlerSchluessel(e.fehler), { code: e.fehler ?? '' })}
              </span>
            ))}
        <span className="line-clamp-2 text-sm">
          {(p.netzwerke[0] && postText(p, p.netzwerke[0])) || p.idee || t('marketing.post.ohneText')}
        </span>
      </button>
    </li>
  )
  const gruppen = (liste: SocialPost[]) =>
    nachThema(liste).map(([thema, ps]) => (
      <section key={thema} className="flex flex-col gap-1">
        <h3 className="text-muted-foreground px-3 text-xs font-semibold uppercase">
          {thema || t('marketing.post.ohneThema')}
        </h3>
        <ul className="flex flex-col">{ps.map(zeile)}</ul>
      </section>
    ))

  return (
    <div className="flex flex-col gap-4">
      <Verbindungen />
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{t('marketing.post.offene')}</h2>
        <Button
          onClick={() => {
            setOffen('neu')
          }}
        >
          <Plus />
          {t('marketing.post.neu')}
        </Button>
      </div>
      {!posts.data ? (
        <Skelett className="h-48" />
      ) : aktiv.length === 0 ? (
        <Leerzustand icon={Share2} titel={t('marketing.post.leer')} text={t('marketing.post.leerText')} />
      ) : (
        <div className="bg-surface flex flex-col gap-3 rounded-lg border py-2">{gruppen(aktiv)}</div>
      )}
      {vergangen.length > 0 && (
        <>
          <h2 className="font-display text-base font-semibold">{t('marketing.post.vergangene')}</h2>
          <div className="bg-surface flex flex-col gap-3 rounded-lg border py-2">{gruppen(vergangen)}</div>
        </>
      )}
      {offen && (
        <PostEditor
          post={offen === 'neu' ? null : offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
