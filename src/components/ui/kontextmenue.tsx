import { ContextMenu as KM } from 'radix-ui'
import type { ReactNode } from 'react'
import type { ZeilenAktion } from '@/lib/zeilenAktionen'
import { cn } from '@/lib/utils'

const eintrag =
  'relative flex min-h-8 cursor-default items-center gap-2 rounded-md px-2 py-1 text-sm outline-none select-none data-disabled:opacity-50 data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground'

/** Die Einträge eines Rechtsklick-Menüs; für Datentabelle und einzelne Zeilen gleich. */
export function KontextmenueEintraege({ aktionen }: { aktionen: ZeilenAktion[] }) {
  return aktionen.map((a, i) => {
    if (a === 'trenner') return <KM.Separator key={i} className="bg-border -mx-1 my-1 h-px" />
    const Icon = a.icon
    const inhalt = (
      <>
        {Icon && <Icon aria-hidden="true" />}
        <span className="flex-1">{a.text}</span>
        {a.hinweis && (
          <span className="text-muted-foreground max-w-48 truncate text-xs" title={a.hinweis}>
            {a.hinweis}
          </span>
        )}
      </>
    )
    const klasse = cn(eintrag, a.gefahr && 'text-bad [&_svg]:text-bad')
    if (a.href)
      return (
        <KM.Item key={i} asChild disabled={a.aus ?? false} className={klasse}>
          <a href={a.href} {...(a.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {inhalt}
          </a>
        </KM.Item>
      )
    return (
      <KM.Item key={i} disabled={a.aus ?? false} className={klasse} {...(a.aktion ? { onSelect: a.aktion } : {})}>
        {inhalt}
      </KM.Item>
    )
  })
}

/** Glasfläche des Rechtsklick-Menüs. */
export function KontextmenueInhalt({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <KM.Portal>
      <KM.Content
        collisionPadding={8}
        className={cn('animate-hochgleiten bg-surface shadow-pop z-50 min-w-56 rounded-lg border p-1', className)}
      >
        {children}
      </KM.Content>
    </KM.Portal>
  )
}

/**
 * Rechtsklick-Menü (am Handy lange drücken, auf der Tastatur Shift F10) um ein beliebiges Element, z. B. eine
 * Zeile einer Liste. Ohne Einträge bleibt das normale Menü des Browsers.
 */
export function Kontextmenue({ aktionen, children }: { aktionen: ZeilenAktion[]; children: ReactNode }) {
  if (aktionen.length === 0) return <>{children}</>
  return (
    <KM.Root modal={false}>
      <KM.Trigger asChild>{children}</KM.Trigger>
      <KontextmenueInhalt>
        <KontextmenueEintraege aktionen={aktionen} />
      </KontextmenueInhalt>
    </KM.Root>
  )
}

export { KM as KontextmenuePrimitiv }
