import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'

export const TooltipAnbieter = TooltipPrimitive.Provider

/** Kurzer Hinweis beim Darüberfahren, z.B. bei Icon-Knöpfen. Nie für wichtige Information verwenden. */
export function Tooltip({
  text,
  untertitel,
  kuerzel,
  seite = 'top',
  children,
}: {
  text: string
  untertitel?: string
  kuerzel?: string
  seite?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactNode
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={seite}
          sideOffset={6}
          className="animate-einblenden bg-foreground text-background z-50 flex max-w-64 flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-xs"
        >
          <span className="flex items-center gap-2 font-medium">
            {text}
            {kuerzel && <kbd className="font-mono text-xs opacity-80">{kuerzel}</kbd>}
          </span>
          {untertitel && <span className="opacity-75">{untertitel}</span>}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
