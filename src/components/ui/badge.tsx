import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Kleine Statusmarke. Die Farbe trägt Bedeutung (ok/warnung/kritisch/info), nie nur Dekoration;
 * deshalb steht immer auch ein Wort darin.
 */
export const badgeVariants = cva(
  'inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      ton: {
        neutral: 'bg-muted text-muted-foreground',
        marke: 'bg-accent-soft text-accent-ink',
        ok: 'bg-ok-soft text-ok',
        warnung: 'bg-warn-soft text-warn',
        kritisch: 'bg-bad-soft text-bad',
        info: 'bg-info-soft text-info',
      },
    },
    defaultVariants: { ton: 'neutral' },
  },
)

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { punkt?: boolean }

/** Statusmarke, optional mit Punkt davor. */
export function Badge({ className, ton, punkt = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ ton }), className)} {...props}>
      {punkt && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}
