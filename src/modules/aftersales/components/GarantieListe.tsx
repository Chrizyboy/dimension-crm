import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Komponente } from '../types'

interface Zeile {
  text: string
  bis: string
  von: string | null
}

/** Anteil der Garantiezeit, der schon vorbei ist (0–1), für den Balken. */
function verbraucht(z: Zeile, heute: number): number {
  const ende = new Date(z.bis).getTime()
  const start = z.von ? new Date(z.von).getTime() : ende - 5 * 365 * 86_400_000
  return Math.min(1, Math.max(0, (heute - start) / Math.max(1, ende - start)))
}

/**
 * Garantien einer Anlage mit Balken: Montage-Garantie und jede Komponente mit Garantiedatum, «läuft bis» oder
 * «abgelaufen». Gemeinsam für Garantie-Check im Fall und die Anlage-Akte.
 */
export function GarantieListe({
  anlage: a,
}: {
  anlage: { garantie_bis: string | null; ibn_am: string | null; komponenten: Partial<Komponente>[] } | null | undefined
}) {
  const { t } = useTranslation()
  const art = useAuswahl('komponente')
  // Einmal pro Anzeige festhalten, damit der Balken beim Neuzeichnen nicht springt.
  const [heute] = useState(() => Date.now())
  const zeilen: Zeile[] = [
    ...(a?.garantie_bis ? [{ text: t('service.garantieCheck.montage'), bis: a.garantie_bis, von: a.ibn_am }] : []),
    ...(a?.komponenten ?? [])
      .filter((k) => k.garantie_bis)
      .map((k) => ({
        text: [art.text(k.art ?? 'pv'), k.hersteller].filter(Boolean).join(' · '),
        bis: k.garantie_bis ?? '',
        von: a?.ibn_am ?? null,
      })),
  ]
  return (
    <>
      {zeilen.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t('service.garantieCheck.keine')}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {zeilen.map((z, i) => {
            const laeuft = new Date(z.bis).getTime() >= heute
            const anteil = verbraucht(z, heute)
            return (
              <li key={`${z.text}-${String(i)}`} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">{z.text}</span>
                  <Badge ton={laeuft ? (anteil > 0.9 ? 'warnung' : 'ok') : 'kritisch'}>
                    {laeuft
                      ? t('service.garantieCheck.bis', { datum: formatDatum(z.bis) })
                      : t('service.garantieCheck.abgelaufen', { datum: formatDatum(z.bis) })}
                  </Badge>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden="true">
                  <div
                    className={cn('h-full rounded-full', laeuft ? (anteil > 0.9 ? 'bg-warn' : 'bg-ok') : 'bg-bad')}
                    style={{ width: `${String(Math.round(anteil * 100))}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
