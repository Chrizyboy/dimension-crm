import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Kurzzeichen } from '@/components/shared/Kurzzeichen'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import { heute, monatsTage, wochentag } from '../lib/zeit'
import type { Abwesenheit, Zeiterfassung } from '../types'

const FARBE: Record<string, string> = {
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  marke: 'bg-accent-soft text-accent-ink',
  neutral: 'bg-muted text-foreground',
}

/**
 * Monatskalender: eine Zeile je sichtbare Person, ein Feld je Tag. Bewilligte Abwesenheiten farbig nach Art,
 * beantragte nur umrandet, Wochenende und Feiertage grau. Für die Zeit-Leitung «wer ist wann weg», sonst die eigene.
 */
export function Kalender({ daten }: { daten: Zeiterfassung }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const arten = useAuswahl('abwesenheit')
  const jetzt = heute()
  const [monat, setMonat] = useState(() => ({ jahr: Number(jetzt.slice(0, 4)), monat: Number(jetzt.slice(5, 7)) }))
  const tage = monatsTage(monat.jahr, monat.monat)
  const feiertage = new Map(daten.feiertage.map((f) => [f.tag, f[sprache]]))
  const titel = new Intl.DateTimeFormat(sprache === 'fr' ? 'fr-CH' : 'de-CH', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${tage[0] ?? jetzt}T12:00:00Z`))
  const verschieben = (n: number) => {
    const m = monat.monat + n
    setMonat({ jahr: monat.jahr + Math.floor((m - 1) / 12), monat: ((m - 1 + 12) % 12) + 1 })
  }
  const finde = (personId: string, tag: string): Abwesenheit | undefined =>
    daten.abwesenheiten.find(
      (a) => a.person_id === personId && a.status !== 'abgelehnt' && a.von <= tag && a.bis >= tag,
    )
  const imJahr = monat.jahr === daten.jahr

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          aria-label={t('zeit.kalender.vorher')}
          onClick={() => {
            verschieben(-1)
          }}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-36 text-center text-sm font-medium capitalize">{titel}</span>
        <Button
          size="icon"
          variant="ghost"
          aria-label={t('zeit.kalender.nachher')}
          onClick={() => {
            verschieben(1)
          }}
        >
          <ChevronRight />
        </Button>
        {!imJahr && <span className="text-muted-foreground text-xs">{t('zeit.kalender.anderesJahr')}</span>}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th scope="col" className="bg-surface sticky left-0 px-2 py-1 text-left font-medium">
                {t('zeit.person')}
              </th>
              {tage.map((d) => (
                <th
                  key={d}
                  scope="col"
                  title={feiertage.get(d)}
                  className={cn(
                    'zahlen min-w-6 px-0.5 py-1 text-center font-medium',
                    (wochentag(d) > 5 || feiertage.has(d)) && 'text-muted-foreground',
                    d === jetzt && 'text-accent-ink',
                  )}
                >
                  {Number(d.slice(8))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daten.personen.map((p) => (
              <tr key={p.id} className="border-t">
                <th scope="row" className="bg-surface sticky left-0 px-2 py-1 text-left font-normal whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Kurzzeichen person={p} art="text" />
                    <span className="hidden sm:inline">{p.name}</span>
                  </span>
                </th>
                {tage.map((d) => {
                  const frei = wochentag(d) > 5 || feiertage.has(d)
                  const a = imJahr && !frei ? finde(p.id, d) : undefined
                  const farbe = a ? (FARBE[arten.finde(a.art)?.farbe ?? 'neutral'] ?? FARBE.neutral) : ''
                  const text = a ? arten.text(a.art) : ''
                  return (
                    <td key={d} className={cn('p-0.5', frei && 'bg-muted/60')}>
                      {a && (
                        <span
                          title={`${text}${a.status === 'beantragt' ? ` (${t('zeit.stand.beantragt')})` : ''}`}
                          className={cn(
                            'flex h-6 items-center justify-center rounded text-[0.7rem] font-semibold',
                            a.status === 'beantragt' ? 'border-warn border border-dashed' : farbe,
                          )}
                        >
                          {a.halbtag ? '½' : text.slice(0, 1)}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">{t('zeit.kalender.legende')}</p>
    </div>
  )
}
