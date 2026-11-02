import { cn } from '@/lib/utils'

/** Fortschritt als schmaler Balken (0–100); `ton` färbt ihn bei Überschreitung (z. B. Ist über Soll). */
export function Balken({
  wert,
  beschriftung,
  ton = 'primary',
  className,
}: {
  wert: number
  beschriftung: string
  ton?: 'primary' | 'ok' | 'warn' | 'bad'
  className?: string
}) {
  const breite = Math.max(0, Math.min(100, Math.round(wert)))
  const farbe = { primary: 'bg-primary', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' }[ton]
  return (
    <div
      role="progressbar"
      aria-label={beschriftung}
      aria-valuenow={breite}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('bg-muted h-2 w-full overflow-hidden rounded-full', className)}
    >
      <div className={cn('h-full rounded-full', farbe)} style={{ width: `${String(breite)}%` }} />
    </div>
  )
}
