import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'

interface LogoProps {
  className?: string
  /** «auto» folgt Hell/Dunkel; «aufDunkel» immer helle Schrift, z.B. auf der marineblauen Seitenleiste. */
  variante?: 'auto' | 'aufDunkel'
}

const CLAIM = { de: 'Smarte Solaranlagen', fr: 'Systèmes solaires intelligents' }

/**
 * Logo der App «Dimension Work» (Chris 31.10.2026): das Signet von Dimension Solaire mit dem App-Namen als
 * Schriftzug daneben, darunter Firma und Claim in der aktuellen Sprache. Drucksachen für Kunden behalten das
 * Firmenlogo (`public/logo/`), weil sie von Dimension Solaire kommen, nicht von der App.
 */
export function Logo({ className, variante = 'auto' }: LogoProps) {
  const sprache = useUi((z) => z.sprache)
  const dunkel = variante === 'aufDunkel'
  return (
    <span
      role="img"
      aria-label={`Dimension Work – Dimension Solaire, ${CLAIM[sprache]}`}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <img src="./icon.svg" alt="" className="aspect-square h-full w-auto shrink-0" />
      <span aria-hidden="true" className="flex flex-col justify-center leading-none whitespace-nowrap">
        <span
          className={cn(
            'text-[1.05rem] font-bold tracking-tight',
            dunkel ? 'text-sidebar-foreground' : 'text-foreground',
          )}
        >
          Dimension <span className={dunkel ? 'text-accent' : 'text-accent-ink'}>Work</span>
        </span>
        <span className={cn('mt-0.5 text-xs', dunkel ? 'text-sidebar-muted' : 'text-muted-foreground')}>
          Dimension Solaire · {CLAIM[sprache]}
        </span>
      </span>
    </span>
  )
}
