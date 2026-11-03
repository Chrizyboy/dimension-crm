import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, type ButtonProps } from '@/components/ui/button'
import { MenueEintrag } from '@/components/ui/menue'
import { usePapierkorb, type PapierkorbZiel } from './usePapierkorb'

/**
 * Knopf «In den Papierkorb» mit Rückfrage, für Akten und Dialoge in jedem Bereich.
 * `nurSymbol` für Tabellenzeilen. In einem «⋯»-Menü stattdessen `PapierkorbMenueEintrag` mit `usePapierkorb`.
 */
export function InPapierkorbKnopf({
  nurSymbol,
  size,
  className,
  ...ziel
}: PapierkorbZiel & { nurSymbol?: boolean; size?: ButtonProps['size']; className?: string }) {
  const { t } = useTranslation()
  const { frage, dialog } = usePapierkorb(ziel)
  return (
    <>
      <Button
        variant="ghost"
        size={nurSymbol ? 'icon' : size}
        className={className}
        aria-label={nurSymbol ? t('papierkorb.knopf') : undefined}
        title={nurSymbol ? t('papierkorb.knopf') : undefined}
        onClick={(e) => {
          e.stopPropagation()
          frage()
        }}
      >
        <Trash2 />
        {!nurSymbol && t('papierkorb.knopf')}
      </Button>
      {dialog}
    </>
  )
}

/** Eintrag «In den Papierkorb» für ein «⋯»-Menü; der Dialog kommt aus `usePapierkorb` (ausserhalb des Menüs). */
export function PapierkorbMenueEintrag({ onSelect }: { onSelect: () => void }) {
  const { t } = useTranslation()
  return (
    <MenueEintrag gefahr onSelect={onSelect}>
      <Trash2 />
      {t('papierkorb.knopf')}
    </MenueEintrag>
  )
}
