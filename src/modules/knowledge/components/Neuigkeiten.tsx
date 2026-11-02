import { Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { formatDatum } from '@/lib/format'
import { findeModul } from '@/lib/navigation'
import { useUi } from '@/stores/ui'
import { useAlleKapitel } from '../hooks/useKapitel'
import { alleNeuigkeiten } from '../lib/neuigkeiten'
import { Zeile } from './KapitelText'

/**
 * Was zuletzt neu kam, aus dem Abschnitt «Neu» jedes Kapitels, neueste zuerst. Nur Bereiche, die die Person sieht.
 * `max` kürzt die Liste (Karte in «Für dich»).
 */
export function Neuigkeiten({ max, onKapitel }: { max?: number; onKapitel: (id: string) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const module = useSichtbareModule()
  const kapitel = useAlleKapitel()
  const liste = useMemo(
    () => alleNeuigkeiten(kapitel.data ?? [], new Set(module.map((m) => m.id))).slice(0, max),
    [kapitel.data, module, max],
  )

  if (kapitel.isPending) return <Skelett className="h-40 w-full" />
  if (!liste.length) return <Leerzustand icon={Sparkles} titel={t('handbuch.neu.leer')} />

  return (
    <ul className="flex flex-col gap-3">
      {liste.map((n, i) => (
        <li key={`${n.bereich}-${String(i)}`} className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">
            {formatDatum(n.datum)} ·{' '}
            <button
              type="button"
              className="hover:text-foreground font-medium underline-offset-4 hover:underline"
              onClick={() => {
                onKapitel(n.bereich)
              }}
            >
              {findeModul(n.bereich)?.titel[sprache] ?? n.bereich}
            </button>
          </span>
          <span className="text-sm">
            <Zeile text={n.text} />
          </span>
        </li>
      ))}
    </ul>
  )
}
