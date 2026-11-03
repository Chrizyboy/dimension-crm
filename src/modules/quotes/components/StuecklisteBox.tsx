import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useStueckliste } from '../hooks/useOfferten'
import { gruppiere } from '../lib/stuecklisteAnsicht'
import type { Offerte } from '../types'
import { Box } from './Box'

/**
 * Stückliste aus dem Eturnity-PDF: Positionen je Gruppe mit Menge und Preis exkl. MWST. Leistungen (Montage,
 * Planung) sind grau, Optionen stehen am Schluss. Daraus schlägt der Einkauf später die Materialliste vor.
 */
export function StuecklisteBox({ o }: { o: Offerte }) {
  const { t } = useTranslation()
  const liste = useStueckliste(o.id).data ?? []
  if (liste.length === 0) return null
  const material = liste.filter((p) => p.art === 'material' && !p.optional).length
  return (
    <Box
      titel={t('offerten.stueckliste.titel')}
      rechts={t('offerten.stueckliste.stand', { material, alle: liste.length })}
    >
      {gruppiere(liste).map((g) => (
        <section key={`${g.optional ? 'o' : 'g'}-${g.name}`} className="flex flex-col gap-1">
          <h3 className="text-muted-foreground flex justify-between gap-2 text-xs font-medium">
            <span>{g.optional ? t('offerten.stueckliste.option', { gruppe: g.name }) : g.name || '–'}</span>
            <span className="zahlen">{formatChf(g.summeRappen)}</span>
          </h3>
          <ul className="flex flex-col">
            {g.positionen.map((p, i) => (
              <li
                key={i}
                className={cn(
                  'grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-2 border-t py-1 first:border-t-0',
                  (p.art === 'leistung' || p.optional) && 'text-muted-foreground',
                )}
              >
                <span className="zahlen text-xs">
                  {p.menge.toLocaleString('de-CH')} {p.einheit}
                </span>
                <span className="min-w-0 break-words">{p.bezeichnung}</span>
                <span className="zahlen text-xs">{formatChf(p.preisRappen)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Box>
  )
}
