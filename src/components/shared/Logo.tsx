import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'

interface LogoProps {
  className?: string
  /** «auto» folgt Hell/Dunkel; «aufDunkel» immer helle Schrift, z.B. auf der marineblauen Seitenleiste. */
  variante?: 'auto' | 'aufDunkel'
  /** Ohne «by Dimension Solaire» und mit kräftigerer Schrift: für kleine Höhen (Seitenleiste, Kopfzeile). */
  kurz?: boolean
}

/** Vorlesetext wie beim bisherigen Logo-Bild (Claim klein, mitten im Satz). */
const ALT = { de: 'smarte Solaranlagen', fr: 'systèmes solaires intelligents' }

/** Signet allein (orange Umriss), für Stellen ohne Platz für den Schriftzug, z.B. eingeklappte Seitenleiste. */
export const SIGNET = './logo/icon-umriss.svg'

/**
 * Logo der App «Dimension Work» (Chris 31.10.2026: Icon von Entwurf 8, Schrift von Entwurf 1): Signet als
 * oranger Umriss, daneben «DIMENSION WORK» und «by Dimension Solaire». Als Bild, damit die Schrift
 * (Montserrat) überall gleich aussieht, ohne eine Schrift nachzuladen. Drucksachen für Kunden behalten das
 * Firmenlogo (`public/logo/logo-*`), weil sie von Dimension Solaire kommen, nicht von der App. Das App-Symbol
 * (Taskleiste, Startmenü, Favicon) bleibt das gefüllte `icon.svg`, weil der dünne Umriss klein zu schwach wirkt.
 */
export function Logo({ className, variante = 'auto', kurz = false }: LogoProps) {
  const sprache = useUi((z) => z.sprache)
  const datei = (ton: 'hell' | 'dunkel') => `./logo/dimension-work-${kurz ? 'kurz-' : ''}${ton}.png`
  return (
    <span
      role="img"
      aria-label={`Dimension Work – Dimension Solaire, ${ALT[sprache]}`}
      className={cn('inline-flex items-center', className)}
    >
      {variante === 'aufDunkel' ? (
        <img src={datei('dunkel')} alt="" className="h-full w-auto" />
      ) : (
        <>
          <img src={datei('hell')} alt="" className="h-full w-auto dark:hidden" />
          <img src={datei('dunkel')} alt="" className="hidden h-full w-auto dark:block" />
        </>
      )}
    </span>
  )
}
