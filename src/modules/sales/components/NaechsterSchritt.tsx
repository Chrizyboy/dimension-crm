import { AlarmClock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useJetzt } from '../hooks/useJetzt'
import { useAussendienst, useVerkaufEinstellung } from '../hooks/useVerkauf'
import { arbeitsminuten } from '../lib/arbeitszeit'
import { VERKAUF_STANDARD } from '../lib/einstellung'
import type { Geschaeft } from '../types'
import { Box } from './LeadBoxen'

/** Was als Nächstes zu tun ist, mit einem Knopf dafür (Kontakt erfassen oder Stand wechseln). */
export function NaechsterSchritt({
  g,
  onKontakt,
  onStand,
}: {
  g: Geschaeft
  onKontakt: () => void
  onStand: (ziel: string) => void
}) {
  const { t } = useTranslation()
  const e = useVerkaufEinstellung().data ?? VERKAUF_STANDARD
  const personen = useAussendienst()
  const jetzt = useJetzt()

  const datum = (iso: string | null) => (iso ? formatDatum(iso) : '–')
  let text: string
  let knopf: { text: string; aktion: () => void } | null = null
  let ton: 'kritisch' | 'warnung' | null = null

  switch (g.stand) {
    case 'lead_neu': {
      if (g.erstkontaktAm || g.uebernommen || !g.eingangZeit) {
        text = t('verkauf.naechster.anrufen')
      } else {
        const min = arbeitsminuten(new Date(g.eingangZeit), jetzt, e)
        text = t('verkauf.naechster.anrufenSeit', { count: min })
        ton = min >= e.eskalation_minuten ? 'kritisch' : min >= e.erstkontakt_minuten ? 'warnung' : null
      }
      knopf = { text: t('verkauf.zutun.ergebnis'), aktion: onKontakt }
      break
    }
    case 'lead_offen':
    case 'lead_spaeter':
      text = g.wiedervorlageAm
        ? t('verkauf.naechster.rueckruf', { datum: datum(g.wiedervorlageAm) })
        : t('verkauf.naechster.termin')
      knopf = {
        text: t('verkauf.akte.terminVereinbaren'),
        aktion: () => {
          onStand('termin')
        },
      }
      break
    case 'termin':
      text = t('verkauf.naechster.besuch', {
        datum: datum(g.terminAm),
        person: personen.data?.find((p) => p.id === g.terminPersonId)?.name ?? '–',
      })
      break
    case 'nach_termin':
      text = t('verkauf.naechster.nachTermin')
      knopf = {
        text: t('verkauf.naechster.offerteBestellen'),
        aktion: () => {
          onStand('offerte')
        },
      }
      ton = 'warnung'
      break
    case 'offerte':
    case 'pruefung':
      text = t('verkauf.naechster.offerteInArbeit')
      break
    case 'offeriert':
    case 'nachfassen':
      text = t('verkauf.naechster.nachfassen', { datum: datum(g.nachfassenAm), tage: e.nachfassen_tage.join(', ') })
      knopf = { text: t('verkauf.zutun.ergebnis'), aktion: onKontakt }
      break
    case 'vertagt':
      text = t('verkauf.naechster.vertagt', { grund: g.vertagtGrund ?? '–' })
      break
    case 'kein':
    case 'verloren':
      text = g.wiedervorlageAm
        ? t('verkauf.naechster.wiedervorlage', { datum: datum(g.wiedervorlageAm) })
        : t('verkauf.naechster.aus', { grund: g.verlustgrund ?? '–' })
      break
    default:
      text = t('verkauf.naechster.gewonnen')
  }

  return (
    <Box titel={t('verkauf.naechster.titel')}>
      <p
        className={cn(
          'flex items-start gap-1.5',
          ton === 'kritisch' && 'text-bad font-medium',
          ton === 'warnung' && 'text-warn font-medium',
        )}
      >
        {ton && <AlarmClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
        {text}
      </p>
      {knopf && g.verkaufschanceId && (
        <Button size="sm" className="self-start" onClick={knopf.aktion}>
          {knopf.text}
        </Button>
      )}
    </Box>
  )
}
