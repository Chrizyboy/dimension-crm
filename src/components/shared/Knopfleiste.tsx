import { MoreHorizontal } from 'lucide-react'
import { Children, Fragment, isValidElement, useState, type ReactElement, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
 * Am Handy steht nur die Hauptaktion da, alle anderen klappen mit «⋯ Mehr» auf. Die Knöpfe werden dafür
 * nicht kopiert, nur aus- und eingeblendet; so bleiben Dialoge und Tastenkürzel daran hängen.
 * Bis zwei Knöpfe zeigt auch das Handy alle, das passt auf eine Zeile.
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
  const einklappen = liste.length > 2
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {liste.map((knopf, i) => {
        const hauptIndex = haupt === 'erste' ? 0 : liste.length - 1
        const versteckt = einklappen && !offen && i !== hauptIndex
        return (
          <span key={i} className={cn('contents', versteckt && 'max-sm:hidden')}>
            {knopf}
          </span>
        )
      })}
      {einklappen && (
        <Button
          variant="secondary"
          className="sm:hidden"
          aria-expanded={offen}
          onClick={() => {
            setOffen(!offen)
          }}
        >
          <MoreHorizontal />
          {offen ? t('knopfleiste.weniger') : t('knopfleiste.mehr')}
        </Button>
      )}
    </div>
  )
}
