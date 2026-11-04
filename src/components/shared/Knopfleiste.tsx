import { MoreHorizontal } from 'lucide-react'
import { Children, Fragment, isValidElement, useState, type ReactElement, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Wie viele Knöpfe am PC in einer Reihe stehen. Sind es mehr, bleiben die Hauptaktion und die vorderen offen und
 * «Mehr» nimmt den letzten Platz ein, so stehen nie mehr als so viele Elemente da.
 */
export const KNOEPFE_AM_PC = 4

/** Löst Fragmente auf, damit `<>…</>` als einzelne Knöpfe zählt; leere Einträge (`false`, `null`) fallen weg. */
function knoepfe(inhalt: ReactNode): ReactNode[] {
  return Children.toArray(inhalt).flatMap((k) =>
    isValidElement(k) && k.type === Fragment
      ? knoepfe((k as ReactElement<{ children?: ReactNode }>).props.children)
      : [k],
  )
}

/**
 * Knöpfe einer Seite oder Akte in einer Reihe, die Hauptaktion zuletzt (Chris 31.10.2026, Frage 2 A):
 * Am Handy steht nur die Hauptaktion da, alle anderen klappen mit «⋯ Mehr» auf. Am PC stehen höchstens
 * `KNOEPFE_AM_PC` Elemente (Chris 4.11.2026 «zu unübersichtlich»): die Hauptaktion, die vorderen und «Mehr»
 * für die seltenen hinten. Die Knöpfe werden dafür nicht kopiert, nur aus- und eingeblendet;
 * so bleiben Dialoge und Tastenkürzel daran hängen. Bis zwei Knöpfe zeigt auch das Handy alle.
 */
export function Knopfleiste({
  children,
  className,
  haupt = 'letzte',
}: {
  children: ReactNode
  className?: string
  /** Welcher Knopf am Handy offen bleibt: im Seitenkopf der letzte, in Akten der erste (dort steht die Hauptaktion vorn). */
  haupt?: 'erste' | 'letzte'
}) {
  const { t } = useTranslation()
  const [offen, setOffen] = useState(false)
  const liste = knoepfe(children)
  if (liste.length === 0) return null
  const hauptIndex = haupt === 'erste' ? 0 : liste.length - 1
  const amHandyZu = liste.length > 2
  const amPcZu = liste.length > KNOEPFE_AM_PC
  // Am PC offen: die Hauptaktion und die ersten anderen Knöpfe in ihrer Reihenfolge.
  const amPcOffen = new Set(
    [hauptIndex, ...liste.map((_, i) => i).filter((i) => i !== hauptIndex)].slice(0, KNOEPFE_AM_PC - 1),
  )

  const mehr = (amHandyZu || amPcZu) && (
    <Button
      key="mehr"
      variant="secondary"
      className={cn(!amPcZu && 'sm:hidden')}
      aria-expanded={offen}
      onClick={() => {
        setOffen(!offen)
      }}
    >
      <MoreHorizontal />
      {offen ? t('knopfleiste.weniger') : t('knopfleiste.mehr')}
    </Button>
  )

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {liste.map((knopf, i) => {
        const handyZu = amHandyZu && !offen && i !== hauptIndex
        const pcZu = amPcZu && !offen && !amPcOffen.has(i)
        return (
          <Fragment key={i}>
            {/* Steht die Hauptaktion hinten, kommt «Mehr» davor, damit sie am rechten Rand bleibt. */}
            {haupt === 'letzte' && i === hauptIndex && mehr}
            <span className={cn('contents', handyZu && 'max-sm:hidden', pcZu && 'sm:hidden')}>{knopf}</span>
          </Fragment>
        )
      })}
      {haupt === 'erste' && mehr}
    </div>
  )
}
