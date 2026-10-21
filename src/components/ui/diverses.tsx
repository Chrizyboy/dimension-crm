import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Grauer Platzhalter, solange Daten laden. Hat die Form des späteren Inhalts, damit nichts springt. */
export function Skelett({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-muted animate-pulse rounded-md', className)} aria-hidden="true" {...props} />
}

/** Tastenkürzel-Anzeige, z.B. <Kbd>Ctrl K</Kbd>. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'bg-surface-2 text-muted-foreground inline-flex h-5 items-center rounded border px-1.5 font-mono text-[10px]',
        className,
      )}
      {...props}
    />
  )
}

/** Trennlinie. */
export function Trenner({ className, senkrecht = false }: { className?: string; senkrecht?: boolean }) {
  return (
    <div role="separator" className={cn('bg-border shrink-0', senkrecht ? 'h-full w-px' : 'h-px w-full', className)} />
  )
}

const AVATAR_FARBEN = [
  'bg-[#02224f] text-white',
  'bg-[#ef7c00] text-[#1d1300]',
  'bg-[#2f6fb0] text-white',
  'bg-[#22794c] text-white',
  'bg-[#6b4fa0] text-white',
]

/** Kürzel aus einem Namen, z.B. «Chris Rosenberg» → «CR». */
export function initialen(name: string): string {
  const teile = name.trim().split(/\s+/).filter(Boolean)
  const erste = teile[0]?.[0] ?? ''
  const letzte = teile.length > 1 ? (teile[teile.length - 1]?.[0] ?? '') : ''
  return (erste + letzte).toUpperCase()
}

/**
 * Rundes Kürzel für Personen. Die Farbe ergibt sich fest aus dem Namen,
 * damit dieselbe Person überall gleich aussieht.
 */
export function Avatar({ name, className }: { name: string; className?: string }) {
  let summe = 0
  for (const zeichen of name) summe += zeichen.charCodeAt(0)
  const farbe = AVATAR_FARBEN[summe % AVATAR_FARBEN.length]
  return (
    <span
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
        farbe,
        className,
      )}
      title={name}
      aria-label={name}
    >
      {initialen(name)}
    </span>
  )
}
