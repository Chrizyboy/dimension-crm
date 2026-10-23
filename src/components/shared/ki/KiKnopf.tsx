import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, type ButtonProps } from '@/components/ui/button'
import { supabase } from '@/services/supabase'
import { KiAssistent, type KiAssistentProps } from './KiAssistent'

/** Knopf «Mit KI schreiben», der den KI-Assistenten mit Bezug öffnet (in Akten von Kunde, Lead, Offerte, Projekt). */
export function KiKnopf({
  size = 'sm',
  variant = 'secondary',
  text,
  ...props
}: Omit<KiAssistentProps, 'onSchliessen'> & {
  size?: ButtonProps['size']
  variant?: ButtonProps['variant']
  text?: string
}) {
  const { t } = useTranslation()
  const [offen, setOffen] = useState(false)
  if (!supabase) return null
  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={() => {
          setOffen(true)
        }}
      >
        <Sparkles />
        {text ?? t('ki.knopf')}
      </Button>
      {offen && (
        <KiAssistent
          {...props}
          onSchliessen={() => {
            setOffen(false)
          }}
        />
      )}
    </>
  )
}
