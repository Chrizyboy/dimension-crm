import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { dbTon, type summe } from '../lib/kalkulation'

const TON = { ok: 'text-ok', warnung: 'text-warn', kritisch: 'text-bad' } as const

function Kachel({
  titel,
  wert,
  zusatz,
  className,
}: {
  titel: string
  wert: string
  zusatz?: string | undefined
  className?: string | undefined
}) {
  return (
    <div className="bg-muted/50 flex flex-col rounded-lg p-3">
      <span className="text-muted-foreground text-xs">{titel}</span>
      <span className={cn('zahlen font-mono text-base font-semibold whitespace-nowrap', className)}>{wert}</span>
      {zusatz && <span className="text-muted-foreground text-xs">{zusatz}</span>}
    </div>
  )
}

/**
 * Kennzahlen und Summen (V233 Preisberechnung): Anlage, Einkauf, Deckungsbeitrag (ab 20 % gut, ab 12 % knapp),
 * pro kWp; darunter Verkauf mit Skonto-Reserve, Rabatt, Total exkl., MWST und Total inkl.
 */
export function KalkSummen({
  s,
  satz,
  rabatt,
  onRabatt,
}: {
  s: ReturnType<typeof summe>
  satz: number
  rabatt: number
  onRabatt: (r: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="grid grid-cols-2 gap-2">
        <Kachel
          titel={t('preise.kalk.anlage')}
          wert={s.kwp ? `${s.kwp} kWp` : '–'}
          zusatz={s.module ? t('preise.kalk.module', { count: s.module }) : undefined}
        />
        <Kachel titel={t('preise.kalk.einkauf')} wert={formatChf(s.ek)} />
        <Kachel
          titel={t('preise.kalk.db')}
          wert={`${Math.round(s.dbProzent * 10) / 10} %`}
          zusatz={formatChf(s.db)}
          className={s.netto ? TON[dbTon(s.dbProzent)] : undefined}
        />
        <Kachel titel={t('preise.kalk.proKwp')} wert={s.proKwp ? formatChf(s.proKwp) : '–'} />
      </div>
      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t('preise.kalk.verkauf', { reserve: formatChf(s.skonto) })}</dt>
          <dd className="zahlen font-mono">{formatChf(s.brutto)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">
            <label className="inline-flex items-center gap-1">
              {t('preise.kalk.rabatt')}
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={rabatt}
                onChange={(e) => {
                  onRabatt(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                }}
                className="border-border bg-surface h-6 w-14 rounded border px-1 text-right text-xs"
              />
              %
            </label>
          </dt>
          <dd className="zahlen font-mono">{s.rabattBetrag ? `− ${formatChf(s.rabattBetrag)}` : '–'}</dd>
        </div>
        <div className="flex justify-between gap-2 border-t pt-1 font-medium">
          <dt>{t('preise.kalk.totalExkl')}</dt>
          <dd className="zahlen font-mono">{formatChf(s.netto)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t('preise.kalk.mwst', { satz })}</dt>
          <dd className="zahlen font-mono">{formatChf(s.mwst)}</dd>
        </div>
        <div className="flex justify-between gap-2 border-t pt-1 text-base font-semibold">
          <dt>{t('preise.kalk.totalInkl')}</dt>
          <dd className="zahlen font-mono">CHF {formatChf(s.total)}</dd>
        </div>
      </dl>
    </div>
  )
}
