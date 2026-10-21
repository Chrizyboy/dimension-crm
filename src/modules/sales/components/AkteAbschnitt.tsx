import { ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Aufklappbarer Abschnitt der Lead-Akte (V233: Kontakt, Objekt, Interesse, Termin …). */
export function AkteAbschnitt({
  titel,
  zusatz,
  offen: anfangsOffen = true,
  children,
}: {
  titel: string
  zusatz?: ReactNode
  offen?: boolean
  children: ReactNode
}) {
  const [offen, setOffen] = useState(anfangsOffen)
  return (
    <section className="border-b py-3 last:border-b-0">
      <button
        type="button"
        aria-expanded={offen}
        onClick={() => {
          setOffen(!offen)
        }}
        className="focus-visible:ring-ring flex w-full items-center gap-2 rounded text-left outline-none focus-visible:ring-2"
      >
        <ChevronRight
          className={cn('text-muted-foreground size-4 transition-transform', offen && 'rotate-90')}
          aria-hidden="true"
        />
        <h3 className="text-sm font-semibold">{titel}</h3>
        {zusatz && <span className="text-muted-foreground ml-auto text-xs">{zusatz}</span>}
      </button>
      {offen && <div className="pt-3 pl-6">{children}</div>}
    </section>
  )
}

/** Beschriftung und Wert nebeneinander, Wert darf leer sein. */
export function Angabe({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-2 py-1 text-sm">
      <dt className="text-muted-foreground pt-1 text-xs">{label}</dt>
      <dd className="min-w-0">{children ?? '–'}</dd>
    </div>
  )
}
