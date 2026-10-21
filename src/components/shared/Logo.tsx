import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'

interface LogoProps {
  className?: string
  /** «auto» folgt Hell/Dunkel; «aufDunkel» immer helle Schrift, z.B. auf der marineblauen Seitenleiste. */
  variante?: 'auto' | 'aufDunkel'
}

/**
 * Offizielles Logo von Dimension Solaire mit Claim in der aktuellen Sprache
 * (DE «Smarte Solaranlagen», FR «Systèmes solaires intelligents»).
 * Beide Farbvarianten werden geladen und per CSS umgeschaltet, damit «System» ohne Flackern funktioniert.
 */
export function Logo({ className, variante = 'auto' }: LogoProps) {
  const sprache = useUi((z) => z.sprache)
  const alt =
    sprache === 'fr' ? 'Dimension Solaire – systèmes solaires intelligents' : 'Dimension Solaire – smarte Solaranlagen'
  if (variante === 'aufDunkel') {
    return (
      <span className={cn('inline-flex', className)}>
        <img src={`./logo/logo-dunkel-${sprache}.png`} alt={alt} className="h-full w-auto" />
      </span>
    )
  }
  return (
    <span className={cn('inline-flex', className)}>
      <img src={`./logo/logo-hell-${sprache}.png`} alt={alt} className="h-full w-auto dark:hidden" />
      <img src={`./logo/logo-dunkel-${sprache}.png`} alt={alt} className="hidden h-full w-auto dark:block" />
    </span>
  )
}
