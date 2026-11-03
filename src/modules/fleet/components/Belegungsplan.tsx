import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useBelegung, useFahrzeuge, useGeraete } from '../hooks/useRessourcen'
import { amTag, konflikte, montag, plusTage, sache, tage, zeilenSchluessel } from '../lib/belegung'
import { heuteZuerich } from '../lib/fristen'
import type { Belegung } from '../types'
import { Kennzeichen } from './Kennzeichen'

type Was = 'fahrzeuge' | 'geraete'

const FARBE = {
  einsatz: 'bg-info-soft text-info',
  hand: 'bg-accent-soft text-accent-ink',
  werkstatt: 'bg-muted text-muted-foreground',
} as const

/**
 * Belegung als Wochenplan (Mo–Fr): Zeilen sind Fahrzeuge oder Geräte, Felder die Reservierungen (für einen Einsatz,
 * einen Zweck oder die Werkstatt), immer von Hand (Chris 3.11.2026). Doppelt Belegtes ist rot umrandet. Klick auf
 * eine Einsatz-Reservierung wählt ein anderes Fahrzeug, Klick in ein leeres Feld reserviert.
 */
export function Belegungsplan({
  onEinsatz,
  onReservieren,
}: {
  onEinsatz: (b: Belegung) => void
  onReservieren: (bezug: { fahrzeug?: string; geraet?: string }, tag: string) => void
}) {
  const { t } = useTranslation()
  const heute = heuteZuerich()
  const [start, setStart] = useState(() => montag(heute))
  const [was, setWas] = useState<Was>('fahrzeuge')
  const woche = tage(start, 5)
  const belegung = useBelegung(start, plusTage(start, 4))
  const fahrzeuge = useFahrzeuge().data ?? []
  const geraete = useGeraete().data ?? []
  if (belegung.error)
    return <Fehlerzustand details={String(belegung.error)} onNochmal={() => void belegung.refetch()} />
  const liste = belegung.data ?? []
  const doppelt = konflikte(liste, start, plusTage(start, 4))
  const zeilen =
    was === 'fahrzeuge'
      ? fahrzeuge.filter((f) => !f.ausser_betrieb).map((f) => ({ id: f.id, s: `f:${f.id}`, f }))
      : geraete
          .filter((g) => !g.ausgemustert_am && (g.art === 'hebegeraet' || liste.some((b) => b.geraet_id === g.id)))
          .map((g) => ({ id: g.id, s: `g:${g.id}`, g }))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('fuhrpark.filter')}
          optionen={(['fahrzeuge', 'geraete'] as const).map((x) => ({ wert: x, text: t(`fuhrpark.reiter.${x}`) }))}
          gewaehlt={[was]}
          onChange={([x]) => {
            if (x) setWas(x as Was)
          }}
        />
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="icon"
            aria-label={t('fuhrpark.belegung.zurueck')}
            onClick={() => {
              setStart(plusTage(start, -7))
            }}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setStart(montag(heute))
            }}
          >
            {t('fuhrpark.belegung.heute')}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label={t('fuhrpark.belegung.weiter')}
            onClick={() => {
              setStart(plusTage(start, 7))
            }}
          >
            <ChevronRight />
          </Button>
          <span className="zahlen ml-2 text-sm font-medium">
            {formatDatum(start)} – {formatDatum(plusTage(start, 4))}
          </span>
        </div>
      </div>
      {!belegung.data ? (
        <Skelett className="h-64" />
      ) : (
        <div className="bg-surface overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-muted-foreground w-56 px-3 py-2 text-left text-xs font-semibold">
                  {t(was === 'fahrzeuge' ? 'fuhrpark.spalte.fahrzeug' : 'fuhrpark.spalte.geraet')}
                </th>
                {woche.map((tag) => (
                  <th
                    key={tag}
                    className={cn(
                      'px-2 py-2 text-left text-xs font-semibold',
                      tag === heute ? 'text-accent-ink' : 'text-muted-foreground',
                    )}
                  >
                    {t(`fuhrpark.belegung.tag.${String(new Date(`${tag}T12:00:00Z`).getUTCDay())}`)}{' '}
                    {formatDatum(tag).slice(0, 6)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.id} className="border-t align-top">
                  <td className="px-3 py-2">
                    {'f' in z ? (
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium">{z.f.bezeichnung}</span>
                        <Kennzeichen nummer={z.f.kennzeichen} />
                      </span>
                    ) : (
                      <span className="font-medium">{'g' in z ? z.g.bezeichnung : ''}</span>
                    )}
                  </td>
                  {woche.map((tag) => {
                    const hier = amTag(liste, tag).filter((b) => sache(b) === z.s)
                    const konflikt = doppelt.get(z.s)?.includes(tag) ?? false
                    return (
                      <td key={tag} className={cn('px-1 py-1', tag === heute && 'bg-accent-soft/30')}>
                        <div className="flex min-h-9 flex-col gap-1">
                          {hier.map((b) => (
                            <button
                              key={zeilenSchluessel(b)}
                              type="button"
                              className={cn(
                                'rounded px-1.5 py-1 text-left text-xs font-medium',
                                FARBE[b.art],
                                konflikt && 'ring-bad ring-2',
                              )}
                              onClick={() => {
                                if (b.einsatz_id) onEinsatz(b)
                              }}
                            >
                              {b.projekt ?? b.zweck ?? t(`fuhrpark.belegung.art.${b.art}`)}
                            </button>
                          ))}
                          {hier.length === 0 && (
                            <button
                              type="button"
                              aria-label={t('fuhrpark.reservieren.knopf')}
                              className="hover:bg-muted min-h-9 rounded"
                              onClick={() => {
                                onReservieren(z.s.startsWith('f:') ? { fahrzeug: z.id } : { geraet: z.id }, tag)
                              }}
                            />
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
        {(['einsatz', 'hand', 'werkstatt'] as const).map((a) => (
          <span key={a} className="flex items-center gap-1.5">
            <span className={cn('inline-block size-3 rounded', FARBE[a])} />
            {t(`fuhrpark.belegung.legende.${a}`)}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="ring-bad inline-block size-3 rounded ring-2" />
          {t('fuhrpark.belegung.legende.konflikt')}
        </span>
      </div>
    </div>
  )
}
