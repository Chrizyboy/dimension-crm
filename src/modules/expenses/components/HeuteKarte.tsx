import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import type { Ansicht } from '../types'
import { useSpesen } from '../hooks/useSpesen'
import { filtern, summe } from '../lib/spesen'

/**
 * Spesen für die Startseite (V233 «Mein Tag»: Spesen-Karte): Rückfragen zu den eigenen Spesen zuerst, dann die
 * eigenen offenen; für die Buchhaltung dazu, was zu prüfen und was auszuzahlen ist.
 */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const buchhaltung = hatRecht(ich, 'finanzen')
  const eigene = useSpesen(ich?.id ?? null, Boolean(ich)).data ?? []
  const alle = useSpesen(null, buchhaltung).data ?? []
  const rueckfragen = eigene.filter((s) => s.status === 'rueckfrage')
  const offen = filtern(eigene, 'offen').filter((s) => s.status !== 'rueckfrage')
  const pruefen = alle.filter((s) => s.status === 'eingereicht')
  const zahlen = alle.filter((s) => s.status === 'geprueft' && s.bezahlt_mit === 'eigen')
  const zeilen: {
    schluessel: string
    ansicht: Ansicht
    text: string
    betrag: number
    ton: 'warnung' | 'info' | 'ok'
  }[] = [
    ...(rueckfragen.length
      ? [
          {
            schluessel: 'rueckfrage',
            ansicht: 'meine' as const,
            text: t('spesen.heute.rueckfrage', { count: rueckfragen.length }),
            betrag: summe(rueckfragen),
            ton: 'warnung' as const,
          },
        ]
      : []),
    ...(offen.length
      ? [
          {
            schluessel: 'meine',
            ansicht: 'meine' as const,
            text: t('spesen.heute.meine', { count: offen.length }),
            betrag: summe(offen),
            ton: 'info' as const,
          },
        ]
      : []),
    ...(pruefen.length
      ? [
          {
            schluessel: 'pruefen',
            ansicht: 'pruefen' as const,
            text: t('spesen.heute.pruefen', { count: pruefen.length }),
            betrag: summe(pruefen),
            ton: 'warnung' as const,
          },
        ]
      : []),
    ...(zahlen.length
      ? [
          {
            schluessel: 'zahlen',
            ansicht: 'auszahlen' as const,
            text: t('spesen.heute.alle', { count: zahlen.length }),
            betrag: summe(zahlen),
            ton: 'ok' as const,
          },
        ]
      : []),
  ]

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('spesen.titel')}</KarteTitel>
        <Link to="/expenses" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('spesen.heute.oeffnen')}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {zeilen.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('spesen.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {zeilen.map((z) => (
            <li key={z.schluessel}>
              <Link
                to="/expenses"
                search={z.ansicht === 'meine' ? {} : { ansicht: z.ansicht }}
                className="hover:bg-surface-2 flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <span>{z.text}</span>
                <Badge ton={z.ton}>{formatChf(z.betrag, { mitWaehrung: true })}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
