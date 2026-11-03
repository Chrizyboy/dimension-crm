import { CalendarClock, Hand, Lightbulb, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatumZeit } from '@/lib/format'
import { usePosts } from '../hooks/useMarketing'
import { postFehlerSchluessel, postText } from '../lib/texte'
import type { PostStatus, SocialPost } from '../types'
import { PostEditor } from './PostEditor'
import { Verbindungen } from './Verbindungen'

/** Spalten des Boards; «fehler» steht bei den Entwürfen, «wird veröffentlicht» bei den geplanten. */
const SPALTEN: { id: string; status: PostStatus[] }[] = [
  { id: 'ideen', status: ['idee'] },
  { id: 'entwurf', status: ['entwurf', 'fehler'] },
  { id: 'freigabe', status: ['zur_freigabe'] },
  { id: 'geplant', status: ['geplant', 'wird_veroeffentlicht'] },
  { id: 'veroeffentlicht', status: ['veroeffentlicht'] },
]
const TAGE_VEROEFFENTLICHT = 45

/** Eine Karte im Board: Netzwerke, Zeit, «von Hand», Fehler und der Anfang des Texts. */
function PostKarte({ p, onOeffnen }: { p: SocialPost; onOeffnen: () => void }) {
  const { t } = useTranslation()
  const zeit = p.veroeffentlicht_am ?? p.geplant_am
  return (
    <li>
      <button
        type="button"
        onClick={onOeffnen}
        className="bg-surface hover:border-border-strong focus-visible:ring-ring flex w-full flex-col gap-1.5 rounded-md border p-2.5 text-left shadow-xs outline-none focus-visible:ring-2"
      >
        <span className="text-sm font-medium">{p.thema || t('marketing.post.ohneThema')}</span>
        <span className="flex flex-wrap items-center gap-1">
          {p.netzwerke.map((n) => (
            <Badge key={n} ton="neutral">
              {t(`marketing.netzwerk.${n}`)}
            </Badge>
          ))}
          {p.details.von_hand && p.status === 'geplant' && (
            <Badge ton="warnung">
              <Hand className="size-3" aria-hidden="true" />
              {t('werbung.social.vonHand')}
            </Badge>
          )}
        </span>
        {zeit && (
          <span className="text-muted-foreground zahlen flex items-center gap-1 text-xs">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {formatDatumZeit(zeit)}
          </span>
        )}
        {p.status === 'fehler' &&
          Object.entries(p.ergebnis)
            .filter(([, e]) => !e.ok)
            .map(([n, e]) => (
              <span key={n} className="text-bad text-xs">
                {t(`marketing.netzwerk.${n}`)}: {t(postFehlerSchluessel(e.fehler), { code: e.fehler ?? '' })}
              </span>
            ))}
        <span className="text-muted-foreground line-clamp-2 text-xs">
          {(p.netzwerke[0] && postText(p, p.netzwerke[0])) || p.idee || t('marketing.post.ohneText')}
        </span>
      </button>
    </li>
  )
}

/**
 * Social Media als Board (Entscheid 0055): Ideen → Entwurf → Zur Freigabe → Geplant → Veröffentlicht. Vorbereiten
 * darf jede Person, freigeben die Administration. Ohne Verbindung zu Meta/LinkedIn kommt zur geplanten Zeit die
 * Glocke «Jetzt posten» und man trägt danach die Links ein («von Hand»).
 */
export function Social() {
  const { t } = useTranslation()
  const posts = usePosts()
  const [offen, setOffen] = useState<SocialPost | Partial<SocialPost> | null>(null)
  const [grenze] = useState(() => Date.now() - TAGE_VEROEFFENTLICHT * 86_400_000)
  if (posts.error) return <Fehlerzustand details={String(posts.error)} onNochmal={() => void posts.refetch()} />
  const alle = (posts.data ?? []).filter(
    (p) => p.status !== 'veroeffentlicht' || Date.parse(p.veroeffentlicht_am ?? p.erstellt_am) > grenze,
  )
  const zeit = (p: SocialPost) => p.veroeffentlicht_am ?? p.geplant_am ?? p.erstellt_am

  return (
    <div className="flex flex-col gap-4">
      <Verbindungen />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{t('werbung.social.board')}</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setOffen({ status: 'idee' })
            }}
          >
            <Lightbulb />
            {t('werbung.social.idee')}
          </Button>
          <Button
            onClick={() => {
              setOffen({})
            }}
          >
            <Plus />
            {t('marketing.post.neu')}
          </Button>
        </div>
      </div>
      {!posts.data ? (
        <Skelett className="h-64" />
      ) : (
        <div className="wischzeile grid auto-cols-[minmax(14rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 lg:grid-flow-row lg:grid-cols-5">
          {SPALTEN.map((s) => {
            const liste = alle
              .filter((p) => s.status.includes(p.status))
              .sort((a, b) =>
                s.id === 'veroeffentlicht' ? zeit(b).localeCompare(zeit(a)) : zeit(a).localeCompare(zeit(b)),
              )
            return (
              <section
                key={s.id}
                className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-2"
                aria-label={t(`werbung.social.spalte.${s.id}`)}
              >
                <h3 className="flex items-center justify-between px-1 text-xs font-semibold uppercase">
                  {t(`werbung.social.spalte.${s.id}`)}
                  <span className="text-muted-foreground zahlen">{liste.length}</span>
                </h3>
                {liste.length === 0 ? (
                  <p className="text-muted-foreground px-1 text-xs">{t('werbung.social.spalteLeer')}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {liste.map((p) => (
                      <PostKarte
                        key={p.id}
                        p={p}
                        onOeffnen={() => {
                          setOffen(p)
                        }}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
      {offen && (
        <PostEditor
          post={'id' in offen && offen.id ? (offen as SocialPost) : null}
          vorlage={offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
