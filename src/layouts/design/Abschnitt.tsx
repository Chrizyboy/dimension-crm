import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Ein Abschnitt der Design-Seite mit Anker, damit man direkt dorthin verlinken kann (#/design#farben). */
export function Abschnitt({
  id,
  titel,
  text,
  children,
}: {
  id: string
  titel: string
  text?: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titel`} className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex flex-col gap-1 border-b pb-3">
        <h2 id={`${id}-titel`} className="text-lg font-semibold">
          {titel}
        </h2>
        {text && <p className="text-muted-foreground max-w-2xl text-sm">{text}</p>}
      </div>
      {children}
    </section>
  )
}

/** Beschriftetes Beispiel innerhalb eines Abschnitts. */
export function Beispiel({ titel, children, className }: { titel: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{titel}</p>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
    </div>
  )
}
