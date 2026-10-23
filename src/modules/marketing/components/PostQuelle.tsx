import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { useReferenzanlagen } from '../hooks/useMarketing'
import { anlageText } from '../lib/anlage'
import type { SocialPost } from '../types'

const QUELLEN = ['eigen', 'anlage', 'tipp'] as const

/**
 * Woher die Idee kommt (V233): eigenes Thema, verbaute Anlage (nur Gemeinde, Leistung, Komponenten, Datum, nie
 * der Name) oder Tipp. Bei einer Anlage wird die Idee daraus vorbefüllt.
 */
export function PostQuelle({
  details,
  fest,
  sprache,
  onWahl,
}: {
  details: SocialPost['details']
  fest: boolean
  sprache: 'de' | 'fr'
  onWahl: (details: SocialPost['details'], idee?: string) => void
}) {
  const { t } = useTranslation()
  const quelle = details.quelle ?? 'eigen'
  const anlagen = useReferenzanlagen(quelle === 'anlage')
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Feld id="post-quelle" label={t('marketing.post.quelle')}>
        <Auswahl
          id="post-quelle"
          value={quelle}
          disabled={fest}
          onValueChange={(q) => {
            onWahl({ ...details, quelle: q as (typeof QUELLEN)[number] })
          }}
          optionen={QUELLEN.map((q) => ({ wert: q, text: t(`marketing.post.quelleWert.${q}`) }))}
        />
      </Feld>
      {quelle === 'anlage' && (
        <Feld id="post-anlage" label={t('marketing.post.anlage')}>
          <Auswahl
            id="post-anlage"
            value={details.anlage_id ?? ''}
            disabled={fest || !anlagen.data}
            platzhalter={t('marketing.post.anlageWaehlen')}
            onValueChange={(id) => {
              const a = anlagen.data?.find((x) => x.id === id)
              onWahl({ ...details, anlage_id: id }, a ? anlageText(a, sprache) : undefined)
            }}
            optionen={(anlagen.data ?? []).map((a) => ({ wert: a.id, text: anlageText(a, sprache) }))}
          />
        </Feld>
      )}
    </div>
  )
}
