import { Pencil, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useZeiten } from '../hooks/useZeit'
import { minuten, plusTage, stundenText, zuerich } from '../lib/zeit'
import type { Posten, Zeit } from '../types'

/**
 * Gestempelte Zeiten der Woche mit Ziel (Posten oder Projekt) und Stand. Bearbeiten geht, bis das Büro sie
 * geprüft hat; danach ändert sie nur noch, wer prüfen darf (die Datenbank hält das ein).
 */
export function ZeitenListe({
  personId,
  montag,
  posten,
  onBearbeiten,
}: {
  personId: string
  montag: string
  posten: readonly Posten[]
  onBearbeiten: (z: Zeit) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const zeiten = useZeiten(personId, montag, plusTage(montag, 6))
  const ziel = (z: Zeit) =>
    z.intern
      ? (posten.find((p) => p.schluessel === z.intern)?.[sprache] ?? z.intern)
      : z.projekte?.nummer
        ? t('zeit.liste.projekt', { nummer: z.projekte.nummer })
        : t('zeit.liste.service')

  if (zeiten.error) return <Fehlerzustand details={String(zeiten.error)} onNochmal={() => void zeiten.refetch()} />
  if (!zeiten.data) return <Skelett className="h-32" />
  if (zeiten.data.length === 0)
    return <Leerzustand icon={Timer} titel={t('zeit.liste.leer')} text={t('zeit.liste.leerText')} />

  return (
    <section aria-labelledby="zeit-liste" className="flex flex-col gap-2">
      <h3 id="zeit-liste" className="text-sm font-semibold">
        {t('zeit.liste.titel')}
      </h3>
      <ul className="divide-y rounded-lg border">
        {zeiten.data.map((z) => {
          const von = zuerich(z.start)
          const fest = Boolean(z.freigegeben_am || z.exportiert_am)
          return (
            <li key={z.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="zahlen w-24 whitespace-nowrap">{formatDatum(von.datum)}</span>
              <span className="zahlen whitespace-nowrap">
                {von.zeit}–{z.stopp ? zuerich(z.stopp).zeit : '…'}
              </span>
              <span className="text-muted-foreground min-w-0 flex-1 truncate">
                {ziel(z)}
                {z.art === 'reise' ? ` · ${t('zeit.liste.reise')}` : ''}
                {z.pause_min ? ` · ${t('zeit.liste.pause', { min: z.pause_min })}` : ''}
              </span>
              <span className="zahlen font-medium">{stundenText(minuten(z.start, z.stopp, z.pause_min) / 60)}</span>
              {!z.stopp ? (
                <Badge ton="info">{t('zeit.liste.laeuft')}</Badge>
              ) : fest ? (
                <Badge ton="ok">{t('zeit.liste.geprueft')}</Badge>
              ) : null}
              {z.stopp && !fest && z.intern && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t('zeit.liste.bearbeiten')}
                  onClick={() => {
                    onBearbeiten(z)
                  }}
                >
                  <Pencil />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
