import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { abwesendAm, eintraegeAm, konflikteAm, type PlanEintrag, type Wochenplan } from '../lib/wochenplan'
import type { Gezogen } from './Wochenplan'

const FARBE: Record<PlanEintrag['typ'], string> = {
  montage: 'bg-accent-soft text-accent-ink',
  service: 'bg-info-soft text-info',
  wartung: 'bg-ok-soft text-ok',
}

/** Link in die Akte: Montage ins Projekt, Service und Wartung in den Fall. */
function ziel(e: PlanEintrag): string {
  return e.typ === 'montage' ? `#/projects?projekt=${e.projekt_id ?? ''}` : `#/aftersales?fall=${e.id}`
}

/**
 * Eine Zelle im Wochenplan (Person oder Subunternehmer × Tag): Einträge als ziehbare Kärtchen, Abwesenheit grau,
 * Konflikte rot mit Grund. Personen-Zellen nehmen gezogene Einträge an; Subunternehmer nur zum Anschauen.
 */
export function PlanZelle({
  plan,
  person,
  sub,
  tag,
  gezogen,
  onZiehen,
  onAblegen,
}: {
  plan: Wochenplan
  person: string | null
  sub: string | undefined
  tag: string
  gezogen: Gezogen | null
  onZiehen: (g: Gezogen | null) => void
  onAblegen: (person: string | null, tag: string) => void
}) {
  const { t } = useTranslation()
  const liste = eintraegeAm(plan, person ? { person } : { sub: sub ?? '' }, tag)
  const weg = person ? abwesendAm(plan, person, tag) : null
  const konflikte = person ? konflikteAm(plan, person, tag) : []
  const annehmen = Boolean(person && gezogen)

  return (
    <td
      className={cn(
        'h-20 border-l p-1',
        weg && 'bg-muted',
        konflikte.length > 0 && 'ring-bad ring-2 ring-inset',
        annehmen && 'hover:bg-accent-soft/40',
      )}
      onDragOver={(ev) => {
        if (annehmen) ev.preventDefault()
      }}
      onDrop={(ev) => {
        ev.preventDefault()
        if (person) onAblegen(person, tag)
      }}
    >
      <div className="flex flex-col gap-1">
        {weg && (
          <span className="text-muted-foreground text-xs">
            {t(`baustelle.woche.abwesend`, { art: weg.art })}
            {weg.halbtag ? ` · ${t('baustelle.woche.halbtag')}` : ''}
          </span>
        )}
        {liste.map((e) => (
          <a
            key={e.id}
            href={ziel(e)}
            draggable={Boolean(person)}
            onDragStart={() => {
              onZiehen({ eintrag: e, person, tag })
            }}
            onDragEnd={() => {
              onZiehen(null)
            }}
            className={cn(
              'focus-visible:ring-ring block rounded-md px-1.5 py-1 text-xs outline-none focus-visible:ring-2',
              FARBE[e.typ],
              e.typ === 'montage' && e.art === 'geplant' && 'border border-dashed opacity-80',
              person && 'cursor-grab',
            )}
            title={[e.nummer, e.titel, e.ort].filter(Boolean).join(' · ')}
          >
            <span className="line-clamp-1 font-medium">
              {e.zeit ? `${e.zeit} ` : ''}
              {e.titel ?? e.nummer}
            </span>
            <span className="line-clamp-1 opacity-80">{[e.nummer, e.ort].filter(Boolean).join(' · ')}</span>
          </a>
        ))}
        {konflikte.map((k) => (
          <span key={k} className="text-bad text-xs font-medium">
            {t(`baustelle.woche.konflikt.${k}`)}
          </span>
        ))}
      </div>
    </td>
  )
}
