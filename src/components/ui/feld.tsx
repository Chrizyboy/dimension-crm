import { Label as LabelPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Beschriftung eines Eingabefelds. */
export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('text-foreground text-xs font-medium', className)} {...props} />
}

interface FeldProps {
  id: string
  label: string
  /** Kurze Hilfe unter dem Feld, z.B. Format «CHF 12'500.00». */
  hinweis?: string
  /** Fehlermeldung; ersetzt den Hinweis und färbt das Feld rot. */
  fehler?: string | undefined
  pflicht?: boolean
  children: ReactNode
  className?: string
}

/**
 * Feld mit Beschriftung, Hinweis und Fehlermeldung in immer gleicher Anordnung.
 * Das Eingabe-Element bekommt dieselbe id, damit ein Klick auf die Beschriftung ins Feld springt.
 */
export function Feld({ id, label, hinweis, fehler, pflicht = false, children, className }: FeldProps) {
  const unten = fehler ?? hinweis
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {pflicht && (
          <span className="text-bad" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </Label>
      {children}
      {unten && (
        <p
          id={`${id}-hinweis`}
          className={cn('text-xs', fehler ? 'text-bad' : 'text-muted-foreground')}
          role={fehler ? 'alert' : undefined}
        >
          {unten}
        </p>
      )}
    </div>
  )
}
