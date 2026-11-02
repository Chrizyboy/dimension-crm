import { Avatar } from '@/components/ui/diverses'
import { kurzzeichenVon, type KurzzeichenPerson } from '@/lib/kurzzeichen'
import { cn } from '@/lib/utils'

/**
 * Kurzzeichen einer Person («CR»), überall gleich: `rund` als farbiger Kreis (Listen, Karten, Planung),
 * `text` als schmales Kästchen in Tabellen und Zeilen. Der volle Name steht im Tooltip und für Screenreader.
 * Immer `personen.kurzzeichen` mitladen, nie `kuerzel` (das ist der technische Schlüssel wie «andreas»).
 */
export function Kurzzeichen({
  person,
  art = 'rund',
  className,
}: {
  person: KurzzeichenPerson
  art?: 'rund' | 'text'
  className?: string
}) {
  if (art === 'rund') return <Avatar name={person.name} zeichen={kurzzeichenVon(person)} className={className} />
  return (
    <abbr
      title={person.name}
      className={cn(
        'bg-muted text-foreground inline-flex min-w-7 items-center justify-center rounded px-1 text-xs font-semibold no-underline',
        className,
      )}
    >
      {kurzzeichenVon(person)}
    </abbr>
  )
}
