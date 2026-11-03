import { Camera, FileUp, Paperclip, Sparkles, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { kiDatei, rufeKi, type KiBeleg } from '@/services/ki'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'

/**
 * Beleg als Foto (Handy-Kamera) oder Datei. Ein neues Foto liest die KI gleich (V233 spAiRead): Datum, Betrag,
 * Kategorie, Zweck, MWST und Personen kommen als Vorschlag ins Formular; die Person prüft und speichert selbst.
 */
export function BelegFeld({
  beleg,
  vorhanden,
  onBeleg,
  onGelesen,
}: {
  beleg: File | null
  /** Name eines schon angehängten Belegs (beim Ändern). */
  vorhanden: string | null
  onBeleg: (f: File | null) => void
  onGelesen: (r: KiBeleg) => void
}) {
  const { t } = useTranslation()
  const kamera = useRef<HTMLInputElement>(null)
  const datei = useRef<HTMLInputElement>(null)
  const [liest, setLiest] = useState(false)

  async function lesen(f: File) {
    if (!supabase) return
    setLiest(true)
    try {
      onGelesen(await rufeKi<KiBeleg>('beleg', { datei: await kiDatei(f) }))
      melde('info', { de: 'Beleg gelesen – bitte prüfen', fr: 'Justificatif lu – à vérifier' })
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLiest(false)
    }
  }

  const gewaehlt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    e.target.value = ''
    onBeleg(f)
    if (f) void lesen(f)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium">{t('spesen.spalte.beleg')}</span>
      {beleg ? (
        <div className="bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-sm">
          <Paperclip className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{beleg.name}</span>
          {supabase && (
            <Button size="sm" variant="secondary" className="ml-auto" laedt={liest} onClick={() => void lesen(beleg)}>
              <Sparkles />
              {t('ki.beleg.lesen')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('spesen.erfassen.belegEntfernen')}
            onClick={() => {
              onBeleg(null)
            }}
          >
            <X />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => kamera.current?.click()}>
            <Camera />
            {t('spesen.erfassen.foto')}
          </Button>
          <Button variant="secondary" onClick={() => datei.current?.click()}>
            <FileUp />
            {vorhanden ? t('spesen.erfassen.belegErsetzen') : t('spesen.erfassen.datei')}
          </Button>
          {vorhanden && (
            <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
              <Paperclip className="size-3.5 shrink-0" />
              <span className="truncate">{vorhanden}</span>
            </span>
          )}
        </div>
      )}
      <p className="text-muted-foreground text-xs">{t('spesen.erfassen.belegHinweis')}</p>
      <input ref={kamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={gewaehlt} />
      <input ref={datei} type="file" accept="image/*,application/pdf" className="hidden" onChange={gewaehlt} />
    </div>
  )
}
