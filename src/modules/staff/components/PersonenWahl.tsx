import { Checkbox } from '@/components/ui/schalter'
import type { TeamPerson } from '../types'

/** Mehrere Personen ankreuzen (Teilnehmende eines Kurses, wer war dabei). */
export function PersonenWahl({
  id,
  personen,
  gewaehlt,
  onChange,
  gesperrt = false,
}: {
  id: string
  personen: TeamPerson[]
  gewaehlt: string[]
  onChange: (ids: string[]) => void
  gesperrt?: boolean
}) {
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {personen.map((p) => (
        <li key={p.id}>
          <label htmlFor={`${id}-${p.id}`} className="flex items-center gap-2 text-sm">
            <Checkbox
              id={`${id}-${p.id}`}
              checked={gewaehlt.includes(p.id)}
              disabled={gesperrt}
              onCheckedChange={(c) => {
                onChange(c === true ? [...gewaehlt, p.id] : gewaehlt.filter((x) => x !== p.id))
              }}
            />
            <span className="truncate">{p.name}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}
