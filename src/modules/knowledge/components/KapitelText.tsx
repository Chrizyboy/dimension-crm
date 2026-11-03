import { cn } from '@/lib/utils'
import { linkZiel, stuecke, type Block } from '../lib/kapitel'

/** Eine Zeile mit **Knopf-Namen** als Marke und Links. */
export function Zeile({ text }: { text: string }) {
  return (
    <>
      {stuecke(text).map((s, i) => {
        if (s.art === 'fett')
          return (
            <span key={i} className="bg-muted text-foreground rounded px-1.5 py-px font-medium whitespace-nowrap">
              {s.text}
            </span>
          )
        if (s.art === 'link') {
          const z = linkZiel(s.ziel)
          return (
            <a
              key={i}
              href={z.href}
              className="text-primary dark:text-accent font-medium underline-offset-4 hover:underline"
              {...(z.extern ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {s.text}
            </a>
          )
        }
        return <span key={i}>{s.text}</span>
      })}
    </>
  )
}

/** Absätze und Listen eines Abschnitts. Nummerierte Listen sind die Schritte einer Anleitung. */
export function Bloecke({ bloecke, className }: { bloecke: Block[]; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 text-sm leading-relaxed', className)}>
      {bloecke.map((b, i) =>
        b.art === 'absatz' ? (
          <p key={i}>
            <Zeile text={b.text} />
          </p>
        ) : b.geordnet ? (
          <ol key={i} className="flex flex-col gap-1.5">
            {b.punkte.map((p, j) => (
              <li key={j} className="flex gap-2.5">
                <span
                  aria-hidden="true"
                  className="bg-primary text-primary-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                >
                  {j + 1}
                </span>
                <span className="min-w-0">
                  <Zeile text={p} />
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
            {b.punkte.map((p, j) => (
              <li key={j}>
                <Zeile text={p} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
