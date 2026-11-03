import { PhoneCall, PhoneMissed } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useOffertAenderung, useOffertEinstellungen } from '../hooks/useOfferten'
import { nachfassStand } from '../lib/nachfassen'
import { erfasseNachfassen } from '../services/ablauf'
import type { NachfassErgebnis, Offerte } from '../types'
import { Box } from './Box'

const ErgebnisDialog = lazy(() => import('./ErgebnisDialog'))

/**
 * Nächster Schritt einer versendeten Offerte nach dem Nachfass-Plan: wann, welcher Plan-Schritt, und die zwei
 * häufigsten Ergebnisse mit einem Klick («Erreicht» öffnet das Gespräch, «Nicht erreicht» setzt neu an).
 */
export function NaechsterSchrittBox({ o }: { o: Offerte }) {
  const { t } = useTranslation()
  const plan = useOffertEinstellungen().data?.nachfassPlan ?? []
  const [dialog, setDialog] = useState<NachfassErgebnis | null>(null)
  const nichtErreicht = useOffertAenderung(() => erfasseNachfassen(o.id, 'nicht_erreicht'))
  if (o.status !== 'offeriert') return null
  const s = nachfassStand(o)
  const tag = plan[o.nachfassSchritt]
  const faellig = s && (s.art === 'faellig' || s.art === 'heute')
  return (
    <Box titel={t('offerten.schritt.titel')} {...(faellig ? { className: 'border-accent bg-accent-soft/40' } : {})}>
      <p className="font-medium">
        {o.entscheid === 'vertagt'
          ? t('offerten.schritt.vertagt')
          : tag !== undefined
            ? t('offerten.schritt.planTag', { tag })
            : t('offerten.schritt.anruf')}
      </p>
      <p className="text-muted-foreground text-xs">
        {o.faelligAm
          ? t(faellig ? 'offerten.schritt.faelligSeit' : 'offerten.schritt.faelligAm', {
              datum: formatDatum(o.faelligAm),
            })
          : null}
        {o.nachfassErgebnis && o.nachfassErgebnis !== 'gesendet'
          ? ` · ${t('offerten.schritt.zuletzt', { was: t(`offerten.ergebnis.e_${o.nachfassErgebnis}`) })}`
          : ''}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          onClick={() => {
            setDialog('vergleicht')
          }}
        >
          <PhoneCall />
          {t('offerten.schritt.erreicht')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          laedt={nichtErreicht.isPending}
          onClick={() => {
            nichtErreicht.mutate(undefined, {
              onSuccess: (d) => {
                melde('ok', zweisprachig('offerten.ergebnis.okNaechst', { datum: d ? formatDatum(d) : '' }))
              },
              onError: (f) => {
                meldeFehler(f, 'offerten.ergebnis')
              },
            })
          }}
        >
          <PhoneMissed />
          {t('offerten.schritt.nichtErreicht')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setDialog('spaeter')
          }}
        >
          {t('offerten.ergebnis.e_spaeter')}
        </Button>
      </div>
      <Suspense>
        {dialog && (
          <ErgebnisDialog
            o={o}
            start={dialog}
            onSchliessen={() => {
              setDialog(null)
            }}
          />
        )}
      </Suspense>
    </Box>
  )
}
