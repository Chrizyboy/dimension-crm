import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const feld =
  'w-full rounded-md border border-border bg-surface px-2.5 text-sm text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground/80 hover:border-border-strong focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-bad aria-invalid:ring-bad/20'

/** Einzeiliges Eingabefeld. */
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(feld, 'h-8', className)} {...props} />
}

/** Mehrzeiliges Eingabefeld, wächst mit dem Inhalt. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(feld, 'field-sizing-content min-h-20 py-2', className)} {...props} />
}
