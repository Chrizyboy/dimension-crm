import { ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LeereFelderBereich } from './leereFelder'
import { useLeerZeile } from './leereZeile'

/**
 * Aufklappbarer Abschnitt einer Akte im Seitenpanel (Lead, Offerte, Artikel, Werkvertrag) oder einer Seite.
 * Die Überschrift umschliesst den Knopf (Muster «Accordion»), damit Screenreader sie als Überschrift finden.
 * `ebene` 3 im Panel (unter dem Titel des Panels), 2 direkt auf einer Seite (unter dem Seitentitel).
 */
export function AkteAbschnitt({
  titel,
  zusatz,
  offen: anfangsOffen = true,
  ebene = 3,
  children,
}: {
  titel: string
  zusatz?: ReactNode
  offen?: boolean
  ebene?: 2 | 3
  children: ReactNode
}) {
  const [offen, setOffen] = useState(anfangsOffen)
  const Titel = ebene === 2 ? 'h2' : 'h3'
  return (
    <section className="border-b py-3 last:border-b-0">
      <Titel className="text-sm font-semibold">
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
          {titel}
          {/* 0 nicht als nackte Zahl hinter den Titel schreiben («Kurse und Ausweise0»), sondern weglassen. */}
          {zusatz !== undefined && zusatz !== null && zusatz !== false && zusatz !== 0 && zusatz !== '' && (
            <span className="text-muted-foreground ml-auto text-xs font-normal">{zusatz}</span>
          )}
        </button>
      </Titel>
      {offen && <LeereFelderBereich className="pt-3 pl-6">{children}</LeereFelderBereich>}
    </section>
  )
}

/**
 * Beschriftung und Wert nebeneinander, Wert darf leer sein. Leere stehen erst nach «+ weitere Angaben»
 * (Entscheid 0058); Auswahl- und Eingabefelder sagen mit `leer`, ob noch nichts gewählt ist.
 */
export function Angabe({ label, children, leer }: { label: string; children: ReactNode; leer?: boolean }) {
  const marke = useLeerZeile(children, leer)
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-2 py-1 text-sm sm:grid-cols-[10.5rem_1fr]" {...marke}>
      <dt className="text-muted-foreground pt-1 text-xs">{label}</dt>
      <dd className="min-w-0">{children ?? '–'}</dd>
    </div>
  )
}
