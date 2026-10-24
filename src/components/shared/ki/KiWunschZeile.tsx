import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { useKiNachher } from '@/services/ki'
import { supabase } from '@/services/supabase'

/**
 * Zeile «Mit KI schreiben» über Texten (Marketing, Monatsbericht; V233 aiSend «marketing», smWrite, nlAi, lbAiText):
 * Wunsch eingeben, die KI schreibt oder überarbeitet. Der Text landet im Feld darunter und wird erst mit dem
 * eigenen Knopf gespeichert oder gesendet.
 */
export function KiWunschZeile({
  hatText,
  fest = false,
  onSchreiben,
}: {
  hatText: boolean
  fest?: boolean
  onSchreiben: (wunsch: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const nachher = useKiNachher()
  const [wunsch, setWunsch] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  if (!supabase || fest) return null

  async function los() {
    setLaeuft(true)
    try {
      await onSchreiben(wunsch.trim())
      setWunsch('')
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(false)
      nachher()
    }
  }

  return (
    <div className="bg-surface-2 flex flex-col gap-1.5 rounded-lg border p-2.5">
      <div className="flex gap-2">
        <Input
          aria-label={t('ki.marketing.wunsch')}
          placeholder={hatText ? t('ki.marketing.wunschUeberarbeiten') : t('ki.marketing.wunsch')}
          value={wunsch}
          onChange={(e) => {
            setWunsch(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void los()
          }}
        />
        <Button variant="secondary" laedt={laeuft} onClick={() => void los()}>
          <Sparkles />
          {hatText ? t('ki.marketing.ueberarbeiten') : t('ki.marketing.schreiben')}
        </Button>
      </div>
      <p className="text-muted-foreground text-[11px]">{t('ki.marketing.hinweis')}</p>
    </div>
  )
}
