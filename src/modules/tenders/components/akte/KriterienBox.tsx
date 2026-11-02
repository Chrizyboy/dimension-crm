import { useTranslation } from 'react-i18next'
import type { Dossier } from '../../types'
import { Box } from '../Box'

const FARBEN = ['bg-reihe-1', 'bg-reihe-2', 'bg-info', 'bg-warn', 'bg-ok']

/** Zuschlagskriterien als Balken mit Gewicht; zeigt auf einen Blick, wie stark der Preis zählt. */
export function KriterienBox({ d }: { d: Dossier }) {
  const { t } = useTranslation()
  if (d.spur !== 'angebot') return null
  return (
    <Box titel={t('ausschreibungen.akte.kriterien')}>
      {d.kriterien.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('ausschreibungen.akte.keineKriterien')}</p>
      ) : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
            {d.kriterien.map((k, i) => (
              <span key={k.name} className={FARBEN[i % FARBEN.length]} style={{ width: `${k.gewicht}%` }} />
            ))}
          </div>
          <ul className="flex flex-col gap-1">
            {d.kriterien.map((k, i) => (
              <li key={k.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${FARBEN[i % FARBEN.length] ?? ''}`} aria-hidden="true" />
                  {k.name}
                </span>
                <span className="zahlen font-mono text-xs">{k.gewicht} %</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Box>
  )
}
