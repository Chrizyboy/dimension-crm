import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { fallSpeichern } from '../services/service'
import type { Akte, ServiceFall } from '../types'
import { Box } from './Box'

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
 * Garantie-Check: Montage-Garantie der Anlage und jede Komponente mit Garantiedatum, mit Balken und «läuft bis» /
 * «abgelaufen». Dazu der Schalter «Garantiefall» (beim Anlegen setzt ihn die Datenbank selbst).
 */
export function GarantieCheck({ f, akte }: { f: ServiceFall; akte: Akte | undefined }) {
  const { t } = useTranslation()
  const { aus } = useAktion()
  const art = useAuswahl('komponente')
  const a = akte?.anlage
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
    <Box
      titel={t('service.garantieCheck.titel')}
      rechts={
        <label className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t('service.feld.garantieFall')}
          <Switch
            checked={f.garantie ?? false}
            onCheckedChange={(g) => {
              void aus(() => fallSpeichern({ garantie: g }, f.id))
            }}
          />
        </label>
      }
    >
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
    </Box>
  )
}
