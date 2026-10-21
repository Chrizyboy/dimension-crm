import { Check } from 'lucide-react'
import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Ankreuzfeld, z.B. «Einwilligung Newsletter». */
export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'border-border-strong bg-surface focus-visible:ring-ring/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex size-4 shrink-0 items-center justify-center rounded-sm border outline-none focus-visible:ring-2',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

/** Ein/Aus-Schalter für Einstellungen, die sofort wirken (z.B. Automation aktiv). */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'bg-border-strong focus-visible:ring-ring/40 data-[state=checked]:bg-ok inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors outline-none focus-visible:ring-2',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  )
}
