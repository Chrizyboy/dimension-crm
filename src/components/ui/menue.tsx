import { DropdownMenu as MenuPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Menue = MenuPrimitive.Root
export const MenueAusloeser = MenuPrimitive.Trigger
export const MenueGruppe = MenuPrimitive.Group
export const MenueRadioGruppe = MenuPrimitive.RadioGroup

/** Aufklappmenü, z.B. «…»-Aktionen in einer Tabellenzeile. */
export function MenueInhalt({ className, sideOffset = 6, ...props }: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn('animate-hochgleiten bg-surface shadow-pop z-50 min-w-44 rounded-lg border p-1', className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  )
}

const eintrag =
  'relative flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none select-none data-disabled:opacity-50 data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground'

/** Ein Eintrag im Menü. `gefahr` färbt ihn rot (Papierkorb). */
export function MenueEintrag({
  className,
  gefahr = false,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item> & { gefahr?: boolean }) {
  return <MenuPrimitive.Item className={cn(eintrag, gefahr && 'text-bad [&_svg]:text-bad', className)} {...props} />
}

/** Auswahl-Eintrag mit Punkt (z.B. Darstellung Hell/Dunkel/System). */
export function MenueRadio({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cn(eintrag, 'pl-7', className)} {...props}>
      <MenuPrimitive.ItemIndicator className="bg-accent absolute left-2.5 size-1.5 rounded-full" />
      {children}
    </MenuPrimitive.RadioItem>
  )
}

/** Zwischentitel im Menü. */
export function MenueTitel({ className, ...props }: ComponentProps<typeof MenuPrimitive.Label>) {
  return (
    <MenuPrimitive.Label
      className={cn('text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium tracking-wide uppercase', className)}
      {...props}
    />
  )
}

/** Trennlinie im Menü. */
export function MenueTrenner({ className, ...props }: ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn('bg-border -mx-1 my-1 h-px', className)} {...props} />
}
