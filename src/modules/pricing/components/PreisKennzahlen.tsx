import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { hinweise } from '../lib/hinweise'
import type { Artikel, PreisHinweis, PreisRegeln } from '../types'

const TON: Record<PreisHinweis, string> = {
  marge: 'text-bad',
  ekAlt: 'text-warn',
  ohneEk: 'text-warn',
  datenblatt: 'text-warn',
  lager: 'text-foreground',
}

/**
 * Kennzahlen über der Preisliste: aktive Artikel, offene Preislisten und der Handlungsbedarf. Ein Klick filtert die
 * Liste auf diesen Hinweis, nochmals Klick hebt den Filter auf.
 */
export function PreisKennzahlen({
  artikel,
  regeln,
  offeneImporte,
  filter,
  onFilter,
  onImporte,
}: {
  artikel: Artikel[]
  regeln: PreisRegeln | undefined
  offeneImporte: number
  filter: PreisHinweis | null
  onFilter: (h: PreisHinweis | null) => void
  onImporte: () => void
}) {
  const { t } = useTranslation()
  const zahl: Record<PreisHinweis, number> = { marge: 0, ekAlt: 0, ohneEk: 0, datenblatt: 0, lager: 0 }
  for (const a of artikel) for (const h of hinweise(a, regeln)) zahl[h]++
  const arten: PreisHinweis[] = regeln?.kategorien ? ['marge', 'ekAlt', 'datenblatt', 'lager'] : ['datenblatt', 'lager']
  const kachel = 'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left'
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      <div className={kachel}>
        <span className="font-display zahlen text-xl font-semibold">{artikel.length}</span>
        <span className="text-muted-foreground text-xs">{t('preise.kennzahl.aktiv')}</span>
      </div>
      {regeln?.kategorien && (
        <button type="button" onClick={onImporte} className={cn(kachel, 'hover:border-border-strong')}>
          <span className={cn('font-display zahlen text-xl font-semibold', offeneImporte > 0 && 'text-accent-ink')}>
            {offeneImporte}
          </span>
          <span className="text-muted-foreground text-xs">{t('preise.kennzahl.importe')}</span>
        </button>
      )}
      {arten.map((h) => (
        <button
          key={h}
          type="button"
          aria-pressed={filter === h}
          onClick={() => {
            onFilter(filter === h ? null : h)
          }}
          className={cn(kachel, 'hover:border-border-strong', filter === h && 'border-primary ring-primary ring-1')}
        >
          <span className={cn('font-display zahlen text-xl font-semibold', zahl[h] > 0 && TON[h])}>{zahl[h]}</span>
          <span className="text-muted-foreground text-xs">
            {t(`preise.kennzahl.${h}`, { tage: regeln?.ek_gueltig_tage ?? 90 })}
          </span>
        </button>
      ))}
    </div>
  )
}
