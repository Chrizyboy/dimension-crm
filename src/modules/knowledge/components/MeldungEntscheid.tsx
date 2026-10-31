import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { formatDatumZeit } from '@/lib/format'
import { useAktion } from '../hooks/useHandbuch'
import { wartetAufEntscheid } from '../lib/handbuch'
import { entscheiden } from '../services/meldungen'
import type { Einschaetzung, Meldung } from '../types'

const ZEILEN = [
  'was',
  'ursache',
  'auswirkung',
  'loesung',
  'aufwand',
  'risiko',
] as const satisfies readonly (keyof Einschaetzung)[]

/**
 * Einschätzung einer Meldung und der Entscheid «Erledige es» / «Nicht» (nur Administration). Die Knöpfe sieht nur,
 * wer entscheidet; erst nach dem Entscheid wird etwas geändert, und die meldende Person bekommt danach eine Mail.
 */
export function MeldungEntscheid({ meldung: m, ichEntscheide }: { meldung: Meldung; ichEntscheide: boolean }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [notiz, setNotiz] = useState('')
  const e = m.einschaetzung
  if (!e) {
    return m.status === 'neu' ? (
      <p className="text-muted-foreground border-t pt-3 text-sm">{t('handbuch.meldungen.wirdGeprueft')}</p>
    ) : null
  }
  const senden = (entscheid: 'erledigen' | 'nicht') =>
    void aus(
      () => entscheiden(m.id, entscheid, notiz),
      entscheid === 'erledigen'
        ? { de: 'Wird erledigt', fr: 'Sera réglé' }
        : { de: 'Wird nicht umgesetzt', fr: 'Ne sera pas réalisé' },
    )

  return (
    <section
      className="bg-muted/60 flex flex-col gap-2 rounded-md border p-3"
      aria-label={t('handbuch.meldungen.einschaetzung')}
    >
      <p className="text-sm font-semibold">
        {t('handbuch.meldungen.einschaetzung')}: {e.kurz}
      </p>
      <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
        {ZEILEN.filter((z) => e[z]).map((z) => (
          <div key={z} className="contents">
            <dt className="text-muted-foreground font-medium">{t(`handbuch.meldungen.einschaetzungZeile.${z}`)}</dt>
            <dd className="whitespace-pre-line">{e[z]}</dd>
          </div>
        ))}
        <dt className="text-muted-foreground font-medium">{t('handbuch.meldungen.einschaetzungZeile.empfehlung')}</dt>
        <dd className="font-medium">{t(`handbuch.meldungen.empfehlung.${e.empfehlung}`)}</dd>
      </dl>
      {wartetAufEntscheid(m) && ichEntscheide && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <Textarea
            aria-label={t('handbuch.meldungen.notiz')}
            placeholder={t('handbuch.meldungen.notiz')}
            rows={2}
            value={notiz}
            onChange={(x) => {
              setNotiz(x.target.value)
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              laedt={laeuft}
              onClick={() => {
                senden('erledigen')
              }}
            >
              <Check />
              {t('handbuch.meldungen.erledigeEs')}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              disabled={laeuft}
              onClick={() => {
                senden('nicht')
              }}
            >
              <X />
              {t('handbuch.meldungen.nicht')}
            </Button>
          </div>
        </div>
      )}
      {wartetAufEntscheid(m) && !ichEntscheide && (
        <p className="text-muted-foreground text-sm">{t('handbuch.meldungen.wartetAufAndere')}</p>
      )}
      {m.entscheid && m.entschieden_am && (
        <p className="text-sm">
          <span className="font-medium">{t(`handbuch.meldungen.entschieden.${m.entscheid}`)}</span>
          {' · '}
          {formatDatumZeit(m.entschieden_am)}
          {m.entscheid_notiz && <> · «{m.entscheid_notiz}»</>}
          {m.umgesetzt_in && <> · {t('handbuch.meldungen.umgesetztIn', { version: m.umgesetzt_in })}</>}
        </p>
      )}
    </section>
  )
}
