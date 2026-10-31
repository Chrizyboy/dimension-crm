import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogAusloeser = DialogPrimitive.Trigger
export const DialogSchliessen = DialogPrimitive.Close

interface DialogInhaltProps extends ComponentProps<typeof DialogPrimitive.Content> {
  titel: string
  beschreibung?: string
  /** Knöpfe unten rechts, Hauptaktion zuletzt. */
  fuss?: ReactNode
  /** «seite» öffnet von rechts (Detailansicht), am Handy immer von unten. */
  art?: 'mitte' | 'seite'
  /**
   * Breite des Seitenblatts am PC, überall nur diese zwei (Chris 31.10.2026: einheitlich statt acht Breiten):
   * «normal» 40 rem für Akten, «breit» 48 rem für Akten mit Tabellen oder Editoren.
   */
  breite?: 'normal' | 'breit'
}

/**
 * Dialog in der Mitte oder als Seitenblatt. Fokus bleibt im Dialog, Esc schliesst,
 * der Titel wird von Screenreadern vorgelesen.
 */
export function DialogInhalt({
  titel,
  beschreibung,
  fuss,
  art = 'mitte',
  breite = 'normal',
  className,
  children,
  ...props
}: DialogInhaltProps) {
  const { t } = useTranslation()
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="animate-einblenden fixed inset-0 z-50 bg-[rgb(2_10_24/0.45)] backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'animate-hochgleiten bg-surface shadow-pop fixed z-50 flex flex-col outline-none',
          art === 'mitte' &&
            'top-1/2 left-1/2 max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border',
          art === 'seite' &&
            'inset-x-0 bottom-0 max-h-[90vh] rounded-t-xl border-t md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[40rem] md:max-w-[calc(100vw-4rem)] md:rounded-none md:border-t-0 md:border-l',
          art === 'seite' && breite === 'breit' && 'md:w-[48rem]',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="font-display text-base font-semibold">{titel}</DialogPrimitive.Title>
            {beschreibung ? (
              <DialogPrimitive.Description className="text-muted-foreground text-sm">
                {beschreibung}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{titel}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring -mr-1 rounded-md p-1 outline-none focus-visible:ring-2"
            aria-label={t('allgemein.schliessen')}
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {fuss && <div className="flex justify-end gap-2 border-t px-5 py-3">{fuss}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
